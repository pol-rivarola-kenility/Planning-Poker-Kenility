'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getSocket, getOrCreateStableId } from '@/lib/socket-client'
import { ArrowRight, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

const JIRA_STORAGE_KEY = 'pp_jira_creds'

export function CreateSessionForm() {
  const router = useRouter()
  const [sessionName, setSessionName] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [loading, setLoading] = useState(false)

  // Jira (optional)
  const [jiraOpen, setJiraOpen] = useState(false)
  const [jiraBaseUrl, setJiraBaseUrl] = useState('')
  const [jiraEmail, setJiraEmail] = useState('')
  const [jiraToken, setJiraToken] = useState('')

  // Pre-fill Jira fields from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(JIRA_STORAGE_KEY)
      if (saved) {
        const creds = JSON.parse(saved)
        setJiraBaseUrl(creds.baseUrl || 'https://truvideo.atlassian.net')
        if (creds.email) setJiraEmail(creds.email)
        if (creds.token) setJiraToken(creds.token)
        setJiraOpen(true)
      } else {
        setJiraBaseUrl('https://truvideo.atlassian.net')
      }
    } catch {
      setJiraBaseUrl('https://truvideo.atlassian.net')
    }
  }, [])

  function saveJiraCreds() {
    try {
      const baseUrl = jiraBaseUrl.trim()
      const email   = jiraEmail.trim()
      const token   = jiraToken.trim()
      if (baseUrl || email || token) {
        localStorage.setItem(JIRA_STORAGE_KEY, JSON.stringify({ baseUrl, email, token }))
      }
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sessionName.trim() || !playerName.trim()) return
    setLoading(true)

    saveJiraCreds()

    const socket = getSocket()
    const stableId = getOrCreateStableId()

    const doCreate = () => {
      socket.emit('session:create', { sessionName, playerName, stableId }, (res) => {
        setLoading(false)
        if (res.success && res.sessionId) {
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
      return
    }

    const timeout = setTimeout(() => {
      socket.off('connect', doCreate)
      socket.off('connect_error', onError)
      setLoading(false)
      toast.error('Could not connect to server — please try again')
    }, 8000)

    const onError = (err: Error) => {
      clearTimeout(timeout)
      socket.off('connect', doCreate)
      setLoading(false)
      toast.error(`Connection failed: ${err.message}`)
    }

    socket.once('connect', () => {
      clearTimeout(timeout)
      socket.off('connect_error', onError)
      doCreate()
    })
    socket.once('connect_error', onError)
    socket.connect()
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

        {/* Jira — optional */}
        <div className="border border-border rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setJiraOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <span className="font-medium">
              Jira integration
              <span className="ml-2 text-xs font-normal opacity-60">optional</span>
            </span>
            {jiraOpen
              ? <ChevronUp className="w-4 h-4" />
              : <ChevronDown className="w-4 h-4" />
            }
          </button>

          {jiraOpen && (
            <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="jira-url">
                  Base URL
                </label>
                <input
                  id="jira-url"
                  type="url"
                  placeholder="https://yourcompany.atlassian.net"
                  value={jiraBaseUrl}
                  onChange={e => setJiraBaseUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="jira-email">
                    Email
                  </label>
                  <input
                    id="jira-email"
                    type="email"
                    placeholder="you@company.com"
                    value={jiraEmail}
                    onChange={e => setJiraEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="jira-token">
                    API Token
                  </label>
                  <input
                    id="jira-token"
                    type="password"
                    placeholder="ATATT3xFfGF0…"
                    value={jiraToken}
                    onChange={e => setJiraToken(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground/70">
                Saved to your browser only — never sent to our server.
              </p>
            </div>
          )}
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
