import { describe, it, expect } from 'vitest';
import { 
  isPowerCardEligibleForActivation,
  getPowerCardIneligibilityReason,
  getPowerCardHighlightState 
} from './powerCardEligibility';
import { getPowerCardById } from './powerCards';
import type { GameState } from './gameSlice';
import type { MonsterState } from './types';

describe('powerCardEligibility - target validation', () => {
  // Create a minimal game state for testing
  const createTestGameState = (): GameState => ({
    turnState: {
      currentPhase: 'hero-phase',
      currentHeroIndex: 0,
      turnNumber: 1
    },
    heroTokens: [
      {
        heroId: 'vistra',
        position: { x: 2, y: 3 },
        edgePosition: 'bottom' as const
      }
    ],
    heroTurnActions: {
      canMove: true,
      canAttack: true,
      canExplore: true
    },
    dungeon: {
      tiles: [],
      startTile: {
        id: 'start',
        tileType: 'start',
        orientation: 0,
        placedAtX: 0,
        placedAtY: 0,
        monsters: [],
        isExplored: true
      }
    },
    monsters: [],
    heroHp: [{ heroId: 'vistra', currentHp: 10, maxHp: 10, surges: 2, statuses: [] }],
    scenario: {} as any,
    partyResources: {} as any
  } as GameState);

  const createTestMonster = (instanceId: string, position: { x: number, y: number }): MonsterState => ({
    instanceId,
    monsterId: 'kobold',
    tileId: 'start',
    position,
    hp: 3,
    isDowned: false
  });

  describe('attack cards without targetableMonsters', () => {
    it('should be eligible if canAttack is true (backwards compatibility)', () => {
      const gameState = createTestGameState();
      const bashCard = getPowerCardById(2); // Bash - melee attack
      
      if (!bashCard) throw new Error('Bash card not found');
      
      const isEligible = isPowerCardEligibleForActivation(
        bashCard,
        false, // not flipped
        gameState,
        'vistra'
        // no targetableMonsters provided
      );
      
      expect(isEligible).toBe(true);
    });

    it('should not be eligible if canAttack is false', () => {
      const gameState = createTestGameState();
      gameState.heroTurnActions.canAttack = false;
      
      const bashCard = getPowerCardById(2);
      if (!bashCard) throw new Error('Bash card not found');
      
      const isEligible = isPowerCardEligibleForActivation(
        bashCard,
        false,
        gameState,
        'vistra'
      );
      
      expect(isEligible).toBe(false);
    });
  });

  describe('attack cards with targetableMonsters', () => {
    it('should be eligible when there are valid targets', () => {
      const gameState = createTestGameState();
      const adjacentMonster = createTestMonster('monster-1', { x: 2, y: 2 });
      
      const bashCard = getPowerCardById(2); // Bash
      if (!bashCard) throw new Error('Bash card not found');
      
      const isEligible = isPowerCardEligibleForActivation(
        bashCard,
        false,
        gameState,
        'vistra',
        [adjacentMonster] // pass targetable monsters
      );
      
      expect(isEligible).toBe(true);
    });

    it('should NOT be eligible when there are no valid targets', () => {
      const gameState = createTestGameState();
      
      const bashCard = getPowerCardById(2); // Bash
      if (!bashCard) throw new Error('Bash card not found');
      
      const isEligible = isPowerCardEligibleForActivation(
        bashCard,
        false,
        gameState,
        'vistra',
        [] // empty targetable monsters array
      );
      
      expect(isEligible).toBe(false);
    });

    it('should NOT be eligible if canAttack is false even with valid targets', () => {
      const gameState = createTestGameState();
      gameState.heroTurnActions.canAttack = false;
      
      const adjacentMonster = createTestMonster('monster-1', { x: 2, y: 2 });
      const bashCard = getPowerCardById(2);
      if (!bashCard) throw new Error('Bash card not found');
      
      const isEligible = isPowerCardEligibleForActivation(
        bashCard,
        false,
        gameState,
        'vistra',
        [adjacentMonster]
      );
      
      expect(isEligible).toBe(false);
    });
  });

  describe('ineligibility reasons', () => {
    it('should return "No valid targets in range" when no targets available', () => {
      const gameState = createTestGameState();
      const bashCard = getPowerCardById(2);
      if (!bashCard) throw new Error('Bash card not found');
      
      const reason = getPowerCardIneligibilityReason(
        bashCard,
        false,
        gameState,
        'vistra',
        [] // no targets
      );
      
      expect(reason).toBe('No valid targets in range');
    });

    it('should return appropriate message when card is flipped', () => {
      const gameState = createTestGameState();
      const bashCard = getPowerCardById(2);
      if (!bashCard) throw new Error('Bash card not found');
      
      const reason = getPowerCardIneligibilityReason(
        bashCard,
        true, // flipped
        gameState,
        'vistra',
        []
      );
      
      expect(reason).toBe('This power has already been used');
    });

    it('should return appropriate message when canAttack is false', () => {
      const gameState = createTestGameState();
      gameState.heroTurnActions.canAttack = false;
      
      const bashCard = getPowerCardById(2);
      if (!bashCard) throw new Error('Bash card not found');
      
      const reason = getPowerCardIneligibilityReason(
        bashCard,
        false,
        gameState,
        'vistra',
        []
      );
      
      expect(reason).toBe('You have already attacked this turn');
    });
  });

  describe('highlight state', () => {
    it('should return "eligible" when attack card has valid targets', () => {
      const gameState = createTestGameState();
      const adjacentMonster = createTestMonster('monster-1', { x: 2, y: 2 });
      
      const bashCard = getPowerCardById(2);
      if (!bashCard) throw new Error('Bash card not found');
      
      const state = getPowerCardHighlightState(
        bashCard,
        false,
        gameState,
        'vistra',
        [adjacentMonster]
      );
      
      expect(state).toBe('eligible');
    });

    it('should return "ineligible" when attack card has no valid targets', () => {
      const gameState = createTestGameState();
      
      const bashCard = getPowerCardById(2);
      if (!bashCard) throw new Error('Bash card not found');
      
      const state = getPowerCardHighlightState(
        bashCard,
        false,
        gameState,
        'vistra',
        [] // no targets
      );
      
      expect(state).toBe('ineligible');
    });

    it('should return "disabled" when card is flipped', () => {
      const gameState = createTestGameState();
      const adjacentMonster = createTestMonster('monster-1', { x: 2, y: 2 });
      
      const bashCard = getPowerCardById(2);
      if (!bashCard) throw new Error('Bash card not found');
      
      const state = getPowerCardHighlightState(
        bashCard,
        true, // flipped
        gameState,
        'vistra',
        [adjacentMonster]
      );
      
      expect(state).toBe('disabled');
    });
  });

  describe('non-attack cards', () => {
    it('should not be affected by targetableMonsters parameter', () => {
      const gameState = createTestGameState();
      
      // Dwarven Resilience is a utility card (ID 11)
      const utilityCard = getPowerCardById(11);
      if (!utilityCard) throw new Error('Dwarven Resilience card not found');
      
      const withoutMonsters = isPowerCardEligibleForActivation(
        utilityCard,
        false,
        gameState,
        'vistra',
        []
      );
      
      const withMonsters = isPowerCardEligibleForActivation(
        utilityCard,
        false,
        gameState,
        'vistra',
        [createTestMonster('m1', { x: 2, y: 2 })]
      );
      
      // Should have same result regardless of monsters
      expect(withoutMonsters).toBe(withMonsters);
    });
  });
});
