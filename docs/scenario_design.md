# Scenario Design Document

## Multi-Adventure Support: Adventures 14 & 15

---

## Table of Contents

1. [Goals / Non-Goals](#goals--non-goals)
2. [Current State Summary](#current-state-summary)
3. [Capability Matrix](#capability-matrix)
4. [Proposed Architecture](#proposed-architecture)
5. [Adventure 14 Mechanics Spec](#adventure-14-mechanics-spec)
6. [Adventure 15 Mechanics Spec](#adventure-15-mechanics-spec)
7. [Staged Implementation Plan](#staged-implementation-plan)
8. [Open Questions / Risks](#open-questions--risks)

---

## Goals / Non-Goals

### Goals

- Define a `ScenarioDefinition` data structure that fully describes any adventure supported by the engine, including setup, special rules, win/loss conditions, villain configuration, chamber layout, and scenario-scoped triggers.
- Design a `ScenarioEngine` that evaluates scenario triggers at the correct moments in the game loop (villain-phase-start, tile-reveal, chamber-reveal, attack-roll, hero-phase-end, etc.) and dispatches scenario-specific modifier events into the existing event hook system.
- Provide a complete, paraphrased mechanics spec for [Adventure 14](../public/Adventure14.md) and [Adventure 15](../public/Adventure15.md) that maps each special rule to the proposed architecture.
- Provide a staged implementation plan where every stage is independently user-testable and has recommended E2E test coverage.
- Keep all new code consistent with the existing patterns: Svelte UI, Redux Toolkit state management, and the `gameEvents.ts` hook system.

### Non-Goals

- Implementing any code in this PR (documentation only).
- Supporting campaigns, linked adventures, or persistent hero progression across sessions.
- Full coverage of every adventure in the Wrath of Ashardalon adventure book; scope is Adventures 14 and 15 only, with the architecture being general enough to support future additions.
- Multiplayer / networked play.
- Mobile-specific UI changes beyond what the existing responsive layout already provides.

---

## Current State Summary

### Scenario Introduction UI

`ScenarioIntroduction.svelte` renders a dismissible modal at game start with four props: `title`, `description`, `objective`, and optional `instructions`. It supports tablet-rotation via `RotationControls.svelte`. The modal has no knowledge of game mechanics — it is purely presentational.

### ScenarioState

`ScenarioState` in `src/store/types.ts` is the only runtime scenario concept today:

```typescript
interface ScenarioState {
  monstersDefeated: number;
  monstersToDefeat: number;     // win condition: defeat N monsters
  objective: string;
  title: string;
  description: string;
  instructions?: string;
  introductionShown: boolean;
}
```

The current win condition is entirely generic ("defeat N monsters") and is checked in `gameSlice.ts` whenever a monster is removed. There is no villain, no staged dungeon setup, no chamber reveal logic, and no scenario-scoped event hooks.

### Event Hook System

`gameEvents.ts` defines ten `GameEventType` values; `powerCardHooks.ts` and `powerCardIntegration.ts` let power cards register typed hooks that fire at those moments. The existing event types cover most scenario trigger points needed by Adventures 14 and 15:

| Needed trigger | Existing event type |
|---|---|
| Villain phase starts | `villain-phase-start` |
| Hero ends turn | `hero-phase-end` |
| Monster spawns | `monster-spawn` |
| Hero attacks (roll) | `attack-hit-by-hero` / `attack-miss` |
| Hero takes damage | `attack-hit-on-hero` |
| Encounter card drawn | `encounter-draw` |

Two new event types will be needed:

| New event type | When it fires |
|---|---|
| `tile-reveal` | When a dungeon tile is drawn and placed |
| `chamber-reveal` | When the Chamber Entrance tile is revealed |

### Dungeon Tile Stack

`exploration.ts` provides `initializeTileDeck`, `drawTile`, `placeTile`, and `drawTileFromBottom`. The tile deck is an array of tile definition objects; the adventure setup can manipulate its ordering at initialization time.

---

## Capability Matrix

The table below maps every special rule from Adventures 14 and 15 to a required engine capability.

| Capability | Adv 14 | Adv 15 | Notes |
|---|:---:|:---:|---|
| Villain entity with unique AC/HP/tactics | ✅ | ✅ | New `VillainDefinition` type |
| HP scaling by hero count | ✅ | ✅ | `baseHp + perHeroHp * heroCount` |
| Villain placed on chamber reveal | ✅ | ✅ | `chamber-reveal` event handler |
| Custom dungeon stack ordering (Chamber Entrance at position N) | ✅ | ✅ | `ScenarioDefinition.deckSetup` callback |
| Additional monsters spawned alongside villain on reveal | ✅ | ✅ | `chamberSpawnCount` in definition |
| Complex chamber laid out as a tile-set | ✅ | ✅ | `ChamberLayout` definition (entrance + surround tiles) |
| Win on villain defeat | ✅ | ✅ | Replace generic monster-count win condition |
| Loss if tile deck exhausted before chamber | ❌ | ✅ | `defeatedIfDeckExhausted` flag + check |
| Villain immunity while guards present | ✅ | ❌ | `VillainDefinition.shieldedWhileGuardsAdjacent` |
| Per-villain multi-attack tactics with range conditions | ✅ | ✅ | `VillainTactics[]` ordered list |
| Isolation check at villain-phase-start | ✅ | ❌ | `villain-phase-start` hook with hero adjacency query |
| Extra encounter draw on isolation | ✅ | ❌ | Modifier dispatched by scenario hook |
| Chamber-reveal immediate hero status effect (Dazed) | ✅ | ❌ | `chamberEffect` handler |
| Natural-1 self-damage from chamber effect | ✅ | ❌ | `attack-miss`-on-1 hook registered by scenario |
| Terrain hazard on specific tile type (Volcanic Vent → Slowed) | ❌ | ✅ | `terrain-phase-end` sub-hook; `tile-reveal` registers terrain |
| Encounter-keyword interceptor (Trap keyword → extra token) | ❌ | ✅ | `encounter-draw` hook; keyword matching |
| Trap-stacking → immediate damage instead of new token | ❌ | ✅ | Part of Automated Defense hook |
| Chamber-reveal encounter replacement & monster doubling | ❌ | ✅ | `chamber-reveal` handler |
| Chamber effect: hero Daily power bonus damage | ❌ | ✅ | Persistent modifier on `attack-hit-by-hero` |
| Chamber effect: all monster AC bonus | ❌ | ✅ | Persistent modifier on monster AC calculations |

---

## Proposed Architecture

### 1. `ScenarioDefinition`

A plain data object (TypeScript `interface`) that fully describes a scenario's static configuration. It is loaded once at game start and does not change at runtime.

```typescript
interface ScenarioDefinition {
  id: string;
  title: string;
  description: string;
  objective: string;
  instructions?: string;

  /** How to arrange the dungeon tile deck at setup time. */
  deckSetup: DeckSetupConfig;

  /** Villain definition, if any. */
  villain?: VillainDefinition;

  /** Chamber configuration, if any. */
  chamber?: ChamberConfig;

  /** Static win conditions evaluated after relevant state changes. */
  winConditions: WinCondition[];

  /** Static loss conditions evaluated after relevant state changes. */
  lossConditions: LossCondition[];

  /**
   * Scenario-scoped event hooks, registered once when the game starts
   * and removed when the game ends.
   */
  eventHooks: ScenarioHookDefinition[];
}
```

#### `DeckSetupConfig`

```typescript
interface DeckSetupConfig {
  /**
   * Place the Chamber Entrance tile at position N from the bottom of the
   * initial random draw (0-indexed). The remaining tiles are shuffled below it.
   * Example: Adventure 14 → positionFromBottom: 0 means the Chamber Entrance is the very
   * last tile drawn from the mini-stack (it sits at the bottom of the 10-tile run, so it
   * is drawn 10th from that group, NOT at the bottom of the entire deck).
   */
  chamberEntrancePosition: number;
  /** Total tiles in the mini-stack that sits above the chamber entrance in the draw order. */
  miniStackSize: number;
}
```

#### `VillainDefinition`

```typescript
interface VillainDefinition {
  id: string;
  name: string;
  ac: number;
  baseHp: number;
  /** Additional HP per hero beyond the first. */
  perHeroHp: number;
  /** Ordered list of attack tactic options; first matching condition fires. */
  tactics: VillainTactic[];
  /**
   * When true, the villain cannot be damaged while any monster is on the
   * villain's tile or an adjacent tile.
   */
  shieldedWhileGuardsAdjacent?: boolean;
  /** Miniature/token asset to use for this villain. */
  tokenAsset: string;
}

interface VillainTactic {
  /** Human-readable name (e.g. "Void Rip"). */
  name: string;
  /**
   * Distance condition in tiles to the closest Hero.
   * The first tactic whose condition is satisfied fires.
   */
  maxRangeTiles: number;
  attackBonus: number;
  damage: number;
  /** Status effect applied on hit, if any. */
  hitStatusEffect?: StatusEffectType;
  /** Area of effect: 'self-tile' | 'adjacent-tiles' | 'single'. */
  aoe?: 'self-tile' | 'adjacent-tiles' | 'single';
  /** If true, move toward closest Hero before attacking. */
  moveBefore?: boolean;
  /** Draw a Monster Card and place the new monster adjacent to the villain. */
  spawnMonster?: boolean;
}
```

#### `ChamberConfig`

```typescript
interface ChamberConfig {
  /** Chamber tile type to use ('horrid' | 'dire' | custom). */
  chamberType: string;
  /** Number of additional random monsters to spawn on reveal (beyond the villain). */
  additionalMonsterSpawns: number;
  /**
   * Effects applied immediately when the chamber is revealed, before play resumes.
   * Each entry is a handler key mapping to the ScenarioEngine.
   */
  onRevealEffects: ChamberRevealEffect[];
  /**
   * Persistent modifiers active while heroes are in the chamber.
   * These remain until the game ends.
   */
  persistentModifiers: PersistentModifier[];
}

type ChamberRevealEffect =
  | { type: 'daze-all-heroes' }
  | { type: 'replace-encounter-draw-monsters'; multiplier: number };

type PersistentModifier =
  | { type: 'hero-daily-damage-bonus'; bonus: number }
  | { type: 'monster-ac-bonus'; bonus: number }
  | { type: 'reflect-natural-one'; damage: number };
```

#### Win/Loss Conditions

```typescript
type WinCondition =
  | { type: 'defeat-villain'; villainId: string }
  | { type: 'defeat-n-monsters'; count: number };           // current MVP only

type LossCondition =
  | { type: 'hero-defeated-no-surges' }                    // base game default
  | { type: 'tile-deck-exhausted-before-chamber' };        // Adventure 15
```

#### `ScenarioHookDefinition`

```typescript
interface ScenarioHookDefinition {
  eventType: GameEventType;
  /** Handler identifier mapped to a pure function in ScenarioEngine. */
  handlerId: string;
  /** Optional configuration passed to the handler. */
  config?: Record<string, unknown>;
}
```

---

### 2. `ScenarioEngine`

A module (`src/store/scenarioEngine.ts`) that:

1. Accepts a `ScenarioDefinition` and the current `RootState`.
2. Exposes a `registerScenarioHooks(definition, hookState)` function that iterates `definition.eventHooks` and registers typed hooks into the existing `EventHookState`.
3. Exposes pure handler functions for each `handlerId`, following the same hook signature as `powerCardHooks.ts`.
4. Provides `evaluateWinConditions(state, definition)` and `evaluateLossConditions(state, definition)` for use inside `gameSlice` reducers.
5. Provides `applyDeckSetup(tileDeck, config, heroCount)` for use in game initialization.
6. Provides `applyChamberReveal(state, config)` called from the `chamber-reveal` event handler.

The engine itself contains **no Redux state** — it is a collection of pure functions, consistent with the existing pattern in `combat.ts`, `exploration.ts`, etc.

---

### 3. New Event Types

Two new entries added to `GameEventType` in `gameEvents.ts`:

```typescript
type GameEventType =
  | /* existing types ... */
  | 'tile-reveal'       // fires after a dungeon tile is placed
  | 'chamber-reveal';   // fires when the Chamber Entrance tile is placed
```

**`TileRevealEvent`**

```typescript
interface TileRevealEvent extends GameEvent {
  type: 'tile-reveal';
  tileId: string;
  tileType: string;   // e.g. 'volcanic-vent', 'normal', 'chamber-entrance'
  position: Position;
}
```

**`ChamberRevealEvent`**

```typescript
interface ChamberRevealEvent extends GameEvent {
  type: 'chamber-reveal';
  chamberType: string;
  position: Position;
}
```

---

### 4. State Changes in `ScenarioState`

Extend `ScenarioState` (in `types.ts`) with the fields needed for runtime tracking:

```typescript
interface ScenarioState {
  // existing fields...
  scenarioId: string;

  /** Villain instance ID once spawned, null before chamber reveal. */
  villainInstanceId: string | null;

  /** True once the Chamber Entrance tile has been placed. */
  chamberRevealed: boolean;

  /**
   * Active persistent modifiers registered by the current scenario.
   * Used by combat and monster AI to apply scenario-specific bonuses.
   */
  activePersistentModifiers: PersistentModifier[];
}
```

---

### 5. Integration Touch-Points

| Location | Change |
|---|---|
| `gameSlice.ts` — `initializeGame` | Call `applyDeckSetup` and `registerScenarioHooks` |
| `gameSlice.ts` — `placeTile` reducer | Fire `tile-reveal` event; if tile is Chamber Entrance, fire `chamber-reveal` |
| `gameSlice.ts` — `endVillainPhase` | Call `evaluateLossConditions` (adds tile-deck exhaustion check) |
| `gameSlice.ts` — `defeatMonster` | Call `evaluateWinConditions` to check villain-defeat win |
| `combat.ts` — `calculateDamage` | Check `activePersistentModifiers` for `hero-daily-damage-bonus` |
| `monsters.ts` — `calculateTotalAC` | Check `activePersistentModifiers` for `monster-ac-bonus` |
| `monsterAI.ts` — villain activation | Read `VillainDefinition.tactics` and `shieldedWhileGuardsAdjacent` |

---

## Adventure 14 Mechanics Spec

**Source file:** [`public/Adventure14.md`](../public/Adventure14.md) at commit `4eb76b4b86e6be3ec4687bbc5447711e68521037`

**Goal:** Find and reveal the Obsidian Sanctum (the chamber) and defeat Malphas, the Void-Caller.

> **Note on naming:** "The Shadow of the Void-Caller" is the adventure title. "The Obsidian Sanctum" is the name of the chamber location the heroes must find. Both terms appear in this spec; they are distinct.

### Dungeon Setup

- Take 10 random dungeon tiles; place the Chamber Entrance tile at the bottom of this 10-tile mini-stack.
- Shuffle the remaining tiles and place the mini-stack on top of them in the deck.

**Maps to:** `DeckSetupConfig { miniStackSize: 10, chamberEntrancePosition: 0 }` (position 0 from the bottom of the mini-stack = last in the 10-tile run).

### Villain: Malphas, the Void-Caller

| Stat | Value |
|---|---|
| AC | 16 |
| Base HP | 12 |
| HP per additional hero | +4 |

**Tactics (first matching condition fires):**

| Condition | Action | Attack | Damage | Effect |
|---|---|---|---|---|
| Any Hero on Malphas's tile or adjacent tile | Void Rip (aoe) | +8 | 2 | Slowed |
| Any Hero within 2 tiles | Move to closest Hero, Shadow Lash | +7 | 1 | Dazed |
| Otherwise | Move 1 tile toward closest Hero; draw a Monster Card and spawn adjacent | — | — | — |

**Shield mechanic:** Malphas cannot be damaged while any monster is on his tile or an adjacent tile.

**Maps to:** `VillainDefinition` with `shieldedWhileGuardsAdjacent: true` and three `VillainTactic` entries ordered by range.

### Special Rule: The Creeping Void

At the start of each Villain Phase, if no Hero is adjacent to another Hero, the active player draws an additional Encounter Card.

**Maps to:** A `ScenarioHookDefinition` with `eventType: 'villain-phase-start'` and `handlerId: 'creeping-void'`. The handler queries hero positions, and if no two heroes share adjacency, dispatches an extra `encounter-draw` action.

### Chamber: Obsidian Sanctum

When the Chamber Entrance tile is revealed:

1. Place the Horrid Chamber tile-set around the entrance.
2. Place Malphas and two random monsters on the center chamber tile.
3. Immediately Daze all Heroes.
4. Register a persistent hook: whenever a Hero rolls a natural 1 on an attack roll, that Hero takes 1 damage.

**Maps to:** `ChamberConfig`:
- `chamberType: 'horrid'`
- `additionalMonsterSpawns: 2`
- `onRevealEffects: [{ type: 'daze-all-heroes' }]`
- `persistentModifiers: [{ type: 'reflect-natural-one', damage: 1 }]`

The natural-1 reflection registers on `chamber-reveal` as a scenario hook on the `attack-miss` event (checking `attackResult.roll === 1`) that applies 1 damage to the attacker.

### Win / Loss

| Condition | Type |
|---|---|
| Defeat Malphas | Win: `defeat-villain` |
| Hero at 0 HP, no surges | Loss: `hero-defeated-no-surges` (base game default) |

---

## Adventure 15 Mechanics Spec

**Source file:** [`public/Adventure15.md`](../public/Adventure15.md) at commit `4eb76b4b86e6be3ec4687bbc5447711e68521037`

**Goal:** Reach the Infernal Workshop and destroy Vraxos, the Cursed Sentinel.

### Dungeon Setup

- Take 12 random dungeon tiles; place the Chamber Entrance tile at the bottom of the 12-tile mini-stack.
- Shuffle the remaining tiles and place them below the first 13 tiles.

**Maps to:** `DeckSetupConfig { miniStackSize: 12, chamberEntrancePosition: 0 }`.

### Villain: Vraxos, the Cursed Sentinel

| Stat | Value |
|---|---|
| AC | 18 |
| Base HP | 10 |
| HP per additional hero | +5 |

**Tactics:**

| Condition | Action | Attack | Damage | Effect |
|---|---|---|---|---|
| Adjacent to a Hero | Crushing Grip | +9 | 2 | Hero cannot move next Hero Phase |
| Within 2 tiles | Steam Vent (aoe: all heroes ≤2 tiles) | +7 | 1 | Push 1 square away from Vraxos |
| Otherwise | Move 2 tiles toward closest Hero; if ends adjacent, deal 1 automatic damage (no roll) | — | 1 | No roll required |

**Maps to:** `VillainDefinition` with three `VillainTactic` entries; the otherwise-clause uses `spawnMonster: false` and a special `autoAdjacentDamage: 1` field (additional field for Vraxos's charge attack).

### Special Rule: Heat Exhaustion

Whenever a Hero ends their turn on a tile containing a Volcanic Vent token, they roll a die. On a 1–5, the Hero is Slowed.

**Maps to:** A `ScenarioHookDefinition` on `hero-phase-end`. The handler checks whether the active hero's tile type includes `volcanic-vent` (set when the tile is revealed via `tile-reveal`) and, if so, applies a d6 roll with a threshold of 5.

A matching `tile-reveal` hook identifies Volcanic Vent tiles as they are placed and marks them in dungeon state.

### Special Rule: Automated Defense

Whenever an Encounter Card with the keyword "Trap" is drawn:

- Place a Blade Trap token on the active Hero's tile in addition to the card's normal effect.
- If a Blade Trap token already exists on that tile, deal 1 damage to the Hero instead of placing a new token.

**Maps to:** A `ScenarioHookDefinition` on `encounter-draw`. The handler checks whether the drawn card has the `Trap` category (already tracked in `EncounterCard`). It reads `boardTokens` to determine if a Blade Trap is present on the active hero's tile, then either places the token or applies damage.

### Special Rule: The Forge Awakens

When the Chamber Entrance tile is revealed:

1. Discard the current Encounter Card.
2. Draw a new one. All "Monster" results on that new card are doubled for this turn only.

**Maps to:** `ChamberConfig.onRevealEffects: [{ type: 'replace-encounter-draw-monsters', multiplier: 2 }]`.

### Chamber: Infernal Workshop

When the chamber is revealed, Vraxos is placed on the center square. While in the Workshop:

- All Heroes' Daily Powers deal +1 damage.
- All Monsters gain +2 AC.

**Maps to:** `ChamberConfig.persistentModifiers`:
- `{ type: 'hero-daily-damage-bonus', bonus: 1 }`
- `{ type: 'monster-ac-bonus', bonus: 2 }`

### Win / Loss

| Condition | Type |
|---|---|
| Defeat Vraxos | Win: `defeat-villain` |
| Hero at 0 HP, no surges | Loss: `hero-defeated-no-surges` |
| Tile deck runs out before Chamber is revealed | Loss: `tile-deck-exhausted-before-chamber` |

---

## Staged Implementation Plan

Each stage delivers a user-testable increment. Stages are ordered by dependency: later stages build on earlier ones.

---

### Stage 1 — Scenario Selection Screen

**User story:** A player can select an adventure (Adventure 1, 14, or 15) from a lobby screen before the hero selection screen. The selected adventure's title and objective are shown, and the game is initialized with the correct scenario.

**Scope:**
- Add an `AdventureSelectScreen` Svelte component with at minimum three entries.
- Define `ScenarioDefinition` objects for the existing MVP adventure (Adventure 1), Adventure 14, and Adventure 15 (with all mechanic hooks stubbed as no-ops initially).
- Extend `ScenarioState` with `scenarioId`.
- Wire `CharacterSelect.svelte` to show scenario info passed through from the selected adventure.

**User-testable result:** Navigating to the app shows an adventure selection step. Choosing Adventure 14 shows its title on the scenario introduction modal.

**Recommended E2E test:**
```
Given I open the application
Then I see an adventure selection screen with at least three options
When I select "Adventure 14: The Shadow of the Void-Caller"
And I select one hero and click "Start Game"
Then the scenario introduction modal shows "Adventure 14: The Shadow of the Void-Caller" as the title
And the objective reads "Find the Obsidian Sanctum and defeat Malphas, the Void-Caller"
```

---

### Stage 2 — Scenario-Specific Deck Setup

**User story:** When a specific adventure is chosen, the dungeon tile deck is arranged per that adventure's setup rules (Chamber Entrance at the correct position within the mini-stack).

**Scope:**
- Implement `DeckSetupConfig` and `applyDeckSetup` in `scenarioEngine.ts`.
- Call `applyDeckSetup` from the `initializeGame` reducer, replacing the current single-path tile deck initialization.
- Add unit tests for `applyDeckSetup` covering Adventures 14 and 15 configurations.

**User-testable result:** After enough exploration, the Chamber Entrance tile appears at the expected depth in the dungeon (visually, through the tile deck counter).

**Recommended E2E test:**
```
Given I start Adventure 15 with one hero
And the tile deck is seeded deterministically (12 random tiles then Chamber Entrance)
When the hero explores tiles one by one
Then after exactly 12 tiles are placed, the next tile placed is the Chamber Entrance
And the chamber reveal fires at that point
(Automation note: inject a deterministic tile deck so the Chamber Entrance is reliably at position 13)
```

---

### Stage 3 — Villain Entity and Win-by-Villain-Defeat

**User story:** A villain appears in the chamber when it is revealed. The party wins when the villain is reduced to 0 HP.

**Scope:**
- Implement `VillainDefinition` type and store villain HP in `ScenarioState.villainInstanceId`.
- Implement `chamber-reveal` event type in `gameEvents.ts`.
- Wire chamber reveal detection into `placeTile` reducer: when Chamber Entrance tile is placed, fire `chamber-reveal`.
- Place the villain token on the center chamber tile; spawn `additionalMonsterSpawns` random monsters.
- Replace MVP `monstersToDefeat` win condition with `evaluateWinConditions` checking `defeat-villain`.
- Add UI: villain token rendering on the board; villain HP display (reuse `MonsterCard.svelte`).

**User-testable result:** Playing to the chamber causes a villain token to appear. Reducing villain HP to 0 (through injected test state) shows the victory screen.

**Recommended E2E test:**
```
Given I start Adventure 14 with one hero
And the dungeon state is seeded so the next tile placed is the Chamber Entrance
When a hero explores and the Chamber Entrance tile is placed
Then Malphas's villain card appears with AC 16 and HP 12
And two monster tokens appear on the chamber tiles
When Malphas is reduced to 0 HP
Then I see the victory screen
```

---

### Stage 4 — Villain Tactics (Monster AI Extension)

**User story:** The villain activates during the Villain Phase with scenario-specific attack tactics, choosing actions based on proximity to heroes.

**Scope:**
- Extend `monsterAI.ts` (or add `villainAI.ts`) with a `executeVillainTurn(villain, tactics, state)` function that iterates `VillainTactic[]` in order, evaluating range conditions.
- Implement Malphas's Void Rip (aoe), Shadow Lash (single target + Daze), and spawn-monster fallback.
- Implement Vraxos's Crushing Grip (immobilize), Steam Vent (push), and automatic adjacent damage.
- Implement `shieldedWhileGuardsAdjacent` guard check before damage application.
- Add unit tests for each tactic branch.

**User-testable result:** In Adventure 14, Malphas does not activate its attack if adjacent monsters are present (shield active). In Adventure 15, Vraxos deals 1 damage without a roll when it ends movement adjacent to a hero.

**Recommended E2E test:**
```
Given Adventure 14 is running with Malphas in the chamber and one adjacent guard monster
When the Villain Phase processes Malphas
Then Malphas does not take damage from any hero attack (shield active)
When all adjacent guard monsters are defeated
Then Malphas can now be attacked and takes damage
```

---

### Stage 5 — Scenario Event Hooks (Adventure 14)

**User story:** Adventure 14's special rules fire at the correct moments: the Creeping Void check happens at every Villain Phase start, and the natural-1 self-damage is active after the chamber is revealed.

**Scope:**
- Implement `ScenarioEngine.registerScenarioHooks` and wire it into `initializeGame`.
- Implement the `creeping-void` handler: at `villain-phase-start`, check hero adjacency; dispatch extra encounter draw if no two heroes are adjacent.
- Implement the `reflect-natural-one` persistent modifier: on `attack-miss` with `roll === 1`, apply 1 damage to the attacking hero. Register this hook from the `chamber-reveal` handler.
- Implement `daze-all-heroes` chamber reveal effect.
- Add unit tests for each handler.

**User-testable result:** In Adventure 14, when all heroes are isolated (not adjacent to each other) at the start of the Villain Phase, an extra encounter card is drawn and its effect is visible in the log. After chamber reveal, a natural 1 attack roll visibly costs the hero 1 HP.

**Recommended E2E test:**
```
Given Adventure 14 is running
And all heroes are positioned on separate, non-adjacent tiles
When the Villain Phase begins
Then the game log shows "The Creeping Void draws an additional Encounter Card"
And an encounter card effect is shown twice in that phase

Given the Obsidian Sanctum chamber has been revealed
When a hero's attack roll result is 1
Then that hero loses 1 HP
And the log shows "The void reflects your strike — 1 damage"
```

---

### Stage 6 — Scenario Event Hooks (Adventure 15)

**User story:** Adventure 15's special rules fire correctly: Heat Exhaustion slows heroes on Volcanic Vent tiles, Automated Defense places extra trap tokens (or deals damage), and The Forge Awakens doubles monsters on chamber reveal.

**Scope:**
- Implement `tile-reveal` event type in `gameEvents.ts`.
- Fire `tile-reveal` from `placeTile` reducer with `tileType` derived from tile definition.
- Implement the `heat-exhaustion` handler: at `hero-phase-end`, if tile has `volcanic-vent`, roll d6; on ≤5, apply Slowed.
- Implement the `automated-defense` handler: on `encounter-draw` with Trap keyword, check for existing Blade Trap token; place token or deal 1 damage.
- Implement the `forge-awakens` chamber reveal effect (replace current encounter, double monster spawns for that turn).
- Implement persistent modifiers: `hero-daily-damage-bonus` applied in `combat.ts` when a Daily power is used; `monster-ac-bonus` applied in `calculateTotalAC`.
- Add unit tests for each handler.

**User-testable result:** A hero on a Volcanic Vent tile has a chance to be Slowed at the end of their turn. Drawing a Trap encounter card on a tile that already has a Blade Trap deals 1 damage instead of placing a second token.

**Recommended E2E test:**
```
Given Adventure 15 is running
And the active hero is on a tile marked as Volcanic Vent
When the hero ends their turn
Then there is a roll and a ≤5 result causes the hero to be Slowed
And the log shows "Heat Exhaustion: [hero] is Slowed"

Given Adventure 15 is running
And a Blade Trap token is already on the active hero's tile
When a Trap encounter card is drawn
Then the hero takes 1 damage
And no additional Blade Trap token is placed
```

---

### Stage 7 — Loss Condition: Tile Deck Exhaustion (Adventure 15)

**User story:** In Adventure 15, if the dungeon tile deck runs out before the Chamber Entrance tile is revealed, the heroes lose.

**Scope:**
- Add `tile-deck-exhausted-before-chamber` to `LossCondition` type.
- Call `evaluateLossConditions` from `drawTile` when the tile deck becomes empty.
- Display a defeat screen with Adventure 15's specific defeat message.
- Add unit test for loss condition evaluation.

**User-testable result:** Injecting an empty tile deck state with `chamberRevealed: false` causes the defeat screen to appear with the correct message about the mountain collapsing.

**Recommended E2E test:**
```
Given Adventure 15 is running
And the tile deck contains 0 tiles
And the chamber has not been revealed
When a hero would draw a tile
Then I see the defeat screen
And the message references the mountain collapsing (Adventure 15 flavor)
```

---

### Stage 8 — Polish and Adventure Selection UI

**User story:** The adventure selection screen shows preview art, a description, and difficulty indicator for each adventure.

**Scope:**
- Add `difficulty` and `previewImageAsset` fields to `ScenarioDefinition`.
- Update `AdventureSelectScreen` to display these.
- Ensure all existing E2E tests still pass with the new screen in the navigation flow.

**User-testable result:** Adventure selection screen has distinct visual entries for each adventure with names, difficulty labels, and images.

**Recommended E2E test:**
```
Given I open the application
Then I see adventure cards for Adventure 1, Adventure 14, and Adventure 15
And each card shows the adventure's title, description, and difficulty
When I click on Adventure 15
Then its description and objective appear highlighted or in a detail panel
```

---

## Open Questions / Risks

| ID | Question / Risk | Impact | Suggested Mitigation |
|---|---|---|---|
| OQ-1 | **Villain as monster type:** Should the villain be modeled as a special `MonsterInstance` (reusing existing HP tracking, token rendering, and combat resolution) or as a separate `VillainInstance`? Using `MonsterInstance` reduces code duplication but requires the shield and multi-tactic logic to coexist cleanly with regular monster AI. **Note:** This decision is provisional — the `VillainDefinition` interface and `ScenarioState.villainInstanceId` (typed as `string \| null`) in this document are written to be compatible with either approach. If a separate `VillainInstance` is chosen, `villainInstanceId` would reference that type's store rather than the monsters slice. Resolve before beginning Stage 3 implementation. | Medium | Prototype both approaches for Stage 3; prefer `MonsterInstance` extension if the code remains clean. |
| OQ-2 | **Push mechanic (Vraxos Steam Vent):** No push/displacement mechanic exists in the current movement system. Adventure 15 requires pushing heroes 1 square away from the villain. | High | Define push as a targeted forced movement that uses existing `isValidMoveDestination` validation; treat it as instant (no hero action consumed). Needs movement system extension. |
| OQ-3 | **Immobilize mechanic (Vraxos Crushing Grip):** No "cannot move next Hero Phase" status effect exists. | Medium | Add a new `StatusEffectType` entry `'immobilized'` with duration 1 Hero Phase; integrate into `canMoveWithStatus`. |
| OQ-4 | **Volcanic Vent tile identification:** Tile definitions do not currently carry semantic type tags (e.g., `volcanic-vent`). Adventure 15 requires that tiles be identifiable at runtime. | Medium | Add an optional `terrainFeatures: string[]` field to tile definitions; populate for existing named tiles. |
| OQ-5 | **Multiple scenario hooks vs. power card hooks priority ordering:** Scenario hooks and power card hooks both use the same `EventHookState`. A scenario hook that modifies damage could conflict with Furious Assault (power card +1 damage). | Low | Assign scenario hooks a well-known priority band (e.g., 100–199) above power card hooks (0–99) so scenario modifiers apply after card effects. Document the priority convention. |
| OQ-6 | **"The Forge Awakens" monster doubling:** The current encounter resolution flow does not have a mechanism to double monster spawns from a single encounter card. | Medium | Pass a `monsterMultiplier` value through the encounter resolution pipeline; resolve in `encounters.ts`. |
| OQ-7 | **Chamber tile set layout:** The Horrid Chamber tile-set expansion (placing multiple tiles around the entrance) requires multi-tile placement logic that does not currently exist — the engine places one tile at a time. | High | Define a `ChamberLayout` object listing the relative positions of each companion tile; implement a `placeChamberLayout` action that iterates through them in a single reducer call. |
| OQ-8 | **HP scaling UI:** Villain HP that scales by hero count must be displayed and recomputed at game start. If the hero count changes (future feature), HP would need recalculation. | Low | Compute villain HP once at `initializeGame` time and store the resolved value in `ScenarioState`; no runtime recomputation needed. |
| OQ-9 | **Adventure 14 natural-1 hook fires even outside the chamber:** The "reflect your strike" rule applies "for the remainder of the game" after the chamber is revealed, meaning it fires on all subsequent turns, not only while in the chamber. The persistent modifier must survive after the chamber is left. | Low | Register the hook unconditionally once `chamber-reveal` fires, not as a "while-in-chamber" condition. |
| OQ-10 | **Saving and loading scenario-specific hooks:** Serialized game state currently does not include registered event hooks; they are reconstructed from power card state on load. Scenario hooks will need an equivalent reconstruction path. | Medium | Store `scenarioId` in persisted state; reconstruct scenario hooks by re-running `registerScenarioHooks` with the `ScenarioDefinition` on load, similar to power card hook rehydration. |
