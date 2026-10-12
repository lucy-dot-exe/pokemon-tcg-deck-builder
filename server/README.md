# Pokemon TCG Deck Builder API

The deck builder's API service. Every card lookup the pages make goes through it. It builds the
[pokemontcg.io](https://docs.pokemontcg.io/) queries, caches the responses in memory for 6 hours, retries the
upstream's intermittent 500/502s, and keeps the optional API key on the server.

It's a Next.js (App Router) app with route handlers only, following the stack in `Lucy/projects`.

## Endpoints

All responses are JSON. Errors come back as `{ "error": "..." }` with status 400 (bad parameters), 404 (no such
card) or 502 (pokemontcg.io failed even after retries).

| Endpoint | Returns |
| --- | --- |
| `GET /api/health` | `{ status, timestamp }` |
| `GET /api/cards?name=&format=&supertype=&page=&pageSize=` | A page of search results (`{ data, page, pageSize, count, totalCount }`). `name` is a prefix match. `format` is `standard`, `expanded` or `unlimited`. `supertype` is `Pokémon`, `Trainer` or `Energy`. `pageSize` is 1–250 (default 100). Basic Energy is always excluded. |
| `GET /api/cards/:id` | `{ data: Card }` |
| `GET /api/lookup/print?name=&setCode=&number=` | `{ data: Card[] }`, the exact print a deck-list line names |
| `GET /api/lookup/name?name=` | `{ data: Card[] }`, every card with exactly this name |

Standard is filtered by regulation mark (`STANDARD_MIN_REGULATION_MARK` in `src/lib/rules.ts`), not by the API's
lagging `legalities.standard`. When the format rotates, update it together with
`CURRENT_STANDARD_MIN_REGULATION_MARK` in the frontend's `src/lib/format.ts`.

Browsers may only call the API from the origins in `ALLOWED_ORIGINS`, which by default are the GitHub Pages site
and the Vite dev server.

## Development

```bash
npm install
cp .env.example .env   # optional: POKEMON_TCG_API_KEY, ALLOWED_ORIGINS
npm run dev            # http://localhost:3003/api
```

In dev, the frontend (`npm run dev` in the repo root) calls `http://localhost:3003/api` by default.

## Deployment

It will be served at **https://projects.lucina.dev/pokemon-tcg-deck-builder/api** on the shared droplet, port
`3003`. To deploy, run:

```bash
./deploy/deploy.sh
```

The script builds locally with `BASE_PATH=/pokemon-tcg-deck-builder` as a Next.js standalone build, because the
droplet has too little memory to build. It uploads the build with rsync to `/srv/pokemon-tcg-deck-builder`, restarts
the service and checks `/api/health`.

| What | Where |
| --- | --- |
| systemd service `pokemon-tcg-deck-builder` (user `pokemontcg`, `MemoryMax=300M`) | [`deploy/pokemon-tcg-deck-builder.service`](deploy/pokemon-tcg-deck-builder.service) → `/etc/systemd/system/` |
| nginx `location /pokemon-tcg-deck-builder` → `127.0.0.1:3003` | [`deploy/nginx-location.conf`](deploy/nginx-location.conf), added to the shared `projects.lucina.dev` site |
| `POKEMON_TCG_API_KEY` (optional) plus `PORT=3003`, `HOSTNAME=127.0.0.1`, `NODE_ENV=production` | `/etc/pokemon-tcg-deck-builder/pokemon-tcg-deck-builder.env` (root, mode 600) |
| App files | `/srv/pokemon-tcg-deck-builder` (owned by `deploy`) |

Useful commands on the droplet: `systemctl status pokemon-tcg-deck-builder` and
`sudo journalctl -u pokemon-tcg-deck-builder -f`.

One-time server setup:

```bash
sudo useradd --system --no-create-home --shell /usr/sbin/nologin pokemontcg
sudo mkdir -p /srv/pokemon-tcg-deck-builder && sudo chown deploy:deploy /srv/pokemon-tcg-deck-builder
sudo install -D -m 600 -o root -g root <env file> /etc/pokemon-tcg-deck-builder/pokemon-tcg-deck-builder.env
sudo install -m 644 deploy/pokemon-tcg-deck-builder.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable pokemon-tcg-deck-builder
# Add deploy/nginx-location.conf to the projects.lucina.dev site (keep the copy in Lucy/projects in sync), then:
sudo nginx -t && sudo systemctl reload nginx
```
