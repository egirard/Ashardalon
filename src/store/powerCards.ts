/**
 * Power card types and definitions for character action cards.
 * Based on WoA_cards_list_v1 - 1-50 (50) Powers.csv
 */

/**
 * Types of power cards
 */
export type PowerCardType = 'at-will' | 'daily' | 'utility';

/**
 * Hero classes that can use power cards
 */
export type PowerCardClass = 'Cleric' | 'Fighter' | 'Paladin' | 'Rogue' | 'Wizard' | 'Dwarf' | 'Half-Orc' | 'Dragonborn';

/**
 * Power card definition
 */
export interface PowerCard {
  id: number;
  name: string;
  type: PowerCardType;
  heroClass: PowerCardClass;
  description: string;
  rule: string;
  attackBonus?: number;
  damage?: number;
  /** Whether this is a custom hero ability (race-based) */
  isCustomAbility?: boolean;
}

/**
 * State of a power card in a hero's hand
 */
export interface PowerCardState {
  cardId: number;
  isFlipped: boolean; // true = used, false = available
}

/**
 * Selected power cards for a hero
 */
export interface HeroPowerCards {
  heroId: string;
  customAbility: number; // Card ID of the hero's custom ability
  utility: number; // Card ID of the selected utility
  atWills: number[]; // Card IDs of the 2 at-will powers
  daily: number; // Card ID of the selected daily power
  dailyLevel2?: number; // Card ID of the additional daily power at level 2
  cardStates: PowerCardState[]; // State of all cards
}

/**
 * All power cards from the game
 */
