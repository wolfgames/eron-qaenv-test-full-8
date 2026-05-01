/**
 * Batch 1 — seeded-rng tests
 * Tests: mulberry32 deterministic RNG
 */
import { describe, it, expect } from 'vitest';
import { createRng } from '~/game/scooby-snack-smash/logic/rng';

describe('seeded-rng: determinism', () => {
  it('same seed produces same sequence', () => {
    const rng1 = createRng(12345);
    const rng2 = createRng(12345);
    const vals1 = [rng1.nextFloat(), rng1.nextFloat(), rng1.nextFloat()];
    const vals2 = [rng2.nextFloat(), rng2.nextFloat(), rng2.nextFloat()];
    expect(vals1).toEqual(vals2);
  });

  it('nextFloat returns values in [0, 1)', () => {
    const rng = createRng(99999);
    for (let i = 0; i < 100; i++) {
      const v = rng.nextFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds produce different sequences', () => {
    const rng1 = createRng(1);
    const rng2 = createRng(2);
    const v1 = rng1.nextFloat();
    const v2 = rng2.nextFloat();
    expect(v1).not.toEqual(v2);
  });
});
