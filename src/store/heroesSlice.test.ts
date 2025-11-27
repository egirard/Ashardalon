import { describe, it, expect } from 'vitest';
import heroesReducer, { toggleHeroSelection, clearSelection, HeroesState } from './heroesSlice';
import { AVAILABLE_HEROES } from './types';

describe('heroesSlice', () => {
  const initialState: HeroesState = {
    availableHeroes: AVAILABLE_HEROES,
    selectedHeroes: [],
  };

  describe('initial state', () => {
    it('should return the initial state', () => {
      const state = heroesReducer(undefined, { type: 'unknown' });
      expect(state.availableHeroes).toEqual(AVAILABLE_HEROES);
      expect(state.selectedHeroes).toEqual([]);
    });
  });

  describe('toggleHeroSelection', () => {
    it('should select a hero when not already selected', () => {
      const state = heroesReducer(initialState, toggleHeroSelection('quinn'));
      expect(state.selectedHeroes).toHaveLength(1);
      expect(state.selectedHeroes[0].id).toBe('quinn');
      expect(state.selectedHeroes[0].name).toBe('Quinn');
    });

    it('should deselect a hero when already selected', () => {
      const stateWithSelection: HeroesState = {
        ...initialState,
        selectedHeroes: [AVAILABLE_HEROES[0]], // Quinn
      };
      const state = heroesReducer(stateWithSelection, toggleHeroSelection('quinn'));
      expect(state.selectedHeroes).toHaveLength(0);
    });

    it('should allow selecting multiple heroes up to 5', () => {
      let state = initialState;
      state = heroesReducer(state, toggleHeroSelection('quinn'));
      state = heroesReducer(state, toggleHeroSelection('vistra'));
      state = heroesReducer(state, toggleHeroSelection('keyleth'));
      state = heroesReducer(state, toggleHeroSelection('tarak'));
      state = heroesReducer(state, toggleHeroSelection('haskan'));
      
      expect(state.selectedHeroes).toHaveLength(5);
      expect(state.selectedHeroes.map(h => h.id)).toEqual([
        'quinn', 'vistra', 'keyleth', 'tarak', 'haskan'
      ]);
    });

    it('should not allow selecting more than 5 heroes', () => {
      const stateWith5Selected: HeroesState = {
        ...initialState,
        selectedHeroes: [...AVAILABLE_HEROES],
      };
      // Try to select a 6th hero (but all are already selected, so try again with same)
      const state = heroesReducer(stateWith5Selected, toggleHeroSelection('quinn'));
      // This should deselect quinn since it's already selected
      expect(state.selectedHeroes).toHaveLength(4);
    });

    it('should not add 6th hero when 5 are already selected with different hero id', () => {
      // Create a state with 5 heroes selected, but we'll try to add a "fake" 6th one
      const stateWith5Selected: HeroesState = {
        availableHeroes: [
          ...AVAILABLE_HEROES,
          { id: 'extra', name: 'Extra', heroClass: 'Fighter', imagePath: 'assets/extra.png' },
        ],
        selectedHeroes: [...AVAILABLE_HEROES], // 5 heroes
      };
      // Try to select the extra hero when already at max
      const state = heroesReducer(stateWith5Selected, toggleHeroSelection('extra'));
      // Should still be 5 since we can't exceed the limit
      expect(state.selectedHeroes).toHaveLength(5);
    });

    it('should not do anything for non-existent hero id', () => {
      const state = heroesReducer(initialState, toggleHeroSelection('nonexistent'));
      expect(state.selectedHeroes).toHaveLength(0);
    });

    it('should preserve other selected heroes when deselecting one', () => {
      const stateWithMultiple: HeroesState = {
        ...initialState,
        selectedHeroes: [AVAILABLE_HEROES[0], AVAILABLE_HEROES[1]], // Quinn and Vistra
      };
      const state = heroesReducer(stateWithMultiple, toggleHeroSelection('quinn'));
      expect(state.selectedHeroes).toHaveLength(1);
      expect(state.selectedHeroes[0].id).toBe('vistra');
    });
  });

  describe('clearSelection', () => {
    it('should clear all selected heroes', () => {
      const stateWithSelection: HeroesState = {
        ...initialState,
        selectedHeroes: [AVAILABLE_HEROES[0], AVAILABLE_HEROES[1]],
      };
      const state = heroesReducer(stateWithSelection, clearSelection());
      expect(state.selectedHeroes).toHaveLength(0);
    });

    it('should do nothing when no heroes are selected', () => {
      const state = heroesReducer(initialState, clearSelection());
      expect(state.selectedHeroes).toHaveLength(0);
    });
  });
});
