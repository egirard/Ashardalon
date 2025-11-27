# Implementation Plan

## Wrath of Ashardalon - Web Implementation

This document provides a detailed implementation plan organized around user stories. Each user story represents a vertical slice of functionality that is directly visible and verifiable by the end user, captured by an end-to-end test.

---

## Table of Contents

1. [Document Overview](#document-overview)
2. [User Story 1: View Application](#user-story-1-view-application)
3. [User Story 2: View Hero Selection Screen](#user-story-2-view-hero-selection-screen)
4. [User Story 3: Select Heroes for Game](#user-story-3-select-heroes-for-game)
5. [User Story 4: Start Game and See Board](#user-story-4-start-game-and-see-board)
6. [User Story 5: See Hero Positions on Start Tile](#user-story-5-see-hero-positions-on-start-tile)
7. [User Story 6: See Current Turn Indicator](#user-story-6-see-current-turn-indicator)
8. [User Story 7: Move a Hero](#user-story-7-move-a-hero)
9. [User Story 8: Explore and Place New Tile](#user-story-8-explore-and-place-new-tile)
10. [User Story 9: Spawn Monster on Exploration](#user-story-9-spawn-monster-on-exploration)
11. [User Story 10: Hero Attacks Monster](#user-story-10-hero-attacks-monster)
12. [User Story 11: Monster Attacks Hero](#user-story-11-monster-attacks-hero)
13. [User Story 12: Defeat Monster and Gain XP](#user-story-12-defeat-monster-and-gain-xp)
14. [User Story 13: Draw Treasure on Monster Defeat](#user-story-13-draw-treasure-on-monster-defeat)
15. [User Story 14: Draw Encounter Card](#user-story-14-draw-encounter-card)
16. [User Story 15: Use Healing Surge](#user-story-15-use-healing-surge)
17. [User Story 16: Cancel Encounter with XP](#user-story-16-cancel-encounter-with-xp)
18. [User Story 17: Level Up Hero](#user-story-17-level-up-hero)
19. [User Story 18: Complete Turn Cycle](#user-story-18-complete-turn-cycle)
20. [User Story 19: Party Defeat](#user-story-19-party-defeat)
21. [User Story 20: Win Adventure](#user-story-20-win-adventure)
22. [Future User Stories](#future-user-stories)

---

## Document Overview

### Purpose

This implementation plan uses user stories to define small, cohesive vertical slices of functionality. Each story delivers user-visible value and can be independently verified through end-to-end tests.

### Guiding Principles

- **User-Visible Value**: Each story delivers something the user can see and interact with
- **Vertical Slices**: Each story includes all layers needed (UI, state, logic) but nothing more
- **Just-In-Time Types**: Introduce types and components only when required by a story
- **E2E Testable**: Each story is verified by a Playwright end-to-end test
- **Minimal Scope**: Each story does the smallest useful thing

### Technology Stack

| Technology | Purpose |
|------------|---------|
| TypeScript | Type-safe development |
| Svelte | UI framework |
| Vite | Build tool and development server |
| Bun | JavaScript runtime and package manager |
| Playwright | End-to-end testing |
| GitHub Pages | Deployment platform |

---

## User Story 1: View Application

### Story

> As a user, I can open the application in my browser and see a welcome screen, so that I know the application is working.

### Acceptance Criteria

- Application loads at the root URL
- A welcome screen is displayed with the game title "Wrath of Ashardalon"
- A "New Game" button is visible

### Implementation Scope

**Introduce**:
- Vite project with Svelte and TypeScript
- Basic App.svelte component
- Playwright test configuration

**Build**:
- Welcome screen with title text
- "New Game" button (not yet functional)
- Basic CSS styling

### E2E Test

```
Given I navigate to the application URL
Then I see the title "Wrath of Ashardalon"
And I see a "New Game" button
```

---

## User Story 2: View Hero Selection Screen

### Story

> As a user, I can click "New Game" and see the hero selection screen with all five heroes displayed, so that I can choose which heroes to play.

### Acceptance Criteria

- Clicking "New Game" navigates to hero selection screen
- All 5 heroes are displayed with their images
- Each hero shows their name and class
- Heroes appear unselected initially

### Implementation Scope

**Introduce**:
- Simple routing (can be basic state-based, no router library needed)
- Hero data (just names, classes, and image paths for these 5 heroes)

**Build**:
- Hero selection screen layout
- Hero card component showing image, name, and class
- Navigation from welcome screen

### E2E Test

```
Given I am on the welcome screen
When I click "New Game"
Then I see the hero selection screen
And I see 5 hero cards
And each card shows the hero's image, name, and class
And all heroes appear unselected
```

---

## User Story 3: Select Heroes for Game

### Story

> As a user, I can click heroes to select them (1-5 heroes), and I see a "Start Game" button that enables when at least one hero is selected.

### Acceptance Criteria

- Clicking an unselected hero selects it (visual change)
- Clicking a selected hero deselects it
- Selection count is displayed (e.g., "2/5 selected")
- "Start Game" button is disabled when 0 heroes selected
- "Start Game" button is enabled when 1-5 heroes are selected

### Implementation Scope

**Introduce**:
- Simple application state (can be Svelte stores, no Redux needed yet)
- Selected heroes array

**Build**:
- Hero selection toggle behavior
- Selection counter display
- Start Game button with enabled/disabled states

### E2E Test

```
Given I am on the hero selection screen
Then the "Start Game" button is disabled
When I click on "Quinn"
Then Quinn appears selected
And I see "1/5 selected"
And the "Start Game" button is enabled
When I click on "Vistra"
Then both Quinn and Vistra appear selected
And I see "2/5 selected"
When I click on "Quinn" again
Then Quinn appears unselected
And I see "1/5 selected"
```

---

## User Story 4: Start Game and See Board

### Story

> As a user, I can click "Start Game" and see the game board with the Start Tile displayed, so that I can begin playing.

### Acceptance Criteria

- Clicking "Start Game" transitions to the game board screen
- The Start Tile image is displayed
- The dungeon board area is visible

### Implementation Scope

**Introduce**:
- Game board screen component
- Start tile asset reference

**Build**:
- Game board screen layout
- Start Tile rendering
- Navigation from hero selection

### E2E Test

```
Given I am on the hero selection screen
And I have selected 2 heroes
When I click "Start Game"
Then I see the game board screen
And I see the Start Tile displayed
```

---

## User Story 5: See Hero Positions on Start Tile

### Story

> As a user, I can see the selected hero tokens positioned on the Start Tile around the staircase, so that I know where my heroes are located.

### Acceptance Criteria

- Each selected hero has a visible token on the Start Tile
- Tokens are positioned around the staircase area
- Each token is visually distinct (shows hero identity)
- No two heroes occupy the same position

### Implementation Scope

**Introduce**:
- Hero position state (tile + square coordinates)
- Starting position logic

**Build**:
- Hero token component
- Token positioning on tile
- Random starting position assignment

### E2E Test

```
Given I have selected Quinn and Vistra
When I start the game
Then I see Quinn's token on the Start Tile
And I see Vistra's token on the Start Tile
And the tokens are in different positions
And both tokens are near the staircase
```

---

## User Story 6: See Current Turn Indicator

### Story

> As a user, I can see whose turn it is and what phase we're in, so that I know who should act next.

### Acceptance Criteria

- The current hero's name is displayed
- The current phase is displayed (Hero Phase initially)
- The active hero's token is visually highlighted on the board

### Implementation Scope

**Introduce**:
- Turn order state
- Current player/phase state

**Build**:
- Turn indicator UI component
- Active hero highlighting

### E2E Test

```
Given I have started a game with Quinn and Vistra
Then I see a turn indicator showing the first hero's name
And I see "Hero Phase" displayed
And the first hero's token is highlighted on the board
```

---

## User Story 7: Move a Hero

### Story

> As a user, I can select a movement destination for my hero and see them move there, so that I can explore the dungeon.

### Acceptance Criteria

- Clicking on the board shows valid movement squares highlighted
- Valid squares are within the hero's movement speed
- Clicking a valid square moves the hero token there
- The hero's position updates visually
- Movement cannot pass through walls

### Implementation Scope

**Introduce**:
- Hero speed stat (just for selected heroes)
- Movement calculation logic
- Position update state management

**Build**:
- Movement range highlighting
- Click-to-move interaction
- Position state update

### E2E Test

```
Given it is Quinn's turn in the Hero Phase
And Quinn has speed 6
When I click on the board near Quinn
Then I see valid movement squares highlighted
When I click on a highlighted square
Then Quinn's token moves to that square
And Quinn's token is now in the new position
```

---

## User Story 8: Explore and Place New Tile

### Story

> As a user, when my hero ends movement on an unexplored edge, I see a new tile drawn and placed, expanding the dungeon.

### Acceptance Criteria

- Unexplored edges are visually indicated
- When hero ends movement adjacent to an unexplored edge, exploration triggers
- A new tile appears connected to the unexplored edge
- The tile deck count decreases

### Implementation Scope

**Introduce**:
- Tile deck (just the basic tile images needed)
- Unexplored edge tracking
- Tile placement logic

**Build**:
- Unexplored edge visual indicator
- Tile drawing and placement
- Exploration trigger detection

### E2E Test

```
Given it is Quinn's turn
And Quinn is adjacent to an unexplored edge
When Quinn moves onto the unexplored edge
Then a new tile appears connected to that edge
And the unexplored edge is now explored
```

---

## User Story 9: Spawn Monster on Exploration

### Story

> As a user, when a new tile is placed, I see a monster appear on it, so that I have something to fight.

### Acceptance Criteria

- After a tile is placed, a monster token appears on it
- The monster's name is displayed
- A monster card is shown with basic stats (AC, HP)

### Implementation Scope

**Introduce**:
- Monster deck (start with a few monster types)
- Monster data (name, AC, HP, image)
- Monster position state

**Build**:
- Monster token component
- Monster card display
- Monster spawning on tile placement

### E2E Test

```
Given Quinn just placed a new tile through exploration
Then a monster token appears on the new tile
And I see a monster card displayed showing the monster's name
And the monster card shows AC and HP values
```

---

## User Story 10: Hero Attacks Monster

### Story

> As a user, I can attack an adjacent monster with my hero's basic attack, roll a d20, and see if I hit or miss.

### Acceptance Criteria

- When adjacent to a monster, an "Attack" option is available
- Clicking attack shows the d20 roll result
- The attack hits if roll + bonus >= monster AC
- On hit, damage is applied and monster HP decreases
- Hit or miss result is clearly displayed

### Implementation Scope

**Introduce**:
- Hero attack bonus and damage (basic attack only)
- Dice rolling logic
- Combat resolution

**Build**:
- Attack action UI
- Dice roll display
- Damage application to monster

### E2E Test

```
Given Quinn is adjacent to a Kobold with AC 14 and HP 1
When I click "Attack"
Then I see a d20 roll result
And I see whether the attack hit or missed
When the attack hits
Then the Kobold's HP decreases by Quinn's damage
```

---

## User Story 11: Monster Attacks Hero

### Story

> As a user, during the Villain Phase, I see monsters move toward heroes and attack them, reducing hero HP.

### Acceptance Criteria

- After hero actions, the Villain Phase begins
- Monsters move toward the closest hero
- Adjacent monsters attack heroes
- Attack results are displayed
- Hero HP decreases on hit

### Implementation Scope

**Introduce**:
- Hero HP and AC stats
- Monster attack stats
- Basic monster AI (move toward, attack if adjacent)
- Villain Phase flow

**Build**:
- Monster movement animation
- Monster attack resolution
- Hero HP tracking and display

### E2E Test

```
Given a Kobold is on the board
When the Villain Phase begins
Then the Kobold moves toward the nearest hero
When the Kobold is adjacent to Quinn
Then the Kobold attacks Quinn
And I see the attack roll result
When the attack hits
Then Quinn's HP decreases
```

---

## User Story 12: Defeat Monster and Gain XP

### Story

> As a user, when I reduce a monster to 0 HP, it is removed from the board and I gain experience points.

### Acceptance Criteria

- When monster HP reaches 0, it is defeated
- Defeated monster token is removed from board
- XP is added to party total
- XP total is displayed to user

### Implementation Scope

**Introduce**:
- Monster XP value
- Party XP pool state

**Build**:
- Monster defeat detection
- Monster removal animation
- XP display

### E2E Test

```
Given a Kobold with 1 HP is adjacent to Quinn
When Quinn attacks and hits
Then the Kobold is removed from the board
And the party XP increases by the Kobold's XP value
And I see the updated XP total
```

---

## User Story 13: Draw Treasure on Monster Defeat

### Story

> As a user, when I defeat a monster, I draw a treasure card and can see what I got.

### Acceptance Criteria

- On monster defeat, a treasure card is drawn
- The treasure card is displayed showing the item
- The item is added to a hero's inventory

### Implementation Scope

**Introduce**:
- Treasure deck (start with a few item types)
- Treasure card data
- Hero inventory state

**Build**:
- Treasure draw trigger
- Treasure card display
- Inventory UI

### E2E Test

```
Given Quinn just defeated a monster
Then a treasure card is drawn
And I see the treasure card displayed
And the item appears in a hero's inventory
```

---

## User Story 14: Draw Encounter Card

### Story

> As a user, when no tile is placed during my turn, I draw an encounter card and see its effect.

### Acceptance Criteria

- If hero didn't explore (no new tile), an encounter card is drawn during Villain Phase
- The encounter card is displayed
- The encounter effect is described

### Implementation Scope

**Introduce**:
- Encounter deck (start with a few event types)
- Encounter card data
- Encounter trigger logic

**Build**:
- Encounter draw trigger
- Encounter card display
- Basic encounter resolution

### E2E Test

```
Given Quinn moved but did not explore a new tile
When the Villain Phase begins
Then an encounter card is drawn
And I see the encounter card displayed
And I see the effect description
```

---

## User Story 15: Use Healing Surge

### Story

> As a user, when a hero is at 0 HP at the start of their turn, a healing surge is automatically used to heal them.

### Acceptance Criteria

- Party starts with 2 healing surges
- Healing surge count is displayed
- When hero at 0 HP starts turn, surge is used automatically
- Hero HP is restored to their surge value
- Surge count decreases by 1

### Implementation Scope

**Introduce**:
- Healing surge token count
- Hero surge value stat
- Auto-heal logic at turn start

**Build**:
- Healing surge display
- Auto-heal UI feedback
- Surge consumption

### E2E Test

```
Given the party has 2 healing surges
And Quinn has 0 HP
When Quinn's turn begins
Then a healing surge is used automatically
And Quinn's HP is restored
And the healing surge count is now 1
```

---

## User Story 16: Cancel Encounter with XP

### Story

> As a user, when an encounter card is drawn, I can spend 5 XP to cancel it.

### Acceptance Criteria

- When encounter is drawn, a "Cancel (5 XP)" option appears
- Option is only available if party has 5+ XP
- Clicking cancel discards the encounter
- 5 XP is deducted from party total

### Implementation Scope

**Introduce**:
- XP spending logic
- Encounter cancellation

**Build**:
- Cancel encounter button
- XP deduction
- Encounter discard

### E2E Test

```
Given the party has 6 XP
And an encounter card was just drawn
Then I see a "Cancel (5 XP)" button
When I click "Cancel (5 XP)"
Then the encounter card is discarded
And the party XP is now 1
```

---

## User Story 17: Level Up Hero

### Story

> As a user, when I roll a natural 20 and have 5+ XP, my hero levels up to 2nd level.

### Acceptance Criteria

- On natural 20 attack roll with 5+ XP available, level up triggers
- Hero card flips to show 2nd level stats
- HP, AC, and other stats increase
- 5 XP is spent

### Implementation Scope

**Introduce**:
- Hero level 2 stats
- Level up trigger detection
- Hero card flip display

**Build**:
- Natural 20 detection
- Level up state change
- Updated hero display

### E2E Test

```
Given the party has 5 XP
And Quinn is level 1
When Quinn attacks and rolls a natural 20
Then Quinn levels up to level 2
And Quinn's stats increase
And the party XP is now 0
```

---

## User Story 18: Complete Turn Cycle

### Story

> As a user, after all phases complete, the turn passes to the next hero, so that each player gets to act.

### Acceptance Criteria

- After Villain Phase ends, turn passes to next hero
- Turn indicator updates to show new active hero
- New hero can take their Hero Phase actions
- After all heroes have gone, cycle returns to first hero

### Implementation Scope

**Introduce**:
- Turn progression logic
- Full turn cycle tracking

**Build**:
- Turn end trigger
- Turn indicator update
- Cycle tracking

### E2E Test

```
Given Quinn and Vistra are in the game
And it is Quinn's turn
When Quinn completes Hero Phase and Villain Phase ends
Then it becomes Vistra's turn
And the turn indicator shows Vistra
When Vistra completes her turn
Then it becomes Quinn's turn again
```

---

## User Story 19: Party Defeat

### Story

> As a user, if a hero is at 0 HP and no healing surges remain, the party is defeated and I see a defeat screen.

### Acceptance Criteria

- When hero at 0 HP with 0 surges starts turn, game ends
- Defeat screen is displayed
- Option to start new game is provided

### Implementation Scope

**Introduce**:
- Defeat condition check
- Defeat screen component

**Build**:
- Defeat detection at turn start
- Defeat screen display
- New game option

### E2E Test

```
Given the party has 0 healing surges
And Quinn has 0 HP
When Quinn's turn would begin
Then I see a defeat screen
And I see a "New Game" button
```

---

## User Story 20: Win Adventure

### Story

> As a user, when I complete the adventure objective, I see a victory screen showing that I won.

### Acceptance Criteria

- Adventure has a clear objective (e.g., defeat specific villain)
- When objective is met, victory triggers
- Victory screen is displayed
- Option to start new game is provided

### Implementation Scope

**Introduce**:
- Adventure objective definition
- Victory condition check
- Victory screen component

**Build**:
- Objective tracking
- Victory detection
- Victory screen display

### E2E Test

```
Given the adventure objective is to defeat Meerak
When the party defeats Meerak
Then I see a victory screen
And I see "Victory!" displayed
And I see a "New Game" button
```

---

## Future User Stories

The following user stories represent additional features to implement after the core gameplay loop is complete:

### Combat Enhancements
- **Use Power Cards**: Select and use hero power cards with different effects
- **Critical Hits**: Deal bonus damage on natural 20s (2nd level heroes)
- **Area Attacks**: Target multiple enemies with area powers

### Advanced Exploration
- **Long Hallway Tile**: Place additional tile when Long Hallway is drawn
- **Chamber Encounters**: Handle special chamber tiles and encounters
- **Door Mechanics**: Open, unlock, and handle trapped doors

### Resource Management
- **Equip Items**: Assign treasure items to specific heroes
- **Use Consumables**: Activate one-time use treasure cards
- **Item Bonuses**: Apply attack and defense bonuses from equipment

### Game Management
- **Save Game**: Export game state to file
- **Load Game**: Import and resume a saved game
- **Game Log**: View history of game events

### Polish
- **Movement Animation**: Smooth token movement animations
- **Sound Effects**: Audio feedback for game events
- **Dice Animation**: Visual dice roll animation

---

## Story Dependencies

```
Story 1: View Application
    │
    └─→ Story 2: View Hero Selection
            │
            └─→ Story 3: Select Heroes
                    │
                    └─→ Story 4: Start Game and See Board
                            │
                            └─→ Story 5: See Hero Positions
                                    │
                                    └─→ Story 6: See Turn Indicator
                                            │
                                            └─→ Story 7: Move a Hero
                                                    │
                                                    ├─→ Story 8: Explore and Place Tile
                                                    │       │
                                                    │       └─→ Story 9: Spawn Monster
                                                    │               │
                                                    │               └─→ Story 10: Hero Attacks Monster
                                                    │                       │
                                                    │                       └─→ Story 12: Defeat Monster & XP
                                                    │                               │
                                                    │                               ├─→ Story 13: Draw Treasure
                                                    │                               │
                                                    │                               └─→ Story 17: Level Up Hero
                                                    │
                                                    └─→ Story 11: Monster Attacks Hero
                                                            │
                                                            ├─→ Story 15: Use Healing Surge
                                                            │       │
                                                            │       └─→ Story 19: Party Defeat
                                                            │
                                                            └─→ Story 14: Draw Encounter
                                                                    │
                                                                    └─→ Story 16: Cancel Encounter

Story 18: Complete Turn Cycle (requires Stories 7, 11, 14)
Story 20: Win Adventure (requires Story 12)
```

---

## Summary

This implementation plan delivers the game through small, user-visible increments:

1. **Stories 1-6**: Get to a visible game board with heroes positioned
2. **Stories 7-9**: Enable basic exploration and dungeon building
3. **Stories 10-13**: Implement core combat loop
4. **Stories 14-17**: Add resource management mechanics
5. **Stories 18-20**: Complete the game flow with turn cycling and win/lose conditions

Each story introduces only what is needed at that moment—no premature abstractions, no unused types. The result is a series of vertical slices that can be demonstrated and tested independently.

---

*This implementation plan is a living document and may be updated as development progresses and requirements evolve.*
