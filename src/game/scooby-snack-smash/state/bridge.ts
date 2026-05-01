/**
 * ECS → SolidJS signal bridge for Scooby Snack Smash.
 *
 * Wires ECS resource changes to DOM-visible signals.
 * Per ecs-state rules: write to ECS, let bridge propagate to signals.
 * Signals are DOM bridge only — not source of truth.
 */

import { createSignal, createRoot } from 'solid-js';
import type { BoardDatabase } from './BoardPlugin';

export interface ScoobyGameState {
  // ECS-bridged (read-only from DOM)
  score: () => number;
  level: () => number;
  tapsRemaining: () => number;
  starsEarned: () => number;
  poppedBubbles: () => number;
  boardPhase: () => string;
  // Setters — used by bridgeEcsToSignals ONLY
  setScore: (v: number) => void;
  setLevel: (v: number) => void;
  setTapsRemaining: (v: number) => void;
  setStarsEarned: (v: number) => void;
  setPoppedBubbles: (v: number) => void;
  setBoardPhase: (v: string) => void;
}

function createScoobyState(): ScoobyGameState {
  const [score, setScore] = createSignal(0);
  const [level, setLevel] = createSignal(1);
  const [tapsRemaining, setTapsRemaining] = createSignal(30);
  const [starsEarned, setStarsEarned] = createSignal(0);
  const [poppedBubbles, setPoppedBubbles] = createSignal(0);
  const [boardPhase, setBoardPhase] = createSignal('IDLE');

  return {
    score, setScore,
    level, setLevel,
    tapsRemaining, setTapsRemaining,
    starsEarned, setStarsEarned,
    poppedBubbles, setPoppedBubbles,
    boardPhase, setBoardPhase,
  };
}

export const scoobyState = createRoot(createScoobyState);

/**
 * Subscribe to ECS resource changes and push to SolidJS signals.
 * Returns a cleanup function to unsubscribe.
 *
 * Lifecycle: call after db init + app.init. Call cleanup before destroying db.
 */
export function bridgeEcsToSignals(db: BoardDatabase): () => void {
  const cleanups: (() => void)[] = [];

  const observe = (db as unknown as { observe: { resources: Record<string, unknown> } }).observe;
  if (!observe?.resources) return () => {};

  function sub<T>(key: string, setter: (v: T) => void) {
    const resource = observe.resources[key] as { subscribe?: (fn: (v: T) => void) => () => void };
    if (typeof resource?.subscribe === 'function') {
      cleanups.push(resource.subscribe(setter));
    }
  }

  sub('score', scoobyState.setScore);
  sub('levelNumber', scoobyState.setLevel);
  sub('tapsRemaining', scoobyState.setTapsRemaining);
  sub('starsEarned', scoobyState.setStarsEarned);
  sub('poppedBubbles', scoobyState.setPoppedBubbles);
  sub('boardPhase', scoobyState.setBoardPhase);

  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}
