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
  shouldDrawAnotherEncounter,
  getMonsterCategoryForEncounter,
  isMonsterDeckManipulationCard,
  isTileDeckManipulationCard,
  areOnSameTile,
  getTileDistance,
  getHeroesOnTile,
  getHeroesWithinRange,
  getHeroesNeedingMonsters,
  findClosestUnexploredEdge,
} from "./encounters";
import type { EncounterDeck, TurnState, HeroHpState, EncounterCard, TileEdge } from "./types";
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
      
      const { heroHpList: result } = resolveEncounterEffect(encounter, heroHpList, 'quinn');
      
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
      
      const { heroHpList: result } = resolveEncounterEffect(encounter, heroHpList, 'quinn');
      
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
      
      const { heroHpList: result } = resolveEncounterEffect(encounter, heroHpList, 'quinn');
      
      // Environment effects don't apply damage during encounter resolution
      // They are tracked in game state and applied at appropriate phases
      expect(result[0].currentHp).toBe(8); // HP unchanged
    });

    it("should not modify HP for trap effect (placement handled separately)", () => {
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
      
      const { heroHpList: result } = resolveEncounterEffect(encounter, heroHpList, 'quinn');
      
      // Traps don't apply immediate damage - they are placed and activate during villain phase
      expect(result[0].currentHp).toBe(8); // HP unchanged
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
      
      const { heroHpList: result } = resolveEncounterEffect(encounter, heroHpList, 'quinn', [], null, highRollRandom);
      
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
      
      const { heroHpList: result } = resolveEncounterEffect(encounter, heroHpList, 'quinn', [], null, lowRollRandom);
      
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
      
      const { heroHpList: result } = resolveEncounterEffect(encounter, heroHpList, 'quinn', [], null, lowRollRandom);
      
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
      
      const { heroHpList: result } = resolveEncounterEffect(encounter, heroHpList, 'quinn', [], null, highRollRandom);
      
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

  describe("shouldDrawAnotherEncounter", () => {
    it("should return true for cards that trigger another encounter draw", () => {
      expect(shouldDrawAnotherEncounter('ancient-spirits-blessing')).toBe(true);
      expect(shouldDrawAnotherEncounter('deadly-poison')).toBe(true);
      expect(shouldDrawAnotherEncounter('hidden-treasure')).toBe(true);
      expect(shouldDrawAnotherEncounter('quick-advance')).toBe(true);
    });

    it("should return false for cards that don't trigger another encounter", () => {
      expect(shouldDrawAnotherEncounter('lost')).toBe(false);
      expect(shouldDrawAnotherEncounter('revel-in-destruction')).toBe(false);
      expect(shouldDrawAnotherEncounter('frenzied-leap')).toBe(false);
    });
  });

  describe("getMonsterCategoryForEncounter", () => {
    it("should return correct category for deck manipulation cards", () => {
      expect(getMonsterCategoryForEncounter('duergar-outpost')).toBe('devil');
      expect(getMonsterCategoryForEncounter('hall-of-orcs')).toBe('orc');
      expect(getMonsterCategoryForEncounter('kobold-warren')).toBe('reptile');
      expect(getMonsterCategoryForEncounter('unnatural-corruption')).toBe('aberrant');
      expect(getMonsterCategoryForEncounter('spotted')).toBe('sentry');
    });

    it("should return null for non-deck manipulation cards", () => {
      expect(getMonsterCategoryForEncounter('lost')).toBeNull();
      expect(getMonsterCategoryForEncounter('frenzied-leap')).toBeNull();
    });
  });

  describe("isMonsterDeckManipulationCard", () => {
    it("should return true for monster deck manipulation cards", () => {
      expect(isMonsterDeckManipulationCard('duergar-outpost')).toBe(true);
      expect(isMonsterDeckManipulationCard('hall-of-orcs')).toBe(true);
      expect(isMonsterDeckManipulationCard('kobold-warren')).toBe(true);
      expect(isMonsterDeckManipulationCard('unnatural-corruption')).toBe(true);
      expect(isMonsterDeckManipulationCard('spotted')).toBe(true);
    });

    it("should return false for non-monster deck cards", () => {
      expect(isMonsterDeckManipulationCard('lost')).toBe(false);
      expect(isMonsterDeckManipulationCard('frenzied-leap')).toBe(false);
    });
  });

  describe("isTileDeckManipulationCard", () => {
    it("should return true for tile deck manipulation cards", () => {
      expect(isTileDeckManipulationCard('lost')).toBe(true);
      expect(isTileDeckManipulationCard('occupied-lair')).toBe(true);
      expect(isTileDeckManipulationCard('scream-of-sentry')).toBe(true);
      expect(isTileDeckManipulationCard('spotted')).toBe(true);
    });

    it("should return false for non-tile deck cards", () => {
      expect(isTileDeckManipulationCard('frenzied-leap')).toBe(false);
      expect(isTileDeckManipulationCard('revel-in-destruction')).toBe(false);
    });
  });

  describe("areOnSameTile", () => {
    it("should return true for heroes on the same regular tile", () => {
      const dungeon = {
        tiles: [
          { id: 'start-tile', tileType: 'start', position: { col: 0, row: 0 }, rotation: 0, edges: { north: 'wall', south: 'wall', east: 'open', west: 'wall' } },
          { id: 'tile-1', tileType: 'tile-black-2exit-a', position: { col: 1, row: 0 }, rotation: 0, edges: { north: 'open', south: 'open', east: 'wall', west: 'open' } },
        ],
        unexploredEdges: [],
        tileDeck: [],
      };
      
      const pos1 = { x: 4, y: 0 }; // On tile-1
      const pos2 = { x: 5, y: 1 }; // On tile-1
      
      expect(areOnSameTile(pos1, pos2, dungeon)).toBe(true);
    });

    it("should return false for heroes on different tiles", () => {
      const dungeon = {
        tiles: [
          { id: 'start-tile', tileType: 'start', position: { col: 0, row: 0 }, rotation: 0, edges: { north: 'wall', south: 'wall', east: 'open', west: 'wall' } },
          { id: 'tile-1', tileType: 'tile-black-2exit-a', position: { col: 1, row: 0 }, rotation: 0, edges: { north: 'open', south: 'open', east: 'wall', west: 'open' } },
        ],
        unexploredEdges: [],
        tileDeck: [],
      };
      
      const pos1 = { x: 1, y: 0 }; // On start-tile
      const pos2 = { x: 4, y: 0 }; // On tile-1
      
      expect(areOnSameTile(pos1, pos2, dungeon)).toBe(false);
    });

    it("should handle start tile sub-tiles correctly", () => {
      const dungeon = {
        tiles: [
          { id: 'start-tile', tileType: 'start', position: { col: 0, row: 0 }, rotation: 0, edges: { north: 'wall', south: 'wall', east: 'open', west: 'wall' } },
        ],
        unexploredEdges: [],
        tileDeck: [],
      };
      
      const pos1 = { x: 1, y: 1 }; // North sub-tile (y <= 3)
      const pos2 = { x: 2, y: 2 }; // North sub-tile
      const pos3 = { x: 1, y: 5 }; // South sub-tile (y >= 4)
      
      expect(areOnSameTile(pos1, pos2, dungeon)).toBe(true); // Same sub-tile
      expect(areOnSameTile(pos1, pos3, dungeon)).toBe(false); // Different sub-tiles
    });
  });

  describe("getTileDistance", () => {
    it("should return 0 for same tile", () => {
      const dungeon = {
        tiles: [
          { id: 'tile-1', tileType: 'tile-black-2exit-a', position: { col: 1, row: 0 }, rotation: 0, edges: { north: 'open', south: 'open', east: 'wall', west: 'open' } },
        ],
        unexploredEdges: [],
        tileDeck: [],
      };
      
      const pos1 = { x: 4, y: 0 };
      const pos2 = { x: 5, y: 1 };
      
      expect(getTileDistance(pos1, pos2, dungeon)).toBe(0);
    });

    it("should return 1 for adjacent tiles", () => {
      const dungeon = {
        tiles: [
          { id: 'start-tile', tileType: 'start', position: { col: 0, row: 0 }, rotation: 0, edges: { north: 'wall', south: 'wall', east: 'open', west: 'wall' } },
          { id: 'tile-1', tileType: 'tile-black-2exit-a', position: { col: 1, row: 0 }, rotation: 0, edges: { north: 'open', south: 'open', east: 'wall', west: 'open' } },
        ],
        unexploredEdges: [],
        tileDeck: [],
      };
      
      const pos1 = { x: 1, y: 1 }; // Start tile
      const pos2 = { x: 4, y: 0 }; // Tile-1
      
      expect(getTileDistance(pos1, pos2, dungeon)).toBe(1);
    });

    it("should calculate Manhattan distance for tiles farther apart", () => {
      const dungeon = {
        tiles: [
          { id: 'tile-1', tileType: 'tile-black-2exit-a', position: { col: 1, row: 0 }, rotation: 0, edges: { north: 'open', south: 'open', east: 'wall', west: 'open' } },
          { id: 'tile-2', tileType: 'tile-black-2exit-b', position: { col: 3, row: 2 }, rotation: 0, edges: { north: 'open', south: 'open', east: 'wall', west: 'open' } },
        ],
        unexploredEdges: [],
        tileDeck: [],
      };
      
      // Tile-1 is at col 1, row 0: x: 4-7, y: 0-3
      // Tile-2 is at col 3, row 2: x: 12-15, y: 12-15
      const pos1 = { x: 4, y: 0 }; // Tile-1 at (1, 0)
      const pos2 = { x: 12, y: 12 }; // Tile-2 at (3, 2)
      
      expect(getTileDistance(pos1, pos2, dungeon)).toBe(4); // |3-1| + |2-0| = 4
    });
  });

  describe("getHeroesOnTile", () => {
    it("should return all heroes on the same tile", () => {
      const dungeon = {
        tiles: [
          { id: 'tile-1', tileType: 'tile-black-2exit-a', position: { col: 1, row: 0 }, rotation: 0, edges: { north: 'open', south: 'open', east: 'wall', west: 'open' } },
        ],
        unexploredEdges: [],
        tileDeck: [],
      };
      
      const heroTokens = [
        { heroId: 'quinn', position: { x: 4, y: 0 } },
        { heroId: 'vistra', position: { x: 5, y: 1 } },
        { heroId: 'heskan', position: { x: 8, y: 0 } }, // Different tile
      ];
      
      const result = getHeroesOnTile({ x: 4, y: 0 }, heroTokens, dungeon);
      
      expect(result).toContain('quinn');
      expect(result).toContain('vistra');
      expect(result).not.toContain('heskan');
    });

    it("should include the active hero in the result", () => {
      const dungeon = {
        tiles: [
          { id: 'tile-1', tileType: 'tile-black-2exit-a', position: { col: 1, row: 0 }, rotation: 0, edges: { north: 'open', south: 'open', east: 'wall', west: 'open' } },
        ],
        unexploredEdges: [],
        tileDeck: [],
      };
      
      const heroTokens = [
        { heroId: 'quinn', position: { x: 4, y: 0 } },
      ];
      
      const result = getHeroesOnTile({ x: 4, y: 0 }, heroTokens, dungeon);
      
      expect(result).toContain('quinn');
    });
  });

  describe("getHeroesWithinRange", () => {
    it("should return heroes within specified range", () => {
      const dungeon = {
        tiles: [
          { id: 'start-tile', tileType: 'start', position: { col: 0, row: 0 }, rotation: 0, edges: { north: 'wall', south: 'wall', east: 'open', west: 'wall' } },
          { id: 'tile-1', tileType: 'tile-black-2exit-a', position: { col: 1, row: 0 }, rotation: 0, edges: { north: 'open', south: 'open', east: 'wall', west: 'open' } },
          { id: 'tile-2', tileType: 'tile-black-2exit-b', position: { col: 2, row: 0 }, rotation: 0, edges: { north: 'open', south: 'open', east: 'wall', west: 'open' } },
        ],
        unexploredEdges: [],
        tileDeck: [],
      };
      
      const heroTokens = [
        { heroId: 'quinn', position: { x: 1, y: 1 } },    // Start tile
        { heroId: 'vistra', position: { x: 4, y: 0 } },   // Tile-1 (1 tile away)
        { heroId: 'heskan', position: { x: 8, y: 0 } },   // Tile-2 (2 tiles away)
      ];
      
      const result = getHeroesWithinRange({ x: 1, y: 1 }, heroTokens, dungeon, 1);
      
      expect(result).toContain('quinn'); // Same tile
      expect(result).toContain('vistra'); // 1 tile away
      expect(result).not.toContain('heskan'); // 2 tiles away
    });

    it("should include heroes on same tile (range 0)", () => {
      const dungeon = {
        tiles: [
          { id: 'tile-1', tileType: 'tile-black-2exit-a', position: { col: 1, row: 0 }, rotation: 0, edges: { north: 'open', south: 'open', east: 'wall', west: 'open' } },
        ],
        unexploredEdges: [],
        tileDeck: [],
      };
      
      const heroTokens = [
        { heroId: 'quinn', position: { x: 4, y: 0 } },
        { heroId: 'vistra', position: { x: 5, y: 1 } },
      ];
      
      const result = getHeroesWithinRange({ x: 4, y: 0 }, heroTokens, dungeon, 0);
      
      expect(result).toContain('quinn');
      expect(result).toContain('vistra');
    });
  });

  describe("getHeroesNeedingMonsters", () => {
    it("should return heroes who don't control any monsters", () => {
      const heroTokens = [
        { heroId: 'quinn' },
        { heroId: 'vistra' },
        { heroId: 'heskan' },
      ];
      
      const monsters = [
        { controllerId: 'quinn', id: 'monster-1', position: { x: 0, y: 0 }, monsterId: 'kobold', hp: 5, tileId: 'tile-1', instanceId: 0 },
        { controllerId: 'vistra', id: 'monster-2', position: { x: 1, y: 1 }, monsterId: 'kobold', hp: 5, tileId: 'tile-1', instanceId: 1 },
      ];
      
      const result = getHeroesNeedingMonsters(heroTokens, monsters);
      
      // Heskan doesn't control any monsters
      expect(result).toContain('heskan');
      expect(result).not.toContain('quinn');
      expect(result).not.toContain('vistra');
      expect(result).toHaveLength(1);
    });

    it("should return all heroes when no monsters exist", () => {
      const heroTokens = [
        { heroId: 'quinn' },
        { heroId: 'vistra' },
      ];
      
      const monsters: Array<{ controllerId: string }> = [];
      
      const result = getHeroesNeedingMonsters(heroTokens, monsters);
      
      expect(result).toContain('quinn');
      expect(result).toContain('vistra');
      expect(result).toHaveLength(2);
    });

    it("should return empty array when all heroes control monsters", () => {
      const heroTokens = [
        { heroId: 'quinn' },
        { heroId: 'vistra' },
      ];
      
      const monsters = [
        { controllerId: 'quinn', id: 'monster-1', position: { x: 0, y: 0 }, monsterId: 'kobold', hp: 5, tileId: 'tile-1', instanceId: 0 },
        { controllerId: 'vistra', id: 'monster-2', position: { x: 1, y: 1 }, monsterId: 'kobold', hp: 5, tileId: 'tile-1', instanceId: 1 },
      ];
      
      const result = getHeroesNeedingMonsters(heroTokens, monsters);
      
      expect(result).toHaveLength(0);
    });

    it("should work when a hero controls multiple monsters", () => {
      const heroTokens = [
        { heroId: 'quinn' },
        { heroId: 'vistra' },
      ];
      
      const monsters = [
        { controllerId: 'quinn', id: 'monster-1', position: { x: 0, y: 0 }, monsterId: 'kobold', hp: 5, tileId: 'tile-1', instanceId: 0 },
        { controllerId: 'quinn', id: 'monster-2', position: { x: 1, y: 1 }, monsterId: 'kobold', hp: 5, tileId: 'tile-1', instanceId: 1 },
        { controllerId: 'quinn', id: 'monster-3', position: { x: 2, y: 2 }, monsterId: 'kobold', hp: 5, tileId: 'tile-1', instanceId: 2 },
      ];
      
      const result = getHeroesNeedingMonsters(heroTokens, monsters);
      
      // Quinn controls 3 monsters, Vistra controls 0
      expect(result).toContain('vistra');
      expect(result).not.toContain('quinn');
      expect(result).toHaveLength(1);
    });
  });

  describe("findClosestUnexploredEdge", () => {
    it("should find the closest unexplored edge to hero position", () => {
      const dungeon = {
        tiles: [
          { 
            id: 'tile-1', 
            tileType: 'tile-black-2exit-a', 
            position: { col: 0, row: 0 }, 
            rotation: 0, 
            edges: { north: 'wall', south: 'open', east: 'open', west: 'wall' } 
          },
          { 
            id: 'tile-2', 
            tileType: 'tile-black-2exit-a', 
            position: { col: 1, row: 0 }, 
            rotation: 0, 
            edges: { north: 'open', south: 'wall', east: 'wall', west: 'open' } 
          },
        ],
        unexploredEdges: [],
        tileDeck: [],
      };
      
      const unexploredEdges = [
        { tileId: 'tile-1', direction: 'south' as const },
        { tileId: 'tile-2', direction: 'north' as const },
      ];
      
      // Hero at position (2, 2) - closer to tile-1's south edge
      const heroPosition = { x: 2, y: 2 };
      
      const result = findClosestUnexploredEdge(heroPosition, unexploredEdges, dungeon);
      
      expect(result).not.toBeNull();
      expect(result?.tileId).toBe('tile-1');
      expect(result?.direction).toBe('south');
    });

    it("should return null when no unexplored edges exist", () => {
      const dungeon = {
        tiles: [
          { 
            id: 'tile-1', 
            tileType: 'tile-black-2exit-a', 
            position: { col: 0, row: 0 }, 
            rotation: 0, 
            edges: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } 
          },
        ],
        unexploredEdges: [],
        tileDeck: [],
      };
      
      const unexploredEdges: TileEdge[] = [];
      const heroPosition = { x: 4, y: 4 };
      
      const result = findClosestUnexploredEdge(heroPosition, unexploredEdges, dungeon);
      
      expect(result).toBeNull();
    });

    it("should calculate distance using Manhattan distance", () => {
      const dungeon = {
        tiles: [
          { 
            id: 'tile-1', 
            tileType: 'tile-black-2exit-a', 
            position: { col: 0, row: 0 }, 
            rotation: 0, 
            edges: { north: 'wall', south: 'open', east: 'wall', west: 'wall' } 
          },
          { 
            id: 'tile-2', 
            tileType: 'tile-black-2exit-a', 
            position: { col: 2, row: 0 }, 
            rotation: 0, 
            edges: { north: 'wall', south: 'open', east: 'wall', west: 'wall' } 
          },
        ],
        unexploredEdges: [],
        tileDeck: [],
      };
      
      const unexploredEdges = [
        { tileId: 'tile-1', direction: 'south' as const }, // At x=4, y=8
        { tileId: 'tile-2', direction: 'south' as const }, // At x=20, y=8
      ];
      
      // Hero at (5, 5) should be closest to tile-1
      const heroPosition = { x: 5, y: 5 };
      
      const result = findClosestUnexploredEdge(heroPosition, unexploredEdges, dungeon);
      
      expect(result?.tileId).toBe('tile-1');
    });

    it("should handle multiple edges with same distance (return first found)", () => {
      const dungeon = {
        tiles: [
          { 
            id: 'tile-1', 
            tileType: 'tile-black-2exit-a', 
            position: { col: 0, row: 0 }, 
            rotation: 0, 
            edges: { north: 'wall', south: 'open', east: 'wall', west: 'wall' } 
          },
          { 
            id: 'tile-2', 
            tileType: 'tile-black-2exit-a', 
            position: { col: 0, row: 0 }, 
            rotation: 0, 
            edges: { north: 'wall', south: 'wall', east: 'open', west: 'wall' } 
          },
        ],
        unexploredEdges: [],
        tileDeck: [],
      };
      
      // Two edges at exactly same position (equidistant)
      const unexploredEdges = [
        { tileId: 'tile-1', direction: 'south' as const },
        { tileId: 'tile-2', direction: 'east' as const },
      ];
      
      const heroPosition = { x: 4, y: 4 };
      
      const result = findClosestUnexploredEdge(heroPosition, unexploredEdges, dungeon);
      
      // Should return the first edge found (tile-1)
      expect(result?.tileId).toBe('tile-1');
    });
  });
});
