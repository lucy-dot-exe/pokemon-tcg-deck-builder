import type { Card, DeckCard, Supertype } from '../types/card'
import type { CardInteractionResult } from './cardInteractions'
import { atLeastOneChance } from './statistics'

/** Cards seen by your second turn when going first: the opening hand plus one draw. */
const CARDS_SEEN_BY_SECOND_TURN = 8
/**
 * An interaction is "generic" (Ultra Ball → any Pokémon) when it reaches at
 * least this share of the deck's other cards of the types it matches, and
 * at least GENERIC_MIN_TARGETS of them, so a deck with only a few Pokémon
 * doesn't make every rule generic. Generic interactions are summarized
 * instead of drawn as links, since they'd connect to nearly everything.
 */
const GENERIC_SHARE = 0.5
const GENERIC_MIN_TARGETS = 4
const MAX_OK_FINDINGS = 3
const MAX_NAMES_IN_FINDING = 3

export interface GenericInteraction {
  interaction: CardInteractionResult
  /** e.g. "all 7 of your Pokémon" or "5 of your 9 Trainers". */
  reachLabel: string
}

export interface EvolutionStageCard {
  name: string
  count: number
}

/** One Basic and what evolves from it in the deck, by stage (index 0 is the Basic). */
export interface EvolutionLine {
  basic: string
  stages: EvolutionStageCard[][]
}

export type FindingTone = 'ok' | 'warn' | 'info'

export interface Finding {
  id: string
  tone: FindingTone
  title: string
  detail: string
}

export interface DeckSynergy {
  /** Rule interactions worth showing as links (evolution excluded: see `evolutionLines`). */
  specific: CardInteractionResult[]
  generic: GenericInteraction[]
  evolutionLines: EvolutionLine[]
  findings: Finding[]
  /** Distinct cards each card has a specific (non-generic) link to: the deck list's chip count. */
  linkedNamesByName: Map<string, Set<string>>
  genericIds: Set<string>
}

function withCount(name: string, count: number): string {
  return `${name} ×${count}`
}

