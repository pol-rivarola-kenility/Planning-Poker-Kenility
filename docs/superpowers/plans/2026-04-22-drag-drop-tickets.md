# Ticket Queue Drag & Drop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add host-only drag-and-drop reordering of the ticket queue that syncs in real-time to all session participants.

**Architecture:** Framer Motion v11 `Reorder` API manages drag UX with per-item `dragControls` so only the grip handle initiates drags (preserving existing click handlers). The host's local state updates optimistically on drag; `game:reorder-tickets` socket event syncs the new order to the server, which recalculates `currentTicketIndex` by ticket ID and broadcasts updated state to all clients.

**Tech Stack:** Framer Motion v11 `Reorder` + `useDragControls`, Socket.io, Next.js/React

---

### Task 1: Add type definition and server event handler

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `server.js`

- [ ] **Step 1: Add `game:reorder-tickets` to `ClientToServerEvents` in `src/lib/types.ts`**

In the `ClientToServerEvents` interface, add after `'game:jump-to-ticket'`:
```typescript
'game:reorder-tickets': (payload: { ticketIds: string[] }) => void
```

- [ ] **Step 2: Add server handler in `server.js`**

After the `game:jump-to-ticket` handler (around line 303), add:
```javascript
// ── Reorder tickets (host only) ────────────────────────────────────────
socket.on('game:reorder-tickets', ({ ticketIds }) => {
  const { sessionId, playerId } = socket.data
  const session = sessions.get(sessionId)
  if (!session || session.hostId !== playerId) return
  if (!Array.isArray(ticketIds) || ticketIds.length !== session.tickets.length) return

  const currentTicketId = session.tickets[session.currentTicketIndex]?.id

  const ticketMap = new Map(session.tickets.map(t => [t.id, t]))
  const reordered = ticketIds.map(id => ticketMap.get(id)).filter(Boolean)
  if (reordered.length !== session.tickets.length) return

  session.tickets = reordered
  session.currentTicketIndex = session.tickets.findIndex(t => t.id === currentTicketId)
  if (session.currentTicketIndex === -1) session.currentTicketIndex = 0

  broadcastState(io, sessionId)
})
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts server.js
git commit -m "feat: add game:reorder-tickets socket event type and server handler"
```

---

### Task 2: Wire reorderTickets through GameBoard

**Files:**
- Modify: `src/components/poker/GameBoard.tsx`

- [ ] **Step 1: Add `reorderTickets` emitter function**

After the `jumpToTicket` function (around line 182), add:
```typescript
function reorderTickets(ticketIds: string[]) {
  socket.emit('game:reorder-tickets', { ticketIds })
}
```

- [ ] **Step 2: Pass prop to desktop TicketQueue (~line 390)**

Add `onReorderTickets={reorderTickets}` to the desktop `<TicketQueue>` component.

- [ ] **Step 3: Pass prop to mobile TicketQueue (~line 405)**

Add `onReorderTickets={reorderTickets}` to the mobile `<TicketQueue>` component.

- [ ] **Step 4: Commit**

```bash
git add src/components/poker/GameBoard.tsx
git commit -m "feat: wire reorderTickets emitter into GameBoard"
```

---

### Task 3: Update TicketQueue with drag-and-drop

**Files:**
- Modify: `src/components/poker/TicketQueue.tsx`

- [ ] **Step 1: Update imports**

Replace:
```typescript
import { motion, AnimatePresence } from 'framer-motion'
```
With:
```typescript
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
```

Add `GripVertical` to the lucide-react import line.

- [ ] **Step 2: Add `onReorderTickets` to `TicketQueueProps`**

```typescript
interface TicketQueueProps {
  tickets: Ticket[]
  currentIndex: number
  isHost: boolean
  onAddTicket: (title: string, description?: string) => void
  onOpenJira: () => void
  onRemoveTicket?: (ticketId: string) => void
  onJumpToTicket?: (index: number) => void
  onReorderTickets?: (ticketIds: string[]) => void
}
```

- [ ] **Step 3: Add local order state and sync effect**

Inside `TicketQueue`, after the existing `useState` calls:
```typescript
const [orderedTickets, setOrderedTickets] = useState<Ticket[]>(tickets)

useEffect(() => {
  setOrderedTickets(tickets)
}, [tickets])
```

- [ ] **Step 4: Add `DraggableTicketItem` sub-component**

Add this component above `TicketQueue` (below `TicketSendButton`):

