import type { NextRequest } from 'next/server';
import { badRequest, handle, json, requiredParam } from '@/lib/http';
import { findExactPrint, PRINT_TOKEN } from '@/lib/pokemonTcg';

// GET /api/lookup/print?name=&setCode=&number= — the exact print a deck-list line refers to.
export function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const name = requiredParam(searchParams, 'name');
  const setCode = requiredParam(searchParams, 'setCode');
  const number = requiredParam(searchParams, 'number');
  if (!name || !setCode || !number) return badRequest(request, 'name, setCode and number are required');
  if (!PRINT_TOKEN.test(setCode) || !PRINT_TOKEN.test(number)) {
    return badRequest(request, 'setCode and number may only contain letters, digits and dashes');
  }

  return handle(request, async () => {
    return json(request, { data: await findExactPrint(name, setCode, number, request.signal) });
  });
}
