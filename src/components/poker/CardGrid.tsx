'use client'

import { motion } from 'framer-motion'
import { PokerCard } from './PokerCard'
import { CARD_VALUES, type CardValue } from '@/lib/types'
import { cn } from '@/lib/utils'

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
        </motion.div>
      ))}
    </div>
  )
}
