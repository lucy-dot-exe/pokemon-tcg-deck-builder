import 'server-only';
import { TtlCache } from './cache';
import { STANDARD_MIN_REGULATION_MARK, BASIC_ENERGY_NAMES } from './rules';
import type { Card, CardSearchResponse, Format, Supertype } from './types';

const BASE_URL = 'https://api.pokemontcg.io/v2';

// Card data only changes when a set is released, so upstream responses are kept for a while. Bounded so it stays
// well under the service's MemoryMax (a 100-card search page is a few hundred KB).
const cache = new TtlCache<unknown>({ ttlMs: 6 * 60 * 60 * 1000, maxEntries: 200 });

// pokemontcg.io intermittently answers identical queries with a 500/502, so server errors are retried after these
// delays before giving up.
const RETRY_DELAYS_MS = [300, 1000];

export class UpstreamError extends Error {
  constructor(readonly status: number, statusText: string) {
    super(`Pokemon TCG API request failed: ${status} ${statusText}`);
  }
}

async function upstream<T>(path: string, signal?: AbortSignal): Promise<T> {
  const cached = cache.get(path);
  if (cached !== undefined) return cached as T;

  const headers: HeadersInit = {};
  if (process.env.POKEMON_TCG_API_KEY) headers['X-Api-Key'] = process.env.POKEMON_TCG_API_KEY;
  let response = await fetch(`${BASE_URL}${path}`, { headers, signal, cache: 'no-store' });
  for (const delayMs of RETRY_DELAYS_MS) {
    if (response.status < 500) break;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    signal?.throwIfAborted();
    response = await fetch(`${BASE_URL}${path}`, { headers, signal, cache: 'no-store' });
  }
  if (!response.ok) throw new UpstreamError(response.status, response.statusText);
  const body = (await response.json()) as T;
  cache.set(path, body);
  return body;
}

/** What a set code (SVI) or card number (196, TG01) looks like; anything else would be query syntax. */
export const PRINT_TOKEN = /^[A-Za-z0-9-]+$/;

/** Strips the characters that would let a value break out of its quoted Lucene term. */
function quote(value: string): string {
  return `"${value.replace(/["\\]/g, '')}"`;
}

/** Every regulation mark letter from the current cutoff through 'Z' (the API has no >= comparison). */
function standardRegulationMarks(): string[] {
  const marks: string[] = [];
  for (let code = STANDARD_MIN_REGULATION_MARK.charCodeAt(0); code <= 'Z'.charCodeAt(0); code++) {
    marks.push(String.fromCharCode(code));
  }
  return marks;
}

export interface SearchCardsOptions {
  name?: string;
  format?: Format;
  supertype?: Supertype;
  page: number;
  pageSize: number;
}

export function searchCards(
  { name, format, supertype, page, pageSize }: SearchCardsOptions,
  signal?: AbortSignal,
): Promise<CardSearchResponse> {
  const queryParts: string[] = [];
  if (name && name.trim()) {
    queryParts.push(`name:${name.trim()}*`);
  }
  if (supertype) {
    queryParts.push(`supertype:${supertype}`);
  }
  // The API's own legalities.standard flag lags behind real rotations, so "standard" is filtered directly by
  // regulationMark instead. Expanded/unlimited aren't affected by rotation the same way, so those still use the
  // API's legalities field directly.
  if (format === 'standard') {
    queryParts.push(`(${standardRegulationMarks().map((mark) => `regulationMark:${mark}`).join(' OR ')})`);
  } else if (format === 'expanded' || format === 'unlimited') {
    queryParts.push(`legalities.${format}:legal`);
  }
  // Basic Energy is shown from constants in the frontend instead, so exclude every name it might appear under
  // (the API doesn't support grouped negation, so each name is excluded individually).
  for (const basicEnergyName of BASIC_ENERGY_NAMES) {
    queryParts.push(`-name:${quote(basicEnergyName)}`);
  }

  const params = new URLSearchParams();
  params.set('q', queryParts.join(' '));
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  params.set('orderBy', 'name');
  return upstream<CardSearchResponse>(`/cards?${params}`, signal);
}

export async function getCardById(id: string, signal?: AbortSignal): Promise<Card> {
  const { data } = await upstream<{ data: Card }>(`/cards/${encodeURIComponent(id)}`, signal);
  return data;
}

async function queryCards(q: string, signal?: AbortSignal): Promise<Card[]> {
  const params = new URLSearchParams();
  params.set('q', q);
  params.set('pageSize', '250');
  const { data } = await upstream<CardSearchResponse>(`/cards?${params}`, signal);
  return data;
}

/**
 * The exact print referenced by a deck-list line (name + set code + number). The API matches set codes and numbers
 * only unquoted, so callers must pass them as plain tokens (see PRINT_TOKEN).
 */
export function findExactPrint(name: string, setCode: string, number: string, signal?: AbortSignal): Promise<Card[]> {
  return queryCards(`name:${quote(name)} set.ptcgoCode:${setCode} number:${number}`, signal);
}

/** Every card with exactly this name (no wildcard). */
export function findByExactName(name: string, signal?: AbortSignal): Promise<Card[]> {
  return queryCards(`name:${quote(name)}`, signal);
}
