import { describe, it, expect, vi } from "vitest";
import {
  initializeEncounterDeck,
  drawEncounter,
  discardEncounter,
  getEncounterById,
  shouldDrawEncounter,
  canCancelEncounter,
  cancelEncounter,
  applyDamageToHero,
  applyDamageToAllHeroes,
  resolveEncounterEffect,
  applyEndOfHeroPhaseEnvironmentEffects,
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
        drawPile: ['unbearable-heat', 'frenzied-leap', 'bulls-eye'],
        discardPile: [],
      };
      
      const result = drawEncounter(deck);
      
      expect(result.encounterId).toBe('unbearable-heat');
      expect(result.deck.drawPile).toEqual(['frenzied-leap', 'bulls-eye']);
      expect(result.deck.discardPile).toEqual([]);
    });

    it("should reshuffle discard pile when draw pile is empty", () => {
      const deck: EncounterDeck = {
        drawPile: [],
        discardPile: ['cave-in-hazard', 'unbearable-heat'],
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
        drawPile: ['unbearable-heat'],
        discardPile: ['frenzied-leap'],
      };
      
      const result = discardEncounter(deck, 'cave-in-hazard');
      
      expect(result.drawPile).toEqual(['unbearable-heat']);
      expect(result.discardPile).toEqual(['frenzied-leap', 'cave-in-hazard']);
    });
  });

  describe("getEncounterById", () => {
    it("should return encounter definition for valid ID", () => {
      const encounter = getEncounterById('unbearable-heat');
      
      expect(encounter).toBeDefined();
      expect(encounter?.name).toBe('Unbearable Heat');
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

  describe("canCancelEncounter", () => {
    it("should return true when party has 5+ XP", () => {
      const resources = { xp: 5, healingSurges: 2 };
      expect(canCancelEncounter(resources)).toBe(true);
    });

    it("should return true when party has more than 5 XP", () => {
      const resources = { xp: 10, healingSurges: 2 };
      expect(canCancelEncounter(resources)).toBe(true);
    });

    it("should return false when party has less than 5 XP", () => {
      const resources = { xp: 4, healingSurges: 2 };
      expect(canCancelEncounter(resources)).toBe(false);
    });

    it("should return false when party has 0 XP", () => {
      const resources = { xp: 0, healingSurges: 2 };
      expect(canCancelEncounter(resources)).toBe(false);
    });
  });

  describe("cancelEncounter", () => {
    it("should deduct 5 XP from party resources", () => {
      const encounter: EncounterCard = {
        id: 'unbearable-heat',
        name: 'Unbearable Heat',
        type: 'event',
        description: 'Test',
        effect: { type: 'damage', amount: 1, target: 'active-hero' },
        imagePath: 'test.png',
      };
      const resources = { xp: 6, healingSurges: 2 };
      const deck: EncounterDeck = {
        drawPile: ['frenzied-leap'],
        discardPile: [],
      };

      const result = cancelEncounter(encounter, resources, deck);

      expect(result.resources.xp).toBe(1);
    });

    it("should add encounter to discard pile", () => {
      const encounter: EncounterCard = {
        id: 'unbearable-heat',
        name: 'Unbearable Heat',
        type: 'event',
        description: 'Test',
        effect: { type: 'damage', amount: 1, target: 'active-hero' },
        imagePath: 'test.png',
      };
      const resources = { xp: 6, healingSurges: 2 };
      const deck: EncounterDeck = {
        drawPile: ['frenzied-leap'],
        discardPile: ['bulls-eye'],
      };

      const result = cancelEncounter(encounter, resources, deck);

      expect(result.encounterDeck.discardPile).toContain('unbearable-heat');
      expect(result.encounterDeck.discardPile).toHaveLength(2);
    });

    it("should not modify draw pile", () => {
      const encounter: EncounterCard = {
        id: 'unbearable-heat',
        name: 'Unbearable Heat',
        type: 'event',
        description: 'Test',
        effect: { type: 'damage', amount: 1, target: 'active-hero' },
        imagePath: 'test.png',
      };
      const resources = { xp: 6, healingSurges: 2 };
      const deck: EncounterDeck = {
        drawPile: ['frenzied-leap', 'cave-in-hazard'],
        discardPile: [],
      };

      const result = cancelEncounter(encounter, resources, deck);

      expect(result.encounterDeck.drawPile).toEqual(['frenzied-leap', 'cave-in-hazard']);
    });

    it("should not modify healing surges", () => {
      const encounter: EncounterCard = {
        id: 'unbearable-heat',
        name: 'Unbearable Heat',
        type: 'event',
        description: 'Test',
        effect: { type: 'damage', amount: 1, target: 'active-hero' },
        imagePath: 'test.png',
      };
      const resources = { xp: 6, healingSurges: 2 };
      const deck: EncounterDeck = {
        drawPile: [],
        discardPile: [],
      };

      const result = cancelEncounter(encounter, resources, deck);

      expect(result.resources.healingSurges).toBe(2);
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
        id: 'frenzied-leap',
        name: 'Frenzied Leap',
        type: 'event',
        description: 'The active hero takes 2 damage.',
        effect: { type: 'damage', amount: 2, target: 'active-hero' },
        imagePath: 'assets/Encounter_FrenziedLeap.png',
      };
      
      const heroHpList: HeroHpState[] = [
        { heroId: 'quinn', currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
        { heroId: 'vistra', currentHp: 10, maxHp: 10, level: 1, ac: 18, surgeValue: 5, attackBonus: 8 },
      ];
      
      const result = resolveEncounterEffect(encounter, heroHpList, 'quinn');
      
      expect(result[0].currentHp).toBe(6); // Quinn takes 2 damage
      expect(result[1].currentHp).toBe(10); // Vistra unaffected
    });

    it("should apply damage to all heroes for damage/all-heroes effect", () => {
      const encounter: EncounterCard = {
        id: 'unbearable-heat',
        name: 'Unbearable Heat',
        type: 'event',
        description: 'All heroes take 1 damage.',
        effect: { type: 'damage', amount: 1, target: 'all-heroes' },
        imagePath: 'assets/Encounter_UnbearableHeat.png',
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
        id: 'hidden-snipers',
        name: 'Hidden Snipers',
        type: 'environment',
        description: 'Environment effect.',
        effect: { type: 'environment', description: 'Take 1 damage when alone on tile.' },
        imagePath: 'assets/Encounter_HiddenSnipers.png',
      };
      
      const heroHpList: HeroHpState[] = [
        { heroId: 'quinn', currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
      ];
      
      const result = resolveEncounterEffect(encounter, heroHpList, 'quinn');
      
      // Environment effects don't apply damage during encounter resolution
      // They are tracked in game state and applied at appropriate phases
      expect(result[0].currentHp).toBe(8); // HP unchanged
    });

    it("should not modify HP for unimplemented trap effect", () => {
      const encounter: EncounterCard = {
        id: 'poisoned-dart-trap',
        name: 'Poisoned Dart Trap',
        type: 'trap',
        description: 'Test trap',
        effect: { type: 'trap', disableDC: 10, attackBonus: 8, damage: 2, description: 'Attacks heroes on tile each Villain Phase.' },
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

    it("should apply attack damage to active hero when roll hits", () => {
      const encounter: EncounterCard = {
        id: 'bulls-eye',
        name: "Bull's Eye!",
        type: 'event',
        description: 'Attack +10 vs the active Hero. Hit: 1 damage.',
        effect: { type: 'attack', attackBonus: 10, damage: 1, target: 'active-hero' },
        imagePath: 'assets/Encounter_BullsEye.png',
      };
      
      const heroHpList: HeroHpState[] = [
        { heroId: 'quinn', currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
      ];
      
      // Use a random function that always returns high roll (hit guaranteed)
      // Roll 15 + 10 = 25, which beats AC 17
      const highRollRandom = () => 0.7; // Will produce roll of 15
      
      const result = resolveEncounterEffect(encounter, heroHpList, 'quinn', highRollRandom);
      
      expect(result[0].currentHp).toBe(7); // Took 1 damage from attack
    });

    it("should not apply attack damage when roll misses (no miss damage)", () => {
      const encounter: EncounterCard = {
        id: 'bulls-eye',
        name: "Bull's Eye!",
        type: 'event',
        description: 'Attack +10 vs the active Hero. Hit: 1 damage.',
        effect: { type: 'attack', attackBonus: 10, damage: 1, target: 'active-hero' },
        imagePath: 'assets/Encounter_BullsEye.png',
      };
      
      const heroHpList: HeroHpState[] = [
        { heroId: 'quinn', currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
      ];
      
      // Use a random function that always returns low roll (miss guaranteed)
      // Roll 1 + 10 = 11, which does not beat AC 17
      const lowRollRandom = () => 0; // Will produce roll of 1
      
      const result = resolveEncounterEffect(encounter, heroHpList, 'quinn', lowRollRandom);
      
      expect(result[0].currentHp).toBe(8); // No damage taken
    });

    it("should apply miss damage when attack misses and missDamage is defined", () => {
      const encounter: EncounterCard = {
        id: 'concussive-blast',
        name: 'Concussive Blast',
        type: 'event',
        description: 'Attack +8. Hit: 2 damage. Miss: 1 damage.',
        effect: { type: 'attack', attackBonus: 8, damage: 2, missDamage: 1, target: 'active-hero' },
        imagePath: 'assets/Encounter_ConcussiveBlast.png',
      };
      
      const heroHpList: HeroHpState[] = [
        { heroId: 'quinn', currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
      ];
      
      // Use a random function that always returns low roll (miss guaranteed)
      // Roll 1 + 8 = 9, which does not beat AC 17
      const lowRollRandom = () => 0; // Will produce roll of 1
      
      const result = resolveEncounterEffect(encounter, heroHpList, 'quinn', lowRollRandom);
      
      expect(result[0].currentHp).toBe(7); // Took 1 miss damage
    });

    it("should apply attack damage to all heroes for all-heroes target", () => {
      const encounter: EncounterCard = {
        id: 'deep-tremor',
        name: 'Deep Tremor',
        type: 'event',
        description: 'Attack +8 vs each Hero. Hit: 1 damage.',
        effect: { type: 'attack', attackBonus: 8, damage: 1, target: 'all-heroes' },
        imagePath: 'assets/Encounter_DeepTremor.png',
      };
      
      const heroHpList: HeroHpState[] = [
        { heroId: 'quinn', currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
        { heroId: 'vistra', currentHp: 10, maxHp: 10, level: 1, ac: 18, surgeValue: 5, attackBonus: 8 },
      ];
      
      // Use a random function that always returns high roll (hit guaranteed for both)
      const highRollRandom = () => 0.8; // Will produce roll of 17
      
      const result = resolveEncounterEffect(encounter, heroHpList, 'quinn', highRollRandom);
      
      // Both heroes should take damage (roll 17 + 8 = 25 beats both AC 17 and AC 18)
      expect(result[0].currentHp).toBe(7);
      expect(result[1].currentHp).toBe(9);
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

    it("should have exactly 53 encounter cards", () => {
      expect(ENCOUNTER_CARDS.length).toBe(53);
    });

    it("should have all card IDs in the initial encounter deck", () => {
      const cardIds = ENCOUNTER_CARDS.map(c => c.id);
      for (const id of INITIAL_ENCOUNTER_DECK) {
        expect(cardIds).toContain(id);
      }
    });
  });

  describe("environment effects", () => {
    describe("applyEndOfHeroPhaseEnvironmentEffects", () => {
      it("should apply Hidden Snipers damage when hero is alone on tile", () => {
        
        
        const heroHpList: HeroHpState[] = [
          { heroId: 'quinn', currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
          { heroId: 'vistra', currentHp: 10, maxHp: 10, level: 1, ac: 18, surgeValue: 5, attackBonus: 8 },
        ];
        
        const dungeon = {
          tiles: [
            { id: 'start-tile', position: { col: 0, row: 0 } },
            { id: 'tile-1', position: { col: 1, row: 0 } },
          ],
        };
        
        // Quinn is alone on tile-1, Vistra is on start-tile
        const allHeroPositions = [
          { heroId: 'quinn', position: { x: 4, y: 0 } }, // tile-1
          { heroId: 'vistra', position: { x: 2, y: 2 } }, // start-tile
        ];
        
        const result = applyEndOfHeroPhaseEnvironmentEffects(
          'hidden-snipers',
          heroHpList,
          'quinn', // active hero
          { x: 4, y: 0 }, // active hero position
          allHeroPositions,
          dungeon
        );
        
        // Quinn should take 1 damage
        expect(result[0].currentHp).toBe(7);
        // Vistra is not the active hero, no damage
        expect(result[1].currentHp).toBe(10);
      });

      it("should not apply Hidden Snipers damage when hero is not alone on tile", () => {
        
        
        const heroHpList: HeroHpState[] = [
          { heroId: 'quinn', currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
          { heroId: 'vistra', currentHp: 10, maxHp: 10, level: 1, ac: 18, surgeValue: 5, attackBonus: 8 },
        ];
        
        const dungeon = {
          tiles: [
            { id: 'start-tile', position: { col: 0, row: 0 } },
          ],
        };
        
        // Both heroes on start-tile (same sub-tile)
        const allHeroPositions = [
          { heroId: 'quinn', position: { x: 2, y: 2 } }, // start-tile north
          { heroId: 'vistra', position: { x: 3, y: 2 } }, // start-tile north
        ];
        
        const result = applyEndOfHeroPhaseEnvironmentEffects(
          'hidden-snipers',
          heroHpList,
          'quinn', // active hero
          { x: 2, y: 2 }, // active hero position
          allHeroPositions,
          dungeon
        );
        
        // No damage - hero is not alone
        expect(result[0].currentHp).toBe(8);
        expect(result[1].currentHp).toBe(10);
      });

      it("should apply Walls of Magma damage when hero is adjacent to wall", () => {
        
        
        const heroHpList: HeroHpState[] = [
          { heroId: 'quinn', currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
        ];
        
        const dungeon = {
          tiles: [
            { 
              id: 'tile-1', 
              position: { col: 1, row: 0 },
              edges: { north: 'wall', south: 'open', east: 'open', west: 'open' }
            },
          ],
        };
        
        const allHeroPositions = [
          { heroId: 'quinn', position: { x: 4, y: 0 } }, // tile-1, at north edge (adjacent to wall)
        ];
        
        const result = applyEndOfHeroPhaseEnvironmentEffects(
          'walls-of-magma',
          heroHpList,
          'quinn', // active hero
          { x: 4, y: 0 }, // active hero position (local y=0, which is wall edge)
          allHeroPositions,
          dungeon
        );
        
        // Quinn should take 1 damage
        expect(result[0].currentHp).toBe(7);
      });

      it("should not apply Walls of Magma damage when hero is not adjacent to wall", () => {
        
        
        const heroHpList: HeroHpState[] = [
          { heroId: 'quinn', currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
        ];
        
        const dungeon = {
          tiles: [
            { 
              id: 'tile-1', 
              position: { col: 1, row: 0 },
              edges: { north: 'open', south: 'open', east: 'open', west: 'open' }
            },
          ],
        };
        
        const allHeroPositions = [
          { heroId: 'quinn', position: { x: 5, y: 1 } }, // tile-1, center
        ];
        
        const result = applyEndOfHeroPhaseEnvironmentEffects(
          'walls-of-magma',
          heroHpList,
          'quinn', // active hero
          { x: 5, y: 1 }, // active hero position (center, not adjacent to walls)
          allHeroPositions,
          dungeon
        );
        
        // No damage - no walls nearby
        expect(result[0].currentHp).toBe(8);
      });

      it("should return unchanged HP list when no environment is active", () => {
        
        
        const heroHpList: HeroHpState[] = [
          { heroId: 'quinn', currentHp: 8, maxHp: 8, level: 1, ac: 17, surgeValue: 4, attackBonus: 6 },
        ];
        
        const dungeon = { tiles: [] };
        const allHeroPositions = [{ heroId: 'quinn', position: { x: 2, y: 2 } }];
        
        const result = applyEndOfHeroPhaseEnvironmentEffects(
          null, // no active environment
          heroHpList,
          'quinn',
          { x: 2, y: 2 },
          allHeroPositions,
          dungeon
        );
        
        expect(result[0].currentHp).toBe(8);
      });
    });
  });
});
