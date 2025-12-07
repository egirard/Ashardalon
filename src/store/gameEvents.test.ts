import { describe, it, expect } from 'vitest';
import {
  createEventHookState,
  registerEventHook,
  unregisterEventHook,
  unregisterPowerCardHooks,
  getHooksForEvent,
  triggerEvent,
  hasHooksForEvent,
  clearAllHooks,
  type EventHookState,
  type EncounterDrawEvent,
  type AttackMissEvent,
  type AttackHitByHeroEvent,
  type EventHookResponse,
} from './gameEvents';

describe('gameEvents', () => {
  describe('createEventHookState', () => {
    it('should create initial empty state', () => {
      const state = createEventHookState();
      
      expect(state.hooks).toEqual({});
      expect(state.hookIdCounter).toBe(0);
    });
  });

  describe('registerEventHook', () => {
    it('should register a new hook', () => {
      const state = createEventHookState();
      const hook = () => null;
      
      const newState = registerEventHook(
        state,
        'encounter-draw',
        hook,
        10, // Perseverance card ID
        'quinn',
        5
      );
      
      expect(Object.keys(newState.hooks)).toHaveLength(1);
      const hookReg = Object.values(newState.hooks)[0];
      expect(hookReg.eventType).toBe('encounter-draw');
      expect(hookReg.powerCardId).toBe(10);
      expect(hookReg.heroId).toBe('quinn');
      expect(hookReg.priority).toBe(5);
      expect(newState.hookIdCounter).toBe(1);
    });

    it('should assign sequential IDs to hooks', () => {
      let state = createEventHookState();
      const hook = () => null;
      
      state = registerEventHook(state, 'encounter-draw', hook, 10, 'quinn');
      state = registerEventHook(state, 'attack-miss', hook, 18, 'vistra');
      
      expect(Object.keys(state.hooks)).toHaveLength(2);
      expect(state.hookIdCounter).toBe(2);
    });

    it('should default priority to 0', () => {
      const state = createEventHookState();
      const newState = registerEventHook(
        state,
        'encounter-draw',
        () => null,
        10,
        'quinn'
      );
      
      const hookReg = Object.values(newState.hooks)[0];
      expect(hookReg.priority).toBe(0);
    });
  });

  describe('unregisterEventHook', () => {
    it('should remove a specific hook by ID', () => {
      let state = createEventHookState();
      state = registerEventHook(state, 'encounter-draw', () => null, 10, 'quinn');
      state = registerEventHook(state, 'attack-miss', () => null, 18, 'vistra');
      
      const hookId = Object.keys(state.hooks)[0];
      const newState = unregisterEventHook(state, hookId);
      
      expect(Object.keys(newState.hooks)).toHaveLength(1);
      expect(newState.hooks[hookId]).toBeUndefined();
    });

    it('should handle removing non-existent hook', () => {
      const state = createEventHookState();
      const newState = unregisterEventHook(state, 'nonexistent');
      
      expect(newState.hooks).toEqual({});
    });
  });

  describe('unregisterPowerCardHooks', () => {
    it('should remove all hooks for a specific power card', () => {
      let state = createEventHookState();
      state = registerEventHook(state, 'encounter-draw', () => null, 10, 'quinn');
      state = registerEventHook(state, 'hero-phase-start', () => null, 10, 'quinn');
      state = registerEventHook(state, 'attack-miss', () => null, 18, 'vistra');
      
      const newState = unregisterPowerCardHooks(state, 10, 'quinn');
      
      expect(Object.keys(newState.hooks)).toHaveLength(1);
      const remainingHook = Object.values(newState.hooks)[0];
      expect(remainingHook.powerCardId).toBe(18);
    });

    it('should only remove hooks for the specific hero', () => {
      let state = createEventHookState();
      state = registerEventHook(state, 'encounter-draw', () => null, 10, 'quinn');
      state = registerEventHook(state, 'encounter-draw', () => null, 10, 'vistra');
      
      const newState = unregisterPowerCardHooks(state, 10, 'quinn');
      
      expect(Object.keys(newState.hooks)).toHaveLength(1);
      const remainingHook = Object.values(newState.hooks)[0];
      expect(remainingHook.heroId).toBe('vistra');
    });
  });

  describe('getHooksForEvent', () => {
    it('should return hooks for specific event type', () => {
      let state = createEventHookState();
      state = registerEventHook(state, 'encounter-draw', () => null, 10, 'quinn');
      state = registerEventHook(state, 'attack-miss', () => null, 18, 'vistra');
      state = registerEventHook(state, 'encounter-draw', () => null, 19, 'tarak');
      
      const hooks = getHooksForEvent(state, 'encounter-draw');
      
      expect(hooks).toHaveLength(2);
      expect(hooks.every(h => h.eventType === 'encounter-draw')).toBe(true);
    });

    it('should sort hooks by priority (highest first)', () => {
      let state = createEventHookState();
      state = registerEventHook(state, 'encounter-draw', () => null, 10, 'quinn', 1);
      state = registerEventHook(state, 'encounter-draw', () => null, 19, 'vistra', 10);
      state = registerEventHook(state, 'encounter-draw', () => null, 20, 'tarak', 5);
      
      const hooks = getHooksForEvent(state, 'encounter-draw');
      
      expect(hooks[0].priority).toBe(10);
      expect(hooks[1].priority).toBe(5);
      expect(hooks[2].priority).toBe(1);
    });

    it('should return empty array for event with no hooks', () => {
      const state = createEventHookState();
      const hooks = getHooksForEvent(state, 'encounter-draw');
      
      expect(hooks).toEqual([]);
    });
  });

  describe('triggerEvent', () => {
    it('should execute all hooks for an event', () => {
      let state = createEventHookState();
      let hook1Called = false;
      let hook2Called = false;
      
      state = registerEventHook(state, 'encounter-draw', () => {
        hook1Called = true;
        return null;
      }, 10, 'quinn');
      
      state = registerEventHook(state, 'encounter-draw', () => {
        hook2Called = true;
        return null;
      }, 19, 'vistra');
      
      const event: EncounterDrawEvent = {
        type: 'encounter-draw',
        heroId: 'quinn',
        turnNumber: 1,
        encounterId: 'unbearable-heat',
        currentXp: 10,
        baseCancelCost: 5,
      };
      
      triggerEvent(state, event);
      
      expect(hook1Called).toBe(true);
      expect(hook2Called).toBe(true);
    });

    it('should return power cards to flip', () => {
      let state = createEventHookState();
      
      state = registerEventHook(state, 'encounter-draw', () => ({
        flipPowerCard: 10,
      }), 10, 'quinn');
      
      state = registerEventHook(state, 'encounter-draw', () => ({
        flipPowerCard: 19,
      }), 19, 'vistra');
      
      const event: EncounterDrawEvent = {
        type: 'encounter-draw',
        heroId: 'quinn',
        turnNumber: 1,
        encounterId: 'unbearable-heat',
        currentXp: 10,
        baseCancelCost: 5,
      };
      
      const result = triggerEvent(state, event);
      
      expect(result.powerCardsToFlip).toHaveLength(2);
      expect(result.powerCardsToFlip).toContainEqual({ powerCardId: 10, heroId: 'quinn' });
      expect(result.powerCardsToFlip).toContainEqual({ powerCardId: 19, heroId: 'vistra' });
    });

    it('should track preventDefault flag', () => {
      let state = createEventHookState();
      
      state = registerEventHook(state, 'attack-hit-on-hero', () => ({
        preventDefault: true,
      }), 40, 'tarak');
      
      const event = {
        type: 'attack-hit-on-hero' as const,
        heroId: 'tarak',
        turnNumber: 1,
        targetHeroId: 'tarak',
        attackResult: { roll: 15, attackBonus: 8, total: 23, targetAC: 17, isHit: true, damage: 2, isCritical: false },
        allTargetHeroIds: ['tarak'],
      };
      
      const result = triggerEvent(state, event);
      
      expect(result.preventedDefault).toBe(true);
    });

    it('should stop propagation when requested', () => {
      let state = createEventHookState();
      let hook2Called = false;
      
      state = registerEventHook(state, 'encounter-draw', () => ({
        stopPropagation: true,
      }), 10, 'quinn', 10);
      
      state = registerEventHook(state, 'encounter-draw', () => {
        hook2Called = true;
        return null;
      }, 19, 'vistra', 1);
      
      const event: EncounterDrawEvent = {
        type: 'encounter-draw',
        heroId: 'quinn',
        turnNumber: 1,
        encounterId: 'unbearable-heat',
        currentXp: 10,
        baseCancelCost: 5,
      };
      
      triggerEvent(state, event);
      
      expect(hook2Called).toBe(false);
    });

    it('should propagate modified event to subsequent hooks', () => {
      let state = createEventHookState();
      let receivedCost = 0;
      
      state = registerEventHook(state, 'encounter-draw', (event: EncounterDrawEvent) => ({
        modifiedEvent: { baseCancelCost: 3 },
      }), 10, 'quinn', 10);
      
      state = registerEventHook(state, 'encounter-draw', (event: EncounterDrawEvent) => {
        receivedCost = event.baseCancelCost;
        return null;
      }, 19, 'vistra', 1);
      
      const event: EncounterDrawEvent = {
        type: 'encounter-draw',
        heroId: 'quinn',
        turnNumber: 1,
        encounterId: 'unbearable-heat',
        currentXp: 10,
        baseCancelCost: 5,
      };
      
      const result = triggerEvent(state, event);
      
      expect(receivedCost).toBe(3);
      expect(result.event.baseCancelCost).toBe(3);
    });

    it('should track power cards to keep unflipped', () => {
      let state = createEventHookState();
      
      state = registerEventHook(state, 'attack-miss', () => ({
        keepPowerCard: true,
      }), 18, 'vistra');
      
      const event: AttackMissEvent = {
        type: 'attack-miss',
        heroId: 'vistra',
        turnNumber: 1,
        attackerId: 'vistra',
        targetMonsterId: 'monster-1',
        attackResult: { roll: 5, attackBonus: 8, total: 13, targetAC: 14, isHit: false, damage: 0, isCritical: false },
      };
      
      const result = triggerEvent(state, event);
      
      expect(result.powerCardsToKeep).toHaveLength(1);
      expect(result.powerCardsToKeep[0]).toEqual({ powerCardId: 18, heroId: 'vistra' });
    });

    it('should handle hooks that return null', () => {
      let state = createEventHookState();
      
      state = registerEventHook(state, 'encounter-draw', () => null, 10, 'quinn');
      
      const event: EncounterDrawEvent = {
        type: 'encounter-draw',
        heroId: 'quinn',
        turnNumber: 1,
        encounterId: 'unbearable-heat',
        currentXp: 10,
        baseCancelCost: 5,
      };
      
      const result = triggerEvent(state, event);
      
      expect(result.powerCardsToFlip).toHaveLength(0);
      expect(result.preventedDefault).toBe(false);
    });
  });

  describe('hasHooksForEvent', () => {
    it('should return true when hooks exist for event type', () => {
      let state = createEventHookState();
      state = registerEventHook(state, 'encounter-draw', () => null, 10, 'quinn');
      
      expect(hasHooksForEvent(state, 'encounter-draw')).toBe(true);
    });

    it('should return false when no hooks exist for event type', () => {
      const state = createEventHookState();
      
      expect(hasHooksForEvent(state, 'encounter-draw')).toBe(false);
    });
  });

  describe('clearAllHooks', () => {
    it('should remove all registered hooks', () => {
      let state = createEventHookState();
      state = registerEventHook(state, 'encounter-draw', () => null, 10, 'quinn');
      state = registerEventHook(state, 'attack-miss', () => null, 18, 'vistra');
      
      const newState = clearAllHooks(state);
      
      expect(Object.keys(newState.hooks)).toHaveLength(0);
    });

    it('should preserve the hook counter', () => {
      let state = createEventHookState();
      state = registerEventHook(state, 'encounter-draw', () => null, 10, 'quinn');
      
      const newState = clearAllHooks(state);
      
      expect(newState.hookIdCounter).toBe(state.hookIdCounter);
    });
  });

  describe('event type specific tests', () => {
    it('should handle AttackHitByHeroEvent with damage modification', () => {
      let state = createEventHookState();
      
      state = registerEventHook(state, 'attack-hit-by-hero', (event: AttackHitByHeroEvent) => ({
        modifiedEvent: { damage: event.damage + 1 },
        flipPowerCard: 31,
      }), 31, 'tarak');
      
      const event: AttackHitByHeroEvent = {
        type: 'attack-hit-by-hero',
        heroId: 'tarak',
        turnNumber: 1,
        attackerId: 'tarak',
        targetMonsterId: 'monster-1',
        attackResult: { roll: 15, attackBonus: 7, total: 22, targetAC: 14, isHit: true, damage: 2, isCritical: false },
        damage: 2,
      };
      
      const result = triggerEvent(state, event);
      
      expect(result.event.damage).toBe(3);
      expect(result.powerCardsToFlip).toContainEqual({ powerCardId: 31, heroId: 'tarak' });
    });
  });
});
