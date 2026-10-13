import { useCallback, useEffect, useState } from 'react'
import { describeCondition, type CardCondition, type CardInteractionRule, type RuleKind } from '../lib/cardInteractions'

const STORAGE_KEY = 'pokemon-tcg-deck-builder:custom-interaction-rules'

export interface StoredCardInteractionRule {
  id: string
  triggerCardName: string
  description: string
  condition: CardCondition
  kind?: RuleKind
}

function loadRules(): StoredCardInteractionRule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as StoredCardInteractionRule[]
  } catch {
    return []
  }
}

export interface NewCardInteractionRule {
  triggerCardName: string
  condition: CardCondition
  description?: string
  kind?: RuleKind
}

export interface UseCardInteractionRulesResult {
  rules: StoredCardInteractionRule[]
  runtimeRules: CardInteractionRule[]
  addRule: (rule: NewCardInteractionRule) => void
  removeRule: (id: string) => void
}

export function useCardInteractionRules(): UseCardInteractionRulesResult {
  const [rules, setRules] = useState<StoredCardInteractionRule[]>(loadRules)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
  }, [rules])

  const addRule = useCallback(({ triggerCardName, condition, description, kind }: NewCardInteractionRule) => {
    setRules((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        triggerCardName,
        condition,
        kind,
        description: description?.trim() || `Interacts with ${describeCondition(condition)}.`,
      },
    ])
  }, [])

  const removeRule = useCallback((id: string) => {
    setRules((prev) => prev.filter((rule) => rule.id !== id))
  }, [])

  const runtimeRules: CardInteractionRule[] = rules.map((rule) => ({
    id: rule.id,
    triggerCardName: rule.triggerCardName,
    description: rule.description,
    condition: rule.condition,
    kind: rule.kind,
  }))

  return { rules, runtimeRules, addRule, removeRule }
}
