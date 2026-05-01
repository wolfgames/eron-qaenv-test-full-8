/**
 * BoardPlugin — ECS plugin for Scooby Snack Smash board state.
 *
 * Property order (enforced): extends → services → components → resources → archetypes →
 *   computed → transactions → actions → systems
 *
 * Resources are the source of truth for game state.
 * Signals (DOM bridge) are updated via bridgeEcsToSignals() — never written directly.
 */

import { Database } from '@adobe/data/ecs';
import { type TreatType } from '../data/treat-types';
import {
  type BoardState,
  type CellState,
  BOARD_COLS,
  BOARD_ROWS,
} from '../data/board-layout';
import { type Rng } from '../logic/rng';
import { checkWinLoss as checkWinLossPure } from '../logic/win-loss';
import { checkGhostBubbleRemoval, getMegaSnackAffectedCells } from '../logic/special-bubble-logic';

// ── Board state machine ──────────────────────────────────────────────────────

export type BoardPhase = 'IDLE' | 'ANIMATING' | 'WIN' | 'LOST' | 'PAUSED';

export type CellKind = 'treat' | 'ghost' | 'mega-snack' | 'empty';

// ── Plugin ───────────────────────────────────────────────────────────────────

export const boardPlugin = Database.Plugin.create({
  components: {
    cellRow:      { type: 'number', default: 0 } as const,
    cellCol:      { type: 'number', default: 0 } as const,
    cellKind:     { type: 'string', default: 'treat' as string } as const,
    cellTreatType: { type: 'string', default: '' as string } as const,
  },

  resources: {
    // Level meta
    levelNumber:          { default: 1 as number },
    seed:                 { default: 0 as number },
    cols:                 { default: BOARD_COLS as number },
    rows:                 { default: BOARD_ROWS as number },
    tapBudget:            { default: 30 as number },
    winThreshold:         { default: 0.8 as number },  // 80% of starting bubbles
    startingBubbleCount:  { default: 70 as number },

    // Runtime state
    tapsUsed:             { default: 0 as number },
    tapsRemaining:        { default: 30 as number },
    score:                { default: 0 as number },
    poppedBubbles:        { default: 0 as number },
    cascadeDepth:         { default: 0 as number },
    starsEarned:          { default: 0 as number },
    boardPhase:           { default: 'IDLE' as string },
  },

  archetypes: {
    Block: ['cellRow', 'cellCol', 'cellKind', 'cellTreatType'],
  },

  transactions: {
    initBoard(store, args: { board: BoardState; tapBudget: number; levelNumber: number; seed: number }) {
      // Clear existing cells
      for (const entity of store.select(['cellKind'])) {
        store.delete(entity);
      }
      // Insert new cells
      for (const row of args.board.cells) {
        for (const cell of row) {
          if (cell.kind !== 'empty') {
            store.archetypes.Block.insert({
              cellRow: cell.row,
              cellCol: cell.col,
              cellKind: cell.kind,
              cellTreatType: cell.treatType ?? '',
            });
          }
        }
      }
      // Reset resources
      store.resources.levelNumber = args.levelNumber;
      store.resources.seed = args.seed;
      store.resources.tapBudget = args.tapBudget;
      store.resources.tapsRemaining = args.tapBudget;
      store.resources.tapsUsed = 0;
      store.resources.score = 0;
      store.resources.poppedBubbles = 0;
      store.resources.cascadeDepth = 0;
      store.resources.starsEarned = 0;
      store.resources.startingBubbleCount = args.board.startingBubbleCount;
      store.resources.boardPhase = 'IDLE';
    },

    replaceBoard(store, args: { board: BoardState }) {
      // Bulk clear-and-rebuild pattern per ecs-state rules
      for (const entity of store.select(['cellKind'])) {
        store.delete(entity);
      }
      for (const row of args.board.cells) {
        for (const cell of row) {
          if (cell.kind !== 'empty') {
            store.archetypes.Block.insert({
              cellRow: cell.row,
              cellCol: cell.col,
              cellKind: cell.kind,
              cellTreatType: cell.treatType ?? '',
            });
          }
        }
      }
    },

    addScore(store, args: { points: number }) {
      store.resources.score += args.points;
    },

    addPoppedBubbles(store, args: { count: number }) {
      store.resources.poppedBubbles += args.count;
    },

    decrementTaps(store) {
      store.resources.tapsUsed += 1;
      store.resources.tapsRemaining = Math.max(0, store.resources.tapsRemaining - 1);
    },

    setBoardPhase(store, args: { phase: BoardPhase }) {
      store.resources.boardPhase = args.phase;
    },

    setCascadeDepth(store, args: { depth: number }) {
      store.resources.cascadeDepth = args.depth;
    },

    setStarsEarned(store, args: { stars: number }) {
      store.resources.starsEarned = args.stars;
    },
  },

  actions: {
    /**
     * Execute a tap at (row, col).
     * Pure — no Pixi imports, no Math.random(). Returns animation event list.
     *
     * Returns { rejected: true } when tap hits an isolated bubble.
     */
    executeTap(
      db,
      args: { row: number; col: number; rng: Rng; board: BoardState },
    ): TapResult {
      const { row, col, rng, board } = args;
      const phase = db.store.resources.boardPhase as BoardPhase;

      // Only process when IDLE
      if (phase !== 'IDLE') {
        return { rejected: true, reason: 'board-not-idle' };
      }

      const cell = board.cells[row]?.[col];
      if (!cell || cell.kind === 'empty' || cell.kind === 'ghost') {
        return { rejected: true, reason: 'invalid-cell' };
      }

      // Mega Snack: tap clears 1-cell radius
      if (cell.kind === 'mega-snack') {
        const affectedCells = getMegaSnackAffectedCells(board, row, col);
        const newBoard = clearCells(board, affectedCells, rng);
        const specialBonus = 500;
        db.transactions.addScore({ points: specialBonus });
        db.transactions.addPoppedBubbles({ count: affectedCells.length });
        db.transactions.replaceBoard({ board: newBoard.board });
        return {
          rejected: false,
          cleared: affectedCells,
          drops: newBoard.drops,
          refills: newBoard.refills,
          cascadeDepth: 0,
          score: specialBonus,
          isMegaSnack: true,
          isRejected: false,
        };
      }

      // Standard treat tap — flood-fill cluster
      const group = floodFill(board, row, col);
      if (group.length < 2) {
        return { rejected: true, reason: 'isolated-bubble' };
      }

      // Check for Mega Snack creation (group >= 5)
      const createMegaSnack = group.length >= 5;
      const tapPos = { row, col };

      // Clear group, apply gravity, check refill
      const result = clearCells(board, group, rng, createMegaSnack ? tapPos : undefined);
      const groupSize = group.length;
      const cascadeDepth = db.store.resources.cascadeDepth;

      // Score: (groupSize - 1) * 50 * (cascadeDepth + 1)
      const points = (groupSize - 1) * 50 * (cascadeDepth + 1);

      db.transactions.addScore({ points });
      db.transactions.addPoppedBubbles({ count: groupSize });
      db.transactions.decrementTaps();
      db.transactions.replaceBoard({ board: result.board });

      return {
        rejected: false,
        cleared: group,
        drops: result.drops,
        refills: result.refills,
        cascadeDepth,
        score: points,
        megaSnackCreated: createMegaSnack ? tapPos : null,
        isRejected: false,
      };
    },

    /**
     * Check win/loss conditions after a resolved tap.
     * Pure — reads ECS resources only.
     */
    checkWinLoss(db, args: { tapBudget: number; winThreshold: number; startingBubbleCount: number }): WinLossResult {
      const { poppedBubbles, tapsUsed } = db.store.resources;
      const { tapBudget, winThreshold, startingBubbleCount } = args;

      const result = checkWinLossPure({
        poppedBubbles,
        startingBubbleCount,
        tapsUsed,
        tapBudget,
        winThreshold,
      });

      if (result.outcome === 'win') {
        db.transactions.setStarsEarned({ stars: result.starsEarned });
        db.transactions.setBoardPhase({ phase: 'WIN' });
      } else if (result.outcome === 'loss') {
        db.transactions.setBoardPhase({ phase: 'LOST' });
      }

      return result;
    },
  },
});

