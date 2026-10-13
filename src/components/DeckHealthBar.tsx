import { useDeckValidation } from '../hooks/useDeckValidation'
import type { DeckCard, Supertype } from '../types/card'

interface DeckHealthBarProps {
  cards: DeckCard[]
  totalCount: number
  deckSize: number
}

const SUPERTYPES: { supertype: Supertype; className: string }[] = [
  { supertype: 'Pokémon', className: 'composition-pokemon' },
  { supertype: 'Trainer', className: 'composition-trainer' },
  { supertype: 'Energy', className: 'composition-energy' },
]

/** Deck size, composition and legality at a glance, shown under the header on every view. */
export function DeckHealthBar({ cards, totalCount, deckSize }: DeckHealthBarProps) {
  const validation = useDeckValidation(cards)

  const counts = SUPERTYPES.map(({ supertype, className }) => ({
    supertype,
    className,
    count: cards.filter((dc) => dc.card.supertype === supertype).reduce((sum, dc) => sum + dc.count, 0),
  }))
  const compositionLabel = counts.map(({ supertype, count }) => `${count} ${supertype}`).join(' · ')

  return (
    <div className="health-bar">
      <div className="health-bar-inner">
        <div className="health-bar-count">
          <span className="health-bar-total">
            {totalCount}
            <span className="health-bar-of">/{deckSize}</span>
          </span>
          <div className="composition-bar" role="img" aria-label={compositionLabel}>
            {counts.map(({ supertype, className, count }) => (
              <div
                key={supertype}
                className={className}
                style={{ width: `${Math.min(100, (count / Math.max(deckSize, totalCount)) * 100)}%` }}
              />
            ))}
          </div>
          <span className="health-bar-composition">{compositionLabel}</span>
        </div>
        <ul className="health-checks" aria-label="Deck checks">
          {validation.checks.map((check) => (
            <li key={check.id} className={check.passed ? 'health-check health-check-pass' : 'health-check health-check-fail'}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                {check.passed ? (
                  <path d="m3 7.5 2.5 2.5L11 4.5" />
                ) : (
                  <>
                    <circle cx="7" cy="7" r="5.75" strokeWidth="1.5" />
                    <path d="M7 4.25v3.25" />
                    <circle cx="7" cy="9.75" r="0.4" fill="currentColor" />
                  </>
                )}
              </svg>
              <span className="visually-hidden">{check.passed ? 'Passed: ' : 'Needs attention: '}</span>
              {check.summary}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
