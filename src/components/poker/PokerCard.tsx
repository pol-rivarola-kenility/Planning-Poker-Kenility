'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { CardValue } from '@/lib/types'

interface PokerCardProps {
  value: CardValue
  isSelected?: boolean
  isRevealed?: boolean
  isFlipped?: boolean   // face-down on the table
  onClick?: () => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  playerName?: string
}

const SUIT_COLORS: Record<string, string> = {
  '1': 'from-slate-700 to-slate-800',
  '2': 'from-slate-700 to-slate-800',
  '3': 'from-violet-800 to-violet-900',
  '5': 'from-violet-800 to-violet-900',
  '8': 'from-indigo-700 to-indigo-900',
  '13': 'from-indigo-700 to-indigo-900',
  '21': 'from-purple-700 to-purple-900',
  '?': 'from-slate-700 to-slate-800',
  '☕': 'from-amber-800 to-amber-900',
}

export function PokerCard({
  value,
  isSelected = false,
  isFlipped = false,
  isRevealed = false,
  onClick,
  disabled = false,
  size = 'md',
  playerName,
}: PokerCardProps) {
  const sizeClasses = {
    sm: 'w-10 h-14 text-sm rounded-lg',
    md: 'w-16 h-24 text-lg rounded-xl',
    lg: 'w-20 h-28 text-2xl rounded-xl',
  }

  const cardContent = (
    <div className={cn('relative perspective cursor-pointer select-none', sizeClasses[size], !onClick && 'cursor-default')}>
      <motion.div
        className="w-full h-full preserve-3d relative"
        animate={{ rotateY: isFlipped && !isRevealed ? 180 : 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Front face */}
        <div
          className={cn(
            'absolute inset-0 backface-hidden rounded-xl border flex flex-col items-center justify-center font-bold transition-all duration-200',
            `bg-gradient-to-br ${SUIT_COLORS[value] || SUIT_COLORS['1']}`,
            isSelected
              ? 'border-primary shadow-lg shadow-primary/30 -translate-y-2 scale-105'
              : 'border-border/50',
          )}
        >
          <span className="absolute top-1.5 left-2 text-xs font-bold text-white/60 leading-none">{value}</span>
          <span className="text-white font-bold">{value}</span>
          <span className="absolute bottom-1.5 right-2 text-xs font-bold text-white/60 leading-none rotate-180">{value}</span>
          {/* Corner suit symbol */}
          <span className="absolute top-1.5 right-1.5 text-white/20 text-xs">♠</span>
        </div>

        {/* Back face (face-down) */}
        <div
          className={cn(
            'absolute inset-0 backface-hidden rotate-y-180 rounded-xl border border-border/50 overflow-hidden',
            'bg-gradient-to-br from-violet-900 to-indigo-900',
          )}
        >
          <div className="absolute inset-1 rounded-lg border border-white/10 flex items-center justify-center">
            <span className="text-white/20 text-lg">♠</span>
          </div>
          {/* Pattern */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.1) 4px, rgba(255,255,255,0.1) 5px)',
          }} />
        </div>
      </motion.div>

      {playerName && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap font-medium">
          {playerName}
        </div>
      )}
    </div>
  )

  if (onClick && !disabled) {
    return (
      <button onClick={onClick} className="focus:outline-none" type="button">
        {cardContent}
      </button>
    )
  }

  return cardContent
}

// A placeholder "card back" for players who haven't voted yet
export function CardBack({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-10 h-14 rounded-lg',
    md: 'w-16 h-24 rounded-xl',
    lg: 'w-20 h-28 rounded-xl',
  }

  return (
    <div className={cn(
      'relative bg-gradient-to-br from-violet-900/50 to-indigo-900/50 border border-dashed border-border/50',
      sizeClasses[size]
    )}>
      <div className="absolute inset-1 rounded-lg border border-white/5 flex items-center justify-center">
        <span className="text-white/10 text-lg">♠</span>
      </div>
    </div>
  )
}
