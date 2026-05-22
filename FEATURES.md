# CS2 Case Opener — Feature Roadmap

New features to add and existing features to deepen. Separate from [RECOMMENDATIONS.md](RECOMMENDATIONS.md), which tracks cleanup/optimization work — this doc is about **product**.

Each entry includes:
- **What** — the user-visible feature.
- **Why** — the problem it solves or the loop it strengthens.
- **How** — files to touch, sketch of approach.
- **Effort** — S (≤1 session), M (1–2 sessions), L (multi-session).

---

## Tier 1 — Core loop deepeners

These tighten the existing open-case-→-sell loop, which is currently the only loop. Highest value-per-effort.

### F1. ~~Showcase modal — click an inventory item to inspect it~~ ✅

> Note: a Three.js 3D viewer was prototyped but rolled back. Genuine 3D requires per-weapon `.glb` models, and the only quality source for those is Valve's own game files (not redistributable). Until a licensed asset pack is sourced, the showcase shows the static 2D skin image. The full WebGL viewer code can be reinstated from git history when models are available.

**What.** Clicking any inventory card opens a focused modal with the skin big, all stats (weapon, finish, wear, float, seed, StatTrak count, opened-date, case it came from), sale price, and Sell button.

**Why.** Right now clicking an inventory card just fires a toast with the name. Players want to **show off** drops — that's half the appeal of CS2 cases. A proper inspect view also makes selling a confirmed action instead of a one-click slip.

**How.**
1. New `src/ui/showcaseModal.js`. Same shape as [resultModal.js](cs2-case-opener/src/ui/resultModal.js) (focus trap, ESC to close, big art, rarity banner).
2. Replace the `onSelect → showToast(name)` line in [main.js](cs2-case-opener/src/main.js) with `onSelect: (uid) => openShowcaseModal(item, { onSell, onClose })`.
3. Add a "Copy share text" button that copies `"Just unboxed AK-47 | Inheritance (Field-Tested) from Kilowatt Case for €X.XX!"` to clipboard.

### F2. Live drop ticker ⏵ S

**What.** Thin horizontal strip near the top of the page showing the last 15 opens scrolling slowly left. Each pill: small skin icon + name + €price, color-coded by rarity. New drop slides in from the right.

**Why.** Makes the page feel alive even when idle. Free win because the history store ([store/history.js](cs2-case-opener/src/store/history.js)) already records every open.

**How.**
1. New `src/ui/dropTicker.js`. Reads `getRecent(15)` on mount, listens for `history:changed`, prepends a new pill with a CSS slide-in.
2. Mount it in [index.html](cs2-case-opener/index.html) just above the case grid.
3. CSS: `overflow: hidden` strip, `position: relative` pills with `transform: translateX(...)`, ~80s linear infinite scroll. New pill animates from the right and pushes the oldest off the left.

### F3. Wear-aware float pricing ⏵ M

**What.** A Factory New AK Inheritance sells for substantially more than a Battle-Scarred one. Right now the median across all wears is used regardless of which wear was actually rolled.

**Why.** Closes the gap between "this is a case-opener simulator" and "this *feels* like CS2." Wear quality is the second pull (rarity is the first); pricing should reflect it.

**How.**
1. Update [tools/sync-prices.js](cs2-case-opener/cs2-case-opener/tools/sync-prices.js) so the generated map keys on `marketHashName` (already does) but stores **per-wear arrays** instead of a single median:
   ```js
   "AK-47 | Inheritance": { fn: 199, mw: 70, ft: 47.95, ww: 30, bs: 25 }
   ```
2. New helper `priceForWear(itemName, wear)` in `src/data/cases.js` or a fresh `src/data/pricing.js`. Falls back to the median if a wear is unpriced (some skins skip wears).
3. `convertItem()` now stores a `priceByWear` map on the item; `basePrice` becomes a function of wear at sell time.
4. Result modal + inventory card show the actual wear-adjusted price.

### F4. Inventory pagination / virtualization ⏵ S

**What.** When inventory hits 100+ items the grid gets sluggish.

**Why.** A heavy spender will fill it fast (currently capped at 500). Even at 100, the search-and-render cycle on each keystroke does 100 image-loading DOM nodes. Easy fix.

**How.**
1. In [src/ui/inventory.js](cs2-case-opener/src/ui/inventory.js), only render the first 60 cards; show a "Show all (N more)" button at the bottom.
2. Or: use `IntersectionObserver` to swap in real `<img>` when the placeholder card scrolls into view.

### F5. Audio polish — actual sounds wired up ⏵ S

**What.** [sound.js](cs2-case-opener/src/utils/sound.js) plays files like `reveal.mp3`, `tick.mp3`, `legendary.mp3` from `/public/assets/sounds/` — but most call sites only fire `play('reveal')`. The reel should tick rapidly as items pass, the rarity should drive which reveal sound plays, and there should be a wallet `coins` jingle on Sell.

**Why.** Sound is half of the dopamine in case opening. Currently the experience is silent except for one reveal SFX.

**How.**
1. In [spinner.js](cs2-case-opener/src/ui/spinner.js): during the animation, set up a `setInterval` that fires `play('tick')` accelerating as the reel slows. Stop when it lands.
2. In `main.js`, `play(result.statTrak ? 'legendary' : result.item.rarity === 'covert' ? 'rare' : 'reveal')` is already there — refine the mapping per rarity.
3. On Sell, `play('coins')`.
4. Make sure assets exist — if `/public/assets/sounds/` is empty or has 404s, add a tiny `<audio>`-element fallback or generate a procedural blip via Web Audio (skip the file).

