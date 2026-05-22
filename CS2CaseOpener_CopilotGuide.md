# CS2 Case Opener — Full Copilot Development Guide
> For use with GitHub Copilot inside Visual Studio Code.  
> Your existing project: **Vite + Vanilla JS**, single `index.html`, `src/main.js`, `src/style.css`, `image-map.json`, `download-images.js`.  
> This guide tells Copilot exactly what to build, in what order, and how to think about every layer.

---

## 0. How to Use This Guide with Copilot

1. Open VS Code in your `cs2-case-opener/` folder.
2. Open **Copilot Chat** (`Ctrl+Shift+I`).
3. Copy each section's **"Prompt to Copilot"** block verbatim into the chat.
4. Let Copilot generate the code, then review it before accepting.
5. Run `npm run dev` after each major step to verify nothing is broken.
6. Work through sections **in order** — later sections depend on earlier ones.

---

## 1. Project Structure

Before writing any code, restructure the project so Copilot always knows where to look.

```
cs2-case-opener/
├── public/
│   └── assets/
│       ├── images/
│       │   ├── cases/          ← case box PNGs
│       │   └── skins/          ← skin PNGs (weapon + knife + gloves)
│       └── sounds/             ← NEW: open.mp3, rare.mp3, reveal.mp3, tick.mp3
├── src/
│   ├── data/
│   │   ├── cases.js            ← case definitions + item pools
│   │   ├── rarityConfig.js     ← weights, colours, labels per rarity tier
│   │   └── economy.js          ← prices, key costs, bundle definitions
│   ├── engine/
│   │   ├── rng.js              ← seeded RNG, weighted picker, float generator
│   │   ├── caseEngine.js       ← open(case, key) → result object
│   │   └── tradeup.js          ← trade-up contract logic
│   ├── store/
│   │   ├── inventory.js        ← add / remove / filter / sort / persist
│   │   ├── wallet.js           ← coin balance, earn, spend, history
│   │   └── progression.js      ← XP, level, missions, streaks, daily rewards
│   ├── ui/
│   │   ├── caseGrid.js         ← renders the case selection panel
│   │   ├── spinner.js          ← the scroll/reel animation
│   │   ├── resultModal.js      ← the "you got" reveal dialog
│   │   ├── inventory.js        ← inventory grid, filters, bulk actions
│   │   ├── market.js           ← market listing UI
│   │   ├── shopPanel.js        ← buy coins, keys, bundles
│   │   ├── progressPanel.js    ← level bar, missions, daily, streak
│   │   └── notifications.js    ← toast system
│   ├── auth/
│   │   ├── authModal.js        ← login / register / guest flow
│   │   └── session.js          ← current user, token, guest flag
│   ├── api/
│   │   └── client.js           ← fetch wrapper for backend calls
│   ├── utils/
│   │   ├── format.js           ← currency, float, wear label formatters
│   │   ├── sound.js            ← audio manager (preload + play)
│   │   └── accessibility.js    ← focus trap, aria-live, reduced-motion check
│   ├── main.js                 ← app bootstrap
│   └── style.css               ← global styles (keep existing, extend)
├── tools/
│   ├── download-images.js      ← your existing downloader (extended below)
│   ├── download-images-v2.js   ← your existing v2 downloader
│   ├── image-catalog.js        ← your existing catalog
│   └── verify-assets.js        ← NEW: checks every case×skin has a real image
├── image-map.json              ← extended with ALL cases and skins
├── package.json
└── vite.config.js              ← add aliases: @data, @engine, @store, @ui
```

### Prompt to Copilot — Structure Setup
```
Create the full directory structure above inside the existing cs2-case-opener project.
For each new .js file, add an empty export so the module graph is valid.
Update vite.config.js to add path aliases:
  @data   → ./src/data
  @engine → ./src/engine
  @store  → ./src/store
  @ui     → ./src/ui
  @utils  → ./src/utils
  @auth   → ./src/auth
  @api    → ./src/api
Do not delete any existing files — only add new ones.
```

---

## 2. Asset Pipeline — Download EVERY Skin and Case Image

This is the most critical infrastructure step. Copilot must build a downloader that fetches **every single skin image and every single case image** that exists in CS2, not just the 8 cases currently in the project.

### What "every image" means
- **Every case box** — all ~50+ weapon cases, all souvenir packages, all operation cases, all capsules with the CS2 appid (730). Source: the Steam Community Market listing pages and the CS.MONEY / BUFF163 image CDNs.
- **Every skin** — every weapon finish from every case, at 300×225 px minimum. This includes all rifles, pistols, SMGs, shotguns, machine guns, knives, and gloves.
- **Sources to try in priority order:**
  1. `https://community.fastly.steamstatic.com/economy/image/<hash>/300fx225f` — the canonical Steam CDN. You get the hash from the item's `icon_url` in the Steam API.
  2. `https://api.csgostash.com/items` — public JSON API that lists all skins with icon URLs, no key required.
  3. `https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json` — community-maintained JSON with image URLs for every skin.
  4. `https://bymykel.github.io/CSGO-API/api/en/cases.json` — same repo, all cases with images.
  5. `https://csfloat.com/api/v1/meta/skins` — fallback.

