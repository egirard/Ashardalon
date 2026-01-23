import { configureStore } from '@reduxjs/toolkit';
import heroesReducer from './heroesSlice';
import gameReducer from './gameSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    heroes: heroesReducer,
    game: gameReducer,
    ui: uiReducer,
  },
});

// Expose store for E2E testing
declare global {
  interface Window {
    __REDUX_STORE__: typeof store;
  }
}

if (typeof window !== 'undefined') {
  window.__REDUX_STORE__ = store;
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
