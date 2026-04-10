'use client'

import { useState } from 'react'
import { Loader2, Spade } from 'lucide-react'

interface JoinModalProps {
  sessionName: string
  onJoin: (name: string) => void
  loading: boolean
  error?: string
}

export function JoinModal({ sessionName, onJoin, loading, error }: JoinModalProps) {
  const [name, setName] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim()) onJoin(name.trim())
  }

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl p-8 w-full max-w-sm shadow-2xl shadow-black/40">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
            <Spade className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Join Session</h2>
          <p className="text-sm text-muted-foreground mt-1 text-center">
            {sessionName}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="join-name">
              Your name
            </label>
            <input
              id="join-name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              autoFocus
              maxLength={30}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-3 px-6 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join Session'}
          </button>
        </form>
      </div>
    </div>
  )
}
