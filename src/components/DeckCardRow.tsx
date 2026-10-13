import type { Card } from '../types/card'
import { isStandardLegal } from '../lib/format'

interface DeckCardRowProps {
  card: Card
  count: number
  canAdd: boolean
  onAdd: (card: Card) => void
  onRemove: (cardId: string) => void
}

function describe(card: Card): string {
  const code = `${card.set.ptcgoCode ?? card.set.name} ${card.number}`
  const subtypes = card.subtypes?.join(' · ')
  return subtypes ? `${code} · ${subtypes}` : code
}

/** One line of the deck list: thumbnail, name, and −/count/+ controls. */
export function DeckCardRow({ card, count, canAdd, onAdd, onRemove }: DeckCardRowProps) {
  const legal = isStandardLegal(card)
  return (
    <li className="deck-row">
      <img className="deck-row-thumb" src={card.images.small} alt="" loading="lazy" />
      <div className="deck-row-info">
        <span className="deck-row-name">{card.name}</span>
        <span className={legal ? 'deck-row-meta' : 'deck-row-meta deck-row-meta-warn'}>
          {legal ? describe(card) : `${describe(card)} · Not Standard legal`}
        </span>
      </div>
      <button
        type="button"
        className="icon-button"
        onClick={() => onRemove(card.id)}
        aria-label={`Remove one ${card.name}`}
      >
        −
      </button>
      <span className="deck-row-count">{count}</span>
      <button
        type="button"
        className="icon-button"
        onClick={() => onAdd(card)}
        disabled={!canAdd}
        aria-label={`Add one ${card.name}`}
      >
        +
      </button>
    </li>
  )
}
