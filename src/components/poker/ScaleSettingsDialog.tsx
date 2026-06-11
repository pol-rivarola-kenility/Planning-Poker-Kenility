'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Plus, Trash2, RotateCcw } from 'lucide-react'
import type { CardConfig } from '@/lib/types'

const DEFAULT_SCALE: CardConfig[] = [
  { value: '1',  tooltip: 'Less than 2 hours' },
  { value: '2',  tooltip: 'Half a day' },
  { value: '3',  tooltip: 'Up to two days' },
  { value: '5',  tooltip: 'Few days' },
  { value: '8',  tooltip: 'Around a week · consider splitting' },
  { value: '13', tooltip: 'More than a week · must be split' },
  { value: '21', tooltip: 'Way too big · must be split' },
  { value: '?',  tooltip: 'Unknown complexity' },
  { value: '☕', tooltip: 'Need a break' },
]

const STORAGE_KEY = 'pp_scale_config'

interface ScaleSettingsDialogProps {
  currentScale: CardConfig[] | null | undefined
  onApply: (scale: CardConfig[]) => void
  onClose: () => void
}

export function ScaleSettingsDialog({ currentScale, onApply, onClose }: ScaleSettingsDialogProps) {
  const [cards, setCards] = useState<CardConfig[]>(
    currentScale && currentScale.length > 0 ? currentScale : DEFAULT_SCALE
  )

  useEffect(() => {
    if (currentScale && currentScale.length > 0) return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) setCards(parsed)
      }
    } catch {}
  }, [currentScale])

  function updateValue(index: number, value: string) {
    setCards(prev => prev.map((c, i) => i === index ? { ...c, value } : c))
  }

  function updateTooltip(index: number, tooltip: string) {
    setCards(prev => prev.map((c, i) => i === index ? { ...c, tooltip } : c))
  }

  function addCard() {
    setCards(prev => [...prev, { value: '', tooltip: '' }])
  }

  function removeCard(index: number) {
    setCards(prev => prev.filter((_, i) => i !== index))
  }

  function resetToDefaults() {
    setCards(DEFAULT_SCALE)
  }

  function handleApply() {
    const valid = cards.filter(c => c.value.trim())
    if (valid.length === 0) return
    const normalized = valid.map(c => ({ value: c.value.trim(), tooltip: c.tooltip.trim() }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
    onApply(normalized)
    onClose()
  }

  const validCount = cards.filter(c => c.value.trim()).length

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">Estimation Scale</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure cards and tooltips shown to all players
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Column labels */}
        <div className="flex items-center gap-2 px-5 pt-4 pb-1.5 flex-shrink-0">
          <span className="w-16 text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">Card</span>
          <span className="flex-1 text-xs font-medium text-muted-foreground uppercase tracking-wider pl-1">Tooltip</span>
          <span className="w-8" />
        </div>

        {/* Rows */}
        <div className="overflow-y-auto flex-1 px-5 pb-3 space-y-2">
          {cards.map((card, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={card.value}
                onChange={e => updateValue(i, e.target.value)}
                maxLength={5}
                placeholder="e.g. 5"
                className="w-16 px-2.5 py-1.5 rounded-lg bg-muted border border-border text-sm font-bold text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
              <input
                type="text"
                value={card.tooltip}
                onChange={e => updateTooltip(i, e.target.value)}
                placeholder="Tooltip (optional)"
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-muted border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
              <button
                onClick={() => removeCard(i)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <button
            onClick={addCard}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-border/60 transition-colors mt-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add card
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-border flex-shrink-0">
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to defaults
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={validCount === 0}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save & Apply
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
