import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { StoredCardInteractionRule, NewCardInteractionRule } from '../hooks/useCardInteractionRules'
import type { CardCondition, CardInteractionResult, HpOperator } from '../lib/cardInteractions'
import type { Supertype } from '../types/card'

interface InteractionRulesSectionProps {
  interactions: CardInteractionResult[]
  conditionById: Map<string, CardCondition>
  genericIds: Set<string>
  disabledInteractionIds: Set<string>
  onToggleInteraction: (id: string) => void
  deckCardNames: string[]
  customRules: StoredCardInteractionRule[]
  onAddRule: (rule: NewCardInteractionRule) => void
  onRemoveRule: (id: string) => void
}

const SUPERTYPE_OPTIONS: { value: Supertype | ''; label: string }[] = [
  { value: '', label: 'Any type' },
  { value: 'Pokémon', label: 'Pokémon' },
  { value: 'Trainer', label: 'Trainer' },
  { value: 'Energy', label: 'Energy' },
]

const HP_OPERATOR_OPTIONS: { value: HpOperator | ''; label: string }[] = [
  { value: '', label: 'No HP condition' },
  { value: '<=', label: '≤ (or less)' },
  { value: '<', label: '< (less than)' },
  { value: '=', label: '= (exactly)' },
  { value: '>=', label: '≥ (or more)' },
  { value: '>', label: '> (more than)' },
]

const HP_OPERATOR_SYMBOL: Record<HpOperator, string> = {
  '<=': '≤',
  '<': '<',
  '=': '=',
  '>=': '≥',
  '>': '>',
}

/** Breaks a condition down into the same fields the custom-rule builder has, so users can see how to recreate it. */
function queryFields(condition: CardCondition): string[] {
  const fields: string[] = []
  fields.push(`Type: ${condition.supertype ?? 'Any type'}`)
  if (condition.subtype) fields.push(`Subtype: ${condition.subtype}`)
  if (condition.namePrefix) fields.push(`Name starts with: "${condition.namePrefix}"`)
  if (condition.hp) fields.push(`HP: ${HP_OPERATOR_SYMBOL[condition.hp.operator]} ${condition.hp.value}`)
  if (condition.noRuleBox) fields.push('No Rule Box (excludes ex, V, VMAX, etc.)')
  return fields
}

/** Closes a popover on an outside click or Escape, while it's open. */
function useClosePopoverOnOutsideInteraction(isOpen: boolean, ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, ref, onClose])
}

