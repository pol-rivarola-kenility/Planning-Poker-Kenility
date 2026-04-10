'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Loader2, Check, ExternalLink, AlertCircle, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { JiraTicket } from '@/lib/types'

interface JiraImportModalProps {
  onImport: (tickets: { title: string; description?: string; jiraKey: string; jiraUrl: string }[]) => void
  onClose: () => void
}

const STORAGE_KEY = 'pp_jira_creds'

interface SavedCreds {
  baseUrl: string
  email: string
  token: string
}

export function JiraImportModal({ onImport, onClose }: JiraImportModalProps) {
  const [baseUrl, setBaseUrl] = useState('')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [jql, setJql] = useState('project = PROJECT ORDER BY created DESC')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tickets, setTickets] = useState<JiraTicket[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Load saved credentials from localStorage
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
  }, [])

  async function handleFetch(e: React.FormEvent) {
    e.preventDefault()
    if (!baseUrl.trim() || !token.trim() || !jql.trim()) return

    setLoading(true)
    setError('')
    setTickets([])
    setSelected(new Set())

    // Save creds to localStorage (excluding token value for safety - just save url/email)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        baseUrl: baseUrl.trim(),
        email: email.trim(),
        token: token.trim(),
      }))
    } catch {}

    try {
      const res = await fetch('/api/jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: baseUrl.trim(),
          email: email.trim() || undefined,
          token: token.trim(),
          jql: jql.trim(),
          maxResults: 50,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to fetch from Jira')
        return
      }

      setTickets(data.tickets || [])
      if (data.tickets?.length === 0) {
        setError('No tickets found matching your JQL query')
      }
    } catch {
      setError('Network error — check your connection')
    } finally {
      setLoading(false)
    }
  }

  function toggleSelect(key: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === tickets.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(tickets.map(t => t.key)))
    }
  }

  function handleImport() {
    const toImport = tickets
      .filter(t => selected.has(t.key))
      .map(t => ({
        title: `[${t.key}] ${t.summary}`,
        description: t.description || undefined,
        jiraKey: t.key,
        jiraUrl: t.url,
      }))
    onImport(toImport)
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-black/40"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Import from Jira</h2>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-5 space-y-5">
            {/* Credentials form */}
            <form onSubmit={handleFetch} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Jira Base URL</label>
                  <input
                    type="url"
                    placeholder="https://yourcompany.atlassian.net"
                    value={baseUrl}
                    onChange={e => setBaseUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Email <span className="text-muted-foreground/50">(Jira Cloud)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">API Token</label>
                  <input
                    type="password"
                    placeholder="ATATT3xFfGF0..."
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">JQL Query</label>
                <input
                  type="text"
                  placeholder='project = PROJ AND sprint in openSprints() ORDER BY priority DESC'
                  value={jql}
                  onChange={e => setJql(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Fetch Tickets
              </button>
            </form>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Results */}
            {tickets.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} found
                  </span>
                  <button
                    onClick={toggleAll}
                    className="text-xs text-primary hover:underline"
                  >
                    {selected.size === tickets.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>

                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {tickets.map(ticket => (
                    <button
                      key={ticket.key}
                      onClick={() => toggleSelect(ticket.key)}
                      className={cn(
                        'w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all',
                        selected.has(ticket.key)
                          ? 'bg-primary/10 border-primary/30'
                          : 'bg-muted/30 border-border/50 hover:border-border'
                      )}
                    >
                      {/* Checkbox */}
                      <div className={cn(
                        'w-4 h-4 rounded flex-shrink-0 mt-0.5 flex items-center justify-center border transition-colors',
                        selected.has(ticket.key)
                          ? 'bg-primary border-primary'
                          : 'border-border'
                      )}>
                        {selected.has(ticket.key) && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-mono font-bold text-primary flex-shrink-0">{ticket.key}</span>
                          <a
                            href={ticket.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <p className="text-sm text-foreground leading-snug line-clamp-2">{ticket.summary}</p>
                        {ticket.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{ticket.description}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {tickets.length > 0 && (
            <div className="p-4 border-t border-border flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selected.size} selected
              </span>
              <button
                onClick={handleImport}
                disabled={selected.size === 0}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add to Queue
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
