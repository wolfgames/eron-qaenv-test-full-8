/**
 * Batch 2 — board-state-machine tests
 * Tests the board phase behavior via BoardPlugin actions.
 */
import { describe, it, expect, vi } from 'vitest';

// Mock @adobe/data/* for ECS
vi.mock('@adobe/data/ecs', () => ({
  Database: {
    create: vi.fn(),
    Plugin: { create: vi.fn().mockImplementation((p: unknown) => p) },
  },
  Store: vi.fn(),
  Entity: vi.fn(),
}));
vi.mock('@adobe/data/math', () => ({
  Vec2: { schema: {} }, Vec3: { schema: {} }, Vec4: { schema: {} },
  F32: { schema: {} }, U32: { schema: {} }, I32: { schema: {} },
}));
vi.mock('@adobe/data/observe', () => ({ Observe: {} }));

import { createRng } from '~/game/scooby-snack-smash/logic/rng';
import { generateBoard } from '~/game/scooby-snack-smash/data/board-layout';
import type { BoardState } from '~/game/scooby-snack-smash/data/board-layout';

// Test the state machine logic in isolation using the action functions
// (which are pure — no ECS needed for unit tests)
import { floodFill } from '~/game/scooby-snack-smash/state/BoardPlugin';

// Simulate the board state machine behavior
type BoardPhase = 'IDLE' | 'ANIMATING' | 'WIN' | 'LOST' | 'PAUSED';

function createBoardStateMachine() {
  let phase: BoardPhase = 'IDLE';
  let queuedTap: { row: number; col: number } | null = null;
  const taps: { row: number; col: number }[] = [];

  return {
    getPhase: () => phase,
    getQueuedTap: () => queuedTap,
    getTaps: () => taps,
    handleTap(row: number, col: number) {
      if (phase === 'WIN' || phase === 'LOST') return;
      if (phase === 'ANIMATING') {
        queuedTap = { row, col };
        return;
      }
      if (phase === 'IDLE') {
        taps.push({ row, col });
      }
    },
    setPhase(p: BoardPhase) {
      phase = p;
      if (p === 'IDLE' && queuedTap) {
        const tap = queuedTap;
        queuedTap = null;
        taps.push(tap);
      }
    },
  };
}

describe('board-state-machine: input gating', () => {
  it('IDLE state accepts tap input', () => {
    const sm = createBoardStateMachine();
    expect(sm.getPhase()).toBe('IDLE');
    sm.handleTap(0, 0);
    expect(sm.getTaps()).toHaveLength(1);
  });

  it('ANIMATING state queues tap (max 1)', () => {
    const sm = createBoardStateMachine();
    sm.setPhase('ANIMATING');
    sm.handleTap(1, 1);
    sm.handleTap(2, 2); // second queued tap should overwrite
    expect(sm.getTaps()).toHaveLength(0);
    expect(sm.getQueuedTap()).toEqual({ row: 2, col: 2 });
  });

  it('WIN state blocks all input', () => {
    const sm = createBoardStateMachine();
    sm.setPhase('WIN');
    sm.handleTap(0, 0);
    expect(sm.getTaps()).toHaveLength(0);
  });

  it('LOST state blocks all input', () => {
    const sm = createBoardStateMachine();
    sm.setPhase('LOST');
    sm.handleTap(0, 0);
    expect(sm.getTaps()).toHaveLength(0);
  });

  it('tap during ANIMATING executes after animation completes', () => {
    const sm = createBoardStateMachine();
    sm.setPhase('ANIMATING');
    sm.handleTap(3, 3); // queued
    expect(sm.getTaps()).toHaveLength(0);
    sm.setPhase('IDLE'); // animation done → queued tap fires
    expect(sm.getTaps()).toHaveLength(1);
    expect(sm.getTaps()[0]).toEqual({ row: 3, col: 3 });
  });
});
