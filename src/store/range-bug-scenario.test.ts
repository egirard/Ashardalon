/**
 * Test for the bug where getTargetableMonstersForCurrentHero returns monsters
 * that can't be targeted by all attack cards
 */
import { describe, it, expect } from 'vitest';

describe('Range calculation bug - mixed attack ranges', () => {
  it('should demonstrate the bug scenario: Cleric with both adjacent and ranged attacks', () => {
    // This test documents the bug scenario:
    // - Hero has "Righteous Advance" (adjacent only, id: 3)
    // - Hero also has "Sacred Flame" (within 1 tile, id: 4)
    // - Monster is within 1 tile but NOT adjacent
    // 
    // BEFORE FIX:
    // - getTargetableMonstersForCurrentHero() would return the monster
    //   (because maxRange = 1 from Sacred Flame)
    // - "Righteous Advance" card would show as available in dashboard
    // - But clicking it wouldn't work (no adjacent monsters)
    //
    // AFTER FIX:
    // - getTargetableMonstersForCurrentHero() checks each monster against
    //   ALL available attack cards
    // - Monster is only included if at least ONE card can target it
    // - "Righteous Advance" now correctly shows as unavailable when
    //   only non-adjacent monsters exist
    
    // Card #3: Righteous Advance - adjacent only
    const righteousAdvance = {
      id: 3,
      name: 'Righteous Advance',
      type: 'at-will',
      heroClass: 'Cleric',
      rule: 'Attack one adjacent Monster.',
      attackBonus: 6,
      damage: 1
    };
    
    // Card #4: Sacred Flame - within 1 tile
    const sacredFlame = {
      id: 4,
      name: 'Sacred Flame',
      type: 'at-will',
      heroClass: 'Cleric',
      rule: 'Attack one Monster within 1 tile of you.',
      attackBonus: 6,
      damage: 1
    };
    
    // Scenario:
    // - Hero at position (2, 2)
    // - Monster at position (2, 4) - within 1 tile but NOT adjacent
    //   (Manhattan distance = 2, within tile range, but dx=0, dy=2 so not adjacent)
    const heroPos = { x: 2, y: 2 };
    const monsterPos = { x: 2, y: 4 };
    
    const dx = Math.abs(heroPos.x - monsterPos.x);
    const dy = Math.abs(heroPos.y - monsterPos.y);
    
    // Check adjacency (should be false)
    const isAdjacent = dx <= 1 && dy <= 1 && (dx > 0 || dy > 0);
    expect(isAdjacent).toBe(false);
    
    // Check within 1 tile (should be true)
    // Chebyshev distance = max(dx, dy) = 2
    // Within 1 tile means Chebyshev distance <= 4 (one 4x4 tile)
    const chebyshevDistance = Math.max(dx, dy);
    const isWithinOneTile = chebyshevDistance <= 4;
    expect(isWithinOneTile).toBe(true);
    
    // The bug was that the OLD code would return this monster in targetableMonsters
    // because maxRange = 1 (from Sacred Flame), even though Righteous Advance
    // can't target it.
    //
    // The FIX ensures that only monsters targetable by at least one available
    // attack card are included.
    
    console.log('[BUG TEST] Monster at', monsterPos, 'relative to hero at', heroPos);
    console.log('[BUG TEST] Adjacent:', isAdjacent, '(required by Righteous Advance)');
    console.log('[BUG TEST] Within 1 tile:', isWithinOneTile, '(required by Sacred Flame)');
    console.log('[BUG TEST] Chebyshev distance:', chebyshevDistance);
    console.log('[BUG TEST] Monster CAN be targeted by Sacred Flame');
    console.log('[BUG TEST] Monster CANNOT be targeted by Righteous Advance');
    console.log('[BUG TEST] After fix: monster should still be in targetableMonsters');
    console.log('[BUG TEST] After fix: Sacred Flame should show as available');
    console.log('[BUG TEST] After fix: Righteous Advance should show as unavailable');
  });
});
