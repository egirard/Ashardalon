import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Hero, AVAILABLE_HEROES } from './types';

export interface HeroesState {
  availableHeroes: Hero[];
  selectedHeroes: Hero[];
}

const initialState: HeroesState = {
  availableHeroes: AVAILABLE_HEROES,
  selectedHeroes: [],
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
    clearSelection: (state) => {
      state.selectedHeroes = [];
    },
  },
});

export const { toggleHeroSelection, clearSelection } = heroesSlice.actions;
export default heroesSlice.reducer;
