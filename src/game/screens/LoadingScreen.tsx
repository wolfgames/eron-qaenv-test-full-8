import { onMount, createMemo, Show } from 'solid-js';
import { useScreen } from '~/core/systems/screens';
import { useAssets, useLoadingState } from '~/core/systems/assets';
import { useManifest } from '@wolfgames/components/solid';
import { useTuning, type ScaffoldTuning } from '~/core';
import { Logo } from '~/core/ui/Logo';
import type { GameTuning } from '~/game/tuning';
import { computeLoadingProgress } from '~/game/scooby-snack-smash/screens/loading-utils';

export function LoadingScreen() {
  const { goto } = useScreen();
  const assets = useAssets();
  const loadingState = useLoadingState();
  const { manifest } = useManifest();
  const tuning = useTuning<ScaffoldTuning, GameTuning>();

  const m = manifest();
  const bundlesByPrefix = (prefix: string) =>
    m.bundles.filter((b) => b.name.startsWith(prefix)).map((b) => b.name);

  const bootBundles = bundlesByPrefix('boot-');
  const themeBundles = bundlesByPrefix('theme-');
  const coreBundles = bundlesByPrefix('core-');
  const audioBundles = bundlesByPrefix('audio-');

  const shouldSkipStartScreen = (): boolean => {
    if (tuning.game.devMode?.skipStartScreen) return true;
    const params = new URLSearchParams(window.location.search);
    return params.get('screen') === 'game';
  };

  const skipToGame = shouldSkipStartScreen();

  const targetBundles = skipToGame
    ? [...bootBundles, ...themeBundles, ...coreBundles, ...audioBundles]
    : [...bootBundles, ...themeBundles];

  const progress = createMemo(() => {
    const s = loadingState();
    return computeLoadingProgress(s, targetBundles);
  });

  const themeLoaded = createMemo(() => {
    const s = loadingState();
    return themeBundles.every((b) => s.loaded.includes(b));
  });

  const failedBundles = createMemo(() => {
    const s = loadingState();
    return targetBundles.filter((name) => name in s.errors);
  });

  const retryFailed = async () => {
    const failed = failedBundles();
    for (const name of failed) {
      await assets.loadBundle(name);
    }
  };

  onMount(async () => {
    try {
      if (skipToGame) {
        await assets.loadBoot();
        await assets.loadTheme();

        assets.unlockAudio();
        await assets.initGpu();
        await assets.loadCore();
        try {
          await assets.loadAudio();
        } catch (err) {
          console.warn('Audio loading failed:', err);
        }
        await new Promise((r) => setTimeout(r, 300));
        await goto('game');
      } else {
        await assets.loadBoot();
        await assets.loadTheme();
        await new Promise((r) => setTimeout(r, 500));
        await goto('start');
      }
    } catch (err) {
      console.error('Failed to load initial assets:', err);
    }
  });

  return (
    <div class="fixed inset-0 flex flex-col items-center justify-center bg-[#BCE083]">
      <Show
        when={failedBundles().length === 0}
        fallback={
          <div class="text-center max-w-sm px-6">
            <p class="text-lg font-semibold text-gray-800 mb-2">Unable to load</p>
            <p class="text-sm text-gray-600 mb-4">
              Failed to load: {failedBundles().join(', ')}
            </p>
            <button
              onClick={retryFailed}
              class="px-6 py-3 bg-white text-gray-800 rounded-xl font-medium shadow-md hover:shadow-lg active:scale-95 transition-all"
            >
              Retry
            </button>
          </div>
        }
      >
        {/* Scooby running animation — shifts right as progress increases */}
        <div class="relative w-64 h-12 mb-2" aria-hidden="true">
          <span
            class="absolute text-5xl transition-all duration-300"
            style={{ left: `calc(${progress()}% - 2rem)`, top: 0, transform: 'scaleX(-1)' }}
          >🐕</span>
        </div>
        {/* Scooby Snack progress bar */}
        <div class="w-64 h-6 bg-white/40 rounded-full overflow-hidden flex">
          {Array.from({ length: 10 }, (_, i) => (
            <span
              class="flex-1 flex items-center justify-center text-base transition-opacity duration-300"
              style={{ opacity: progress() >= (i + 1) * 10 ? 1 : 0.2 }}
            >🍖</span>
          ))}
        </div>
      </Show>

      {themeLoaded() && (
        <div class="absolute bottom-8">
          <Logo />
        </div>
      )}
    </div>
  );
}
