import { describe, it, expect } from 'vitest';
import {
  getPowerCardHooks,
  powerCardHasHooks,
  getAllPowerCardsWithHooks,
} from './powerCardHooks';
import type {
  EncounterDrawEvent,
  AttackMissEvent,
  AttackHitByHeroEvent,
  AttackHitOnHeroEvent,
  MonsterSpawnEvent,
  MonsterActivationEvent,
} from './gameEvents';

describe('powerCardHooks', () => {
  describe('getPowerCardHooks', () => {
    it('should return hooks for Perseverance (ID 10)', () => {
      const hooks = getPowerCardHooks(10);
      
      expect(hooks).toHaveLength(1);
      expect(hooks[0].eventType).toBe('encounter-draw');
      expect(hooks[0].priority).toBe(10);
    });

    it('should return hooks for Inspiring Advice (ID 18)', () => {
      const hooks = getPowerCardHooks(18);
      
      expect(hooks).toHaveLength(1);
      expect(hooks[0].eventType).toBe('attack-miss');
    });

    it('should return hooks for One for the Team (ID 19)', () => {
      const hooks = getPowerCardHooks(19);
      
      expect(hooks).toHaveLength(1);
      expect(hooks[0].eventType).toBe('encounter-draw');
    });

    it('should return hooks for To Arms! (ID 20)', () => {
      const hooks = getPowerCardHooks(20);
      
      expect(hooks).toHaveLength(1);
      expect(hooks[0].eventType).toBe('monster-spawn');
    });

    it('should return hooks for Bravery (ID 28)', () => {
      const hooks = getPowerCardHooks(28);
      
      expect(hooks).toHaveLength(1);
      expect(hooks[0].eventType).toBe('monster-activation');
    });

    it('should return hooks for Furious Assault (ID 31)', () => {
      const hooks = getPowerCardHooks(31);
      
      expect(hooks).toHaveLength(1);
      expect(hooks[0].eventType).toBe('attack-hit-by-hero');
    });

    it('should return hooks for Practiced Evasion (ID 39)', () => {
      const hooks = getPowerCardHooks(39);
      
      expect(hooks).toHaveLength(1);
      expect(hooks[0].eventType).toBe('attack-hit-on-hero');
    });

    it('should return hooks for Tumbling Escape (ID 40)', () => {
      const hooks = getPowerCardHooks(40);
      
      expect(hooks).toHaveLength(1);
      expect(hooks[0].eventType).toBe('attack-hit-on-hero');
    });

    it('should return hooks for Mirror Image (ID 49)', () => {
      const hooks = getPowerCardHooks(49);
      
      expect(hooks).toHaveLength(1);
      expect(hooks[0].eventType).toBe('attack-hit-on-hero');
    });

    it('should return empty array for power cards without hooks', () => {
      const hooks = getPowerCardHooks(1); // Healing Hymn
      expect(hooks).toEqual([]);
    });
  });

  describe('Furious Assault hook (ID 31)', () => {
    it('should add +1 damage when hero hits', () => {
      const hooks = getPowerCardHooks(31);
      const hook = hooks[0].hook;
      
      const event: AttackHitByHeroEvent = {
        type: 'attack-hit-by-hero',
        heroId: 'tarak',
        turnNumber: 1,
        attackerId: 'tarak',
        targetMonsterId: 'monster-1',
        attackResult: {
          roll: 15,
          attackBonus: 7,
          total: 22,
          targetAC: 14,
          isHit: true,
          damage: 2,
          isCritical: false,
        },
        damage: 2,
      };
      
      const response = hook(event);
      
      expect(response).toBeDefined();
      expect(response?.flipPowerCard).toBe(31);
      expect(response?.modifiedEvent?.damage).toBe(3);
    });
  });

  describe('Practiced Evasion hook (ID 39)', () => {
    it('should negate trap attack', () => {
      const hooks = getPowerCardHooks(39);
      const hook = hooks[0].hook;
      
      const event: AttackHitOnHeroEvent = {
        type: 'attack-hit-on-hero',
        heroId: 'tarak',
        turnNumber: 1,
        targetHeroId: 'tarak',
        attackResult: {
          roll: 15,
          attackBonus: 8,
          total: 23,
          targetAC: 17,
          isHit: true,
          damage: 2,
          isCritical: false,
        },
        isTrapAttack: true,
        allTargetHeroIds: ['tarak'],
      };
      
      const response = hook(event);
      
      expect(response).toBeDefined();
      expect(response?.preventDefault).toBe(true);
      expect(response?.flipPowerCard).toBe(39);
    });

    it('should negate event attack', () => {
      const hooks = getPowerCardHooks(39);
      const hook = hooks[0].hook;
      
      const event: AttackHitOnHeroEvent = {
        type: 'attack-hit-on-hero',
        heroId: 'tarak',
        turnNumber: 1,
        targetHeroId: 'tarak',
        attackResult: {
          roll: 15,
          attackBonus: 10,
          total: 25,
          targetAC: 17,
          isHit: true,
          damage: 1,
          isCritical: false,
        },
        isEventAttack: true,
        encounterCardId: 'bulls-eye',
        allTargetHeroIds: ['tarak'],
      };
      
      const response = hook(event);
      
      expect(response).toBeDefined();
      expect(response?.preventDefault).toBe(true);
      expect(response?.flipPowerCard).toBe(39);
    });

    it('should not trigger on monster attack', () => {
      const hooks = getPowerCardHooks(39);
      const hook = hooks[0].hook;
      
      const event: AttackHitOnHeroEvent = {
        type: 'attack-hit-on-hero',
        heroId: 'tarak',
        turnNumber: 1,
        targetHeroId: 'tarak',
        attackerMonsterId: 'monster-1',
        attackResult: {
          roll: 15,
          attackBonus: 7,
          total: 22,
          targetAC: 17,
          isHit: true,
          damage: 1,
          isCritical: false,
        },
        allTargetHeroIds: ['tarak'],
      };
      
      const response = hook(event);
      
      expect(response).toBeNull();
    });
  });

  describe('Tumbling Escape hook (ID 40)', () => {
    it('should negate monster attack', () => {
      const hooks = getPowerCardHooks(40);
      const hook = hooks[0].hook;
      
      const event: AttackHitOnHeroEvent = {
        type: 'attack-hit-on-hero',
        heroId: 'tarak',
        turnNumber: 1,
        targetHeroId: 'tarak',
        attackerMonsterId: 'monster-1',
        attackResult: {
          roll: 15,
          attackBonus: 7,
          total: 22,
          targetAC: 17,
          isHit: true,
          damage: 1,
          isCritical: false,
        },
        allTargetHeroIds: ['tarak'],
      };
      
      const response = hook(event);
      
      expect(response).toBeDefined();
      expect(response?.preventDefault).toBe(true);
      expect(response?.flipPowerCard).toBe(40);
    });

    it('should not trigger on trap attack', () => {
      const hooks = getPowerCardHooks(40);
      const hook = hooks[0].hook;
      
      const event: AttackHitOnHeroEvent = {
        type: 'attack-hit-on-hero',
        heroId: 'tarak',
        turnNumber: 1,
        targetHeroId: 'tarak',
        attackResult: {
          roll: 15,
          attackBonus: 8,
          total: 23,
          targetAC: 17,
          isHit: true,
          damage: 2,
          isCritical: false,
        },
        isTrapAttack: true,
        allTargetHeroIds: ['tarak'],
      };
      
      const response = hook(event);
      
      expect(response).toBeNull();
    });

    it('should not trigger on event attack', () => {
      const hooks = getPowerCardHooks(40);
      const hook = hooks[0].hook;
      
      const event: AttackHitOnHeroEvent = {
        type: 'attack-hit-on-hero',
        heroId: 'tarak',
        turnNumber: 1,
        targetHeroId: 'tarak',
        attackResult: {
          roll: 15,
          attackBonus: 10,
          total: 25,
          targetAC: 17,
          isHit: true,
          damage: 1,
          isCritical: false,
        },
        isEventAttack: true,
        allTargetHeroIds: ['tarak'],
      };
      
      const response = hook(event);
      
      expect(response).toBeNull();
    });
  });

  describe('Mirror Image hook (ID 49)', () => {
    it('should trigger on missed attack', () => {
      const hooks = getPowerCardHooks(49);
      const hook = hooks[0].hook;
      
      const event: AttackHitOnHeroEvent = {
        type: 'attack-hit-on-hero',
        heroId: 'haskan',
        turnNumber: 1,
        targetHeroId: 'haskan',
        attackerMonsterId: 'monster-1',
        attackResult: {
          roll: 5,
          attackBonus: 7,
          total: 12,
          targetAC: 14,
          isHit: false,
          damage: 0,
          isCritical: false,
        },
        allTargetHeroIds: ['haskan'],
      };
      
      const response = hook(event);
      
      expect(response).toBeDefined();
      // Should not flip card - charges are tracked separately
      expect(response?.flipPowerCard).toBeUndefined();
    });

    it('should not trigger on hit', () => {
      const hooks = getPowerCardHooks(49);
      const hook = hooks[0].hook;
      
      const event: AttackHitOnHeroEvent = {
        type: 'attack-hit-on-hero',
        heroId: 'haskan',
        turnNumber: 1,
        targetHeroId: 'haskan',
        attackerMonsterId: 'monster-1',
        attackResult: {
          roll: 15,
          attackBonus: 7,
          total: 22,
          targetAC: 14,
          isHit: true,
          damage: 1,
          isCritical: false,
        },
        allTargetHeroIds: ['haskan'],
      };
      
      const response = hook(event);
      
      expect(response).toBeNull();
    });
  });

  describe('powerCardHasHooks', () => {
    it('should return true for power cards with hooks', () => {
      expect(powerCardHasHooks(10)).toBe(true); // Perseverance
      expect(powerCardHasHooks(18)).toBe(true); // Inspiring Advice
      expect(powerCardHasHooks(31)).toBe(true); // Furious Assault
    });

    it('should return false for power cards without hooks', () => {
      expect(powerCardHasHooks(1)).toBe(false);  // Healing Hymn
      expect(powerCardHasHooks(12)).toBe(false); // Charge
    });
  });

  describe('getAllPowerCardsWithHooks', () => {
    it('should return all power card IDs that have hooks', () => {
      const cardIds = getAllPowerCardsWithHooks();
      
      expect(cardIds).toContain(10); // Perseverance
      expect(cardIds).toContain(18); // Inspiring Advice
      expect(cardIds).toContain(19); // One for the Team
      expect(cardIds).toContain(20); // To Arms!
      expect(cardIds).toContain(28); // Bravery
      expect(cardIds).toContain(31); // Furious Assault
      expect(cardIds).toContain(39); // Practiced Evasion
      expect(cardIds).toContain(40); // Tumbling Escape
      expect(cardIds).toContain(49); // Mirror Image
    });

    it('should return exactly 9 cards with hooks', () => {
      const cardIds = getAllPowerCardsWithHooks();
      expect(cardIds).toHaveLength(9);
    });
  });
});
