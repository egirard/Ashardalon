# 122 - Valiant Strike Adjacent Bonus

## User story

A player selects Keyleth, starts a game, becomes adjacent to two monsters, confirms that Valiant Strike shows its live bonus breakdown as `+8 +2 = +10` in the dashboard/details UI, and then attacks to verify the combat result uses the same total bonus.

## Screenshot 000 - Hero selected

![Hero selected](122-valiant-strike-adjacent-bonus.spec.ts-snapshots/000-hero-selected-chromium-linux.png)

Confirms Keyleth is selected from the bottom edge and the game is ready to start.

## Screenshot 001 - Valiant Strike bonus scaled

![Valiant Strike bonus scaled](122-valiant-strike-adjacent-bonus.spec.ts-snapshots/001-valiant-strike-bonus-scaled-chromium-linux.png)

Confirms two adjacent monsters make Valiant Strike display `+10` in the mini card and the explicit `+8 +2 = +10` breakdown in the expanded attack section and details panel.

## Screenshot 002 - Valiant Strike attack result

![Valiant Strike attack result](122-valiant-strike-adjacent-bonus.spec.ts-snapshots/002-valiant-strike-attack-result-chromium-linux.png)

Confirms the attack roll breakdown uses the same `+10` bonus during combat resolution.

## Manual verification checklist

- [ ] Keyleth has Valiant Strike available in the active power card list
- [ ] Two adjacent monsters raise Valiant Strike from `+8` to `+8 +2 = +10`
- [ ] The details panel and expanded attack view match the mini-card bonus
- [ ] The combat result popup shows the same `+10` bonus after the attack
