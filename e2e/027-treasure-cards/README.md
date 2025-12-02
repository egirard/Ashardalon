# 027 - Treasure Cards

This test verifies the treasure card system in the Wrath of Ashardalon game.

## User Story

As a player, when I defeat a monster, I should be able to:
1. Draw a treasure card from the treasure deck
2. View the treasure card's details (name, effect, rule)
3. Assign the treasure to any hero in the party
4. Or discard the treasure if I don't want it
5. Only draw one treasure per turn

## Test Scenarios

### Scenario 1: Draw and Assign Treasure
A player defeats a monster, draws a treasure card, views its details, and assigns it to their hero's inventory.

### Scenario 2: Discard Treasure
A player defeats a monster, draws a treasure card, and chooses to discard it instead of assigning it.

### Scenario 3: One Treasure Per Turn
Verifies that only one treasure can be drawn per turn, even if multiple monsters are defeated.

### Scenario 4: Treasure Flag Resets
Verifies that the treasure-drawn-this-turn flag resets at the start of a new turn.

## Screenshot Sequence

### Test 1: Hero defeats monster, draws treasure, and assigns it to inventory

| Step | Description | Screenshot |
|------|-------------|------------|
| 000 | Initial game state with hero and empty inventory | ![000](screenshots/027-treasure-cards-Hero-defeats-monster--draws-treasure--and-assigns-it-to-inventory-chromium-linux/000-initial-game-state.png) |
| 001 | Monster positioned adjacent to hero | ![001](screenshots/027-treasure-cards-Hero-defeats-monster--draws-treasure--and-assigns-it-to-inventory-chromium-linux/001-monster-adjacent-to-hero.png) |
| 002 | Attack defeats the monster | ![002](screenshots/027-treasure-cards-Hero-defeats-monster--draws-treasure--and-assigns-it-to-inventory-chromium-linux/002-attack-defeats-monster.png) |
| 003 | Treasure card modal displayed | ![003](screenshots/027-treasure-cards-Hero-defeats-monster--draws-treasure--and-assigns-it-to-inventory-chromium-linux/003-treasure-card-modal-displayed.png) |
| 004 | Treasure assigned to hero's inventory | ![004](screenshots/027-treasure-cards-Hero-defeats-monster--draws-treasure--and-assigns-it-to-inventory-chromium-linux/004-treasure-assigned-to-hero.png) |

### Test 2: Player can discard treasure instead of assigning it

| Step | Description | Screenshot |
|------|-------------|------------|
| 000 | Treasure card displayed with discard option | ![000](screenshots/027-treasure-cards-Player-can-discard-treasure-instead-of-assigning-it-chromium-linux/000-treasure-card-before-discard.png) |
| 001 | After discarding treasure | ![001](screenshots/027-treasure-cards-Player-can-discard-treasure-instead-of-assigning-it-chromium-linux/001-treasure-discarded.png) |

## Verification Checklist

- [ ] Treasure deck is initialized at game start
- [ ] Hero inventories are empty at game start
- [ ] Defeating a monster draws a treasure card
- [ ] Treasure card modal displays correctly with:
  - [ ] Card name
  - [ ] Card type/usage (Play Immediately, Use Action, etc.)
  - [ ] Card effect summary (+1 Attack, +1 AC, etc.)
  - [ ] Card rule text
  - [ ] Assign buttons for each hero
  - [ ] Discard button
- [ ] Assigning treasure adds it to hero inventory
- [ ] Discarding treasure puts it in discard pile
- [ ] Only one treasure is drawn per turn
- [ ] Treasure-drawn flag resets at new turn
