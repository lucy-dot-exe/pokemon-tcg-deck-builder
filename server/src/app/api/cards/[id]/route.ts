import type { NextRequest } from 'next/server';
import { handle, json } from '@/lib/http';
import { getCardById } from '@/lib/pokemonTcg';

// GET /api/cards/:id — a single card by its pokemontcg.io id (e.g. sv1-196).
export function GET(request: NextRequest, ctx: RouteContext<'/api/cards/[id]'>) {
  return handle(request, async () => {
    const { id } = await ctx.params;
    return json(request, { data: await getCardById(id, request.signal) });
  });
}