export const POWER_CARDS: PowerCard[] = [
  // Cleric Powers
  { id: 1, name: 'Healing Hymn', type: 'utility', heroClass: 'Cleric', description: 'You sing a soothing song that seals the wounds of you and your allies.', rule: 'Use this power during your Hero Phase.\nYou and one other Hero on your tile regain 2 Hit Points.', isCustomAbility: true },
  { id: 2, name: "Cleric's Shield", type: 'at-will', heroClass: 'Cleric', description: 'You utter a minor defensive prayer as you strike your foe.', rule: 'Attack one adjacent Monster.\nHit or Miss: Choose 1 Hero on your tile. That Hero gains a +2 bonus to AC until you use this power again.', attackBonus: 6, damage: 1 },
  { id: 3, name: 'Righteous Advance', type: 'at-will', heroClass: 'Cleric', description: 'Your attack grants your ally time to advance.', rule: 'Attack one adjacent Monster.\nHit or Miss: One Hero on your tile moves 2 squares.', attackBonus: 6, damage: 1 },
  { id: 4, name: 'Sacred Flame', type: 'at-will', heroClass: 'Cleric', description: 'Sacred light shines from above, searing a single enemy with holy radiance.', rule: 'Attack one Monster within 1 tile of you.\nIf you hit, choose yourself or one Hero on your tile. That Hero gains 1 Hit Point.', attackBonus: 6, damage: 1 },
  { id: 5, name: 'Blade Barrier', type: 'daily', heroClass: 'Cleric', description: 'You conjure a wall of whirling blades to cut apart advancing foes.', rule: 'Choose a tile within 2 tiles of you. Place five Blade Barrier tokens on five different squares on that tile.\nWhen a Monster is placed on a square with a Blade Barrier token, remove that token and deal 1 damage to the Monster.' },
  { id: 6, name: 'Cause Fear', type: 'daily', heroClass: 'Cleric', description: 'Your holy symbol ignites with divine light, slamming your foes with uncontrollable terror.', rule: 'Choose a tile within 1 tile of you. Each ally on that tile adjacent to a Monster can make an At-Will attack with a +2 bonus to the Attack roll.\nAfter the attacks, place each Monster remaining on a tile within 2 tiles of you.' },
  { id: 7, name: 'Wrathful Thunder', type: 'daily', heroClass: 'Cleric', description: 'When you strike, a shattering thunderclap fills the room.', rule: "Attack one adjacent Monster.\nAfter the attack, choose one Monster on your tile. Pass that Monster's card to the player on your right. That player now controls the Monster.", attackBonus: 6, damage: 3 },
  { id: 8, name: 'Astral Refuge', type: 'utility', heroClass: 'Cleric', description: 'You send an ally to a safe refuge in the Astral Sea for a short time.', rule: "Use this power at the start of any Villain Phase.\nChoose one Hero within 2 tiles of you. Remove that Hero from the tile. At the start of that player's next Hero Phase, that player places the Hero on any tile." },
  { id: 9, name: 'Command', type: 'utility', heroClass: 'Cleric', description: 'You utter a single word that your foe must obey.', rule: 'Use this power during your Hero Phase.\nChoose one Monster on your tile. Place that Monster on a tile within 2 tiles of you.' },
  { id: 10, name: 'Perseverance', type: 'utility', heroClass: 'Cleric', description: 'A house does not stand with just a single wall.', rule: 'Use this power when any player draws an Encounter Card.\nThe cost to cancel the Encounter Card is reduced by the number of Heroes on your tile, including your own Hero.' },

  // Dwarf Power (Vistra's custom ability)
  { id: 11, name: 'Dwarven Resilience', type: 'utility', heroClass: 'Dwarf', description: 'Your dwarven heritage grants you uncommonly strong health.', rule: 'Use this power during your Hero Phase instead of moving.\nYou regain 4 Hit Points.', isCustomAbility: true },

  // Fighter Powers
  { id: 12, name: 'Charge', type: 'at-will', heroClass: 'Fighter', description: 'You rush into combat.', rule: 'Move up to your speed, then attack one adjacent Monster.', attackBonus: 8, damage: 1 },
  { id: 13, name: 'Reaping Strike', type: 'at-will', heroClass: 'Fighter', description: 'You punctuate your scything attacks with wicked jabs and small cutting blows that slip through your enemy\'s defenses.', rule: 'Attack one adjacent Monster twice.', attackBonus: 4, damage: 1 },
  { id: 14, name: 'Sure Strike', type: 'at-will', heroClass: 'Fighter', description: 'You trade power for precision.', rule: 'Attack one adjacent Monster.', attackBonus: 11, damage: 1 },
  { id: 15, name: 'Comeback Strike', type: 'daily', heroClass: 'Fighter', description: 'A timely strike gives you the strength to fight on.', rule: 'Attack one adjacent Monster.\nIf you hit, you regain 2 hit points.\nIf you miss, do not flip this card over.', attackBonus: 7, damage: 2 },
  { id: 16, name: 'Into the Fray', type: 'daily', heroClass: 'Fighter', description: 'You unleash a fierce battle cry as you leap boldly into battle.', rule: 'Place your Hero adjacent to any Hero within 2 tiles of you. Attack one adjacent Monster.', attackBonus: 7, damage: 3 },
  { id: 17, name: 'Taunting Advance', type: 'daily', heroClass: 'Fighter', description: 'You rush forward and call forth your enemy.', rule: 'Move your speed. Then choose a Monster within 2 tiles of you. Place that Monster adjacent to your Hero and attack it.', attackBonus: 8, damage: 3 },
  { id: 18, name: 'Inspiring Advice', type: 'utility', heroClass: 'Fighter', description: 'You encourage your teammate to fight on.', rule: 'Use when a Hero misses a Monster with an attack.\nThe Hero rerolls the attack.\nIf the attack misses, do not flip this card over.' },
  { id: 19, name: 'One for the Team', type: 'utility', heroClass: 'Fighter', description: 'You protect your ally from the hazards of the dungeon.', rule: 'Use when any player draws an Encounter Card.\nResolve the Encounter Card as if you drew it.' },
  { id: 20, name: 'To Arms!', type: 'utility', heroClass: 'Fighter', description: 'You rally your companions to meet your foe head on.', rule: 'Use when a new Monster is placed on a tile.\nYou and one Hero on your tile can move your speed.' },

  // Paladin Powers
  { id: 21, name: 'Lay On Hands', type: 'utility', heroClass: 'Paladin', description: 'Your divine touch instantly heals wounds.', rule: 'One adjacent Hero regains 2 hit points.', isCustomAbility: true },
  { id: 22, name: 'Divine Challenge', type: 'at-will', heroClass: 'Paladin', description: 'You boldly confront a nearby enemy.', rule: 'Choose one Monster within 1 tile of you. Place that Monster adjacent to your Hero.\nAttack one adjacent Monster.', attackBonus: 8, damage: 1 },
  { id: 23, name: 'Holy Strike', type: 'at-will', heroClass: 'Paladin', description: 'You strike an enemy, igniting it with holy light.', rule: 'Attack one adjacent Monster.\nIf you started your Hero Phase adjacent to the Monster, deal +1 damage if you hit.', attackBonus: 8, damage: 1 },
  { id: 24, name: 'Valiant Strike', type: 'at-will', heroClass: 'Paladin', description: 'The odds against you add strength to your attack.', rule: 'Attack one adjacent Monster.\nWhen making this attack, you get a +1 bonus to attack for each Monster adjacent to your Hero.', attackBonus: 8, damage: 1 },
  { id: 25, name: 'Arcing Strike', type: 'daily', heroClass: 'Paladin', description: 'You swing your weapon in a wide arc.', rule: 'Attack one or two adjacent Monsters.', attackBonus: 9, damage: 3 },
  { id: 26, name: 'Benign Transposition', type: 'daily', heroClass: 'Paladin', description: 'You call upon divine power to switch places with an ally to strike a foe.', rule: 'Choose 1 Hero within 2 tiles of you. You swap positions with that Hero.\nAfter swapping positions, attack one adjacent Monster.', attackBonus: 8, damage: 3 },
  { id: 27, name: 'Righteous Smite', type: 'daily', heroClass: 'Paladin', description: 'Your righteous attack fills your party with preternatural resolve.', rule: 'Attack one adjacent Monster.\nHit or Miss: All Heroes on your tile regain 1 Hit Point.', attackBonus: 9, damage: 3 },
  { id: 28, name: 'Bravery', type: 'utility', heroClass: 'Paladin', description: 'Your bravery gives you the power to fight on.', rule: "Use when a Monster within 1 tile of you activates during any player's Villain Phase.\nPlace your Hero adjacent to that Monster. You regain 1 hit point." },
  { id: 29, name: 'Noble Shield', type: 'utility', heroClass: 'Paladin', description: 'You quickly throw up your shield, protecting your friends from harm at your expense.', rule: 'Use when a Monster targets you and at least one additional Hero with the same attack.\nYou are the only target of the attack, but the attack roll against you is automatically a 20 and cannot be rerolled.' },
  { id: 30, name: "Virtue's Touch", type: 'utility', heroClass: 'Paladin', description: 'Your gentle touch removes affliction.', rule: 'Choose one adjacent Hero. End one condition on that Hero.' },

  // Half-Orc Power (Tarak's custom ability)
  { id: 31, name: 'Furious Assault', type: 'utility', heroClass: 'Half-Orc', description: 'Your wrath burns inside you, giving strength to your next attack.', rule: 'Use this power when you hit a Monster with an attack.\nThe Monster takes +1 damage.', isCustomAbility: true },

  // Rogue Powers
  { id: 32, name: 'Distracting Jab', type: 'at-will', heroClass: 'Rogue', description: 'You escape the clutches of your foe as it reacts to your attack.', rule: 'Attack one adjacent Monster.\nIf you hit, move the Monster 1 square.\nAfter the attack, move your speed.', attackBonus: 7, damage: 1 },
  { id: 33, name: 'Lucky Strike', type: 'at-will', heroClass: 'Rogue', description: 'They fall for it if you\'re lucky, and then they fall.', rule: 'Attack one Monster within 1 tile of you.\nIf you hit and your attack roll is an even number, deal +1 damage.', attackBonus: 7, damage: 1 },
  { id: 34, name: 'Positioning Shot', type: 'at-will', heroClass: 'Rogue', description: 'To avoid your vicious attack, your enemy leaps exactly where you want it to be.', rule: 'Attack one Monster within 2 tiles of you.\nHit or Miss: Place that Monster on any square on your tile or on an adjacent tile.', attackBonus: 7, damage: 1 },
  { id: 35, name: 'Acrobatic Onslaught', type: 'daily', heroClass: 'Rogue', description: 'After a quick strike, you leap through the air, lining up your next target.', rule: 'Attack one adjacent Monster.\nHit or Miss: Place your Hero on any tile within 2 tiles of where you started, and then use an At-Will power immediately.', attackBonus: 7, damage: 2 },
  { id: 36, name: "King's Castle", type: 'daily', heroClass: 'Rogue', description: "It's hard to get the little guy when he's behind an ally who can crush plate armor in his teeth.", rule: 'Swap positions with one Hero within 1 tile of you.\nAttack 1 Monster within 2 tiles of you.', attackBonus: 7, damage: 3 },
  { id: 37, name: 'Tornado Strike', type: 'daily', heroClass: 'Rogue', description: 'Your weapon becomes a blur as you make swift, sweeping attacks.', rule: 'Attack four times. Each attack can be against any Monster on your tile.\nAfter the attacks, place your Hero on any square on your tile.', attackBonus: 7, damage: 1 },
  { id: 38, name: 'Distant Diversion', type: 'utility', heroClass: 'Rogue', description: 'The monster turns to investigate the sound of a thrown pebble.', rule: 'Choose one Monster within 3 tiles of you.\nPlace that Monster onto an adjacent tile.' },
  { id: 39, name: 'Practiced Evasion', type: 'utility', heroClass: 'Rogue', description: 'A quick flip and quicker fingers disables the trap.', rule: 'Use this power when you are hit by an attack from a Trap or Event Attack Encounter Card.\nThe attack misses. If the attack was from a Trap Encounter Card, you get a free Disable check against that Trap.' },
  { id: 40, name: 'Tumbling Escape', type: 'utility', heroClass: 'Rogue', description: 'You nimbly roll out of harm\'s way.', rule: 'Use this power when a Monster hits you with an attack.\nThe attack misses. Place your Hero on any tile within 1 tile of where you started.' },

  // Dragonborn Power (Heskan's custom ability)
  { id: 41, name: 'Hurled Breath', type: 'daily', heroClass: 'Dragonborn', description: 'You hurl your draconic breath, engulfing your foes a short distance away.', rule: 'Choose a tile within 2 tiles of you. Attack each Monster on that tile.\nThis attack does not count as an attack action.', attackBonus: 5, damage: 1, isCustomAbility: true },

  // Wizard Powers
  { id: 42, name: 'Arc Lightning', type: 'at-will', heroClass: 'Wizard', description: 'Lightning leaps from your outstretched hands, blasting your foes.', rule: 'Attack up to two Monsters. Each monster can be on your tile or any tile within 1 tile of you.', attackBonus: 7, damage: 1 },
  { id: 43, name: 'Hypnotism', type: 'at-will', heroClass: 'Wizard', description: "Your enemy's mouth goes slack as your magic takes control.", rule: 'Choose a Monster within 1 tile of you. Move that Monster 1 tile. If it ends adjacent to another Monster, make an attack against the second Monster.', attackBonus: 9, damage: 1 },
  { id: 44, name: 'Ray of Frost', type: 'at-will', heroClass: 'Wizard', description: 'A blistering ray of white frost streaks to your target, slowing its reactions.', rule: 'Attack one Monster on your tile or on any tile within 2 tiles of you.', attackBonus: 7, damage: 1 },
  { id: 45, name: 'Flaming Sphere', type: 'daily', heroClass: 'Wizard', description: 'You conjure a rolling ball of fire and control where it goes.', rule: 'Place 3 Flaming Sphere tokens in a stack on any square within 1 tile of you.\nInstead of moving during your Hero phase, you can move the Flaming Sphere stack 1 tile.\nAt the end of your Hero Phase, you can remove 1 Flaming Sphere token and deal 1 damage to each Monster on that tile.' },
  { id: 46, name: 'Shock Sphere', type: 'daily', heroClass: 'Wizard', description: 'You hurl a crackling orb of lightning, engulfing your foes in its electric embrace.', rule: 'Choose a tile within 2 tiles of you. Attack each Monster on that tile.', attackBonus: 9, damage: 2 },
  { id: 47, name: 'Spectral Ram', type: 'daily', heroClass: 'Wizard', description: 'You bash your foe with arcane force that sends it reeling.', rule: 'Attack one Monster within 2 tiles of you.\nHit or Miss: Place the Monster onto any tile within 2 tiles of where it started.', attackBonus: 9, damage: 3 },
  { id: 48, name: 'Invisibility', type: 'utility', heroClass: 'Wizard', description: 'You vanish from sight.', rule: "Use this power during your Hero Phase.\nUntil the start of your next Hero Phase, you do not count as the closest Hero for any Monster's tactics.\nMonster attacks that attack every Hero on a tile still attack you." },
  { id: 49, name: 'Mirror Image', type: 'utility', heroClass: 'Wizard', description: 'You create three duplicate images of yourself.', rule: 'Use this power during your Hero Phase.\nPlace 3 Mirror Image tokens on your Hero Card.\nFor each Mirror Image token on your Hero Card, you gain +2 AC. Whenever a Monster misses you with an attack, remove 1 Mirror Image token.' },
  { id: 50, name: 'Wizard Eye', type: 'utility', heroClass: 'Wizard', description: 'You see through a magical hovering eye, allowing you to explore from a distance.', rule: "Use this power during your Hero Phase.\nPlace the Wizard Eye token on a tile within 1 tile of you.\nInstead of moving during your Hero Phase, you can move the Wizard Eye marker 1 tile.\nDuring your Exploration Phase, you can explore as if your Hero was on any unexplored edge on the Wizard Eye's tile." },
];

