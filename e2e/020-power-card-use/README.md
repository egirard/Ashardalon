# 020 - Power Card Use

This test verifies that players can use their attack power cards (at-will and daily powers with attack capabilities) during gameplay through the new power card attack interface.

## User Story

As a player, I want to select from my available attack power cards when attacking a monster, so that I can use my hero's special abilities with their specific attack bonus and damage values.

## Test Overview

### Test 1: Player can use at-will and daily attack power cards during gameplay

This test verifies:
- Power card attack panel appears when adjacent to a monster
- Available attack cards (with attackBonus) are shown in the panel
- Player can select an attack card and choose a target
- Combat uses the power card's attack bonus and damage
- At-will cards do NOT flip when used (can be reused)

### Test 2: Daily attack power cards flip when used

This test verifies:
- Daily cards with attack capabilities flip when used
- Flipped daily cards are no longer available for attacks

## Test Steps (Test 1)

1. **Hero With Powers Selected** - Quinn is selected with power cards
2. **Game Started** - Game starts with power cards finalized
3. **Attack Panel Visible** - Monster spawned, attack panel shows available attack cards
4. **At-Will Card Selected** - Player selects Cleric's Shield attack card
5. **At-Will Attack Result** - Combat resolves using power card stats (+6 attack bonus)

## Power Card Attack Interface

The new power card attack panel replaces the basic attack button and allows players to:

1. **View available attack cards** - Only unflipped cards with `attackBonus` are shown
2. **Select an attack card** - Click a card to select it
3. **Choose a target** - After selecting a card, available targets are shown
4. **Execute the attack** - The attack uses the card's stats (attackBonus, damage)

## Card Types

| Type | Flip Behavior | Description |
|------|--------------|-------------|
| At-Will | Does NOT flip | Can be used repeatedly every turn |
| Daily | Flips on use | Can only be used once per adventure |

## Manual Verification Checklist

- [ ] Power card attack panel appears when hero is adjacent to a monster
- [ ] Only cards with attack capabilities (attackBonus defined) are shown
- [ ] Card type badges (At-Will, Daily) are displayed correctly
- [ ] Attack bonus and damage are shown for each card
- [ ] Selecting a card highlights it and shows target selection
- [ ] Attacking with at-will cards does NOT flip them
- [ ] Attacking with daily cards DOES flip them
- [ ] Flipped cards are not shown in the attack panel

## Notes

This test focuses on attack power cards only. Utility cards and non-attack powers are not included in the attack interface.
