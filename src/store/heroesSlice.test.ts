import { describe, it, expect } from 'vitest';
import heroesReducer, { 
  toggleHeroSelection, 
  selectHeroFromEdge, 
  clearSelection,
  selectUtilityCard,
  toggleAtWillCard,
  selectDailyCard,
  HeroesState 
} from './heroesSlice';
import { AVAILABLE_HEROES } from './types';

describe('heroesSlice', () => {
  const initialState: HeroesState = {
    availableHeroes: AVAILABLE_HEROES,
    selectedHeroes: [],
    heroEdgeMap: {},
    powerCardSelections: {},
    heroPowerCards: {},
  };

  describe('initial state', () => {
    it('should return the initial state', () => {
      const state = heroesReducer(undefined, { type: 'unknown' });
      expect(state.availableHeroes).toEqual(AVAILABLE_HEROES);
      expect(state.selectedHeroes).toEqual([]);
      expect(state.heroEdgeMap).toEqual({});
      expect(state.powerCardSelections).toEqual({});
      expect(state.heroPowerCards).toEqual({});
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
        heroEdgeMap: {},
        powerCardSelections: { quinn: { heroId: 'quinn', utility: null, atWills: [], daily: null } },
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
        heroEdgeMap: {},
        powerCardSelections: {
          quinn: { heroId: 'quinn', utility: null, atWills: [], daily: null },
          vistra: { heroId: 'vistra', utility: null, atWills: [], daily: null },
          keyleth: { heroId: 'keyleth', utility: null, atWills: [], daily: null },
          tarak: { heroId: 'tarak', utility: null, atWills: [], daily: null },
          haskan: { heroId: 'haskan', utility: null, atWills: [], daily: null },
        },
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
          { id: 'extra', name: 'Extra', heroClass: 'Fighter', imagePath: 'assets/extra.png', speed: 5, attack: { name: 'Sword', attackBonus: 6, damage: 2, range: 1 }, hp: 8, maxHp: 8, ac: 17 },
        ],
        selectedHeroes: [...AVAILABLE_HEROES], // 5 heroes
        heroEdgeMap: {},
        powerCardSelections: {
          quinn: { heroId: 'quinn', utility: null, atWills: [], daily: null },
          vistra: { heroId: 'vistra', utility: null, atWills: [], daily: null },
          keyleth: { heroId: 'keyleth', utility: null, atWills: [], daily: null },
          tarak: { heroId: 'tarak', utility: null, atWills: [], daily: null },
          haskan: { heroId: 'haskan', utility: null, atWills: [], daily: null },
        },
        heroPowerCards: {},
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
        heroEdgeMap: {},
        powerCardSelections: {
          quinn: { heroId: 'quinn', utility: null, atWills: [], daily: null },
          vistra: { heroId: 'vistra', utility: null, atWills: [], daily: null },
        },
      };
      const state = heroesReducer(stateWithMultiple, toggleHeroSelection('quinn'));
      expect(state.selectedHeroes).toHaveLength(1);
      expect(state.selectedHeroes[0].id).toBe('vistra');
    });
  });

  describe('selectHeroFromEdge', () => {
    it('should select a hero and track the edge', () => {
      const state = heroesReducer(initialState, selectHeroFromEdge({ heroId: 'quinn', edge: 'bottom' }));
      expect(state.selectedHeroes).toHaveLength(1);
      expect(state.selectedHeroes[0].id).toBe('quinn');
      expect(state.heroEdgeMap['quinn']).toBe('bottom');
    });

    it('should deselect a hero when clicked from the same edge', () => {
      const stateWithSelection: HeroesState = {
        ...initialState,
        selectedHeroes: [AVAILABLE_HEROES[0]], // Quinn
        heroEdgeMap: { quinn: 'bottom' },
        powerCardSelections: { quinn: { heroId: 'quinn', utility: null, atWills: [], daily: null } },
      };
      const state = heroesReducer(stateWithSelection, selectHeroFromEdge({ heroId: 'quinn', edge: 'bottom' }));
      expect(state.selectedHeroes).toHaveLength(0);
      expect(state.heroEdgeMap['quinn']).toBeUndefined();
    });

    it('should not deselect a hero when clicked from a different edge', () => {
      const stateWithSelection: HeroesState = {
        ...initialState,
        selectedHeroes: [AVAILABLE_HEROES[0]], // Quinn
        heroEdgeMap: { quinn: 'bottom' },
        powerCardSelections: { quinn: { heroId: 'quinn', utility: null, atWills: [], daily: null } },
      };
      const state = heroesReducer(stateWithSelection, selectHeroFromEdge({ heroId: 'quinn', edge: 'top' }));
      // Should still be selected since it was clicked from a different edge
      expect(state.selectedHeroes).toHaveLength(1);
      expect(state.heroEdgeMap['quinn']).toBe('bottom');
    });

    it('should allow multiple heroes from different edges', () => {
      let state = initialState;
      state = heroesReducer(state, selectHeroFromEdge({ heroId: 'quinn', edge: 'bottom' }));
      state = heroesReducer(state, selectHeroFromEdge({ heroId: 'vistra', edge: 'top' }));
      state = heroesReducer(state, selectHeroFromEdge({ heroId: 'keyleth', edge: 'left' }));
      
      expect(state.selectedHeroes).toHaveLength(3);
      expect(state.heroEdgeMap['quinn']).toBe('bottom');
      expect(state.heroEdgeMap['vistra']).toBe('top');
      expect(state.heroEdgeMap['keyleth']).toBe('left');
    });
  });

  describe('clearSelection', () => {
    it('should clear all selected heroes', () => {
      const stateWithSelection: HeroesState = {
        ...initialState,
        selectedHeroes: [AVAILABLE_HEROES[0], AVAILABLE_HEROES[1]],
        heroEdgeMap: { quinn: 'bottom', vistra: 'top' },
        powerCardSelections: {
          quinn: { heroId: 'quinn', utility: null, atWills: [], daily: null },
          vistra: { heroId: 'vistra', utility: null, atWills: [], daily: null },
        },
      };
      const state = heroesReducer(stateWithSelection, clearSelection());
      expect(state.selectedHeroes).toHaveLength(0);
      expect(state.heroEdgeMap).toEqual({});
      expect(state.powerCardSelections).toEqual({});
    });

    it('should do nothing when no heroes are selected', () => {
      const state = heroesReducer(initialState, clearSelection());
      expect(state.selectedHeroes).toHaveLength(0);
      expect(state.heroEdgeMap).toEqual({});
    });
  });

  describe('power card selection', () => {
    it('should auto-select power cards when hero is selected', () => {
      const state = heroesReducer(initialState, toggleHeroSelection('quinn'));
      expect(state.powerCardSelections['quinn']).toBeDefined();
      expect(state.powerCardSelections['quinn'].utility).not.toBeNull();
      expect(state.powerCardSelections['quinn'].atWills).toHaveLength(2);
      expect(state.powerCardSelections['quinn'].daily).not.toBeNull();
    });

    it('should replace utility card selection instead of toggling off', () => {
      let state = heroesReducer(initialState, toggleHeroSelection('quinn'));
      const initialUtility = state.powerCardSelections['quinn'].utility;
      
      // Click the same card again - should stay selected (not toggle off)
      state = heroesReducer(state, selectUtilityCard({ heroId: 'quinn', cardId: initialUtility }));
      expect(state.powerCardSelections['quinn'].utility).toBe(initialUtility);
      
      // Click a different card - should replace selection
      const newUtilityId = initialUtility === 8 ? 9 : 8;
      state = heroesReducer(state, selectUtilityCard({ heroId: 'quinn', cardId: newUtilityId }));
      expect(state.powerCardSelections['quinn'].utility).toBe(newUtilityId);
    });

    it('should replace daily card selection instead of toggling off', () => {
      let state = heroesReducer(initialState, toggleHeroSelection('quinn'));
      const initialDaily = state.powerCardSelections['quinn'].daily;
      
      // Click the same card again - should stay selected (not toggle off)
      state = heroesReducer(state, selectDailyCard({ heroId: 'quinn', cardId: initialDaily }));
      expect(state.powerCardSelections['quinn'].daily).toBe(initialDaily);
      
      // Click a different card - should replace selection
      const newDailyId = initialDaily === 5 ? 6 : 5;
      state = heroesReducer(state, selectDailyCard({ heroId: 'quinn', cardId: newDailyId }));
      expect(state.powerCardSelections['quinn'].daily).toBe(newDailyId);
    });

    it('should toggle at-will cards to allow deselection', () => {
      let state = heroesReducer(initialState, toggleHeroSelection('quinn'));
      const initialAtWills = [...state.powerCardSelections['quinn'].atWills];
      
      // Click one of the selected cards - should deselect it
      state = heroesReducer(state, toggleAtWillCard({ heroId: 'quinn', cardId: initialAtWills[0] }));
      expect(state.powerCardSelections['quinn'].atWills).toHaveLength(1);
      expect(state.powerCardSelections['quinn'].atWills).not.toContain(initialAtWills[0]);
      
      // Click it again - should re-select it
      state = heroesReducer(state, toggleAtWillCard({ heroId: 'quinn', cardId: initialAtWills[0] }));
      expect(state.powerCardSelections['quinn'].atWills).toHaveLength(2);
      expect(state.powerCardSelections['quinn'].atWills).toContain(initialAtWills[0]);
    });
  });
});