/**
 * Custom ability card IDs for each hero
 */
export const HERO_CUSTOM_ABILITIES: Record<string, number> = {
  quinn: 1,    // Healing Hymn
  vistra: 11,  // Dwarven Resilience
  tarak: 31,   // Furious Assault
  keyleth: 21, // Lay On Hands
  haskan: 41,  // Hurled Breath
};

/**
 * Get power cards available for a specific hero class.
 * Each hero class has access to their class-specific powers plus any race-specific powers.
 * Race powers are mapped based on the WoA rulebook:
 * - Fighter class includes Dwarf race powers
 * - Rogue class includes Half-Orc race powers  
 * - Wizard class includes Dragonborn race powers
 */
export function getPowerCardsForHeroClass(heroClass: string): PowerCard[] {
  // Map hero class to power card class(es) based on WoA rulebook
  const classMapping: Record<string, PowerCardClass[]> = {
    Cleric: ['Cleric'],
    Fighter: ['Fighter', 'Dwarf'],
    Paladin: ['Paladin'],
    Rogue: ['Rogue', 'Half-Orc'],
    Wizard: ['Wizard', 'Dragonborn'],
  };
  
  const allowedClasses = classMapping[heroClass] || [];
  return POWER_CARDS.filter(card => allowedClasses.includes(card.heroClass));
}

