export type CardValue = '1' | '2' | '3' | '5' | '8' | '13' | '21' | '?' | '☕'

export const CARD_VALUES: CardValue[] = ['1', '2', '3', '5', '8', '13', '21', '?', '☕']

export interface Player {
  id: string
  name: string
  isHost: boolean
  isOnline: boolean
  hasVoted: boolean
  vote?: CardValue
}

export interface Ticket {
  id: string
  title: string
  description?: string
  jiraKey?: string
  jiraUrl?: string
  finalScore?: string
}

export interface SessionState {
  id: string
  name: string
  status: 'waiting' | 'voting' | 'revealed'
  hostId: string
  players: Player[]
  tickets: Ticket[]
  currentTicketIndex: number
  votesRevealed: boolean
  average?: number | null
}

// Socket event types
export interface ServerToClientEvents {
  'session:state': (state: SessionState) => void
  error: (message: string) => void
}

export interface ClientToServerEvents {
  'session:create': (
    payload: { sessionName: string; playerName: string },
    callback: (res: { success: boolean; sessionId?: string; state?: SessionState; error?: string }) => void
  ) => void
  'session:join': (
    payload: { sessionId: string; playerName: string },
    callback: (res: { success: boolean; state?: SessionState; error?: string }) => void
  ) => void
  'game:vote': (payload: { value: CardValue }) => void
  'game:reveal': () => void
  'game:next-ticket': (payload: { finalScore?: string }) => void
  'game:add-ticket': (payload: { title: string; description?: string; jiraKey?: string; jiraUrl?: string }) => void
  'game:import-tickets': (payload: { tickets: Omit<Ticket, 'id'>[] }) => void
  'game:restart-ticket': () => void
}

export interface JiraTicket {
  key: string
  summary: string
  description: string | null
  url: string
}
