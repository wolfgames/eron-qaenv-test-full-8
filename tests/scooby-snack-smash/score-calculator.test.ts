/**
 * Batch 2 — score-calculator tests
 */
import { describe, it, expect } from 'vitest';
import { calculateScore, calculateStars } from '~/game/scooby-snack-smash/logic/score-calculator';

describe('score-calculator: formula', () => {
  it('group of 5 at cascade depth 2 = 600 points', () => {
    // matchScore = (5-1)*50 = 200; chainMultiplier = 2+1 = 3; 200*3 = 600
    const score = calculateScore({ groupSize: 5, cascadeDepth: 2, specialBonus: 0 });
    expect(score).toBe(600);
  });

  it('group of 2 at cascade depth 0 = 50 points', () => {
    // matchScore = (2-1)*50 = 50; chainMultiplier = 0+1 = 1; 50*1 = 50
    const score = calculateScore({ groupSize: 2, cascadeDepth: 0, specialBonus: 0 });
    expect(score).toBe(50);
  });

  it('star 3 when tapEfficiency >= 0.5', () => {
    expect(calculateStars({ tapsRemaining: 15, tapBudget: 30 })).toBe(3);
    expect(calculateStars({ tapsRemaining: 15, tapBudget: 30 })).toBe(3); // exactly 0.5
  });

  it('star 2 when tapEfficiency >= 0.25', () => {
    // 8/30 = 0.267 >= 0.25 → star 2; 7/30 = 0.233 < 0.25 → star 1
    expect(calculateStars({ tapsRemaining: 8, tapBudget: 30 })).toBe(2);
    // boundary: exactly 0.25 (with tapBudget=4, tapsRemaining=1 → 0.25 >= 0.25)
    expect(calculateStars({ tapsRemaining: 1, tapBudget: 4 })).toBe(2);
  });

  it('star 1 otherwise', () => {
    expect(calculateStars({ tapsRemaining: 0, tapBudget: 30 })).toBe(1);
    expect(calculateStars({ tapsRemaining: 3, tapBudget: 30 })).toBe(1); // 0.1 < 0.25
  });
});