/**
 * Get at-will power cards for a hero class
 */
export function getAtWillCards(heroClass: string): PowerCard[] {
  return getPowerCardsForHeroClass(heroClass).filter(card => card.type === 'at-will');
}

/**
 * Get daily power cards for a hero class
 */
export function getDailyCards(heroClass: string): PowerCard[] {
  return getPowerCardsForHeroClass(heroClass).filter(card => card.type === 'daily');
}

/**
 * Get utility power cards for a hero class (excluding custom abilities)
 */
export function getUtilityCards(heroClass: string): PowerCard[] {
  return getPowerCardsForHeroClass(heroClass).filter(
    card => card.type === 'utility' && !card.isCustomAbility
  );
}

/**
 * Get a power card by ID
 */
export function getPowerCardById(id: number): PowerCard | undefined {
  return POWER_CARDS.find(card => card.id === id);
}

/**
 * Create initial power cards state for a hero
 */
export function createInitialPowerCardsState(
  heroId: string,
  customAbility: number,
  utility: number,
  atWills: number[],
  daily: number
): HeroPowerCards {
  const allCardIds = [customAbility, utility, ...atWills, daily];
  return {
    heroId,
    customAbility,
    utility,
    atWills,
    daily,
    cardStates: allCardIds.map(cardId => ({ cardId, isFlipped: false })),
  };
}

