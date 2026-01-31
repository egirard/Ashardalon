import { describe, it, expect } from 'vitest';
import uiReducer, { toggleScorchMarks, type UIState } from './uiSlice';

describe('uiSlice', () => {
  it('should toggle scorch mark diagnostics on and off', () => {
    const initialState: UIState = {
      fontScale: 1.0,
      showScorchMarks: false,
    };

    const enabledState = uiReducer(initialState, toggleScorchMarks());
    expect(enabledState.showScorchMarks).toBe(true);

    const disabledState = uiReducer(enabledState, toggleScorchMarks());
    expect(disabledState.showScorchMarks).toBe(false);
  });
});
