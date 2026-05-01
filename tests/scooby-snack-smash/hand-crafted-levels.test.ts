/**
 * Batch 6 — hand-crafted levels validity tests
 */
import { describe, it, expect } from 'vitest';
import levels from '~/game/scooby-snack-smash/data/hand-crafted-levels.json';
import { floodFill } from '~/game/scooby-snack-smash/state/BoardPlugin';
import type { BoardState, CellState } from '~/game/scooby-snack-smash/data/board-layout';
import type { TreatType } from '~/game/scooby-snack-smash/data/treat-types';

// Mock @adobe/data/* for ECS
import { vi } from 'vitest';
vi.mock('@adobe/data/ecs', () => ({
  Database: { create: vi.fn(), Plugin: { create: vi.fn().mockImplementation((p: unknown) => p) } },
  Store: vi.fn(), Entity: vi.fn(),
}));
vi.mock('@adobe/data/math', () => ({
  Vec2: { schema: {} }, Vec3: { schema: {} }, Vec4: { schema: {} },
  F32: { schema: {} }, U32: { schema: {} }, I32: { schema: {} },
}));
vi.mock('@adobe/data/observe', () => ({ Observe: {} }));

type LevelData = {
  levelNumber: number;
  grid: string[][];
  tapBudget: number;
  winThreshold: number;
  objectives: string[];
};

function gridToBoardState(grid: string[][]): BoardState {
  const rows = grid.length;
  const cols = grid[0].length;
  let entityId = 1;
  const cells: CellState[][] = grid.map((row, r) =>
    row.map((t, c) => ({
      entityId: entityId++,
      kind: t === 'empty' ? 'empty' as const : 'treat' as const,
      treatType: t !== 'empty' ? t as TreatType : null,
      row: r,
      col: c,
    }))
  );
  return { cells, cols, rows, startingBubbleCount: rows * cols };
}

describe('hand-crafted-levels: validity', () => {
  it('pool.length == 10 (content sufficiency: 10 levels >= 10-level chapter requirement)', () => {
    expect((levels as LevelData[]).length).toBe(10);
  });

  it('all 10 levels have 7×10 grid dimensions', () => {
    for (const level of levels as LevelData[]) {
      expect(level.grid.length).toBe(10);
      for (const row of level.grid) {
        expect(row.length).toBe(7);
      }
    }
  });

  it('all levels have non-zero tapBudget', () => {
    for (const level of levels as LevelData[]) {
      expect(level.tapBudget).toBeGreaterThan(0);
    }
  });

  it('Level 1 has at least one valid group of 2+ on initial board', () => {
    const level1 = (levels as LevelData[]).find(l => l.levelNumber === 1);
    expect(level1).toBeDefined();
    const board = gridToBoardState(level1!.grid);
    // Search for any cell with a cluster >= 2
    let foundValidGroup = false;
    for (let r = 0; r < board.rows && !foundValidGroup; r++) {
      for (let c = 0; c < board.cols && !foundValidGroup; c++) {
        const cell = board.cells[r][c];
        if (cell.kind === 'treat') {
          const group = floodFill(board, r, c);
          if (group.length >= 2) foundValidGroup = true;
        }
      }
    }
    expect(foundValidGroup).toBe(true);
  });
});
