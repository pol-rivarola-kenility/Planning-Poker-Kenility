'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Check, Clock, ChevronRight, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Ticket } from '@/lib/types'

interface TicketQueueProps {
  tickets: Ticket[]
  currentIndex: number
  isHost: boolean
  onAddTicket: (title: string, description?: string) => void
  onOpenJira: () => void
}

export function TicketQueue({ tickets, currentIndex, isHost, onAddTicket, onOpenJira }: TicketQueueProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')

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
          {tickets.filter((_, i) => i > currentIndex).length} remaining
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
        <AnimatePresence initial={false}>
          {tickets.map((ticket, i) => {
            const isDone = i < currentIndex
            const isCurrent = i === currentIndex
            const isPending = i > currentIndex

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
                  isPending && 'bg-card border-border hover:bg-muted/40 text-foreground',
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
                    <span className="text-xs font-mono text-primary/70 block mb-0.5">{ticket.jiraKey}</span>
                  )}
                  <p className="text-xs leading-snug truncate">{ticket.title}</p>
                  {isDone && ticket.finalScore && (
                    <span className="text-xs font-bold text-emerald-400 mt-0.5 block">
                      → {ticket.finalScore} pts
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

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
