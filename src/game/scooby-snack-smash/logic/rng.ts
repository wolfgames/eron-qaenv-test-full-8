/**
 * Seeded deterministic RNG — mulberry32 algorithm.
 *
 * Seed formula: levelNumber × 31337 + playerUserId % 9999
 * Same seed always produces identical sequence (reproducibility guarantee).
 * Per ECS state rules, no Math.random() in actions/transactions — seeded RNG passed via args.
 */

export interface Rng {
  /** Returns a float in [0, 1) */
  nextFloat: () => number;
  /** Returns an integer in [0, max) */
  nextInt: (max: number) => number;
}

/** mulberry32 — fast, 32-bit seeded PRNG */
export function createRng(seed: number): Rng {
  let s = seed >>> 0;

  function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1) >>> 0;
    z = (z ^ (z + Math.imul(z ^ (z >>> 7), z | 61))) >>> 0;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  }

  return {
    nextFloat: next,
    nextInt: (max: number) => Math.floor(next() * max),
  };
}

/** Canonical seed formula: levelNumber × 31337 + playerUserId % 9999 */
export function makeSeed(levelNumber: number, playerUserId: number): number {
  return (levelNumber * 31337 + (playerUserId % 9999)) >>> 0;
}
