/**
 * Unit tests for "A Gap in the Armor" curse mechanics
 */

import { describe, it, expect } from 'vitest';
import gameReducer, { 
  startGame, 
  endHeroPhase, 
  endVillainPhase,
  moveHero
} from './gameSlice';
import { applyStatusEffect } from './statusEffects';

describe('Gap in the Armor Curse', () => {
  describe('AC Penalty', () => {
    it('should apply -4 AC penalty when curse is active', () => {
      // Start a game with one hero
      let state = gameReducer(undefined, startGame({ 
        heroIds: ['quinn'], 
        positions: [{ x: 2, y: 2 }],
        seed: 42
      }));

      const quinnHpBefore = state.heroHp.find(h => h.heroId === 'quinn');
      expect(quinnHpBefore?.statuses).toEqual([]);

      // Apply the curse
      state = {
        ...state,
        heroHp: state.heroHp.map(h => 
          h.heroId === 'quinn' 
            ? { ...h, statuses: applyStatusEffect(h.statuses ?? [], 'curse-gap-in-armor', 'gap-in-armor', 1) }
            : h
        ),
      };

      const quinnHpAfter = state.heroHp.find(h => h.heroId === 'quinn');
      expect(quinnHpAfter?.statuses?.some(s => s.type === 'curse-gap-in-armor')).toBe(true);
    });
  });

  describe('Movement Tracking', () => {
    it('should set heroMovedThisPhase flag when hero moves', () => {
      let state = gameReducer(undefined, startGame({ 
        heroIds: ['quinn'], 
        positions: [{ x: 2, y: 2 }],
        seed: 42
      }));

      expect(state.heroMovedThisPhase).toBe(false);

      // Manually set showing movement to simulate initiating movement
      state = {
        ...state,
        showingMovement: true,
        validMoveSquares: [{ x: 2, y: 3 }], // Add a valid move square
      };

      // Move the hero
      const quinnToken = state.heroTokens.find(t => t.heroId === 'quinn');
      if (quinnToken) {
        state = gameReducer(state, moveHero({
          heroId: 'quinn',
          position: { x: quinnToken.position.x, y: quinnToken.position.y + 1 },
          speed: 5,
        }));
      }

      expect(state.heroMovedThisPhase).toBe(true);
    });

    it('should reset heroMovedThisPhase flag at start of new Hero Phase', () => {
      let state = gameReducer(undefined, startGame({ 
        heroIds: ['quinn'], 
        positions: [{ x: 2, y: 2 }],
        seed: 42
      }));

      // Manually set showing movement and move the hero
      state = {
        ...state,
        showingMovement: true,
        validMoveSquares: [{ x: 2, y: 3 }],
      };
      
      const quinnToken = state.heroTokens.find(t => t.heroId === 'quinn');
      if (quinnToken) {
        state = gameReducer(state, moveHero({
          heroId: 'quinn',
          position: { x: quinnToken.position.x, y: quinnToken.position.y + 1 },
          speed: 5,
        }));
      }

      expect(state.heroMovedThisPhase).toBe(true);

      // End hero phase and start new hero phase
      state = gameReducer(state, endHeroPhase());
      
      // Manually set phase to villain-phase to test endVillainPhase
      state = {
        ...state,
        turnState: {
          ...state.turnState,
          currentPhase: 'villain-phase',
        },
      };
      
      state = gameReducer(state, endVillainPhase());

      expect(state.heroMovedThisPhase).toBe(false);
    });
  });

  describe('Curse Removal', () => {
    it('should remove curse if hero did not move during Hero Phase', () => {
      let state = gameReducer(undefined, startGame({ 
        heroIds: ['quinn'], 
        positions: [{ x: 2, y: 2 }],
        seed: 42
      }));

      // Apply the curse
      state = {
        ...state,
        heroHp: state.heroHp.map(h => 
          h.heroId === 'quinn' 
            ? { ...h, statuses: applyStatusEffect(h.statuses ?? [], 'curse-gap-in-armor', 'gap-in-armor', 1) }
            : h
        ),
      };

      const quinnHp = state.heroHp.find(h => h.heroId === 'quinn');
      expect(quinnHp?.statuses?.some(s => s.type === 'curse-gap-in-armor')).toBe(true);
      expect(state.heroMovedThisPhase).toBe(false);

      // End hero phase without moving
      state = gameReducer(state, endHeroPhase());

      const updatedQuinnHp = state.heroHp.find(h => h.heroId === 'quinn');
      
      // Curse should be removed
      expect(updatedQuinnHp?.statuses?.some(s => s.type === 'curse-gap-in-armor')).toBe(false);
      
      // Should have a notification message
      expect(state.encounterEffectMessage).toContain('A Gap in the Armor curse removed');
      expect(state.encounterEffectMessage).toContain('did not move');
    });

    it('should not remove curse if hero moved during Hero Phase', () => {
      let state = gameReducer(undefined, startGame({ 
        heroIds: ['quinn'], 
        positions: [{ x: 2, y: 2 }],
        seed: 42
      }));

      // Apply the curse
      state = {
        ...state,
        heroHp: state.heroHp.map(h => 
          h.heroId === 'quinn' 
            ? { ...h, statuses: applyStatusEffect(h.statuses ?? [], 'curse-gap-in-armor', 'gap-in-armor', 1) }
            : h
        ),
      };

      // Manually set showing movement and move the hero
      state = {
        ...state,
        showingMovement: true,
        validMoveSquares: [{ x: 2, y: 3 }],
      };
      
      const quinnToken = state.heroTokens.find(t => t.heroId === 'quinn');
      if (quinnToken) {
        state = gameReducer(state, moveHero({
          heroId: 'quinn',
          position: { x: quinnToken.position.x, y: quinnToken.position.y + 1 },
          speed: 5,
        }));
      }

      expect(state.heroMovedThisPhase).toBe(true);

      // End hero phase after moving
      state = gameReducer(state, endHeroPhase());

      const updatedQuinnHp = state.heroHp.find(h => h.heroId === 'quinn');
      
      // Curse should still be present
      expect(updatedQuinnHp?.statuses?.some(s => s.type === 'curse-gap-in-armor')).toBe(true);
    });

    it('should only check for curse removal on the current hero', () => {
      let state = gameReducer(undefined, startGame({ 
        heroIds: ['quinn', 'vistra'], 
        positions: [{ x: 2, y: 2 }, { x: 3, y: 3 }],
        seed: 42
      }));

      expect(state.turnState.currentHeroIndex).toBe(0); // Quinn is current

      // Apply curse to the second hero (not current)
      state = {
        ...state,
        heroHp: state.heroHp.map(h => 
          h.heroId === 'vistra' 
            ? { ...h, statuses: applyStatusEffect(h.statuses ?? [], 'curse-gap-in-armor', 'gap-in-armor', 1) }
            : h
        ),
      };

      // End hero phase without moving (Quinn's turn)
      state = gameReducer(state, endHeroPhase());

      const vistraHp = state.heroHp.find(h => h.heroId === 'vistra');
      
      // Vistra's curse should still be present (not her turn)
      expect(vistraHp?.statuses?.some(s => s.type === 'curse-gap-in-armor')).toBe(true);
    });
  });

  describe('Integration with other curses', () => {
    it('should not affect other curse mechanics', () => {
      let state = gameReducer(undefined, startGame({ 
        heroIds: ['quinn'], 
        positions: [{ x: 2, y: 2 }],
        seed: 42
      }));

      // Apply both Gap in Armor and Terrifying Roar curses
      // (Terrifying Roar doesn't auto-remove at end of Hero Phase, only at end of Exploration Phase)
      state = {
        ...state,
        heroHp: state.heroHp.map(h => {
          if (h.heroId === 'quinn') {
            let statuses = applyStatusEffect(h.statuses ?? [], 'curse-gap-in-armor', 'gap-in-armor', 1);
            statuses = applyStatusEffect(statuses, 'curse-terrifying-roar', 'terrifying-roar', 1);
            return { ...h, statuses };
          }
          return h;
        }),
      };

      const quinnHp = state.heroHp.find(h => h.heroId === 'quinn');
      
      expect(quinnHp?.statuses?.some(s => s.type === 'curse-gap-in-armor')).toBe(true);
      expect(quinnHp?.statuses?.some(s => s.type === 'curse-terrifying-roar')).toBe(true);

      // End hero phase without moving
      state = gameReducer(state, endHeroPhase());

      const updatedQuinnHp = state.heroHp.find(h => h.heroId === 'quinn');
      
      // Gap in Armor should be removed
      expect(updatedQuinnHp?.statuses?.some(s => s.type === 'curse-gap-in-armor')).toBe(false);
      
      // Terrifying Roar should still be present (different removal condition)
      expect(updatedQuinnHp?.statuses?.some(s => s.type === 'curse-terrifying-roar')).toBe(true);
    });
  });
});