export type BoardDatabase = Database.FromPlugin<typeof boardPlugin>;

// ── Result types ─────────────────────────────────────────────────────────────

export interface TapResultRejected {
  rejected: true;
  reason?: string;
}

export interface TapResultOk {
  rejected: false;
  isRejected: false;
  cleared: CellState[];
  drops: DropEvent[];
  refills: RefillEvent[];
  cascadeDepth: number;
  score: number;
  megaSnackCreated?: { row: number; col: number } | null;
  isMegaSnack?: boolean;
}

export type TapResult = TapResultRejected | TapResultOk;

export interface WinLossResult {
  outcome: 'win' | 'loss' | 'none';
  starsEarned: number;
}

export interface DropEvent {
  entityId: number;
  fromRow: number;
  toRow: number;
  col: number;
  distance: number;
}

export interface RefillEvent {
  entityId: number;
  treatType: TreatType;
  row: number;
  col: number;
}

// ── Pure board helpers (no ECS, no Pixi) ─────────────────────────────────────

/** Orthogonal flood-fill for connected cluster of same treat type */
export function floodFill(board: BoardState, startRow: number, startCol: number): CellState[] {
  const startCell = board.cells[startRow]?.[startCol];
  if (!startCell || startCell.kind !== 'treat' || !startCell.treatType) return [];

  const target = startCell.treatType;
  const visited = new Set<string>();
  const cluster: CellState[] = [];
  const queue: [number, number][] = [[startRow, startCol]];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const cell = board.cells[r]?.[c];
    if (!cell || cell.kind !== 'treat' || cell.treatType !== target) continue;

    cluster.push(cell);
    // Orthogonal neighbors only
    queue.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }

  return cluster;
}


