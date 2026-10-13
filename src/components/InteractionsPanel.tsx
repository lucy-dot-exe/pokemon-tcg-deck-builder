import { useMemo, useState } from 'react'
import { useCardInteractions } from '../hooks/useCardInteractions'
import { useCardInteractionRules } from '../hooks/useCardInteractionRules'
import { CARD_INTERACTION_RULES, describeCondition, type CardInteractionResult } from '../lib/cardInteractions'
import { computeCardFocus, computeDeckSynergy, defaultFocusName, type Finding } from '../lib/synergy'
import { InteractionRulesSection } from './InteractionRulesSection'
import { SynergyDeckList } from './SynergyDeckList'
import { SynergyFocusPanel } from './SynergyFocusPanel'
import { UnifiedInteractionGraph } from './UnifiedInteractionGraph'
import type { DeckCard } from '../types/card'

interface InteractionsPanelProps {
  cards: DeckCard[]
}

type View = 'summary' | 'map'

const VERB_BY_KIND: Record<CardInteractionResult['kind'], string> = {
  search: 'finds',
  recover: 'gets back',
  other: 'works with',
  evolution: 'evolves into',
}

function FindingIcon({ tone }: { tone: Finding['tone'] }) {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" className="synergy-finding-icon">
      {tone === 'ok' && <path d="M20 6 9 17l-5-5" />}
      {tone === 'warn' && (
        <>
          <path d="M12 3 2 21h20L12 3z" />
          <path d="M12 10v5" />
          <path d="M12 18h.01" />
        </>
      )}
      {tone === 'info' && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v6" />
          <path d="M12 7.5h.01" />
        </>
      )}
    </svg>
  )
}

