import path from 'node:path';
import type { NextConfig } from 'next';

// Sub-path the API is served under, e.g. BASE_PATH=/pokemon-tcg-deck-builder for
// projects.lucina.dev/pokemon-tcg-deck-builder/api. Inlined at build time; empty (served at /) when unset, as in
// local dev.
const basePath = process.env.BASE_PATH ?? '';

const nextConfig: NextConfig = {
  basePath,
  // Self-contained server in .next/standalone, so the droplet doesn't need to install or build anything.
  output: 'standalone',
  // This folder is its own app inside the frontend's repo: without these, Next picks the repo root (it has a
  // lockfile too) and nests the standalone server under .next/standalone/server/.
  outputFileTracingRoot: path.resolve(import.meta.dirname),
  turbopack: { root: path.resolve(import.meta.dirname) },
};

export default nextConfig;
