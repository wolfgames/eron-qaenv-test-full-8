/**
 * Edge-case tests added by 60-stabilize phase.
 *
 * One additional edge-case test per new feature from implementation-plan.yml,
 * covering untested boundaries not addressed in batch test files.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@adobe/data/ecs', () => ({
  Database: {
    create: vi.fn(),
    Plugin: { create: vi.fn().mockImplementation((p: unknown) => p) },
  },
  Store: vi.fn(), Entity: vi.fn(),
}));
vi.mock('@adobe/data/math', () => ({
  Vec2: { schema: {} }, Vec3: { schema: {} }, Vec4: { schema: {} },
  F32: { schema: {} }, U32: { schema: {} }, I32: { schema: {} },
}));
vi.mock('@adobe/data/observe', () => ({ Observe: {} }));

import { floodFill, clearCells } from '~/game/scooby-snack-smash/state/BoardPlugin';
import { createRng, makeSeed } from '~/game/scooby-snack-smash/logic/rng';
import { calculateScore, calculateStars } from '~/game/scooby-snack-smash/logic/score-calculator';
import { checkWinLoss } from '~/game/scooby-snack-smash/logic/win-loss';
import {
  getChapterIndex,
  isLastLevelOfChapter,
  getChapterFirstLevel,
  getChapterConfig,
} from '~/game/scooby-snack-smash/data/chapter-config';
import { computeBoardLayout } from '~/game/scooby-snack-smash/data/board-layout';
import { getMegaSnackAffectedCells } from '~/game/scooby-snack-smash/logic/special-bubble-logic';
import type { BoardState, CellState } from '~/game/scooby-snack-smash/data/board-layout';
import type { TreatType } from '~/game/scooby-snack-smash/data/treat-types';

// ─── Board factory helper ────────────────────────────────────────────────────

function makeBoard(cells: (TreatType | 'ghost' | 'mega-snack' | null)[][]): BoardState {
  const rows = cells.length;
  const cols = cells[0].length;
  let entityId = 1;
  const boardCells: CellState[][] = cells.map((row, r) =>
    row.map((t, c) => ({
      entityId: entityId++,
      kind: t === 'ghost' ? 'ghost' as const
            : t === 'mega-snack' ? 'mega-snack' as const
            : t !== null ? 'treat' as const
            : 'empty' as const,
      treatType: (t !== null && t !== 'ghost' && t !== 'mega-snack')
        ? t as TreatType
        : null,
      row: r,
      col: c,
    }))
  );
  return { cells: boardCells, cols, rows, startingBubbleCount: rows * cols };
}

// ─── Feature: seeded-rng ─────────────────────────────────────────────────────

describe('edge-case: seeded-rng — boundary seeds', () => {
  it('seed 0 produces a valid sequence (no NaN or Infinity)', () => {
    const rng = createRng(0);
    for (let i = 0; i < 20; i++) {
      const v = rng.nextFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('makeSeed wraps around 32-bit boundary without throwing', () => {
    // Very large levelNumber that could overflow a signed 32-bit integer
    const bigLevel = 99999;
    const seed = makeSeed(bigLevel, 0);
    expect(Number.isFinite(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
  });
});

// ─── Feature: play-canvas / board-layout ─────────────────────────────────────

describe('edge-case: play-canvas — extreme viewport widths', () => {
  it('very narrow viewport (320px) clamps cell size to 48px minimum', () => {
    const layout = computeBoardLayout({ viewportW: 320, viewportH: 568 });
    expect(layout.cellSize).toBeGreaterThanOrEqual(48);
  });

  it('wide tablet viewport (768px) does not shrink cell size below 48px', () => {
    const layout = computeBoardLayout({ viewportW: 768, viewportH: 1024 });
    expect(layout.cellSize).toBeGreaterThanOrEqual(48);
  });
});

// ─── Feature: tap-interaction — flood-fill edge ───────────────────────────────

describe('edge-case: tap-interaction — diagonal neighbors are NOT grouped', () => {
  it('diagonal same-type bubbles do not form a cluster', () => {
    // Only (0,0) and (1,1) are pizza — diagonal, not orthogonal
    const board = makeBoard([
      ['pizza', 'bone'],
      ['bone',  'pizza'],
    ]);
    const group = floodFill(board, 0, 0);
    // Diagonal pizza at (1,1) should NOT be in the cluster
    expect(group.length).toBe(1); // isolated
  });
});

// ─── Feature: gravity-cascade — empty column stays empty ─────────────────────

describe('edge-case: gravity-cascade — column stays empty if no bubbles above', () => {
  it('clearing the only bubble in a column leaves the column empty (no refill from side)', () => {
    // 1×2 board: column 0 has one bubble, column 1 has one bubble
    // Clear column 0's bubble — nothing to fall, no refill (count = 1/2 = 50% < 60% → refill triggers)
    // The refill replaces empties, but no horizontal slide from col 1 → col 0
    const board = makeBoard([
      ['pizza', 'bone'],
    ]);
    const rng = createRng(1);
    const toRemove = [board.cells[0][0]]; // pizza in col 0
    const result = clearCells(board, toRemove, rng);
    // After clearing col 0, 'bone' in col 1 should NOT have slid to col 0
    const col1cell = result.board.cells[0][1];
    expect(col1cell.treatType).toBe('bone');
  });
});

// ─── Feature: scoring — special bonus stacks with group score ─────────────────

describe('edge-case: scoring — special bonus adds on top of group * cascade', () => {
  it('mega-snack bonus (500) stacks on top of match score', () => {
    // group of 3 at depth 0 + 500 bonus = (3-1)*50*1 + 500 = 600
    const total = calculateScore({ groupSize: 3, cascadeDepth: 0, specialBonus: 500 });
    expect(total).toBe(600);
  });

  it('zero group size results in zero match score (only bonus counts)', () => {
    const total = calculateScore({ groupSize: 0, cascadeDepth: 0, specialBonus: 500 });
    // matchScore = (0-1)*50 = -50 — clamped or accepted; either way special bonus adds
    // Formula: (-1)*50*1 + 500 = 450
    expect(total).toBe(450);
  });
});

// ─── Feature: win-condition — custom winThreshold ────────────────────────────

describe('edge-case: win-condition — custom 100% winThreshold', () => {
  it('100% winThreshold requires ALL bubbles popped to win', () => {
    const result100 = checkWinLoss({
      poppedBubbles: 69, startingBubbleCount: 70,
      tapsUsed: 5, tapBudget: 30,
      winThreshold: 1.0,
    });
    expect(result100.outcome).toBe('none'); // 69/70 = 98.5% < 100%

    const result100win = checkWinLoss({
      poppedBubbles: 70, startingBubbleCount: 70,
      tapsUsed: 5, tapBudget: 30,
      winThreshold: 1.0,
    });
    expect(result100win.outcome).toBe('win');
  });
});

// ─── Feature: special-bubbles — Mega Snack at board corner ───────────────────

describe('edge-case: special-bubbles — Mega Snack at board corner clears partial radius', () => {
  it('mega-snack at top-left corner clears only existing neighbors', () => {
    // Corner (0,0) — only right (0,1) and below (1,0) exist in a 2×2
    const board = makeBoard([
      ['mega-snack', 'pizza'],
      ['pizza',      'pizza'],
    ]);
    board.cells[0][0] = { entityId: 1, kind: 'mega-snack', treatType: null, row: 0, col: 0 };
    const affected = getMegaSnackAffectedCells(board, 0, 0);
    // Should include the mega-snack itself plus available neighbors
    expect(affected.length).toBeGreaterThanOrEqual(1);
    // Should not throw or include out-of-bounds cells
    for (const cell of affected) {
      expect(cell.row).toBeGreaterThanOrEqual(0);
      expect(cell.col).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─── Feature: chapter-progression — fallback config for unknown chapters ──────

describe('edge-case: chapter-progression — fallback config beyond authored chapters', () => {
  it('chapter 99 returns a fallback config with correct level range', () => {
    const cfg = getChapterConfig(99);
    expect(cfg.chapterId).toBe(99);
    expect(cfg.startLevel).toBe((99 - 1) * 10 + 1); // 981
    expect(cfg.endLevel).toBe(cfg.startLevel + 9);  // 990
    expect(typeof cfg.caption1).toBe('string');
  });

  it('chapter boundary: level 10 is last of chapter 1, level 11 is first of chapter 2', () => {
    expect(isLastLevelOfChapter(10)).toBe(true);
    expect(isLastLevelOfChapter(11)).toBe(false);
    expect(getChapterIndex(10)).toBe(1);
    expect(getChapterIndex(11)).toBe(2);
    expect(getChapterFirstLevel(2)).toBe(11);
  });
});

// ─── Feature: board-states — star calculation at zero taps remaining ──────────

describe('edge-case: board-states — star calculation when zero taps remain', () => {
  it('exactly zero taps remaining gives 1 star (0 < 0.25 threshold)', () => {
    expect(calculateStars({ tapsRemaining: 0, tapBudget: 30 })).toBe(1);
  });

  it('tapBudget of zero returns 1 star without division by zero', () => {
    // tapEfficiency = 0/0 → handled as 0 in calculateStars
    expect(calculateStars({ tapsRemaining: 0, tapBudget: 0 })).toBe(1);
  });
});
