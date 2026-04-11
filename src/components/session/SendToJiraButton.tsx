'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X, Loader2, CheckCircle2, AlertCircle, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Ticket } from '@/lib/types'
import { toast } from 'sonner'

interface SendToJiraButtonProps {
  tickets: Ticket[]
}

interface SavedCreds {
  baseUrl: string
  email: string
  token: string
}

interface UpdateResult {
  key: string
  success: boolean
  error?: string
}

const STORAGE_KEY = 'pp_jira_creds'

export function SendToJiraButton({ tickets }: SendToJiraButtonProps) {
  const estimatedWithJira = tickets.filter(t => t.finalScore && t.jiraKey)

  // Only show when there's something to push
  if (estimatedWithJira.length === 0) return null

  return <SendModal tickets={estimatedWithJira} />
}

function SendModal({ tickets }: { tickets: Ticket[] }) {
  const [open, setOpen] = useState(false)
  const [baseUrl, setBaseUrl] = useState('')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<UpdateResult[] | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const creds: SavedCreds = JSON.parse(saved)
        setBaseUrl(creds.baseUrl || '')
        setEmail(creds.email || '')
        setToken(creds.token || '')
      }
    } catch {}
  }, [open])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!baseUrl.trim() || !token.trim()) return

    setLoading(true)
    setResults(null)

    const updates = tickets
      .filter(t => t.jiraKey && t.finalScore && !isNaN(parseFloat(t.finalScore)))
      .map(t => ({
        jiraKey: t.jiraKey!,
        storyPoints: parseFloat(t.finalScore!),
      }))

    try {
      const res = await fetch('/api/jira/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: baseUrl.trim(),
          email: email.trim() || undefined,
          token: token.trim(),
          updates,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to update Jira')
        setLoading(false)
        return
      }

      setResults(data.results)
      if (data.failed === 0) {
        toast.success(`Updated ${data.succeeded} ticket${data.succeeded !== 1 ? 's' : ''} in Jira!`)
      } else {
        toast.warning(`${data.succeeded} updated, ${data.failed} failed`)
      }
    } catch {
      toast.error('Network error — could not reach Jira')
    } finally {
      setLoading(false)
    }
  }

  const hasCredentials = baseUrl && token

  return (
    <>
      <button
        onClick={() => { setResults(null); setOpen(true) }}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-600/30 active:scale-[0.98] transition-all"
      >
        <Send className="w-3.5 h-3.5" />
        Send to Jira
        <span className="text-xs bg-emerald-500/20 px-1.5 py-0.5 rounded-md font-bold">
          {tickets.length}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl shadow-black/40 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-base font-semibold text-foreground">Push Story Points to Jira</h2>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-5 space-y-5">
                {/* Tickets preview */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Tickets to update
                  </p>
                  {tickets.map(ticket => (
                    <div
                      key={ticket.id}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 rounded-lg border text-sm',
                        results
                          ? results.find(r => r.key === ticket.jiraKey)?.success
                            ? 'bg-emerald-500/10 border-emerald-500/20'
                            : 'bg-destructive/10 border-destructive/20'
                          : 'bg-muted/40 border-border/50'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {results && (
                          results.find(r => r.key === ticket.jiraKey)?.success
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            : <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                        )}
                        {!results && <Tag className="w-3 h-3 text-primary/60 flex-shrink-0" />}
                        <span className="font-mono text-xs text-primary font-bold flex-shrink-0">{ticket.jiraKey}</span>
                        <span className="text-xs text-muted-foreground truncate">{ticket.title}</span>
                      </div>
                      <span className="text-xs font-bold text-foreground flex-shrink-0 ml-2">
                        {ticket.finalScore} pts
                      </span>
                    </div>
                  ))}
                </div>

                {/* Error details */}
                {results && results.some(r => !r.success) && (
                  <div className="space-y-1">
                    {results.filter(r => !r.success).map(r => (
                      <p key={r.key} className="text-xs text-destructive">
                        {r.key}: {r.error}
                      </p>
                    ))}
                  </div>
                )}

                {/* Credentials */}
                {!results && (
                  <form onSubmit={handleSend} className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Jira credentials
                    </p>
                    <input
                      type="url"
                      placeholder="https://yourcompany.atlassian.net"
                      value={baseUrl}
                      onChange={e => setBaseUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      required
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="email"
                        placeholder="Email (Jira Cloud)"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <input
                        type="password"
                        placeholder="API token"
                        value={token}
                        onChange={e => setToken(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        required
                      />
                    </div>
                    {!hasCredentials && (
                      <p className="text-xs text-muted-foreground">
                        Enter your Jira credentials above. Only tickets imported from Jira (with a ticket key) will be updated.
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={loading || !baseUrl.trim() || !token.trim()}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating Jira...</>
                        : <><Send className="w-4 h-4" /> Push {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</>
                      }
                    </button>
                  </form>
                )}

                {results && (
                  <button
                    onClick={() => setOpen(false)}
                    className="w-full py-2.5 rounded-xl bg-muted text-muted-foreground font-medium hover:bg-muted/80 transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