### Prompt to Copilot — Master Image Downloader
```
Rewrite tools/download-images.js as a comprehensive Node.js ESM script that:

PHASE 1 — Fetch the master item catalog:
  1. GET https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json
     Parse the JSON array. Each entry has: id, name, rarity, image (URL), weapon, cases[].
  2. GET https://bymykel.github.io/CSGO-API/api/en/cases.json
     Parse the JSON array. Each entry has: id, name, image (URL).
  3. GET https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/knives.json
     Parse knife skins similarly.
  4. GET https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/gloves.json
     Parse glove skins similarly.
  Merge all skin arrays (skins + knives + gloves) into one master list.

PHASE 2 — Build a download plan:
  For every case in the cases array:
    - Plan to download the case image to: public/assets/images/cases/<slug>.png
      where slug = case name lowercased, spaces→underscores, remove special chars
  For every skin in the master skin list:
    - Plan to download the skin image to: public/assets/images/skins/<weapon>_<finish_slug>.png
      where weapon = skin.weapon lowercased (ak-47 → ak47, m4a1-s → m4a1s etc.)
      and finish_slug = finish name lowercased, spaces→underscores, apostrophes removed

PHASE 3 — Download with resilience:
  - Concurrency: 5 simultaneous downloads (use a semaphore/queue, not Promise.all on everything at once)
  - For each image: try the URL in the catalog first.
    If it fails (non-200, timeout, or file < 2KB), try fallback:
      https://community.fastly.steamstatic.com/economy/image/<encodedName>/300fx225f
  - Skip files that already exist on disk AND are > 2KB (valid image check)
  - Retry each failed URL up to 3 times with exponential back-off: 1.5s, 3s, 6s
  - Timeout per request: 20 seconds
  - Add a 300ms base delay between requests to avoid rate-limiting
  - Accept any HTTP redirect (301/302/307/308) and follow it

PHASE 4 — Reporting:
  After all downloads, write three files:
    - tools/download-report.json: { total, succeeded, failed, skipped, duration }
    - tools/failed-downloads.json: array of { name, url, reason } for every failure
    - image-map.json: regenerate the full catalog mapping fileName → { kind, caseName, displayName, rarity, weapon, targetPaths[] }

PHASE 5 — Verification:
  Read every entry in image-map.json, stat the file on disk.
  Log a warning for every entry whose file is missing or < 2KB.
  Print a final summary: "X/Y images OK, Z missing or broken."

Requirements:
  - Use only Node.js built-ins: fs, path, https, http, url, crypto — no npm packages
  - ESM (import/export), not CommonJS
  - All console output must show progress: "[42/1200] Downloading AK-47 | Redline..."
  - Handle ENOENT by creating directories recursively before writing
  - Wrap the entire script in try/catch and exit with code 1 on fatal error
```

### Prompt to Copilot — Verify Assets Script
```
Create tools/verify-assets.js that:
  1. Reads image-map.json
  2. For every entry, checks the file exists at each path in targetPaths[] and is > 2KB
  3. Reads src/data/cases.js (once created) and cross-checks that every skin and case
     referenced in cases.js has a corresponding valid image on disk
  4. Outputs a colour-coded terminal report:
       ✅ green for OK
       ⚠️  yellow for missing but non-critical (e.g. souvenir variant)
       ❌ red for missing critical (case image or skin in active case pool)
  5. Exits with code 1 if any red items are found, so it can be used in CI

Add a script to package.json: "verify:assets": "node tools/verify-assets.js"
```

---

## 3. Item System & Data Layer

### Prompt to Copilot — Rarity Config
```
Create src/data/rarityConfig.js that exports a frozen RARITY object:

Each rarity tier must have:
  - id: string key (e.g. "consumer", "industrial", "milspec", "restricted",
        "classified", "covert", "contraband", "extraordinary", "immortal", "ancient")
  - label: display name ("Consumer Grade", "Industrial Grade", etc.)
  - color: hex CSS colour matching the real CS2 rarity colours:
      consumer     → #b0c3d9
      industrial   → #5e98d9
      milspec      → #4b69ff
      restricted   → #8847ff
      classified   → #d32ce6
      covert       → #eb4b4b
      contraband   → #e4ae39  (contraband / ancient for knives/gloves from cases)
      extraordinary → #e4ae39 (gold — knives and gloves)
  - weight: base drop probability weight (consumer=7992, industrial=1598, milspec=361,
            restricted=90, classified=32, covert=16, extraordinary=8, contraband=2)
    These weights are approximate CS2 odds. Copilot must normalise them per case.
  - glowColor: slightly brighter version of color for CSS glow/shadow effects
  - soundVariant: "common" | "rare" | "legendary" — which reveal sound to play

Also export:
  - function getWeightedRarity(pool: RarityTier[]): RarityTier
    Uses crypto.getRandomValues for seeded randomness (in browser) or Math.random fallback
  - function rarityFromLabel(label: string): RarityTier | null
```

