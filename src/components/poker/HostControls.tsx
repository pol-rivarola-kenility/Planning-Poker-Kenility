'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, ArrowRight, RotateCcw, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SessionState, CardValue } from '@/lib/types'
import { CARD_VALUES } from '@/lib/types'

interface HostControlsProps {
  session: SessionState
  onReveal: () => void
  onNextTicket: (finalScore?: string) => void
  onRestartTicket: () => void
}

export function HostControls({ session, onReveal, onNextTicket, onRestartTicket }: HostControlsProps) {
  const [finalScore, setFinalScore] = useState<string>('')

  const votedCount = session.players.filter(p => p.hasVoted && p.isOnline).length
  const onlineCount = session.players.filter(p => p.isOnline).length
  const currentTicket = session.tickets[session.currentTicketIndex]
  const isLastTicket = session.currentTicketIndex >= session.tickets.length - 1

  // Pre-fill final score with average when revealed
  const displayAverage = session.average !== null && session.average !== undefined
    ? String(session.average)
    : ''

  function handleNext() {
    onNextTicket(finalScore || displayAverage || undefined)
    setFinalScore('')
  }

  if (session.status === 'voting') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-3"
      >
        <div className="text-sm text-muted-foreground">
          {votedCount}/{onlineCount} voted
        </div>
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: onlineCount > 0 ? `${(votedCount / onlineCount) * 100}%` : '0%' }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <button
          onClick={onReveal}
          disabled={votedCount === 0}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Eye className="w-4 h-4" />
          Reveal Cards
        </button>
      </motion.div>
    )
  }

  if (session.status === 'revealed') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {/* Final score picker */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground text-center font-medium uppercase tracking-wider">
            Final estimate
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {CARD_VALUES.filter(v => !['?', '☕'].includes(v)).map(v => (
              <button
                key={v}
                onClick={() => setFinalScore(finalScore === v ? '' : v)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-bold transition-all',
                  (finalScore === v) || (!finalScore && displayAverage === v)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {v}
              </button>
            ))}
          </div>
          {displayAverage && !CARD_VALUES.includes(displayAverage as CardValue) && (
            <p className="text-xs text-center text-muted-foreground">
              Average is {displayAverage} — pick the closest estimate above
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onRestartTicket}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-muted text-muted-foreground font-semibold hover:bg-muted/80 active:scale-[0.98] transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Re-vote
          </button>
          <button
            onClick={handleNext}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <Check className="w-4 h-4" />
            {isLastTicket ? 'Finish' : 'Next Ticket'}
          </button>
        </div>
      </motion.div>
    )
  }

  return null
}
