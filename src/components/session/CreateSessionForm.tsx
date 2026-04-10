'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getSocket } from '@/lib/socket-client'
import { ArrowRight, Loader2 } from 'lucide-react'

export function CreateSessionForm() {
  const router = useRouter()
  const [sessionName, setSessionName] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sessionName.trim() || !playerName.trim()) return
    setLoading(true)

    const socket = getSocket()

    const doCreate = () => {
      socket.emit('session:create', { sessionName, playerName }, (res) => {
        setLoading(false)
        if (res.success && res.sessionId) {
          // Remember who we are
          localStorage.setItem('pp_player_name', playerName.trim())
          localStorage.setItem('pp_session_id', res.sessionId)
          router.push(`/session/${res.sessionId}`)
        } else {
          toast.error(res.error || 'Failed to create session')
        }
      })
    }

    if (socket.connected) {
      doCreate()
    } else {
      socket.once('connect', doCreate)
      socket.connect()
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-black/20">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="session-name">
            Session name
          </label>
          <input
            id="session-name"
            type="text"
            placeholder="Sprint 24 Planning"
            value={sessionName}
            onChange={e => setSessionName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
            autoComplete="off"
            maxLength={60}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="player-name">
            Your name
          </label>
          <input
            id="player-name"
            type="text"
            placeholder="Alice"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
            autoComplete="name"
            maxLength={30}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !sessionName.trim() || !playerName.trim()}
          className="w-full py-3 px-6 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Create Session
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Have a session link?{' '}
        <span className="text-primary">
          Just open it in your browser to join.
        </span>
      </p>
    </div>
  )
}