/** Clear cells from board and apply gravity. Returns new board + animation events. */
export function clearCells(
  board: BoardState,
  toRemove: CellState[],
  rng: Rng,
  megaSnackAt?: { row: number; col: number },
): { board: BoardState; drops: DropEvent[]; refills: RefillEvent[] } {
  const removeSet = new Set(toRemove.map(c => `${c.row},${c.col}`));

  // Deep-copy cells array
  const newCells: CellState[][] = board.cells.map(row =>
    row.map(cell => ({ ...cell })),
  );

  // Mark cleared cells as empty
  for (const cell of toRemove) {
    newCells[cell.row][cell.col] = {
      entityId: cell.entityId,
      kind: 'empty',
      treatType: null,
      row: cell.row,
      col: cell.col,
    };
  }

  // Optionally place Mega Snack
  let entityCounter = board.startingBubbleCount + 1000; // offset to avoid collision
  if (megaSnackAt) {
    newCells[megaSnackAt.row][megaSnackAt.col] = {
      entityId: entityCounter++,
      kind: 'mega-snack',
      treatType: null,
      row: megaSnackAt.row,
      col: megaSnackAt.col,
    };
  }

  // Apply gravity per column — shift non-empty cells down
  const drops: DropEvent[] = [];
  const { cols, rows } = board;

  for (let c = 0; c < cols; c++) {
    let writeRow = rows - 1;
    // Scan column from bottom to top
    for (let r = rows - 1; r >= 0; r--) {
      const cell = newCells[r][c];
      if (cell.kind !== 'empty') {
        if (r !== writeRow) {
          // Move cell downward
          drops.push({
            entityId: cell.entityId,
            fromRow: r,
            toRow: writeRow,
            col: c,
            distance: writeRow - r,
          });
          newCells[writeRow][c] = { ...cell, row: writeRow };
          newCells[r][c] = { entityId: 0, kind: 'empty', treatType: null, row: r, col: c };
        }
        writeRow--;
      }
    }
  }

  // Count remaining bubbles; refill if < 60% of starting count
  let remaining = 0;
  for (const row of newCells) {
    for (const cell of row) {
      if (cell.kind !== 'empty') remaining++;
    }
  }

  const refills: RefillEvent[] = [];
  if (remaining < board.startingBubbleCount * 0.6) {
    const treatTypes = ['scooby-snack', 'sandwich', 'bone', 'pizza', 'cupcake'] as TreatType[];
    // Fill empty cells at top of each column
    for (let c = 0; c < cols; c++) {
      // Find top-most empty cells from row 0 downward
      for (let r = 0; r < rows; r++) {
        if (newCells[r][c].kind === 'empty') {
          const treatType = treatTypes[rng.nextInt(treatTypes.length)];
          const id = entityCounter++;
          newCells[r][c] = { entityId: id, kind: 'treat', treatType, row: r, col: c };
          refills.push({ entityId: id, treatType, row: r, col: c });
        }
      }
    }
  }

  const newBoard: BoardState = {
    cells: newCells,
    cols,
    rows,
    startingBubbleCount: board.startingBubbleCount,
  };

  return { board: newBoard, drops, refills };
}

/** Check if a Ghost Bubble at (row, col) should be removed based on its orthogonal neighbors. */
export { checkGhostBubbleRemoval as checkGhostRemoval } from '../logic/special-bubble-logic';

export function createBoardWorld(): BoardDatabase {
  return Database.create(boardPlugin);
}
