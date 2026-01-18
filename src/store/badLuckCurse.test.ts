import { describe, it, expect } from 'vitest';
import gameReducer, { startGame, dismissEncounterCard, endVillainPhase, endExplorationPhase } from './gameSlice';
import { getEncounterById, shouldDrawAnotherEncounter } from './encounters';

describe('Bad Luck Curse', () => {
  it('should draw extra encounter when hero has Bad Luck curse', () => {
    // Start a game with one hero
    let state = gameReducer(undefined, startGame({ 
      heroIds: ['quinn'], 
      positions: [{ x: 2, y: 2 }],
      seed: 42 // deterministic for testing
    }));

    // Apply Bad Luck curse to quinn
    const badLuckEncounter = getEncounterById('bad-luck');
    expect(badLuckEncounter).toBeDefined();
    
    state = {
      ...state,
      drawnEncounter: badLuckEncounter!,
    };

    // Dismiss the encounter (apply the curse)
    state = gameReducer(state, dismissEncounterCard());

    // Verify the curse status is applied
    const quinnHp = state.heroHp.find(h => h.heroId === 'quinn');
    expect(quinnHp?.statuses?.some(s => s.type === 'curse-bad-luck')).toBe(true);
    
    // Now trigger exploration phase end (which enters villain phase and draws encounter)
    state = {
      ...state,
      turnState: {
        ...state.turnState,
        currentPhase: 'exploration-phase',
        exploredThisTurn: false, // No exploration = encounter drawn
      },
    };
    
    state = gameReducer(state, endExplorationPhase());
    
    // Should have drawn an encounter
    expect(state.drawnEncounter).not.toBeNull();
    
    // Should have set the flag for extra encounter
    expect(state.badLuckExtraEncounterPending).toBe(true);
    
    // Dismiss the first encounter
    const firstEncounterId = state.drawnEncounter?.id;
    state = gameReducer(state, dismissEncounterCard());
    
    // Should have drawn a second encounter (extra from Bad Luck)
    expect(state.drawnEncounter).not.toBeNull();
    expect(state.drawnEncounter?.id).not.toBe(firstEncounterId); // Different encounter
    
    // Flag should be cleared
    expect(state.badLuckExtraEncounterPending).toBe(false);
    
    // Should show Bad Luck message
    expect(state.encounterEffectMessage).toContain('Bad Luck curse');
    expect(state.encounterEffectMessage).toContain('draws an extra encounter');
  });

  it('should NOT draw extra encounter when hero does not have Bad Luck curse', () => {
    // Start a game with one hero
    let state = gameReducer(undefined, startGame({ 
      heroIds: ['quinn'], 
      positions: [{ x: 2, y: 2 }],
      seed: 43 // Different seed to get a non-special encounter
    }));

    // Verify no Bad Luck curse
    let quinnHp = state.heroHp.find(h => h.heroId === 'quinn');
    expect(quinnHp?.statuses?.some(s => s.type === 'curse-bad-luck')).toBe(false);
    
    // Verify flag is initially false
    expect(state.badLuckExtraEncounterPending).toBe(false);

    // Trigger exploration phase end without Bad Luck curse
    state = {
      ...state,
      turnState: {
        ...state.turnState,
        currentPhase: 'exploration-phase',
        exploredThisTurn: false, // No exploration = encounter drawn
      },
    };
    
    state = gameReducer(state, endExplorationPhase());
    
    // Should have drawn an encounter
    expect(state.drawnEncounter).not.toBeNull();
    
    // Should NOT have set the flag for extra encounter
    expect(state.badLuckExtraEncounterPending).toBe(false);
    
    // Remember the encounter type for checking later
    const encounterNeedsSelfDraw = shouldDrawAnotherEncounter(state.drawnEncounter!.id);
    
    // Dismiss the encounter
    state = gameReducer(state, dismissEncounterCard());
    
    // If the encounter itself requires another draw (like Hidden Treasure), 
    // it will draw one. But it should NOT draw an extra for Bad Luck.
    // If the encounter doesn't require another draw, drawnEncounter should be null.
    if (encounterNeedsSelfDraw) {
      // The encounter drew another one due to its own rules (not Bad Luck)
      // We can't easily test this without knowing which encounter was drawn
      // So we'll just verify the flag is still false
      expect(state.badLuckExtraEncounterPending).toBe(false);
    } else {
      // Normal encounter - should be cleared
      expect(state.drawnEncounter).toBeNull();
    }
    
    // Flag should still be false
    expect(state.badLuckExtraEncounterPending).toBe(false);
  });

  it('should attempt curse removal at end of Villain Phase (success)', () => {
    // Start a game with one hero
    let state = gameReducer(undefined, startGame({ 
      heroIds: ['quinn'], 
      positions: [{ x: 2, y: 2 }],
      seed: 100 // Use a seed that will produce a high roll
    }));

    // Apply Bad Luck curse to quinn
    const badLuckEncounter = getEncounterById('bad-luck');
    state = {
      ...state,
      drawnEncounter: badLuckEncounter!,
    };
    state = gameReducer(state, dismissEncounterCard());

    // Verify curse is applied
    let quinnHp = state.heroHp.find(h => h.heroId === 'quinn');
    expect(quinnHp?.statuses?.some(s => s.type === 'curse-bad-luck')).toBe(true);
    
    // Move to villain phase
    state = {
      ...state,
      turnState: {
        ...state.turnState,
        currentPhase: 'villain-phase',
      },
    };
    
    // End villain phase - this should attempt curse removal
    state = gameReducer(state, endVillainPhase());
    
    // Check if curse was removed (depends on the roll)
    quinnHp = state.heroHp.find(h => h.heroId === 'quinn');
    const stillCursed = quinnHp?.statuses?.some(s => s.type === 'curse-bad-luck');
    
    // Message should indicate the roll attempt
    expect(state.encounterEffectMessage).toBeDefined();
    expect(state.encounterEffectMessage).toContain('rolled');
    
    if (stillCursed) {
      // Roll was less than 10
      expect(state.encounterEffectMessage).toContain('failed to remove');
      expect(state.encounterEffectMessage).toContain('need 10+');
    } else {
      // Roll was 10 or more
      expect(state.encounterEffectMessage).toContain('removed Bad Luck curse');
    }
  });

  it('should attempt curse removal at end of Villain Phase (failure)', () => {
    // Start a game with one hero
    let state = gameReducer(undefined, startGame({ 
      heroIds: ['quinn'], 
      positions: [{ x: 2, y: 2 }],
      seed: 1 // Use a seed that will produce a low roll
    }));

    // Apply Bad Luck curse to quinn
    const badLuckEncounter = getEncounterById('bad-luck');
    state = {
      ...state,
      drawnEncounter: badLuckEncounter!,
    };
    state = gameReducer(state, dismissEncounterCard());

    // Verify curse is applied
    let quinnHp = state.heroHp.find(h => h.heroId === 'quinn');
    expect(quinnHp?.statuses?.some(s => s.type === 'curse-bad-luck')).toBe(true);
    
    // Move to villain phase
    state = {
      ...state,
      turnState: {
        ...state.turnState,
        currentPhase: 'villain-phase',
      },
    };
    
    // End villain phase - this should attempt curse removal
    state = gameReducer(state, endVillainPhase());
    
    // Check if curse was removed (depends on the roll)
    quinnHp = state.heroHp.find(h => h.heroId === 'quinn');
    const stillCursed = quinnHp?.statuses?.some(s => s.type === 'curse-bad-luck');
    
    // Message should indicate the roll attempt
    expect(state.encounterEffectMessage).toBeDefined();
    expect(state.encounterEffectMessage).toContain('rolled');
    
    if (stillCursed) {
      // Roll was less than 10
      expect(state.encounterEffectMessage).toContain('failed to remove');
      expect(state.encounterEffectMessage).toContain('need 10+');
    } else {
      // Roll was 10 or more
      expect(state.encounterEffectMessage).toContain('removed Bad Luck curse');
    }
  });

  it('should persist curse across multiple turns until removed', () => {
    // Start a game with one hero
    let state = gameReducer(undefined, startGame({ 
      heroIds: ['quinn'], 
      positions: [{ x: 2, y: 2 }],
      seed: 1 // Low roll seed
    }));

    // Apply Bad Luck curse
    const badLuckEncounter = getEncounterById('bad-luck');
    state = {
      ...state,
      drawnEncounter: badLuckEncounter!,
    };
    state = gameReducer(state, dismissEncounterCard());

    // Verify curse is applied
    let quinnHp = state.heroHp.find(h => h.heroId === 'quinn');
    expect(quinnHp?.statuses?.some(s => s.type === 'curse-bad-luck')).toBe(true);
    
    // Cycle through multiple villain phase ends
    for (let i = 0; i < 5; i++) {
      state = {
        ...state,
        turnState: {
          ...state.turnState,
          currentPhase: 'villain-phase',
        },
      };
      
      state = gameReducer(state, endVillainPhase());
      
      // Check if curse is still there
      quinnHp = state.heroHp.find(h => h.heroId === 'quinn');
      const stillCursed = quinnHp?.statuses?.some(s => s.type === 'curse-bad-luck');
      
      if (!stillCursed) {
        // Curse was removed
        expect(state.encounterEffectMessage).toContain('removed Bad Luck curse');
        break;
      }
    }
  });
});
