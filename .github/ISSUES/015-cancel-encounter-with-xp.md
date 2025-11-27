# Issue: Cancel Encounter with XP

## User Story

> As a user, when an encounter card is drawn, I can spend 5 XP to cancel it.

## Acceptance Criteria

- [ ] When encounter is drawn, a "Cancel (5 XP)" option appears
- [ ] Option is only available if party has 5+ XP
- [ ] Clicking cancel discards the encounter
- [ ] 5 XP is deducted from party total

## Design

### Data Model

```typescript
const ENCOUNTER_CANCEL_COST = 5;

interface CancelEncounterAction {
  type: 'cancel-encounter';
  encounterId: string;
}
```

### Cancel Logic

```typescript
function canCancelEncounter(resources: PartyResources): boolean {
  return resources.xp >= ENCOUNTER_CANCEL_COST;
}

function cancelEncounter(
  encounter: EncounterCard,
  resources: PartyResources,
  encounterDeck: EncounterDeck
): { resources: PartyResources; encounterDeck: EncounterDeck } {
  return {
    resources: {
      ...resources,
      xp: resources.xp - ENCOUNTER_CANCEL_COST,
    },
    encounterDeck: {
      ...encounterDeck,
      discardPile: [...encounterDeck.discardPile, encounter.id],
    },
  };
}
```

### Components to Modify

1. **EncounterCard.svelte** - Add cancel button
2. **EncounterResolver.svelte** - Handle cancel action

### UI Layout

```
┌──────────────────────────────────────────────────┐
│  Turn 1 - Villain Phase | Encounter    XP: 6    │
├──────────────────────────────────────────────────┤
│                                                  │
│              ┌─────────────────────┐             │
│              │   Volcanic Spray    │             │
│              │   ┌───────────┐     │             │
│              │   │   🌋      │     │             │
│              │   └───────────┘     │             │
│              │   Type: Event       │             │
│              │                     │             │
│              │   Each hero takes   │             │
│              │   1 damage.         │             │
│              │                     │             │
│              │ [ Cancel (5 XP) ]   │  ← Enabled │
│              │ [ Accept ]          │             │
│              └─────────────────────┘             │
│                                                  │
└──────────────────────────────────────────────────┘

When XP < 5:

│              │ [ Cancel (5 XP) ]   │  ← Disabled│
```

### Cancel Flow

1. Encounter card drawn
2. Encounter card displayed
3. If party XP >= 5:
   - "Cancel (5 XP)" button enabled
   - Player can click to cancel
4. If player cancels:
   - Deduct 5 XP
   - Discard encounter card
   - Skip encounter effect
   - Show confirmation
5. If player accepts:
   - Resolve encounter normally

## Implementation Tasks

- [ ] Add ENCOUNTER_CANCEL_COST constant
- [ ] Implement canCancelEncounter function
- [ ] Implement cancelEncounter function
- [ ] Add "Cancel (5 XP)" button to EncounterCard
- [ ] Enable/disable button based on XP
- [ ] Handle cancel action
- [ ] Update XP counter on cancel
- [ ] Discard encounter card
- [ ] Skip encounter resolution on cancel

## Unit Tests

- [ ] canCancelEncounter returns true when XP >= 5
- [ ] canCancelEncounter returns false when XP < 5
- [ ] cancelEncounter deducts 5 XP
- [ ] cancelEncounter adds encounter to discard pile
- [ ] Encounter effect not applied when cancelled

## E2E Test (Test 015)

```gherkin
Feature: Cancel Encounter with XP

  Scenario: Player cancels encounter by spending XP
    Given the party has 6 XP
    And an encounter card was just drawn
    Then I see a "Cancel (5 XP)" button
    When I click "Cancel (5 XP)"
    Then the encounter card is discarded
    And the party XP is now 1
```

### Screenshot Sequence

1. `015-01-encounter-with-xp.png` - Encounter drawn, party has 6 XP
2. `015-02-cancel-button.png` - Cancel button highlighted
3. `015-03-cancel-clicked.png` - After clicking cancel
4. `015-04-xp-deducted.png` - XP now shows 1

## Dependencies

- Issue #013 (Draw Encounter Card)
- Issue #011 (Defeat Monster and Gain XP) - XP tracking

## Labels

`user-story`, `phase-4`, `gameplay`, `encounters`, `xp`
