import type { DeckSynergy } from '../lib/synergy'
import type { DeckCard, Supertype } from '../types/card'

interface SynergyDeckListProps {
  cards: DeckCard[]
  synergy: DeckSynergy
  selectedName: string | null
  onSelect: (name: string) => void
}

const SUPERTYPES: Supertype[] = ['Pokémon', 'Trainer', 'Energy']

const SUPERTYPE_DOT_CLASS: Record<Supertype, string> = {
  Pokémon: 'synergy-dot-pokemon',
  Trainer: 'synergy-dot-trainer',
  Energy: 'synergy-dot-energy',
}

export function SupertypeDot({ supertype }: { supertype: Supertype }) {
  return <span aria-hidden="true" className={`synergy-dot ${SUPERTYPE_DOT_CLASS[supertype]}`} />
}

/** The deck by supertype, each card with a chip counting its specific synergies. Selecting one focuses it. */
export function SynergyDeckList({ cards, synergy, selectedName, onSelect }: SynergyDeckListProps) {
  const total = cards.reduce((sum, dc) => sum + dc.count, 0)

  return (
    <section className="synergy-box synergy-deck" aria-labelledby="synergy-deck-heading">
      <div className="synergy-box-header">
        <h3 id="synergy-deck-heading">Your deck</h3>
        <span className="synergy-deck-total">{total} cards</span>
      </div>
      <p className="status-text synergy-hint">Chips count specific synergies. Generic search isn't counted.</p>

      {SUPERTYPES.map((supertype) => {
        // Different prints of one card are listed (and linked) by name, so merge them.
        const countByName = new Map<string, number>()
        for (const { card, count } of cards) {
          if (card.supertype === supertype) countByName.set(card.name, (countByName.get(card.name) ?? 0) + count)
        }
        if (countByName.size === 0) return null
        const groupTotal = Array.from(countByName.values()).reduce((sum, count) => sum + count, 0)

        return (
          <div key={supertype} className="synergy-deck-group">
            <h4 className="synergy-group-label">
              <SupertypeDot supertype={supertype} />
              {supertype} · {groupTotal}
            </h4>
            <ul>
              {Array.from(countByName, ([name, count]) => {
                const links = synergy.linkedNamesByName.get(name)?.size ?? 0
                const isSelected = name === selectedName
                return (
                  <li key={name}>
                    <button
                      type="button"
                      className={`synergy-deck-row${isSelected ? ' synergy-deck-row-selected' : ''}`}
                      aria-pressed={isSelected}
                      aria-label={`${count} ${name}${links > 0 ? `, ${links === 1 ? '1 synergy' : `${links} synergies`}` : ''}`}
                      onClick={() => onSelect(name)}
                    >
                      <span className="synergy-deck-count">{count}</span>
                      <span className="synergy-deck-name">{name}</span>
                      {links > 0 && (
                        <span className="synergy-link-chip">{links === 1 ? '1 synergy' : `${links} synergies`}</span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </section>
  )
}
