import 'server-only';
import { UpstreamError } from './pokemonTcg';

const DEFAULT_ALLOWED_ORIGINS = ['https://lucy-dot-exe.github.io', 'http://localhost:5173'];

function allowedOrigins(): string[] {
  const configured = process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean);
  return configured?.length ? configured : DEFAULT_ALLOWED_ORIGINS;
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = { Vary: 'Origin' };
  if (origin && allowedOrigins().includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

/** A JSON response with CORS headers. Successful card data can be cached by the browser for an hour. */
export function json(request: Request, body: unknown, status = 200): Response {
  const headers: Record<string, string> = { ...corsHeaders(request) };
  headers['Cache-Control'] = status === 200 ? 'public, max-age=3600' : 'no-store';
  return Response.json(body, { status, headers });
}

export function badRequest(request: Request, message: string): Response {
  return json(request, { error: message }, 400);
}

/** Wraps a handler so upstream failures come back as JSON errors the frontend can show. */
export async function handle(request: Request, run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    if (error instanceof UpstreamError) {
      // A missing card is a 404 for the caller too; anything else upstream is a bad gateway.
      return json(request, { error: error.message }, error.status === 404 ? 404 : 502);
    }
    console.error(error);
    return json(request, { error: 'Internal server error' }, 500);
  }
}

/** Reads a required, non-empty query parameter. */
export function requiredParam(searchParams: URLSearchParams, name: string): string | undefined {
  const value = searchParams.get(name)?.trim();
  return value ? value : undefined;
}
