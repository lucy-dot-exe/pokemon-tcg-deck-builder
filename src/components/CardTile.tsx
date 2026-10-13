import type { Card } from '../types/card'

interface CardTileProps {
  card: Card
  count?: number
  onAdd?: (card: Card) => void
  /** When false the add button is disabled (e.g. the 4-copy limit is reached). */
  canAdd?: boolean
}

function setCode(card: Card): string {
  return `${card.set.ptcgoCode ?? card.set.name} ${card.number}`
}

export function CardTile({ card, count = 0, onAdd, canAdd = true }: CardTileProps) {
  return (
    <article className="card-tile">
      <div className="card-tile-image">
        <img src={card.images.small} alt={card.name} loading="lazy" />
        {count > 0 && (
          <span className="card-tile-count" aria-label={`${count} in deck`}>
            ×{count}
          </span>
        )}
      </div>
      <div className="card-tile-footer">
        <div className="card-tile-info">
          <span className="card-tile-name">{card.name}</span>
          <span className="card-tile-set">{setCode(card)}</span>
        </div>
        {onAdd && (
          <button
            type="button"
            className="icon-button icon-button-solid"
            onClick={() => onAdd(card)}
            disabled={!canAdd}
            aria-label={canAdd ? `Add ${card.name} to deck` : `${card.name}: copy limit reached`}
            title={canAdd ? undefined : 'Copy limit reached'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M8 3v10M3 8h10" />
            </svg>
          </button>
        )}
      </div>
    </article>
  )
}
