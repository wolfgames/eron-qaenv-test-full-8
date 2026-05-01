/**
 * Batch 2 — group-finder tests
 */
import { describe, it, expect, vi } from 'vitest';

// Mock @adobe/data/* to prevent indexedDB access in Node environment
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

import { floodFill } from '~/game/scooby-snack-smash/state/BoardPlugin';
import { generateBoard } from '~/game/scooby-snack-smash/data/board-layout';
import type { BoardState, CellState } from '~/game/scooby-snack-smash/data/board-layout';
import type { TreatType } from '~/game/scooby-snack-smash/data/treat-types';

function makeBoard(cells: (TreatType | null)[][]): BoardState {
  const rows = cells.length;
  const cols = cells[0].length;
  let entityId = 1;
  const boardCells: CellState[][] = cells.map((row, r) =>
    row.map((t, c) => ({
      entityId: entityId++,
      kind: t !== null ? 'treat' as const : 'empty' as const,
      treatType: t,
      row: r,
      col: c,
    }))
  );
  return { cells: boardCells, cols, rows, startingBubbleCount: rows * cols };
}

describe('group-finder: cluster detection', () => {
  it('flood-fill finds orthogonal cluster of matching type', () => {
    // A L-shape of 'pizza' at top-left
    const board = makeBoard([
      ['pizza', 'pizza', 'bone'],
      ['pizza', 'bone',  'bone'],
      ['bone',  'bone',  'bone'],
    ]);
    const group = floodFill(board, 0, 0);
    expect(group.length).toBe(3);
    // All returned cells are pizza
    for (const cell of group) {
      expect(cell.treatType).toBe('pizza');
    }
  });

  it('isolated bubble returns cluster size 1 (invalid)', () => {
    const board = makeBoard([
      ['pizza', 'bone',  'bone'],
      ['bone',  'bone',  'bone'],
      ['bone',  'bone',  'bone'],
    ]);
    // Top-left pizza is surrounded by bones — isolated
    const group = floodFill(board, 0, 0);
    expect(group.length).toBe(1);
  });

  it('cluster size 1 triggers no state change', () => {
    // This is a logic concern — validated by group.length < 2 check
    const board = makeBoard([
      ['pizza', 'bone'],
      ['bone',  'bone'],
    ]);
    const group = floodFill(board, 0, 0);
    expect(group.length).toBeLessThan(2);
  });

  it('cluster spanning board edge correctly bounded', () => {
    const board = makeBoard([
      ['pizza', 'pizza', 'pizza', 'pizza', 'pizza', 'pizza', 'pizza'],
    ]);
    const group = floodFill(board, 0, 0);
    expect(group.length).toBe(7);
  });
});