/** "A, B and C", or "A, B, C and 2 more" past `max`. */
function listNames(names: string[], max = MAX_NAMES_IN_FINDING): string {
  if (names.length <= 1) return names.join('')
  if (names.length > max) return `${names.slice(0, max).join(', ')} and ${names.length - max} more`
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

function pluralType(supertypes: Supertype[]): string {
  if (supertypes.length !== 1) return 'cards'
  switch (supertypes[0]) {
    case 'Pokémon':
      return 'Pokémon'
    case 'Trainer':
      return 'Trainers'
    case 'Energy':
      return 'Energy cards'
  }
}

function firstCardByName(cards: DeckCard[]): Map<string, DeckCard> {
  const map = new Map<string, DeckCard>()
  for (const dc of cards) {
    const existing = map.get(dc.card.name)
    // Different prints of the same card share a name; count them together.
    map.set(dc.card.name, existing ? { card: existing.card, count: existing.count + dc.count } : dc)
  }
  return map
}

function classifyGeneric(
  interaction: CardInteractionResult,
  byName: Map<string, DeckCard>,
): GenericInteraction | null {
  if (interaction.kind === 'evolution' || interaction.matchingCards.length < GENERIC_MIN_TARGETS) return null
  const supertypes = new Set<Supertype>()
  for (const match of interaction.matchingCards) {
    const card = byName.get(match.name)?.card
    if (card) supertypes.add(card.supertype)
  }
  let pool = 0
  for (const [name, { card }] of byName) {
    if (name !== interaction.triggerCardName && supertypes.has(card.supertype)) pool++
  }
  const reach = interaction.matchingCards.length
  if (reach < pool * GENERIC_SHARE) return null
  const typeLabel = pluralType(Array.from(supertypes))
  return {
    interaction,
    reachLabel: reach === pool ? `all ${pool} of your ${typeLabel}` : `${reach} of your ${pool} ${typeLabel}`,
  }
}

export function computeEvolutionLines(cards: DeckCard[]): EvolutionLine[] {
  const byName = firstCardByName(cards)
  const evolvesInto = (name: string) =>
    Array.from(byName.values())
      .filter(({ card }) => card.supertype === 'Pokémon' && card.evolvesFrom === name)
      .map(({ card, count }) => ({ name: card.name, count }))

  const lines: EvolutionLine[] = []
  for (const { card, count } of byName.values()) {
    if (card.supertype !== 'Pokémon' || !card.subtypes?.includes('Basic')) continue
    const stages: EvolutionStageCard[][] = [[{ name: card.name, count }]]
    let next = evolvesInto(card.name)
    while (next.length > 0) {
      stages.push(next)
      next = next.flatMap((stage) => evolvesInto(stage.name))
    }
    if (stages.length > 1) lines.push({ basic: card.name, stages })
  }
  return lines
}

export function describeEvolutionLine(line: EvolutionLine): string {
  return line.stages
    .map((stage) => stage.map((entry) => withCount(entry.name, entry.count)).join(' / '))
    .join(' → ')
}

export function computeDeckSynergy(cards: DeckCard[], interactions: CardInteractionResult[]): DeckSynergy {
  const byName = firstCardByName(cards)
  const ruleInteractions = interactions.filter((interaction) => interaction.kind !== 'evolution')

  const generic: GenericInteraction[] = []
  const specific: CardInteractionResult[] = []
  for (const interaction of ruleInteractions) {
    const classified = classifyGeneric(interaction, byName)
    if (classified) generic.push(classified)
    else specific.push(interaction)
  }
  const genericIds = new Set(generic.map((entry) => entry.interaction.id))

  const linkedNamesByName = new Map<string, Set<string>>()
  const link = (a: string, b: string) => {
    if (a === b) return
    if (!linkedNamesByName.has(a)) linkedNamesByName.set(a, new Set())
    if (!linkedNamesByName.has(b)) linkedNamesByName.set(b, new Set())
    linkedNamesByName.get(a)!.add(b)
    linkedNamesByName.get(b)!.add(a)
  }
  for (const interaction of specific) {
    for (const match of interaction.matchingCards) link(interaction.triggerCardName, match.name)
  }
  for (const { card } of byName.values()) {
    if (card.evolvesFrom && byName.has(card.evolvesFrom)) link(card.name, card.evolvesFrom)
  }

  const evolutionLines = computeEvolutionLines(cards)
  const findings: Finding[] = []

  const okFindings: Finding[] = []
  for (const line of evolutionLines) {
    const top = line.stages[line.stages.length - 1].map((entry) => entry.name).join(' / ')
    okFindings.push({
      id: `line-${line.basic}`,
      tone: 'ok',
      title: `${top} line:`,
      detail: `${describeEvolutionLine(line)}.`,
    })
  }
  const workingSpecific = specific
    .filter((interaction) => interaction.matchingCards.length > 0)
    .sort((a, b) => b.totalMatchingCount - a.totalMatchingCount)
  for (const interaction of workingSpecific) {
    const trigger = byName.get(interaction.triggerCardName)
    const total = interaction.totalMatchingCount
    okFindings.push({
      id: `rule-${interaction.id}`,
      tone: 'ok',
      title: `${withCount(interaction.triggerCardName, trigger?.count ?? 0)} has ${total} ${total === 1 ? 'target' : 'targets'}:`,
      detail: `${listNames(interaction.matchingCards.map((match) => withCount(match.name, match.count)))}.`,
    })
  }
  findings.push(...okFindings.slice(0, MAX_OK_FINDINGS))

  for (const interaction of specific) {
    if (interaction.matchingCards.length > 0) continue
    const trigger = byName.get(interaction.triggerCardName)
    findings.push({
      id: `dead-${interaction.id}`,
      tone: 'warn',
      title: `${withCount(interaction.triggerCardName, trigger?.count ?? 0)} has nothing to ${interaction.kind === 'search' ? 'find' : 'work with'}:`,
      detail: interaction.description,
    })
  }

  for (const { card, count } of byName.values()) {
    if (card.supertype !== 'Pokémon' || !card.evolvesFrom || byName.has(card.evolvesFrom)) continue
    findings.push({
      id: `orphan-${card.name}`,
      tone: 'warn',
      title: `${withCount(card.name, count)} can't evolve:`,
      detail: `there's no ${card.evolvesFrom} in your deck.`,
    })
  }

  const isolated = Array.from(byName.values())
    .filter(({ card }) => card.supertype === 'Pokémon' && !linkedNamesByName.has(card.name))
    .map(({ card, count }) => withCount(card.name, count))
  if (isolated.length > 0) {
    findings.push({
      id: 'isolated',
      tone: 'warn',
      title: `${listNames(isolated)} ${isolated.length === 1 ? 'has' : 'have'} no specific synergy:`,
      detail: generic.length > 0 ? 'only generic search reaches them.' : 'nothing in your deck interacts with them.',
    })
  }

  if (generic.length > 0) {
    findings.push({
      id: 'generic',
      tone: 'info',
      title: `${generic.length} generic ${generic.length === 1 ? 'card reaches' : 'cards reach'} most of your deck:`,
      detail: `${listNames(generic.map((entry) => entry.interaction.triggerCardName))}. They're grouped below instead of drawn as links.`,
    })
  }

  return { specific, generic, evolutionLines, findings, linkedNamesByName, genericIds }
}

export interface FocusLink {
  /** The linked card, when the link is to one card (absent for "all 7 of your Pokémon"). */
  name?: string
  label: string
  relation: string
  generic: boolean
}

export interface CardFocus {
  card: Card
  count: number
  foundBy: FocusLink[]
  worksWith: FocusLink[]
  /** This card's copies plus every copy of a card that searches the deck for it. */
  outs: number
  outSources: string[]
  /** P(at least one out among the first 8 cards seen). */
  chance: number
  /** A Pokémon with no specific link. */
  isolated: boolean
}

/** How a trigger relates to the focused card, seen from the focused card ("Ultra Ball searches for it"). */
const FOUND_BY_RELATION: Record<CardInteractionResult['kind'], string> = {
  search: 'searches for it',
  recover: 'recovers it',
  other: 'works with it',
  evolution: 'evolution',
}

/** How the focused card, as a trigger, relates to its targets ("Poffin: this card finds it"). */
const TRIGGER_RELATION: Record<CardInteractionResult['kind'], string> = {
  search: 'this card finds it',
  recover: 'this card recovers it',
  other: 'this card works with it',
  evolution: 'evolution',
}

export function computeCardFocus(
  name: string,
  cards: DeckCard[],
  interactions: CardInteractionResult[],
  synergy: DeckSynergy,
): CardFocus | null {
  const byName = firstCardByName(cards)
  const entry = byName.get(name)
  if (!entry) return null
  const deckSize = cards.reduce((sum, dc) => sum + dc.count, 0)

  const foundBy: FocusLink[] = []
  const worksWith: FocusLink[] = []
  const outSources = [withCount(name, entry.count)]
  let outs = entry.count

  for (const interaction of interactions) {
    if (interaction.kind === 'evolution') continue
    const generic = synergy.genericIds.has(interaction.id)
    const triggerCount = byName.get(interaction.triggerCardName)?.count ?? 0

    if (interaction.triggerCardName !== name && interaction.matchingCards.some((match) => match.name === name)) {
      // Only search and recovery find a card; other effects (Rare Candy, N's Castle) just work with it.
      const list = interaction.kind === 'other' ? worksWith : foundBy
      list.push({
        name: interaction.triggerCardName,
        label: withCount(interaction.triggerCardName, triggerCount),
        relation: FOUND_BY_RELATION[interaction.kind] + (generic ? ' · generic' : ''),
        generic,
      })
      if (interaction.kind === 'search') {
        outs += triggerCount
        outSources.push(withCount(interaction.triggerCardName, triggerCount))
      }
    }

    if (interaction.triggerCardName === name) {
      if (generic) {
        const reach = synergy.generic.find((g) => g.interaction.id === interaction.id)?.reachLabel ?? ''
        worksWith.push({ label: reach.charAt(0).toUpperCase() + reach.slice(1), relation: 'generic', generic: true })
      } else {
        for (const match of interaction.matchingCards) {
          worksWith.push({
            name: match.name,
            label: withCount(match.name, match.count),
            relation: TRIGGER_RELATION[interaction.kind],
            generic: false,
          })
        }
      }
    }
  }

  if (entry.card.evolvesFrom) {
    const from = byName.get(entry.card.evolvesFrom)
    if (from) worksWith.push({ name: from.card.name, label: withCount(from.card.name, from.count), relation: 'evolves from', generic: false })
  }
  for (const other of byName.values()) {
    if (other.card.evolvesFrom === name) {
      worksWith.push({ name: other.card.name, label: withCount(other.card.name, other.count), relation: 'evolves into', generic: false })
    }
  }

  foundBy.sort((a, b) => Number(a.generic) - Number(b.generic))
  outs = Math.min(outs, deckSize)

  return {
    card: entry.card,
    count: entry.count,
    foundBy,
    worksWith,
    outs,
    outSources,
    chance: atLeastOneChance(deckSize, outs, Math.min(CARDS_SEEN_BY_SECOND_TURN, deckSize)),
    isolated: entry.card.supertype === 'Pokémon' && !synergy.linkedNamesByName.has(name),
  }
}

/** The card to focus first: the one with the most specific links. */
export function defaultFocusName(synergy: DeckSynergy, cards: DeckCard[]): string | null {
  let best: string | null = null
  let bestLinks = -1
  for (const { card } of cards) {
    const links = synergy.linkedNamesByName.get(card.name)?.size ?? 0
    if (links > bestLinks) {
      best = card.name
      bestLinks = links
    }
  }
  return best
}
