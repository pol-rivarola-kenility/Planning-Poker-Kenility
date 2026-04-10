'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Crown, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Player } from '@/lib/types'

interface PlayerListProps {
  players: Player[]
  votesRevealed: boolean
  myId?: string
}

const AVATAR_COLORS = [
  'bg-violet-600', 'bg-indigo-600', 'bg-blue-600', 'bg-teal-600',
  'bg-emerald-600', 'bg-amber-600', 'bg-orange-600', 'bg-rose-600',
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function PlayerList({ players, votesRevealed, myId }: PlayerListProps) {
  const onlinePlayers = players.filter(p => p.isOnline)
  const offlinePlayers = players.filter(p => !p.isOnline)

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Players
        </span>
        <span className="text-xs text-muted-foreground/60">
          {onlinePlayers.length}/{players.length}
        </span>
      </div>

      <AnimatePresence initial={false}>
        {players.map(player => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: player.isOnline ? 1 : 0.4, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
              player.id === myId ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'
            )}
          >
            {/* Avatar */}
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
              getAvatarColor(player.name)
            )}>
              {player.name.charAt(0).toUpperCase()}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-foreground truncate">
                  {player.name}
                  {player.id === myId && <span className="text-muted-foreground/60 ml-1 text-xs">(you)</span>}
                </span>
                {player.isHost && (
                  <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />
                )}
              </div>
            </div>

            {/* Vote status */}
            <div className="flex-shrink-0">
              {!player.isOnline ? (
                <WifiOff className="w-3.5 h-3.5 text-muted-foreground/40" />
              ) : votesRevealed && player.vote ? (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 text-primary text-sm font-bold"
                >
                  {player.vote}
                </motion.span>
              ) : player.hasVoted ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-6 h-8 rounded-md bg-gradient-to-br from-violet-900 to-indigo-900 border border-border/50 flex items-center justify-center"
                >
                  <span className="text-white/20 text-xs">♠</span>
                </motion.div>
              ) : (
                <div className="w-6 h-8 rounded-md border border-dashed border-border/40" />
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
