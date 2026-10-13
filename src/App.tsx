import { useState } from 'react'
import { useDeck } from './hooks/useDeck'
import { useDeckTransfer } from './hooks/useDeckTransfer'
import { CardSearch } from './components/CardSearch'
import { DeckPanel } from './components/DeckPanel'
import { DeckHealthBar } from './components/DeckHealthBar'
import { DeckTransferStatus } from './components/DeckTransferStatus'
import { StatisticsPanel } from './components/StatisticsPanel'
import { ReviewPanel } from './components/ReviewPanel'
import { DeckValidationsPanel } from './components/DeckValidationsPanel'
import { InteractionsPanel } from './components/InteractionsPanel'
import type { Card } from './types/card'

type View = 'builder' | 'statistics' | 'interactions' | 'review'

const VIEWS: { id: View; label: string }[] = [
  { id: 'builder', label: 'Build' },
  { id: 'statistics', label: 'Statistics' },
  { id: 'interactions', label: 'Interactions' },
  { id: 'review', label: 'Review' },
]

function App() {
  const deck = useDeck()
  const transfer = useDeckTransfer(deck.cards, deck.importDeck)
  const [view, setView] = useState<View>('builder')
  const [notice, setNotice] = useState<string | null>(null)

  const handleAddCard = (card: Card) => {
    if (!deck.canAdd(card)) {
      setNotice(`You already have ${deck.maxCopies} copies of ${card.name}.`)
      return
    }
    setNotice(null)
    deck.addCard(card)
  }

  const handleRemoveCard = (cardId: string) => {
    setNotice(null)
    deck.removeCard(cardId)
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-brand">
            <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
              <circle cx="14" cy="14" r="12.5" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M1.5 14h25" stroke="currentColor" strokeWidth="2" />
              <circle cx="14" cy="14" r="4" fill="var(--accent)" stroke="currentColor" strokeWidth="2" />
            </svg>
            <h1>Pokémon TCG Deck Builder</h1>
          </div>
          <nav className="app-nav" aria-label="Sections">
            {VIEWS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={view === id ? 'app-nav-active' : ''}
                aria-current={view === id ? 'page' : undefined}
                onClick={() => setView(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="app-header-actions">
            <button type="button" className="button button-ghost" onClick={transfer.requestImport} disabled={transfer.importing}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M8 2v8m0 0L5 7m3 3 3-3M2.5 11v2.5h11V11" />
              </svg>
              <span className="button-label">
                {transfer.importing
                  ? transfer.importProgress
                    ? `Importing ${transfer.importProgress.completed}/${transfer.importProgress.total}…`
                    : 'Importing…'
                  : 'Import'}
              </span>
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={() => void transfer.exportDeck()}
              disabled={deck.cards.length === 0}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <rect x="5" y="5" width="8.5" height="8.5" rx="1.5" />
                <path d="M3 10.5V3.5A1 1 0 0 1 4 2.5h6.5" />
              </svg>
              <span className="button-label">Copy list</span>
            </button>
          </div>
        </div>
      </header>

      <DeckHealthBar cards={deck.cards} totalCount={deck.totalCount} deckSize={deck.deckSize} />

      <div className="app-content">
        <DeckTransferStatus transfer={transfer} />

        {view === 'builder' && (
          <main className="app-main">
            <CardSearch onAddCard={handleAddCard} copiesOf={deck.copiesOf} canAdd={deck.canAdd} />
            <DeckPanel
              cards={deck.cards}
              canAdd={deck.canAdd}
              notice={notice}
              onDismissNotice={() => setNotice(null)}
              onAdd={handleAddCard}
              onRemove={handleRemoveCard}
              onClear={deck.clearDeck}
            />
            <a className="deck-jump" href="#deck">
              View deck · {deck.totalCount}/{deck.deckSize}
            </a>
          </main>
        )}
        {view === 'statistics' && (
          <main className="app-main app-main-single">
            <StatisticsPanel cards={deck.cards} />
          </main>
        )}
        {view === 'interactions' && (
          <main className="app-main app-main-single">
            <InteractionsPanel cards={deck.cards} />
          </main>
        )}
        {view === 'review' && (
          <main className="app-main app-main-single">
            <ReviewPanel cards={deck.cards} />
            <DeckValidationsPanel cards={deck.cards} />
          </main>
        )}
      </div>

      <footer className="app-footer">
        Made by{' '}
        <a href="https://github.com/lucy-dot-exe" target="_blank" rel="noreferrer">
          lucy-dot-exe
        </a>
      </footer>
    </div>
  )
}

export default App
