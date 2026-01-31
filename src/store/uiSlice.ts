import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * UI Preferences State
 * Manages user interface preferences including font scaling
 */
export interface UIState {
  /** Font scale multiplier for UI elements (0.8 to 1.5) */
  fontScale: number;
  /** Whether to display diagnostic scorch mark overlays on tiles */
  showScorchMarks: boolean;
}

const initialState: UIState = {
  fontScale: 1.0, // Default 100% scale
  showScorchMarks: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    /**
     * Set the font scale for UI elements
     * @param scale - Scale value between 0.8 and 1.5
     */
    setFontScale(state, action: PayloadAction<number>) {
      // Clamp scale between 0.8 and 1.5
      state.fontScale = Math.max(0.8, Math.min(1.5, action.payload));
    },
    
    /**
     * Reset font scale to default (1.0)
     */
    resetFontScale(state) {
      state.fontScale = 1.0;
    },
    
    /**
     * Increase font scale by 0.1
     */
    increaseFontScale(state) {
      state.fontScale = Math.min(1.5, state.fontScale + 0.1);
    },
    
    /**
     * Decrease font scale by 0.1
     */
    decreaseFontScale(state) {
      state.fontScale = Math.max(0.8, state.fontScale - 0.1);
    },
    /**
     * Toggle diagnostic scorch mark overlay visibility.
     */
    toggleScorchMarks(state) {
      state.showScorchMarks = !state.showScorchMarks;
    },
  },
});

export const { setFontScale, resetFontScale, increaseFontScale, decreaseFontScale, toggleScorchMarks } = uiSlice.actions;
export default uiSlice.reducer;
