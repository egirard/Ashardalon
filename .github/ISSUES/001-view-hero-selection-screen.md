# Issue: View Hero Selection Screen

## User Story

> As a user, I can open the application and see the hero selection screen with all five heroes displayed, so that I can choose which heroes to play.

## Acceptance Criteria

- [ ] Application loads at the root URL showing the hero selection screen
- [ ] All 5 heroes are displayed with their images
- [ ] Each hero shows their name and class
- [ ] Heroes appear unselected initially

## Design

### Components to Create

1. **App.svelte** - Main application component
2. **HeroSelectionScreen.svelte** - Container for the hero selection UI
3. **HeroCard.svelte** - Individual hero card displaying image, name, and class

### Data Model

```typescript
interface Hero {
  id: string;
  name: string;
  class: string;
  imagePath: string;
}
```

### Hero Data

| Hero | Class | Image |
|------|-------|-------|
| Quinn | Cleric | quinn.png |
| Vistra | Fighter | vistra.png |
| Keyleth | Paladin | keyleth.png |
| Tarak | Rogue | tarak.png |
| Haskan | Wizard | haskan.png |

### UI Layout

```
┌─────────────────────────────────────────┐
│         Wrath of Ashardalon             │
│                                         │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐│
│  │Hero │ │Hero │ │Hero │ │Hero │ │Hero ││
│  │Image│ │Image│ │Image│ │Image│ │Image││
│  │     │ │     │ │     │ │     │ │     ││
│  │Quinn│ │Vistr│ │Keyle│ │Tarak│ │Haska││
│  │Cleri│ │Fight│ │Palad│ │Rogue│ │Wizar││
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘│
│                                         │
└─────────────────────────────────────────┘
```

## Implementation Tasks

- [ ] Initialize Vite project with Svelte and TypeScript
- [ ] Set up Playwright test configuration
- [ ] Create hero data file with 5 heroes
- [ ] Create HeroCard.svelte component
- [ ] Create HeroSelectionScreen.svelte component
- [ ] Style hero cards with unselected state
- [ ] Add hero images to assets folder

## Unit Tests

- [ ] Hero data contains exactly 5 heroes
- [ ] Each hero has required properties (id, name, class, imagePath)
- [ ] HeroCard component renders hero name and class

## E2E Test (Test 001)

```gherkin
Feature: View Hero Selection Screen

  Scenario: User sees hero selection on app load
    Given I navigate to the application URL
    Then I see the hero selection screen
    And I see 5 hero cards
    And each card shows the hero's image, name, and class
    And all heroes appear unselected
```

### Screenshot Sequence

1. `001-01-initial-load.png` - Application loaded with hero selection screen
2. `001-02-hero-cards-visible.png` - All 5 hero cards visible
3. `001-03-hero-details.png` - Close-up showing hero name and class

## Dependencies

- None (this is the first story)

## Labels

`user-story`, `phase-1`, `ui`, `setup`
