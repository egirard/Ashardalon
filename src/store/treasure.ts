/**
 * Treasure card types and definitions.
 * Based on WoA_cards_list_v1 - 134-166 (33) Treasure.csv
 */

/**
 * Types of treasure cards based on when they're used
 */
export type TreasureUsage = 
  | 'immediate'      // Play immediately - passive bonus while in play
  | 'action'         // Use during your Hero Phase (usually instead of attack/movement)
  | 'reaction'       // Use when triggered (e.g., when taking damage, after die roll)
  | 'consumable';    // Discard after using

/**
 * Effect types for treasure cards
 */
export type TreasureEffectType =
  | 'attack-bonus'       // Bonus to attack rolls
  | 'damage-bonus'       // Bonus to damage on hit
  | 'ac-bonus'           // Bonus to armor class
  | 'speed-bonus'        // Bonus to movement speed
  | 'healing'            // Restore hit points
  | 'reroll'             // Reroll a die
  | 'flip-power'         // Flip up a used power
  | 'attack-action'      // Provides an attack action
  | 'monster-control'    // Move or control a monster
  | 'movement'           // Provides extra movement
  | 'level-up'           // Level up a hero
  | 'trap-disable'       // Bonus to disable traps
  | 'condition-removal'  // Remove a condition
  | 'other';             // Complex effects that need special handling

/**
 * Treasure card effect definition
 */
export interface TreasureEffect {
  type: TreasureEffectType;
  value?: number;
  description: string;
  /** If this effect includes an attack, attack bonus */
  attackBonus?: number;
  /** If this effect includes an attack, damage */
  damage?: number;
  /** If this effect includes an attack, range in tiles */
  range?: number;
}

/**
 * Treasure card definition
 */
export interface TreasureCard {
  id: number;
  name: string;
  description: string;
  rule: string;
  usage: TreasureUsage;
  goldPrice: number;
  effect: TreasureEffect;
  /** Whether this card is flipped/used */
  isFlipped?: boolean;
  /** Whether this card is discarded after use */
  discardAfterUse: boolean;
}

/**
 * Hero inventory to track items
 */
export interface HeroInventory {
  heroId: string;
  items: TreasureCardState[];
}

/**
 * State of a treasure card in a hero's inventory
 */
export interface TreasureCardState {
  cardId: number;
  isFlipped: boolean;
}

/**
 * Treasure deck state
 */
export interface TreasureDeck {
  drawPile: number[];   // Treasure card IDs
  discardPile: number[];
}

/**
 * All treasure cards from the game
 * Note: Card IDs match the original game's numbering (134-166)
 * 
 * IMPLEMENTATION STATUS:
 * - ✅ IMPLEMENTED: attack-bonus, ac-bonus, speed-bonus, healing, damage-bonus
 * - ⚠️ PARTIAL: attack-action (basic attack works, special effects pending)
 * - ❌ NOT YET: reroll, flip-power, monster-control, movement, level-up, trap-disable, condition-removal
 */
