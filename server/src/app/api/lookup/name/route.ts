import type { NextRequest } from 'next/server';
import { badRequest, handle, json, requiredParam } from '@/lib/http';
import { findByExactName } from '@/lib/pokemonTcg';

// GET /api/lookup/name?name= — every card with exactly this name (no wildcard).
export function GET(request: NextRequest) {
  const name = requiredParam(request.nextUrl.searchParams, 'name');
  if (!name) return badRequest(request, 'name is required');

  return handle(request, async () => {
    return json(request, { data: await findByExactName(name, request.signal) });
  });
}
