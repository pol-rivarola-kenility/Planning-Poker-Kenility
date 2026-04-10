import { GameBoard } from '@/components/poker/GameBoard'

interface PageProps {
  params: { id: string }
}

export default function SessionPage({ params }: PageProps) {
  return <GameBoard sessionId={params.id} />
}