### Prompt to Copilot — Cases Data
```
Create src/data/cases.js that exports an array CASES of case definition objects.

Include ALL EIGHT cases currently in the project plus structure for adding more:
  Chroma Case, Dreams & Nightmares Case, Falchion Case, Kilowatt Case,
  Operation Riptide Case, Prisma Case, Recoil Case, Revolution Case.

Each case object shape:
{
  id: string,              // e.g. "chroma_case"
  name: string,            // display name
  image: string,           // path: "assets/images/cases/<id>.png"
  keyPrice: number,        // in coins (default 249 = $2.49 equivalent)
  items: [
    {
      id: string,          // e.g. "ak47_dragon_lore"
      name: string,        // "AK-47 | Dragon Lore"
      weapon: string,      // "AK-47"
      finish: string,      // "Dragon Lore"
      rarity: string,      // rarity id from rarityConfig
      image: string,       // "assets/images/skins/ak47_dragon_lore.png"
      statTrakEligible: boolean,
      minFloat: number,    // wear range min (0.00–1.00)
      maxFloat: number,    // wear range max
      basePrice: number,   // estimated coin value for economy calculations
    }
  ],
  specialPool: [           // knives / gloves — the "extraordinary" tier
    { same shape as items above, rarity: "extraordinary" }
  ],
  guaranteedRules: [],     // e.g. [{ everyN: 200, guaranteeTier: "extraordinary" }]
}

Populate all items for all 8 cases using the case-skin-list.md content already in the project.
For float ranges, use real CS2 values where known, otherwise use sensible defaults:
  Factory New:     0.00–0.07
  Minimal Wear:    0.07–0.15
  Field-Tested:    0.15–0.38
  Well-Worn:       0.38–0.45
  Battle-Scarred:  0.45–1.00
For base prices, assign coin values roughly proportional to real-world Steam market prices
(Covert ≈ 2000 coins, Classified ≈ 400, Restricted ≈ 80, Mil-Spec ≈ 20, Industrial ≈ 5, Consumer ≈ 1).

Also export:
  - function getCaseById(id: string): Case | null
  - function getAllCaseIds(): string[]
```

### Prompt to Copilot — RNG Engine
```
Create src/engine/rng.js:

Export:
  - function weightedPick(items: Array<{weight: number, [key]: any}>): item
    Uses crypto.getRandomValues in browser, crypto.randomInt in Node.
    Must be provably fair: generate a seed, pick the item, return { seed, result }.
  - function generateFloat(minFloat: number, maxFloat: number): number
    Returns a float rounded to 6 decimal places in the given range.
  - function rollStatTrak(): boolean
    10% chance true.
  - function generateOpenResult(caseData: Case): OpenResult
    Returns {
      item: CaseItem,
      wear: string,        // "Factory New" | "Minimal Wear" etc.
      float: number,
      statTrak: boolean,
      seed: string,        // hex seed for provable fairness display
      timestamp: number,
    }
    Steps:
      1. Roll the rarity tier using weightedPick against RARITY weights filtered to tiers present in the case.
      2. If tier is "extraordinary", pick from specialPool.
      3. Otherwise pick uniformly from items of that rarity tier.
      4. Generate float within the item's minFloat–maxFloat range.
      5. Determine wear label from float value.
      6. Roll statTrak (only if item.statTrakEligible).

Create src/engine/caseEngine.js:
  Export async function openCase(caseId: string, userId: string | null): Promise<OpenResult>
    - Gets case from getCaseById
    - Calls generateOpenResult
    - If userId is not null, calls api/client.js to POST /api/open (for logged-in users)
    - Returns the result
    - Fires a DOM CustomEvent "case:opened" with the result as detail
```

---

## 4. Economy and Balance

