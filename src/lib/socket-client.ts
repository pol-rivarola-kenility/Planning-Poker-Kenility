import { io, Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from './types'

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    socket = io({
      path: '/api/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function getOrCreateStableId(): string {
  let id = localStorage.getItem('pp_player_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('pp_player_id', id)
  }
  return id
}
