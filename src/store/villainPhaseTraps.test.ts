import { describe, it, expect } from 'vitest';
import { activateVillainPhaseTraps } from './villainPhaseTraps';
import type { TrapState, HazardState, HeroHpState, HeroToken, DungeonState } from './types';

describe('villainPhaseTraps', () => {
  const mockDungeon: DungeonState = {
    tiles: [
      {
        id: 'start-tile',
        tileType: 'start',
        position: { col: 0, row: 0 },
        rotation: 0,
        edges: { north: 'unexplored', south: 'unexplored', east: 'unexplored', west: 'unexplored' },
      },
    ],
    unexploredEdges: [],
    tileDeck: [],
  };

  describe('activateVillainPhaseTraps', () => {
    it('should activate lava flow trap - damage and spread', () => {
      const traps: TrapState[] = [
        { id: 'trap-1', encounterId: 'lava-flow', position: { x: 2, y: 2 }, disableDC: 10 },
      ];
      const heroHp: HeroHpState[] = [
        { heroId: 'quinn', currentHp: 8, maxHp: 8, ac: 17, surgeValue: 4, level: 1 },
      ];
      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 2, y: 2 } },
      ];

      const result = activateVillainPhaseTraps(
        traps,
        [],
        heroHp,
        heroTokens,
        mockDungeon,
        2,
        0,
        () => 0.5
      );

      // Hero should take 1 damage from being on lava
      expect(result.heroHp[0].currentHp).toBe(7);
      
      // Lava should spread (new trap created)
      expect(result.traps.length).toBeGreaterThan(1);
      expect(result.trapInstanceCounter).toBe(3); // Counter incremented
    });

    it('should activate poisoned dart trap - attack heroes on tile', () => {
      const traps: TrapState[] = [
        { id: 'trap-1', encounterId: 'poisoned-dart-trap', position: { x: 2, y: 2 }, disableDC: 10 },
      ];
      const heroHp: HeroHpState[] = [
        { heroId: 'quinn', currentHp: 8, maxHp: 8, ac: 17, surgeValue: 4, level: 1 },
      ];
      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 2, y: 2 } },
      ];

      // Roll 10 on d20, +8 = 18 vs AC 17 = hit for 2 damage
      const result = activateVillainPhaseTraps(
        traps,
        [],
        heroHp,
        heroTokens,
        mockDungeon,
        2,
        0,
        () => 0.45
      );

      // Hero should take 2 damage from dart trap hit
      expect(result.heroHp[0].currentHp).toBe(6);
    });

    it('should activate rolling boulder - move and damage', () => {
      const traps: TrapState[] = [
        { id: 'trap-1', encounterId: 'rolling-boulder', position: { x: 2, y: 2 }, disableDC: 10 },
      ];
      const heroHp: HeroHpState[] = [
        { heroId: 'quinn', currentHp: 8, maxHp: 8, ac: 17, surgeValue: 4, level: 1 },
      ];
      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 2, y: 4 } },
      ];

      const result = activateVillainPhaseTraps(
        traps,
        [],
        heroHp,
        heroTokens,
        mockDungeon,
        2,
        0,
        () => 0.5
      );

      // Boulder should move toward hero (from 2,2 toward 2,4 = move to 2,3)
      expect(result.traps[0].position).toEqual({ x: 2, y: 3 });
      
      // If hero is on the new position, they take damage
      // In this case hero is at 2,4 so no damage
      expect(result.heroHp[0].currentHp).toBe(8);
    });

    it('should activate whirling blades - move and attack', () => {
      const traps: TrapState[] = [
        { id: 'trap-1', encounterId: 'whirling-blades', position: { x: 2, y: 2 }, disableDC: 10 },
      ];
      const heroHp: HeroHpState[] = [
        { heroId: 'quinn', currentHp: 8, maxHp: 8, ac: 17, surgeValue: 4, level: 1 },
      ];
      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 2, y: 3 } }, // Adjacent to trap
      ];

      // Roll 10 on d20, +8 = 18 vs AC 17 = hit for 2 damage
      const result = activateVillainPhaseTraps(
        traps,
        [],
        heroHp,
        heroTokens,
        mockDungeon,
        2,
        0,
        () => 0.45
      );

      // Blades should move toward hero (from 2,2 to 2,3)
      expect(result.traps[0].position).toEqual({ x: 2, y: 3 });
      
      // Hero takes 2 damage from attack
      expect(result.heroHp[0].currentHp).toBe(6);
    });

    it('should handle multiple traps', () => {
      const traps: TrapState[] = [
        { id: 'trap-1', encounterId: 'lava-flow', position: { x: 2, y: 2 }, disableDC: 10 },
        { id: 'trap-2', encounterId: 'poisoned-dart-trap', position: { x: 2, y: 3 }, disableDC: 10 },
      ];
      const heroHp: HeroHpState[] = [
        { heroId: 'quinn', currentHp: 8, maxHp: 8, ac: 17, surgeValue: 4, level: 1 },
      ];
      const heroTokens: HeroToken[] = [
        { heroId: 'quinn', position: { x: 2, y: 2 } },
      ];

      // Roll 10 on d20, +8 = 18 vs AC 17 = hit for 2 damage
      const result = activateVillainPhaseTraps(
        traps,
        [],
        heroHp,
        heroTokens,
        mockDungeon,
        3,
        0,
        () => 0.45
      );

      // Hero takes 1 damage from lava
      // Hero is not on poisoned dart trap tile (2,3) so no dart damage
      expect(result.heroHp[0].currentHp).toBe(7);
    });

    it('should not activate if no traps', () => {
      const result = activateVillainPhaseTraps(
        [],
        [],
        [{ heroId: 'quinn', currentHp: 8, maxHp: 8, ac: 17, surgeValue: 4, level: 1 }],
        [{ heroId: 'quinn', position: { x: 2, y: 2 } }],
        mockDungeon,
        0,
        0
      );

      expect(result.heroHp[0].currentHp).toBe(8);
      expect(result.traps).toEqual([]);
    });
  });
});