### Prompt to Copilot — Wallet and Economy
```
Create src/data/economy.js that exports:
  COIN_PACKAGES: [
    { id: "starter",  coins: 1000,  price: 0.99,  label: "Starter",  bonus: 0 },
    { id: "popular",  coins: 5500,  price: 4.99,  label: "Popular",  bonus: 500  },
    { id: "value",    coins: 12000, price: 9.99,  label: "Value",    bonus: 2000 },
    { id: "mega",     coins: 28000, price: 19.99, label: "Mega",     bonus: 8000 },
  ]
  KEY_COST: 249           // coins per key
  CASE_COST: 0            // cases are free; keys cost coins
  SELL_TAX: 0.15          // 15% cut when selling to market
  TRADE_UP_COST: 10       // extra coins to initiate a trade-up
  DAILY_REWARD_COINS: 100
  STREAK_BONUS: [0, 50, 100, 150, 200, 300, 500]  // extra coins per streak day 1–7

Create src/store/wallet.js:
  - Persists balance in localStorage as "cs2_wallet"
  - Exports: getBalance(), earn(amount, reason), spend(amount, reason): boolean,
             getHistory(): Transaction[], clearHistory()
  - Transaction shape: { id, amount, reason, balanceBefore, balanceAfter, timestamp }
  - spend() returns false and does NOT deduct if balance < amount
  - Fires CustomEvent "wallet:changed" on every mutation

Create src/store/progression.js:
  - Persists in localStorage as "cs2_progression"
  - Tracks: xp, level, currentStreak, lastDailyClaimDate, missions[], completedMissions[]
  - XP thresholds: level N requires N*500 XP (so level 2 = 1000 XP, level 10 = 5000 XP)
  - Exports:
      addXp(amount): { newXp, newLevel, leveledUp: boolean }
      claimDailyReward(): { coins, streakDay } | null  (null if already claimed today)
      getMissions(): Mission[]
      completeMission(id): boolean
  - Mission shape: { id, label, target, progress, reward: { coins, xp }, completed }
  - Generate 3 daily missions on first load or when all are complete:
      e.g. "Open 5 cases", "Get a Classified or better", "Open 3 different cases"
  - Fires CustomEvent "progression:updated" on changes
```

### Prompt to Copilot — Trade-Up Logic
```
Create src/engine/tradeup.js:

Trade-up rules (matching real CS2):
  - Requires exactly 10 items of the same rarity tier
  - All 10 items must be from cases (not market-bought contraband)
  - Result rarity = one tier above the input rarity
  - Result item is picked from the combined pool of items one tier above,
    weighted by how many of the input 10 items came from each case
  - StatTrak input items → StatTrak result (only if ALL 10 are StatTrak)
  - Coins cost: TRADE_UP_COST from economy.js

Export:
  function validateTradeUp(items: CaseItem[]): { valid: boolean, reason?: string }
  function executeTradeUp(items: CaseItem[]): TradeUpResult
    Returns { inputItems, resultItem, resultRarity, statTrak, seed }
```

---

## 5. Inventory and Market

### Prompt to Copilot — Inventory Store
```
Create src/store/inventory.js:

Persistent inventory (localStorage key "cs2_inventory"):
  - Each inventory entry: {
      uid: string (crypto.randomUUID),
      itemId: string,
      caseName: string,
      name: string,
      weapon: string,
      finish: string,
      rarity: string,
      wear: string,
      float: number,
      statTrak: boolean,
      statTrakCount: number,  // starts at 0, UI can let user increment
      isFavorite: boolean,
      isListed: boolean,      // listed on the market
      listPrice: number,
      equippedSlot: string | null,  // "ct_main" | "t_main" | null
      openedAt: number,
      seed: string,
    }
  - Max inventory size: 500 items. If full, block add() and show a notification.
  - Duplicates: allowed, each gets its own uid.
  - Exports:
      add(openResult: OpenResult): InventoryItem
      remove(uid: string): boolean
      get(uid: string): InventoryItem | null
      getAll(): InventoryItem[]
      filter(opts: FilterOptions): InventoryItem[]
      sort(field, direction): InventoryItem[]
      favorite(uid: string, value: boolean): void
      equip(uid: string, slot: string): void
      listOnMarket(uid: string, price: number): void
      delistFromMarket(uid: string): void
      sell(uid: string): { coins: number }  // instant sell at basePrice*(1-SELL_TAX)
      bulkSell(uids: string[]): { totalCoins: number, count: number }
      getStats(): { totalValue, totalItems, byRarity, favoriteCount }
  - FilterOptions: { rarity?, weapon?, wear?, statTrak?, minFloat?, maxFloat?, search? }
  - Fires CustomEvent "inventory:changed" on every mutation
```

---

## 6. Auth / Session

### Prompt to Copilot — Auth System
```
Create src/auth/session.js:

Manages the current user session in localStorage ("cs2_session"):
  - session shape: { userId, displayName, isGuest, token, expiresAt }
  - Exports:
      getSession(): Session | null
      setSession(session): void
      clearSession(): void
      isLoggedIn(): boolean
      isGuest(): boolean
      getCurrentUserId(): string | null
  
  Guest mode: generate a random guestId like "guest_<8hexchars>" stored in localStorage.
  Guest inventory and wallet are local-only (localStorage).
  Logged-in users: inventory syncs to backend via api/client.js.

Create src/auth/authModal.js:

Renders a modal dialog with three tabs:
  1. LOGIN: email + password fields, "Login" button, calls POST /api/auth/login
  2. REGISTER: username + email + password + confirm fields, calls POST /api/auth/register
             Show password strength bar. Require: 8+ chars, 1 number, 1 special char.
  3. GUEST: single "Play as Guest" button — creates guest session, closes modal.

Requirements:
  - Focus trap inside the modal (Tab key stays inside)
  - Escape key closes (with confirmation if form is dirty)
  - Loading spinner on submit
  - Inline field validation on blur
  - On success: fire CustomEvent "auth:login" with session payload
  - Show a persistent banner when playing as guest: 
    "You are playing as a guest. Register to save your progress."
  - The modal is shown on first visit if no session exists.
  - Age gate: before showing register, show a simple DOB input.
    If under 18, block with message: "You must be 18 or older to register."
```

