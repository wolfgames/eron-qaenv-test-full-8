import { createSignal, onMount, onCleanup, Show, For, createEffect } from 'solid-js';
import gsap from 'gsap';
import { useScreen } from '~/core/systems/screens';
import { gameState } from '~/game/state';
import { getResultsScreenBranch, formatResultsNavigation } from '~/game/scooby-snack-smash/screens/results-utils';
import { mountChapterCompleteOverlay } from '~/game/scooby-snack-smash/screens/ChapterCompleteOverlay';
import { mountChapterInterstitial } from '~/game/scooby-snack-smash/screens/ChapterInterstitial';
import { getChapterConfig, getChapterIndex, getChapterFirstLevel } from '~/game/scooby-snack-smash/data/chapter-config';

/**
 * ResultsScreen — Scooby Snack Smash win/loss/chapter results.
 *
 * Win branch: Scooby victory emoji, score count-up, star rating reveal, 'Next Level'.
 * Loss branch: Scooby Ruh-roh emoji, positive retry copy, 'Try Again'.
 * Chapter-complete branch: Mystery Solved overlay (ChapterCompleteOverlay).
 * Chapter-start branch: haunted location interstitial (ChapterInterstitial).
 *
 * GDD requirements enforced:
 *   - No "Game Over" text anywhere
 *   - 'Next Level' on win, 'Try Again' on loss
 *   - Positive retry language on loss
 *
 * Navigation: reads goto params passed from GameController:
 *   { outcome: 'win'|'loss'|'chapter-complete'|'chapter-start', starsEarned, score, levelNumber, seed, chapterId? }
 */
