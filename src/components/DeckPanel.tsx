import type { Card, DeckCard } from '../types/card'
import { useDeckStatistics } from '../hooks/useDeckStatistics'
import { DeckCardRow } from './DeckCardRow'

interface DeckPanelProps {
  cards: DeckCard[]
  canAdd: (card: Card) => boolean
  notice: string | null
  onDismissNotice: () => void
  onAdd: (card: Card) => void
  onRemove: (cardId: string) => void
  onClear: () => void
}

const GROUP_ORDER = [
  { supertype: 'Pokémon', className: 'composition-pokemon' },
  { supertype: 'Trainer', className: 'composition-trainer' },
  { supertype: 'Energy', className: 'composition-energy' },
] as const

function groupBySupertype(cards: DeckCard[]) {
  const groups = new Map<string, DeckCard[]>()
  for (const dc of cards) {
    const key = dc.card.supertype
    const list = groups.get(key) ?? []
    list.push(dc)
    groups.set(key, list)
  }
  return groups
}

export function DeckPanel({ cards, canAdd, notice, onDismissNotice, onAdd, onRemove, onClear }: DeckPanelProps) {
  const groups = groupBySupertype(cards)
  const stats = useDeckStatistics(cards)

  return (
    <aside className="deck-panel panel" id="deck" aria-labelledby="deck-heading">
      <div className="panel-header">
        <h2 id="deck-heading">Your deck</h2>
        <button type="button" className="button" onClick={onClear} disabled={cards.length === 0}>
          Clear
        </button>
      </div>

      {notice && (
        <p className="notice notice-error" role="status">
          {notice}
          <button type="button" className="dismiss-inline" onClick={onDismissNotice} aria-label="Dismiss">
            ×
          </button>
        </p>
      )}

      {cards.length === 0 && (
        <p className="empty-state">Your deck is empty. Add cards from the search, or import a list from your clipboard.</p>
      )}

      {GROUP_ORDER.map(({ supertype, className }) => {
        const group = groups.get(supertype)
        if (!group || group.length === 0) return null
        const groupCount = group.reduce((sum, dc) => sum + dc.count, 0)
        return (
          <div key={supertype} className="deck-group">
            <h3>
              <span className={`deck-group-swatch ${className}`} aria-hidden="true" />
              {supertype}
              <span className="deck-group-count">{groupCount}</span>
            </h3>
            <ul className="deck-rows">
              {group.map((dc) => (
                <DeckCardRow
                  key={dc.card.id}
                  card={dc.card}
                  count={dc.count}
                  canAdd={canAdd(dc.card)}
                  onAdd={onAdd}
                  onRemove={onRemove}
                />
              ))}
            </ul>
          </div>
        )
      })}

      {cards.length > 0 && (
        <div className="deck-panel-footer">
          <div>
            <span className="deck-panel-stat-label">Mulligan chance</span>
            <span className="deck-panel-stat-value">{(stats.mulliganChance * 100).toFixed(1)}%</span>
          </div>
          <div>
            <span className="deck-panel-stat-label">Basic Pokémon</span>
            <span className="deck-panel-stat-value">{stats.totalBasics}</span>
          </div>
        </div>
      )}
    </aside>
  )
}
