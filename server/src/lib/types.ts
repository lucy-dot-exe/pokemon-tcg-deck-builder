// The parts of the pokemontcg.io v2 response shapes the API handles. The full card shape the frontend uses is in
// ../../../src/types/card.ts; cards are passed through unchanged.

export const FORMATS = ['standard', 'expanded', 'unlimited'] as const;
export type Format = (typeof FORMATS)[number];

export const SUPERTYPES = ['Pokémon', 'Trainer', 'Energy'] as const;
export type Supertype = (typeof SUPERTYPES)[number];

export type Card = { id: string; name: string } & Record<string, unknown>;

export interface CardSearchResponse {
  data: Card[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}
