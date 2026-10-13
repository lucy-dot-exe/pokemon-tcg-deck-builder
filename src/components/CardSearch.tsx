import { useEffect, useRef, useState } from 'react'
import { useCardSearch } from '../hooks/useCardSearch'
import { CardTile } from './CardTile'
import type { Card, Supertype } from '../types/card'

interface CardSearchProps {
  onAddCard: (card: Card) => void
  copiesOf: (cardId: string) => number
  canAdd: (card: Card) => boolean
}

const SUPERTYPES: Supertype[] = ['Pokémon', 'Trainer', 'Energy']

export function CardSearch({ onAddCard, copiesOf, canAdd }: CardSearchProps) {
  const [query, setQuery] = useState('')
  const [supertype, setSupertype] = useState<Supertype>('Pokémon')
  const { results, loading, loadingMore, error, hasMore, loadMore } = useCardSearch(query, 'standard', supertype)

  const gridRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = gridRef.current
    const sentinel = sentinelRef.current
    if (!root || !sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { root, rootMargin: '200px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
    // hasMore is read here only to re-attach the observer when the sentinel
    // element mounts/unmounts (it's rendered conditionally on hasMore).
  }, [loadMore, hasMore])

  return (
    <section className="card-search" aria-labelledby="card-search-heading">
      <div className="card-search-heading">
        <h2 id="card-search-heading">Find cards</h2>
        <span className="card-search-scope">Standard format</span>
      </div>

      <div className="card-search-controls">
        <label className="search-field">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="8" cy="8" r="5.5" />
            <path d="m12.5 12.5 3.5 3.5" />
          </svg>
          <span className="visually-hidden">Search Pokemon TCG cards by name</span>
          <input
            type="search"
            placeholder="Search by name, e.g. Charizard"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <div className="segmented" role="group" aria-label="Filter by card type">
          {SUPERTYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={supertype === type ? 'segmented-active' : ''}
              onClick={() => setSupertype(type)}
              aria-pressed={supertype === type}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="status-text">Searching…</p>}
      {error && <p className="notice notice-error">{error}</p>}
      {!loading && !error && results.length === 0 && (
        <p className="empty-state">
          {query.trim() ? `No cards found for "${query}".` : `No ${supertype} cards found.`}
        </p>
      )}

      <div className="card-grid card-grid-scroll" ref={gridRef}>
        {results.map((card) => (
          <CardTile
            key={card.id}
            card={card}
            count={copiesOf(card.id)}
            canAdd={canAdd(card)}
            onAdd={onAddCard}
          />
        ))}
        {hasMore && <div ref={sentinelRef} className="card-grid-sentinel" />}
      </div>

      {loadingMore && <p className="status-text">Loading more…</p>}
      {!loading && !loadingMore && !hasMore && results.length > 0 && (
        <p className="status-text">All cards loaded.</p>
      )}
    </section>
  )
}
