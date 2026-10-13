import type { DeckTransfer } from '../hooks/useDeckTransfer'

interface DeckTransferStatusProps {
  transfer: DeckTransfer
}

/** Confirmation, progress and result messages for clipboard import/export. */
export function DeckTransferStatus({ transfer }: DeckTransferStatusProps) {
  const {
    confirmingImport,
    exportStatus,
    exportFallbackText,
    importError,
    importProgress,
    importIssues,
  } = transfer

  if (!confirmingImport && !exportStatus && !importError && !importProgress && importIssues.length === 0) {
    return null
  }

  return (
    <div className="transfer-status">
      {confirmingImport && (
        <div className="inline-confirm">
          <span>Importing will replace your current deck.</span>
          <div className="inline-confirm-actions">
            <button type="button" onClick={transfer.confirmImport}>
              Replace deck
            </button>
            <button type="button" onClick={transfer.cancelImport}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {exportStatus && (
        <p className={exportFallbackText ? 'notice notice-error' : 'notice'} role="status">
          {exportStatus}
          <button type="button" className="dismiss-inline" onClick={transfer.dismissExportStatus} aria-label="Dismiss">
            ×
          </button>
        </p>
      )}

      {exportFallbackText && (
        <textarea
          className="export-fallback"
          readOnly
          value={exportFallbackText}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Deck list text to copy manually"
        />
      )}

      {importError && (
        <p className="notice notice-error" role="alert">
          {importError}
          <button type="button" className="dismiss-inline" onClick={transfer.dismissImportError} aria-label="Dismiss">
            ×
          </button>
        </p>
      )}

      {importProgress && (
        <div
          className="import-progress-track"
          role="progressbar"
          aria-label="Import progress"
          aria-valuenow={importProgress.completed}
          aria-valuemin={0}
          aria-valuemax={importProgress.total}
        >
          <div
            className="import-progress-fill"
            style={{ width: `${(importProgress.completed / Math.max(importProgress.total, 1)) * 100}%` }}
          />
        </div>
      )}

      {importIssues.length > 0 && (
        <div className="import-issues">
          <div className="import-issues-header">
            <span>
              {importIssues.length} line{importIssues.length === 1 ? '' : 's'} couldn't be imported
            </span>
            <button type="button" onClick={transfer.dismissImportIssues} aria-label="Dismiss import issues">
              ×
            </button>
          </div>
          <ul>
            {importIssues.map((issue) => (
              <li key={issue.raw}>
                <code>{issue.raw}</code> — {issue.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
