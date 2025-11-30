import type { EncounterDeck, EncounterCard, TurnState, HeroHpState, PartyResources } from './types';
import { ENCOUNTER_CARDS, INITIAL_ENCOUNTER_DECK, ENCOUNTER_CANCEL_COST } from './types';

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
 * Initialize the encounter deck with shuffled encounters
 */
export function initializeEncounterDeck(
  randomFn: () => number = Math.random
): EncounterDeck {
  return {
    drawPile: shuffleArray([...INITIAL_ENCOUNTER_DECK], randomFn),
    discardPile: [],
  };
}

/**
 * Draw an encounter from the deck
 * If the draw pile is empty, shuffle the discard pile to form a new draw pile
 */
export function drawEncounter(
  deck: EncounterDeck,
  randomFn: () => number = Math.random
): { encounterId: string | null; deck: EncounterDeck } {
  // If draw pile is empty, reshuffle discard pile
  if (deck.drawPile.length === 0) {
    if (deck.discardPile.length === 0) {
      return { encounterId: null, deck };
    }
    
    // Reshuffle discard pile into draw pile
    const reshuffled = shuffleArray(deck.discardPile, randomFn);
    return {
      encounterId: reshuffled[0],
      deck: {
        drawPile: reshuffled.slice(1),
        discardPile: [],
      },
    };
  }
  
  const [encounterId, ...remainingDraw] = deck.drawPile;
  return {
    encounterId,
    deck: {
      drawPile: remainingDraw,
      discardPile: deck.discardPile,
    },
  };
}

/**
 * Discard an encounter card to the discard pile
 */
export function discardEncounter(
  deck: EncounterDeck,
  encounterId: string
): EncounterDeck {
  return {
    drawPile: deck.drawPile,
    discardPile: [...deck.discardPile, encounterId],
  };
}

/**
 * Get encounter card definition by ID
 */
export function getEncounterById(encounterId: string): EncounterCard | undefined {
  return ENCOUNTER_CARDS.find(e => e.id === encounterId);
}

/**
 * Check if an encounter should be drawn this turn
 * Encounters are drawn when:
 * - No tile was placed (no exploration), OR
 * - At least one black arrow tile was placed (black tiles trigger encounters)
 * 
 * Encounters are NOT drawn when:
 * - Only white arrow tiles were placed this turn
 */
export function shouldDrawEncounter(turnState: TurnState): boolean {
  // If only white tiles were drawn, no encounter
  if (turnState.drewOnlyWhiteTilesThisTurn) {
    return false;
  }
  // Otherwise, draw encounter (either no exploration or black tile was drawn)
  return true;
}

/**
 * Check if an encounter can be cancelled by spending XP
 * Requires at least ENCOUNTER_CANCEL_COST (5) XP
 */
export function canCancelEncounter(resources: PartyResources): boolean {
  return resources.xp >= ENCOUNTER_CANCEL_COST;
}

/**
 * Cancel an encounter by spending XP
 * Deducts ENCOUNTER_CANCEL_COST (5) XP and discards the encounter card
 */
export function cancelEncounter(
  encounter: EncounterCard,
  resources: PartyResources,
  encounterDeck: EncounterDeck
): { resources: PartyResources; encounterDeck: EncounterDeck } {
  return {
    resources: {
      ...resources,
      xp: resources.xp - ENCOUNTER_CANCEL_COST,
    },
    encounterDeck: {
      ...encounterDeck,
      discardPile: [...encounterDeck.discardPile, encounter.id],
    },
  };
}

/**
 * Apply damage to a single hero
 */
export function applyDamageToHero(
  heroHp: HeroHpState,
  damage: number
): HeroHpState {
  return {
    ...heroHp,
    currentHp: Math.max(0, heroHp.currentHp - damage),
  };
}

/**
 * Apply damage to all heroes
 */
export function applyDamageToAllHeroes(
  heroHpList: HeroHpState[],
  damage: number
): HeroHpState[] {
  return heroHpList.map(hp => applyDamageToHero(hp, damage));
}

/**
 * Resolve an encounter effect
 * Returns updated hero HP states
 * 
 * Currently implemented effects:
 * - damage (active-hero): Deals damage to the current hero
 * - damage (all-heroes): Deals damage to all heroes
 * 
 * Not yet implemented effects (will log a warning):
 * - environment
 * - curse
 * - trap
 * - hazard
 */
export function resolveEncounterEffect(
  encounter: EncounterCard,
  heroHpList: HeroHpState[],
  activeHeroId: string
): HeroHpState[] {
  const effect = encounter.effect;
  
  switch (effect.type) {
    case 'damage': {
      if (effect.target === 'active-hero') {
        // Apply damage to active hero only
        return heroHpList.map(hp => {
          if (hp.heroId === activeHeroId) {
            return applyDamageToHero(hp, effect.amount);
          }
          return hp;
        });
      } else {
        // Apply damage to all heroes
        return applyDamageToAllHeroes(heroHpList, effect.amount);
      }
    }
    
    case 'environment':
      // Environment effects are NOT YET IMPLEMENTED
      // Would need to track active environment effects in game state
      console.warn(`Environment effect '${encounter.name}' is not yet implemented`);
      return heroHpList;
      
    case 'curse':
      // Curse effects are NOT YET IMPLEMENTED
      // Would need to track curse duration on heroes
      console.warn(`Curse effect '${encounter.name}' is not yet implemented`);
      return heroHpList;
      
    case 'trap':
      // Trap effects are NOT YET IMPLEMENTED  
      // Would need skill check UI and resolution
      console.warn(`Trap effect '${encounter.name}' is not yet implemented`);
      return heroHpList;
      
    case 'hazard':
      // Hazard effects are NOT YET IMPLEMENTED
      // Would need attack roll against hero AC
      console.warn(`Hazard effect '${encounter.name}' is not yet implemented`);
      return heroHpList;
      
    default:
      return heroHpList;
  }
}
