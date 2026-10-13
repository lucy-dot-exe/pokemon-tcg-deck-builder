import type { CardFocus, FocusLink } from '../lib/synergy'
import { CardText } from './CardText'
import { SupertypeDot } from './SynergyDeckList'

interface SynergyFocusPanelProps {
  focus: CardFocus
  onSelect: (name: string) => void
}

function FocusLinkList({ title, links, onSelect }: { title: string; links: FocusLink[]; onSelect: (name: string) => void }) {
  if (links.length === 0) return null
  return (
    <div>
      <h4 className="synergy-group-label">{title}</h4>
      <ul className="synergy-focus-links">
        {links.map((link, index) => (
          <li key={`${link.label}-${link.relation}-${index}`}>
            {link.name ? (
              <button
                type="button"
                className={`synergy-chip${link.generic ? '' : ' synergy-chip-strong'}`}
                onClick={() => onSelect(link.name!)}
              >
                {link.label}
              </button>
            ) : (
              <span className="synergy-chip synergy-chip-summary">{link.label}</span>
            )}
            <span className="synergy-focus-relation">{link.relation}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** One card's synergy: its odds of being found early, what finds it and what it works with. */
export function SynergyFocusPanel({ focus, onSelect }: SynergyFocusPanelProps) {
  const { card } = focus

  return (
    <aside className="synergy-box synergy-focus" aria-labelledby="synergy-focus-heading">
      <div className="synergy-focus-header">
        <img src={card.images.small} alt="" className="synergy-focus-image" />
        <div>
          <p className="synergy-group-label">
            <SupertypeDot supertype={card.supertype} />
            {[card.supertype, ...(card.subtypes ?? [])].join(' · ')}
          </p>
          <h3 id="synergy-focus-heading">
            {card.name} <span className="synergy-focus-count">×{focus.count}</span>
          </h3>
        </div>
      </div>

      <div className="synergy-odds">
        <div className="synergy-odds-value">
          <span className="synergy-odds-number">{Math.round(focus.chance * 100)}%</span>
          <span>to have it or a card that searches for it by your 2nd turn</span>
        </div>
        <p className="synergy-odds-detail">
          {focus.outs} {focus.outs === 1 ? 'out' : 'outs'}: {focus.outSources.join(', ')}. Going first, so 8 cards seen.
        </p>
      </div>

      <FocusLinkList title="Found by" links={focus.foundBy} onSelect={onSelect} />
      <FocusLinkList title="Works with" links={focus.worksWith} onSelect={onSelect} />

      {focus.isolated && (
        <p className="synergy-finding synergy-finding-warn">No specific synergy. Only generic cards reach it, if any.</p>
      )}

      <details className="synergy-card-text">
        <summary>Card text</summary>
        <CardText card={card} />
      </details>
    </aside>
  )
}