---

## Tier 2 — Progression hooks

### F6. Achievements / badges system ⏵ M

**What.** Persistent badges (icon + title + description) earned by milestones: "First Knife" (unbox an extraordinary), "Pink Hunter" (10 Classifieds), "Big Spender" (€500 cumulative spent), "Lucky Streak" (Covert within 3 opens of a Covert).

**Why.** Missions ([store/progression.js](cs2-case-opener/src/store/progression.js)) are *rotating* one-time goals. Achievements are *permanent* and act as long-tail goals that survive after every mission is done. They also drive bragging rights.

**How.**
1. New `src/data/achievements.js` — table of `{ id, title, description, icon, predicate(state) → bool }`.
2. New `src/store/achievements.js` — tracks `unlockedAt[id]: timestamp`. Listens for `case:opened`, `inventory:changed`, `wallet:changed` and re-evaluates predicates against current state.
3. New panel in the inventory window: "Achievements (N/M unlocked)" with locked badges greyed.
4. Toast on first unlock: "🏆 Achievement unlocked: First Knife".

### F7. Stats dashboard ⏵ M

**What.** A new "Stats" tab in the inventory window: total cases opened, total spent, total earned, profit/loss, best drop ever, drop distribution chart (bars by rarity), top 5 most-opened cases, longest streak between Coverts.

**Why.** Numbers are *the* CS2 case-opening pastime. Reddit is full of "100 cases opened, here's what I got" posts. Make that automatic.

**How.**
1. Most of this is computable from [store/history.js](cs2-case-opener/src/store/history.js) + [store/wallet.js](cs2-case-opener/src/store/wallet.js) history.
2. New `src/ui/statsPanel.js` — reads both stores, computes aggregates, renders a compact dashboard.
3. Distribution chart: pure CSS bar chart (no Chart.js needed for 5 bars). Each bar height = `count[rarity] / total * 100%`.

### F8. Daily missions rotation ⏵ S

**What.** Current missions are static templates that cycle when all three complete. Add a daily rotation: each day at 00:00 UTC, missions reset to a different random combination from a pool of 15 templates.

**Why.** Gives players a reason to come back tomorrow. Missions feel fresher if they vary.

**How.**
1. Expand `MISSION_TEMPLATES` in [progression.js](cs2-case-opener/src/store/progression.js) to ~15 entries (e.g. "open a Recoil case", "get 3 StatTrak drops", "sell 5 items", "open at any cost").
2. Seed today's selection from a `seededRandom(dateKey)` so all clients see the same daily missions if you ever add multiplayer leaderboards.
3. On `getMissions()`, if `state.missionsDate !== todayKey()`, reroll.


---

---

## Tier 4 — New game modes


### F14. Souvenir / Mystery cases ⏵ S

**What.** A "Mystery Case" tile in the grid that costs more (€5) and randomly picks one of the 8 real cases to open from. Higher variance = higher expected value.

**Why.** Adds gambling-y depth without new art. Trivial extension of existing logic.

**How.**
1. In [cases.js](cs2-case-opener/src/data/cases.js), expose a synthetic case `{ id: 'mystery', name: 'Mystery Case', keyPrice: 5, isMystery: true }`.
2. In `openCase(caseId)` ([engine/caseEngine.js](cs2-case-opener/src/engine/caseEngine.js)), if the case has `isMystery`, pick a random real case first and delegate.
3. Spinner shows the picked case's name flashing for a half-second before the reel starts ("Selected: Kilowatt Case…").

### F15. Trade-up odds preview ⏵ S

**What.** When picking 10 items in [tradeUpModal.js](cs2-case-opener/src/ui/tradeUpModal.js), show a live "Possible outputs" panel: list of the next-tier skins the trade-up could produce, with implied probability based on case-origin weights.

**Why.** Right now trade-up is a black box. Real trade-ups in CS2 are heavily theorycrafted around which Restricted inputs maximize Classified value. Surface that.

**How.**
1. The [tradeup.js](cs2-case-opener/src/engine/tradeup.js) algorithm already weights candidates by `caseName`. Expose a preview function `previewTradeUp(items) → [{ item, probability }]`.
2. Render in a sidebar column in the trade-up modal, updating live as items are toggled.

## Suggested execution order

If I were picking, in priority of **ROI per hour**:

1. **F1** (showcase modal) — 1–2 hrs, immediately better UX.
2. **F2** (live drop ticker) — 1 hr, makes the page feel alive.
3. **F5** (audio polish) — 1 hr, completely changes the *feel*.
4. **F7** (stats dashboard) — 2 hrs, data already exists.
5. **F6** (achievements) — half a session, unlocks long-tail goals.
6. **F3** (per-wear pricing) — half a session, big realism win.
7. **F14** (mystery case) — 30 min, nearly free.
8. **F8** (daily mission rotation) — 30 min.
9. **F15** (trade-up odds preview) — 1 hr.
10. **F4** (inventory virtualization) — only when inventory size becomes a problem.

Anything in Tier 3 / Tier 5 with **L** effort should wait until backend work (RECOMMENDATIONS #21) is in motion — they all depend on a server.
