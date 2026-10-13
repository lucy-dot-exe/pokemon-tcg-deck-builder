import { DEFAULT_ENERGY_TYPE_COLOR, ENERGY_TYPE_COLORS } from '../data/energyTypeColors'
import type { Card } from '../types/card'

function EnergyCost({ cost }: { cost: string[] }) {
  return (
    <span className="energy-cost">
      {cost.map((type, index) => (
        <span
          key={index}
          className="energy-cost-pip"
          style={{ backgroundColor: ENERGY_TYPE_COLORS[type] ?? DEFAULT_ENERGY_TYPE_COLOR }}
          title={type}
        />
      ))}
    </span>
  )
}

/** A card's rules text: abilities, attacks, rules, weakness/resistance/retreat and its print. */
export function CardText({ card }: { card: Card }) {
  return (
    <div className="card-text">
      {card.abilities?.map((ability) => (
        <p key={ability.name} className="card-detail-text">
          <strong>
            {ability.type}: {ability.name}
          </strong>
          <br />
          {ability.text}
        </p>
      ))}

      {card.attacks?.map((attack) => (
        <p key={attack.name} className="card-detail-text">
          <strong>
            <EnergyCost cost={attack.cost} /> {attack.name}
            {attack.damage ? ` — ${attack.damage}` : ''}
          </strong>
          {attack.text && (
            <>
              <br />
              {attack.text}
            </>
          )}
        </p>
      ))}

      {card.rules?.map((rule, index) => (
        <p key={index} className="card-detail-text">
          {rule}
        </p>
      ))}

      {(card.weaknesses || card.resistances || card.retreatCost) && (
        <p className="card-detail-meta">
          {card.weaknesses && card.weaknesses.length > 0 && (
            <>Weakness: {card.weaknesses.map((w) => `${w.type} ${w.value}`).join(', ')} </>
          )}
          {card.resistances && card.resistances.length > 0 && (
            <>Resistance: {card.resistances.map((r) => `${r.type} ${r.value}`).join(', ')} </>
          )}
          {card.retreatCost && card.retreatCost.length > 0 && (
            <>
              Retreat: <EnergyCost cost={card.retreatCost} />
            </>
          )}
        </p>
      )}

      <p className="card-detail-meta">
        {card.set.name} · #{card.number}
      </p>
    </div>
  )
}
