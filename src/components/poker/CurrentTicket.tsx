'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ExternalLink, Tag } from 'lucide-react'
import type { Ticket } from '@/lib/types'

interface CurrentTicketProps {
  ticket: Ticket
  ticketNumber: number
  totalTickets: number
}

export function CurrentTicket({ ticket, ticketNumber, totalTickets }: CurrentTicketProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={ticket.id}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="bg-card border border-border rounded-2xl p-5 shadow-lg"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Ticket key badge */}
            {ticket.jiraKey && (
              <div className="flex items-center gap-1.5 mb-2">
                <Tag className="w-3 h-3 text-primary" />
                <span className="text-xs font-mono font-semibold text-primary">
                  {ticket.jiraKey}
                </span>
                {ticket.jiraUrl && (
                  <a
                    href={ticket.jiraUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            {/* Title */}
            <h2 className="text-lg font-semibold text-foreground leading-snug">
              {ticket.title}
            </h2>

            {/* Description */}
            {ticket.description && (
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-3">
                {ticket.description}
              </p>
            )}
          </div>

          {/* Ticket counter */}
          <div className="flex-shrink-0 text-right">
            <div className="text-xs text-muted-foreground">
              {ticketNumber} / {totalTickets}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
