import type { MonsterDeck, Monster, MonsterState, Position } from './types';
import { MONSTERS, INITIAL_MONSTER_DECK } from './types';

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
export function shuffleArray<T>(
  array: T[],
  randomFn: () => number = Math.random
): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Initialize the monster deck with shuffled monsters
 */
export function initializeMonsterDeck(
  randomFn: () => number = Math.random
): MonsterDeck {
  return {
    drawPile: shuffleArray([...INITIAL_MONSTER_DECK], randomFn),
    discardPile: [],
  };
}

/**
 * Draw a monster from the deck
 * If the draw pile is empty, shuffle the discard pile to form a new draw pile
 */
export function drawMonster(
  deck: MonsterDeck,
  randomFn: () => number = Math.random
): { monster: string | null; deck: MonsterDeck } {
  // If draw pile is empty, reshuffle discard pile
  if (deck.drawPile.length === 0) {
    if (deck.discardPile.length === 0) {
      return { monster: null, deck };
    }
    
    // Reshuffle discard pile into draw pile
    const reshuffled = shuffleArray(deck.discardPile, randomFn);
    return {
      monster: reshuffled[0],
      deck: {
        drawPile: reshuffled.slice(1),
        discardPile: [],
      },
    };
  }
  
  const [monster, ...remainingDraw] = deck.drawPile;
  return {
    monster,
    deck: {
      drawPile: remainingDraw,
      discardPile: deck.discardPile,
    },
  };
}

/**
 * Discard a monster card to the discard pile
 */
export function discardMonster(
  deck: MonsterDeck,
  monsterId: string
): MonsterDeck {
  return {
    drawPile: deck.drawPile,
    discardPile: [...deck.discardPile, monsterId],
  };
}

/**
 * Get monster definition by ID
 */
export function getMonsterById(monsterId: string): Monster | undefined {
  return MONSTERS.find(m => m.id === monsterId);
}

/**
 * Create a new monster instance
 */
export function createMonsterInstance(
  monsterId: string,
  position: Position,
  controllerId: string,
  tileId: string,
  instanceIndex: number
): MonsterState | null {
  const monster = getMonsterById(monsterId);
  if (!monster) {
    return null;
  }
  
  return {
    monsterId,
    instanceId: `${monsterId}-${instanceIndex}`,
    position,
    currentHp: monster.hp,
    controllerId,
    tileId,
  };
}

/**
 * Get the center position of a tile for monster placement
 * For normal tiles (4x4), center is at (2, 2)
 */
export function getTileMonsterSpawnPosition(): Position {
  return { x: 2, y: 2 };
}
