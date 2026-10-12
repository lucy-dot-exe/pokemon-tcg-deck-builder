import type { Card, CardSearchResponse, Format, Supertype } from '../types/card'

/**
 * The deck builder's own API service (server/), which proxies, caches and
 * retries pokemontcg.io. Builds the pokemontcg.io queries itself, so this
 * file only passes the page's parameters through. Override with
 * VITE_API_BASE_URL (e.g. in .env.local); otherwise dev uses a local
 * `npm run dev` in server/ and production builds use the droplet.
 */
const BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV
    ? 'http://localhost:3003/api'
    : 'https://projects.lucina.dev/pokemon-tcg-deck-builder/api')

async function get<T>(path: string, params: Record<string, string | undefined>, signal?: AbortSignal): Promise<T> {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, value)
  }
  const query = search.toString()
  const response = await fetch(`${BASE_URL}${path}${query ? `?${query}` : ''}`, { signal })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Card API request failed: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<T>
}

export interface SearchCardsOptions {
  name?: string
  format?: Format
  supertype?: Supertype
  page?: number
  pageSize?: number
  signal?: AbortSignal
}

export function searchCards({
  name,
  format,
  supertype,
  page = 1,
  pageSize = 100,
  signal,
}: SearchCardsOptions): Promise<CardSearchResponse> {
  return get<CardSearchResponse>(
    '/cards',
    { name: name?.trim() || undefined, format, supertype, page: String(page), pageSize: String(pageSize) },
    signal,
  )
}

export async function getCardById(id: string, signal?: AbortSignal): Promise<Card> {
  const { data } = await get<{ data: Card }>(`/cards/${encodeURIComponent(id)}`, {}, signal)
  return data
}

export interface ExactPrintQuery {
  name: string
  ptcgoCode: string
  number: string
}

/** Resolves the exact print referenced by a deck-list line (name + set code + number). */
export async function findExactPrint(query: ExactPrintQuery, signal?: AbortSignal): Promise<Card[]> {
  const { data } = await get<{ data: Card[] }>(
    '/lookup/print',
    { name: query.name, setCode: query.ptcgoCode, number: query.number },
    signal,
  )
  return data
}

/** Falls back to an exact (non-wildcard) name match when the print above can't be found. */
export async function findByExactName(name: string, signal?: AbortSignal): Promise<Card[]> {
  const { data } = await get<{ data: Card[] }>('/lookup/name', { name }, signal)
  return data
}
