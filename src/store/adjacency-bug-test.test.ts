import { describe, it, expect } from 'vitest';
import { getAdjacentMonsters, getMonsterGlobalPosition, arePositionsAdjacent } from './combat';
import type { MonsterState, DungeonState } from './types';

describe('Adjacency bug investigation', () => {
  it('should correctly find adjacent monsters on tile at (col=1, row=1)', () => {
    // This tests the special case tile placement at col=1, row=1
    // which aligns with minY=4 instead of minY=8
    const dungeon: DungeonState = {
      tiles: [
        {
          id: 'start-tile',
          tileType: 'start',
          position: { col: 0, row: 0 },
          rotation: 0,
        },
        {
          id: 'southeast-tile',
          tileType: 'black-1',
          position: { col: 1, row: 1 }, // Special case!
          rotation: 0,
        },
      ],
      unexploredEdges: [],
      tileDeck: [],
    };

    // Hero at position in global coordinates
    // Let's say hero is at the southeast corner of the start tile
    const heroGlobalPos = { x: 3, y: 7 }; // Southeast corner of start tile

    // Monster on the southeast tile at local position (0, 0)
    // With the special case, southeast-tile should have minY=4
    // So global position = (4 + 0, 4 + 0) = (4, 4)
    const monster: MonsterState = {
      monsterId: 'kobold',
      instanceId: 'kobold-test',
      position: { x: 0, y: 0 }, // Local position
      currentHp: 1,
      controllerId: 'quinn',
      tileId: 'southeast-tile',
    };

    // Convert monster to global position
    const monsterGlobalPos = getMonsterGlobalPosition(monster, dungeon);
    console.log('[TEST] Monster global position:', monsterGlobalPos);
    console.log('[TEST] Hero global position:', heroGlobalPos);
    
    expect(monsterGlobalPos).not.toBeNull();
    
    if (monsterGlobalPos) {
      // Check if they're adjacent
      const isAdjacent = arePositionsAdjacent(heroGlobalPos, monsterGlobalPos);
      console.log('[TEST] Are adjacent:', isAdjacent);
      console.log('[TEST] dx:', Math.abs(heroGlobalPos.x - monsterGlobalPos.x));
      console.log('[TEST] dy:', Math.abs(heroGlobalPos.y - monsterGlobalPos.y));
      
      // They should NOT be adjacent based on the calculation:
      // Hero: (3, 7), Monster: (4, 4)
      // dx = 1, dy = 3
      // Not adjacent since dy > 1
      expect(isAdjacent).toBe(false);
    }
  });

  it('should correctly find adjacent monsters across tile boundary with special tile placement', () => {
    // Test a case where hero and monster ARE adjacent across the tile boundary
    const dungeon: DungeonState = {
      tiles: [
        {
          id: 'start-tile',
          tileType: 'start',
          position: { col: 0, row: 0 },
          rotation: 0,
        },
        {
          id: 'southeast-tile',
          tileType: 'black-1',
          position: { col: 1, row: 1 }, // Special case! minY=4
          rotation: 0,
        },
      ],
      unexploredEdges: [],
      tileDeck: [],
    };

    // Hero at position at edge of start tile, lower right area
    const heroGlobalPos = { x: 3, y: 5 }; // Near southeast area

    // Monster on the southeast tile at local position (0, 1)
    // With special case: southeast-tile minX=4, minY=4
    // Global position = (4 + 0, 4 + 1) = (4, 5)
    const monster: MonsterState = {
      monsterId: 'kobold',
      instanceId: 'kobold-test2',
      position: { x: 0, y: 1 }, // Local position
      currentHp: 1,
      controllerId: 'quinn',
      tileId: 'southeast-tile',
    };

    // Convert monster to global position
    const monsterGlobalPos = getMonsterGlobalPosition(monster, dungeon);
    console.log('[TEST] Monster global position:', monsterGlobalPos);
    console.log('[TEST] Hero global position:', heroGlobalPos);
    
    expect(monsterGlobalPos).not.toBeNull();
    
    if (monsterGlobalPos) {
      // Check if they're adjacent
      const isAdjacent = arePositionsAdjacent(heroGlobalPos, monsterGlobalPos);
      console.log('[TEST] Are adjacent:', isAdjacent);
      console.log('[TEST] dx:', Math.abs(heroGlobalPos.x - monsterGlobalPos.x));
      console.log('[TEST] dy:', Math.abs(heroGlobalPos.y - monsterGlobalPos.y));
      
      // Hero: (3, 5), Monster: (4, 5)
      // dx = 1, dy = 0
      // They SHOULD be adjacent!
      expect(isAdjacent).toBe(true);
    }

    // Now test with getAdjacentMonsters
    const adjacentMonsters = getAdjacentMonsters(heroGlobalPos, [monster], 'start-tile', dungeon);
    expect(adjacentMonsters).toHaveLength(1);
    expect(adjacentMonsters[0].instanceId).toBe('kobold-test2');
  });
});
