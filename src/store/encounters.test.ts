import { describe, it, expect, vi } from "vitest";
import {
  initializeEncounterDeck,
  drawEncounter,
  discardEncounter,
  getEncounterById,
  shouldDrawEncounter,
  applyDamageToHero,
  applyDamageToAllHeroes,
  resolveEncounterEffect,
} from "./encounters";
import type { EncounterDeck, TurnState, HeroHpState, EncounterCard } from "./types";
import { INITIAL_ENCOUNTER_DECK, ENCOUNTER_CARDS } from "./types";

describe("encounters", () => {
  describe("initializeEncounterDeck", () => {
    it("should create a deck with all encounter cards in draw pile", () => {
      const deck = initializeEncounterDeck();
      
      expect(deck.drawPile).toHaveLength(INITIAL_ENCOUNTER_DECK.length);
      expect(deck.discardPile).toHaveLength(0);
      
      // All initial encounters should be in the draw pile
      for (const encounterId of INITIAL_ENCOUNTER_DECK) {
        expect(deck.drawPile).toContain(encounterId);
      }
    });

    it("should shuffle the deck using provided random function", () => {
      // Use a deterministic random function
      let callCount = 0;
      const deterministicRandom = () => {
        callCount++;
        return 0.5;
      };
      
      const deck = initializeEncounterDeck(deterministicRandom);
      
      // Should have called random during shuffle
      expect(callCount).toBeGreaterThan(0);
      expect(deck.drawPile).toHaveLength(INITIAL_ENCOUNTER_DECK.length);
    });
  });

  describe("drawEncounter", () => {
    it("should draw the top encounter from the deck", () => {
      const deck: EncounterDeck = {
        drawPile: ['volcanic-spray', 'goblin-ambush', 'dark-fog'],
        discardPile: [],
      };
      
      const result = drawEncounter(deck);
      
      expect(result.encounterId).toBe('volcanic-spray');
      expect(result.deck.drawPile).toEqual(['goblin-ambush', 'dark-fog']);
      expect(result.deck.discardPile).toEqual([]);
    });

    it("should reshuffle discard pile when draw pile is empty", () => {
      const deck: EncounterDeck = {
        drawPile: [],
        discardPile: ['cave-in', 'volcanic-spray'],
      };
      
      // Use deterministic random that doesn't shuffle
      const noShuffleRandom = () => 0;
      const result = drawEncounter(deck, noShuffleRandom);
      
      expect(result.encounterId).not.toBeNull();
      expect(result.deck.discardPile).toEqual([]);
      // Should have remaining cards in draw pile after drawing
      expect(result.deck.drawPile.length).toBe(1);
    });

    it("should return null when both piles are empty", () => {
      const deck: EncounterDeck = {
        drawPile: [],
        discardPile: [],
      };
      
      const result = drawEncounter(deck);
      
      expect(result.encounterId).toBeNull();
      expect(result.deck.drawPile).toEqual([]);
      expect(result.deck.discardPile).toEqual([]);
    });
  });

  describe("discardEncounter", () => {
    it("should add encounter to discard pile", () => {
      const deck: EncounterDeck = {
        drawPile: ['volcanic-spray'],
        discardPile: ['goblin-ambush'],
      };
      
      const result = discardEncounter(deck, 'cave-in');
      
      expect(result.drawPile).toEqual(['volcanic-spray']);
      expect(result.discardPile).toEqual(['goblin-ambush', 'cave-in']);
    });
  });

  describe("getEncounterById", () => {
    it("should return encounter definition for valid ID", () => {
      const encounter = getEncounterById('volcanic-spray');
      
      expect(encounter).toBeDefined();
      expect(encounter?.name).toBe('Volcanic Spray');
      expect(encounter?.type).toBe('event');
    });

    it("should return undefined for invalid ID", () => {
      const encounter = getEncounterById('nonexistent');
      
      expect(encounter).toBeUndefined();
    });
  });

  describe("shouldDrawEncounter", () => {
    it("should return true when no exploration occurred", () => {
      const turnState: TurnState = {
        currentHeroIndex: 0,
        currentPhase: 'villain-phase',
        turnNumber: 1,
        exploredThisTurn: false,
        drewOnlyWhiteTilesThisTurn: false,
      };
      
      expect(shouldDrawEncounter(turnState)).toBe(true);
    });

    it("should return true when black tile was drawn (triggers encounter)", () => {
      const turnState: TurnState = {
        currentHeroIndex: 0,
        currentPhase: 'villain-phase',
        turnNumber: 1,
        exploredThisTurn: true,
        drewOnlyWhiteTilesThisTurn: false,
      };
      
      expect(shouldDrawEncounter(turnState)).toBe(true);
    });

    it("should return false when only white tiles were drawn (prevents encounter)", () => {
      const turnState: TurnState = {
        currentHeroIndex: 0,
        currentPhase: 'villain-phase',
        turnNumber: 1,
        exploredThisTurn: true,
        drewOnlyWhiteTilesThisTurn: true,
      };
      
      expect(shouldDrawEncounter(turnState)).toBe(false);
    });
  });

  describe("applyDamageToHero", () => {
    it("should reduce hero HP by damage amount", () => {
      const heroHp: HeroHpState = {
        heroId: 'quinn',
        currentHp: 8,
        maxHp: 8,
        level: 1,
        ac: 17,
        surgeValue: 4,
        attackBonus: 6,
      };
      
      const result = applyDamageToHero(heroHp, 3);
      
      expect(result.currentHp).toBe(5);
    });

    it("should not reduce HP below 0", () => {
      const heroHp: HeroHpState = {
        heroId: 'quinn',
        currentHp: 2,
        maxHp: 8,
        level: 1,
        ac: 17,
        surgeValue: 4,
        attackBonus: 6,
      };
      
      const result = applyDamageToHero(heroHp, 5);
      
      expect(result.currentHp).toBe(0);
    });
  });

  describe("applyDamageToAllHeroes", () => {
    it("should apply damage to all heroes", () => {
      const heroHpList: HeroHpState[] = [
        { heroId: 'quinn', currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
        { heroId: 'vistra', currentHp: 10, maxHp: 10, level: 1, ac: 18, surgeValue: 5, attackBonus: 8 },
      ];
      
      const result = applyDamageToAllHeroes(heroHpList, 2);
      
      expect(result[0].currentHp).toBe(6);
      expect(result[1].currentHp).toBe(8);
    });
  });

  describe("resolveEncounterEffect", () => {
    it("should apply damage to active hero for damage/active-hero effect", () => {
      const encounter: EncounterCard = {
        id: 'goblin-ambush',
        name: 'Goblin Ambush',
        type: 'event',
        description: 'The active hero takes 1 damage.',
        effect: { type: 'damage', amount: 1, target: 'active-hero' },
        imagePath: 'assets/Encounter_GoblinAmbush.png',
      };
      
      const heroHpList: HeroHpState[] = [
        { heroId: 'quinn', currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
        { heroId: 'vistra', currentHp: 10, maxHp: 10, level: 1, ac: 18, surgeValue: 5, attackBonus: 8 },
      ];
      
      const result = resolveEncounterEffect(encounter, heroHpList, 'quinn');
      
      expect(result[0].currentHp).toBe(7); // Quinn takes damage
      expect(result[1].currentHp).toBe(10); // Vistra unaffected
    });

    it("should apply damage to all heroes for damage/all-heroes effect", () => {
      const encounter: EncounterCard = {
        id: 'cave-in',
        name: 'Cave-In',
        type: 'event',
        description: 'All heroes take 1 damage.',
        effect: { type: 'damage', amount: 1, target: 'all-heroes' },
        imagePath: 'assets/Encounter_CaveIn.png',
      };
      
      const heroHpList: HeroHpState[] = [
        { heroId: 'quinn', currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
        { heroId: 'vistra', currentHp: 10, maxHp: 10, level: 1, ac: 18, surgeValue: 5, attackBonus: 8 },
      ];
      
      const result = resolveEncounterEffect(encounter, heroHpList, 'quinn');
      
      expect(result[0].currentHp).toBe(7); // Quinn takes damage
      expect(result[1].currentHp).toBe(9); // Vistra takes damage
    });

    it("should not modify HP for unimplemented environment effect", () => {
      const encounter: EncounterCard = {
        id: 'dark-fog',
        name: 'Dark Fog',
        type: 'environment',
        description: 'All heroes have -2 to attack rolls.',
        effect: { type: 'environment' },
        imagePath: 'assets/Encounter_DarkFog.png',
      };
      
      const heroHpList: HeroHpState[] = [
        { heroId: 'quinn', currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
      ];
      
      // Suppress console warning for this test
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = resolveEncounterEffect(encounter, heroHpList, 'quinn');
      
      expect(result[0].currentHp).toBe(8); // HP unchanged
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not yet implemented'));
      
      consoleSpy.mockRestore();
    });

    it("should not modify HP for unimplemented trap effect", () => {
      const encounter: EncounterCard = {
        id: 'poisoned-dart-trap',
        name: 'Poisoned Dart Trap',
        type: 'trap',
        description: 'Test trap',
        effect: { type: 'trap', disableDC: 12 },
        imagePath: 'assets/test.png',
      };
      
      const heroHpList: HeroHpState[] = [
        { heroId: 'quinn', currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
      ];
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = resolveEncounterEffect(encounter, heroHpList, 'quinn');
      
      expect(result[0].currentHp).toBe(8); // HP unchanged
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not yet implemented'));
      
      consoleSpy.mockRestore();
    });
  });

  describe("ENCOUNTER_CARDS", () => {
    it("should have at least 3 encounter cards defined", () => {
      expect(ENCOUNTER_CARDS.length).toBeGreaterThanOrEqual(3);
    });

    it("should have all required fields on each card", () => {
      for (const card of ENCOUNTER_CARDS) {
        expect(card.id).toBeDefined();
        expect(card.name).toBeDefined();
        expect(card.type).toBeDefined();
        expect(card.description).toBeDefined();
        expect(card.effect).toBeDefined();
        expect(card.imagePath).toBeDefined();
      }
    });

    it("should have unique IDs for all cards", () => {
      const ids = ENCOUNTER_CARDS.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