export function InteractionsPanel({ cards }: InteractionsPanelProps) {
  const { rules: customRules, runtimeRules, addRule, removeRule } = useCardInteractionRules()
  const allRules = useMemo(() => [...CARD_INTERACTION_RULES, ...runtimeRules], [runtimeRules])
  const interactions = useCardInteractions(cards, allRules)
  const synergy = useMemo(() => computeDeckSynergy(cards, interactions), [cards, interactions])

  const conditionById = useMemo(() => new Map(allRules.map((rule) => [rule.id, rule.condition])), [allRules])
  const countByName = useMemo(() => {
    const map = new Map<string, number>()
    for (const { card, count } of cards) map.set(card.name, (map.get(card.name) ?? 0) + count)
    return map
  }, [cards])
  const deckCardNames = useMemo(() => Array.from(countByName.keys()).sort((a, b) => a.localeCompare(b)), [countByName])

  const [view, setView] = useState<View>('summary')
  const [showGenericOnMap, setShowGenericOnMap] = useState(false)
  const [disabledInteractionIds, setDisabledInteractionIds] = useState<Set<string>>(new Set())
  const toggleInteraction = (id: string) => {
    setDisabledInteractionIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Keep the user's pick while it's in the deck; otherwise focus the best-connected card.
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const focusName = selectedName && countByName.has(selectedName) ? selectedName : defaultFocusName(synergy, cards)
  // On narrow screens the deck list sits below the focus panel, so bring the panel into view.
  const selectFromDeckList = (name: string) => {
    setSelectedName(name)
    if (window.matchMedia('(max-width: 899px)').matches) {
      document.getElementById('synergy-focus-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }
  const focus = useMemo(
    () => (focusName ? computeCardFocus(focusName, cards, interactions, synergy) : null),
    [focusName, cards, interactions, synergy],
  )

  const mapInteractions = useMemo(
    () =>
      interactions.filter(
        (interaction) =>
          !disabledInteractionIds.has(interaction.id) && (showGenericOnMap || !synergy.genericIds.has(interaction.id)),
      ),
    [interactions, disabledInteractionIds, showGenericOnMap, synergy],
  )

  if (cards.length === 0) {
    return (
      <section className="interactions-panel viz-root">
        <h2>Interactions</h2>
        <p className="status-text">Add cards to your deck to see how they interact.</p>
      </section>
    )
  }

  const chip = (name: string, strong = false) => (
    <button
      key={name}
      type="button"
      className={`synergy-chip${strong ? ' synergy-chip-strong' : ''}${name === focusName ? ' synergy-chip-selected' : ''}`}
      aria-pressed={name === focusName}
      onClick={() => setSelectedName(name)}
    >
      {name} ×{countByName.get(name) ?? 0}
    </button>
  )

  const workingSpecific = synergy.specific.filter((interaction) => interaction.matchingCards.length > 0)

  return (
    <section className="interactions-panel viz-root">
      <h2>Interactions</h2>

      <div className="synergy-layout">
        <SynergyDeckList cards={cards} synergy={synergy} selectedName={focusName} onSelect={selectFromDeckList} />

        <div className="synergy-main">
          <section className="synergy-box" aria-labelledby="synergy-summary-heading">
            <div className="synergy-box-header">
              <h3 id="synergy-summary-heading">What stands out</h3>
              <div className="synergy-view-toggle" role="group" aria-label="View">
                <button type="button" aria-pressed={view === 'summary'} onClick={() => setView('summary')}>
                  Summary
                </button>
                <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}>
                  Map
                </button>
              </div>
            </div>
            {synergy.findings.length === 0 ? (
              <p className="status-text">No synergies or problems found yet.</p>
            ) : (
              <ul className="synergy-findings">
                {synergy.findings.map((finding) => (
                  <li key={finding.id} className={`synergy-finding synergy-finding-${finding.tone}`}>
                    <FindingIcon tone={finding.tone} />
                    <span>
                      <strong>{finding.title}</strong> {finding.detail}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {view === 'summary' ? (
            <section className="synergy-box" aria-labelledby="synergy-list-heading">
              <h3 id="synergy-list-heading">Synergies</h3>
              <p className="status-text synergy-hint">
                Cards that work with specific parts of your deck. Select any card to focus on it.
              </p>

              {workingSpecific.length === 0 && synergy.evolutionLines.length === 0 ? (
                <p className="status-text">No specific synergies in your deck yet.</p>
              ) : (
                <ul className="synergy-list">
                  {synergy.evolutionLines.map((line) => (
                    <li key={`line-${line.basic}`} className="synergy-item">
                      <div className="synergy-item-row">
                        <span className="synergy-item-label">Evolution line</span>
                        {line.stages.map((stage, index) => (
                          <span key={index} className="synergy-stage">
                            {index > 0 && (
                              <span aria-hidden="true" className="synergy-arrow">
                                →
                              </span>
                            )}
                            {stage.map((entry) => chip(entry.name))}
                          </span>
                        ))}
                      </div>
                      <p className="synergy-item-note">
                        {line.stages.map((stage) => stage.reduce((sum, entry) => sum + entry.count, 0)).join('-')} line
                      </p>
                    </li>
                  ))}
                  {workingSpecific.map((interaction) => {
                    const condition = conditionById.get(interaction.id)
                    return (
                      <li key={interaction.id} className="synergy-item">
                        <div className="synergy-item-row">
                          {chip(interaction.triggerCardName, true)}
                          <span className="synergy-verb">{VERB_BY_KIND[interaction.kind]}</span>
                          {interaction.matchingCards.map((match) => chip(match.name))}
                        </div>
                        <p className="synergy-item-note">
                          {condition ? `${describeCondition(condition)} · ` : ''}
                          {interaction.totalMatchingCount} {interaction.totalMatchingCount === 1 ? 'card' : 'cards'} in
                          your deck
                        </p>
                      </li>
                    )
                  })}
                </ul>
              )}

              {synergy.generic.length > 0 && (
                <details className="synergy-disclosure synergy-generic">
                  <summary>
                    <span className="synergy-disclosure-title">Generic search</span>
                    <span className="status-text">
                      {synergy.generic.length} {synergy.generic.length === 1 ? 'card reaches' : 'cards reach'} most of
                      your deck, hidden from the map
                    </span>
                  </summary>
                  <ul>
                    {synergy.generic.map(({ interaction, reachLabel }) => (
                      <li key={interaction.id}>
                        <strong>
                          {interaction.triggerCardName} ×{countByName.get(interaction.triggerCardName) ?? 0}
                        </strong>{' '}
                        {VERB_BY_KIND[interaction.kind]} {reachLabel}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          ) : (
            <section className="synergy-box" aria-label="Interaction map">
              <UnifiedInteractionGraph interactions={mapInteractions} cards={cards} onCardClick={setSelectedName} />
              {synergy.generic.length > 0 && (
                <label className="custom-rule-form-checkbox synergy-map-option">
                  <input
                    type="checkbox"
                    checked={showGenericOnMap}
                    onChange={(e) => setShowGenericOnMap(e.target.checked)}
                  />
                  Show generic search ({synergy.generic.map((entry) => entry.interaction.triggerCardName).join(', ')})
                </label>
              )}
            </section>
          )}

          <InteractionRulesSection
            interactions={interactions}
            conditionById={conditionById}
            genericIds={synergy.genericIds}
            disabledInteractionIds={disabledInteractionIds}
            onToggleInteraction={toggleInteraction}
            deckCardNames={deckCardNames}
            customRules={customRules}
            onAddRule={addRule}
            onRemoveRule={removeRule}
          />
        </div>

        {focus && <SynergyFocusPanel focus={focus} onSelect={setSelectedName} />}
      </div>
    </section>
  )
}