---

## 7. UI Panels

### Prompt to Copilot — Spinner / Opening Animation
```
Rewrite src/ui/spinner.js to replace or extend the existing spinner.

The case opening animation must:
  1. Show a horizontal reel of ~30 item cards that scrolls left, decelerating
     with a cubic-bezier easing curve that starts fast and slows to a stop.
  2. The winning item is always position 24 in the 30-card reel (always near the end,
     never at position 1 or 30). Cards before and after are random fillers from the case pool.
  3. A vertical "selector line" (a glowing yellow line) sits at position 24 centre.
  4. The reel must use CSS transforms for performance — no margin animation.
  5. Duration: 6 seconds for a single open, 2 seconds for batch (x10) opens.
  6. After the reel stops, play the reveal sound, then show the resultModal.
  7. "Skip Animation" button: immediately jumps to result (for repeated openers).
     Remember user's preference in localStorage "cs2_skipAnim".
  8. Near-miss mechanic: 15% of the time when a Restricted or better drops,
     briefly flash the card of the next rarity tier before revealing the actual result.
     (The near-miss card appears then slides away — the user sees their actual win.)
  9. Support reduced-motion: if prefers-reduced-motion is set, skip directly to result modal.
 10. For x10 opens: show 10 result cards in a 5×2 grid with staggered fade-in.
     Highlight the best drop with a gold border.
     Let the user click each card to see full details.
```

### Prompt to Copilot — Result Modal
```
Rewrite src/ui/resultModal.js:

The result reveal modal must show:
  - Full-width rarity colour banner across the top (animated slide-down)
  - Large skin image (300×225 or bigger)
  - Item name in a large font with rarity colour
  - Wear tier label (bold) + float value (smaller, monospace)
  - StatTrak™ badge if applicable — orange, animated pulse
  - Seed hash (small, grey) — "Seed: <8chars>" for provable fairness
  - Four action buttons:
      "Add to Inventory" — closes modal, adds item
      "Sell Now" — immediately sell for coins, show the coin amount earned
      "Open Again" — closes modal and triggers another open of the same case
      "Inspect (3D)" — placeholder button that opens a new tab to
        https://cs.money/en/market/buy/?name=<encodedItemName>
        (a real external inspect/market link)
  - Particle explosion effect on Classified, Covert, and Extraordinary drops:
    use canvas confetti or CSS keyframe particles, matching the rarity colour.
  - Celebration sound on Covert/Extraordinary.
  - Modal closes on backdrop click only for Common/Industrial — higher rarities
    require explicit button click to prevent accidental dismissal.
```

### Prompt to Copilot — Inventory UI
```
Rewrite src/ui/inventory.js:

Full inventory panel with:
  FILTER BAR (above the grid):
    - Text search (debounced 200ms) — searches item name
    - Rarity multi-select chips (Consumer, Industrial, … Extraordinary)
    - Wear dropdown (All / FN / MW / FT / WW / BS)
    - StatTrak toggle
    - Float range slider (0.00 – 1.00)
    - Sort selector: Newest / Oldest / Float ASC / Float DESC / Value HIGH / Value LOW / Rarity
  
  GRID:
    - Responsive: 2 cols on mobile, 4 on tablet, 6 on desktop
    - Each card: skin image, name, wear badge, float, rarity colour border,
      ★ favourite star, StatTrak icon if applicable
    - Click → opens item detail panel (not modal — a slide-in side panel)
  
  ITEM DETAIL PANEL (slide in from right):
    - All item attributes
    - Inspect (external link), Equip, Favourite, List on Market, Sell Now buttons
    - When "List on Market" is clicked: show a price input with suggested price = basePrice
  
  BULK ACTIONS (shown when ≥1 item is selected via checkbox):
    - "Sell Selected" — shows total coins to be earned, confirm dialog
    - "Favourite Selected"
    - "Select All Visible"
  
  EMPTY STATE:
    - Show a ghost case image + "Your inventory is empty. Open some cases!" CTA
  
  INVENTORY STATS BAR:
    - Total items | Total estimated value | Best drop (rarity chip + name)
  
  CAPACITY indicator: "127 / 500 items" with a progress bar, warns at 450+.
```

