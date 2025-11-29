# E2E Test 016: Level Up Hero

## User Story

> As a user, when I roll a natural 20 and have 5+ XP, my hero levels up to 2nd level.

## Test Scenarios

### Scenario 1: Hero levels up on natural 20 with 5+ XP
A hero at level 1 with 5 or more XP attacks and rolls a natural 20, triggering a level up.

### Scenario 2: Level up does not trigger without enough XP
A hero attacks with a natural 20 but only has 4 XP (not enough for level up).

### Scenario 3: Level up does not trigger on non-20 roll
A hero with plenty of XP attacks but rolls a 15 (not a natural 20).

### Scenario 4: Level 2 hero cannot level up again
A hero already at level 2 cannot level up again even with a natural 20 and 5+ XP.

## Screenshot Sequence

### Test 1: Hero levels up on natural 20 with 5+ XP

1. **000-initial-5-xp.png** - Game started with Quinn, party has 5 XP
2. **001-monster-adjacent.png** - Kobold monster adjacent to Quinn
3. **002-natural-20-rolled.png** - Quinn rolls a natural 20! Critical hit!
4. **003-level-up-notification.png** - Level up notification shows stat increases
5. **004-level-2-confirmed.png** - Quinn is now Level 2, XP is 0

## Screenshots

### 000 - Initial Game Board with 5 XP
![Screenshot 000](screenshots/000-initial-5-xp-chromium-linux.png)

Quinn starts at level 1 with 5 XP available for potential level up.

### 001 - Monster Adjacent
![Screenshot 001](screenshots/001-monster-adjacent-chromium-linux.png)

A Kobold monster is placed adjacent to Quinn for the attack.

### 002 - Natural 20 Rolled
![Screenshot 002](screenshots/002-natural-20-rolled-chromium-linux.png)

Quinn attacks and rolls a natural 20! This triggers:
- Critical hit
- Monster defeated
- Level up (because level 1 hero + 5 XP + natural 20)

### 003 - Level Up Notification
![Screenshot 003](screenshots/003-level-up-notification-chromium-linux.png)

The level up notification shows:
- Hero name advancing to Level 2
- Stat increases (HP, AC, Surge, Attack)
- XP spent (5 XP)
- Critical attack bonus unlocked (+1 damage on nat 20)

### 004 - Level 2 Confirmed
![Screenshot 004](screenshots/004-level-2-confirmed-chromium-linux.png)

After dismissing the notification:
- Quinn is now Level 2
- XP counter shows 0 (5 XP was spent)
- Hero stats have been updated

## Verification Checklist

- [ ] Natural 20 with 5+ XP triggers level up
- [ ] Hero card flips to show 2nd level stats
- [ ] HP increases (Quinn: 8 → 10)
- [ ] AC increases (Quinn: 17 → 18)
- [ ] Surge value increases (Quinn: 4 → 5)
- [ ] Attack bonus increases (Quinn: 6 → 7)
- [ ] 5 XP is spent
- [ ] Level up notification displays correctly
- [ ] Critical attack bonus message shown
- [ ] Level 2 indicator visible on hero turn info

## Acceptance Criteria Met

- [x] On natural 20 attack roll with 5+ XP available, level up triggers
- [x] Hero stats increase (HP, AC, etc.)
- [x] 5 XP is spent
- [x] Level up animation/notification shown
- [x] Level 2 heroes cannot level up again
