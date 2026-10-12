// Game-rule constants the frontend also relies on. Keep in sync with:
// - STANDARD_MIN_REGULATION_MARK: CURRENT_STANDARD_MIN_REGULATION_MARK in ../../../src/lib/format.ts
// - BASIC_ENERGY_TYPES: CANONICAL_BASIC_ENERGIES in ../../../src/data/basicEnergies.ts

/** Oldest regulation mark that's Standard-legal. Update this when the format rotates. */
export const STANDARD_MIN_REGULATION_MARK = 'H';

const BASIC_ENERGY_TYPES = ['Grass', 'Fire', 'Water', 'Lightning', 'Psychic', 'Fighting', 'Darkness', 'Metal'];

/** Every literal name a basic energy card might use across print eras ("Basic X Energy" and vintage "X Energy"). */
export const BASIC_ENERGY_NAMES: string[] = BASIC_ENERGY_TYPES.flatMap((type) => [
  `Basic ${type} Energy`,
  `${type} Energy`,
]);
