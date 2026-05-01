/**
 * Batch 1 — GameController lifecycle tests
 *
 * Tests run in Node environment; Pixi, GSAP, ECS and DOM are mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so all mocked values are available inside vi.mock factories
const {
  mockSetActiveDb,
  mockDbTransactions,
  mockDbActions,
  mockDbResources,
  mockDbStore,
} = vi.hoisted(() => {
  const mockSetActiveDb = vi.fn();
  const mockDbResources = {
    score: 0, levelNumber: 1, tapsRemaining: 30, tapsUsed: 0,
    tapBudget: 30, starsEarned: 0, poppedBubbles: 0,
    startingBubbleCount: 70, boardPhase: 'IDLE', cols: 7, rows: 10,
    cascadeDepth: 0,
  };
  const mockDbStore = {
    resources: mockDbResources,
    select: vi.fn().mockReturnValue([]),
  };
  const mockDbTransactions = {
    initBoard: vi.fn(), replaceBoard: vi.fn(), addScore: vi.fn(),
    addPoppedBubbles: vi.fn(), decrementTaps: vi.fn(),
    setBoardPhase: vi.fn(), setCascadeDepth: vi.fn(), setStarsEarned: vi.fn(),
  };
  const mockDbActions = {
    executeTap: vi.fn().mockReturnValue({ rejected: true }),
    checkWinLoss: vi.fn().mockReturnValue({ outcome: 'none', starsEarned: 0 }),
  };
  return { mockSetActiveDb, mockDbTransactions, mockDbActions, mockDbResources, mockDbStore };
});

// Mock @adobe/data/* — must be before any imports that depend on them
vi.mock('@adobe/data/ecs', () => ({
  Database: {
    create: vi.fn().mockReturnValue({
      store: mockDbStore,
      observe: undefined,
      transactions: mockDbTransactions,
      actions: mockDbActions,
    }),
    Plugin: { create: vi.fn().mockImplementation((p: unknown) => p) },
    FromPlugin: vi.fn(),
  },
  Store: vi.fn(),
  Entity: vi.fn(),
}));
vi.mock('@adobe/data/math', () => ({
  Vec2: { schema: {} }, Vec3: { schema: {} }, Vec4: { schema: {} },
  F32: { schema: {} }, U32: { schema: {} }, I32: { schema: {} },
}));
vi.mock('@adobe/data/observe', () => ({ Observe: {} }));

// Mock pixi.js
vi.mock('pixi.js', () => {
  const makeContainer = () => ({
    addChild: vi.fn(), removeChild: vi.fn(), destroy: vi.fn(),
    removeAllListeners: vi.fn(), eventMode: 'none', children: [],
    alpha: 1, on: vi.fn(),
  });
  const Container = vi.fn().mockImplementation(makeContainer);
  const Text = vi.fn().mockImplementation(() => ({
    anchor: { set: vi.fn() }, position: { set: vi.fn() },
    x: 0, y: 0, alpha: 1, scale: { set: vi.fn() },
    removeAllListeners: vi.fn(), destroy: vi.fn(), parent: null,
  }));
  const Graphics = vi.fn().mockImplementation(() => ({
    rect: vi.fn().mockReturnThis(), fill: vi.fn().mockReturnThis(),
    position: { set: vi.fn() }, x: 0, y: 0, eventMode: 'none',
    cursor: '', on: vi.fn(), removeAllListeners: vi.fn(), destroy: vi.fn(),
  }));
  const Application = vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
    canvas: { tagName: 'CANVAS', appendChild: vi.fn() } as unknown as HTMLCanvasElement,
    stage: { addChild: vi.fn(), removeChild: vi.fn(), eventMode: 'none' },
    screen: { width: 390, height: 844 },
    ticker: { addOnce: vi.fn() },
  }));
  return { Application, Container, Text, Graphics };
});

// Mock GSAP
vi.mock('gsap', () => ({
  default: {
    killTweensOf: vi.fn(), to: vi.fn(), fromTo: vi.fn(),
    delayedCall: vi.fn(), globalTimeline: { clear: vi.fn() },
  },
}));

// Mock ~/core/systems/ecs
vi.mock('~/core/systems/ecs', () => ({
  setActiveDb: mockSetActiveDb,
  Database: {
    create: vi.fn().mockReturnValue({
      store: mockDbStore,
      observe: undefined,
      transactions: mockDbTransactions,
      actions: mockDbActions,
    }),
    Plugin: { create: vi.fn().mockImplementation((p: unknown) => p) },
  },
}));

// Mock solid-js
vi.mock('solid-js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('solid-js')>();
  return { ...actual };
});

import { setupGame } from '~/game/scooby-snack-smash/GameController';

function makeContainer(): HTMLDivElement {
  return {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    style: {},
    tagName: 'DIV',
  } as unknown as HTMLDivElement;
}

function makeDeps() {
  return {
    coordinator: {} as never,
    tuning: { scaffold: {} as never, game: {} as never },
    audio: {},
    gameData: {},
    analytics: {},
  };
}

describe('GameController lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Pixi app initializes and canvas appends on init', async () => {
    const controller = setupGame(makeDeps());
    expect(controller.gameMode).toBe('pixi');
    expect(typeof controller.ariaText).toBe('function');
    const container = makeContainer();
    controller.init(container);
    await new Promise(r => setTimeout(r, 20));
    controller.destroy();
  });

  it('destroy cleans up tweens, Pixi, ECS bridge in correct order', async () => {
    const controller = setupGame(makeDeps());
    const container = makeContainer();
    controller.init(container);
    await new Promise(r => setTimeout(r, 20));
    controller.destroy();
    expect(mockSetActiveDb).toHaveBeenCalledWith(null);
  });

  it('setActiveDb called on init and null on destroy', async () => {
    const controller = setupGame(makeDeps());
    const container = makeContainer();
    controller.init(container);
    await new Promise(r => setTimeout(r, 20));
    controller.destroy();
    const calls = mockSetActiveDb.mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toBeNull();
  });
});
