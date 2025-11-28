import { describe, it, expect } from 'vitest';
import {
  initializeMonsterDeck,
  drawMonster,
  discardMonster,
  getMonsterById,
  createMonsterInstance,
  getTileMonsterSpawnPosition,
  shuffleArray,
} from './monsters';
import type { MonsterDeck } from './types';
import { INITIAL_MONSTER_DECK, MONSTERS } from './types';

describe('monsters', () => {
  describe('shuffleArray', () => {
    it('should return array with same length', () => {
      const array = [1, 2, 3, 4, 5];
      const result = shuffleArray(array);
      expect(result).toHaveLength(array.length);
    });

    it('should contain all original elements', () => {
      const array = [1, 2, 3, 4, 5];
      const result = shuffleArray(array);
      array.forEach(item => {
        expect(result).toContain(item);
      });
    });

    it('should not modify the original array', () => {
      const array = [1, 2, 3, 4, 5];
      const original = [...array];
      shuffleArray(array);
      expect(array).toEqual(original);
    });

    it('should produce different orders with different random functions', () => {
      const array = ['a', 'b', 'c', 'd', 'e'];
      const result1 = shuffleArray(array, () => 0.1);
      const result2 = shuffleArray(array, () => 0.9);
      expect(result1.join(',')).not.toBe(result2.join(','));
    });
  });

  describe('initializeMonsterDeck', () => {
    it('should create a deck with all monsters from initial deck', () => {
      const deck = initializeMonsterDeck();
      expect(deck.drawPile).toHaveLength(INITIAL_MONSTER_DECK.length);
    });

    it('should start with empty discard pile', () => {
      const deck = initializeMonsterDeck();
      expect(deck.discardPile).toHaveLength(0);
    });

    it('should contain all initial monsters', () => {
      const deck = initializeMonsterDeck();
      INITIAL_MONSTER_DECK.forEach(monsterId => {
        const count = INITIAL_MONSTER_DECK.filter(id => id === monsterId).length;
        const deckCount = deck.drawPile.filter(id => id === monsterId).length;
        expect(deckCount).toBe(count);
      });
    });
  });

  describe('drawMonster', () => {
    it('should draw the first monster from the deck', () => {
      const deck: MonsterDeck = {
        drawPile: ['kobold', 'snake', 'cultist'],
        discardPile: [],
      };

      const result = drawMonster(deck);

      expect(result.monster).toBe('kobold');
      expect(result.deck.drawPile).toEqual(['snake', 'cultist']);
    });

    it('should not affect discard pile when drawing', () => {
      const deck: MonsterDeck = {
        drawPile: ['kobold', 'snake'],
        discardPile: ['cultist'],
      };

      const result = drawMonster(deck);

      expect(result.deck.discardPile).toEqual(['cultist']);
    });

    it('should reshuffle discard pile when draw pile is empty', () => {
      const deck: MonsterDeck = {
        drawPile: [],
        discardPile: ['kobold', 'snake', 'cultist'],
      };

      const result = drawMonster(deck);

      expect(result.monster).not.toBeNull();
      expect(result.deck.discardPile).toHaveLength(0);
      // After reshuffling, draw pile should have remaining cards
      expect(result.deck.drawPile.length).toBe(2);
    });

    it('should return null when both piles are empty', () => {
      const deck: MonsterDeck = {
        drawPile: [],
        discardPile: [],
      };

      const result = drawMonster(deck);

      expect(result.monster).toBeNull();
      expect(result.deck.drawPile).toHaveLength(0);
      expect(result.deck.discardPile).toHaveLength(0);
    });

    it('should decrease deck size by one', () => {
      const deck: MonsterDeck = {
        drawPile: ['kobold', 'snake', 'cultist'],
        discardPile: [],
      };

      const result = drawMonster(deck);

      expect(result.deck.drawPile).toHaveLength(2);
    });
  });

  describe('discardMonster', () => {
    it('should add monster to discard pile', () => {
      const deck: MonsterDeck = {
        drawPile: ['kobold', 'snake'],
        discardPile: [],
      };

      const result = discardMonster(deck, 'cultist');

      expect(result.discardPile).toContain('cultist');
      expect(result.discardPile).toHaveLength(1);
    });

    it('should not affect draw pile', () => {
      const deck: MonsterDeck = {
        drawPile: ['kobold', 'snake'],
        discardPile: [],
      };

      const result = discardMonster(deck, 'cultist');

      expect(result.drawPile).toEqual(['kobold', 'snake']);
    });

    it('should append to existing discard pile', () => {
      const deck: MonsterDeck = {
        drawPile: ['kobold'],
        discardPile: ['snake'],
      };

      const result = discardMonster(deck, 'cultist');

      expect(result.discardPile).toEqual(['snake', 'cultist']);
    });
  });

  describe('getMonsterById', () => {
    it('should return monster definition for valid ID', () => {
      const monster = getMonsterById('kobold');
      expect(monster).toBeDefined();
      expect(monster?.name).toBe('Kobold Dragonshield');
      expect(monster?.ac).toBe(14);
      expect(monster?.hp).toBe(1);
    });

    it('should return undefined for invalid ID', () => {
      const monster = getMonsterById('nonexistent');
      expect(monster).toBeUndefined();
    });

    it('should return all monster stats correctly', () => {
      const snake = getMonsterById('snake');
      expect(snake).toBeDefined();
      expect(snake?.name).toBe('Snake');
      expect(snake?.ac).toBe(12);
      expect(snake?.hp).toBe(1);
      expect(snake?.xp).toBe(1);
    });
  });

  describe('createMonsterInstance', () => {
    it('should create a monster instance with correct properties', () => {
      const instance = createMonsterInstance(
        'kobold',
        { x: 2, y: 2 },
        'quinn',
        'tile-1',
        0
      );

      expect(instance).not.toBeNull();
      expect(instance?.monsterId).toBe('kobold');
      expect(instance?.instanceId).toBe('kobold-0');
      expect(instance?.position).toEqual({ x: 2, y: 2 });
      expect(instance?.currentHp).toBe(1);
      expect(instance?.controllerId).toBe('quinn');
      expect(instance?.tileId).toBe('tile-1');
    });

    it('should set current HP to monster max HP', () => {
      const instance = createMonsterInstance(
        'cultist',
        { x: 2, y: 2 },
        'quinn',
        'tile-1',
        0
      );

      expect(instance?.currentHp).toBe(2); // Cultist has 2 HP
    });

    it('should return null for invalid monster ID', () => {
      const instance = createMonsterInstance(
        'nonexistent',
        { x: 2, y: 2 },
        'quinn',
        'tile-1',
        0
      );

      expect(instance).toBeNull();
    });

    it('should generate unique instance IDs', () => {
      const instance1 = createMonsterInstance('kobold', { x: 2, y: 2 }, 'quinn', 'tile-1', 0);
      const instance2 = createMonsterInstance('kobold', { x: 2, y: 2 }, 'quinn', 'tile-2', 1);

      expect(instance1?.instanceId).toBe('kobold-0');
      expect(instance2?.instanceId).toBe('kobold-1');
    });
  });

  describe('getTileMonsterSpawnPosition', () => {
    it('should return center position for normal tile', () => {
      const position = getTileMonsterSpawnPosition();
      expect(position).toEqual({ x: 2, y: 2 });
    });
  });
});
