/**
 * Unit tests for "High Alert" environment card mechanics
 * 
 * High Alert requires that at the end of each Villain Phase,
 * the active hero passes one monster card to the player on the right.
 */

import { describe, it, expect } from 'vitest';
import gameReducer, { startGame, endVillainPhase } from './gameSlice';
import { GameState } from './types';

describe('High Alert Environment', () => {
  describe('Multiplayer monster passing', () => {
    it('should pass one monster from active hero to player on right when High Alert is active', () => {
      // Start a game with two heroes
      let state = gameReducer(undefined, startGame({ 
        heroIds: ['quinn', 'vistra'], 
        positions: [{ x: 2, y: 2 }, { x: 2, y: 3 }],
        seed: 42
      }));
      
      // Manually set High Alert environment active
      state = {
        ...state,
        activeEnvironmentId: 'high-alert',
      };
      
      // Add a monster controlled by quinn (the first/current hero)
      state = {
        ...state,
        monsters: [
          {
            monsterId: 'kobold',
            instanceId: 'kobold-0',
            position: { x: 3, y: 2 },
            currentHp: 1,
            controllerId: 'quinn',
            tileId: 'start-tile',
          },
        ],
      };
      
      // Verify initial state
      expect(state.turnState.currentHeroIndex).toBe(0); // Quinn's turn
      expect(state.monsters[0].controllerId).toBe('quinn');
      
      // Move to villain phase
      state = {
        ...state,
        turnState: {
          ...state.turnState,
          currentPhase: 'villain-phase',
        },
      };
      
      // End villain phase - this should pass the monster to vistra
      state = gameReducer(state, endVillainPhase());
      
      // Verify monster was passed to vistra
      expect(state.monsters[0].controllerId).toBe('vistra');
      
      // Verify notification message
      expect(state.encounterEffectMessage).toContain('High Alert');
      expect(state.encounterEffectMessage).toContain('quinn');
      expect(state.encounterEffectMessage).toContain('vistra');
      expect(state.encounterEffectMessage).toContain('Kobold');
      
      // Verify we've moved to next hero (vistra)
      expect(state.turnState.currentHeroIndex).toBe(1);
      expect(state.turnState.currentPhase).toBe('hero-phase');
    });
    
    it('should pass monster to first player when last player is active', () => {
      // Start a game with three heroes
      let state = gameReducer(undefined, startGame({ 
        heroIds: ['quinn', 'vistra', 'keyleth'], 
        positions: [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 2, y: 4 }],
        seed: 42
      }));
      
      // Set High Alert environment active
      state = {
        ...state,
        activeEnvironmentId: 'high-alert',
      };
      
      // Add a monster controlled by keyleth (the last hero)
      state = {
        ...state,
        monsters: [
          {
            monsterId: 'kobold',
            instanceId: 'kobold-0',
            position: { x: 3, y: 2 },
            currentHp: 1,
            controllerId: 'keyleth',
            tileId: 'start-tile',
          },
        ],
      };
      
      // Set current hero to keyleth (index 2)
      state = {
        ...state,
        turnState: {
          ...state.turnState,
          currentHeroIndex: 2,
          currentPhase: 'villain-phase',
        },
      };
      
      // Verify initial state
      expect(state.turnState.currentHeroIndex).toBe(2); // Keyleth's turn
      expect(state.monsters[0].controllerId).toBe('keyleth');
      
      // End villain phase - this should pass the monster to quinn (wraps around)
      state = gameReducer(state, endVillainPhase());
      
      // Verify monster was passed to quinn (first player)
      expect(state.monsters[0].controllerId).toBe('quinn');
      
      // Verify notification message
      expect(state.encounterEffectMessage).toContain('High Alert');
      expect(state.encounterEffectMessage).toContain('keyleth');
      expect(state.encounterEffectMessage).toContain('quinn');
      
      // Verify we've wrapped back to first hero (quinn)
      expect(state.turnState.currentHeroIndex).toBe(0);
    });
    
    it('should only pass one monster even if hero controls multiple', () => {
      // Start a game with two heroes
      let state = gameReducer(undefined, startGame({ 
        heroIds: ['quinn', 'vistra'], 
        positions: [{ x: 2, y: 2 }, { x: 2, y: 3 }],
        seed: 42
      }));
      
      // Set High Alert environment active
      state = {
        ...state,
        activeEnvironmentId: 'high-alert',
      };
      
      // Add multiple monsters controlled by quinn
      state = {
        ...state,
        monsters: [
          {
            monsterId: 'kobold',
            instanceId: 'kobold-0',
            position: { x: 3, y: 2 },
            currentHp: 1,
            controllerId: 'quinn',
            tileId: 'start-tile',
          },
          {
            monsterId: 'snake',
            instanceId: 'snake-0',
            position: { x: 3, y: 3 },
            currentHp: 1,
            controllerId: 'quinn',
            tileId: 'start-tile',
          },
          {
            monsterId: 'cultist',
            instanceId: 'cultist-0',
            position: { x: 3, y: 4 },
            currentHp: 2,
            controllerId: 'quinn',
            tileId: 'start-tile',
          },
        ],
      };
      
      // Move to villain phase
      state = {
        ...state,
        turnState: {
          ...state.turnState,
          currentPhase: 'villain-phase',
        },
      };
      
      // Verify initial state - all 3 monsters controlled by quinn
      expect(state.monsters.filter(m => m.controllerId === 'quinn').length).toBe(3);
      expect(state.monsters.filter(m => m.controllerId === 'vistra').length).toBe(0);
      
      // End villain phase
      state = gameReducer(state, endVillainPhase());
      
      // Verify only one monster was passed to vistra
      expect(state.monsters.filter(m => m.controllerId === 'quinn').length).toBe(2);
      expect(state.monsters.filter(m => m.controllerId === 'vistra').length).toBe(1);
      
      // Verify the first monster (kobold) was passed
      const passedMonster = state.monsters.find(m => m.controllerId === 'vistra');
      expect(passedMonster?.instanceId).toBe('kobold-0');
    });
  });
  
  describe('Solo player edge case', () => {
    it('should not pass monsters when only one player is active', () => {
      // Start a game with one hero
      let state = gameReducer(undefined, startGame({ 
        heroIds: ['quinn'], 
        positions: [{ x: 2, y: 2 }],
        seed: 42
      }));
      
      // Set High Alert environment active
      state = {
        ...state,
        activeEnvironmentId: 'high-alert',
      };
      
      // Add a monster controlled by quinn
      state = {
        ...state,
        monsters: [
          {
            monsterId: 'kobold',
            instanceId: 'kobold-0',
            position: { x: 3, y: 2 },
            currentHp: 1,
            controllerId: 'quinn',
            tileId: 'start-tile',
          },
        ],
      };
      
      // Move to villain phase
      state = {
        ...state,
        turnState: {
          ...state.turnState,
          currentPhase: 'villain-phase',
        },
      };
      
      // Verify initial state
      expect(state.monsters[0].controllerId).toBe('quinn');
      
      // End villain phase
      state = gameReducer(state, endVillainPhase());
      
      // Verify monster was NOT passed (still controlled by quinn)
      expect(state.monsters[0].controllerId).toBe('quinn');
      
      // Verify no High Alert message was added
      // (encounterEffectMessage might be null or contain other messages)
      if (state.encounterEffectMessage) {
        expect(state.encounterEffectMessage).not.toContain('High Alert');
      }
    });
  });
  
  describe('No monsters to pass', () => {
    it('should not generate error when active hero has no monsters', () => {
      // Start a game with two heroes
      let state = gameReducer(undefined, startGame({ 
        heroIds: ['quinn', 'vistra'], 
        positions: [{ x: 2, y: 2 }, { x: 2, y: 3 }],
        seed: 42
      }));
      
      // Set High Alert environment active
      state = {
        ...state,
        activeEnvironmentId: 'high-alert',
      };
      
      // Add a monster controlled by vistra (not the active hero)
      state = {
        ...state,
        monsters: [
          {
            monsterId: 'kobold',
            instanceId: 'kobold-0',
            position: { x: 3, y: 2 },
            currentHp: 1,
            controllerId: 'vistra',
            tileId: 'start-tile',
          },
        ],
      };
      
      // Move to villain phase
      state = {
        ...state,
        turnState: {
          ...state.turnState,
          currentPhase: 'villain-phase',
        },
      };
      
      // Verify initial state - quinn has no monsters
      expect(state.turnState.currentHeroIndex).toBe(0);
      expect(state.monsters.filter(m => m.controllerId === 'quinn').length).toBe(0);
      
      // End villain phase - should not crash
      state = gameReducer(state, endVillainPhase());
      
      // Verify monster was not affected
      expect(state.monsters[0].controllerId).toBe('vistra');
      
      // Verify no High Alert message was added
      if (state.encounterEffectMessage) {
        expect(state.encounterEffectMessage).not.toContain('High Alert');
      }
    });
  });
  
  describe('Environment not active', () => {
    it('should not pass monsters when High Alert is not active', () => {
      // Start a game with two heroes
      let state = gameReducer(undefined, startGame({ 
        heroIds: ['quinn', 'vistra'], 
        positions: [{ x: 2, y: 2 }, { x: 2, y: 3 }],
        seed: 42
      }));
      
      // Do NOT set High Alert environment active (null or different environment)
      state = {
        ...state,
        activeEnvironmentId: null,
      };
      
      // Add a monster controlled by quinn
      state = {
        ...state,
        monsters: [
          {
            monsterId: 'kobold',
            instanceId: 'kobold-0',
            position: { x: 3, y: 2 },
            currentHp: 1,
            controllerId: 'quinn',
            tileId: 'start-tile',
          },
        ],
      };
      
      // Move to villain phase
      state = {
        ...state,
        turnState: {
          ...state.turnState,
          currentPhase: 'villain-phase',
        },
      };
      
      // Verify initial state
      expect(state.monsters[0].controllerId).toBe('quinn');
      
      // End villain phase
      state = gameReducer(state, endVillainPhase());
      
      // Verify monster was NOT passed (still controlled by quinn)
      expect(state.monsters[0].controllerId).toBe('quinn');
      
      // Verify no High Alert message was added
      if (state.encounterEffectMessage) {
        expect(state.encounterEffectMessage).not.toContain('High Alert');
      }
    });
  });
});