/**
 * Flip (use) a power card
 */
export function flipPowerCard(powerCards: HeroPowerCards, cardId: number): HeroPowerCards {
  return {
    ...powerCards,
    cardStates: powerCards.cardStates.map(state =>
      state.cardId === cardId ? { ...state, isFlipped: true } : state
    ),
  };
}

/**
 * Add level 2 daily power card
 */
export function addLevel2DailyCard(powerCards: HeroPowerCards, dailyCardId: number): HeroPowerCards {
  return {
    ...powerCards,
    dailyLevel2: dailyCardId,
    cardStates: [...powerCards.cardStates, { cardId: dailyCardId, isFlipped: false }],
  };
}

/**
 * Simple seeded random number generator (LCG - Linear Congruential Generator).
 * @param seed - Initial seed value
 * @returns A function that generates pseudo-random numbers between 0 (inclusive) and 1 (exclusive)
 */
function seededRandom(seed: number): () => number {
  let currentSeed = seed;
  return () => {
    // LCG parameters (same as glibc)
    currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
    return currentSeed / 0x7fffffff;
  };
}

/**
 * Generate a seed from a hero ID for deterministic shuffling per hero.
 */
function heroIdToSeed(heroId: string): number {
  let hash = 0;
  for (let i = 0; i < heroId.length; i++) {
    const char = heroId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash | 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Fisher-Yates shuffle with optional seeded random.
 * Returns a new shuffled array without modifying the original.
 */
export function shuffleArray<T>(array: T[], seed?: number): T[] {
  const result = [...array];
  const random = seed !== undefined ? seededRandom(seed) : Math.random;
  
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
}

/**
 * Get shuffled at-will power cards for a hero class using the hero ID as seed.
 * This provides deterministic randomization per hero per session.
 */
export function getShuffledAtWillCards(heroClass: string, heroId: string): PowerCard[] {
  const cards = getAtWillCards(heroClass);
  return shuffleArray(cards, heroIdToSeed(heroId));
}

/**
 * Get shuffled daily power cards for a hero class using the hero ID as seed.
 */
export function getShuffledDailyCards(heroClass: string, heroId: string): PowerCard[] {
  const cards = getDailyCards(heroClass);
  return shuffleArray(cards, heroIdToSeed(heroId));
}

/**
 * Get shuffled utility power cards for a hero class using the hero ID as seed.
 */
export function getShuffledUtilityCards(heroClass: string, heroId: string): PowerCard[] {
  const cards = getUtilityCards(heroClass);
  return shuffleArray(cards, heroIdToSeed(heroId));
}
