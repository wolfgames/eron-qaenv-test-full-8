/**
 * ChapterInterstitial — DOM screen branch rendered within the 'results' screen.
 *
 * Shows: full-screen haunted location emoji background, 2-line Scooby caption,
 * 'Let's Go!' button in Natural (bottom-third) thumb zone.
 *
 * This is NOT a new top-level screen ID — it renders as a branch/overlay within
 * the 'results' screen route when goto params include {outcome: 'chapter-start'}.
 *
 * Per guardrails: SolidJS patterns apply; all animations via GSAP.
 */

import gsap from 'gsap';
import type { ChapterConfig } from '../data/chapter-config';

export interface ChapterInterstitialDeps {
  chapter: ChapterConfig;
  onLetsGo: () => void;
}

export function mountChapterInterstitial(
  container: HTMLElement,
  deps: ChapterInterstitialDeps,
): () => void {
  const { chapter, onLetsGo } = deps;
  const wrapper = document.createElement('div');
  wrapper.style.cssText =
    'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;' +
    'justify-content:flex-start;background:#1a1a2e;z-index:10;touch-action:none;user-select:none;';

  // Location emoji — full-screen background feel
  const locationEmoji = document.createElement('div');
  locationEmoji.textContent = chapter.locationEmoji;
  locationEmoji.style.cssText =
    'font-size:8rem;padding-top:15%;text-align:center;opacity:0;';
  wrapper.append(locationEmoji);

  // Chapter title
  const titleEl = document.createElement('h2');
  titleEl.textContent = chapter.name;
  titleEl.style.cssText =
    'font-size:1.5rem;font-weight:700;color:#ffd700;margin:16px 0 8px;' +
    'text-align:center;padding:0 24px;opacity:0;';
  wrapper.append(titleEl);

  // 2-line caption
  const caption1El = document.createElement('p');
  caption1El.textContent = chapter.caption1;
  caption1El.style.cssText =
    'font-size:1.1rem;color:#e2e8f0;margin:0;text-align:center;opacity:0;';
  const caption2El = document.createElement('p');
  caption2El.textContent = chapter.caption2;
  caption2El.style.cssText =
    'font-size:1.1rem;color:#e2e8f0;margin:0 0 24px;text-align:center;opacity:0;';
  wrapper.append(caption1El, caption2El);

  // Let's Go! button — Natural thumb zone (bottom ~10% from bottom)
  const letsGoBtn = document.createElement('button');
  letsGoBtn.textContent = "Let's Go!";
  letsGoBtn.style.cssText =
    'position:absolute;bottom:10%;left:50%;transform:translateX(-50%);' +
    'font-size:1.4rem;font-weight:700;padding:16px 64px;border:none;border-radius:16px;' +
    'background:#ffd700;color:#2d3748;cursor:pointer;min-width:160px;min-height:56px;' +
    'font-family:system-ui,sans-serif;opacity:0;';
  wrapper.append(letsGoBtn);

  container.append(wrapper);

  // Entrance animations via GSAP
  const tl = gsap.timeline({ delay: 0.1 });
  tl.to(locationEmoji, { opacity: 1, scale: 1.1, duration: 0.5, ease: 'back.out(1.2)' })
    .to(locationEmoji, { scale: 1, duration: 0.2 })
    .to(titleEl, { opacity: 1, y: 0, duration: 0.3 }, '-=0.1')
    .to(caption1El, { opacity: 1, duration: 0.25 })
    .to(caption2El, { opacity: 1, duration: 0.25 })
    .to(letsGoBtn, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.7)' });

  letsGoBtn.addEventListener('click', onLetsGo, { once: true });
  letsGoBtn.addEventListener('pointertap', onLetsGo, { once: true });

  // Cleanup function
  return () => {
    tl.kill();
    gsap.killTweensOf(wrapper);
    wrapper.remove();
  };
}