export const TREASURE_CARDS: TreasureCard[] = [
  {
    id: 134,
    name: '+1 Magic Sword',
    description: 'The razor-sharp edge of this sword cuts with just the slightest amount of pressure.',
    rule: 'Play this item immediately. You gain a +1 bonus to attack rolls against adjacent Monsters while this item is in play.',
    usage: 'immediate',
    goldPrice: 1000,
    effect: { type: 'attack-bonus', value: 1, description: '+1 to attack rolls against adjacent monsters' },
    discardAfterUse: false,
  },
  {
    id: 135,
    name: '+2 Magic Sword',
    description: 'This weapon is forged using ancient dwarven secrets.',
    rule: 'Play this item immediately. You gain a +2 bonus to attack rolls against adjacent Monsters while this item is in play.',
    usage: 'immediate',
    goldPrice: 1500,
    effect: { type: 'attack-bonus', value: 2, description: '+2 to attack rolls against adjacent monsters' },
    discardAfterUse: false,
  },
  {
    id: 136,
    name: 'Amulet of Protection',
    description: 'This magic amulet deflects attacks.',
    rule: 'Play this item immediately. You gain a +1 bonus to AC while this item is in play.',
    usage: 'immediate',
    goldPrice: 1000,
    effect: { type: 'ac-bonus', value: 1, description: '+1 to AC' },
    discardAfterUse: false,
  },
  {
    id: 137,
    name: 'Blessed Shield',
    description: 'The blessing of Bahamut protects you and your allies.',
    rule: 'Play this item immediately. You and all Heroes on your tile gain a +2 bonus to AC while this item is in play.',
    usage: 'immediate',
    goldPrice: 2000,
    effect: { type: 'ac-bonus', value: 2, description: '+2 to AC for you and all Heroes on your tile' },
    discardAfterUse: false,
  },
  {
    id: 138,
    name: 'Boots of Striding',
    description: 'These simple leather boots make you feel light on your feet.',
    rule: 'Play this item immediately. You gain a +1 bonus to Speed while this item is in play.',
    usage: 'immediate',
    goldPrice: 1000,
    effect: { type: 'speed-bonus', value: 1, description: '+1 to Speed' },
    discardAfterUse: false,
  },
  {
    id: 139,
    name: 'Box of Caltrops',
    description: 'This wooden box contains metal caltrops with razor-sharp tips.',
    rule: 'Use during your Hero Phase. Place three Caltrop tokens on any three squares on your tile. When a Monster is placed on a square with a Caltrop token, remove that token and deal 1 damage to the Monster. Discard this card after using it.',
    usage: 'action',
    goldPrice: 1000,
    effect: { type: 'other', description: 'Place 3 Caltrop tokens that deal 1 damage to monsters' },
    discardAfterUse: true,
  },
  {
    id: 140,
    name: 'Bracers of Defense',
    description: 'These enchanted armbands absorb damage.',
    rule: 'Use when you take damage. Reduce the damage from the attack by 1. Flip this card over after using the item.',
    usage: 'reaction',
    goldPrice: 1000,
    effect: { type: 'other', value: 1, description: 'Reduce damage taken by 1 (flip to use)' },
    discardAfterUse: false,
  },
  {
    id: 141,
    name: 'Crossbow of Speed',
    description: 'The ability to rapidly reload this crossbow makes it an incredibly deadly weapon.',
    rule: 'Use during your Hero Phase. Instead of moving, you can attack a Monster within 1 tile. Attack: +4 / Damage: 1',
    usage: 'action',
    goldPrice: 2000,
    effect: { type: 'attack-action', attackBonus: 4, damage: 1, range: 1, description: 'Attack within 1 tile instead of moving (+4 to hit, 1 damage)' },
    discardAfterUse: false,
  },
  {
    id: 142,
    name: 'Dragontooth Pick',
    description: 'This weapon punches through even the thickest armor.',
    rule: 'Play this item immediately. You gain a +1 bonus to attack rolls against adjacent Monsters while this item is in play. If you roll a natural 19 or 20 on an attack, you deal +1 damage with that attack.',
    usage: 'immediate',
    goldPrice: 1500,
    effect: { type: 'attack-bonus', value: 1, description: '+1 to attack rolls, +1 damage on natural 19-20' },
    discardAfterUse: false,
  },
  {
    id: 143,
    name: 'Dwarven Hammer',
    description: 'This hammer is deadly in the hands of a proficient duelist.',
    rule: 'Play this item immediately. You gain a +1 bonus to attack rolls against adjacent Monsters while this item is in play. If you choose not to move during your Hero Phase, this bonus increases to +3 until the end of your Hero Phase.',
    usage: 'immediate',
    goldPrice: 1500,
    effect: { type: 'attack-bonus', value: 1, description: '+1 to attack rolls (+3 if you don\'t move)' },
    discardAfterUse: false,
  },
  {
    id: 144,
    name: 'Elven Cloak',
    description: 'This ornate cloak blends with your surroundings, giving you the element of surprise.',
    rule: 'Use before drawing a Monster Card during your Exploration Phase. The player to your left places that Monster instead.',
    usage: 'reaction',
    goldPrice: 600,
    effect: { type: 'monster-control', description: 'Another player places spawned monster' },
    discardAfterUse: false,
  },
  {
    id: 145,
    name: 'Flying Carpet',
    description: 'This ten-foot square carpet is woven with intricate stitching and strange runes.',
    rule: 'Use during your Hero Phase. Place the Flying Carpet marker on any tile without a marker. Instead of moving, you can move the Flying Carpet marker to any tile within 1 tile of it. Any Hero standing on the Flying Carpet moves with the carpet.',
    usage: 'action',
    goldPrice: 1000,
    effect: { type: 'movement', description: 'Place and move Flying Carpet marker' },
    discardAfterUse: false,
  },
  {
    id: 146,
    name: 'Gauntlets of Ogre Power',
    description: 'These metal gauntlets grant the wielder incredible strength.',
    rule: 'Play this item immediately. You deal +1 damage when you hit an adjacent Monster with an attack while this item is in play.',
    usage: 'immediate',
    goldPrice: 2000,
    effect: { type: 'damage-bonus', value: 1, description: '+1 damage on hits against adjacent monsters' },
    discardAfterUse: false,
  },
  {
    id: 147,
    name: 'Lucky Charm',
    description: 'A little luck goes a long way.',
    rule: 'Use this item after any die roll. Reroll the die. Discard this card after using it.',
    usage: 'reaction',
    goldPrice: 600,
    effect: { type: 'reroll', description: 'Reroll any die (discard)' },
    discardAfterUse: true,
  },
  {
    id: 149,
    name: 'Pearl of Power',
    description: 'This pearl pulsates with raw power.',
    rule: 'Use during your Hero Phase. Flip up one of your used powers or items. Flip this card over after you use the item.',
    usage: 'action',
    goldPrice: 2000,
    effect: { type: 'flip-power', description: 'Flip up a used power or item (flip to use)' },
    discardAfterUse: false,
  },
  {
    id: 150,
    name: 'Potion of Healing',
    description: 'A grievous wound fades as you drink this potion.',
    rule: 'Use this item during your Hero Phase. You or an adjacent Hero regains 2 Hit Points. Discard this card after using it.',
    usage: 'consumable',
    goldPrice: 600,
    effect: { type: 'healing', value: 2, description: 'Heal 2 HP (discard)' },
    discardAfterUse: true,
  },
  {
    id: 153,
    name: 'Potion of Recovery',
    description: 'This elixir clears the mind and purifies the body.',
    rule: 'Use at any time. End one condition on your Hero or an adjacent Hero. Discard this card after using it.',
    usage: 'reaction',
    goldPrice: 300,
    effect: { type: 'condition-removal', description: 'End one condition (discard)' },
    discardAfterUse: true,
  },
  {
    id: 155,
    name: 'Potion of Rejuvenation',
    description: 'You feel relaxed and refreshed after drinking this potion.',
    rule: 'Use this item during your Hero Phase. Flip up one of your used powers. Discard this card after using it.',
    usage: 'consumable',
    goldPrice: 1000,
    effect: { type: 'flip-power', description: 'Flip up a used power (discard)' },
    discardAfterUse: true,
  },
  {
    id: 156,
    name: 'Potion of Speed',
    description: 'Arcane energy provides you with unnatural swiftness.',
    rule: 'Use during your Hero Phase. Move up to your speed. Discard this card after using it.',
    usage: 'consumable',
    goldPrice: 300,
    effect: { type: 'movement', description: 'Move up to your speed (discard)' },
    discardAfterUse: true,
  },
  {
    id: 157,
    name: 'Ring of Shooting Stars',
    description: 'Bolts of energy fly from this enchanted ring.',
    rule: 'Use during your Hero Phase. Attack 1 Monster within 2 tiles of you. This attack does not count as an attack action. Attack: +8 / Damage: 1. Flip this card over after you use the item.',
    usage: 'action',
    goldPrice: 2000,
    effect: { type: 'attack-action', attackBonus: 8, damage: 1, range: 2, description: 'Free attack within 2 tiles (+8 to hit, 1 damage, flip to use)' },
    discardAfterUse: false,
  },
  {
    id: 158,
    name: 'Scroll of Monster Control',
    description: 'You temporarily take control of your foe.',
    rule: 'Use during your Villain Phase when choosing a Monster\'s action. The Monster does not act normally. Instead, place the Monster in any square within 1 tile of it. If it is adjacent to another Monster, attack that Monster. Attack: +9 / Damage: 1. Discard this card after using it.',
    usage: 'reaction',
    goldPrice: 2000,
    effect: { type: 'monster-control', attackBonus: 9, damage: 1, description: 'Control a monster during Villain Phase (discard)' },
    discardAfterUse: true,
  },
  {
    id: 159,
    name: 'Shield of Protection',
    description: 'This enchanted shield grants magical protection.',
    rule: 'Play this item immediately. You gain a +1 bonus to AC while this item is in play.',
    usage: 'immediate',
    goldPrice: 1000,
    effect: { type: 'ac-bonus', value: 1, description: '+1 to AC' },
    discardAfterUse: false,
  },
  {
    id: 160,
    name: 'Staff of the Elements',
    description: 'This ebony staff is topped with a crystal ball that flickers with elemental power.',
    rule: 'Play this item immediately. You gain a +2 bonus to attack rolls when attacking Monsters within 1 tile of you while this item is in play.',
    usage: 'immediate',
    goldPrice: 1500,
    effect: { type: 'attack-bonus', value: 2, description: '+2 to attack rolls against monsters within 1 tile' },
    discardAfterUse: false,
  },
  {
    id: 161,
    name: "Thieves' Tools",
    description: 'Small pins, wrenches, and picks are organized in a leather pouch.',
    rule: 'Play this item immediately. You gain a +4 bonus to rolls to disable Traps while this item is in play.',
    usage: 'immediate',
    goldPrice: 600,
    effect: { type: 'trap-disable', value: 4, description: '+4 to disable Traps' },
    discardAfterUse: false,
  },
  {
    id: 162,
    name: 'Throwing Shield',
    description: 'You throw your shield at a nearby enemy, after which the shield returns in a graceful arc.',
    rule: 'Play this item immediately. You gain a +2 bonus to AC while this item is in play. Attack 1 Monster within 2 tiles of you. This action does not count as an attack action. Attack: +6 / Damage: 1',
    usage: 'immediate',
    goldPrice: 2000,
    effect: { type: 'ac-bonus', value: 2, attackBonus: 6, damage: 1, range: 2, description: '+2 to AC, free attack within 2 tiles (+6 to hit, 1 damage)' },
    discardAfterUse: false,
  },
  {
    id: 163,
    name: 'Tome of Experience',
    description: 'Studying this tome teaches skills and techniques you never imagined possible.',
    rule: 'Use while your Hero is level 1. Your Hero becomes level 2. (Flip over your Hero Card.)',
    usage: 'action',
    goldPrice: 1500,
    effect: { type: 'level-up', description: 'Level up your hero to level 2' },
    discardAfterUse: true,
  },
  {
    id: 164,
    name: 'Vorpal Sword',
    description: 'There is nothing as sharp as the bite of a vorpal blade.',
    rule: 'Play this item immediately. You gain a +2 bonus to attack rolls against adjacent Monsters while this item is in play. If you roll a natural 18, 19, or 20 on an attack, you deal +1 damage with that attack.',
    usage: 'immediate',
    goldPrice: 2000,
    effect: { type: 'attack-bonus', value: 2, description: '+2 to attack rolls, +1 damage on natural 18-20' },
    discardAfterUse: false,
  },
  {
    id: 165,
    name: 'Wand of Fear',
    description: 'A pale amber ray strikes your foes, driving them away.',
    rule: 'Use instead of an attack. Choose a tile within 1 tile of you. Place each Monster on that tile up to 2 tiles away from you. Flip this card over after you use the item.',
    usage: 'action',
    goldPrice: 1500,
    effect: { type: 'monster-control', description: 'Push all monsters on a tile up to 2 tiles away (flip to use)' },
    discardAfterUse: false,
  },
  {
    id: 166,
    name: 'Wand of Polymorph',
    description: 'This wand envelops your target in green light, transforming your foe into a new creature.',
    rule: 'Use instead of an attack. Choose a Monster within 2 tiles of you. Draw a Monster Card and replace the original Monster. Flip this card over after you use the item.',
    usage: 'action',
    goldPrice: 1500,
    effect: { type: 'monster-control', description: 'Replace a monster with a random one (flip to use)' },
    discardAfterUse: false,
  },
];

