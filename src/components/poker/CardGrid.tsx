'use client'

import { motion } from 'framer-motion'
import { PokerCard } from './PokerCard'
import { CARD_VALUES, type CardValue } from '@/lib/types'

const CARD_TOOLTIPS: Partial<Record<CardValue, string>> = {
  '1':  'Less than 2 hours',
  '2':  'Half a day',
  '3':  'Up to two days',
  '5':  'Few days',
  '8':  'Around a week · consider splitting',
  '13': 'More than a week · must be split',
  '21': 'Way too big · must be split',
  '?':  'Unknown complexity',
  '☕': 'Need a break',
}

interface CardGridProps {
  selectedValue?: CardValue
  onSelect: (value: CardValue) => void
  disabled?: boolean
}

export function CardGrid({ selectedValue, onSelect, disabled }: CardGridProps) {
  return (
    <div className="flex flex-wrap justify-center gap-3 py-2">
      {CARD_VALUES.map((value, i) => (
        <motion.div
          key={value}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.3 }}
          className="relative group/card"
        >
          <motion.div
            animate={selectedValue === value ? { y: -10, scale: 1.05 } : { y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <PokerCard
              value={value}
              isSelected={selectedValue === value}
              onClick={disabled ? undefined : () => onSelect(value)}
              disabled={disabled}
              size="lg"
            />
          </motion.div>

          {/* Tooltip */}
          {CARD_TOOLTIPS[value] && (
            <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 z-50
              opacity-0 group-hover/card:opacity-100 transition-opacity duration-150 whitespace-nowrap">
              <div className="bg-popover border border-border text-popover-foreground text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg">
                {CARD_TOOLTIPS[value]}
              </div>
              {/* Arrow */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0
                border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-border" />
            </div>
          )}
        </motion.div>
      ))}
    </div>
  )
}
