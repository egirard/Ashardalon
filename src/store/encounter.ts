import type { EncounterDeck, EncounterCard, PartyResources } from './types';
import { ENCOUNTER_CARDS, INITIAL_ENCOUNTER_DECK, ENCOUNTER_CANCEL_COST } from './types';
import { shuffleArray } from './monsters';

/**
 * Initialize the encounter deck with shuffled encounter cards
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
 * Draw an encounter card from the deck
 * If the draw pile is empty, shuffle the discard pile to form a new draw pile
 */
export function drawEncounter(
  deck: EncounterDeck,
  randomFn: () => number = Math.random
): { encounter: string | null; deck: EncounterDeck } {
  // If draw pile is empty, reshuffle discard pile
  if (deck.drawPile.length === 0) {
    if (deck.discardPile.length === 0) {
      return { encounter: null, deck };
    }
    
    // Reshuffle discard pile into draw pile
    const reshuffled = shuffleArray(deck.discardPile, randomFn);
    return {
      encounter: reshuffled[0],
      deck: {
        drawPile: reshuffled.slice(1),
        discardPile: [],
      },
    };
  }
  
  const [encounter, ...remainingDraw] = deck.drawPile;
  return {
    encounter,
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
 * Check if the party can cancel an encounter (has enough XP)
 */
export function canCancelEncounter(resources: PartyResources): boolean {
  return resources.xp >= ENCOUNTER_CANCEL_COST;
}

/**
 * Cancel an encounter by spending XP and discarding the encounter card
 * @returns Updated resources and encounter deck
 */
export function cancelEncounter(
  encounterId: string,
  resources: PartyResources,
  encounterDeck: EncounterDeck
): { resources: PartyResources; encounterDeck: EncounterDeck } {
  return {
    resources: {
      ...resources,
      xp: resources.xp - ENCOUNTER_CANCEL_COST,
    },
    encounterDeck: discardEncounter(encounterDeck, encounterId),
  };
}
