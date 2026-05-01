/**
 * ChapterCompleteOverlay — overlay rendered OVER the results screen.
 *
 * Shows: 'Mystery Solved! 🔍' banner, Scooby celebration, 'Continue' button.
 * Navigates to next chapter's interstitial via {outcome: 'chapter-start', chapterId: next}.
 *
 * Positioned as an absolute overlay (z-index: 50) within the results screen.
 * NOT a new top-level screen ID.
 */

import gsap from 'gsap';

export interface ChapterCompleteOverlayDeps {
  chapterNumber: number;
  onContinue: () => void;
}

export function mountChapterCompleteOverlay(
  container: HTMLElement,
  deps: ChapterCompleteOverlayDeps,
): () => void {
  const { chapterNumber, onContinue } = deps;
  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;' +
    'justify-content:center;background:rgba(0,0,0,0.85);z-index:50;touch-action:none;user-select:none;';

  // Mystery Solved banner
  const banner = document.createElement('h1');
  banner.textContent = 'Mystery Solved! 🔍';
  banner.style.cssText =
    'font-size:2.5rem;font-weight:900;color:#ffd700;text-align:center;' +
    'text-shadow:2px 2px 0 rgba(0,0,0,0.5);margin:0 0 24px;opacity:0;';
  overlay.append(banner);

  // Scooby celebration
  const celebEmoji = document.createElement('div');
  celebEmoji.textContent = '🐕🎉';
  celebEmoji.style.cssText = 'font-size:6rem;text-align:center;opacity:0;';
  overlay.append(celebEmoji);

  // Chapter complete text
  const chapterText = document.createElement('p');
  chapterText.textContent = `Chapter ${chapterNumber} Complete!`;
  chapterText.style.cssText =
    'font-size:1.25rem;color:#e2e8f0;margin:16px 0 32px;text-align:center;opacity:0;';
  overlay.append(chapterText);

  // Continue button
  const continueBtn = document.createElement('button');
  continueBtn.textContent = 'Continue';
  continueBtn.style.cssText =
    'position:absolute;bottom:10%;left:50%;transform:translateX(-50%);' +
    'font-size:1.4rem;font-weight:700;padding:16px 64px;border:none;border-radius:16px;' +
    'background:#4a8c1c;color:#fff;cursor:pointer;min-width:160px;min-height:56px;' +
    'font-family:system-ui,sans-serif;opacity:0;';
  overlay.append(continueBtn);

  container.append(overlay);

  // Entrance animation
  const tl = gsap.timeline({ delay: 0.2 });
  tl.to(banner, { opacity: 1, scale: 1.1, duration: 0.4, ease: 'back.out(1.2)' })
    .to(banner, { scale: 1, duration: 0.2 })
    .to(celebEmoji, { opacity: 1, duration: 0.3 })
    .to(chapterText, { opacity: 1, duration: 0.3 })
    .to(continueBtn, { opacity: 1, duration: 0.3, ease: 'back.out(1.7)' });

  // Looped Scooby dance
  gsap.to(celebEmoji, {
    rotation: 15, y: -10, duration: 0.3,
    ease: 'power1.inOut', yoyo: true, repeat: -1, delay: 0.5,
  });

  continueBtn.addEventListener('click', onContinue, { once: true });
  continueBtn.addEventListener('pointertap', onContinue, { once: true });

  return () => {
    tl.kill();
    gsap.killTweensOf(celebEmoji);
    overlay.remove();
  };
}
