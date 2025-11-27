import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Hero, AVAILABLE_HEROES } from './types';

export type EdgePosition = 'top' | 'bottom' | 'left' | 'right';

export interface HeroSelection {
  hero: Hero;
  edge: EdgePosition;
}

export interface HeroesState {
  availableHeroes: Hero[];
  selectedHeroes: Hero[];
  heroEdgeMap: Record<string, EdgePosition>; // Maps hero ID to the edge that selected it
}

const initialState: HeroesState = {
  availableHeroes: AVAILABLE_HEROES,
  selectedHeroes: [],
  heroEdgeMap: {},
};

export const heroesSlice = createSlice({
  name: 'heroes',
  initialState,
  reducers: {
    toggleHeroSelection: (state, action: PayloadAction<string>) => {
      const heroId = action.payload;
      const existingIndex = state.selectedHeroes.findIndex(h => h.id === heroId);
      
      if (existingIndex >= 0) {
        // Deselect the hero
        state.selectedHeroes.splice(existingIndex, 1);
        delete state.heroEdgeMap[heroId];
      } else {
        // Select the hero (max 5)
        if (state.selectedHeroes.length < 5) {
          const hero = state.availableHeroes.find(h => h.id === heroId);
          if (hero) {
            state.selectedHeroes.push(hero);
          }
        }
      }
    },
    selectHeroFromEdge: (state, action: PayloadAction<{ heroId: string; edge: EdgePosition }>) => {
      const { heroId, edge } = action.payload;
      const existingIndex = state.selectedHeroes.findIndex(h => h.id === heroId);
      
      if (existingIndex >= 0) {
        // Deselect the hero (only if clicking from the same edge that selected it)
        if (state.heroEdgeMap[heroId] === edge) {
          state.selectedHeroes.splice(existingIndex, 1);
          delete state.heroEdgeMap[heroId];
        }
      } else {
        // Select the hero (max 5)
        if (state.selectedHeroes.length < 5) {
          const hero = state.availableHeroes.find(h => h.id === heroId);
          if (hero) {
            state.selectedHeroes.push(hero);
            state.heroEdgeMap[heroId] = edge;
          }
        }
      }
    },
    clearSelection: (state) => {
      state.selectedHeroes = [];
      state.heroEdgeMap = {};
    },
  },
});

export const { toggleHeroSelection, selectHeroFromEdge, clearSelection } = heroesSlice.actions;
export default heroesSlice.reducer;
