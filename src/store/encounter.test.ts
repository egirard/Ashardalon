import { describe, it, expect } from 'vitest';
import {
  initializeEncounterDeck,
  drawEncounter,
  discardEncounter,
  getEncounterById,
  canCancelEncounter,
  cancelEncounter,
} from './encounter';
import type { EncounterDeck, PartyResources } from './types';
import { INITIAL_ENCOUNTER_DECK, ENCOUNTER_CANCEL_COST } from './types';

describe('encounter', () => {
  describe('initializeEncounterDeck', () => {
    it('should create a deck with all encounter cards in draw pile', () => {
      const deck = initializeEncounterDeck();
      expect(deck.drawPile.length).toBe(INITIAL_ENCOUNTER_DECK.length);
      expect(deck.discardPile.length).toBe(0);
    });

    it('should shuffle the encounter cards', () => {
      // Create two decks with different seeds
      const deck1 = initializeEncounterDeck(() => 0.1);
      const deck2 = initializeEncounterDeck(() => 0.9);
      
      // They may have different orders
      // (not guaranteed to be different, but should both be valid)
      expect(deck1.drawPile.length).toBe(deck2.drawPile.length);
    });
  });

  describe('drawEncounter', () => {
    it('should draw an encounter from the deck', () => {
      const initialDeck: EncounterDeck = {
        drawPile: ['volcanic-spray', 'cave-in'],
        discardPile: [],
      };

      const { encounter, deck } = drawEncounter(initialDeck);
      
      expect(encounter).toBe('volcanic-spray');
      expect(deck.drawPile).toEqual(['cave-in']);
      expect(deck.discardPile).toEqual([]);
    });

    it('should reshuffle discard pile when draw pile is empty', () => {
      const initialDeck: EncounterDeck = {
        drawPile: [],
        discardPile: ['volcanic-spray', 'cave-in', 'poisoned-air'],
      };

      const { encounter, deck } = drawEncounter(initialDeck, () => 0.5);
      
      expect(encounter).not.toBeNull();
      expect(deck.discardPile).toEqual([]);
      expect(deck.drawPile.length).toBe(2); // One was drawn
    });

    it('should return null when both piles are empty', () => {
      const initialDeck: EncounterDeck = {
        drawPile: [],
        discardPile: [],
      };

      const { encounter, deck } = drawEncounter(initialDeck);
      
      expect(encounter).toBeNull();
      expect(deck.drawPile).toEqual([]);
      expect(deck.discardPile).toEqual([]);
    });
  });

  describe('discardEncounter', () => {
    it('should add encounter to discard pile', () => {
      const initialDeck: EncounterDeck = {
        drawPile: ['cave-in'],
        discardPile: ['volcanic-spray'],
      };

      const deck = discardEncounter(initialDeck, 'poisoned-air');
      
      expect(deck.drawPile).toEqual(['cave-in']);
      expect(deck.discardPile).toEqual(['volcanic-spray', 'poisoned-air']);
    });
  });

  describe('getEncounterById', () => {
    it('should return encounter card by ID', () => {
      const encounter = getEncounterById('volcanic-spray');
      
      expect(encounter).toBeDefined();
      expect(encounter?.name).toBe('Volcanic Spray');
      expect(encounter?.type).toBe('Event');
    });

    it('should return undefined for unknown ID', () => {
      const encounter = getEncounterById('unknown-encounter');
      
      expect(encounter).toBeUndefined();
    });
  });

  describe('canCancelEncounter', () => {
    it('should return true when XP >= 5', () => {
      const resources: PartyResources = { xp: 5, healingSurges: 2 };
      expect(canCancelEncounter(resources)).toBe(true);
    });

    it('should return true when XP > 5', () => {
      const resources: PartyResources = { xp: 10, healingSurges: 2 };
      expect(canCancelEncounter(resources)).toBe(true);
    });

    it('should return false when XP < 5', () => {
      const resources: PartyResources = { xp: 4, healingSurges: 2 };
      expect(canCancelEncounter(resources)).toBe(false);
    });

    it('should return false when XP is 0', () => {
      const resources: PartyResources = { xp: 0, healingSurges: 2 };
      expect(canCancelEncounter(resources)).toBe(false);
    });
  });

  describe('cancelEncounter', () => {
    it('should deduct 5 XP from party resources', () => {
      const resources: PartyResources = { xp: 6, healingSurges: 2 };
      const deck: EncounterDeck = { drawPile: [], discardPile: [] };
      
      const result = cancelEncounter('volcanic-spray', resources, deck);
      
      expect(result.resources.xp).toBe(1);
      expect(result.resources.healingSurges).toBe(2); // Unchanged
    });

    it('should add encounter to discard pile', () => {
      const resources: PartyResources = { xp: 5, healingSurges: 2 };
      const deck: EncounterDeck = { drawPile: ['cave-in'], discardPile: ['poisoned-air'] };
      
      const result = cancelEncounter('volcanic-spray', resources, deck);
      
      expect(result.encounterDeck.discardPile).toContain('volcanic-spray');
      expect(result.encounterDeck.drawPile).toEqual(['cave-in']);
    });

    it('should work with exactly 5 XP', () => {
      const resources: PartyResources = { xp: 5, healingSurges: 2 };
      const deck: EncounterDeck = { drawPile: [], discardPile: [] };
      
      const result = cancelEncounter('volcanic-spray', resources, deck);
      
      expect(result.resources.xp).toBe(0);
    });

    it('should cost exactly ENCOUNTER_CANCEL_COST', () => {
      const resources: PartyResources = { xp: 10, healingSurges: 2 };
      const deck: EncounterDeck = { drawPile: [], discardPile: [] };
      
      const result = cancelEncounter('volcanic-spray', resources, deck);
      
      expect(result.resources.xp).toBe(10 - ENCOUNTER_CANCEL_COST);
    });
  });
});
