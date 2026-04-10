const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// ─── In-memory session store ──────────────────────────────────────────────────
/** @type {Map<string, import('./src/lib/types').SessionState & { votes: Record<string, string> }>} */
const sessions = new Map()

function generateId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = ''
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

function calculateAverage(votes) {
  const numeric = Object.values(votes)
    .filter(v => !isNaN(parseFloat(v)))
    .map(v => parseFloat(v))
  if (numeric.length === 0) return null
  const sum = numeric.reduce((a, b) => a + b, 0)
  return Math.round((sum / numeric.length) * 10) / 10
}

function toClientState(session) {
  const players = session.players.map(p => ({
    id: p.id,
    name: p.name,
    isHost: p.isHost,
    isOnline: p.isOnline,
    hasVoted: !!session.votes[p.id],
    vote: session.votesRevealed ? session.votes[p.id] : undefined,
  }))

  return {
    id: session.id,
    name: session.name,
    status: session.status,
    hostId: session.hostId,
    players,
    tickets: session.tickets,
    currentTicketIndex: session.currentTicketIndex,
    votesRevealed: session.votesRevealed,
    average: session.votesRevealed ? calculateAverage(session.votes) : null,
  }
}

function broadcastState(io, sessionId) {
  const session = sessions.get(sessionId)
  if (session) {
    io.to(sessionId).emit('session:state', toClientState(session))
  }
}