### Prompt to Copilot — Progress Panel
```
Create src/ui/progressPanel.js:

A collapsible panel (collapsed by default on mobile) showing:
  LEVEL BAR:
    - Current level (large number), XP bar with current/max XP
    - Animated fill when XP is added

  DAILY REWARD:
    - A clickable chest button, greyed out if already claimed today
    - Shows coin amount + streak multiplier
    - Countdown timer to next claim ("Resets in 14h 23m")

  STREAK TRACKER:
    - 7-day dot row (filled = claimed, empty = not yet)
    - Current streak label: "🔥 Day 4 Streak!"

  MISSIONS (3 at a time):
    - Each mission: label, progress bar (e.g. "3/5 cases opened"), coin+XP reward
    - Completed missions show a green checkmark and "Claim" button
    - Auto-refresh missions when all 3 are complete

  All panels update reactively to CustomEvents: "progression:updated", "wallet:changed"
```

### Prompt to Copilot — Notifications
```
Create src/ui/notifications.js:

A toast notification system:
  - show(message, type, duration): type = "info" | "success" | "warning" | "error" | "rare"
  - Toasts slide in from top-right, auto-dismiss after duration (default 4000ms)
  - "rare" type has a gold shimmer and longer duration (8s)
  - Max 4 toasts at once; oldest dismisses if 5th arrives
  - Accessible: role="status" aria-live="polite" for info/success,
    role="alert" aria-live="assertive" for warning/error
  - Used everywhere: low balance, inventory full, level-up, streak broken, mission complete

Fire notifications automatically on these CustomEvents:
  "case:opened" → "wallet:changed" if coins < KEY_COST → show "Low coins — buy more"
  "progression:updated" if leveledUp → show "Level up! You are now Level N 🎉" (rare type)
  "inventory:changed" if items >= 490 → show "Inventory almost full (490/500)"
```

---

## 8. Backend API (Structure for Future Integration)

### Prompt to Copilot — API Client
```
Create src/api/client.js:

A fetch wrapper that:
  - Base URL from import.meta.env.VITE_API_URL (default: http://localhost:3000)
  - Attaches Authorization: Bearer <token> header from session.js if logged in
  - Handles 401 by clearing session and firing CustomEvent "auth:expired"
  - Retries network errors once with a 1s delay
  - Returns { data, error } — never throws (errors are returned, not thrown)

Define these endpoint functions (all async, return { data, error }):
  // Auth
  authLogin(email, password)         → POST /api/auth/login
  authRegister(name, email, password) → POST /api/auth/register
  authLogout()                       → POST /api/auth/logout
  
  // Inventory (for logged-in users)
  inventoryGet()                     → GET  /api/inventory
  inventoryAdd(item)                 → POST /api/inventory
  inventoryRemove(uid)               → DELETE /api/inventory/:uid
  inventorySell(uid)                 → POST /api/inventory/:uid/sell
  
  // Opening
  caseOpen(caseId, seed)             → POST /api/cases/open
  
  // Economy
  walletBalance()                    → GET  /api/wallet
  purchaseCoins(packageId)           → POST /api/wallet/purchase
  
  // Progression
  progressionGet()                   → GET  /api/progression
  claimDaily()                       → POST /api/progression/daily
  completeMission(id)                → POST /api/progression/missions/:id/complete

When VITE_API_URL is not set (local dev without a backend), all functions return
mock data from a local stub so the UI works completely offline.
```

### Prompt to Copilot — Backend Schema Reference
```
Create docs/backend-schema.md documenting the intended PostgreSQL schema:

Tables:
  users(id uuid pk, name, email unique, password_hash, created_at, last_login, is_banned)
  sessions(id uuid pk, user_id fk, token_hash, expires_at, ip, user_agent)
  wallets(user_id pk fk, balance int, updated_at)
  wallet_transactions(id uuid pk, user_id fk, amount int, reason, balance_after, created_at)
  inventory_items(uid uuid pk, user_id fk, item_id, case_name, name, weapon, finish, rarity,
                  wear, float_val, stat_trak bool, stat_trak_count int, is_favorite bool,
                  is_listed bool, list_price int, equipped_slot, opened_at, seed, created_at)
  open_log(id uuid pk, user_id fk, case_id, item_id, rarity, float_val, stat_trak bool,
           seed, server_seed_hash, client_seed, created_at)
  progression(user_id pk fk, xp int, level int, streak int, last_daily_claim date)
  missions(id uuid pk, user_id fk, type, label, target int, progress int,
           reward_coins int, reward_xp int, completed bool, expires_at)

Indexes: user_id on all tables, (user_id, rarity) on inventory_items, created_at on open_log.

Also document the RNG provably-fair scheme:
  - Server generates server_seed, stores SHA256(server_seed) in open_log at request time
  - Client sends client_seed
  - Result = HMAC-SHA256(server_seed, client_seed) → determine item from hash
  - After reveal, server publishes server_seed so client can verify
```

---

## 9. Security, Anti-Exploit, and Legal

