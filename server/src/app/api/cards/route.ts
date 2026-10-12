import type { NextRequest } from 'next/server';
import { badRequest, handle, json } from '@/lib/http';
import { searchCards } from '@/lib/pokemonTcg';
import { FORMATS, SUPERTYPES, type Format, type Supertype } from '@/lib/types';

const MAX_PAGE_SIZE = 250;

// GET /api/cards?name=&format=&supertype=&page=&pageSize= — the card search, one page at a time.
export function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get('format') || undefined;
  const supertype = searchParams.get('supertype') || undefined;
  const page = Number(searchParams.get('page') ?? 1);
  const pageSize = Number(searchParams.get('pageSize') ?? 100);

  if (format && !FORMATS.includes(format as Format)) {
    return badRequest(request, `format must be one of ${FORMATS.join(', ')}`);
  }
  if (supertype && !SUPERTYPES.includes(supertype as Supertype)) {
    return badRequest(request, `supertype must be one of ${SUPERTYPES.join(', ')}`);
  }
  if (!Number.isInteger(page) || page < 1) return badRequest(request, 'page must be a positive integer');
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    return badRequest(request, `pageSize must be an integer from 1 to ${MAX_PAGE_SIZE}`);
  }

  return handle(request, async () => {
    const result = await searchCards(
      {
        name: searchParams.get('name') ?? undefined,
        format: format as Format | undefined,
        supertype: supertype as Supertype | undefined,
        page,
        pageSize,
      },
      request.signal,
    );
    return json(request, result);
  });
}
