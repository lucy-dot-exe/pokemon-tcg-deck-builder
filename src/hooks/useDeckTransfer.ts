import { useState } from 'react'
import type { DeckCard } from '../types/card'
import { formatDeckList, parseDeckList } from '../lib/deckList'
import { resolveDeckList, type ImportIssue } from '../lib/deckImport'
import { readClipboardText, writeClipboardText } from '../lib/clipboard'

export interface DeckTransfer {
  importing: boolean
  importProgress: { completed: number; total: number } | null
  importIssues: ImportIssue[]
  importError: string | null
  confirmingImport: boolean
  exportStatus: string | null
  exportFallbackText: string | null
  requestImport: () => void
  confirmImport: () => void
  cancelImport: () => void
  exportDeck: () => Promise<void>
  dismissImportIssues: () => void
  dismissImportError: () => void
  dismissExportStatus: () => void
}

/**
 * Clipboard import/export of the deck list, plus the status the UI shows
 * while it runs. Lives above the deck panel so the header's Import / Copy
 * list buttons and the status messages can sit in different places.
 */
export function useDeckTransfer(cards: DeckCard[], onImport: (cards: DeckCard[]) => void): DeckTransfer {
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{ completed: number; total: number } | null>(null)
  const [importIssues, setImportIssues] = useState<ImportIssue[]>([])
  const [importError, setImportError] = useState<string | null>(null)
  const [confirmingImport, setConfirmingImport] = useState(false)
  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const [exportFallbackText, setExportFallbackText] = useState<string | null>(null)

  const exportDeck = async () => {
    const text = formatDeckList(cards)
    setExportFallbackText(null)
    try {
      await writeClipboardText(text)
      setExportStatus('Deck list copied to clipboard.')
    } catch (err) {
      setExportStatus(err instanceof Error ? err.message : 'Failed to copy deck list to clipboard.')
      setExportFallbackText(text)
    }
  }

  const runImport = async () => {
    setConfirmingImport(false)
    setImporting(true)
    setImportIssues([])
    setImportError(null)
    try {
      const text = await readClipboardText()
      const { lines, unparsedLines } = parseDeckList(text)
      setImportProgress({ completed: 0, total: lines.length })
      const { cards: resolvedCards, issues } = await resolveDeckList(lines, {
        onProgress: (completed, total) => setImportProgress({ completed, total }),
      })
      onImport(resolvedCards)
      setImportIssues([
        ...unparsedLines.map((raw) => ({ raw, reason: "Couldn't parse this line." })),
        ...issues,
      ])
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import a deck list from the clipboard.')
    } finally {
      setImporting(false)
      setImportProgress(null)
    }
  }

  const requestImport = () => {
    if (cards.length > 0) {
      setConfirmingImport(true)
      return
    }
    void runImport()
  }

  return {
    importing,
    importProgress,
    importIssues,
    importError,
    confirmingImport,
    exportStatus,
    exportFallbackText,
    requestImport,
    confirmImport: () => void runImport(),
    cancelImport: () => setConfirmingImport(false),
    exportDeck,
    dismissImportIssues: () => setImportIssues([]),
    dismissImportError: () => setImportError(null),
    dismissExportStatus: () => setExportStatus(null),
  }
}
