/**
 * Loading screen utilities — pure functions for progress computation.
 */

export interface LoadingState {
  loaded: string[];
  loading: string[];
  errors: Record<string, unknown>;
}

/**
 * Compute loading progress (0–100) for a set of target bundles.
 * Loaded bundles count as 1.0, loading bundles count as 0.5.
 */
export function computeLoadingProgress(state: LoadingState, targetBundles: string[]): number {
  if (targetBundles.length === 0) return 100;
  let sum = 0;
  for (const name of targetBundles) {
    if (state.loaded.includes(name)) {
      sum += 1;
    } else if (state.loading.includes(name)) {
      sum += 0.5;
    }
  }
  return (sum / targetBundles.length) * 100;
}
