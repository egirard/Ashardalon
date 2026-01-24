import { describe, test, expect } from 'vitest';
import { 
  spawnMonstersWithBehavior, 
  createMonsterGroup, 
  isGroupDefeated,
  removeMonsterFromGroup 
} from './monsters';
import type { PlacedTile, MonsterState, MonsterGroup } from './types';

describe('Legion Devil Multi-Monster Spawn', () => {
  // Helper to create a mock tile
  const createMockTile = (): PlacedTile => ({
    id: 'test-tile-1',
    tileType: 'corridor',
    position: { x: 0, y: 1 },
    rotation: 0,
    entrance: 'south',
  });

  test('spawnMonstersWithBehavior spawns 3 Legion Devils with group', () => {
    const tile = createMockTile();
    const existingMonsters: MonsterState[] = [];
    
    const result = spawnMonstersWithBehavior(
      'legion-devil',
      tile,
      'quinn',
      existingMonsters,
      0,  // monsterInstanceCounter
      0   // monsterGroupCounter
    );

    // Should spawn 3 monsters (1 + 2 from spawnBehavior)
    expect(result.monsters).toHaveLength(3);
    
    // All should be Legion Devils
    result.monsters.forEach(monster => {
      expect(monster.monsterId).toBe('legion-devil');
    });

    // All should have unique instance IDs
    const instanceIds = result.monsters.map(m => m.instanceId);
    expect(new Set(instanceIds).size).toBe(3);

    // All should have the same groupId
    const groupIds = result.monsters.map(m => m.groupId);
    expect(new Set(groupIds).size).toBe(1);
    expect(groupIds[0]).toBeDefined();

    // Should create a group
    expect(result.group).toBeDefined();
    expect(result.group!.memberIds).toHaveLength(3);
    expect(result.group!.xp).toBe(2);  // Legion Devil XP
    expect(result.group!.monsterName).toBe('Legion Devil');

    // Counters should be updated
    expect(result.monsterInstanceCounter).toBe(3);
    expect(result.monsterGroupCounter).toBe(1);
  });

  test('spawnMonstersWithBehavior places monsters on non-overlapping positions', () => {
    const tile = createMockTile();
    const existingMonsters: MonsterState[] = [];
    
    const result = spawnMonstersWithBehavior(
      'legion-devil',
      tile,
      'quinn',
      existingMonsters,
      0,
      0
    );

    // All monsters should have different positions
    const positions = result.monsters.map(m => `${m.position.x},${m.position.y}`);
    expect(new Set(positions).size).toBe(3);
  });

  test('regular monster spawn does not create a group', () => {
    const tile = createMockTile();
    const existingMonsters: MonsterState[] = [];
    
    const result = spawnMonstersWithBehavior(
      'kobold',  // Kobold has no spawn behavior
      tile,
      'quinn',
      existingMonsters,
      0,
      0
    );

    // Should spawn only 1 monster
    expect(result.monsters).toHaveLength(1);
    
    // Should not create a group
    expect(result.group).toBeNull();
    
    // Monster should not have a groupId
    expect(result.monsters[0].groupId).toBeUndefined();

    // Group counter should not increment
    expect(result.monsterGroupCounter).toBe(0);
  });

  test('isGroupDefeated returns false when members remain', () => {
    const group: MonsterGroup = {
      groupId: 'group-0',
      memberIds: ['legion-devil-0', 'legion-devil-1', 'legion-devil-2'],
      xp: 2,
      monsterName: 'Legion Devil',
    };

    const activeMonsters: MonsterState[] = [
      {
        monsterId: 'legion-devil',
        instanceId: 'legion-devil-0',
        position: { x: 2, y: 1 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'test-tile-1',
        groupId: 'group-0',
      },
      {
        monsterId: 'legion-devil',
        instanceId: 'legion-devil-1',
        position: { x: 2, y: 2 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'test-tile-1',
        groupId: 'group-0',
      },
    ];

    expect(isGroupDefeated(group, activeMonsters)).toBe(false);
  });

  test('isGroupDefeated returns true when all members defeated', () => {
    const group: MonsterGroup = {
      groupId: 'group-0',
      memberIds: ['legion-devil-0', 'legion-devil-1', 'legion-devil-2'],
      xp: 2,
      monsterName: 'Legion Devil',
    };

    const activeMonsters: MonsterState[] = [];  // All defeated

    expect(isGroupDefeated(group, activeMonsters)).toBe(true);
  });

  test('removeMonsterFromGroup removes member from group', () => {
    const group: MonsterGroup = {
      groupId: 'group-0',
      memberIds: ['legion-devil-0', 'legion-devil-1', 'legion-devil-2'],
      xp: 2,
      monsterName: 'Legion Devil',
    };

    const updatedGroup = removeMonsterFromGroup(group, 'legion-devil-0');

    expect(updatedGroup.memberIds).toHaveLength(2);
    expect(updatedGroup.memberIds).not.toContain('legion-devil-0');
    expect(updatedGroup.memberIds).toContain('legion-devil-1');
    expect(updatedGroup.memberIds).toContain('legion-devil-2');
  });

  test('createMonsterGroup creates group with correct properties', () => {
    const group = createMonsterGroup(
      'group-0',
      ['legion-devil-0', 'legion-devil-1', 'legion-devil-2'],
      2,
      'Legion Devil'
    );

    expect(group.groupId).toBe('group-0');
    expect(group.memberIds).toHaveLength(3);
    expect(group.xp).toBe(2);
    expect(group.monsterName).toBe('Legion Devil');
  });
});
