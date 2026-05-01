/**
 * Special Bubble Logic — pure functions, no ECS imports, no Pixi.
 *
 * Mega Snack: created when group >= 5 at tap position.
 *   - Clears all bubbles in 1-cell radius (8 neighbors + center)
 *   - Score += 500 special bonus
 *
 * Ghost Bubble: blocker type.
 *   - Cannot be cleared by direct tap
 *   - Clears when ALL orthogonal neighbors have been cleared (empty)
 *   - Edge case: at board edge, only existing (in-bounds) neighbors must be empty
 *
 * Mystery Bag (group >= 8): deferred to secondary pass.
 */

import type { BoardState, CellState } from '../data/board-layout';

export const MEGA_SNACK_MIN_GROUP = 5;
export const MEGA_SNACK_BONUS = 500;

/** Returns true if a group of the given size should create a Mega Snack. */
export function checkMegaSnackCreation(args: { groupSize: number }): boolean {
  return args.groupSize >= MEGA_SNACK_MIN_GROUP;
}

/** Returns all cells affected by a Mega Snack explosion (1-cell radius + center). */
export function getMegaSnackAffectedCells(
  board: BoardState,
  row: number,
  col: number,
): CellState[] {
  const affected: CellState[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = row + dr;
      const c = col + dc;
      const cell = board.cells[r]?.[c];
      if (cell && cell.kind !== 'empty') {
        affected.push(cell);
      }
    }
  }
  return affected;
}

/**
 * Returns true if a Ghost Bubble at (row, col) should be removed.
 * Condition: all orthogonal neighbors that are within bounds must be empty.
 */
export function checkGhostBubbleRemoval(
  board: BoardState,
  row: number,
  col: number,
): boolean {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of dirs) {
    const r = row + dr;
    const c = col + dc;
    // Skip out-of-bounds neighbors (edge case)
    if (r < 0 || r >= board.rows || c < 0 || c >= board.cols) continue;
    const neighbor = board.cells[r]?.[c];
    // If any in-bounds neighbor is non-empty, ghost cannot be removed yet
    if (neighbor && neighbor.kind !== 'empty') return false;
  }
  return true;
}

/** Apply special bubble logic to a tap result — processes Mega Snack creation. */
export function applySpecialBubbleLogic(args: {
  groupSize: number;
  tapRow: number;
  tapCol: number;
  board: BoardState;
}): {
  megaSnackCreated: boolean;
  ghostsToRemove: CellState[];
  specialBonus: number;
} {
  const { groupSize, tapRow, tapCol, board } = args;

  const megaSnackCreated = checkMegaSnackCreation({ groupSize });
  const specialBonus = megaSnackCreated ? MEGA_SNACK_BONUS : 0;

  // Check all ghost bubbles on the board for removal
  const ghostsToRemove: CellState[] = [];
  for (const row of board.cells) {
    for (const cell of row) {
      if (cell.kind === 'ghost' && checkGhostBubbleRemoval(board, cell.row, cell.col)) {
        ghostsToRemove.push(cell);
      }
    }
  }

  return { megaSnackCreated, ghostsToRemove, specialBonus };
}
