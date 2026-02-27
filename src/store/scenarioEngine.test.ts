import { describe, it, expect } from 'vitest';
import { applyDeckSetup } from './scenarioEngine';
import { CHAMBER_ENTRANCE_TILE_ID, INITIAL_TILE_DECK } from './types';
import type { DeckSetupConfig } from './scenarios';

describe('scenarioEngine', () => {
  describe('applyDeckSetup', () => {
    const deterministicRandom = () => 0.5; // Produces a consistent shuffle

    it('places the Chamber Entrance tile immediately after the mini-stack', () => {
      const config: DeckSetupConfig = { miniStackSize: 10, chamberEntrancePosition: 0 };
      const tiles = [...INITIAL_TILE_DECK];

      const deck = applyDeckSetup(tiles, config, deterministicRandom);

      // Chamber Entrance should be at index miniStackSize
      expect(deck[10]).toBe(CHAMBER_ENTRANCE_TILE_ID);
    });

    it('places 10 regular tiles before the Chamber Entrance (Adventure 14 config)', () => {
      const config: DeckSetupConfig = { miniStackSize: 10, chamberEntrancePosition: 0 };
      const tiles = [...INITIAL_TILE_DECK];

      const deck = applyDeckSetup(tiles, config, deterministicRandom);

      // First 10 tiles should all be regular tiles (not the chamber entrance)
      const miniStack = deck.slice(0, 10);
      miniStack.forEach(tileId => {
        expect(tileId).not.toBe(CHAMBER_ENTRANCE_TILE_ID);
      });
    });

    it('places 12 regular tiles before the Chamber Entrance (Adventure 15 config)', () => {
      const config: DeckSetupConfig = { miniStackSize: 12, chamberEntrancePosition: 0 };
      const tiles = [...INITIAL_TILE_DECK];

      const deck = applyDeckSetup(tiles, config, deterministicRandom);

      // Chamber Entrance should be at index 12
      expect(deck[12]).toBe(CHAMBER_ENTRANCE_TILE_ID);

      // First 12 tiles should be regular tiles
      const miniStack = deck.slice(0, 12);
      miniStack.forEach(tileId => {
        expect(tileId).not.toBe(CHAMBER_ENTRANCE_TILE_ID);
      });
    });

    it('includes all regular tiles from INITIAL_TILE_DECK plus the Chamber Entrance', () => {
      const config: DeckSetupConfig = { miniStackSize: 10, chamberEntrancePosition: 0 };
      const tiles = [...INITIAL_TILE_DECK];

      const deck = applyDeckSetup(tiles, config, deterministicRandom);

      // Total length = regular tiles + 1 chamber entrance
      expect(deck).toHaveLength(INITIAL_TILE_DECK.length + 1);

      // All original tiles should be present
      INITIAL_TILE_DECK.forEach(tileId => {
        expect(deck).toContain(tileId);
      });

      // Chamber entrance should appear exactly once
      expect(deck.filter(id => id === CHAMBER_ENTRANCE_TILE_ID)).toHaveLength(1);
    });

    it('does not include chamber entrance in the regular tile pool (tiles param only)', () => {
      const config: DeckSetupConfig = { miniStackSize: 5, chamberEntrancePosition: 0 };
      const tiles = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

      const deck = applyDeckSetup(tiles, config, () => 0);

      // Should have 7 regular tiles + 1 chamber entrance
      expect(deck).toHaveLength(8);
      expect(deck[5]).toBe(CHAMBER_ENTRANCE_TILE_ID);
    });

    it('places remaining tiles after the Chamber Entrance', () => {
      const config: DeckSetupConfig = { miniStackSize: 3, chamberEntrancePosition: 0 };
      const tiles = ['a', 'b', 'c', 'd', 'e'];

      const deck = applyDeckSetup(tiles, config, () => 0);

      // Deck: [3 regular tiles, CHAMBER_ENTRANCE, 2 remaining regular tiles]
      expect(deck).toHaveLength(6);
      expect(deck[3]).toBe(CHAMBER_ENTRANCE_TILE_ID);
      // Remaining tiles after the chamber entrance should not include chamber entrance
      const remainder = deck.slice(4);
      remainder.forEach(id => {
        expect(id).not.toBe(CHAMBER_ENTRANCE_TILE_ID);
      });
    });

    it('shuffles the input tiles before splitting into mini-stack and remainder', () => {
      const config: DeckSetupConfig = { miniStackSize: 4, chamberEntrancePosition: 0 };
      const tiles = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

      const deck1 = applyDeckSetup([...tiles], config, () => 0.1);
      const deck2 = applyDeckSetup([...tiles], config, () => 0.9);

      // Different random functions should produce different orderings
      const deck1WithoutChamber = deck1.filter(id => id !== CHAMBER_ENTRANCE_TILE_ID);
      const deck2WithoutChamber = deck2.filter(id => id !== CHAMBER_ENTRANCE_TILE_ID);
      expect(deck1WithoutChamber.join(',')).not.toBe(deck2WithoutChamber.join(','));
    });

    it('handles miniStackSize of 0 (Chamber Entrance is the first tile drawn)', () => {
      const config: DeckSetupConfig = { miniStackSize: 0, chamberEntrancePosition: 0 };
      const tiles = ['a', 'b', 'c'];

      const deck = applyDeckSetup(tiles, config, () => 0);

      expect(deck[0]).toBe(CHAMBER_ENTRANCE_TILE_ID);
      expect(deck).toHaveLength(4);
    });
  });
});
