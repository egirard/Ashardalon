import { describe, it, expect } from 'vitest';
import {
  initializeEventHooks,
  registerHeroPowerCardHooks,
  unregisterPowerCard,
  registerAllHeroHooks,
  triggerGameEvent,
  countHeroesOnTile,
  getCurrentHeroId,
  isPowerCardHookActive,
  getActiveHookPowerCards,
} from './powerCardIntegration';
import { createEventHookState } from './gameEvents';
import type { HeroPowerCards } from './powerCards';
import type { GameState } from './gameSlice';
import { initializeDungeon } from './exploration';

describe('powerCardIntegration', () => {
  describe('initializeEventHooks', () => {
    it('should create initial event hook state', () => {
      const state = initializeEventHooks();
      
      expect(state.hooks).toEqual({});
      expect(state.hookIdCounter).toBe(0);
    });
  });

  describe('registerHeroPowerCardHooks', () => {
    it('should register hooks for available power cards', () => {
      const state = createEventHookState();
      
      const heroPowerCards: HeroPowerCards = {
        heroId: 'tarak',
        customAbility: 31, // Furious Assault - has hook
        utility: 38,       // Distant Diversion - no hook
        atWills: [32, 33],
        daily: 35,
        cardStates: [
          { cardId: 31, isFlipped: false }, // Available
          { cardId: 38, isFlipped: false },
          { cardId: 32, isFlipped: false },
          { cardId: 33, isFlipped: false },
          { cardId: 35, isFlipped: false },
        ],
      };
      
      const newState = registerHeroPowerCardHooks(state, heroPowerCards);
      
      // Should register hook for Furious Assault (31)
      expect(Object.keys(newState.hooks).length).toBeGreaterThan(0);
      
      const registrations = Object.values(newState.hooks);
      expect(registrations.some(r => r.powerCardId === 31)).toBe(true);
    });

    it('should not register hooks for flipped cards', () => {
      const state = createEventHookState();
      
      const heroPowerCards: HeroPowerCards = {
        heroId: 'tarak',
        customAbility: 31, // Furious Assault - has hook
        utility: 38,
        atWills: [32, 33],
        daily: 35,
        cardStates: [
          { cardId: 31, isFlipped: true }, // Already used
          { cardId: 38, isFlipped: false },
          { cardId: 32, isFlipped: false },
          { cardId: 33, isFlipped: false },
          { cardId: 35, isFlipped: false },
        ],
      };
      
      const newState = registerHeroPowerCardHooks(state, heroPowerCards);
      
      // Should not register any hooks since Furious Assault is flipped
      const registrations = Object.values(newState.hooks);
      expect(registrations.some(r => r.powerCardId === 31)).toBe(false);
    });

    it('should register hooks for multiple cards with hooks', () => {
      const state = createEventHookState();
      
      const heroPowerCards: HeroPowerCards = {
        heroId: 'tarak',
        customAbility: 31, // Furious Assault - has hook
        utility: 40,       // Tumbling Escape - has hook
        atWills: [32, 33],
        daily: 35,
        cardStates: [
          { cardId: 31, isFlipped: false },
          { cardId: 40, isFlipped: false },
          { cardId: 32, isFlipped: false },
          { cardId: 33, isFlipped: false },
          { cardId: 35, isFlipped: false },
        ],
      };
      
      const newState = registerHeroPowerCardHooks(state, heroPowerCards);
      
      const registrations = Object.values(newState.hooks);
      expect(registrations.some(r => r.powerCardId === 31)).toBe(true);
      expect(registrations.some(r => r.powerCardId === 40)).toBe(true);
    });

    it('should handle level 2 daily card', () => {
      const state = createEventHookState();
      
      const heroPowerCards: HeroPowerCards = {
        heroId: 'quinn',
        customAbility: 1,
        utility: 10,    // Perseverance - has hook
        atWills: [2, 3],
        daily: 5,
        dailyLevel2: 6, // Second daily at level 2
        cardStates: [
          { cardId: 1, isFlipped: false },
          { cardId: 10, isFlipped: false },
          { cardId: 2, isFlipped: false },
          { cardId: 3, isFlipped: false },
          { cardId: 5, isFlipped: false },
          { cardId: 6, isFlipped: false },
        ],
      };
      
      const newState = registerHeroPowerCardHooks(state, heroPowerCards);
      
      // Should register hook for Perseverance
      const registrations = Object.values(newState.hooks);
      expect(registrations.some(r => r.powerCardId === 10)).toBe(true);
    });
  });

  describe('unregisterPowerCard', () => {
    it('should remove hooks for a specific power card', () => {
      let state = createEventHookState();
      
      const heroPowerCards: HeroPowerCards = {
        heroId: 'tarak',
        customAbility: 31, // Furious Assault
        utility: 40,       // Tumbling Escape
        atWills: [32, 33],
        daily: 35,
        cardStates: [
          { cardId: 31, isFlipped: false },
          { cardId: 40, isFlipped: false },
          { cardId: 32, isFlipped: false },
          { cardId: 33, isFlipped: false },
          { cardId: 35, isFlipped: false },
        ],
      };
      
      state = registerHeroPowerCardHooks(state, heroPowerCards);
      
      // Verify both cards have hooks
      let registrations = Object.values(state.hooks);
      expect(registrations.some(r => r.powerCardId === 31)).toBe(true);
      expect(registrations.some(r => r.powerCardId === 40)).toBe(true);
      
      // Unregister Furious Assault
      state = unregisterPowerCard(state, 31, 'tarak');
      
      // Verify only Tumbling Escape remains
      registrations = Object.values(state.hooks);
      expect(registrations.some(r => r.powerCardId === 31)).toBe(false);
      expect(registrations.some(r => r.powerCardId === 40)).toBe(true);
    });
  });

  describe('registerAllHeroHooks', () => {
    it('should register hooks for multiple heroes', () => {
      const state = createEventHookState();
      
      const hero1PowerCards: HeroPowerCards = {
        heroId: 'tarak',
        customAbility: 31, // Furious Assault
        utility: 38,
        atWills: [32, 33],
        daily: 35,
        cardStates: [
          { cardId: 31, isFlipped: false },
          { cardId: 38, isFlipped: false },
          { cardId: 32, isFlipped: false },
          { cardId: 33, isFlipped: false },
          { cardId: 35, isFlipped: false },
        ],
      };
      
      const hero2PowerCards: HeroPowerCards = {
        heroId: 'quinn',
        customAbility: 1,
        utility: 10,    // Perseverance
        atWills: [2, 3],
        daily: 5,
        cardStates: [
          { cardId: 1, isFlipped: false },
          { cardId: 10, isFlipped: false },
          { cardId: 2, isFlipped: false },
          { cardId: 3, isFlipped: false },
          { cardId: 5, isFlipped: false },
        ],
      };
      
      const newState = registerAllHeroHooks(state, [hero1PowerCards, hero2PowerCards]);
      
      const registrations = Object.values(newState.hooks);
      expect(registrations.some(r => r.powerCardId === 31 && r.heroId === 'tarak')).toBe(true);
      expect(registrations.some(r => r.powerCardId === 10 && r.heroId === 'quinn')).toBe(true);
    });
  });

  describe('triggerGameEvent', () => {
    it('should trigger event and return results', () => {
      let state = createEventHookState();
      
      const heroPowerCards: HeroPowerCards = {
        heroId: 'tarak',
        customAbility: 31, // Furious Assault
        utility: 38,
        atWills: [32, 33],
        daily: 35,
        cardStates: [
          { cardId: 31, isFlipped: false },
          { cardId: 38, isFlipped: false },
          { cardId: 32, isFlipped: false },
          { cardId: 33, isFlipped: false },
          { cardId: 35, isFlipped: false },
        ],
      };
      
      state = registerHeroPowerCardHooks(state, heroPowerCards);
      
      const event = {
        type: 'attack-hit-by-hero' as const,
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
      
      const result = triggerGameEvent(state, event);
      
      expect(result.event.damage).toBe(3); // +1 from Furious Assault
      expect(result.powerCardsToFlip).toContainEqual({ powerCardId: 31, heroId: 'tarak' });
    });
  });

  describe('countHeroesOnTile', () => {
    it('should count heroes on start tile', () => {
      const gameState = {
        heroTokens: [
          { heroId: 'quinn', position: { x: 1, y: 2 } },  // Start tile
          { heroId: 'vistra', position: { x: 2, y: 3 } }, // Start tile
          { heroId: 'tarak', position: { x: 5, y: 1 } },  // Different tile
        ],
        dungeon: initializeDungeon(),
      } as any as GameState;
      
      const count = countHeroesOnTile(gameState, 'start-tile');
      expect(count).toBe(2);
    });
  });

  describe('getCurrentHeroId', () => {
    it('should return current hero ID', () => {
      const gameState = {
        heroTokens: [
          { heroId: 'quinn', position: { x: 1, y: 2 } },
          { heroId: 'vistra', position: { x: 2, y: 3 } },
        ],
        turnState: {
          currentHeroIndex: 1,
          currentPhase: 'hero-phase' as const,
          turnNumber: 1,
          exploredThisTurn: false,
          drewOnlyWhiteTilesThisTurn: false,
        },
      } as any as GameState;
      
      const heroId = getCurrentHeroId(gameState);
      expect(heroId).toBe('vistra');
    });

    it('should return empty string when no heroes', () => {
      const gameState = {
        heroTokens: [],
        turnState: {
          currentHeroIndex: 0,
          currentPhase: 'hero-phase' as const,
          turnNumber: 1,
          exploredThisTurn: false,
          drewOnlyWhiteTilesThisTurn: false,
        },
      } as any as GameState;
      
      const heroId = getCurrentHeroId(gameState);
      expect(heroId).toBe('');
    });
  });

  describe('isPowerCardHookActive', () => {
    it('should return true for active hook', () => {
      let state = createEventHookState();
      
      const heroPowerCards: HeroPowerCards = {
        heroId: 'tarak',
        customAbility: 31,
        utility: 38,
        atWills: [32, 33],
        daily: 35,
        cardStates: [
          { cardId: 31, isFlipped: false },
          { cardId: 38, isFlipped: false },
          { cardId: 32, isFlipped: false },
          { cardId: 33, isFlipped: false },
          { cardId: 35, isFlipped: false },
        ],
      };
      
      state = registerHeroPowerCardHooks(state, heroPowerCards);
      
      expect(isPowerCardHookActive(state, 31, 'tarak')).toBe(true);
    });

    it('should return false for inactive hook', () => {
      const state = createEventHookState();
      
      expect(isPowerCardHookActive(state, 31, 'tarak')).toBe(false);
    });
  });

  describe('getActiveHookPowerCards', () => {
    it('should return all active power cards for a hero', () => {
      let state = createEventHookState();
      
      const heroPowerCards: HeroPowerCards = {
        heroId: 'tarak',
        customAbility: 31, // Furious Assault
        utility: 40,       // Tumbling Escape
        atWills: [32, 33],
        daily: 35,
        cardStates: [
          { cardId: 31, isFlipped: false },
          { cardId: 40, isFlipped: false },
          { cardId: 32, isFlipped: false },
          { cardId: 33, isFlipped: false },
          { cardId: 35, isFlipped: false },
        ],
      };
      
      state = registerHeroPowerCardHooks(state, heroPowerCards);
      
      const activeCards = getActiveHookPowerCards(state, 'tarak');
      
      expect(activeCards).toContain(31);
      expect(activeCards).toContain(40);
      expect(activeCards.length).toBe(2);
    });

    it('should return empty array for hero with no active hooks', () => {
      const state = createEventHookState();
      
      const activeCards = getActiveHookPowerCards(state, 'tarak');
      
      expect(activeCards).toEqual([]);
    });
  });
});