// ─── Server bootstrap ─────────────────────────────────────────────────────────
app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Request error', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  const io = new Server(httpServer, {
    cors: { origin: '*' },
    path: '/api/socket.io',
    transports: ['websocket', 'polling'],
  })

  // ─── Socket handlers ──────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log('[socket] connected', socket.id)

    // ── Create session ──────────────────────────────────────────────────────
    socket.on('session:create', ({ sessionName, playerName }, callback) => {
      if (!sessionName?.trim() || !playerName?.trim()) {
        return callback({ success: false, error: 'Missing name' })
      }

      const sessionId = generateId()
      const player = {
        id: socket.id,
        name: playerName.trim(),
        isHost: true,
        isOnline: true,
      }

      const session = {
        id: sessionId,
        name: sessionName.trim(),
        hostId: socket.id,
        players: [player],
        tickets: [],
        currentTicketIndex: -1,
        votes: {},
        votesRevealed: false,
        status: 'waiting',
      }

      sessions.set(sessionId, session)
      socket.join(sessionId)
      socket.data.sessionId = sessionId
      socket.data.playerId = socket.id

      console.log(`[session] created ${sessionId} by ${playerName}`)
      callback({ success: true, sessionId, state: toClientState(session) })
    })

    // ── Join session ────────────────────────────────────────────────────────
    socket.on('session:join', ({ sessionId, playerName }, callback) => {
      const session = sessions.get(sessionId)
      if (!session) {
        return callback({ success: false, error: 'Session not found. It may have ended.' })
      }
      if (!playerName?.trim()) {
        return callback({ success: false, error: 'Enter your name to join' })
      }

      const trimmed = playerName.trim()

      // Reconnect: find existing player by name
      let player = session.players.find(p => p.name === trimmed)
      if (player) {
        // Update socket id (reconnect)
        const oldId = player.id
        player.id = socket.id
        player.isOnline = true
        // Transfer host if this was the host
        if (session.hostId === oldId) {
          session.hostId = socket.id
        }
        // Transfer their vote too
        if (session.votes[oldId] !== undefined) {
          session.votes[socket.id] = session.votes[oldId]
          delete session.votes[oldId]
        }
      } else {
        // New player
        player = {
          id: socket.id,
          name: trimmed,
          isHost: false,
          isOnline: true,
        }
        session.players.push(player)
      }

      socket.join(sessionId)
      socket.data.sessionId = sessionId
      socket.data.playerId = socket.id

      console.log(`[session] ${trimmed} joined ${sessionId}`)
      const state = toClientState(session)
      callback({ success: true, state })
      socket.to(sessionId).emit('session:state', state)
    })

    // ── Cast vote ───────────────────────────────────────────────────────────
    socket.on('game:vote', ({ value }) => {
      const { sessionId, playerId } = socket.data
      const session = sessions.get(sessionId)
      if (!session || session.status !== 'voting' || session.votesRevealed) return

      session.votes[playerId] = value
      broadcastState(io, sessionId)
    })

    // ── Reveal votes (host only) ────────────────────────────────────────────
    socket.on('game:reveal', () => {
      const { sessionId, playerId } = socket.data
      const session = sessions.get(sessionId)
      if (!session || session.hostId !== playerId) return

      session.votesRevealed = true
      session.status = 'revealed'
      broadcastState(io, sessionId)
    })

    // ── Restart vote on same ticket ─────────────────────────────────────────
    socket.on('game:restart-ticket', () => {
      const { sessionId, playerId } = socket.data
      const session = sessions.get(sessionId)
      if (!session || session.hostId !== playerId) return

      session.votes = {}
      session.votesRevealed = false
      session.status = 'voting'
      broadcastState(io, sessionId)
    })

    // ── Advance to next ticket (host only) ──────────────────────────────────
    socket.on('game:next-ticket', ({ finalScore } = {}) => {
      const { sessionId, playerId } = socket.data
      const session = sessions.get(sessionId)
      if (!session || session.hostId !== playerId) return

      // Save final score on current ticket
      if (session.currentTicketIndex >= 0 && finalScore) {
        session.tickets[session.currentTicketIndex].finalScore = finalScore
      }

      // Find next pending ticket
      const nextIndex = session.currentTicketIndex + 1
      session.votes = {}
      session.votesRevealed = false

      if (nextIndex < session.tickets.length) {
        session.currentTicketIndex = nextIndex
        session.status = 'voting'
      } else {
        session.currentTicketIndex = -1
        session.status = 'waiting'
      }

      broadcastState(io, sessionId)
    })

    // ── Add ticket (host only) ──────────────────────────────────────────────
    socket.on('game:add-ticket', ({ title, description, jiraKey, jiraUrl }) => {
      const { sessionId, playerId } = socket.data
      const session = sessions.get(sessionId)
      if (!session || session.hostId !== playerId || !title?.trim()) return

      const ticket = {
        id: generateId(),
        title: title.trim(),
        description: description?.trim() || undefined,
        jiraKey: jiraKey?.trim() || undefined,
        jiraUrl: jiraUrl?.trim() || undefined,
      }
      session.tickets.push(ticket)

      // Auto-start if this is the first ticket
      if (session.tickets.length === 1 && session.status === 'waiting') {
        session.currentTicketIndex = 0
        session.status = 'voting'
      }

      broadcastState(io, sessionId)
    })

    // ── Import tickets from Jira (host only) ───────────────────────────────
    socket.on('game:import-tickets', ({ tickets }) => {
      const { sessionId, playerId } = socket.data
      const session = sessions.get(sessionId)
      if (!session || session.hostId !== playerId || !Array.isArray(tickets)) return

      tickets.forEach(t => {
        session.tickets.push({
          id: generateId(),
          title: t.title?.trim() || 'Untitled',
          description: t.description?.trim() || undefined,
          jiraKey: t.jiraKey?.trim() || undefined,
          jiraUrl: t.jiraUrl?.trim() || undefined,
        })
      })

      // Auto-start if we were waiting
      if (session.status === 'waiting' && session.tickets.length > 0) {
        session.currentTicketIndex = 0
        session.status = 'voting'
      }

      broadcastState(io, sessionId)
    })

    // ── Disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const { sessionId, playerId } = socket.data
      if (!sessionId) return

      const session = sessions.get(sessionId)
      if (!session) return

      const player = session.players.find(p => p.id === playerId)
      if (player) {
        player.isOnline = false
        console.log(`[session] ${player.name} disconnected from ${sessionId}`)
        broadcastState(io, sessionId)
      }

      // Clean up empty sessions after 1 hour
      const allOffline = session.players.every(p => !p.isOnline)
      if (allOffline) {
        setTimeout(() => {
          const s = sessions.get(sessionId)
          if (s && s.players.every(p => !p.isOnline)) {
            sessions.delete(sessionId)
            console.log(`[session] cleaned up ${sessionId}`)
          }
        }, 60 * 60 * 1000)
      }
    })
  })

  httpServer.once('error', (err) => {
    console.error(err)
    process.exit(1)
  })

  httpServer.listen(port, () => {
    console.log(`\n> Planning Poker ready on http://${hostname}:${port}\n`)
  })
})
