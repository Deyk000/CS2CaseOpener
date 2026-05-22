S# CS2 Case Opener — Professional-Grade Blueprint

This document describes everything a **fully realized, commercial-grade CS2 case opener** would have, organized by domain. Each entry includes:

- **What** — the feature, in plain language.
- **Why** — what problem it solves or what loop it strengthens.
- **How** — a concrete implementation sketch a future session can execute against.

Treat it as the long-term north star. [FEATURES.md](FEATURES.md) and [RECOMMENDATIONS.md](RECOMMENDATIONS.md) hold the near-term backlog; this doc is the *ideal end state*.

Status legend:

- ✅ **Done** — already shipped in this repo.
- 🟡 **Partial** — basic version exists, can be deepened.
- ⏳ **Not started** — fully open.

---

## Table of contents

1. [Core gameplay & opening loop](#1-core-gameplay--opening-loop)
2. [Game modes](#2-game-modes)
3. [Economy & monetization](#3-economy--monetization)
4. [Inventory & item systems](#4-inventory--item-systems)
5. [Progression & retention](#5-progression--retention)
6. [Social & community](#6-social--community)
7. [Trust & provable fairness](#7-trust--provable-fairness)
8. [UI / UX polish](#8-ui--ux-polish)
9. [Audio & feel](#9-audio--feel)
10. [Mobile & cross-platform](#10-mobile--cross-platform)
11. [Accessibility](#11-accessibility)
12. [Backend architecture](#12-backend-architecture)
13. [Performance & engineering quality](#13-performance--engineering-quality)
14. [Analytics & business intelligence](#14-analytics--business-intelligence)
15. [Localization & internationalization](#15-localization--internationalization)
16. [Anti-fraud, abuse, and responsible play](#16-anti-fraud-abuse-and-responsible-play)
17. [Legal & compliance](#17-legal--compliance)
18. [Marketing & user acquisition](#18-marketing--user-acquisition)
19. [Customer support & ops](#19-customer-support--ops)
20. [Live operations](#20-live-operations)

---

## 1. Core gameplay & opening loop

### 1.1 Roulette spinner with accurate landing ✅

**What.** The case opens by scrolling a horizontal reel of skins past a fixed indicator. The reel decelerates and lands on the won item.

**Why.** This is the entire emotional payload of case opening. Get it wrong (wrong item under the indicator, jerky animation, misaligned) and the rest of the product doesn't matter.

**How.**
- Build the reel as a `<div>` of skin cards laid out by flexbox, inside an `overflow: hidden` container with a fixed center indicator.
- Pre-compute the winner index, then on animation start measure the **actual** DOM rect of the winning element and the indicator. Animate `transform: translateX(...)` so their centers line up exactly. Don't rely on `index * cardWidth` math — it drifts with gaps/padding.
- Wait for the winning card's image to finish loading before measuring (DOM rects can shift after image layout).
- Use `cubic-bezier(0.08, 0.82, 0.14, 1)` or similar for a fast-then-slow decel curve over ~7s.
- Add a tiny random jitter (±35% of slot width) so it never lands dead-center mechanically.

### 1.2 Visual filler weighting ✅

**What.** During the spin, mostly blues and purples whiz by, with the occasional pink/red, mirroring how CS2 looks in-game.

**Why.** Without bias, every spin shows the same flat distribution and feels uniformly low-stakes.

**How.** Cosmetic only — does not affect drop odds. In `pickFillers()` weight by rarity: Mil-Spec 50, Restricted 28, Classified 8, Covert 2, Special 1. Keep RNG honest in `engine/rng.js`.

### 1.3 Drop-rate config ✅

**What.** Each rarity has a documented drop weight (Mil-Spec 79.92%, Restricted 15.98%, Classified 3.20%, Covert 0.64%, Special 0.26%).

**Why.** Players who care about odds want to see them. Regulators may require disclosure.

**How.** Single source of truth in `data/rarityConfig.js`. Publish on an `/odds` page sourced from the same config.

### 1.4 Result reveal modal ✅

**What.** After the spin, a modal shows the won item large with rarity banner, wear, float, seed, and Keep / Sell actions.

**Why.** Players need a moment to absorb the result — and a clear decision point.

**How.** See [src/ui/resultModal.js](cs2-case-opener/src/ui/resultModal.js). Must be non-dismissible (no Escape, no backdrop click) until the player chooses Keep or Sell, otherwise edge-case bugs can drop items into the void.

### 1.5 Case price + balance gating ✅

**What.** Each case costs the player money to open (real CS2 keys are €2.49). Insufficient balance blocks the open.

**Why.** Without a cost the wallet and selling are pointless. Cost gives every drop weight.

**How.** `keyPrice` lives on the case object in `data/cases.js`. `spend(price, 'open_case')` in [wallet.js](cs2-case-opener/src/store/wallet.js) before opening. Open button displays `Open Case · €2.49` or disabled `Need €X.XX`.

### 1.6 Wear-aware pricing ⏳

**What.** Factory New AKs sell for several times more than Battle-Scarred ones. Per-wear pricing reflects that.

**Why.** Closes the gap between "this is a simulator" and "this *feels* like CS2." Wear is the second pull after rarity.

**How.**
1. Update [tools/sync-prices.js](cs2-case-opener/cs2-case-opener/tools/sync-prices.js) to record per-wear prices from Skinport instead of a single median:
   ```js
   "AK-47 | Inheritance": { fn: 199, mw: 70, ft: 47.95, ww: 30, bs: 25 }
   ```
2. Generate `src/data/prices.generated.js` with the new shape.
3. New helper `priceForWear(itemName, wear)` in `src/data/pricing.js`.
4. Sale price at the moment of opening uses the actual wear that was rolled.

### 1.7 StatTrak™ counter ✅

**What.** Items dropped with the StatTrak™ tag accumulate a kill counter that ticks up the more you "use" them.

**Why.** StatTrak is iconic CS2 flavor. Without the counter, it's just a label.

**How.** Currently every owned ST copy increments together on every subsequent open of the same skin. The deeper version (#15 in FEATURES.md): introduce an equipped-loadout concept and only the equipped copy ticks.

### 1.8 Souvenir & special drops ⏳

**What.** Real CS2 has Souvenir versions (golden text, sticker overlays, tied to tournament drops) and rare special items. Add a probability-gated chance for a souvenir variant on any drop.

**Why.** Layered rarity within rarity — the kind of detail diehards notice.

**How.** Roll a second weight pass after rarity is picked (~0.1% souvenir chance). Souvenir items get a CSS overlay tag, distinct price multiplier, sticker slots.

---

## 2. Game modes

### 2.1 Standard case opening ✅

The core mode shipped here.

### 2.2 Trade-Up Contract ✅

10 same-rarity items → 1 of the next tier. See [tradeUpPanel.js](cs2-case-opener/src/ui/tradeUpPanel.js). Already includes per-case-weighted output preview and expected-value calculator. Knife/glove same-tier forge added as a re-roll mode.

### 2.3 Mystery / random-case mode ⏳

**What.** A "Mystery Case" tile (priced higher, €5) randomly picks one of the 8 real cases to open from. Higher variance → higher expected value.

**Why.** Gambling depth without new art. Trivial extension.

**How.** Synthetic case in `data/cases.js` with `{ id: 'mystery', isMystery: true }`. In `openCase`, if `isMystery`, pick a random real case first and delegate to its drop pool.

### 2.4 Custom case builder ⏳

**What.** Sandbox where players pick any skins, set their own drop weights, name and price the case, then open it.

**Why.** Power-user feature; speedrunners and theorycrafters love it.

**How.** New `src/ui/caseBuilder.js`. Persist to `localStorage.cs2_custom_cases`. Reuse the standard open flow with the custom case object.

### 2.5 PvP "open race" mode ⏳

**What.** Two users open the same case simultaneously, higher-rarity drop wins. Buy-in pot split 80/20 with the house.

**Why.** This is how every real CS2 gambling site keeps players. Server-deterministic RNG seed makes it provably fair.

**How.** WebSocket lobby system. Server posts the seed before either client starts spinning. Both clients render the same outcome. Major backend work.

### 2.6 Battle-royale / crash mode ⏳

**What.** A multiplier curve climbs from 1.00× upward and randomly "crashes" at some point. Players cash out before it crashes to keep their multiplied stake.

**Why.** Hyper-engaging and well-understood by the gambling-game audience. Pairs naturally with skin-as-currency.

**How.** Server publishes a fair seed for the crash point. Client renders a rising curve. Each player picks a cash-out point in real time. Major backend work.

### 2.7 Skin marketplace simulation ⏳

**What.** A market UI where players list items at custom prices and other players or NPCs buy them.

**Why.** Adds an economic strategy layer on top of pure opening.

**How.** Inventory already has `listOnMarket()` / `delistFromMarket()` stubs. Build the marketplace UI on top. NPC behavior: cron job that takes random listings priced below CSGOTrader median.

### 2.8 Daily contracts / weekly missions 🟡

**What.** Rotating goals like "open 5 cases", "unbox a Classified", "open 3 different cases", plus seasonal/weekly ones.

**Why.** Reasons to come back tomorrow.

**How.** Currently uses 3 static template missions; expand the template pool to ~15+ and reroll daily based on a date-seeded RNG so all clients see the same selection.

---

## 3. Economy & monetization

### 3.1 Real-currency wallet 🟡

**What.** Players deposit real money (via Stripe/PayPal/crypto) that's converted to in-app balance.

**Why.** Without this, "professional" is a stretch — every commercial competitor sells the gameplay loop.

**How.**
- Choose a payment processor: Stripe (cards), Coinbase Commerce or NOWPayments (crypto). PayPal explicitly bans gambling-adjacent products in many regions.
- Server-side webhooks credit balance only after the gateway confirms.
- Display deposit history in a wallet panel.

### 3.2 Currency packs with bonuses ⏳

**What.** Tiered packages: €5 → 500 coins, €20 → 2200 coins (+10%), €100 → 12000 coins (+20%).

**Why.** Standard psychology to push larger deposits.

**How.** Already stubbed in [economy.js](cs2-case-opener/src/data/economy.js) `COIN_PACKAGES`. Wire to the payment processor.

### 3.3 Withdrawal ⏳

**What.** Cash out in-app balance to skins (real CS2 trade-bot integration) or to fiat (regulated, harder).

**Why.** Without withdrawal it's a sim, not a gambling site. With withdrawal you're suddenly subject to gambling licensing.

**How.**
- **Skin payout**: integrate with SteamBot / steam-tradeoffer-manager. Hold a bot account inventory. Atomic in DB: deduct balance + initiate trade, refund balance if the trade fails.
- **Fiat payout**: requires real gambling licensing. Don't ship without legal counsel.

### 3.4 Sell-to-bot pricing 🟡

**What.** Every dropped item has a sell price the user can take instantly without listing on a marketplace.

**Why.** Reduces friction, drives the engagement loop.

**How.** Currently `computeSalePrice(basePrice)` applies a flat 15% tax. Deepen: vary tax by liquidity, price by wear (see 1.6).

### 3.5 Daily login reward + streak bonus ✅

See [progressPanel.js](cs2-case-opener/src/ui/progressPanel.js) for the 7-day streak strip and tomorrow-bonus preview.

### 3.6 Referral economy ⏳

**What.** Each user gets a referral link; new users sign up through it, both get a bonus when the referee makes their first deposit.

**Why.** Cheapest user acquisition channel. Every commercial gambling site has this.

**How.**
- `users.referred_by` column.
- `/r/<code>` route sets a cookie; signup reads it.
- Bonus credit when the new user's first transaction clears.

### 3.7 VIP tiers / loyalty program ⏳

**What.** Spend thresholds unlock tiers (Bronze/Silver/Gold/Diamond) with perks: lower sell tax, exclusive cases, faster withdrawal, dedicated support.

**Why.** Whales need a reason to keep depositing at scale. Per-tier perks make them feel rewarded.

**How.** `users.lifetime_spent` aggregated server-side. UI panel showing progress to next tier. Apply tier-based modifiers in pricing / fee logic.

### 3.8 Rakeback / cashback ⏳

**What.** A percentage of total losses is returned weekly as bonus balance.

**Why.** Industry-standard retention lever.

**How.** Cron job: sum losses (`open_case` - `instant_sell` - `inventory_sale`) over the rolling week, credit a configurable % back to each user.

---

## 4. Inventory & item systems

### 4.1 Persistent inventory ✅

[store/inventory.js](cs2-case-opener/src/store/inventory.js) with localStorage backing. 500-item cap. Migrate to server when backend lands.

### 4.2 Inventory cards with image + price + sell button ✅

See [ui/inventory.js](cs2-case-opener/src/ui/inventory.js).

### 4.3 Sort + filter + search ✅

Sort by recent / rarity / value / name / float. Filter by rarity chip strip. Free-text search by weapon/finish/name.

### 4.4 Inspect / showcase modal ✅

Click any item → focused modal with full stats, sell, copy-share-text. See [showcaseModal.js](cs2-case-opener/src/ui/showcaseModal.js).

### 4.5 3D weapon viewer ⏳

**What.** The showcase modal renders the actual 3D model with mouse-rotate + scroll-zoom, like CS2's in-game inspect view.

**Why.** Half the joy of unboxing is rotating the skin to see the finish from every angle.

**How.**
- Use Three.js (~150 KB gzip, lazy-load only on first inspect).
- Need a `.glb` model per weapon class. **Do not extract from Valve's game files** — copyright risk. Either source a licensed paid pack (TurboSquid/CGTrader, $50-300) or commission custom CC0-by-AI models.
- Apply the skin's PNG as the texture map on a single material slot.
- Documentation already exists in repo's git history when this was prototyped — restore from there.

### 4.6 Inventory pagination / virtualization ⏳

**What.** Render only visible cards via `IntersectionObserver`; lazy-load images.

**Why.** At 500+ items the grid gets sluggish.

**How.** Wrap the inventory list in a windowing layer (`react-window` if React, or a hand-rolled IO version in vanilla).

### 4.7 Bulk operations ⏳

**What.** Multi-select to bulk-sell, bulk-list-on-market, bulk-trade-up.

**Why.** Heavy users with hundreds of cheap drops shouldn't click sell 200 times.

**How.** Toggle into a select mode; checkbox overlay on each card; bulk action bar at the bottom.

### 4.8 Equip / loadout system ⏳

**What.** One equipped weapon per slot (knife, gloves, primary, secondary). Show in header.

**Why.** Ties StatTrak counters to a specific item, mirroring CS2 ownership feel.

**How.** Add `state.loadout` to inventory store. On open of same `itemId`, only the equipped instance's StatTrak counter ticks.

### 4.9 Trade with other players ⏳

**What.** Send / receive skin trade offers; in-app accept/decline.

**Why.** Real economy, real social loop.

**How.** Backend transaction with optimistic locking. UI: trade offer modal with item slots on each side, value calculator, accept button.

### 4.10 Stickers and souvenirs ⏳

**What.** Items can have sticker slots and souvenir variants with overlays.

**Why.** CS2-authentic flavor; collectors will pay extra.

**How.** Store `stickers: [{ id, position }]` on inventory item. Render with CSS overlay on the card. Generate sticker SVGs from ByMykel API data.

---

## 5. Progression & retention

### 5.1 XP + levels ✅

50 XP per case opened. Level = floor(xp/500) + 1. See [progression.js](cs2-case-opener/src/store/progression.js).

### 5.2 Level rewards / battle pass ✅

Milestone payouts at levels 2/3/5/7/10/15/20/25/30, ranging €1 → €100. Next-milestone preview in the progress panel.

### 5.3 Achievements / permanent badges ⏳

**What.** "First Knife", "Pink Hunter (10 Classifieds)", "Big Spender (€500)", "Lucky Streak (Covert within 3 opens of a Covert)".

**Why.** Long-tail goals that survive after every rotating mission is done. Drive bragging rights.

**How.** New `src/data/achievements.js` table of `{ id, title, description, icon, predicate(state) → bool }`. New `src/store/achievements.js` listens for `case:opened`, `inventory:changed`, `wallet:changed` and re-evaluates predicates. Toast on first unlock.

### 5.4 Stats dashboard ⏳

**What.** Total opened, total spent, P/L, drop distribution chart, best drop, top cases, longest dry streak.

**Why.** Numbers are the primary CS2 case-opening pastime.

**How.** Most stats are computable from [history.js](cs2-case-opener/src/store/history.js) and the wallet history. New `src/ui/statsPanel.js` computes aggregates. Pure CSS bar chart for distribution (no Chart.js needed for 5 bars).

### 5.5 Open history ✅

100-entry ring buffer in [history.js](cs2-case-opener/src/store/history.js). `getBestDrop()` helper for the header's "Best (7d)" stat.

### 5.6 Push / email re-engagement ⏳

**What.** "You haven't opened a case in 3 days — here's a free Mil-Spec on us." Email or web push.

**Why.** Drives back lapsed users at ~10× the cost-effectiveness of paid ads.

**How.** Cron job over `users.last_active_at` < 3 days. Send via Postmark / SendGrid / OneSignal. Honor unsubscribe + GDPR.

### 5.7 Limited-time events ⏳

**What.** Halloween Case for 2 weeks, double-XP weekends, seasonal missions.

**Why.** Calendar-driven engagement loops. Live ops gold.

**How.** `events` config table with `{ id, starts_at, ends_at, payload }`. Client checks active events on load; renders themed UI; missions tagged with `event_id` only appear during the window.

---

## 6. Social & community

### 6.1 User profiles ⏳

**What.** Public read-only profile URL per user: avatar, stats, recent best drops, achievements.

**Why.** Identity → ownership → flex → social proof.

**How.** `/u/<username>` route; loads from a public-read DB view; cache with a 60s TTL.

### 6.2 Friends list ⏳

**What.** Add/remove friends, see who's online, recent drops feed from friends.

**Why.** Friction multiplier — playing because friends are playing.

**How.** `friendships` table with bidirectional records. Realtime presence via WebSocket. Friends-only drop ticker variant.

### 6.3 Gift cases ⏳

**What.** Send a case open to another user; their wallet absorbs the cost or it's a paid gift.

**Why.** Engagement loops between users.

**How.** New table: `gifts`. Atomic transaction server-side. UI: "Send to..." button on case cards.

### 6.4 Inventory snapshot share ⏳

**What.** Share URL of your inventory at a point in time.

**Why.** Most-requested feature on any case-opener.

**How.** Cloudflare Worker + KV with 30-day TTL. Serialize inventory + stats → short URL token → store → return URL. Read-only view reuses the inventory UI in display mode.

### 6.5 Global leaderboards ⏳

**What.** Top 100 by inventory value / best drop / cases opened / current streak.

**Why.** Comparative goals.

**How.** Aggregate stats updated server-side; client polls or WebSocket-streams top 100. 60s cache.

### 6.6 Drop ticker ⏳

**What.** Live scrolling strip at the top of the page showing the last 15 opens app-wide.

**Why.** Site feels alive even when individual users idle.

**How.** WebSocket broadcasts on every successful open. Client renders pills with skin thumbnail + rarity color + €value. New pill slides in from the right.

### 6.7 Chat / community rooms ⏳

**What.** Per-case or per-language chat room. Moderation tools.

**Why.** Sticky community. Discord links cost you them; in-app chat keeps them.

**How.** WebSocket pub-sub. Per-message moderation queue. Slow-mode and rate limits. Profanity filter (industry standard library).

### 6.8 Streamer integrations ⏳

**What.** Twitch overlay extension that shows a streamer's live case openings; viewers cheer to fund free opens.

**Why.** Twitch is where this category's marketing happens.

**How.** Twitch Extension API + their auth flow. Stream-deck-like control panel for the streamer.

---

## 7. Trust & provable fairness

### 7.1 Provably-fair RNG ⏳

**What.** Every drop result can be verified to have not been tampered with. Industry standard for crypto-adjacent gambling.

**Why.** Trust is the #1 currency in this category. Players assume the house cheats unless proven otherwise.

**How.**
- Before each open, the server commits to a **server seed** (publishes its SHA-256 hash up-front).
- Client provides a **client seed** + a nonce that increments per open.
- Result is computed as `HMAC_SHA256(server_seed, client_seed:nonce)` → mapped to the drop pool.
- After the user rotates their client seed, the old server seed is revealed; anyone can verify all past results were consistent with the committed hash.
- See [stake.com's docs](https://stake.com/provably-fair) as the canonical pattern.

### 7.2 Drop-odds transparency ✅

Drop rates live in a single config file ([rarityConfig.js](cs2-case-opener/src/data/rarityConfig.js)). Render them on a dedicated `/odds` page.

### 7.3 Public audit log ⏳

**What.** A page showing every open from the last 24h: timestamp, case, result rarity, seed, hash. Searchable.

**Why.** Lets any user spot-check the system is operating normally. Press / journalist proof.

**How.** Server-side append-only log table. Public read endpoint with rate limiting + pagination.

### 7.4 Independent RNG audits ⏳

**What.** Annual or semi-annual report from a recognized gambling auditor (eCOGRA, iTech Labs, GLI) confirming the RNG matches stated odds over X million spins.

**Why.** Required by most gambling licenses; major trust signal.

**How.** Hire the auditor; export the public audit log; they run statistical tests. Publish the resulting certificate on the `/about/fairness` page.

---

## 8. UI / UX polish

### 8.1 Case preview before opening ✅

The "Contains one of the following" grid before pressing Open. See [casePreview.js](cs2-case-opener/src/ui/casePreview.js).

### 8.2 Case grid with images + price chip ✅

Each case card shows the case image, skin count, and €key price.

### 8.3 Hover / focus polish ✅

Case cards lift on hover. Buttons get a cursor-tracked radial highlight. Press states have a sub-100ms feedback.

### 8.4 Modal entrance/exit animations ✅

`.app-window` and `.result-modal` fade in/out over 220 ms with the inner shell rising and scaling.

### 8.5 Tooltips on every non-obvious icon ⏳

**What.** StatTrak counter, rarity color codes, sell-tax explanation, float bar — all get hover tooltips.

**Why.** Reduces cognitive load and customer support volume.

**How.** Tiny `tooltip.js` helper: data-attribute → positioned `<div>` on hover/focus. Honor reduced-motion (no delay animation).

### 8.6 Empty-state designs ⏳

**What.** Inventory empty, no missions completed, no recent drops — each has a custom illustration and a call-to-action.

**Why.** Empty states are where users decide if the product feels alive or dead.

**How.** SVG illustrations from undraw.co or commissioned. Inline in [src/ui/inventory.js](cs2-case-opener/src/ui/inventory.js) and progress panel.

### 8.7 Skeleton loaders ⏳

**What.** While case/price data fetches, show shimmer placeholders matching the final card shape.

**Why.** Perceived performance — feels twice as fast as a spinner.

**How.** Pure CSS: animated background gradient on placeholder divs sized to match.

### 8.8 Dark / light theme support ⏳

**What.** OS-driven `prefers-color-scheme`; manual toggle in header.

**Why.** Some users browse in bright rooms; some accessibility audits require it.

**How.** Promote all colors to `:root` CSS vars. Define a `[data-theme="light"]` override block. Toggle persists to localStorage.

### 8.9 Confetti / particle effects on big drops ⏳

**What.** A Covert or Special drop triggers a brief confetti burst over the result modal.

**Why.** Dopamine amplifier — pairs with the audio sting.

**How.** Tiny canvas-based particle system (~5 KB), or `canvas-confetti` lib (~3 KB gzip). Disable for reduced-motion.

---

## 9. Audio & feel

### 9.1 Mute toggle + persistence ✅

Header button. Defaults muted on first visit (consent gate). Persists to localStorage.

### 9.2 Per-rarity reveal sound 🟡

`play('reveal' | 'rare' | 'legendary')` triggered on result. Sounds files exist in `public/assets/sounds/` but call sites only use one variant. Refine the mapping per rarity.

### 9.3 Reel ticking sound during spin ⏳

**What.** Rapid clicks as items pass the indicator, slowing with the reel.

**Why.** Sound is half of slot-machine dopamine.

**How.** In the spin loop, fire `play('tick')` at intervals derived from current reel velocity. Stop on landing.

### 9.4 Cash-register sound on Sell ⏳

**How.** `play('coins')` in the sell handler.

### 9.5 Background ambient track ⏳

**What.** Subtle looping ambient music. Off by default; toggleable.

**Why.** Sets mood, increases session length.

**How.** Lazy-load on first mute-off. Loop seamlessly.

### 9.6 Voice / SFX library ⏳

**What.** "Headshot!" or similar callouts on rare drops, matching CS2's audio identity.

**Why.** Genre flavor.

**How.** Commission / license a small SFX pack. Trigger by rarity tier.

---

## 10. Mobile & cross-platform

### 10.1 Responsive layout 🟡

Current desktop-first layout collapses on narrow viewports but is cramped on phones.

### 10.2 Mobile-first redesign ⏳

**What.** Bottom-sheet modals, swipe-to-open, tap-and-hold to inspect, larger touch targets.

**Why.** Mobile is 60%+ of casual gaming traffic.

**How.** Significant CSS work. Best done after the CSS split (RECOMMENDATIONS #16).

### 10.3 PWA install + offline shell ✅

Service worker caches the shell and images; install prompt available on supported browsers. See [public/sw.js](cs2-case-opener/public/sw.js) and `manifest.webmanifest`.

### 10.4 Native mobile apps ⏳

**What.** iOS + Android wrappers around the web app.

**Why.** App store presence is a discovery and trust channel. **But:** Apple's App Store rejects gambling-with-real-money apps unless they're licensed in the target jurisdiction. Android is more permissive.

**How.** Capacitor (web → native shell, ~1 week of work). Or React Native if rewriting core UI. Submit to TestFlight first.

### 10.5 Cross-device sync ⏳

**What.** Sign in on phone → see same inventory/balance as on desktop.

**Why.** Modern players expect this; localStorage alone is a dealbreaker.

**How.** Requires a backend (see §12). Auth establishes the user ID; all stores become thin server-sync layers.

---

## 11. Accessibility

### 11.1 Reduced-motion respect ✅

Global `@media (prefers-reduced-motion: reduce)` rule disables ambient animations. The spin animation runs at a shorter duration (1.2s) for these users so they still see the result.

### 11.2 Focus traps in modals ✅

Result modal, case window, inventory window, trade-up window all trap focus and restore on close. See [utils/focusTrap.js](cs2-case-opener/src/utils/focusTrap.js).

### 11.3 ARIA landmarks + labels 🟡

Result modal has `aria-labelledby` and `aria-describedby`. Other dialogs need the same treatment.

### 11.4 Keyboard-only navigation ⏳

**What.** Every action reachable with Tab/Enter/Escape. No mouse-only paths.

**Why.** Required by WCAG 2.1 AA, which most gambling regulators reference.

**How.** Audit every interactive element for `tabindex` and visible focus state. Add `Enter`/`Space` listeners to anything that's currently click-only.

### 11.5 Screen reader announcements ⏳

**What.** Drop results, balance changes, mission completions announced via `aria-live` regions.

**Why.** Blind users currently get nothing.

**How.** A `<div aria-live="polite">` mounted at app root. UI code posts message text to it after each major state change.

### 11.6 Color-contrast audit ⏳

**What.** All text/background combos pass WCAG AA (4.5:1) — currently gold-on-dark borderline in places.

**Why.** Required for compliance, helps low-vision users.

**How.** `npm run axe` script already exists. Run against a live server. Bump failing color pairs in `:root` vars.

### 11.7 Adjustable text size / high contrast mode ⏳

**What.** A11y settings panel with text-size slider and high-contrast toggle.

**Why.** Goes beyond WCAG defaults; older users benefit.

**How.** Apply via `[data-text-size]` and `[data-contrast]` attributes on `<html>`, with CSS variable overrides per setting.

---

## 12. Backend architecture

### 12.1 Authentication ⏳

**What.** Email/password + OAuth (Google, Steam, Discord). Account recovery flow.

**Why.** Required for cross-device sync, leaderboards, gifting, withdrawal.

**How.**
- **Supabase Auth** (cheap, batteries-included), or
- **Clerk** (richer UX, more expensive), or
- **NextAuth.js** if you go SSR with Next.
- Steam OpenID is essential for the audience but is its own integration.

### 12.2 Database schema ⏳

Tables, with foreign keys:

- `users` — id, email, username, avatar, balance_cents, level, xp, lifetime_spent_cents, referred_by, created_at, last_active_at.
- `user_seeds` — id, user_id, current_server_seed_hash, current_client_seed, nonce.
- `inventory_items` — id, user_id, item_id (FK), wear, float, stattrak, stattrak_count, opened_at, source (`case_open` / `trade_up` / `gift` / `trade`), source_ref.
- `opens` — id, user_id, case_id, result_item_id, server_seed (revealed), client_seed, nonce, created_at.
- `transactions` — id, user_id, kind (`deposit` / `withdraw` / `case_open` / `sell` / `mission_reward` / etc), amount_cents, balance_after_cents, created_at, ref (FK).
- `missions` — id, user_id, type, target, progress, completed_at, expires_at, reward_cents, reward_xp.
- `achievements_unlocked` — id, user_id, achievement_id, unlocked_at.
- `friendships` — id, user_id, friend_id, accepted_at.
- `trades` — id, sender_id, receiver_id, status, items_offered (JSON), items_requested (JSON), created_at.
- `chat_messages` — id, room_id, user_id, body, created_at, moderation_status.
- `events` — id, slug, starts_at, ends_at, payload (JSON).

### 12.3 API layer ⏳

**How.** Stick to the existing event-driven client (`window.dispatchEvent('inventory:changed')`); each store becomes a thin server-sync layer keeping its same exported API. REST or RPC for explicit calls; WebSocket for real-time (drop ticker, presence, chat, PvP).

### 12.4 Backend choice ⏳

**Pick one:**

- **Supabase** — Postgres + Auth + Realtime + Storage in one. Fastest path. Recommended for solo/small team.
- **PocketBase** — single Go binary, self-hosted, similar feature set. Cheaper at scale.
- **Custom Node/TS + Postgres + Redis** — most flexible, most ops work.
- **Firebase** — possible but expensive at gambling-app scale (read-heavy patterns + chat).

### 12.5 Caching ⏳

**What.** Hot paths (case data, prices, leaderboards) served from cache.

**Why.** Reduces DB load 100×.

**How.** Redis or Cloudflare KV. Cache invalidation on writes (event-driven). 60s TTL on leaderboards; permanent on case data with version-bumped cache keys on each `npm run sync:api`.

### 12.6 Background jobs ⏳

**What.** Daily mission reroll, price refresh, weekly rakeback payouts, lapsed-user re-engagement, leaderboard recompute.

**How.** Cron-style jobs. If on Supabase: pg_cron or scheduled Edge Functions. If self-hosted: bullmq or simple cron + script.

### 12.7 Real-time events ⏳

**How.** Supabase Realtime / Pusher / Ably / self-hosted Socket.IO. Use for drop ticker, chat, presence, PvP lobby.

---

## 13. Performance & engineering quality

### 13.1 Bundle size budget ✅

Current: JS 20.78 KB gzip · CSS 6.44 KB gzip · HTML 1.78 KB gzip. Set a budget: **fail CI if main JS chunk exceeds 35 KB gzip**.

### 13.2 Lazy loading of heavy chunks 🟡

PWA service worker caches everything for repeat visits. Three.js (when added back) should be lazy-loaded on first inspect, not in the main bundle.

### 13.3 Image optimization ⏳

**What.** Serve skin PNGs as WebP/AVIF; size variants for grid (small) vs showcase (large).

**Why.** Saves 50%+ on bandwidth.

**How.** During `sync-from-api.js`, convert downloaded PNGs to WebP via `sharp`. Generate multiple sizes. Use `<picture>` with srcset.

### 13.4 Code splitting per route ⏳

**What.** Inventory window, trade-up window, stats panel each lazy-loaded.

**Why.** Smaller initial bundle → faster Time to Interactive.

**How.** Dynamic `import()` already used for showcase 3D viewer. Apply same pattern to other modals.

### 13.5 Test suite 🟡

**What.** Unit tests for RNG, sale price math, mission tracking, history ring buffer. UI tests via Playwright (already a devDep).

**Why.** Drop logic and sell-price math are silent-regression hotspots.

**How.** Vitest already runs 30 tests covering critical paths. Add:
- Per-store integration tests
- Playwright end-to-end: open case → keep → see in inventory → sell → balance matches
- Snapshot tests for key UI states

### 13.6 CI/CD pipeline ✅

Lint + build + audit on PRs ([ci.yml](.github/workflows/ci.yml)). Nightly sync auto-PRs price/data updates ([sync.yml](.github/workflows/sync.yml)).

### 13.7 Observability ⏳

**What.** Errors → Sentry. Performance → Web Vitals to PostHog or similar. Backend metrics → Grafana.

**Why.** You can't fix what you can't see. A 5% open-flow failure rate would be invisible without this.

**How.** Sentry browser SDK (~30 KB gzip, lazy-load). Server-side: OpenTelemetry → vendor of choice.

### 13.8 Feature flags ⏳

**What.** Ability to enable/disable features per user segment without deploying.

**Why.** Safer rollouts; A/B testing economy tweaks.

**How.** GrowthBook (open source) or LaunchDarkly (paid). Wrap each major feature in `if (flag('new_trade_up_v2')) { ... }`.

---

## 14. Analytics & business intelligence

### 14.1 Product analytics ⏳

**What.** Funnel from landing → first open → first deposit → repeat. Cohort retention. Per-feature engagement.

**Why.** You ship the wrong thing if you can't measure what's working.

**How.** PostHog (free tier generous, self-hostable) or Mixpanel. Track events: `case_opened`, `item_sold`, `trade_up_completed`, `deposit_initiated`, `deposit_succeeded`, `withdrawal_requested`.

### 14.2 Business metrics dashboard ⏳

**What.** Daily revenue, ARPU, retention curves, gross gaming revenue (GGR = bets - wins), house edge realization.

**Why.** Operating a gambling-adjacent business without these numbers is reckless.

**How.** Metabase or Grafana connected to read-replica DB. Pre-aggregated daily snapshot tables for speed.

### 14.3 A/B testing framework ⏳

**What.** Run experiments on UI variants (button copy, spin duration, price ladder).

**Why.** Compounding improvements; matches industry practice.

**How.** GrowthBook with statistical significance built in. Server-side variant assignment to ensure consistent user experience.

### 14.4 Player segmentation ⏳

**What.** Group users by behavior: never-deposited, low-spender, regular, whale, at-risk-of-churn. Target campaigns per segment.

**How.** Daily batch job computes segment per user, writes to `user_segments` table. Re-engagement and offers query by segment.

---

## 15. Localization & internationalization

### 15.1 String externalization ⏳

**What.** No literal strings in components; everything goes through `t('keys.like.this')`.

**Why.** First step toward i18n. Also enables A/B testing copy.

**How.** Adopt `i18next` or `lingui`. Keys in JSON per locale. Wrap every visible string.

### 15.2 Multi-language support ⏳

**What.** UI in English, Russian, German, French, Spanish, Portuguese, Polish, Turkish, Chinese — the typical CS2 player demographics.

**Why.** Each added language can 2× user base of that region.

**How.** Once strings externalized, ship per-locale JSON files. Lazy-load only the requested locale. Use `Intl.NumberFormat` and `Intl.DateTimeFormat` for currency/date display.

### 15.3 Currency per locale ⏳

**What.** EUR for EU, USD for US, RUB for RU, etc. Live FX conversion or per-locale price tables.

**Why.** Players want to see local money.

**How.** Use a daily FX feed (exchangerate.host, free). Cache server-side. Always store amounts in cents-of-the-base-currency; convert at display time.

### 15.4 Right-to-left support ⏳

**What.** Arabic and Hebrew locales need RTL layout.

**Why.** Otherwise the UI looks broken for ~5% of potential users.

**How.** Use CSS logical properties (`margin-inline-start` instead of `margin-left`). Audit with Chrome's RTL debugging tool.

---

## 16. Anti-fraud, abuse, and responsible play

### 16.1 Rate limiting ✅

[utils/rateLimiter.js](cs2-case-opener/src/utils/rateLimiter.js) — opens are rate-limited per session. Deepen with server-side limits per IP and per user.

### 16.2 Bot/automation detection ⏳

**What.** Detect headless browsers, abnormal click cadences, suspicious IP-to-account density.

**Why.** Bots farming bonuses ruin the economy.

**How.** Cloudflare Bot Management. Custom heuristics: time-between-opens distribution. Honeypot fields.

### 16.3 Multi-account / chargeback fraud detection ⏳

**What.** Same payment method funding multiple accounts, devices, or IPs.

**Why.** Refund fraud is the #1 cost center for online gambling.

**How.** Fingerprint (deviceFP via FingerprintJS), velocity rules per payment method, flag for manual review past thresholds.

### 16.4 Age verification / KYC ⏳

**What.** Verify users are over the legal age in their jurisdiction. For higher tiers, verify identity documents.

**Why.** Required by every gambling license; mandatory in many regions without one.

**How.** Sumsub, Onfido, or Veriff. Integrate the SDK for selfie + government ID upload.

### 16.5 Self-exclusion + cool-off ⏳

**What.** Users can self-exclude for a day, a week, a year, or permanently. Cool-off windows force a delay between large deposits.

**Why.** Required by EU and UK gambling regulators. Ethical baseline regardless.

**How.** `self_exclusions` table; check in auth middleware. UI panel under "Account → Responsible play."

### 16.6 Deposit limits ⏳

**What.** Daily / weekly / monthly self-imposed deposit caps. Cooling-off period required to raise limits.

**Why.** Regulatory + ethical.

**How.** `deposit_limits` table. Enforced server-side at the deposit endpoint.

### 16.7 Loss alerts ⏳

**What.** "You've lost €500 this week — take a break?" Modal triggered above thresholds.

**Why.** Demonstrably reduces problem-gambling escalation.

**How.** Aggregate loss per user per rolling 7d; trigger modal once per week per user.

### 16.8 Session length warnings ⏳

**What.** "You've been opening cases for 2 hours straight — keep going?"

**Why.** Reality check; required in some jurisdictions.

**How.** Track session start client-side; pop modal at 60min / 120min thresholds.

---

## 17. Legal & compliance

### 17.1 Terms of Service + Privacy Policy ⏳

**What.** Clear documents covering data use, GDPR/CCPA rights, age restrictions, dispute resolution, governing law.

**Why.** Legally required everywhere. Without it, payment processors and app stores will refuse you.

**How.** Hire a gambling-law attorney in your primary jurisdiction. Generic templates **will not** be sufficient for a gambling-adjacent product.

### 17.2 Gambling license ⏳

**What.** Operating license from a recognized regulator: Curaçao (cheap, fast), Malta (premium), Isle of Man, UK Gambling Commission.

**Why.** Without one, you're operating illegally in any region that classifies your product as gambling — which is most of them once skins-for-money is involved.

**How.** This is a 6-month + €50k+ process. Begin with Curaçao for an MVP license while pursuing Malta for credibility. Hire local counsel and a compliance officer.

### 17.3 Region blocking ⏳

**What.** US, UK without license, NL, FR, AU, KR, CN, restricted-list countries — all blocked.

**Why.** Without a license in those regions, allowing players from them is a criminal offense in some.

**How.** Geo-IP lookup (Cloudflare's `cf-ipcountry` header is free and reliable). Block at edge.

### 17.4 GDPR / CCPA compliance ⏳

**What.** Cookie consent, data export, data deletion, right to be forgotten, data processor agreements.

**Why.** Required by EU and California law.

**How.** Cookie banner via Cookiebot or self-built. Implement export and deletion endpoints. Sign DPAs with every third-party vendor.

### 17.5 Tax reporting ⏳

**What.** Issue 1099 / W-2G / equivalent to high-value winners. Withhold where required.

**Why.** Player obligations + your obligations.

**How.** Talk to a tax accountant. Most gambling sites use specialized software (Verisure, etc) for this.

### 17.6 AML (anti-money-laundering) ⏳

**What.** Monitor for structuring (lots of small deposits to avoid limits), suspicious withdrawal patterns. Report to financial intelligence units.

**Why.** Required by every banking partner you'll work with. Penalties for missing are severe.

**How.** Compliance platform (ComplyAdvantage, Chainalysis for crypto). Automated suspicious-activity reports.

---

## 18. Marketing & user acquisition

### 18.1 SEO landing pages ⏳

**What.** Per-case landing pages: "Open the Kilowatt Case — see odds, prices, possible drops." Index well.

**Why.** Long-tail organic traffic at near-zero cost.

**How.** Server-render or static-generate per-case pages with structured data (JSON-LD `Product` schema). Use Astro or Next.js.

### 18.2 Affiliate program ⏳

**What.** Content creators get a percentage of referred users' lifetime losses.

**Why.** Lowest CAC channel in the industry.

**How.** `affiliates` table; trackable links; monthly automated payout reports.

### 18.3 Twitch / YouTube influencer integrations ⏳

**What.** Sponsored unboxing streams, custom promo codes, integrated overlays.

**Why.** Single biggest user acquisition channel for this category.

**How.** Outreach by hand initially; promo-code system that tracks redemptions; dashboard for the influencer.

### 18.4 Free-case-for-signup ⏳

**What.** New users get one free case open (limited to a cheap case).

**Why.** Highest-converting onboarding hook.

**How.** First-open flag on user. Server enforces; UI shows "Free Case" banner.

### 18.5 Reactivation campaigns ⏳

**What.** Email/push to users who haven't opened a case in 7+ days with a free case or discount.

**Why.** Cheaper to bring back than to acquire.

**How.** Cron job + segmentation table from §14.4.

---

## 19. Customer support & ops

### 19.1 In-app support chat ⏳

**What.** Live chat widget in bottom-right.

**Why.** Reduces support load (deflects via FAQ) + saves payment issues that would otherwise be chargebacks.

**How.** Intercom (pricey) or Crisp (cheaper) or Chatwoot (self-hosted free). Connect a knowledge base for first-line deflection.

### 19.2 Help center / knowledge base ⏳

**What.** Articles: "How drops work", "How to deposit/withdraw", "What does StatTrak mean", etc.

**Why.** Deflects ~50% of support tickets.

**How.** Notion or HelpScout or self-hosted MDX site. SEO benefit too.

### 19.3 Admin panel ⏳

**What.** Internal tool for support agents: search users, view inventory, refund a case open, ban an account, comp a balance.

**Why.** Without this, every support ticket is a database query.

**How.** Retool or custom Next.js admin. Strict role-based access. Audit log every admin action.

### 19.4 Audit logs for admin actions ⏳

**What.** Every staff action against a user account is logged immutably.

**Why.** Required by gambling regulators; protects against insider abuse.

**How.** Append-only `admin_audit` table. Periodic export to S3 + Glacier for archival.

---

## 20. Live operations

### 20.1 Daily sync of case data + prices ✅

GitHub Actions cron at 04:00 UTC runs `sync:api` + `sync:prices` and opens an auto-PR on diff. See [.github/workflows/sync.yml](.github/workflows/sync.yml).

### 20.2 Event calendar ⏳

**What.** A roadmap of upcoming events visible to ops: Halloween Case launch, double-XP weekend, summer sale.

**Why.** Coordination tool; prevents stomping events on each other.

**How.** Notion calendar or a custom admin page reading from `events` table.

### 20.3 Hotfix deploys ⏳

**What.** One-click rollback. Deploy any commit on `main` in <5 minutes.

**Why.** When something breaks in production, you need to fix it before the chargebacks land.

**How.** Vercel/Netlify/Cloudflare Pages for the frontend (already trivial). Backend on Fly/Render/Railway for similar quick-deploy ergonomics.

### 20.4 Incident response playbook ⏳

**What.** A document everyone reads BEFORE the outage: who has prod access, how to roll back, who to page, how to communicate to users.

**Why.** When the site is down at 3am, the playbook is what makes the difference between "fixed in 10min" and "fixed in 3 hours."

**How.** Live in repo as `RUNBOOK.md`. Practiced quarterly via a simulated outage.

### 20.5 Status page ⏳

**What.** Public-facing page that shows current uptime + recent incidents.

**Why.** Trust signal; deflects "is the site down?" support tickets.

**How.** Statuspage.io, Instatus, or self-hosted Cachet.

---

## Recommended sequencing

If starting from where this repo currently is (single-player simulator, no backend):

1. **Polish the existing loop** — wear-aware pricing (1.6), stats dashboard (5.4), achievements (5.3), drop ticker (6.6), audio polish (9.3-9.4).
2. **Backend foundation** — auth, schema, API layer (§12). Choose Supabase to move fast.
3. **Migrate stores from localStorage to server** — same exported API, thin sync layer underneath.
4. **Trust layer** — provably-fair RNG (7.1), public audit log (7.3).
5. **Real economy** — payment processor (3.1), deposits, withdrawal (3.3).
6. **Compliance gate** — region blocking (17.3), age verification (16.4), Terms/Privacy (17.1), Curaçao license application (17.2). **Cannot launch publicly without this.**
7. **Multiplayer modes** — drop ticker (6.6), trade with players (4.9), PvP race (2.5).
8. **Marketing infrastructure** — affiliate program (18.2), referrals (3.6), free-case-signup (18.4).
9. **Scale & polish** — mobile redesign (10.2), localization (§15), 3D viewer with licensed models (4.5).
10. **Live ops & retention** — events (5.7), reactivation campaigns (18.5), VIP tiers (3.7).

Steps 1-2 can be done in parallel. Step 6 gates everything; don't take real money before it's done.

---

## Estimated effort by phase

- Phase 1 (polish current loop): **2–4 weeks** solo.
- Phase 2-3 (backend + migration): **6–10 weeks** solo.
- Phase 4-5 (trust + economy): **8–12 weeks** + payment integration time.
- Phase 6 (compliance): **3–6 months** calendar time, mostly legal work.
- Phase 7-10 (scale): **6–12 months** of ongoing work.

Total to a launch-ready professional-grade product: **18–24 months** with a single dedicated engineer plus a part-time lawyer and a compliance consultant. With a team of 3-4, ~9-12 months.
