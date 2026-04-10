'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, Spade } from 'lucide-react'

import { getSocket } from '@/lib/socket-client'
import type { SessionState, CardValue } from '@/lib/types'

import { JoinModal } from '@/components/session/JoinModal'
import { JiraImportModal } from '@/components/session/JiraImportModal'
import { PlayerList } from './PlayerList'
import { CurrentTicket } from './CurrentTicket'
import { CardGrid } from './CardGrid'
import { VoteResults } from './VoteResults'
import { HostControls } from './HostControls'
import { TicketQueue } from './TicketQueue'

interface GameBoardProps {
  sessionId: string
}

export function GameBoard({ sessionId }: GameBoardProps) {
  const router = useRouter()
  const socketRef = useRef(getSocket())
  const socket = socketRef.current

  const [session, setSession] = useState<SessionState | null>(null)
  const [myId, setMyId] = useState<string>('')
  const [playerName, setPlayerName] = useState<string>('')
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)
  const [initializing, setInitializing] = useState(true) // true while we check localStorage
  const [showJira, setShowJira] = useState(false)
  const [copied, setCopied] = useState(false)
  const [myVote, setMyVote] = useState<CardValue | undefined>()
  const hasJoined = useRef(false)

  // Join session (auto or manual)
  const joinSession = useCallback((name: string) => {
    setJoining(true)
    setInitializing(false)
    setJoinError('')

    const doJoin = () => {
      socket.emit('session:join', { sessionId, playerName: name }, (res) => {
        setJoining(false)
        if (res.success && res.state) {
          setMyId(socket.id || '')
          setSession(res.state)
          setPlayerName(name)
          localStorage.setItem('pp_player_name', name)
          hasJoined.current = true

          // Restore my vote from session state
          const me = res.state.players.find(p => p.name === name)
          if (me?.vote) setMyVote(me.vote as CardValue)
        } else {
          setJoinError(res.error || 'Failed to join session')
          if (res.error?.includes('not found')) {
            toast.error('Session not found — it may have ended')
            setTimeout(() => router.push('/'), 2000)
          }
        }
      })
    }

    if (socket.connected) {
      doJoin()
    } else {
      socket.once('connect', doJoin)
    }
  }, [sessionId, socket, router])

  // Auto-join if we have a stored name, else show join modal
  useEffect(() => {
    const stored = localStorage.getItem('pp_player_name')
    if (stored) {
      setPlayerName(stored)
      joinSession(stored)
    } else {
      setInitializing(false) // No stored name — show join modal
    }
  }, [sessionId, joinSession])

  // Listen for session state updates
  useEffect(() => {
    function onState(state: SessionState) {
      setSession(state)
      setMyId(socket.id || '')

      // Update myVote from state (in case of reconnect)
      const me = state.players.find(p => p.name === playerName)
      if (me?.vote) setMyVote(me.vote as CardValue)

      // Clear vote display when new round starts
      if (state.status === 'voting' && !state.votesRevealed) {
        const me = state.players.find(p => p.name === playerName)
        if (!me?.hasVoted) setMyVote(undefined)
      }
    }

    socket.on('session:state', onState)
    return () => { socket.off('session:state', onState) }
  }, [socket, playerName])

  // Reconnect handler
  useEffect(() => {
    function onReconnect() {
      if (playerName && hasJoined.current) {
        joinSession(playerName)
      }
    }
    socket.on('connect', onReconnect)
    return () => { socket.off('connect', onReconnect) }
  }, [socket, playerName, joinSession])

  // ─── Game actions ──────────────────────────────────────────────────────────

  function castVote(value: CardValue) {
    setMyVote(value)
    socket.emit('game:vote', { value })
  }

  function reveal() {
    socket.emit('game:reveal')
  }

  function nextTicket(finalScore?: string) {
    socket.emit('game:next-ticket', { finalScore })
    setMyVote(undefined)
  }

  function restartTicket() {
    socket.emit('game:restart-ticket')
    setMyVote(undefined)
  }

  function addTicket(title: string, description?: string) {
    socket.emit('game:add-ticket', { title, description })
  }

  function importTickets(tickets: { title: string; description?: string; jiraKey: string; jiraUrl: string }[]) {
    socket.emit('game:import-tickets', { tickets })
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    toast.success('Session link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const isHost = session ? session.hostId === myId : false
  const currentTicket = session && session.currentTicketIndex >= 0
    ? session.tickets[session.currentTicketIndex]
    : null

  // Show join modal only after we've checked localStorage and confirmed no stored name
  const showJoin = !initializing && !joining && !hasJoined.current

  return (
    <div className="min-h-screen flex flex-col">
      {/* Join Modal */}
      <AnimatePresence>
        {showJoin && (
          <JoinModal
            sessionName={session?.name || 'Planning Session'}
            onJoin={joinSession}
            loading={joining}
            error={joinError}
          />
        )}
      </AnimatePresence>

      {/* Jira Modal */}
      <AnimatePresence>
        {showJira && (
          <JiraImportModal
            onImport={importTickets}
            onClose={() => setShowJira(false)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Spade className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground leading-none">
                {session?.name || 'Planning Poker'}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {session?.players.filter(p => p.isOnline).length || 0} online
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status pill */}
            {session && (
              <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                session.status === 'voting'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  : session.status === 'revealed'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-muted border-border text-muted-foreground'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  session.status === 'voting' ? 'bg-amber-400 animate-pulse' :
                  session.status === 'revealed' ? 'bg-emerald-400' : 'bg-muted-foreground'
                }`} />
                {session.status === 'voting' ? 'Voting' : session.status === 'revealed' ? 'Revealed' : 'Waiting'}
              </div>
            )}

            {/* Session ID */}
            <code className="hidden sm:block text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded-lg">
              {sessionId}
            </code>

            {/* Copy link */}
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground text-xs font-medium transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy link'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      {session ? (
        <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
          <div className="flex gap-5 h-full">

            {/* Left sidebar — Player list */}
            <aside className="hidden lg:flex flex-col w-56 flex-shrink-0">
              <div className="bg-card border border-border rounded-2xl p-4 flex-1">
                <PlayerList
                  players={session.players}
                  votesRevealed={session.votesRevealed}
                  myId={myId}
                />
              </div>
            </aside>

            {/* Center — main game area */}
            <main className="flex-1 flex flex-col gap-4 min-w-0">
              {/* Current ticket */}
              {currentTicket ? (
                <CurrentTicket
                  ticket={currentTicket}
                  ticketNumber={session.currentTicketIndex + 1}
                  totalTickets={session.tickets.length}
                />
              ) : (
                <div className="bg-card border border-border rounded-2xl p-8 text-center">
                  {session.tickets.length === 0 ? (
                    <>
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                        <Spade className="w-6 h-6 text-muted-foreground/50" />
                      </div>
                      <p className="text-foreground font-medium mb-1">No tickets yet</p>
                      <p className="text-sm text-muted-foreground">
                        {isHost
                          ? 'Add tickets using the queue on the right, or import from Jira.'
                          : 'Waiting for the host to add tickets...'}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                        <Check className="w-6 h-6 text-emerald-400" />
                      </div>
                      <p className="text-foreground font-medium mb-1">All done!</p>
                      <p className="text-sm text-muted-foreground">
                        All {session.tickets.length} tickets have been estimated.
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Mobile player list */}
              <div className="lg:hidden bg-card border border-border rounded-2xl p-4">
                <PlayerList
                  players={session.players}
                  votesRevealed={session.votesRevealed}
                  myId={myId}
                />
              </div>

              {/* Vote results (when revealed) */}
              <AnimatePresence>
                {session.status === 'revealed' && (
                  <VoteResults
                    players={session.players}
                    average={session.average ?? null}
                  />
                )}
              </AnimatePresence>

              {/* Card grid (voting) */}
              {currentTicket && session.status !== 'revealed' && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-4 text-center">
                    {myVote ? `You picked ${myVote} — tap another to change` : 'Pick your estimate'}
                  </p>
                  <CardGrid
                    selectedValue={myVote}
                    onSelect={castVote}
                  />
                </div>
              )}

              {/* Host controls */}
              {isHost && currentTicket && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <HostControls
                    session={session}
                    onReveal={reveal}
                    onNextTicket={nextTicket}
                    onRestartTicket={restartTicket}
                  />
                </div>
              )}
            </main>

            {/* Right sidebar — Ticket queue */}
            <aside className="hidden md:flex flex-col w-64 flex-shrink-0">
              <div className="bg-card border border-border rounded-2xl p-4 flex-1 flex flex-col">
                <TicketQueue
                  tickets={session.tickets}
                  currentIndex={session.currentTicketIndex}
                  isHost={isHost}
                  onAddTicket={addTicket}
                  onOpenJira={() => setShowJira(true)}
                />
              </div>
            </aside>
          </div>

          {/* Mobile ticket queue */}
          <div className="md:hidden mt-4 bg-card border border-border rounded-2xl p-4">
            <TicketQueue
              tickets={session.tickets}
              currentIndex={session.currentTicketIndex}
              isHost={isHost}
              onAddTicket={addTicket}
              onOpenJira={() => setShowJira(true)}
            />
          </div>
        </div>
      ) : (
        /* Loading state */
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Connecting...</p>
          </div>
        </div>
      )}
    </div>
  )
}
