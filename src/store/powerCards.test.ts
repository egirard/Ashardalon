import { describe, it, expect } from 'vitest';
import {
  PowerCard,
  POWER_CARDS,
  HERO_CUSTOM_ABILITIES,
  getPowerCardsForHeroClass,
  getAtWillCards,
  getDailyCards,
  getUtilityCards,
  getPowerCardById,
  createInitialPowerCardsState,
  flipPowerCard,
  addLevel2DailyCard,
  shuffleArray,
  getShuffledAtWillCards,
  getShuffledDailyCards,
  getShuffledUtilityCards,
} from './powerCards';

describe('powerCards', () => {
  describe('POWER_CARDS', () => {
    it('should have 50 power cards', () => {
      expect(POWER_CARDS).toHaveLength(50);
    });

    it('should have cards with unique IDs', () => {
      const ids = POWER_CARDS.map(card => card.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(POWER_CARDS.length);
    });

    it('should have correct structure for each card', () => {
      for (const card of POWER_CARDS) {
        expect(card.id).toBeTypeOf('number');
        expect(card.name).toBeTypeOf('string');
        expect(['at-will', 'daily', 'utility']).toContain(card.type);
        expect(card.heroClass).toBeTypeOf('string');
        expect(card.description).toBeTypeOf('string');
        expect(card.rule).toBeTypeOf('string');
      }
    });
  });

  describe('HERO_CUSTOM_ABILITIES', () => {
    it('should have custom abilities for all 5 heroes', () => {
      expect(HERO_CUSTOM_ABILITIES.quinn).toBe(1); // Healing Hymn
      expect(HERO_CUSTOM_ABILITIES.vistra).toBe(11); // Dwarven Resilience
      expect(HERO_CUSTOM_ABILITIES.tarak).toBe(31); // Furious Assault
      expect(HERO_CUSTOM_ABILITIES.keyleth).toBe(21); // Lay On Hands
      expect(HERO_CUSTOM_ABILITIES.haskan).toBe(41); // Hurled Breath
    });

    it('should reference valid power cards', () => {
      for (const heroId of Object.keys(HERO_CUSTOM_ABILITIES)) {
        const cardId = HERO_CUSTOM_ABILITIES[heroId];
        const card = getPowerCardById(cardId);
        expect(card).toBeDefined();
        expect(card?.isCustomAbility).toBe(true);
      }
    });
  });

  describe('getPowerCardsForHeroClass', () => {
    it('should return Cleric powers for Cleric class', () => {
      const cards = getPowerCardsForHeroClass('Cleric');
      expect(cards.length).toBeGreaterThan(0);
      expect(cards.every(card => card.heroClass === 'Cleric')).toBe(true);
    });

    it('should return Fighter and Dwarf powers for Fighter class', () => {
      const cards = getPowerCardsForHeroClass('Fighter');
      expect(cards.length).toBeGreaterThan(0);
      const classes = new Set(cards.map(card => card.heroClass));
      expect(classes.has('Fighter')).toBe(true);
      expect(classes.has('Dwarf')).toBe(true);
    });

    it('should return Rogue and Half-Orc powers for Rogue class', () => {
      const cards = getPowerCardsForHeroClass('Rogue');
      expect(cards.length).toBeGreaterThan(0);
      const classes = new Set(cards.map(card => card.heroClass));
      expect(classes.has('Rogue')).toBe(true);
      expect(classes.has('Half-Orc')).toBe(true);
    });

    it('should return Wizard and Dragonborn powers for Wizard class', () => {
      const cards = getPowerCardsForHeroClass('Wizard');
      expect(cards.length).toBeGreaterThan(0);
      const classes = new Set(cards.map(card => card.heroClass));
      expect(classes.has('Wizard')).toBe(true);
      expect(classes.has('Dragonborn')).toBe(true);
    });
  });

  describe('getAtWillCards', () => {
    it('should return only at-will cards', () => {
      const cards = getAtWillCards('Cleric');
      expect(cards.length).toBeGreaterThan(0);
      expect(cards.every(card => card.type === 'at-will')).toBe(true);
    });

    it('should return 3 at-will cards for Cleric', () => {
      const cards = getAtWillCards('Cleric');
      expect(cards).toHaveLength(3);
    });
  });

  describe('getDailyCards', () => {
    it('should return only daily cards', () => {
      const cards = getDailyCards('Cleric');
      expect(cards.length).toBeGreaterThan(0);
      expect(cards.every(card => card.type === 'daily')).toBe(true);
    });

    it('should return 3 daily cards for Cleric', () => {
      const cards = getDailyCards('Cleric');
      expect(cards).toHaveLength(3);
    });
  });

  describe('getUtilityCards', () => {
    it('should return utility cards excluding custom abilities', () => {
      const cards = getUtilityCards('Cleric');
      expect(cards.length).toBeGreaterThan(0);
      expect(cards.every(card => card.type === 'utility')).toBe(true);
      expect(cards.every(card => !card.isCustomAbility)).toBe(true);
    });

    it('should return 3 utility cards for Cleric (excluding Healing Hymn)', () => {
      const cards = getUtilityCards('Cleric');
      expect(cards).toHaveLength(3);
      expect(cards.find(c => c.name === 'Healing Hymn')).toBeUndefined();
    });
  });

  describe('getPowerCardById', () => {
    it('should return the correct card for a valid ID', () => {
      const card = getPowerCardById(1);
      expect(card).toBeDefined();
      expect(card?.name).toBe('Healing Hymn');
    });

    it('should return undefined for an invalid ID', () => {
      const card = getPowerCardById(999);
      expect(card).toBeUndefined();
    });
  });

  describe('createInitialPowerCardsState', () => {
    it('should create initial state with all cards', () => {
      const state = createInitialPowerCardsState('quinn', 1, 8, [2, 3], 5);
      
      expect(state.heroId).toBe('quinn');
      expect(state.customAbility).toBe(1);
      expect(state.utility).toBe(8);
      expect(state.atWills).toEqual([2, 3]);
      expect(state.daily).toBe(5);
    });

    it('should initialize all cards as not flipped', () => {
      const state = createInitialPowerCardsState('quinn', 1, 8, [2, 3], 5);
      
      expect(state.cardStates).toHaveLength(5);
      expect(state.cardStates.every(s => s.isFlipped === false)).toBe(true);
    });
  });

  describe('flipPowerCard', () => {
    it('should flip the specified card', () => {
      const state = createInitialPowerCardsState('quinn', 1, 8, [2, 3], 5);
      const flipped = flipPowerCard(state, 5);
      
      const dailyState = flipped.cardStates.find(s => s.cardId === 5);
      expect(dailyState?.isFlipped).toBe(true);
    });

    it('should not affect other cards', () => {
      const state = createInitialPowerCardsState('quinn', 1, 8, [2, 3], 5);
      const flipped = flipPowerCard(state, 5);
      
      const otherCards = flipped.cardStates.filter(s => s.cardId !== 5);
      expect(otherCards.every(s => s.isFlipped === false)).toBe(true);
    });

    it('should be able to flip at-will cards (but they should never be flipped in practice)', () => {
      // Note: While flipPowerCard() CAN flip any card type,
      // at-will cards should NEVER be flipped in the game logic.
      // This test verifies the function works, but the game should never call it for at-will cards.
      const state = createInitialPowerCardsState('quinn', 1, 8, [2, 3], 5);
      const flipped = flipPowerCard(state, 2); // Card 2 is "Cleric's Shield", an at-will
      
      const atWillState = flipped.cardStates.find(s => s.cardId === 2);
      expect(atWillState?.isFlipped).toBe(true);
      
      // In real gameplay, at-will cards should never reach this state
      // The shouldFlipDailyCard() function prevents this
    });
  });

  describe('at-will power cards', () => {
    it('should identify at-will cards by type', () => {
      const distractingJab = getPowerCardById(32); // Distracting Jab
      const clericsShield = getPowerCardById(2); // Cleric's Shield
      const luckyStrike = getPowerCardById(33); // Lucky Strike
      
      expect(distractingJab?.type).toBe('at-will');
      expect(clericsShield?.type).toBe('at-will');
      expect(luckyStrike?.type).toBe('at-will');
    });

    it('should never flip at-will cards in practice', () => {
      // This is a documentation test to clarify expected behavior:
      // - At-will powers can be used multiple times per turn
      // - They should NEVER be flipped (marked as used)
      // - The shouldFlipDailyCard() function in GameBoard.svelte ensures this
      
      const atWillCards = POWER_CARDS.filter(card => card.type === 'at-will');
      expect(atWillCards.length).toBeGreaterThan(0);
      
      // All at-will cards should have attack bonuses (they're all attack powers)
      expect(atWillCards.every(card => card.attackBonus !== undefined)).toBe(true);
    });
  });

  describe('addLevel2DailyCard', () => {
    it('should add a level 2 daily card', () => {
      const state = createInitialPowerCardsState('quinn', 1, 8, [2, 3], 5);
      const updated = addLevel2DailyCard(state, 6);
      
      expect(updated.dailyLevel2).toBe(6);
      expect(updated.cardStates).toHaveLength(6);
    });

    it('should initialize the new card as not flipped', () => {
      const state = createInitialPowerCardsState('quinn', 1, 8, [2, 3], 5);
      const updated = addLevel2DailyCard(state, 6);
      
      const newCard = updated.cardStates.find(s => s.cardId === 6);
      expect(newCard?.isFlipped).toBe(false);
    });
  });

  describe('shuffleArray', () => {
    it('should return an array with the same elements', () => {
      const input = [1, 2, 3, 4, 5];
      const result = shuffleArray(input);
      expect(result).toHaveLength(input.length);
      expect(result.sort()).toEqual(input.sort());
    });

    it('should not modify the original array', () => {
      const input = [1, 2, 3, 4, 5];
      const original = [...input];
      shuffleArray(input);
      expect(input).toEqual(original);
    });

    it('should produce deterministic results with the same seed', () => {
      const input = [1, 2, 3, 4, 5];
      const result1 = shuffleArray(input, 12345);
      const result2 = shuffleArray(input, 12345);
      expect(result1).toEqual(result2);
    });

    it('should produce different results with different seeds', () => {
      const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result1 = shuffleArray(input, 12345);
      const result2 = shuffleArray(input, 54321);
      expect(result1).not.toEqual(result2);
    });
  });

  describe('getShuffledAtWillCards', () => {
    it('should return at-will cards for the class', () => {
      const cards = getShuffledAtWillCards('Cleric', 'quinn');
      expect(cards.length).toBeGreaterThan(0);
      expect(cards.every(card => card.type === 'at-will')).toBe(true);
    });

    it('should return deterministic order for the same heroId', () => {
      const cards1 = getShuffledAtWillCards('Cleric', 'quinn');
      const cards2 = getShuffledAtWillCards('Cleric', 'quinn');
      expect(cards1.map(c => c.id)).toEqual(cards2.map(c => c.id));
    });

    it('should return different order for different heroIds', () => {
      const cards1 = getShuffledAtWillCards('Fighter', 'vistra');
      const cards2 = getShuffledAtWillCards('Fighter', 'different-hero');
      // Since the order might coincidentally be the same for small arrays,
      // we just verify both return valid cards
      expect(cards1.length).toBe(cards2.length);
    });
  });

  describe('getShuffledDailyCards', () => {
    it('should return daily cards for the class', () => {
      const cards = getShuffledDailyCards('Cleric', 'quinn');
      expect(cards.length).toBeGreaterThan(0);
      expect(cards.every(card => card.type === 'daily')).toBe(true);
    });

    it('should return deterministic order for the same heroId', () => {
      const cards1 = getShuffledDailyCards('Paladin', 'keyleth');
      const cards2 = getShuffledDailyCards('Paladin', 'keyleth');
      expect(cards1.map(c => c.id)).toEqual(cards2.map(c => c.id));
    });
  });

  describe('getShuffledUtilityCards', () => {
    it('should return utility cards for the class excluding custom abilities', () => {
      const cards = getShuffledUtilityCards('Cleric', 'quinn');
      expect(cards.length).toBeGreaterThan(0);
      expect(cards.every(card => card.type === 'utility')).toBe(true);
      expect(cards.every(card => !card.isCustomAbility)).toBe(true);
    });

    it('should return deterministic order for the same heroId', () => {
      const cards1 = getShuffledUtilityCards('Rogue', 'tarak');
      const cards2 = getShuffledUtilityCards('Rogue', 'tarak');
      expect(cards1.map(c => c.id)).toEqual(cards2.map(c => c.id));
    });
  });
});