export function ResultsScreen() {
  const { goto, data } = useScreen();

  // Read params passed from GameController via goto('results', { ... })
  const screenData = data();
  const outcome = (screenData?.outcome as string) ?? 'loss';
  const starsEarned = (screenData?.starsEarned as number) ?? 0;
  const finalScore = (screenData?.score as number) ?? gameState.score();
  const levelNumber = (screenData?.levelNumber as number) ?? gameState.level();
  const seed = (screenData?.seed as number) ?? 0;
  const chapterId = (screenData?.chapterId as number) ?? getChapterIndex(levelNumber);

  // Chapter-complete/chapter-start signal — allows transitioning within the results screen
  // without triggering the screen manager's same-screen dedup guard.
  const [innerOutcome, setInnerOutcome] = createSignal<string>(outcome);
  const [innerChapterId, setInnerChapterId] = createSignal<number>(chapterId);

  let containerEl: HTMLDivElement | undefined;
  let overlayContainerEl: HTMLDivElement | undefined;

  // Chapter-start branch: show ChapterInterstitial overlay
  createEffect(() => {
    const currentOutcome = innerOutcome();
    const currentChapterId = innerChapterId();
    if (currentOutcome !== 'chapter-start' || !containerEl) return;

    const chapter = getChapterConfig(currentChapterId);
    const cleanup = mountChapterInterstitial(containerEl, {
      chapter,
      onLetsGo: () => {
        gameState.setLevel(getChapterFirstLevel(currentChapterId));
        void goto('game');
      },
    });
    onCleanup(cleanup);
  });

  // Chapter-complete branch: show ChapterCompleteOverlay over win screen
  createEffect(() => {
    const currentOutcome = innerOutcome();
    const currentChapterId = innerChapterId();
    if (currentOutcome !== 'chapter-complete' || !overlayContainerEl) return;

    const nextChapterId = currentChapterId + 1;
    const cleanup = mountChapterCompleteOverlay(overlayContainerEl, {
      chapterNumber: currentChapterId,
      onContinue: () => {
        setInnerChapterId(nextChapterId);
        setInnerOutcome('chapter-start');
      },
    });
    onCleanup(cleanup);
  });

  const isChapterBranch = () =>
    innerOutcome() === 'chapter-start' || innerOutcome() === 'chapter-complete';

  const effectiveOutcome = (() => {
    const o = outcome;
    if (o === 'chapter-complete') return 'win';
    if (o === 'chapter-start') return 'win'; // fallback — chapter-start renders separately
    return o as 'win' | 'loss';
  })();

  const branch = getResultsScreenBranch({ outcome: effectiveOutcome, starsEarned, score: finalScore });

  const [displayScore, setDisplayScore] = createSignal(0);
  let scoreEl: HTMLDivElement | undefined;
  let starsEl: HTMLDivElement | undefined;

  onMount(() => {
    // Animate score count-up (200ms per "digit step")
    gsap.to({ val: 0 }, {
      val: finalScore,
      duration: Math.min(finalScore / 200, 2),
      ease: 'power2.out',
      onUpdate: function() {
        setDisplayScore(Math.floor(this.targets()[0].val));
      },
    });

    // Stars staggered reveal (3 × 150ms) on win
    if (effectiveOutcome === 'win' && starsEl) {
      const stars = starsEl.querySelectorAll('.star');
      stars.forEach((star, i) => {
        gsap.fromTo(star,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.3, delay: i * 0.15, ease: 'back.out(1.7)' },
        );
      });
    }
  });

  const handlePrimaryAction = () => {
    if (effectiveOutcome === 'win') {
      const nav = formatResultsNavigation({ outcome: 'win', levelNumber, seed });
      gameState.setLevel(nav.params.levelNumber);
      void goto('game');
    } else {
      // Try Again — same level, same seed (level unchanged in gameState)
      gameState.setLevel(levelNumber);
      void goto('game');
    }
  };

  const handleMainMenu = () => {
    gameState.reset();
    void goto('start');
  };

  return (
    <div class="fixed inset-0 flex flex-col items-center justify-center px-6"
         style={{ 'background-color': effectiveOutcome === 'win' ? '#BCE083' : '#2d3748',
                  position: 'relative' }}>

      {/* Chapter-start interstitial — full-screen overlay replacing results content */}
      <Show when={innerOutcome() === 'chapter-start'}>
        <div ref={containerEl} style={{ position: 'absolute', inset: 0 }} />
      </Show>

      {/* Normal win/loss content — hidden when chapter branch is active */}
      <Show when={!isChapterBranch()}>
        {/* Companion emoji */}
        <div class="text-8xl mb-4" aria-hidden="true">
          {branch.emoji}
        </div>

        {/* Headline — never "Game Over" */}
        <h1 class="text-3xl font-bold mb-2"
            style={{ color: effectiveOutcome === 'win' ? '#2d5016' : '#ffffff' }}>
          {branch.headline}
        </h1>

        {/* Star rating — win branch only */}
        <Show when={effectiveOutcome === 'win'}>
          <div ref={starsEl} class="flex gap-2 mb-4">
            <For each={[1, 2, 3]}>
              {(i) => (
                <span class="star text-4xl" style={{ opacity: 0 }}>
                  {i <= starsEarned ? '⭐' : '☆'}
                </span>
              )}
            </For>
          </div>
        </Show>

        {/* Score display */}
        <div class="text-center mb-6">
          <p class="text-sm mb-1" style={{ color: effectiveOutcome === 'win' ? '#2d5016' : '#a0aec0' }}>Score</p>
          <p ref={scoreEl} class="text-5xl font-bold"
             style={{ color: effectiveOutcome === 'win' ? '#2d5016' : '#ffffff' }}>
            {displayScore()}
          </p>
        </div>

        {/* Loss retry message */}
        <Show when={effectiveOutcome === 'loss' && branch.retryMessage}>
          <p class="text-lg text-white/80 mb-6 text-center">{branch.retryMessage}</p>
        </Show>

        {/* Primary CTA — 'Next Level' or 'Try Again' */}
        <button
          onClick={handlePrimaryAction}
          class="w-full max-w-xs py-4 rounded-2xl font-bold text-xl mb-3"
          style={{
            background: effectiveOutcome === 'win' ? '#4a8c1c' : '#e53e3e',
            color: '#fff',
            'min-height': '56px',
          }}
        >
          {branch.primaryButtonLabel}
        </button>

        {/* Secondary — Main Menu */}
        <button
          onClick={handleMainMenu}
          class="text-sm py-2 px-6"
          style={{ color: effectiveOutcome === 'win' ? '#2d5016' : '#a0aec0', 'min-height': '44px' }}
        >
          Main Menu
        </button>
      </Show>

      {/* Chapter complete overlay — absolute over win screen */}
      <Show when={innerOutcome() === 'chapter-complete'}>
        <div ref={overlayContainerEl} style={{ position: 'absolute', inset: 0 }} />
      </Show>
    </div>
  );
}
