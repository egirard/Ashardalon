# 026 - Monster Card Tactics

## User Story

> As a player, during the Villain Phase, I see monsters behave according to their official card tactics - some monsters only attack when adjacent, while others move adjacent AND attack in the same turn.

## Feature Description

This test validates the implementation of monster card tactics from the official Wrath of Ashardalon monster cards. Each monster type has specific behaviors:

### Implemented Monster Tactics

| Monster | Tactic Type | Behavior |
|---------|-------------|----------|
| Kobold Dragonshield | `attack-only` | If adjacent: attack. Otherwise: move toward hero. |
| Snake | `move-and-attack` | If within 1 tile: move adjacent AND attack. Otherwise: move toward hero. |
| Human Cultist | `move-and-attack` | If within 1 tile: move adjacent AND attack. Otherwise: move toward hero. |

### Attack Stats (Per Monster Cards)

| Monster | Attack | Bonus | Damage |
|---------|--------|-------|--------|
| Kobold | Sword | +7 | 1 |
| Snake | Bite | +7 | 1 |
| Cultist | Dagger | +6 | 1 |

## Test Scenarios

### 1. Snake Move-and-Attack
- Snake at (2, 2), Hero at (2, 5)
- Snake is within 1 tile range
- Snake moves adjacent AND attacks in same turn

### 2. Kobold Attack-Only
- Kobold at (2, 2), Hero at (2, 5)
- Kobold is NOT adjacent
- Kobold only moves (does not attack)

### 3. Attack Stats Verification
- Kobold adjacent to hero
- Attack uses +7 bonus (per monster card)
- Damage is calculated correctly

## Screenshot Sequence

1. `000-initial-game-board.png` - Game board after starting
2. `001-villain-phase-snake-positioned.png` - Snake positioned within 1 tile of hero
3. `002-snake-attack-result.png` - Combat result after snake's move-and-attack
4. `003-snake-moved-and-attacked.png` - Final state showing snake adjacent to hero

## Manual Verification Checklist

- [ ] Snake moves to a position adjacent to the hero
- [ ] Snake attacks immediately after moving (same turn)
- [ ] Kobold only moves when not adjacent (doesn't attack)
- [ ] Attack bonuses match the monster card values

## Implementation Notes

### Partial Implementations
- **Status effects**: Poisoned (Snake, Cultist) not yet implemented - damage dealt but status not applied
- **Kobold exploration**: Rule to explore when on tile with unexplored edge not yet implemented

### Future Work (Complex Tactics)
The following monsters require more complex implementations and are documented for future PRs:

| Monster | Complexity | Notes |
|---------|------------|-------|
| Cave Bear | Area attack | Attacks ALL heroes on same tile |
| Duergar Guard | Exploration | Can explore from monster position |
| Gibbering Mouther | Area attack | Attacks ALL heroes within 1 tile |
| Grell | Conditions | Poisoned (adjacent), Dazed (within 1 tile) |
| Orc Archer | Ranged | 2-tile range attack, miss damage |