/** Every interaction that applies (with its map toggle and query), the user's custom rules and the rule builder. */
export function InteractionRulesSection({
  interactions,
  conditionById,
  genericIds,
  disabledInteractionIds,
  onToggleInteraction,
  deckCardNames,
  customRules,
  onAddRule,
  onRemoveRule,
}: InteractionRulesSectionProps) {
  const [expandedInteractionId, setExpandedInteractionId] = useState<string | null>(null)

  const [isNewInteractionOpen, setNewInteractionOpen] = useState(false)
  const newInteractionRef = useRef<HTMLDivElement | null>(null)
  useClosePopoverOnOutsideInteraction(isNewInteractionOpen, newInteractionRef, () => setNewInteractionOpen(false))

  const [triggerCardName, setTriggerCardName] = useState('')
  const [supertype, setSupertype] = useState<Supertype | ''>('')
  const [subtype, setSubtype] = useState('')
  const [namePrefix, setNamePrefix] = useState('')
  const [noRuleBox, setNoRuleBox] = useState(false)
  const [hpOperator, setHpOperator] = useState<HpOperator | ''>('')
  const [hpValue, setHpValue] = useState('')
  const [searchesDeck, setSearchesDeck] = useState(false)
  const [description, setDescription] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!triggerCardName.trim()) return
    const parsedHpValue = Number(hpValue)
    onAddRule({
      triggerCardName: triggerCardName.trim(),
      description,
      kind: searchesDeck ? 'search' : 'other',
      condition: {
        supertype: supertype || undefined,
        subtype: subtype.trim() || undefined,
        namePrefix: namePrefix.trim() || undefined,
        noRuleBox: noRuleBox || undefined,
        hp:
          hpOperator && hpValue.trim() && !Number.isNaN(parsedHpValue)
            ? { operator: hpOperator, value: parsedHpValue }
            : undefined,
      },
    })
    setTriggerCardName('')
    setSupertype('')
    setSubtype('')
    setNamePrefix('')
    setNoRuleBox(false)
    setHpOperator('')
    setHpValue('')
    setSearchesDeck(false)
    setDescription('')
    setNewInteractionOpen(false)
  }

  return (
    <div className="synergy-rules">
      <details className="synergy-disclosure">
        <summary>
          <span className="synergy-disclosure-title">All rules</span>
          <span className="status-text">
            {interactions.length} {interactions.length === 1 ? 'applies' : 'apply'} to your deck
          </span>
        </summary>
        {interactions.length === 0 ? (
          <p className="status-text">No card interactions apply to your deck yet.</p>
        ) : (
          <>
            <p className="status-text">Uncheck one to hide it from the map. Click one to see what it matches.</p>
            <ul className="custom-rule-list">
              {interactions.map((interaction) => {
                const isExpanded = expandedInteractionId === interaction.id
                const condition = conditionById.get(interaction.id)
                return (
                  <li key={interaction.id} className="custom-rule-row interaction-row">
                    <input
                      type="checkbox"
                      checked={!disabledInteractionIds.has(interaction.id)}
                      onChange={() => onToggleInteraction(interaction.id)}
                      aria-label={`Show ${interaction.triggerCardName} on the map`}
                    />
                    <button
                      type="button"
                      className="interaction-query-trigger"
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedInteractionId(isExpanded ? null : interaction.id)}
                    >
                      <strong>{interaction.triggerCardName}</strong>
                      {genericIds.has(interaction.id) ? ' (generic)' : ''} — {interaction.description}
                    </button>

                    {isExpanded && (
                      <div className="interaction-query-results">
                        {condition ? (
                          <>
                            <p className="interaction-query-label">Same as building this on "New interaction" below:</p>
                            <ul className="interaction-query-fields">
                              {queryFields(condition).map((field) => (
                                <li key={field}>{field}</li>
                              ))}
                            </ul>
                          </>
                        ) : (
                          <p className="status-text">Not something the builder below can create (evolution is structural).</p>
                        )}

                        {interaction.matchingCards.length === 0 ? (
                          <p className="status-text">No cards in your deck match this interaction.</p>
                        ) : (
                          <>
                            <p className="interaction-query-label">Currently matches:</p>
                            <ul>
                              {interaction.matchingCards.map((match) => (
                                <li key={match.name}>
                                  {match.name} × {match.count}
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </details>

      {customRules.length > 0 && (
        <div className="breakdown-section">
          <h4>Your custom rules</h4>
          <ul className="custom-rule-list">
            {customRules.map((rule) => (
              <li key={rule.id} className="custom-rule-row">
                <span>
                  <strong>{rule.triggerCardName}</strong> — {rule.description}
                </span>
                <button type="button" onClick={() => onRemoveRule(rule.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="interaction-toggle-popover-wrap" ref={newInteractionRef}>
        <button
          type="button"
          className="interaction-toggle-trigger"
          aria-expanded={isNewInteractionOpen}
          onClick={() => setNewInteractionOpen((open) => !open)}
        >
          New interaction
        </button>

        {isNewInteractionOpen && (
          <div className="interaction-toggle-popover">
            <h4>Add a custom interaction</h4>
            <form className="custom-rule-form" onSubmit={handleSubmit}>
              <select
                value={triggerCardName}
                onChange={(e) => setTriggerCardName(e.target.value)}
                aria-label="Trigger card"
                required
              >
                <option value="">Select a card in your deck…</option>
                {deckCardNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <div className="custom-rule-form-row">
                <select
                  value={supertype}
                  onChange={(e) => setSupertype(e.target.value as Supertype | '')}
                  aria-label="Target card type"
                >
                  {SUPERTYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Subtype (e.g. Basic)"
                  value={subtype}
                  onChange={(e) => setSubtype(e.target.value)}
                  aria-label="Target subtype"
                />
              </div>
              <input
                type="text"
                placeholder={`Name starts with (e.g. "N's")`}
                value={namePrefix}
                onChange={(e) => setNamePrefix(e.target.value)}
                aria-label="Target name starts with"
              />
              <label className="custom-rule-form-checkbox">
                <input type="checkbox" checked={noRuleBox} onChange={(e) => setNoRuleBox(e.target.checked)} />
                No Rule Box (excludes ex, V, VMAX, etc.)
              </label>
              <div className="custom-rule-form-row">
                <select
                  value={hpOperator}
                  onChange={(e) => setHpOperator(e.target.value as HpOperator | '')}
                  aria-label="HP comparison"
                >
                  {HP_OPERATOR_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="HP value"
                  value={hpValue}
                  onChange={(e) => setHpValue(e.target.value)}
                  disabled={!hpOperator}
                  aria-label="HP value"
                />
              </div>
              <label className="custom-rule-form-checkbox">
                <input type="checkbox" checked={searchesDeck} onChange={(e) => setSearchesDeck(e.target.checked)} />
                Searches the deck for them (counts as an out)
              </label>
              <input
                type="text"
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                aria-label="Rule description"
              />
              <button type="submit" disabled={!triggerCardName.trim()}>
                Add interaction
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