### Prompt to Copilot — Security Layer
```
Create src/utils/rateLimiter.js (client-side rate limiter):

  A simple token-bucket rate limiter for client-side abuse prevention:
  - Max 10 case opens per 60 seconds (UI disables button if limit hit)
  - Show countdown: "You can open again in 45s"
  - Persists bucket state in sessionStorage (resets on tab close)
  - Also: if user opens x10 three times in a row in under 10 seconds, show a
    responsible gaming message: "Take a break? Remember this is a simulator."

Create src/utils/responsible.js:
  - Session open count tracker (in memory, resets per session)
  - After every 50 opens in a session, show a non-dismissible overlay for 3 seconds:
    "You've opened 50 cases this session. Simulators are for fun — real CS2 cases cost real money."
  - Export: recordOpen(), getSessionCount()

Add to index.html:
  - A footer with legal text:
    "This is a free simulator. No real money is involved. Not affiliated with Valve Corporation.
     All CS2 trademarks belong to Valve. Drop rates shown are approximate and for entertainment only."
  - An odds disclosure link that opens a modal listing exact rarity weights per case.
  - Age gate check on first load: localStorage "cs2_ageVerified". 
    If not set, show modal: "Are you 18 or older?" Yes/No.
    No → redirect to https://www.google.com (don't let them in).
```

---

## 10. Analytics and Admin

### Prompt to Copilot — Analytics
```
Create src/utils/analytics.js:

A simple event tracking module (no external SDK — just console + optional backend):
  - track(eventName, properties): void
    In dev: console.log("[Analytics]", eventName, properties)
    In prod (VITE_ANALYTICS_URL set): POST the event to that URL as JSON
  
  Instrument these events throughout the codebase:
    case_opened      { caseId, rarity, wear, float, statTrak, sessionOpenCount }
    item_sold        { itemId, rarity, coinsEarned }
    trade_up_done    { inputRarity, resultRarity, success }
    daily_claimed    { streakDay, coinsEarned }
    mission_complete { missionType, reward }
    auth_login       { method: "login"|"register"|"guest" }
    shop_opened      { }
    responsible_shown { sessionOpenCount }

Funnel events (for A/B testing hooks — just stubbed for now):
    funnel_case_select   { caseId }
    funnel_open_click    { caseId, isGuest }
    funnel_result_viewed { rarity }
    funnel_add_inventory { rarity }
    funnel_sell          { rarity }
```

---

## 11. Accessibility and Polish

### Prompt to Copilot — Accessibility Pass
```
Audit and fix accessibility across all UI files:

Requirements:
  1. Every interactive element reachable by keyboard (Tab, Shift+Tab)
  2. Focus visible ring on all focusable elements (2px solid var(--color-accent))
  3. All images have meaningful alt text (skin name + wear for inventory items)
  4. Spinner section has aria-live="polite" and announces result when animation ends
  5. Result modal has role="dialog", aria-modal="true", focus trapped inside,
     focus returns to "Open Case" button on close
  6. Rarity colours all meet WCAG AA contrast on their background
     (white text on Covert red, white on Classified purple, etc.) — fix any failures
  7. All icon-only buttons have aria-label
  8. The case grid supports arrow-key navigation between case cards
  9. prefers-reduced-motion: skip all CSS keyframe animations except opacity fades
 10. prefers-color-scheme: already dark — add a light mode via CSS custom properties
     toggled by a button in the header (☀/🌙), persisted in localStorage "cs2_theme"
```

### Prompt to Copilot — Responsive Layout
```
Update src/style.css to add a fully responsive layout:

Breakpoints:
  Mobile:  < 640px  — single column, large tap targets (min 44px), bottom-fixed open button
  Tablet:  640–1024px — 2-column: cases left, spinner right
  Desktop: > 1024px — 3-column: cases | spinner | inventory sidebar

Case grid:
  Mobile:  2 columns
  Tablet:  3 columns
  Desktop: 4 columns

Inventory grid:
  Mobile:  2 columns
  Tablet:  3 columns
  Desktop: 6 columns

Touch interactions:
  Swipe left on an inventory card → reveal "Sell" action (like iOS mail)
  Long-press on a case card → show quick preview tooltip with item list

CSS Custom Properties to define (add to :root):
  --spacing-xs: 4px
  --spacing-sm: 8px
  --spacing-md: 16px
  --spacing-lg: 24px
  --spacing-xl: 48px
  --radius-sm: 4px
  --radius-md: 8px
  --radius-lg: 16px
  --color-bg: #0d0d0f
  --color-surface: #1a1a1f
  --color-surface-alt: #242429
  --color-border: #2e2e38
  --color-text: #e8e8f0
  --color-text-muted: #6b6b80
  --color-accent: #e4ae39
  --color-accent-glow: rgba(228,174,57,0.35)
  --font-display: 'Orbitron', sans-serif
  --font-body: 'Sora', sans-serif
```

---

## 12. Sound Design