```typescript
function DraggableTicketItem({
  ticket,
  index,
  currentIndex,
  isHost,
  onRemoveTicket,
  onJumpToTicket,
  onDragEnd,
}: {
  ticket: Ticket
  index: number
  currentIndex: number
  isHost: boolean
  onRemoveTicket?: (id: string) => void
  onJumpToTicket?: (index: number) => void
  onDragEnd: () => void
}) {
  const controls = useDragControls()
  const isDone = !!ticket.finalScore
  const isCurrent = !isDone && index === currentIndex
  const isPending = !isDone && index !== currentIndex
  const canJump = isHost && isPending && !!onJumpToTicket

  return (
    <Reorder.Item
      value={ticket}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      className={cn(
        'group flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-sm transition-colors list-none',
        isCurrent && 'bg-primary/10 border-primary/25 text-foreground',
        isDone && 'bg-muted/30 border-border/30 text-muted-foreground',
        isPending && 'bg-card border-border hover:bg-muted/40 text-foreground',
        canJump && 'cursor-pointer',
      )}
      onClick={canJump ? () => onJumpToTicket!(index) : undefined}
    >
      {/* Drag handle — host only */}
      <div
        onPointerDown={e => controls.start(e)}
        className="flex-shrink-0 mt-0.5 cursor-grab active:cursor-grabbing touch-none text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Status icon */}
      <div className="flex-shrink-0 mt-0.5">
        {isDone ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : isCurrent ? (
          <ChevronRight className="w-3.5 h-3.5 text-primary" />
        ) : (
          <Clock className="w-3.5 h-3.5 text-muted-foreground/50" />
        )}
      </div>

      {/* Ticket info */}
      <div className="flex-1 min-w-0">
        {ticket.jiraKey && (
          ticket.jiraUrl ? (
            <a
              href={ticket.jiraUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-xs font-mono text-primary/70 mb-0.5 hover:underline inline-flex items-center gap-0.5"
            >
              {ticket.jiraKey}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          ) : (
            <span className="text-xs font-mono text-primary/70 block mb-0.5">{ticket.jiraKey}</span>
          )
        )}
        <p className="text-xs leading-snug truncate">{ticket.title}</p>
        {isDone && ticket.finalScore && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs font-bold text-emerald-400">
              → {ticket.finalScore} pts
            </span>
            <TicketSendButton ticket={ticket} />
          </div>
        )}
      </div>

      {/* Remove button */}
      {isHost && onRemoveTicket && (
        <button
          onClick={e => { e.stopPropagation(); onRemoveTicket(ticket.id) }}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 mt-0.5 text-muted-foreground/40 hover:text-destructive transition-all"
          title="Remove ticket"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </Reorder.Item>
  )
}
```

- [ ] **Step 5: Replace ticket list rendering in `TicketQueue`**

Replace the `<div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">` block with:

```typescript
<div className="flex-1 overflow-y-auto min-h-0">
  {isHost ? (
    <Reorder.Group
      axis="y"
      values={orderedTickets}
      onReorder={setOrderedTickets}
      className="space-y-1.5"
    >
      {orderedTickets.map((ticket, i) => (
        <DraggableTicketItem
          key={ticket.id}
          ticket={ticket}
          index={i}
          currentIndex={currentIndex}
          isHost={isHost}
          onRemoveTicket={onRemoveTicket}
          onJumpToTicket={onJumpToTicket}
          onDragEnd={() => onReorderTickets?.(orderedTickets.map(t => t.id))}
        />
      ))}
    </Reorder.Group>
  ) : (
    <AnimatePresence initial={false}>
      <div className="space-y-1.5">
        {tickets.map((ticket, i) => {
          const isDone = !!ticket.finalScore
          const isCurrent = !isDone && i === currentIndex
          const isPending = !isDone && i !== currentIndex

          return (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-sm transition-colors',
                isCurrent && 'bg-primary/10 border-primary/25 text-foreground',
                isDone && 'bg-muted/30 border-border/30 text-muted-foreground',
                isPending && 'bg-card border-border text-foreground',
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {isDone ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : isCurrent ? (
                  <ChevronRight className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-muted-foreground/50" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {ticket.jiraKey && (
                  ticket.jiraUrl ? (
                    <a
                      href={ticket.jiraUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-primary/70 mb-0.5 hover:underline inline-flex items-center gap-0.5"
                    >
                      {ticket.jiraKey}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ) : (
                    <span className="text-xs font-mono text-primary/70 block mb-0.5">{ticket.jiraKey}</span>
                  )
                )}
                <p className="text-xs leading-snug truncate">{ticket.title}</p>
                {isDone && ticket.finalScore && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-bold text-emerald-400">→ {ticket.finalScore} pts</span>
                    <TicketSendButton ticket={ticket} />
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </AnimatePresence>
  )}

  {tickets.length === 0 && (
    <p className="text-xs text-muted-foreground/50 text-center py-4">
      No tickets yet
    </p>
  )}
</div>
```

- [ ] **Step 6: Commit**

```bash
git add src/components/poker/TicketQueue.tsx
git commit -m "feat: add drag-and-drop ticket reordering with Framer Motion Reorder"
```
