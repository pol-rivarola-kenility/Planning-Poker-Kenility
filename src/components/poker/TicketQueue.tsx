'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { Plus, Check, Clock, ChevronRight, Tag, Send, Loader2, X, AlertCircle, ExternalLink, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Ticket } from '@/lib/types'
import { toast } from 'sonner'

interface TicketQueueProps {
  tickets: Ticket[]
  currentIndex: number
  isHost: boolean
  onAddTicket: (title: string, description?: string) => void
  onOpenJira: () => void
  onRemoveTicket?: (ticketId: string) => void
  onJumpToTicket?: (index: number) => void
  onReorderTickets?: (ticketIds: string[]) => void
}

const CREDS_KEY = 'pp_jira_creds'

interface JiraCreds { baseUrl: string; email: string; token: string }

function loadCreds(): JiraCreds | null {
  try {
    const raw = localStorage.getItem(CREDS_KEY)
    if (!raw) return null
    const c = JSON.parse(raw)
    return c.baseUrl && c.token ? c : null
  } catch { return null }
}

// ── Per-ticket Jira send button ───────────────────────────────────────────────
function TicketSendButton({ ticket }: { ticket: Ticket }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [showCredForm, setShowCredForm] = useState(false)
  const [baseUrl, setBaseUrl] = useState('')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [hasServerDefaults, setHasServerDefaults] = useState(false)

  useEffect(() => {
    fetch('/api/jira/config')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.hasToken && d?.baseUrl) setHasServerDefaults(true) })
      .catch(() => {})
  }, [])

  if (!ticket.jiraKey || !ticket.finalScore) return null

  const storyPoints = parseFloat(ticket.finalScore)
  if (isNaN(storyPoints)) return null

  async function sendToJira(creds: JiraCreds | null) {
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/jira/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: creds?.baseUrl || '',
          email: creds?.email || undefined,
          token: creds?.token || '',
          updates: [{ jiraKey: ticket.jiraKey!, storyPoints }],
        }),
      })
      const data = await res.json()
      const result = data.results?.[0]
      if (result?.success) {
        setStatus('success')
        toast.success(`${ticket.jiraKey} updated to ${ticket.finalScore} pts`)
      } else {
        setStatus('error')
        setErrorMsg(result?.error || 'Failed to update')
        toast.error(`${ticket.jiraKey}: ${result?.error || 'Failed to update'}`)
      }
    } catch {
      setStatus('error')
      setErrorMsg('Network error')
      toast.error('Network error — could not reach Jira')
    }
  }

  function handleClick() {
    if (status === 'success') return
    const creds = loadCreds()
    if (creds || hasServerDefaults) {
      sendToJira(creds)
    } else {
      setShowCredForm(true)
    }
  }

  function handleCredSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!baseUrl.trim() || !token.trim()) return
    const creds = { baseUrl: baseUrl.trim(), email: email.trim(), token: token.trim() }
    try { localStorage.setItem(CREDS_KEY, JSON.stringify(creds)) } catch {}
    setShowCredForm(false)
    sendToJira(creds)
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={status === 'loading' || status === 'success'}
        title={
          status === 'success' ? 'Sent to Jira' :
          status === 'error' ? errorMsg :
          `Send ${ticket.finalScore} pts to Jira`
        }
        className={cn(
          'flex items-center justify-center w-5 h-5 rounded-md transition-all',
          status === 'idle' && 'text-muted-foreground/40 hover:text-emerald-400 hover:bg-emerald-400/10',
          status === 'loading' && 'text-muted-foreground/40 cursor-not-allowed',
          status === 'success' && 'text-emerald-400 cursor-default',
          status === 'error' && 'text-destructive hover:bg-destructive/10',
        )}
      >
        {status === 'loading' && <Loader2 className="w-3 h-3 animate-spin" />}
        {status === 'success' && <Check className="w-3 h-3" />}
        {status === 'error' && <AlertCircle className="w-3 h-3" />}
        {status === 'idle' && <Send className="w-3 h-3" />}
      </button>

      <AnimatePresence>
        {showCredForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-7 z-50 w-64 bg-card border border-border rounded-xl shadow-2xl shadow-black/40 p-3 space-y-2"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-foreground">Jira credentials</span>
              <button onClick={() => setShowCredForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <form onSubmit={handleCredSubmit} className="space-y-1.5">
              <input
                type="url"
                placeholder="https://company.atlassian.net"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
                required
              />
              <input
                type="email"
                placeholder="Email (Jira Cloud)"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <input
                type="password"
                placeholder="API token"
                value={token}
                onChange={e => setToken(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                required
              />
              <button
                type="submit"
                disabled={!baseUrl.trim() || !token.trim()}
                className="w-full py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                Send to Jira
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Draggable ticket item (host view) ─────────────────────────────────────────
function DraggableTicketItem({
  ticket,
  index,
  currentIndex,
  isHost,
  onRemoveTicket,
  onJumpToTicket,
  onDragEnd,
}: {
  ticket: Ticket
  index: number
  currentIndex: number
  isHost: boolean
  onRemoveTicket?: (id: string) => void
  onJumpToTicket?: (index: number) => void
  onDragEnd: () => void
}) {
  const controls = useDragControls()
  const isDone = !!ticket.finalScore
  const isCurrent = !isDone && index === currentIndex
  const isPending = !isDone && index !== currentIndex
  const canJump = isHost && isPending && !!onJumpToTicket

  return (
    <Reorder.Item
      value={ticket}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      className={cn(
        'group flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-sm transition-colors list-none',
        isCurrent && 'bg-primary/10 border-primary/25 text-foreground',
        isDone && 'bg-muted/30 border-border/30 text-muted-foreground',
        isPending && 'bg-card border-border hover:bg-muted/40 text-foreground',
        canJump && 'cursor-pointer',
      )}
      onClick={canJump ? () => onJumpToTicket!(index) : undefined}
    >
      {/* Drag handle */}
      <div
        onPointerDown={e => controls.start(e)}
        className="flex-shrink-0 mt-0.5 cursor-grab active:cursor-grabbing touch-none text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Status icon */}
      <div className="flex-shrink-0 mt-0.5">
        {isDone ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : isCurrent ? (
          <ChevronRight className="w-3.5 h-3.5 text-primary" />
        ) : (
          <Clock className="w-3.5 h-3.5 text-muted-foreground/50" />
        )}
      </div>

      {/* Ticket info */}
      <div className="flex-1 min-w-0">
        {ticket.jiraKey && (
          ticket.jiraUrl ? (
            <a
              href={ticket.jiraUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-xs font-mono text-primary/70 mb-0.5 hover:underline inline-flex items-center gap-0.5"
            >
              {ticket.jiraKey}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          ) : (
            <span className="text-xs font-mono text-primary/70 block mb-0.5">{ticket.jiraKey}</span>
          )
        )}
        <p className="text-xs leading-snug break-words">{ticket.title}</p>
        {isDone && ticket.finalScore && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs font-bold text-emerald-400">
              → {ticket.finalScore} pts
            </span>
            <TicketSendButton ticket={ticket} />
          </div>
        )}
      </div>

      {/* Remove button */}
      {isHost && onRemoveTicket && (
        <button
          onClick={e => { e.stopPropagation(); onRemoveTicket(ticket.id) }}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 mt-0.5 text-muted-foreground/40 hover:text-destructive transition-all"
          title="Remove ticket"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </Reorder.Item>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function TicketQueue({ tickets, currentIndex, isHost, onAddTicket, onOpenJira, onRemoveTicket, onJumpToTicket, onReorderTickets }: TicketQueueProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [orderedTickets, setOrderedTickets] = useState<Ticket[]>(tickets)

  useEffect(() => {
    setOrderedTickets(tickets)
  }, [tickets])

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onAddTicket(title.trim(), desc.trim() || undefined)
    setTitle('')
    setDesc('')
    setShowAdd(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Ticket Queue
        </span>
        <span className="text-xs text-muted-foreground/60">
          {tickets.filter(t => !t.finalScore).length} remaining
        </span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {isHost ? (
          <Reorder.Group
            axis="y"
            values={orderedTickets}
            onReorder={setOrderedTickets}
            className="space-y-1.5"
          >
            {orderedTickets.map((ticket, i) => (
              <DraggableTicketItem
                key={ticket.id}
                ticket={ticket}
                index={i}
                currentIndex={currentIndex}
                isHost={isHost}
                onRemoveTicket={onRemoveTicket}
                onJumpToTicket={onJumpToTicket}
                onDragEnd={() => onReorderTickets?.(orderedTickets.map(t => t.id))}
              />
            ))}
          </Reorder.Group>
        ) : (
          <AnimatePresence initial={false}>
            <div className="space-y-1.5">
              {tickets.map((ticket, i) => {
                const isDone = !!ticket.finalScore
                const isCurrent = !isDone && i === currentIndex
                const isPending = !isDone && i !== currentIndex

                return (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      'flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-sm transition-colors',
                      isCurrent && 'bg-primary/10 border-primary/25 text-foreground',
                      isDone && 'bg-muted/30 border-border/30 text-muted-foreground',
                      isPending && 'bg-card border-border text-foreground',
                    )}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {isDone ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : isCurrent ? (
                        <ChevronRight className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {ticket.jiraKey && (
                        ticket.jiraUrl ? (
                          <a
                            href={ticket.jiraUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono text-primary/70 mb-0.5 hover:underline inline-flex items-center gap-0.5"
                          >
                            {ticket.jiraKey}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <span className="text-xs font-mono text-primary/70 block mb-0.5">{ticket.jiraKey}</span>
                        )
                      )}
                      <p className="text-xs leading-snug break-words">{ticket.title}</p>
                      {isDone && ticket.finalScore && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs font-bold text-emerald-400">→ {ticket.finalScore} pts</span>
                          <TicketSendButton ticket={ticket} />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </AnimatePresence>
        )}

        {tickets.length === 0 && (
          <p className="text-xs text-muted-foreground/50 text-center py-4">
            No tickets yet
          </p>
        )}
      </div>

      {/* Host controls */}
      {isHost && (
        <div className="mt-3 space-y-2 flex-shrink-0">
          <AnimatePresence>
            {showAdd && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAdd}
                className="space-y-2 overflow-hidden"
              >
                <input
                  type="text"
                  placeholder="Ticket title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  autoFocus
                  maxLength={200}
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  maxLength={500}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="flex-1 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!title.trim()}
                    className="flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <button
            onClick={() => setShowAdd(v => !v)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-border/60 text-muted-foreground text-xs hover:border-primary/40 hover:text-primary transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add ticket
          </button>

          <button
            onClick={onOpenJira}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-border/60 text-muted-foreground text-xs hover:border-primary/40 hover:text-primary transition-all"
          >
            <Tag className="w-3.5 h-3.5" />
            Import from Jira
          </button>
        </div>
      )}
    </div>
  )
}