/**
 * Initial treasure deck (all treasure card IDs)
 */
export const INITIAL_TREASURE_DECK: number[] = TREASURE_CARDS.map(card => card.id);

/**
 * Initialize the treasure deck with shuffled cards
 */
export function initializeTreasureDeck(randomFn: () => number = Math.random): TreasureDeck {
  const shuffled = [...INITIAL_TREASURE_DECK];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return {
    drawPile: shuffled,
    discardPile: [],
  };
}

/**
 * Draw a treasure card from the deck
 * If draw pile is empty, shuffles discard pile into draw pile
 */
export function drawTreasure(deck: TreasureDeck, randomFn: () => number = Math.random): { treasure: number | null; deck: TreasureDeck } {
  if (deck.drawPile.length === 0) {
    // If discard pile is also empty, no treasure to draw
    if (deck.discardPile.length === 0) {
      return { treasure: null, deck };
    }
    // Shuffle discard pile into draw pile
    const shuffled = [...deck.discardPile];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(randomFn() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return {
      treasure: shuffled[0],
      deck: {
        drawPile: shuffled.slice(1),
        discardPile: [],
      },
    };
  }
  
  return {
    treasure: deck.drawPile[0],
    deck: {
      drawPile: deck.drawPile.slice(1),
      discardPile: deck.discardPile,
    },
  };
}

/**
 * Discard a treasure card
 */
export function discardTreasure(deck: TreasureDeck, cardId: number): TreasureDeck {
  return {
    ...deck,
    discardPile: [...deck.discardPile, cardId],
  };
}

/**
 * Get a treasure card by ID
 */
export function getTreasureById(id: number): TreasureCard | undefined {
  return TREASURE_CARDS.find(card => card.id === id);
}

/**
 * Create initial empty inventory for a hero
 */
export function createHeroInventory(heroId: string): HeroInventory {
  return {
    heroId,
    items: [],
  };
}

/**
 * Add a treasure card to a hero's inventory
 */
export function addTreasureToInventory(inventory: HeroInventory, cardId: number): HeroInventory {
  return {
    ...inventory,
    items: [...inventory.items, { cardId, isFlipped: false }],
  };
}

/**
 * Flip (use) a treasure card in inventory
 */
export function flipTreasureInInventory(inventory: HeroInventory, cardId: number): HeroInventory {
  return {
    ...inventory,
    items: inventory.items.map(item =>
      item.cardId === cardId ? { ...item, isFlipped: true } : item
    ),
  };
}

/**
 * Remove a treasure card from inventory (for discardable items)
 */
export function removeTreasureFromInventory(inventory: HeroInventory, cardId: number): HeroInventory {
  const itemIndex = inventory.items.findIndex(item => item.cardId === cardId);
  if (itemIndex === -1) return inventory;
  
  return {
    ...inventory,
    items: [...inventory.items.slice(0, itemIndex), ...inventory.items.slice(itemIndex + 1)],
  };
}

/**
 * Calculate attack bonus from equipped items
 */
export function getAttackBonusFromItems(inventory: HeroInventory): number {
  let bonus = 0;
  for (const item of inventory.items) {
    if (item.isFlipped) continue; // Flipped items don't provide bonuses
    const card = getTreasureById(item.cardId);
    if (card && card.effect.type === 'attack-bonus' && card.effect.value) {
      bonus += card.effect.value;
    }
  }
  return bonus;
}

/**
 * Calculate AC bonus from equipped items
 */
export function getAcBonusFromItems(inventory: HeroInventory): number {
  let bonus = 0;
  for (const item of inventory.items) {
    if (item.isFlipped) continue; // Flipped items don't provide bonuses
    const card = getTreasureById(item.cardId);
    if (card && card.effect.type === 'ac-bonus' && card.effect.value) {
      bonus += card.effect.value;
    }
  }
  return bonus;
}

/**
 * Calculate speed bonus from equipped items
 */
export function getSpeedBonusFromItems(inventory: HeroInventory): number {
  let bonus = 0;
  for (const item of inventory.items) {
    if (item.isFlipped) continue; // Flipped items don't provide bonuses
    const card = getTreasureById(item.cardId);
    if (card && card.effect.type === 'speed-bonus' && card.effect.value) {
      bonus += card.effect.value;
    }
  }
  return bonus;
}

/**
 * Calculate damage bonus from equipped items
 */
export function getDamageBonusFromItems(inventory: HeroInventory): number {
  let bonus = 0;
  for (const item of inventory.items) {
    if (item.isFlipped) continue; // Flipped items don't provide bonuses
    const card = getTreasureById(item.cardId);
    if (card && card.effect.type === 'damage-bonus' && card.effect.value) {
      bonus += card.effect.value;
    }
  }
  return bonus;
}
