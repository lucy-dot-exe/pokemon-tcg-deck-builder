import type { DeckCard } from '../types/card'
import { isBasicEnergy, isBasicPokemon } from './cards'
import { isStandardLegal } from './format'

const REQUIRED_DECK_SIZE = 60
const MAX_COPIES_PER_NAME = 4

export interface DeckCheck {
  id: string
  label: string
  passed: boolean
  detail: string
  /** A few words for the always-visible deck health strip. */
  summary: string
}

export interface DeckValidation {
  isLegal: boolean
  checks: DeckCheck[]
  illegalCards: DeckCard[]
}

export function validateDeck(cards: DeckCard[]): DeckValidation {
  const deckSize = cards.reduce((sum, dc) => sum + dc.count, 0)
  const sizeCheck: DeckCheck = {
    id: 'deck-size',
    label: 'Deck size',
    passed: deckSize === REQUIRED_DECK_SIZE,
    detail: `${deckSize}/${REQUIRED_DECK_SIZE} cards`,
    summary:
      deckSize === REQUIRED_DECK_SIZE
        ? `${REQUIRED_DECK_SIZE} cards`
        : deckSize < REQUIRED_DECK_SIZE
          ? `${REQUIRED_DECK_SIZE - deckSize} cards to go`
          : `${deckSize - REQUIRED_DECK_SIZE} cards over`,
  }

  // The copy limit counts every print of a card name together, so two
  // different sets' printings of the same card still share one limit.
  const copiesByName = new Map<string, number>()
  for (const dc of cards) {
    if (isBasicEnergy(dc.card)) continue
    copiesByName.set(dc.card.name, (copiesByName.get(dc.card.name) ?? 0) + dc.count)
  }
  const overLimit = Array.from(copiesByName.entries()).filter(([, count]) => count > MAX_COPIES_PER_NAME)
  const copyLimitCheck: DeckCheck = {
    id: 'copy-limit',
    label: `Max ${MAX_COPIES_PER_NAME} copies per card`,
    passed: overLimit.length === 0,
    detail:
      overLimit.length === 0
        ? `No card name appears more than ${MAX_COPIES_PER_NAME} times (Basic Energy excepted).`
        : `Over the limit: ${overLimit.map(([name, count]) => `${name} (${count})`).join(', ')}.`,
    summary: overLimit.length === 0 ? `${MAX_COPIES_PER_NAME}-copy limit` : `Over ${MAX_COPIES_PER_NAME}-copy limit`,
  }

  const illegalCards = cards.filter((dc) => !isStandardLegal(dc.card))
  const regulationCheck: DeckCheck = {
    id: 'regulation',
    label: 'Format regulation (Standard)',
    passed: illegalCards.length === 0,
    detail:
      illegalCards.length === 0
        ? 'Every card meets the current Standard regulation.'
        : `${illegalCards.length} card${illegalCards.length === 1 ? '' : 's'} not legal in Standard.`,
    summary: illegalCards.length === 0 ? 'Standard legal' : `${illegalCards.length} not Standard legal`,
  }

  const totalBasics = cards
    .filter((dc) => isBasicPokemon(dc.card))
    .reduce((sum, dc) => sum + dc.count, 0)
  const basicCheck: DeckCheck = {
    id: 'basic-pokemon',
    label: 'Basic Pokémon',
    passed: totalBasics >= 1,
    detail:
      totalBasics >= 1
        ? `${totalBasics} basic Pokémon in deck.`
        : 'No basic Pokémon in deck — this deck cannot be played.',
    summary: totalBasics >= 1 ? 'Has a basic Pokémon' : 'No basic Pokémon',
  }

  const checks = [sizeCheck, copyLimitCheck, regulationCheck, basicCheck]

  return {
    isLegal: checks.every((check) => check.passed),
    checks,
    illegalCards,
  }
}
