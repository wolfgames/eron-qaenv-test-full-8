# Scooby Snack Smash
**Tagline:** Every mystery deserves a snack break.
**Genre:** Casual Puzzle / Bubble Pop
**Platform:** Mobile first (portrait, touch), playable on web
**Target Audience:** Casual adults 30+

---

## Table of Contents

**The Game**
1. [Game Overview](#game-overview)
2. [At a Glance](#at-a-glance)

**How It Plays**
3. [Core Mechanics](#core-mechanics)
4. [Level Generation](#level-generation)

**How It Flows**
5. [Game Flow](#game-flow)

---

## Game Overview

Scooby Snack Smash is a casual bubble-pop puzzle game drenched in spooky 1970s cartoon atmosphere where players tap matching clusters of floating treats to pop them before the gang runs out of Scooby Snacks. Colorful treat bubbles drift across haunted backdrops — groovy wallpaper mansions, moonlit cemeteries, fog-filled swamps — as a lovable Great Dane companion cheers every cleared cluster with oversized cartoon reactions. Player does [tap a group of 2+ matching treat bubbles] -> which causes [the cluster to pop with satisfying splatter effects and chain cascades] -> which unlocks [treat rewards, Scooby's celebratory animation, and progress toward clearing the haunted location].

**Setting:** Haunted locations from the 1970s Scooby-Doo universe — creaky mansions with avocado-green wallpaper, groovy ghost-filled carnivals, spooky swamps lit by jack-o'-lanterns — rendered in a warm, cel-shaded cartoon style with thick outlines, muted earth tones, and occasional psychedelic color pops.

**Core Loop:** Player taps [a matched group of 2+ treat bubbles] -> which causes [the group to pop, remaining bubbles to cascade downward with physics, and new bubbles to float in from the top] -> which unlocks [score points, companion celebration animations, and progress toward the chapter's haunted-location reveal].

---

## At a Glance

| | |
|---|---|
| **Grid** | Free-floating canvas, ~7×10 bubble field (portrait) |
| **Input** | Tap |
| **Treat Types** | 5 (Scooby Snack, Sandwich, Bone, Pizza Slice, Cupcake) |
| **Special Bubbles** | Ghost Bubble (blocker), Mega Snack (5+), Mystery Bag (8+) |
| **Session Target** | 2–5 min per level |
| **Move Range** | 12–40 taps per level |
| **Failure** | Yes — out of taps |
| **Continue System** | Ad or in-game currency for extra taps |
| **Companion** | Scooby-Doo — reacts to every pop with cartoon celebrations |
| **Generation Method** | Hybrid (hand-crafted levels 1–10, procedural thereafter) |

---

## Core Mechanics

### Primary Input

**Input type:** Single tap  
**Acts on:** Any treat bubble on the play canvas  
**Produces:** If the tapped bubble belongs to a group of 2 or more adjacent matching treat bubbles, the entire group pops simultaneously with a burst animation and audio cue. If the bubble is isolated (no matching neighbor), the tap is rejected — no pop occurs and no tap is consumed.

All input is touch-first. On web, mouse click maps directly to tap. No hover states, no right-click, no keyboard-required actions.

### Play Surface

**Dimensions:** A floating bubble field approximately 7 columns × 10 rows of bubbles in portrait orientation. Bubbles are circular, roughly 52–60pt diameter, giving a minimum 44pt tap target per bubble (extended hit area fills the cell space).

**Bounds:** The field occupies the central 80% of the screen width, with ~10% margin on each side. The top 15% is reserved for the HUD (tap counter, score, level number). The bottom 10% is reserved for Scooby's companion reaction strip.

**Scaling:** The bubble grid scales proportionally to fit the device screen — no horizontal scrolling. On wider phones the bubbles grow slightly; on narrow phones they compress to the 44pt minimum.

**Cell types:**
- **Empty cell** — no bubble present; bubbles above fall down to fill (gravity cascade).
- **Treat cell** — occupied by one of 5 treat bubble types.
- **Blocker cell** — occupied by a Ghost Bubble (cannot be tapped; must be cleared by adjacent pops).

### Game Entities

#### Treat Bubbles (5 types)

| Name | Visual | Behavior | Edge Cases |
|------|--------|----------|------------|
| Scooby Snack | Round biscuit with S-stamp, sandy beige | Standard pop unit; groups of 2+ pop together | Most common bubble; fills ~30% of board |
| Sandwich | Stacked cartoon sandwich, yellow-brown | Standard pop unit | Groups of 2+ pop |
| Bone | White cartoon dog bone | Standard pop unit | Groups of 2+ pop |
| Pizza Slice | Orange triangle with spots | Standard pop unit | Groups of 2+ pop |
| Cupcake | Pink frosted cupcake | Standard pop unit | Groups of 2+ pop |

All five treat types follow the same adjacency rule: **up, down, left, right** neighbors only (no diagonal matching).

#### Special Bubbles

| Name | Visual | Behavior | Trigger |
|------|--------|----------|---------|
| Mega Snack | Oversized Scooby Snack with glow ring | Pops when part of a group of 5–7; also clears all bubbles in a 1-cell radius | Formed when a valid tap group ≥ 5 |
| Mystery Bag | Brown paper bag with question mark | Clears an entire row when popped; triggers a "mystery bonus" score multiplier | Formed when a valid tap group ≥ 8 |
| Ghost Bubble | Semi-transparent white ghost face | Blocker — does not match any treat type; cannot be directly tapped | Present at spawn; removed when all 4 orthogonal neighbors are popped |

#### Companion Strip (Scooby)

Scooby occupies a fixed strip at the bottom of the screen (below the play canvas). He is not interactive — he animates reactively based on game events (pop size, milestone reached, tap rejected).

### Movement & Physics Rules

**Gravity cascade:**
- IF a bubble is popped AND there are bubbles above it in the same column THEN those bubbles fall down one cell per empty cell below them, with a bounce-settle animation (duration: 200ms fall + 80ms settle per row traveled).
- IF a column is entirely empty after a pop THEN bubbles from adjacent columns do NOT slide horizontally — only vertical gravity applies.

**Bubble refill:**
- IF the total bubble count on the canvas falls below 60% of starting count THEN new bubbles float in from the top of the canvas in a staggered wave (200ms stagger between columns, 300ms float-in animation per bubble).
- New bubbles are always treat types only (no special bubbles spawned in refill waves unless level script specifies).

**Ghost Bubble removal:**
- IF all 4 orthogonal neighbors of a Ghost Bubble are popped in a single tap action OR across sequential pops THEN the Ghost Bubble shatters with a cartoon ghost-exit animation (duration: 400ms) and the cell becomes empty.
- IF a Ghost Bubble has fewer than 4 orthogonal neighbors at the board edge THEN only the existing neighbors need to be popped to remove it.

**Input during animation:**
- IF the cascade/refill animation is playing THEN tap input is queued (not ignored). The queued tap resolves once the animation completes. Only one tap may be queued at a time — subsequent taps during animation are ignored.

**Invalid tap:**
- IF a single isolated bubble is tapped THEN no tap is consumed, no animation plays, and the companion shows a quick "Ruh-roh" reaction (duration: 600ms).

*For invalid action feedback (visual, audio, duration), see [Feedback & Juice](#feedback--juice).*

---

## Level Generation

### Method

**Hybrid** — Levels 1–10 are fully hand-crafted (authored by the game team in a level-data JSON file). Levels 11 and beyond are procedurally generated using the algorithm below, with the hand-crafted set available as a guaranteed fallback pool.

### Generation Algorithm

**Step 1: Difficulty Parameter Lookup**
- Inputs: `levelNumber`, `difficultyTable` (defines parameter ranges per level band)
- Outputs: `tapBudget`, `bubbleCount`, `colorCount`, `ghostCount`, `specialThreshold`
- Constraints:
  - Levels 11–30: 4 treat types, 0–2 Ghost Bubbles, 20–32 tap budget, no Mystery Bags
  - Levels 31–60: 4–5 treat types, 2–4 Ghost Bubbles, 16–28 tap budget, Mega Snacks enabled
  - Levels 61+: 5 treat types, 3–6 Ghost Bubbles, 12–24 tap budget, Mystery Bags enabled
  - Tap budget never falls below 12 (casual floor)
  - `colorCount` increases gradually — never jumps more than 1 type per 20-level band

**Step 2: Initial Board Placement**
- Inputs: `bubbleCount`, `colorCount`, `ghostCount`, `seed`
- Outputs: `boardGrid[7][10]` — fully populated bubble layout
- Constraints:
  - Distribute treat types evenly (within ±2 bubbles per type)
  - No treat type may occupy fewer than 8 cells (ensures valid groups always exist at start)
  - Place Ghost Bubbles only in the middle 60% of the grid (rows 2–8, columns 1–6) — never on the first row (top spawn row) or last row (bottom gravity row)
  - Minimum 2 valid tap groups (size ≥ 2) must exist at board start

**Step 3: Solvability Forward Simulation**
- Inputs: `boardGrid`, `tapBudget`, `seed`
- Outputs: `isSolvable` (bool), `simulatedMoveCount`
- Constraints:
  - Run a greedy simulation: always pop the largest available group
  - IF simulation clears ≥ 80% of starting bubbles within `tapBudget` THEN `isSolvable = true`
  - IF `isSolvable = false` THEN reject this board and retry (up to 10 attempts)
  - Simulation uses the same seeded RNG — same seed always produces same outcome

**Step 4: Special Bubble Injection**
- Inputs: `boardGrid` (validated), `specialThreshold`, `seed`
- Outputs: `boardGrid` with up to 2 pre-placed special bubble locations marked
- Constraints:
  - Specials are placed at cluster centers (cells with ≥ 3 orthogonal same-type neighbors)
  - No more than 2 pre-placed specials per level (additional specials emerge through natural play)
  - Specials never placed in the top 2 rows (prevents immediate trigger on first tap)

### Seeding & Reproducibility

**Seed formula:** `seed = levelNumber × 31337 + playerUserId % 9999`

Using `playerUserId` ensures two different players get different board layouts for the same level, preventing walkthrough sharing. The same `playerUserId + levelNumber` pair always produces the exact same board. Seeds are stored in the level-result record so support can reproduce any reported board.

**Same-seed guarantee:** The RNG is a deterministic mulberry32 implementation. Given identical `seed`, `bubbleCount`, and `colorCount`, Step 2 and Step 4 always produce identical output.

### Solvability Validation

**Rejection conditions (named):**
1. `NO_VALID_GROUPS` — fewer than 2 valid tap groups at board start
2. `UNSOLVABLE_SIMULATION` — greedy simulation fails to clear 80% within tap budget
3. `GHOST_ISOLATION` — a Ghost Bubble has 0 poppable neighbors (permanently unremovable)
4. `COLOR_STARVATION` — any treat type occupies fewer than 6 cells (too rare to form groups reliably)

**Retry logic:** On any rejection condition, increment seed by 1 and retry from Step 2. Maximum 10 retries per level.

**Fallback chain:**
1. After 10 failed retries → draw a random level from the hand-crafted pool (levels 1–10) adjusted to current difficulty parameters (swap in appropriate bubble counts via post-processing)
2. If post-processing also fails → serve hand-crafted level as-is (ignores difficulty mismatch, logs a warning)

**Last-resort guarantee:** Level 1 (hand-crafted) is always valid, always solvable, and is the absolute fallback if all other paths fail. It is read-only and never modified at runtime.

### Hand-Crafted Levels

**Which levels:** Levels 1–10.  
**Where data lives:** `src/game/scooby-snack-smash/data/hand-crafted-levels.json` — a JSON array of level objects, each containing `levelNumber`, `grid` (7×10 cell array), `tapBudget`, and `objectives`.  
**Who owns them:** Game design team. File is version-controlled; changes require a PR review tagged `level-design`.

---

## Game Flow

### Master Flow Diagram

```
App Open
  ↓ [assets loaded]
Loading Screen  [lifecycle_phase: BOOT]
  ↓ [load complete]
Title Screen  [lifecycle_phase: TITLE]
  ↓ [tap "Play"]
Chapter Start Interstitial  [lifecycle_phase: TITLE]
  ↓ [tap "Let's Go!"]
Gameplay Screen  [lifecycle_phase: PLAY]
  ↓ [all objectives cleared OR taps exhausted]
  ├─ [win] → Level Complete Screen  [lifecycle_phase: OUTCOME]
  │           ↓ [tap "Next Level"]
  │           → Gameplay Screen (next level)  [lifecycle_phase: PLAY]
  │           ↓ [last level of chapter cleared]
  │           → Chapter Complete Screen  [lifecycle_phase: OUTCOME]
  │                       ↓ [tap "Continue"]
  │                       → Chapter Start Interstitial (next chapter)  [lifecycle_phase: TITLE]
  └─ [lose] → Loss Screen  [lifecycle_phase: OUTCOME]
              ↓ [tap "Try Again" or "Continue with Snacks"]
              → Gameplay Screen (same level, same board)  [lifecycle_phase: PLAY]
```

### Screen Breakdown

#### Loading Screen
- **lifecycle_phase:** BOOT
- **Purpose:** Load asset bundles; show branding while GPU initializes.
- **Player sees:** Scooby running across the screen against a groovy 70s wallpaper background; progress bar fills with Scooby Snacks.
- **Player does:** Nothing (passive).
- **What happens next:** Transitions to Title Screen when all assets are loaded (~2–4 seconds on 4G).
- **Expected session time:** 2–4 seconds.

#### Title Screen
- **lifecycle_phase:** TITLE
- **Purpose:** Entry point; game identity moment.
- **Player sees:** "Scooby Snack Smash" logo with a wobble animation, Scooby peeking from below the logo, a large "Play" button in the Natural thumb zone (bottom third of screen), settings icon top-right.
- **Player does:** Tap "Play" to begin.
- **What happens next:** Chapter Start Interstitial for the current chapter.
- **Expected session time:** 2–5 seconds.

#### Chapter Start Interstitial
- **lifecycle_phase:** TITLE
- **Purpose:** Establish the chapter's haunted location and create narrative anticipation.
- **Player sees:** Full-screen illustration of the chapter's haunted location (e.g., "The Haunted Mansion on Elm Street") with a brief two-line caption from Scooby. A "Let's Go!" button.
- **Player does:** Tap "Let's Go!" to proceed.
- **What happens next:** Gameplay Screen (level 1 of the chapter, or current level if returning).
- **Expected session time:** 3–5 seconds.

#### Gameplay Screen
- **lifecycle_phase:** PLAY
- **Purpose:** Core play loop — pop treat bubbles to clear the board.
- **Player sees:** Bubble field (7×10), HUD at top (tap counter, score, level number), Scooby companion strip at bottom, haunted-location background art.
- **Player does:** Tap matching bubble groups to pop them; watches cascades; manages tap budget.
- **What happens next:**
  - IF win condition met → Level Complete Screen (animated transition, 600ms).
  - IF lose condition met → Loss Screen (animated transition, 400ms).
- **Expected session time:** 2–5 minutes.

#### Level Complete Screen
- **lifecycle_phase:** OUTCOME
- **Purpose:** Celebrate the win; show score and progress.
- **Player sees:** Scooby doing a victory dance animation; score readout with pop-in number animation; "Next Level" button; optional star rating (1–3 stars based on taps remaining).
- **Player does:** Tap "Next Level."
- **What happens next:**
  - IF more levels in chapter → Gameplay Screen (next level). Transition: bubble-burst wipe, 500ms.
  - IF chapter complete → Chapter Complete Screen.
- **Expected session time:** 5–10 seconds.

#### Loss Screen
- **lifecycle_phase:** OUTCOME
- **Purpose:** Soft fail state — encourage retry without punishing.
- **Player sees:** Scooby looking sheepish with a "Ruh-roh!" speech bubble; score so far; "Try Again" button (primary); "Continue with Snacks" button (secondary — spends in-game currency or shows ad for +5 taps).
- **Player does:** Tap "Try Again" (free, restarts level from same board) or "Continue with Snacks" (second chance with extra taps).
- **What happens next:** Gameplay Screen (same level, same seed board). Transition: fade, 300ms.
- **Expected session time:** 5–8 seconds. Language: positive, never punitive. No "Game Over."

#### Chapter Complete Screen
- **lifecycle_phase:** OUTCOME
- **Purpose:** Deliver the chapter reward — haunted location "solved," Scooby happy.
- **Player sees:** Full-screen reveal of the chapter's haunted location with a cartoon "Mystery Solved!" banner; Scooby and the gang in a celebratory illustration; "Continue" button.
- **Player does:** Tap "Continue."
- **What happens next:** Chapter Start Interstitial for the next chapter.
- **Expected session time:** 8–12 seconds.

### Board States

| State | Input allowed? | Description |
|-------|---------------|-------------|
| `IDLE` | Yes | Board is stable, waiting for player tap |
| `ANIMATING` | Queued (max 1) | Pop/cascade/refill animation in progress |
| `WIN` | No | Win condition just met; win sequence begins |
| `LOST` | No | Tap budget exhausted; loss sequence begins |
| `PAUSED` | No (game input) | Settings/pause overlay active |

Any transition that mutates bubble positions (cascade, refill, special pop radius) is animated — no instant state changes. Cascade animation: 200ms fall + 80ms settle per row. Refill wave: 300ms float-in staggered by 200ms per column.

### Win Condition

**Rule:** `IF poppedBubbles >= winThreshold AND tapsUsed <= tapBudget THEN winCondition = true`

`winThreshold` defaults to 80% of starting bubble count. Levels may specify a higher threshold (up to 100%) via level data.

### Lose Condition

**Rule:** `IF tapsUsed >= tapBudget AND poppedBubbles < winThreshold THEN loseCondition = true`

Checked after every resolved tap action (once animation completes).

### Win Sequence (ordered)

1. Board state transitions to `WIN` — input disabled.
2. Remaining bubbles on the canvas play a celebratory "bounce" animation (100ms stagger, 300ms each).
3. Scooby runs across the companion strip doing a victory dance (600ms animation, looped until next screen).
4. Score pop-in animation plays on HUD (200ms per digit, upward count).
5. Star rating revealed with a staggered pop (3×150ms).
6. "Next Level" button fades in (300ms).
7. Player taps "Next Level" → transition to next screen.

### Loss Sequence (ordered)

1. Last tap resolves (animation completes).
2. Board state transitions to `LOST` — input disabled.
3. Remaining bubbles deflate with a slow sag animation (400ms, all at once).
4. Scooby displays a "Ruh-roh!" speech bubble animation (500ms).
5. Score tally fades in (300ms).
6. "Try Again" and "Continue with Snacks" buttons slide up from bottom (400ms).
7. Player chooses an action → transition to next screen.
