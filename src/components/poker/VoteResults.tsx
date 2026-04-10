'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Player } from '@/lib/types'

interface VoteResultsProps {
  players: Player[]
  average: number | null
}

export function VoteResults({ players, average }: VoteResultsProps) {
  const voted = players.filter(p => p.vote && p.isOnline)

  // Build distribution
  const dist: Record<string, number> = {}
  voted.forEach(p => {
    if (p.vote) dist[p.vote] = (dist[p.vote] || 0) + 1
  })
  const maxCount = Math.max(...Object.values(dist), 1)
  const sortedEntries = Object.entries(dist).sort((a, b) => b[1] - a[1])

  // Consensus: did everyone agree?
  const consensus = Object.keys(dist).length === 1

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="bg-card border border-border rounded-2xl p-5 space-y-5"
    >
      {/* Average */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">
            {consensus ? '🎉 Consensus!' : 'Average'}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-foreground">
              {average !== null ? average : '—'}
            </span>
            {average !== null && (
              <span className="text-muted-foreground text-sm">points</span>
            )}
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-muted-foreground">
            {voted.length} vote{voted.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Distribution */}
      {sortedEntries.length > 0 && (
        <div className="space-y-2">
          {sortedEntries.map(([value, count], i) => (
            <motion.div
              key={value}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="flex items-center gap-3"
            >
              <span className={cn(
                'w-10 text-sm font-bold text-right flex-shrink-0',
                i === 0 ? 'text-primary' : 'text-muted-foreground'
              )}>
                {value}
              </span>
              <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden">
                <motion.div
                  className={cn(
                    'h-full rounded-md',
                    i === 0 ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${(count / maxCount) * 100}%` }}
                  transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1], delay: i * 0.05 }}
                />
              </div>
              <span className="w-4 text-xs text-muted-foreground flex-shrink-0 text-right">
                {count}
              </span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Individual votes */}
      <div className="flex flex-wrap gap-2 pt-1">
        {voted.map(player => (
          <div key={player.id} className="flex items-center gap-1.5 bg-muted rounded-lg px-2.5 py-1">
            <span className="text-xs text-muted-foreground">{player.name}</span>
            <span className="text-xs font-bold text-foreground">{player.vote}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
