import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Hero, AVAILABLE_HEROES } from './types';
import {
  HeroPowerCards,
  HERO_CUSTOM_ABILITIES,
  createInitialPowerCardsState,
  flipPowerCard,
  addLevel2DailyCard,
  getShuffledAtWillCards,
  getShuffledDailyCards,
  getShuffledUtilityCards,
} from './powerCards';

export type EdgePosition = 'top' | 'bottom' | 'left' | 'right';

export interface HeroSelection {
  hero: Hero;
  edge: EdgePosition;
}

/**
 * Power card selection for a hero during character setup
 */
export interface HeroPowerCardSelection {
  heroId: string;
  utility: number | null;
  atWills: number[];
  daily: number | null;
}

export interface HeroesState {
  availableHeroes: Hero[];
  selectedHeroes: Hero[];
  heroEdgeMap: Record<string, EdgePosition>; // Maps hero ID to the edge that selected it
  /** Power card selections during character setup (before game starts) */
  powerCardSelections: Record<string, HeroPowerCardSelection>;
  /** Finalized power cards for each hero (after game starts) */
  heroPowerCards: Record<string, HeroPowerCards>;
}

const initialState: HeroesState = {
  availableHeroes: AVAILABLE_HEROES,
  selectedHeroes: [],
  heroEdgeMap: {},
  powerCardSelections: {},
  heroPowerCards: {},
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
        delete state.powerCardSelections[heroId];
      } else {
        // Select the hero (max 5)
        if (state.selectedHeroes.length < 5) {
          const hero = state.availableHeroes.find(h => h.id === heroId);
          if (hero) {
            state.selectedHeroes.push(hero);
            // Initialize power card selection with random cards for this hero
            const shuffledUtilityCards = getShuffledUtilityCards(hero.heroClass, hero.id);
            const shuffledAtWillCards = getShuffledAtWillCards(hero.heroClass, hero.id);
            const shuffledDailyCards = getShuffledDailyCards(hero.heroClass, hero.id);
            
            state.powerCardSelections[heroId] = {
              heroId,
              utility: shuffledUtilityCards.length > 0 ? shuffledUtilityCards[0].id : null,
              atWills: shuffledAtWillCards.length >= 2 ? [shuffledAtWillCards[0].id, shuffledAtWillCards[1].id] : [],
              daily: shuffledDailyCards.length > 0 ? shuffledDailyCards[0].id : null,
            };
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
          delete state.powerCardSelections[heroId];
        }
      } else {
        // Select the hero (max 5)
        if (state.selectedHeroes.length < 5) {
          const hero = state.availableHeroes.find(h => h.id === heroId);
          if (hero) {
            state.selectedHeroes.push(hero);
            state.heroEdgeMap[heroId] = edge;
            // Initialize power card selection with random cards for this hero
            const shuffledUtilityCards = getShuffledUtilityCards(hero.heroClass, hero.id);
            const shuffledAtWillCards = getShuffledAtWillCards(hero.heroClass, hero.id);
            const shuffledDailyCards = getShuffledDailyCards(hero.heroClass, hero.id);
            
            state.powerCardSelections[heroId] = {
              heroId,
              utility: shuffledUtilityCards.length > 0 ? shuffledUtilityCards[0].id : null,
              atWills: shuffledAtWillCards.length >= 2 ? [shuffledAtWillCards[0].id, shuffledAtWillCards[1].id] : [],
              daily: shuffledDailyCards.length > 0 ? shuffledDailyCards[0].id : null,
            };
          }
        }
      }
    },
    clearSelection: (state) => {
      state.selectedHeroes = [];
      state.heroEdgeMap = {};
      state.powerCardSelections = {};
      state.heroPowerCards = {};
    },
    /**
     * Select a utility power card for a hero.
     * Clicking a different card replaces the selection.
     * Clicking the same card again keeps it selected (no toggle off).
     */
    selectUtilityCard: (state, action: PayloadAction<{ heroId: string; cardId: number }>) => {
      const { heroId, cardId } = action.payload;
      const selection = state.powerCardSelections[heroId];
      if (selection) {
        // Always set to the clicked card (replace selection, don't toggle off)
        selection.utility = cardId;
      }
    },
    /**
     * Toggle an at-will power card for a hero (max 2).
     * This action allows toggling off a selected card to choose a different one,
     * which is necessary since you can select 2 cards from a larger pool.
     */
    toggleAtWillCard: (state, action: PayloadAction<{ heroId: string; cardId: number }>) => {
      const { heroId, cardId } = action.payload;
      const selection = state.powerCardSelections[heroId];
      if (selection) {
        const index = selection.atWills.indexOf(cardId);
        if (index >= 0) {
          // Deselect (allows changing selection)
          selection.atWills.splice(index, 1);
        } else if (selection.atWills.length < 2) {
          // Select (max 2)
          selection.atWills.push(cardId);
        }
      }
    },
    /**
     * Select a daily power card for a hero.
     * Clicking a different card replaces the selection.
     * Clicking the same card again keeps it selected (no toggle off).
     */
    selectDailyCard: (state, action: PayloadAction<{ heroId: string; cardId: number }>) => {
      const { heroId, cardId } = action.payload;
      const selection = state.powerCardSelections[heroId];
      if (selection) {
        // Always set to the clicked card (replace selection, don't toggle off)
        selection.daily = cardId;
      }
    },
    /**
     * Finalize power card selections when game starts.
     * Converts power card selections to HeroPowerCards state.
     * Note: The game start flow should validate that all heroes have complete
     * power card selections before calling this action. Heroes with incomplete
     * selections will have empty power cards, but the canStartGame check in
     * CharacterSelect.svelte prevents this scenario.
     */
    finalizePowerCardSelections: (state) => {
      state.heroPowerCards = {};
      for (const hero of state.selectedHeroes) {
        const selection = state.powerCardSelections[hero.id];
        const customAbility = HERO_CUSTOM_ABILITIES[hero.id];
        
        if (selection && customAbility && selection.utility && selection.daily && selection.atWills.length === 2) {
          state.heroPowerCards[hero.id] = createInitialPowerCardsState(
            hero.id,
            customAbility,
            selection.utility,
            selection.atWills,
            selection.daily
          );
        } else {
          // Log warning for debugging - this shouldn't happen if validation is working
          console.warn(`Hero ${hero.id} has incomplete power card selection, skipping`);
        }
      }
    },
    /**
     * Flip (use) a power card for a hero
     */
    usePowerCard: (state, action: PayloadAction<{ heroId: string; cardId: number }>) => {
      const { heroId, cardId } = action.payload;
      const powerCards = state.heroPowerCards[heroId];
      if (powerCards) {
        state.heroPowerCards[heroId] = flipPowerCard(powerCards, cardId);
      }
    },
    /**
     * Add a level 2 daily power card for a hero
     */
    addLevel2Daily: (state, action: PayloadAction<{ heroId: string; cardId: number }>) => {
      const { heroId, cardId } = action.payload;
      const powerCards = state.heroPowerCards[heroId];
      if (powerCards) {
        state.heroPowerCards[heroId] = addLevel2DailyCard(powerCards, cardId);
      }
    },
  },
});

export const {
  toggleHeroSelection,
  selectHeroFromEdge,
  clearSelection,
  selectUtilityCard,
  toggleAtWillCard,
  selectDailyCard,
  finalizePowerCardSelections,
  usePowerCard,
  addLevel2Daily,
} = heroesSlice.actions;
export default heroesSlice.reducer;
