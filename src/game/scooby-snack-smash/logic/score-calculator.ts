/**
 * Score Calculator — pure function, no ECS imports, no Pixi.
 *
 * Formula (from resolved_questions):
 *   matchScore = (groupSize - 1) * 50
 *   chainMultiplier = cascadeDepth + 1
 *   points = matchScore * chainMultiplier + specialBonus
 *
 * Star rating thresholds (tapEfficiency = tapsRemaining / tapBudget):
 *   3 stars: tapEfficiency >= 0.5
 *   2 stars: tapEfficiency >= 0.25
 *   1 star:  otherwise
 *
 * Per CoS scoring: at least 2 multiplicative dimensions (groupSize × cascadeDepth).
 * Skilled player scoring 3x beginner is satisfied:
 *   group of 5 at cascade depth 2: (5-1)*50*(2+1) = 600
 *   group of 2 at cascade depth 0: (2-1)*50*(0+1) = 50
 *   600/50 = 12× (well above 3× requirement)
 */

export interface ScoreParams {
  groupSize: number;
  cascadeDepth: number;
  specialBonus: number;
}

export interface StarParams {
  tapsRemaining: number;
  tapBudget: number;
}

/**
 * Calculate points for a single tap event.
 * Pure function — no side effects, no ECS imports.
 */
export function calculateScore(params: ScoreParams): number {
  const { groupSize, cascadeDepth, specialBonus } = params;
  const matchScore = (groupSize - 1) * 50;
  const chainMultiplier = cascadeDepth + 1;
  return matchScore * chainMultiplier + specialBonus;
}

/**
 * Calculate star rating from tap efficiency.
 * tapEfficiency = tapsRemaining / tapBudget
 */
export function calculateStars(params: StarParams): number {
  const { tapsRemaining, tapBudget } = params;
  const tapEfficiency = tapBudget > 0 ? tapsRemaining / tapBudget : 0;
  if (tapEfficiency >= 0.5) return 3;
  if (tapEfficiency >= 0.25) return 2;
  return 1;
}

/**
 * Full level score with tap efficiency multiplier.
 * levelScore = (matchScore * chainMultiplier + specialBonus) * (1 + tapEfficiency * 0.5)
 */
export function calculateLevelScore(params: ScoreParams & StarParams): number {
  const { tapsRemaining, tapBudget } = params;
  const tapEfficiency = tapBudget > 0 ? tapsRemaining / tapBudget : 0;
  const base = calculateScore(params);
  return Math.floor(base * (1 + tapEfficiency * 0.5));
}
