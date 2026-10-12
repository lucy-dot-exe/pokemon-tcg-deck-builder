#!/usr/bin/env bash
# Build locally and ship to the droplet (it has too little memory to build Next.js itself).
# One-time server setup: see README, "Deployment". Usage: ./deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

HOST="${DEPLOY_HOST:-droplet}"          # ssh host (from ~/.ssh/config)
APP_DIR=/srv/pokemon-tcg-deck-builder
SERVICE=pokemon-tcg-deck-builder
BASE_PATH=/pokemon-tcg-deck-builder
PORT=3003

echo "==> Building (BASE_PATH=$BASE_PATH)"
rm -rf .next/standalone
BASE_PATH="$BASE_PATH" npm run build
cp -r .next/static .next/standalone/.next/
# next build copies .env into the standalone folder; never ship it. The server's secrets live in
# /etc/pokemon-tcg-deck-builder/pokemon-tcg-deck-builder.env.
rm -f .next/standalone/.env*

echo "==> Uploading to $HOST:$APP_DIR"
rsync -az --delete .next/standalone/ "$HOST:$APP_DIR/"

echo "==> Restarting $SERVICE"
ssh "$HOST" "sudo systemctl restart $SERVICE \
  && for i in \$(seq 1 20); do curl -sf -o /dev/null http://127.0.0.1:$PORT$BASE_PATH/api/health && break; sleep 1; done \
  && curl -sf http://127.0.0.1:$PORT$BASE_PATH/api/health && echo"
echo "==> Deployed: https://projects.lucina.dev$BASE_PATH/api"
