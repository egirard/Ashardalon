# Issue: Select Heroes for Game

## User Story

> As a user, I can click heroes to select them (1-5 heroes), and I see a "Start Game" button that enables when at least one hero is selected.

## Acceptance Criteria

- [ ] Clicking an unselected hero selects it (visual change)
- [ ] Clicking a selected hero deselects it
- [ ] Selection count is displayed (e.g., "2/5 selected")
- [ ] "Start Game" button is disabled when 0 heroes selected
- [ ] "Start Game" button is enabled when 1-5 heroes are selected

## Design

### State Management

```typescript
// Svelte store for selected heroes
import { writable } from 'svelte/store';

export const selectedHeroes = writable<string[]>([]);

export function toggleHeroSelection(heroId: string): void {
  selectedHeroes.update(heroes => {
    if (heroes.includes(heroId)) {
      return heroes.filter(id => id !== heroId);
    }
    return [...heroes, heroId];
  });
}
```

### Components to Modify

1. **HeroCard.svelte** - Add selected state styling and click handler
2. **HeroSelectionScreen.svelte** - Add selection counter and Start Game button

### UI Layout

```
┌─────────────────────────────────────────┐
│         Wrath of Ashardalon             │
│              2/5 selected               │
│                                         │
│  ┌─────┐ ┌═════┐ ┌─────┐ ┌═════┐ ┌─────┐│
│  │Hero │ ║Hero ║ │Hero │ ║Hero ║ │Hero ││
│  │     │ ║ ✓   ║ │     │ ║ ✓   ║ │     ││
│  │Quinn│ ║Vistr║ │Keyle│ ║Tarak║ │Haska││
│  └─────┘ └═════┘ └─────┘ └═════┘ └─────┘│
│                                         │
│            [ Start Game ]               │
│                                         │
└─────────────────────────────────────────┘

Legend:
═════ = Selected hero (highlighted border)
✓ = Selection indicator
```

### Visual States

| State | Border | Background | Indicator |
|-------|--------|------------|-----------|
| Unselected | Gray | Transparent | None |
| Selected | Gold/Yellow | Light highlight | Checkmark |
| Hover | Slightly brighter | - | - |

## Implementation Tasks

- [ ] Create selectedHeroes Svelte store
- [ ] Add click handler to HeroCard component
- [ ] Add selected state styling to HeroCard
- [ ] Add selection indicator (checkmark) to selected cards
- [ ] Create selection counter component
- [ ] Create Start Game button component
- [ ] Implement button disabled/enabled logic based on selection count

## Unit Tests

- [ ] toggleHeroSelection adds hero to selection
- [ ] toggleHeroSelection removes hero if already selected
- [ ] Selection count is accurate
- [ ] Cannot select more than 5 heroes (implicit - only 5 available)

## E2E Test (Test 002)

```gherkin
Feature: Select Heroes for Game

  Scenario: User selects and deselects heroes
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

### Screenshot Sequence

1. `002-01-no-selection.png` - Initial state with no heroes selected
2. `002-02-one-selected.png` - One hero selected, button enabled
3. `002-03-two-selected.png` - Two heroes selected
4. `002-04-deselect.png` - After deselecting one hero

## Dependencies

- Issue #001 (View Hero Selection Screen)

## Labels

`user-story`, `phase-1`, `ui`, `state-management`
