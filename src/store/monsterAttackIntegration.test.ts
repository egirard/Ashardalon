import { describe, it, expect } from 'vitest';
import { executeMonsterTurn, resolveMonsterAttackWithStats } from './monsterAI';
import { MONSTER_TACTICS } from './types';
import type { MonsterState, HeroToken, DungeonState, PlacedTile } from './types';

/**
 * Integration tests for monster attacks with status effects and miss damage
 * These tests verify the complete flow from monster turn execution through
 * attack resolution with special effects.
 */
describe('Monster Attack Integration', () => {
  // Helper to create a simple test dungeon with just the start tile
  function createTestDungeon(): DungeonState {
    const startTile: PlacedTile = {
      id: 'start-tile',
      tileType: 'start',
      position: { col: 0, row: 0 },
      rotation: 0,
      edges: {
        north: 'unexplored',
        south: 'unexplored',
        east: 'unexplored',
        west: 'unexplored',
      },
    };

    return {
      tiles: [startTile],
      unexploredEdges: [],
      tileDeck: [],
    };
  }

  describe('Status Effect Application', () => {
    it('snake bite should trigger on adjacent attack', () => {
      const dungeon = createTestDungeon();
      const monster: MonsterState = {
        monsterId: 'snake',
        instanceId: 'snake-0',
        position: { x: 2, y: 2 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile',
      };

      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 2, y: 3 } }, // Adjacent (one south)
      ];

      const heroHpMap = { quinn: 10 };
      const heroAcMap = { quinn: 15 };
      const monsters: MonsterState[] = [monster];

      // Execute the monster turn with a controlled random that will hit
      const action = executeMonsterTurn(
        monster,
        heroTokens,
        heroHpMap,
        heroAcMap,
        monsters,
        dungeon,
        () => 0.9 // Will roll high (18-20)
      );

      // Should attack the adjacent hero
      expect(action.type).toBe('attack');
      if (action.type === 'attack') {
        expect(action.targetId).toBe('quinn');
        expect(action.result.isHit).toBe(true);
        // Damage should be dealt
        expect(action.result.damage).toBe(1);
      }

      // Verify snake tactics have poisoned status effect
      const tactics = MONSTER_TACTICS['snake'];
      expect(tactics.adjacentAttack.statusEffect).toBe('poisoned');
    });

    it('grell should use venomous bite when adjacent', () => {
      const dungeon = createTestDungeon();
      const monster: MonsterState = {
        monsterId: 'grell',
        instanceId: 'grell-0',
        position: { x: 2, y: 2 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile',
      };

      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 2, y: 3 } }, // Adjacent
      ];

      const heroHpMap = { quinn: 10 };
      const heroAcMap = { quinn: 15 };
      const monsters: MonsterState[] = [monster];

      const action = executeMonsterTurn(
        monster,
        heroTokens,
        heroHpMap,
        heroAcMap,
        monsters,
        dungeon,
        () => 0.9 // Will hit
      );

      expect(action.type).toBe('attack');
      if (action.type === 'attack') {
        expect(action.targetId).toBe('quinn');
        // Should use Venomous Bite
        const tactics = MONSTER_TACTICS['grell'];
        expect(tactics.adjacentAttack.name).toBe('Venomous Bite');
        expect(tactics.adjacentAttack.statusEffect).toBe('poisoned');
        expect(tactics.adjacentAttack.missDamage).toBe(1);
      }
    });

    it('grell should use tentacles when within 1 tile but not adjacent', () => {
      const dungeon = createTestDungeon();
      const monster: MonsterState = {
        monsterId: 'grell',
        instanceId: 'grell-0',
        position: { x: 2, y: 2 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile',
      };

      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 2, y: 5 } }, // 3 squares away (within 1 tile = 4 squares)
      ];

      const heroHpMap = { quinn: 10 };
      const heroAcMap = { quinn: 15 };
      const monsters: MonsterState[] = [monster];

      const action = executeMonsterTurn(
        monster,
        heroTokens,
        heroHpMap,
        heroAcMap,
        monsters,
        dungeon,
        () => 0.9 // Will hit
      );

      // Should move and attack
      expect(action.type).toBe('move-and-attack');
      if (action.type === 'move-and-attack') {
        expect(action.targetId).toBe('quinn');
        // Should use Tentacles (moveAttack)
        const tactics = MONSTER_TACTICS['grell'];
        expect(tactics.moveAttack?.name).toBe('Tentacles');
        expect(tactics.moveAttack?.statusEffect).toBe('dazed');
      }
    });

    it('orc-archer should use punch when adjacent', () => {
      const dungeon = createTestDungeon();
      const monster: MonsterState = {
        monsterId: 'orc-archer',
        instanceId: 'orc-archer-0',
        position: { x: 2, y: 2 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile',
      };

      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 2, y: 3 } }, // Adjacent
      ];

      const heroHpMap = { quinn: 10 };
      const heroAcMap = { quinn: 15 };
      const monsters: MonsterState[] = [monster];

      const action = executeMonsterTurn(
        monster,
        heroTokens,
        heroHpMap,
        heroAcMap,
        monsters,
        dungeon,
        () => 0.9 // Will hit
      );

      expect(action.type).toBe('attack');
      if (action.type === 'attack') {
        expect(action.targetId).toBe('quinn');
        // Should use Punch
        const tactics = MONSTER_TACTICS['orc-archer'];
        expect(tactics.adjacentAttack.name).toBe('Punch');
        expect(tactics.adjacentAttack.statusEffect).toBe('dazed');
      }
    });
  });

  describe('Miss Damage', () => {
    it('grell venomous bite should deal 1 damage on miss', () => {
      const tactics = MONSTER_TACTICS['grell'];
      
      // Simulate a miss (roll 1, which will always miss against AC 15)
      const result = resolveMonsterAttackWithStats(
        tactics.adjacentAttack,
        15, // Target AC
        () => 0.0 // Will roll 1 (critical miss)
      );

      expect(result.isHit).toBe(false);
      expect(result.roll).toBe(1);
      // Miss damage should be in the attack option
      expect(tactics.adjacentAttack.missDamage).toBe(1);
    });

    it('orc-archer arrow should deal 1 damage on miss', () => {
      const tactics = MONSTER_TACTICS['orc-archer'];
      expect(tactics.moveAttack).toBeDefined();
      
      // Simulate a miss
      const result = resolveMonsterAttackWithStats(
        tactics.moveAttack!,
        15, // Target AC
        () => 0.0 // Will roll 1 (critical miss)
      );

      expect(result.isHit).toBe(false);
      expect(result.roll).toBe(1);
      // Miss damage should be in the attack option
      expect(tactics.moveAttack?.missDamage).toBe(1);
    });

    it('snake should not have miss damage', () => {
      const tactics = MONSTER_TACTICS['snake'];
      
      // Simulate a miss
      const result = resolveMonsterAttackWithStats(
        tactics.adjacentAttack,
        20, // High AC to ensure miss
        () => 0.0 // Will roll 1 (critical miss)
      );

      expect(result.isHit).toBe(false);
      expect(result.damage).toBe(0);
      // No miss damage
      expect(tactics.adjacentAttack.missDamage).toBeUndefined();
    });
  });

  describe('Move-and-Attack Behavior', () => {
    it('orc-smasher should move and attack when within 1 tile', () => {
      const dungeon = createTestDungeon();
      const monster: MonsterState = {
        monsterId: 'orc-smasher',
        instanceId: 'orc-smasher-0',
        position: { x: 2, y: 2 },
        currentHp: 2,
        controllerId: 'quinn',
        tileId: 'start-tile',
      };

      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 2, y: 5 } }, // 3 squares away (within 1 tile = 4 squares)
      ];

      const heroHpMap = { quinn: 10 };
      const heroAcMap = { quinn: 15 };
      const monsters: MonsterState[] = [monster];

      const action = executeMonsterTurn(
        monster,
        heroTokens,
        heroHpMap,
        heroAcMap,
        monsters,
        dungeon,
        () => 0.9 // Will hit
      );

      // Should move and attack
      expect(action.type).toBe('move-and-attack');
      if (action.type === 'move-and-attack') {
        expect(action.targetId).toBe('quinn');
        expect(action.result.isHit).toBe(true);
        expect(action.result.damage).toBe(1);
      }
    });

    it('orc-archer should move and attack with arrow when within 2 tiles', () => {
      const dungeon = createTestDungeon();
      const monster: MonsterState = {
        monsterId: 'orc-archer',
        instanceId: 'orc-archer-0',
        position: { x: 2, y: 2 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'start-tile',
      };

      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 2, y: 7 } }, // 5 squares away (within 2 tiles = 8 squares)
      ];

      const heroHpMap = { quinn: 10 };
      const heroAcMap = { quinn: 15 };
      const monsters: MonsterState[] = [monster];

      const action = executeMonsterTurn(
        monster,
        heroTokens,
        heroHpMap,
        heroAcMap,
        monsters,
        dungeon,
        () => 0.9 // Will hit
      );

      // Should move and attack with arrow
      expect(action.type).toBe('move-and-attack');
      if (action.type === 'move-and-attack') {
        expect(action.targetId).toBe('quinn');
        expect(action.result.isHit).toBe(true);
        // Arrow does 2 damage
        expect(action.result.damage).toBe(2);
      }
    });
  });
});
