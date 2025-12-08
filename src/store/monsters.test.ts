import { describe, it, expect } from 'vitest';
import {
  initializeMonsterDeck,
  drawMonster,
  discardMonster,
  getMonsterById,
  createMonsterInstance,
  getTileMonsterSpawnPosition,
  getBlackSquarePosition,
  getAdjacentTilePositions,
  isPositionOccupiedByMonster,
  getMonsterSpawnPosition,
  shuffleArray,
  drawMonsterFromBottom,
  filterMonsterDeckByCategory,
  healMonster,
} from './monsters';
import type { MonsterDeck, MonsterState, PlacedTile } from './types';
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

  describe('getBlackSquarePosition', () => {
    it('should return black spot at (2, 1) for 0° rotation (arrow points south)', () => {
      const position = getBlackSquarePosition(0);
      expect(position).toEqual({ x: 2, y: 1 });
    });

    it('should return black spot at (2, 2) for 90° rotation (arrow points west)', () => {
      const position = getBlackSquarePosition(90);
      expect(position).toEqual({ x: 2, y: 2 });
    });

    it('should return black spot at (1, 2) for 180° rotation (arrow points north)', () => {
      const position = getBlackSquarePosition(180);
      expect(position).toEqual({ x: 1, y: 2 });
    });

    it('should return black spot at (1, 1) for 270° rotation (arrow points east)', () => {
      const position = getBlackSquarePosition(270);
      expect(position).toEqual({ x: 1, y: 1 });
    });

    it('should handle negative rotations', () => {
      // -90° should be equivalent to 270°
      const position = getBlackSquarePosition(-90);
      expect(position).toEqual({ x: 1, y: 1 });
    });

    it('should handle rotations > 360°', () => {
      // 450° should be equivalent to 90°
      const position = getBlackSquarePosition(450);
      expect(position).toEqual({ x: 2, y: 2 });
    });

    it('should return center for unexpected rotation values', () => {
      // 45° is not a valid rotation, should fallback to center
      const position = getBlackSquarePosition(45);
      expect(position).toEqual({ x: 2, y: 2 });
    });
  });

  describe('getAdjacentTilePositions', () => {
    it('should return all 8 adjacent positions for center tile position', () => {
      const adjacent = getAdjacentTilePositions({ x: 2, y: 2 });
      expect(adjacent).toHaveLength(8);
    });

    it('should return 3 adjacent positions for corner position', () => {
      // Corner (0,0) only has South, East, and Southeast as valid adjacent positions
      const adjacent = getAdjacentTilePositions({ x: 0, y: 0 });
      expect(adjacent).toHaveLength(3);
      expect(adjacent).toContainEqual({ x: 0, y: 1 }); // South
      expect(adjacent).toContainEqual({ x: 1, y: 0 }); // East
      expect(adjacent).toContainEqual({ x: 1, y: 1 }); // Southeast
    });

    it('should return 5 adjacent positions for edge position', () => {
      // Edge (1,0) - on north edge
      const adjacent = getAdjacentTilePositions({ x: 1, y: 0 });
      // Valid: South, East, West, Southeast, Southwest
      expect(adjacent).toHaveLength(5);
      expect(adjacent).toContainEqual({ x: 1, y: 1 }); // South
      expect(adjacent).toContainEqual({ x: 2, y: 0 }); // East
      expect(adjacent).toContainEqual({ x: 0, y: 0 }); // West
    });

    it('should return positions in consistent order', () => {
      // Two calls should return same order
      const adjacent1 = getAdjacentTilePositions({ x: 2, y: 2 });
      const adjacent2 = getAdjacentTilePositions({ x: 2, y: 2 });
      expect(adjacent1).toEqual(adjacent2);
    });
  });

  describe('isPositionOccupiedByMonster', () => {
    it('should return true when position is occupied by monster on same tile', () => {
      const monsters: MonsterState[] = [
        { monsterId: 'kobold', instanceId: 'kobold-0', position: { x: 1, y: 3 }, currentHp: 1, controllerId: 'quinn', tileId: 'tile-1' },
      ];
      expect(isPositionOccupiedByMonster({ x: 1, y: 3 }, 'tile-1', monsters)).toBe(true);
    });

    it('should return false when position is occupied by monster on different tile', () => {
      const monsters: MonsterState[] = [
        { monsterId: 'kobold', instanceId: 'kobold-0', position: { x: 1, y: 3 }, currentHp: 1, controllerId: 'quinn', tileId: 'tile-1' },
      ];
      expect(isPositionOccupiedByMonster({ x: 1, y: 3 }, 'tile-2', monsters)).toBe(false);
    });

    it('should return false when no monsters exist', () => {
      expect(isPositionOccupiedByMonster({ x: 1, y: 3 }, 'tile-1', [])).toBe(false);
    });

    it('should return false when position is not occupied', () => {
      const monsters: MonsterState[] = [
        { monsterId: 'kobold', instanceId: 'kobold-0', position: { x: 2, y: 2 }, currentHp: 1, controllerId: 'quinn', tileId: 'tile-1' },
      ];
      expect(isPositionOccupiedByMonster({ x: 1, y: 3 }, 'tile-1', monsters)).toBe(false);
    });
  });

  describe('getMonsterSpawnPosition', () => {
    it('should return black spot position when it is unoccupied', () => {
      const tile: PlacedTile = {
        id: 'tile-1',
        tileType: 'tile-black-2exit-a',
        position: { col: 0, row: -1 },
        rotation: 0, // Arrow points south, black spot at (2, 1)
        edges: { north: 'unexplored', south: 'open', east: 'unexplored', west: 'unexplored' },
      };
      
      const position = getMonsterSpawnPosition(tile, []);
      expect(position).toEqual({ x: 2, y: 1 });
    });

    it('should return adjacent position when black spot is occupied', () => {
      const tile: PlacedTile = {
        id: 'tile-1',
        tileType: 'tile-black-2exit-a',
        position: { col: 0, row: -1 },
        rotation: 0, // Arrow points south, black spot at (2, 1)
        edges: { north: 'unexplored', south: 'open', east: 'unexplored', west: 'unexplored' },
      };
      
      const monsters: MonsterState[] = [
        { monsterId: 'kobold', instanceId: 'kobold-0', position: { x: 2, y: 1 }, currentHp: 1, controllerId: 'quinn', tileId: 'tile-1' },
      ];
      
      const position = getMonsterSpawnPosition(tile, monsters);
      
      // Should be adjacent to black spot (2, 1)
      expect(position).not.toBeNull();
      expect(position).not.toEqual({ x: 2, y: 1 });
      
      // Verify it's actually adjacent
      if (position) {
        const dx = Math.abs(position.x - 2);
        const dy = Math.abs(position.y - 1);
        expect(dx <= 1 && dy <= 1 && (dx > 0 || dy > 0)).toBe(true);
      }
    });

    it('should return null when all positions are occupied', () => {
      const tile: PlacedTile = {
        id: 'tile-1',
        tileType: 'tile-black-2exit-a',
        position: { col: 0, row: -1 },
        rotation: 0, // Arrow points south, black spot at (2, 1)
        edges: { north: 'unexplored', south: 'open', east: 'unexplored', west: 'unexplored' },
      };
      
      // Occupy the black spot and all adjacent positions
      const monsters: MonsterState[] = [
        { monsterId: 'kobold', instanceId: 'kobold-0', position: { x: 2, y: 1 }, currentHp: 1, controllerId: 'quinn', tileId: 'tile-1' },
        // Adjacent positions to (2, 1)
        { monsterId: 'kobold', instanceId: 'kobold-1', position: { x: 2, y: 0 }, currentHp: 1, controllerId: 'quinn', tileId: 'tile-1' },
        { monsterId: 'kobold', instanceId: 'kobold-2', position: { x: 2, y: 2 }, currentHp: 1, controllerId: 'quinn', tileId: 'tile-1' },
        { monsterId: 'kobold', instanceId: 'kobold-3', position: { x: 3, y: 1 }, currentHp: 1, controllerId: 'quinn', tileId: 'tile-1' },
        { monsterId: 'kobold', instanceId: 'kobold-4', position: { x: 1, y: 1 }, currentHp: 1, controllerId: 'quinn', tileId: 'tile-1' },
        { monsterId: 'kobold', instanceId: 'kobold-5', position: { x: 1, y: 0 }, currentHp: 1, controllerId: 'quinn', tileId: 'tile-1' },
        { monsterId: 'kobold', instanceId: 'kobold-6', position: { x: 3, y: 0 }, currentHp: 1, controllerId: 'quinn', tileId: 'tile-1' },
        { monsterId: 'kobold', instanceId: 'kobold-7', position: { x: 1, y: 2 }, currentHp: 1, controllerId: 'quinn', tileId: 'tile-1' },
        { monsterId: 'kobold', instanceId: 'kobold-8', position: { x: 3, y: 2 }, currentHp: 1, controllerId: 'quinn', tileId: 'tile-1' },
      ];
      
      const position = getMonsterSpawnPosition(tile, monsters);
      expect(position).toBeNull();
    });

    it('should work with different tile rotations', () => {
      // Test with 180° rotation - black spot at (1, 2)
      const tile: PlacedTile = {
        id: 'tile-1',
        tileType: 'tile-black-2exit-a',
        position: { col: 0, row: 1 },
        rotation: 180, // Arrow points north, black spot at (1, 2)
        edges: { north: 'open', south: 'unexplored', east: 'unexplored', west: 'unexplored' },
      };
      
      const position = getMonsterSpawnPosition(tile, []);
      expect(position).toEqual({ x: 1, y: 2 });
    });

    it('should not be affected by monsters on other tiles', () => {
      const tile: PlacedTile = {
        id: 'tile-1',
        tileType: 'tile-black-2exit-a',
        position: { col: 0, row: -1 },
        rotation: 0,
        edges: { north: 'unexplored', south: 'open', east: 'unexplored', west: 'unexplored' },
      };
      
      // Monster on a different tile at the same local position
      const monsters: MonsterState[] = [
        { monsterId: 'kobold', instanceId: 'kobold-0', position: { x: 2, y: 1 }, currentHp: 1, controllerId: 'quinn', tileId: 'tile-2' },
      ];
      
      const position = getMonsterSpawnPosition(tile, monsters);
      // Should still return black spot since monster is on different tile
      expect(position).toEqual({ x: 2, y: 1 });
    });
  });

  describe('drawMonsterFromBottom', () => {
    it('should draw the last monster from the deck', () => {
      const deck: MonsterDeck = {
        drawPile: ['kobold', 'snake', 'cultist'],
        discardPile: [],
      };

      const result = drawMonsterFromBottom(deck);

      expect(result.monster).toBe('cultist');
      expect(result.deck.drawPile).toEqual(['kobold', 'snake']);
    });

    it('should return null when deck is empty', () => {
      const deck: MonsterDeck = {
        drawPile: [],
        discardPile: ['kobold'],
      };

      const result = drawMonsterFromBottom(deck);

      expect(result.monster).toBeNull();
      expect(result.deck.drawPile).toEqual([]);
    });
  });

  describe('filterMonsterDeckByCategory', () => {
    it('should filter monsters by category and place on top', () => {
      const deck: MonsterDeck = {
        drawPile: ['kobold', 'snake', 'cultist', 'kobold', 'snake'],
        discardPile: [],
      };

      // Filter for reptiles (kobold and snake are reptiles, cultist is humanoid)
      const result = filterMonsterDeckByCategory(deck, 'reptile', 5, () => 0.5);

      // Should have 4 reptiles (2 kobolds + 2 snakes) on top of deck
      expect(result.deck.drawPile.length).toBeGreaterThanOrEqual(4);
      
      // Cultist should be discarded
      expect(result.discardedMonsters).toContain('cultist');
    });

    it('should shuffle matching cards before placing on top', () => {
      const deck: MonsterDeck = {
        drawPile: ['kobold', 'snake', 'kobold', 'snake', 'kobold'],
        discardPile: [],
      };

      const result1 = filterMonsterDeckByCategory(deck, 'reptile', 5, () => 0.1);
      const result2 = filterMonsterDeckByCategory(deck, 'reptile', 5, () => 0.9);

      // Different random seeds should produce different orders
      expect(result1.deck.drawPile.join(',')).not.toBe(result2.deck.drawPile.join(','));
    });

    it('should discard all cards if none match category', () => {
      const deck: MonsterDeck = {
        drawPile: ['kobold', 'snake', 'kobold'],
        discardPile: [],
      };

      // Filter for devils (none exist in this deck)
      const result = filterMonsterDeckByCategory(deck, 'devil', 3, () => 0.5);

      // All cards should be discarded
      expect(result.discardedMonsters).toHaveLength(3);
      expect(result.deck.discardPile).toHaveLength(3);
    });
  });

  describe('healMonster', () => {
    it('should restore HP to monster', () => {
      const monster: MonsterState = {
        monsterId: 'cultist',
        instanceId: 'cultist-0',
        position: { x: 0, y: 0 },
        currentHp: 1,
        controllerId: 'quinn',
        tileId: 'tile-0',
      };

      const newHp = healMonster(monster, 1);
      expect(newHp).toBe(2);
    });

    it('should not exceed max HP', () => {
      const monster: MonsterState = {
        monsterId: 'cultist', // cultist has maxHp of 2
        instanceId: 'cultist-0',
        position: { x: 0, y: 0 },
        currentHp: 2,
        controllerId: 'quinn',
        tileId: 'tile-0',
      };

      const newHp = healMonster(monster, 5);
      expect(newHp).toBe(2); // Should cap at maxHp
    });
  });
});
