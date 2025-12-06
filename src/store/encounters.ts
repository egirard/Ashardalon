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
 * @param resources - The party's current resources including XP and healing surges
 * @returns true if party has enough XP to cancel an encounter
 */
export function canCancelEncounter(resources: PartyResources): boolean {
  return resources.xp >= ENCOUNTER_CANCEL_COST;
}

/**
 * Cancel an encounter by spending XP
 * Deducts ENCOUNTER_CANCEL_COST (5) XP and discards the encounter card
 * @param encounter - The encounter card to cancel
 * @param resources - The party's current resources
 * @param encounterDeck - The current state of the encounter deck
 * @returns Updated resources (with XP deducted) and encounter deck (with card discarded)
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
 * Check if an encounter card is an environment card
 */
export function isEnvironmentCard(encounter: EncounterCard): boolean {
  return encounter.type === 'environment';
}

/**
 * Activate an environment card
 * If an environment is already active, it is replaced by the new one
 * Returns the new active environment ID
 */
export function activateEnvironment(
  encounterId: string,
  currentEnvironmentId: string | null
): string {
  // New environment replaces any existing one
  return encounterId;
}

/**
 * Get the active environment card by ID
 */
export function getActiveEnvironment(environmentId: string | null): EncounterCard | null {
  if (!environmentId) {
    return null;
  }
  return getEncounterById(environmentId) ?? null;
}

/**
 * Resolve an encounter effect
 * Returns updated hero HP states
 * 
 * Currently implemented effects:
 * - damage (active-hero): Deals damage to the current hero
 * - damage (all-heroes): Deals damage to all heroes
 * - damage (heroes-on-tile): Deals damage to all heroes (treated as all-heroes for now)
 * - attack: Makes attack roll vs AC and deals damage on hit
 * - environment: Persistent global effect (now tracked in game state)
 * 
 * Not yet implemented effects (will log a warning):
 * - curse: Persistent hero debuff
 * - trap: Persistent trap with trigger
 * - hazard: Hazard marker placement
 * - special: Complex effect requiring UI interaction
 */
export function resolveEncounterEffect(
  encounter: EncounterCard,
  heroHpList: HeroHpState[],
  activeHeroId: string,
  randomFn: () => number = Math.random
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
        // Apply damage to all heroes (covers 'all-heroes' and 'heroes-on-tile')
        return applyDamageToAllHeroes(heroHpList, effect.amount);
      }
    }
    
    case 'attack': {
      // Make attack rolls against heroes
      // Note: Status effects (dazed, poisoned) are NOT YET IMPLEMENTED
      if (effect.statusEffect) {
        console.warn(`Status effect '${effect.statusEffect}' from '${encounter.name}' is not yet implemented`);
      }
      
      const getTargetHeroes = (): string[] => {
        switch (effect.target) {
          case 'active-hero':
            return [activeHeroId];
          case 'all-heroes':
          case 'heroes-on-tile':
          case 'heroes-within-1-tile':
            // TODO: Implement proper tile-based targeting for 'heroes-on-tile' and 'heroes-within-1-tile'
            // This would require passing hero positions and tile information to the resolver.
            // For now, treat all area targets as all heroes (conservative approach that ensures
            // no heroes are unfairly spared from attacks that should hit them).
            return heroHpList.map(h => h.heroId);
          default:
            return [activeHeroId];
        }
      };
      
      const targetHeroIds = getTargetHeroes();
      
      return heroHpList.map(hp => {
        if (!targetHeroIds.includes(hp.heroId)) {
          return hp;
        }
        
        // Roll attack (d20 + attack bonus vs AC)
        // Note: randomFn must return values in [0, 1) range to produce valid d20 rolls (1-20)
        const roll = Math.floor(randomFn() * 20) + 1;
        const total = roll + effect.attackBonus;
        const isHit = total >= hp.ac;
        
        if (isHit) {
          return applyDamageToHero(hp, effect.damage);
        } else if (effect.missDamage !== undefined && effect.missDamage > 0) {
          return applyDamageToHero(hp, effect.missDamage);
        }
        return hp;
      });
    }
    
    case 'environment':
      // Environment effects are tracked in game state and applied at appropriate phases
      // No immediate effect on hero HP during encounter resolution
      return heroHpList;
      
    case 'curse':
      // Curse effects are NOT YET IMPLEMENTED
      // Would need to track curse duration on heroes
      console.warn(`Curse effect '${encounter.name}' is not yet implemented`);
      return heroHpList;
      
    case 'trap':
      // Trap effects are NOT YET IMPLEMENTED  
      // Would need persistent trap state and villain phase triggers
      console.warn(`Trap effect '${encounter.name}' is not yet implemented`);
      return heroHpList;
      
    case 'hazard':
      // Hazard effects are NOT YET IMPLEMENTED
      // Would need hazard marker placement and ongoing effects
      console.warn(`Hazard effect '${encounter.name}' is not yet implemented`);
      return heroHpList;
      
    case 'special':
      // Special effects are NOT YET IMPLEMENTED
      // Would need complex UI interactions (tile placement, monster spawning, etc.)
      console.warn(`Special effect '${encounter.name}' is not yet implemented`);
      return heroHpList;
      
    default:
      return heroHpList;
  }
}