### Prompt to Copilot — Audio Manager
```
Create src/utils/sound.js:

Audio manager:
  - Preload these sounds on first user interaction (not on page load, to avoid autoplay block):
      public/assets/sounds/tick.mp3       — played once per spinner card during scroll
      public/assets/sounds/open.mp3       — case open thud at reel start
      public/assets/sounds/reveal.mp3     — played when reel stops (normal drop)
      public/assets/sounds/rare.mp3       — played for Classified+ drops (replaces reveal.mp3)
      public/assets/sounds/legendary.mp3  — played for Covert/Extraordinary drops
      public/assets/sounds/levelup.mp3    — on level-up
      public/assets/sounds/coins.mp3      — on selling / earning coins
  - All sounds: respect a global mute toggle (🔊/🔇 button in header, persisted in localStorage)
  - Volume slider: 0–100%, also persisted
  - Export: play(soundId), preload(), setMuted(bool), setVolume(0-1)
  - Gracefully no-ops if Web Audio API is unavailable

Note to developer: you need to source/create these 7 audio files and place them in
public/assets/sounds/. Free sources: freesound.org, zapsplat.com.
Keep files under 100KB each (use MP3 at 96kbps).
```

---

## 13. Production Checklist Prompts

### Prompt to Copilot — Vite Build Config
```
Update vite.config.js:
  - Path aliases: @data, @engine, @store, @ui, @utils, @auth, @api (as per structure above)
  - Build output: dist/
  - Asset hashing: enabled
  - Code splitting: separate chunk for src/data/cases.js (it will be large)
  - Image assets: inline if < 4KB, otherwise emit as files
  - Define: __DEV__ = mode === 'development'
  - env prefix: VITE_ (default — just confirm it in config)
  - Add a build-time plugin that reads image-map.json and warns if any referenced
    file does not exist in public/assets/images/ — fail the build if > 0 missing.
```

### Prompt to Copilot — Error & Loading States
```
Add global error and loading state handling in src/main.js:

Loading states:
  - Show a full-screen loading overlay while src/data/cases.js and image-map.json load
  - Overlay: animated case box SVG + "Loading CS2 Case Opener…"
  - Fade out once app is ready

Error states:
  - If cases.js fails to import: show "Failed to load case data. Please refresh."
  - If localStorage is unavailable (private mode, storage full): show a banner
    "Could not save your session — storage is disabled in this browser."
  - If any image 404s in the UI: show a grey silhouette placeholder, log to analytics

Disconnected state:
  - If navigator.onLine is false: show a yellow banner "You are offline. Your progress is saved locally."
  - Listen to "online"/"offline" events and toggle the banner reactively.
```

---

## 14. Final Integration Prompt

Once all the above is in place, send this to Copilot as the final wiring step:

### Prompt to Copilot — Wire Everything Together
```
Update src/main.js to bootstrap the entire app in this exact order:

1. Check localStorage availability — if unavailable, show storage warning banner.
2. Apply saved theme (dark/light) from localStorage before any render.
3. Check age gate (localStorage "cs2_ageVerified") — if not set, mount age gate modal,
   await confirmation, then continue. Block rendering until confirmed.
4. Check session (src/auth/session.js) — if no session, mount authModal.js, await login/guest.
5. Import and initialise wallet.js and progression.js stores.
6. Check if daily reward is available (progression.claimDailyReward) — show notification.
7. Import CASES from src/data/cases.js and render caseGrid.js.
8. Import and render progressPanel.js.
9. Attach event listeners for:
     "case:opened"         → addXp(50), recordOpen(), track("case_opened", …)
     "wallet:changed"      → update header coin display
     "progression:updated" → if leveledUp, play("levelup"), show notification
     "inventory:changed"   → update inventory count in header
     "auth:login"          → if not guest, start syncing inventory to backend
     "auth:expired"        → show toast "Session expired. Please log in again.", open authModal
10. Register service worker (public/sw.js — create a minimal cache-first SW for offline support).
11. Import sound.js and call preload() on first pointerdown event.
12. Log to analytics: { event: "app_loaded", cases: CASES.length, isGuest: session.isGuest() }

The final app must work completely offline (all images local, all state in localStorage)
without any backend running. Backend integration is additive — it enriches but never blocks.
```

---

## Quick Reference: Copilot Do's and Don'ts

| Do | Don't |
|----|-------|
| Use `crypto.randomUUID()` for IDs | Use `Math.random()` for RNG |
| Use `crypto.getRandomValues()` for weighted picks | Use predictable seeds |
| Use CSS custom properties for all colours | Hardcode hex values in JS |
| Use CustomEvents for cross-module communication | Direct module-to-module function calls for UI updates |
| Check `navigator.onLine` before API calls | Assume network is available |
| Guard every `localStorage` access in try/catch | Assume storage works |
| Debounce search/filter inputs (200ms) | Filter on every keystroke |
| Use `requestAnimationFrame` for animations | Use `setInterval` for animation frames |
| Load sounds lazily after first interaction | Load audio on page load |
| Use semantic HTML (`<button>`, `<dialog>`, `<nav>`) | Use `<div>` with click handlers |

---

*Guide version 1.0 — generated for CS2CaseOpener Vite+JS project, May 2026.*



