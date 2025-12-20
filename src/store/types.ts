/**
 * Hero's basic attack information
 */
export interface HeroAttack {
  name: string;
  attackBonus: number;
  damage: number;
  range: number; // 1 for melee
}

/**
 * Condition/status effect that can affect a hero or monster (e.g., poisoned, dazed, slowed)
 * This interface is used for UI display of status effects.
 * Actual status tracking is done via StatusEffect interface in statusEffects.ts
 */
export interface HeroCondition {
  id: string;
  name: string;
  icon: string;
  description: string;
}

/**
 * Hero level (1 or 2)
 */
export type HeroLevel = 1 | 2;

/**
 * Hero stats that vary by level
 */
export interface HeroLevelStats {
  level: HeroLevel;
  hp: number;
  maxHp: number;
  ac: number;
  surgeValue: number;
  attackBonus: number;
  damage: number;
}

/**
 * Level 1 and Level 2 stats for each hero
 */
export const HERO_LEVELS: Record<string, { level1: HeroLevelStats; level2: HeroLevelStats }> = {
  quinn: {
    level1: { level: 1, hp: 8, maxHp: 8, ac: 17, surgeValue: 4, attackBonus: 6, damage: 2 },
    level2: { level: 2, hp: 10, maxHp: 10, ac: 18, surgeValue: 5, attackBonus: 7, damage: 2 },
  },
  vistra: {
    level1: { level: 1, hp: 10, maxHp: 10, ac: 18, surgeValue: 5, attackBonus: 8, damage: 2 },
    level2: { level: 2, hp: 12, maxHp: 12, ac: 19, surgeValue: 6, attackBonus: 9, damage: 2 },
  },
  keyleth: {
    level1: { level: 1, hp: 10, maxHp: 10, ac: 18, surgeValue: 5, attackBonus: 7, damage: 2 },
    level2: { level: 2, hp: 12, maxHp: 12, ac: 19, surgeValue: 6, attackBonus: 8, damage: 2 },
  },
  tarak: {
    level1: { level: 1, hp: 8, maxHp: 8, ac: 17, surgeValue: 4, attackBonus: 7, damage: 2 },
    level2: { level: 2, hp: 10, maxHp: 10, ac: 18, surgeValue: 5, attackBonus: 8, damage: 2 },
  },
  haskan: {
    level1: { level: 1, hp: 6, maxHp: 6, ac: 14, surgeValue: 3, attackBonus: 4, damage: 1 },
    level2: { level: 2, hp: 8, maxHp: 8, ac: 15, surgeValue: 4, attackBonus: 5, damage: 1 },
  },
};

/**
 * Cost in XP to level up a hero
 */
export const LEVEL_UP_COST = 5;

/**
 * Cost in XP to cancel an encounter
 */
export const ENCOUNTER_CANCEL_COST = 5;

/**
 * Monster's basic attack information
 */
export interface MonsterAttack {
  name: string;
  attackBonus: number;
  damage: number;
}

/**
 * Monster attack that can be used at different ranges or conditions.
 * Some monsters have multiple attacks (e.g., Grell has Bite when adjacent, Tentacles when within 1 tile).
 */
export interface MonsterAttackOption {
  name: string;
  attackBonus: number;
  damage: number;
  /** 
   * Range in tiles (0 = adjacent/same square only, 1 = within 1 tile, 2 = within 2 tiles)
   * Default is 0 (melee/adjacent only)
   */
  range?: number;
  /**
   * Status effect applied on hit (e.g., 'poisoned', 'dazed')
   * NOT YET IMPLEMENTED - documented for future use
   */
  statusEffect?: string;
  /**
   * Damage dealt on miss (some attacks deal damage even on miss)
   * NOT YET IMPLEMENTED - documented for future use
   */
  missDamage?: number;
}

/**
 * Monster AI behavior type that determines how the monster acts
 */
export type MonsterTacticType = 
  | 'attack-only'           // If adjacent, attack. Otherwise move toward closest hero.
  | 'move-and-attack'       // If within range, move adjacent AND attack. Otherwise move.
  | 'explore-or-attack'     // If adjacent, attack. If on tile with unexplored edge and no heroes, explore. Otherwise move.
  | 'ranged-attack';        // Complex ranged attack patterns (documented but not fully implemented)

/**
 * Monster card tactics define the AI behavior for each monster type.
 * Based on the official Wrath of Ashardalon monster cards.
 */
export interface MonsterCardTactics {
  /** Primary tactic type that determines AI behavior */
  type: MonsterTacticType;
  /** Attack used when adjacent to hero */
  adjacentAttack: MonsterAttackOption;
  /** 
   * Attack used when moving and attacking (for move-and-attack type)
   * If not specified, uses adjacentAttack after moving
   */
  moveAttack?: MonsterAttackOption;
  /**
   * Range for move-and-attack behavior (default: 1 tile)
   * Monster will move and attack if within this many tiles
   */
  moveAttackRange?: number;
  /**
   * Notes about unimplemented features (for documentation)
   */
  implementationNotes?: string;
}

/**
 * Monster card tactics (keyed by monster ID)
 * Defines the AI behavior for each monster based on their card rules.
 * 
 * IMPLEMENTATION STATUS:
 * - kobold: ✅ FULLY IMPLEMENTED (attack-only behavior)
 * - snake: ✅ FULLY IMPLEMENTED (move-and-attack with poisoned status on hit)
 * - cultist: ✅ FULLY IMPLEMENTED (move-and-attack with poisoned status on hit)
 * 
 * See MONSTER_CARD_IMPLEMENTATION.md for full implementation status and roadmap.
 */
export const MONSTER_TACTICS: Record<string, MonsterCardTactics> = {
  kobold: {
    type: 'attack-only', // See MONSTER_CARD_IMPLEMENTATION.md for exploration behavior
    adjacentAttack: { name: 'Sword', attackBonus: 7, damage: 1 },
    implementationNotes: 'Kobold exploration behavior (draw tile when on tile with unexplored edge and no heroes) not yet implemented.',
  },
  snake: {
    type: 'move-and-attack',
    adjacentAttack: { name: 'Bite', attackBonus: 7, damage: 1, statusEffect: 'poisoned' },
    moveAttackRange: 1,
  },
  cultist: {
    type: 'move-and-attack',
    adjacentAttack: { name: 'Dagger', attackBonus: 6, damage: 1, statusEffect: 'poisoned' },
    moveAttackRange: 1,
  },
};

/**
 * Monster attacks from cards (keyed by monster ID)
 * @deprecated Use MONSTER_TACTICS instead for full card behavior
 */
export const MONSTER_ATTACKS: Record<string, MonsterAttack> = {
  kobold: { name: 'Sword', attackBonus: 7, damage: 1 },
  snake: { name: 'Bite', attackBonus: 7, damage: 1 },
  cultist: { name: 'Dagger', attackBonus: 6, damage: 1 },
};

/**
 * Hero type representing a playable character
 */
export interface Hero {
  id: string;
  name: string;
  heroClass: 'Cleric' | 'Fighter' | 'Paladin' | 'Rogue' | 'Wizard';
  imagePath: string;
  speed: number; // Movement speed in squares
  attack: HeroAttack; // Hero's basic attack
  hp: number; // Current hit points
  maxHp: number; // Maximum hit points
  ac: number; // Armor class
}

/**
 * Position on the game board
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Hero token on the game board
 */
export interface HeroToken {
  heroId: string;
  position: Position;
}

/**
 * Monster category types for encounter card filtering
 * Based on Wrath of Ashardalon creature types:
 * - 'devil': Infernal creatures (Legion Devil, etc.)
 * - 'orc': Orcish creatures (Orc Archer, Orc Smasher, etc.)
 * - 'reptile': Reptilian creatures (Kobolds, Snakes, etc.)
 * - 'aberrant': Aberrations (Gibbering Mouther, Grell, etc.)
 * - 'sentry': Guards and watchmen
 * - 'beast': Natural creatures (Cave Bear, etc.)
 * - 'humanoid': Human-like creatures (Cultist, Duergar, etc.)
 */
export type MonsterCategory = 'devil' | 'orc' | 'reptile' | 'aberrant' | 'sentry' | 'beast' | 'humanoid';

/**
 * Monster definition representing a monster type
 */
export interface Monster {
  id: string;
  name: string;
  ac: number;     // Armor Class
  hp: number;     // Hit Points
  maxHp: number;
  xp: number;     // Experience Points value
  imagePath: string;
  /** 
   * Monster categories for encounter card filtering.
   * Space-separated string of category words. A monster can have multiple categories.
   * Example: "reptile sentry" means the monster is both a reptile AND a sentry.
   */
  category: string;
}

/**
 * Monster instance on the game board
 */
export interface MonsterState {
  monsterId: string;     // Reference to Monster.id
  instanceId: string;    // Unique instance ID
  position: Position;
  currentHp: number;
  controllerId: string;  // Hero ID who controls this monster
  tileId: string;        // Tile where the monster was spawned
  /** Active status effects on this monster */
  statuses?: import('./statusEffects').StatusEffect[];
}

/**
 * Result of a hero's attack against a monster
 */
export interface AttackResult {
  roll: number;        // d20 result (1-20)
  attackBonus: number;
  total: number;       // roll + bonus
  targetAC: number;
  isHit: boolean;
  damage: number;      // 0 if miss
  isCritical: boolean; // natural 20
}

/**
 * Monster deck for drawing monsters during exploration
 */
export interface MonsterDeck {
  drawPile: string[];    // Monster IDs
  discardPile: string[];
}

/**
 * Available monsters in the game
 */
export const MONSTERS: Monster[] = [
  { id: 'kobold', name: 'Kobold Dragonshield', ac: 14, hp: 1, maxHp: 1, xp: 1, imagePath: 'assets/Monster_KoboldDragonshield.png', category: 'reptile sentry' },
  { id: 'snake', name: 'Snake', ac: 12, hp: 1, maxHp: 1, xp: 1, imagePath: 'assets/Monster_Snake.png', category: 'reptile' },
  { id: 'cultist', name: 'Cultist', ac: 13, hp: 2, maxHp: 2, xp: 1, imagePath: 'assets/Monster_Cultist.png', category: 'humanoid' },
];

/**
 * Initial monster deck (monster IDs that can be drawn)
 */
export const INITIAL_MONSTER_DECK: string[] = [
  'kobold', 'kobold', 'kobold',
  'snake', 'snake', 'snake',
  'cultist', 'cultist', 'cultist',
];

/**
 * Party resources shared by all heroes
 */
export interface PartyResources {
  /** Total experience points earned by defeating monsters */
  xp: number;
  /** Number of healing surges remaining for the party */
  healingSurges: number;
}

/**
 * Game screen states
 */
export type GameScreen = 'character-select' | 'game-board' | 'victory' | 'defeat';

/**
 * Scenario state for tracking win/loss conditions
 * MVP scenario: Defeat 2 monsters to win
 */
export interface ScenarioState {
  /** Number of monsters defeated */
  monstersDefeated: number;
  /** Monsters needed to win (MVP: 2) */
  monstersToDefeat: number;
  /** Objective description */
  objective: string;
}

/**
 * Game phase types
 */
export type GamePhase = 'hero-phase' | 'exploration-phase' | 'villain-phase';

/**
 * Hero turn sub-action types
 * - move: hero moved to a new position
 * - attack: hero attacked a monster
 */
export type HeroSubAction = 'move' | 'attack';

/**
 * Hero turn actions state for tracking what actions have been taken during hero phase
 * Valid sequences:
 * - Move only (can move again after)
 * - Move, then attack (turn ends)
 * - Attack, then move (turn ends)
 * - Move twice (turn ends)
 * No double attacks allowed
 */
export interface HeroTurnActions {
  actionsTaken: HeroSubAction[];
  canMove: boolean;
  canAttack: boolean;
}

/**
 * Turn state for tracking current turn
 */
export interface TurnState {
  currentHeroIndex: number;
  currentPhase: GamePhase;
  turnNumber: number;
  /** 
   * Whether a tile was placed (exploration occurred) during this turn.
   * Used to track if hero explored at all.
   */
  exploredThisTurn: boolean;
  /**
   * Whether only white arrow tiles were drawn this turn.
   * - true: only white tiles drawn (prevents encounter draw)
   * - false: at least one black tile drawn OR no tiles drawn
   * This is used to determine if an encounter should be drawn:
   * - No exploration: draw encounter
   * - Black tile drawn: draw encounter
   * - Only white tiles drawn: NO encounter
   */
  drewOnlyWhiteTilesThisTurn: boolean;
}

/**
 * Villain phase step types for tracking monster activations
 * Note: This type is defined for future animation/logging features
 * to track individual steps during monster activation.
 */
export type VillainPhaseStep = 
  | { type: 'monster-activation'; monsterId: string }
  | { type: 'monster-move'; monsterId: string; destination: Position }
  | { type: 'monster-attack'; monsterId: string; targetId: string; result: AttackResult }
  | { type: 'phase-complete' };

/**
 * Hero HP state for tracking current HP and level during the game
 */
export interface HeroHpState {
  heroId: string;
  currentHp: number;
  maxHp: number;
  level: HeroLevel;
  ac: number;
  surgeValue: number;
  attackBonus: number;
  /** Active status effects on this hero */
  statuses?: import('./statusEffects').StatusEffect[];
}

/**
 * All available heroes in the game
 * Quinn and Vistra have speed 5, others have speed 6
 * HP, maxHp, and AC based on game design
 */
export const AVAILABLE_HEROES: Hero[] = [
  { id: 'quinn', name: 'Quinn', heroClass: 'Cleric', imagePath: 'assets/Hero_Cleric_Quinn.png', speed: 5, attack: { name: 'Mace', attackBonus: 6, damage: 2, range: 1 }, hp: 8, maxHp: 8, ac: 17 },
  { id: 'vistra', name: 'Vistra', heroClass: 'Fighter', imagePath: 'assets/Hero_Fighter_Vistra.png', speed: 5, attack: { name: 'Warhammer', attackBonus: 8, damage: 2, range: 1 }, hp: 10, maxHp: 10, ac: 18 },
  { id: 'keyleth', name: 'Keyleth', heroClass: 'Paladin', imagePath: 'assets/Hero_Paladin_Keyleth.png', speed: 6, attack: { name: 'Longsword', attackBonus: 7, damage: 2, range: 1 }, hp: 10, maxHp: 10, ac: 18 },
  { id: 'tarak', name: 'Tarak', heroClass: 'Rogue', imagePath: 'assets/Hero_Rogue_Tarak.png', speed: 6, attack: { name: 'Short Sword', attackBonus: 7, damage: 2, range: 1 }, hp: 8, maxHp: 8, ac: 17 },
  { id: 'haskan', name: 'Haskan', heroClass: 'Wizard', imagePath: 'assets/Hero_Wizard_Haskan.png', speed: 6, attack: { name: 'Quarterstaff', attackBonus: 4, damage: 1, range: 1 }, hp: 6, maxHp: 6, ac: 14 },
];

/**
 * All 8 valid starting positions around the staircase on the Start Tile.
 * The Start Tile is a double-height tile with valid spaces from x: 1-3, y: 0-7.
 * These positions are adjacent to the staircase. At game start, 5 of these 8
 * positions are randomly chosen for player placement.
 */
export const START_TILE_POSITIONS: Position[] = [
  // Row 2 (above staircase)
  { x: 1, y: 2 },
  { x: 2, y: 2 },
  { x: 3, y: 2 },
  // Right side of staircase
  { x: 3, y: 3 },
  { x: 3, y: 4 },
  // Row 5 (below staircase)
  { x: 1, y: 5 },
  { x: 2, y: 5 },
  { x: 3, y: 5 },
];

/**
 * Cardinal directions for tile edges
 */
export type Direction = 'north' | 'south' | 'east' | 'west';

/**
 * Type of tile edge - wall blocks passage, open connects to other tiles, unexplored can be explored
 */
export type EdgeType = 'wall' | 'open' | 'unexplored';

/**
 * Reference to a specific edge on a tile.
 * For the start tile, the `subTileId` field indicates which sub-tile the edge belongs to
 * when there are multiple edges on the same side (e.g., north and south halves of the east edge).
 */
export interface TileEdge {
  tileId: string;
  direction: Direction;
  /** 
   * Optional sub-tile identifier for start tile edges.
   * Used for east/west edges which have two exits (one per sub-tile).
   * Values: 'start-tile-north' or 'start-tile-south'
   */
  subTileId?: StartTileSubTileId;
}

/**
 * Grid position for tiles in the dungeon layout
 */
export interface GridPosition {
  col: number;
  row: number;
}

/**
 * A tile placed on the dungeon board
 */
export interface PlacedTile {
  id: string;
  tileType: string;
  position: GridPosition;
  rotation: number; // 0, 90, 180, or 270 degrees
  edges: {
    north: EdgeType;
    south: EdgeType;
    east: EdgeType;
    west: EdgeType;
  };
}

/**
 * Tile definition describing a tile type before placement
 */
export interface TileDefinition {
  tileType: string;
  imagePath: string;
  /** Default edges before rotation - describes which edges are open/walls */
  defaultEdges: {
    north: EdgeType;
    south: EdgeType;
    east: EdgeType;
    west: EdgeType;
  };
  /** 
   * Whether this is a black arrow tile.
   * - Black arrow tiles: spawn monsters AND trigger encounter draw
   * - White arrow tiles: spawn monsters but prevent encounter draw (if only white tiles drawn)
   */
  isBlackTile: boolean;
}

/**
 * Dungeon state for tracking placed tiles and exploration
 */
export interface DungeonState {
  tiles: PlacedTile[];
  unexploredEdges: TileEdge[];
  tileDeck: string[]; // Array of tile type IDs remaining in the deck
}

/**
 * Available tile definitions
 * Based on the assets available: 2-exit, 3-exit, and 4-exit tiles
 * - Black arrow tiles: spawn monsters AND trigger encounter draw
 * - White arrow tiles: spawn monsters but prevent encounter draw (if only white tiles drawn)
 */
export const TILE_DEFINITIONS: TileDefinition[] = [
  // Black 2-exit tiles (spawn monsters, trigger encounter)
  // Based on image analysis of actual tile PNGs to determine which edges have doorway openings
  { tileType: 'tile-black-2exit-a', imagePath: 'assets/Tile_Black_x2_01.png', defaultEdges: { north: 'open', south: 'open', east: 'wall', west: 'wall' }, isBlackTile: true },  // Vertical corridor: N/S open, E/W walls
  { tileType: 'tile-black-2exit-b', imagePath: 'assets/Tile_Black_x2_02.png', defaultEdges: { north: 'open', south: 'open', east: 'wall', west: 'open' }, isBlackTile: true },  // N/S/W open, E wall (actually 3 exits based on analysis)
  { tileType: 'tile-black-2exit-c', imagePath: 'assets/Tile_Black_x2_03.png', defaultEdges: { north: 'open', south: 'open', east: 'open', west: 'wall' }, isBlackTile: true },  // N/S/E open, W wall (actually 3 exits based on analysis)
  // Black 3-exit tiles (spawn monsters, trigger encounter)
  { tileType: 'tile-black-3exit-a', imagePath: 'assets/Tile_Black_x3_01.png', defaultEdges: { north: 'open', south: 'open', east: 'open', west: 'open' }, isBlackTile: true },  // All open (4 exits based on analysis)
  { tileType: 'tile-black-3exit-b', imagePath: 'assets/Tile_Black_x3_02.png', defaultEdges: { north: 'open', south: 'open', east: 'open', west: 'wall' }, isBlackTile: true },  // N/S/E open, W wall
  { tileType: 'tile-black-3exit-c', imagePath: 'assets/Tile_Black_x3_03.png', defaultEdges: { north: 'wall', south: 'open', east: 'open', west: 'open' }, isBlackTile: true },  // S/E/W open, N wall
  // Black 4-exit tiles (spawn monsters, trigger encounter)
  { tileType: 'tile-black-4exit-a', imagePath: 'assets/Tile_Black_x4_01.png', defaultEdges: { north: 'open', south: 'open', east: 'open', west: 'open' }, isBlackTile: true },  // All open
  { tileType: 'tile-black-4exit-b', imagePath: 'assets/Tile_Black_x4_02.png', defaultEdges: { north: 'open', south: 'open', east: 'open', west: 'open' }, isBlackTile: true },  // All open
  // White 2-exit tiles (spawn monsters, prevent encounter if only white tiles drawn)
  { tileType: 'tile-white-2exit-a', imagePath: 'assets/Tile_White_x2_01.png', defaultEdges: { north: 'wall', south: 'open', east: 'open', west: 'wall' }, isBlackTile: false },  // S/E open, N/W walls
  { tileType: 'tile-white-2exit-b', imagePath: 'assets/Tile_White_x2_02.png', defaultEdges: { north: 'open', south: 'open', east: 'open', west: 'open' }, isBlackTile: false },  // All open (4 exits based on analysis)
  { tileType: 'tile-white-2exit-c', imagePath: 'assets/Tile_White_x2_03.png', defaultEdges: { north: 'open', south: 'open', east: 'wall', west: 'wall' }, isBlackTile: false },  // N/S open, E/W walls
  { tileType: 'tile-white-2exit-d', imagePath: 'assets/Tile_White_x2_04.png', defaultEdges: { north: 'open', south: 'open', east: 'wall', west: 'wall' }, isBlackTile: false },  // N/S open, E/W walls
  { tileType: 'tile-white-2exit-e', imagePath: 'assets/Tile_White_x2_05.png', defaultEdges: { north: 'open', south: 'open', east: 'wall', west: 'wall' }, isBlackTile: false },  // N/S open, E/W walls
  // White 3-exit tiles (spawn monsters, prevent encounter if only white tiles drawn)
  { tileType: 'tile-white-3exit-a', imagePath: 'assets/Tile_White_x3_01.png', defaultEdges: { north: 'open', south: 'open', east: 'open', west: 'open' }, isBlackTile: false },  // All open (4 exits based on analysis)
  { tileType: 'tile-white-3exit-b', imagePath: 'assets/Tile_White_x3_02.png', defaultEdges: { north: 'wall', south: 'open', east: 'open', west: 'open' }, isBlackTile: false },  // S/E/W open, N wall
  { tileType: 'tile-white-3exit-c', imagePath: 'assets/Tile_White_x3_03.png', defaultEdges: { north: 'open', south: 'open', east: 'open', west: 'open' }, isBlackTile: false },  // All open (4 exits based on analysis)
];

/**
 * Initial tile deck for the game (tile type IDs)
 * Mix of black (spawn monsters) and white (no monsters) tiles
 */
export const INITIAL_TILE_DECK: string[] = [
  // Black tiles
  'tile-black-2exit-a', 'tile-black-2exit-b', 'tile-black-2exit-c',
  'tile-black-3exit-a', 'tile-black-3exit-b', 'tile-black-3exit-c',
  'tile-black-4exit-a', 'tile-black-4exit-b',
  // White tiles
  'tile-white-2exit-a', 'tile-white-2exit-b', 'tile-white-2exit-c', 'tile-white-2exit-d', 'tile-white-2exit-e',
  'tile-white-3exit-a', 'tile-white-3exit-b', 'tile-white-3exit-c',
];

/**
 * Sub-tile identifier for the start tile.
 * The start tile consists of two joined sub-tiles:
 * - 'north': The north half (y: 0-3)
 * - 'south': The south half (y: 4-7)
 * 
 * Each sub-tile is treated as its own tile for movement and counting purposes,
 * but the start tile is displayed and referenced as a single unified tile.
 */
export type StartTileSubTileId = 'start-tile-north' | 'start-tile-south';

/**
 * Constants for start tile sub-tile boundaries.
 * The start tile is divided into two 4x4 sub-tiles along the y-axis.
 */
export const START_TILE_SUB_TILE_BOUNDARY = {
  /** Y coordinate where the north sub-tile ends (inclusive) */
  northMaxY: 3,
  /** Y coordinate where the south sub-tile starts (inclusive) */
  southMinY: 4,
};

/**
 * Check if a y-coordinate is in the north half of the start tile
 */
export function isInNorthSubTile(y: number): boolean {
  return y >= 0 && y <= START_TILE_SUB_TILE_BOUNDARY.northMaxY;
}

/**
 * Check if a y-coordinate is in the south half of the start tile
 */
export function isInSouthSubTile(y: number): boolean {
  return y >= START_TILE_SUB_TILE_BOUNDARY.southMinY && y <= 7;
}

/**
 * Get the sub-tile ID for a position on the start tile
 * @param y - The y coordinate within the start tile (0-7)
 * @returns The sub-tile ID ('start-tile-north' or 'start-tile-south'), or null if outside start tile bounds
 */
export function getStartTileSubTileId(y: number): StartTileSubTileId | null {
  if (isInNorthSubTile(y)) {
    return 'start-tile-north';
  }
  if (isInSouthSubTile(y)) {
    return 'start-tile-south';
  }
  return null;
}

/**
 * Start tile definition - double height tile with 4 unexplored edges
 * 
 * The start tile is a special double-sized tile composed of two joined sub-tiles:
 * - North sub-tile: y coordinates 0-3
 * - South sub-tile: y coordinates 4-7
 * 
 * For visual and exploration purposes, it's treated as one tile with 4 edges.
 * For movement and tile counting purposes, each sub-tile is treated separately.
 */
export const START_TILE: PlacedTile = {
  id: 'start-tile',
  tileType: 'start',
  position: { col: 0, row: 0 },
  rotation: 0,
  edges: {
    north: 'unexplored',
    south: 'unexplored',
    east: 'unexplored',
    west: 'unexplored',
  },
};

/**
 * Encounter card type categories
 */
export type EncounterType = 'event' | 'trap' | 'hazard' | 'curse' | 'environment';

/**
 * Encounter effect types that can be applied when an encounter card is drawn
 * 
 * IMPLEMENTED:
 * - damage: Immediately deal damage to one or all heroes
 * - attack: Make an attack roll (+attackBonus vs hero AC) to deal damage
 * 
 * NOT YET IMPLEMENTED (show description only, no mechanical effect):
 * - curse: Apply a lasting debuff to the active hero
 * - environment: Create a persistent dungeon-wide effect
 * - trap: Persistent trap that triggers each villain phase, can be disabled
 * - hazard: Place a hazard marker with ongoing effects
 * - special: Complex effects requiring tile/monster manipulation
 */
export type EncounterEffect = 
  | { type: 'damage'; amount: number; target: 'active-hero' | 'all-heroes' | 'heroes-on-tile' }
  | { type: 'attack'; attackBonus: number; damage: number; missDamage?: number; target: 'active-hero' | 'all-heroes' | 'heroes-on-tile' | 'heroes-within-1-tile'; statusEffect?: string }
  | { type: 'curse'; description: string }
  | { type: 'environment'; description: string }
  | { type: 'trap'; disableDC: number; attackBonus?: number; damage?: number; description: string }
  | { type: 'hazard'; attackBonus?: number; damage?: number; missDamage?: number; description: string }
  | { type: 'special'; description: string };

/**
 * Encounter card definition
 */
export interface EncounterCard {
  id: string;
  name: string;
  type: EncounterType;
  description: string;
  effect: EncounterEffect;
  imagePath: string;
}

/**
 * Encounter deck for drawing encounters when no tile is placed
 */
export interface EncounterDeck {
  drawPile: string[];
  discardPile: string[];
}

/**
 * Active environment state tracking
 * Environments are persistent dungeon-wide effects that remain active until replaced
 */
export interface EnvironmentState {
  /** Currently active environment card ID, or null if no environment is active */
  activeEnvironmentId: string | null;
}

/**
 * Trap state - represents an active trap placed on the board
 * Traps trigger effects during Villain Phase and can be disabled with DC rolls
 */
export interface TrapState {
  /** Unique identifier for this trap instance */
  id: string;
  /** The encounter card ID that created this trap */
  encounterId: string;
  /** Position on the board (global coordinates) */
  position: { x: number; y: number };
  /** DC (difficulty class) for disabling the trap */
  disableDC: number;
}

/**
 * Hazard state - represents an active hazard marker on the board
 * Hazards have ongoing effects when heroes enter or remain on the tile
 */
export interface HazardState {
  /** Unique identifier for this hazard instance */
  id: string;
  /** The encounter card ID that created this hazard */
  encounterId: string;
  /** Position on the board (global coordinates) */
  position: { x: number; y: number };
}

/**
 * Board token type - represents tokens created by power cards
 */
export type BoardTokenType = 'blade-barrier' | 'flaming-sphere' | 'mirror-image' | 'wizard-eye';

/**
 * Board token state - represents tokens placed by power cards on the board
 * Examples: Blade Barrier tokens, Flaming Sphere, Wizard Eye, Mirror Image tokens
 */
export interface BoardTokenState {
  /** Unique identifier for this token instance */
  id: string;
  /** Type of token (determines appearance and behavior) */
  type: BoardTokenType;
  /** The power card ID that created this token */
  powerCardId: number;
  /** Hero ID who placed this token */
  ownerId: string;
  /** Position on the board (global coordinates) */
  position: { x: number; y: number };
  /** Optional: Number of charges/uses remaining (e.g., Flaming Sphere has 3 charges) */
  charges?: number;
  /** Optional: Whether this token can be moved by the owner */
  canMove?: boolean;
}

/**
 * All encounter cards from Wrath of Ashardalon (Cards #51-103)
 * 
 * Effect Implementation Status:
 * ✅ FULLY IMPLEMENTED:
 * - damage (active-hero): Deals damage to the active hero
 * - damage (all-heroes): Deals damage to all heroes
 * - damage (heroes-on-tile): Deals damage to all heroes on the active hero's tile
 * - attack: Makes attack roll (+bonus vs AC), deals damage on hit
 * 
 * ⚠️ NOT YET IMPLEMENTED (show description, no mechanical effect):
 * - curse: Persistent debuffs requiring status tracking
 * - environment: Persistent dungeon-wide effects
 * - trap: Persistent traps with triggered effects
 * - hazard: Hazard markers with ongoing effects
 * - special: Complex effects (tile manipulation, monster spawning, etc.)
 * 
 * See ENCOUNTER_CARDS_IMPLEMENTATION.md for full implementation details.
 */
export const ENCOUNTER_CARDS: EncounterCard[] = [
  // ===== CURSE CARDS (51-58) =====
  // Curses are persistent effects that attach to a hero until removed.
  // NOT YET IMPLEMENTED - require hero status tracking system
  {
    id: 'gap-in-armor',
    name: 'A Gap in the Armor',
    type: 'curse',
    description: 'You are cursed! You have a -4 penalty to AC while this curse is active. If you do not move during your Hero Phase, discard this card.',
    effect: { type: 'curse', description: 'AC -4 penalty. Discard if hero does not move during Hero Phase.' },
    imagePath: 'assets/Encounter_GapInArmor.png',
  },
  {
    id: 'bad-luck',
    name: 'Bad Luck',
    type: 'curse',
    description: 'You are cursed! At the start of your Villain Phase, draw 1 additional Encounter Card. Roll at the end of your Villain Phase: 10+ discard this card.',
    effect: { type: 'curse', description: 'Draw extra encounter card each Villain Phase. Roll 10+ to remove.' },
    imagePath: 'assets/Encounter_BadLuck.png',
  },
  {
    id: 'bloodlust',
    name: 'Bloodlust',
    type: 'curse',
    description: 'You are cursed! At the start of your Hero Phase, you take 1 damage. Discard this card when you defeat a Monster.',
    effect: { type: 'curse', description: 'Take 1 damage at start of Hero Phase. Remove when defeating a monster.' },
    imagePath: 'assets/Encounter_Bloodlust.png',
  },
  {
    id: 'cage',
    name: 'Cage',
    type: 'curse',
    description: 'You are cursed! You take a -2 penalty to AC and you cannot move while this curse is active. A Hero on your tile can attempt to open the cage (Roll 10+).',
    effect: { type: 'curse', description: 'AC -2, cannot move. Hero on tile can Roll 10+ to remove.' },
    imagePath: 'assets/Encounter_Cage.png',
  },
  {
    id: 'dragon-fear',
    name: 'Dragon Fear',
    type: 'curse',
    description: 'You are cursed! Whenever you move to a new tile, take 1 damage. Roll a die at the end of your Hero Phase: 10+ discard this card.',
    effect: { type: 'curse', description: 'Take 1 damage when moving to new tile. Roll 10+ at end of Hero Phase to remove.' },
    imagePath: 'assets/Encounter_DragonFear.png',
  },
  {
    id: 'terrifying-roar',
    name: 'Terrifying Roar',
    type: 'curse',
    description: 'You are cursed! You take a -4 penalty to attack rolls while this curse is active. Roll a die at the end of your Hero Phase: 10+ discard this card.',
    effect: { type: 'curse', description: 'Attack -4 penalty. Roll 10+ at end of Hero Phase to remove.' },
    imagePath: 'assets/Encounter_TerrifyingRoar.png',
  },
  {
    id: 'time-leap',
    name: 'Time Leap',
    type: 'curse',
    description: 'You are cursed! Remove your Hero from play. Draw a Monster Card and place its figure in your square. At the start of your next Hero Phase, place your Hero on any tile.',
    effect: { type: 'curse', description: 'Hero removed from play, monster spawns. Hero returns next Hero Phase.' },
    imagePath: 'assets/Encounter_TimeLeap.png',
  },
  {
    id: 'wrath-of-enemy',
    name: 'Wrath of the Enemy',
    type: 'curse',
    description: 'You are cursed! At the end of your Exploration Phase, the closest Monster not on your tile moves adjacent to you. Roll 10+ at end of Exploration Phase to remove.',
    effect: { type: 'curse', description: 'Closest monster moves to hero each Exploration Phase. Roll 10+ to remove.' },
    imagePath: 'assets/Encounter_WrathOfEnemy.png',
  },

  // ===== ENVIRONMENT CARDS (59-64) =====
  // Environment effects are persistent dungeon-wide effects.
  // NOT YET IMPLEMENTED - require global effect tracking system
  {
    id: 'dragons-tribute',
    name: "Dragon's Tribute",
    type: 'environment',
    description: 'Environment: When drawing a Treasure token, draw two and discard the one with the highest value (or the item).',
    effect: { type: 'environment', description: 'Draw 2 treasures, discard higher value or item.' },
    imagePath: 'assets/Encounter_DragonsTribute.png',
  },
  {
    id: 'hidden-snipers',
    name: 'Hidden Snipers',
    type: 'environment',
    description: 'Environment: Whenever the active Hero ends Hero Phase on a tile without another Hero, take 1 damage.',
    effect: { type: 'environment', description: 'Active hero takes 1 damage if ending Hero Phase alone on tile.' },
    imagePath: 'assets/Encounter_HiddenSnipers.png',
  },
  {
    id: 'high-alert',
    name: 'High Alert',
    type: 'environment',
    description: 'Environment: At the end of each Villain Phase, the active Hero passes one Monster Card to the player on the right.',
    effect: { type: 'environment', description: 'Pass monster card to player on right each Villain Phase.' },
    imagePath: 'assets/Encounter_HighAlert.png',
  },
  {
    id: 'kobold-trappers',
    name: 'Kobold Trappers',
    type: 'environment',
    description: 'Environment: You take a -4 penalty to disable trap rolls while this Environment is active.',
    effect: { type: 'environment', description: 'Trap disable rolls have -4 penalty.' },
    imagePath: 'assets/Encounter_KoboldTrappers.png',
  },
  {
    id: 'surrounded',
    name: 'Surrounded!',
    type: 'environment',
    description: 'Environment: At the end of each Exploration Phase, if a Hero does not control at least one Monster, draw and place a Monster on closest unexplored edge.',
    effect: { type: 'environment', description: 'Heroes without monsters draw monster each Exploration Phase.' },
    imagePath: 'assets/Encounter_Surrounded.png',
  },
  {
    id: 'walls-of-magma',
    name: 'Walls of Magma',
    type: 'environment',
    description: 'Environment: Whenever the active Hero ends Hero Phase adjacent to a wall, that Hero takes 1 damage.',
    effect: { type: 'environment', description: 'Take 1 damage when ending Hero Phase adjacent to wall.' },
    imagePath: 'assets/Encounter_WallsOfMagma.png',
  },

  // ===== EVENT CARDS WITH SPECIAL EFFECTS (65-82) =====
  // These events have complex effects that require special handling
  {
    id: 'ancient-spirits-blessing',
    name: "Ancient Spirit's Blessing",
    type: 'event',
    description: 'The active Hero flips up a used Daily Power belonging to any Hero. Draw another Encounter Card.',
    effect: { type: 'special', description: 'Flip up a used Daily Power. Draw another encounter.' },
    imagePath: 'assets/Encounter_AncientSpiritsBlessing.png',
  },
  {
    id: 'deadly-poison',
    name: 'Deadly Poison',
    type: 'event',
    description: 'Each Hero that is currently Poisoned takes 1 damage. Draw another Encounter Card.',
    effect: { type: 'special', description: 'Poisoned heroes take 1 damage. Draw another encounter.' },
    imagePath: 'assets/Encounter_DeadlyPoison.png',
  },
  {
    id: 'duergar-outpost',
    name: 'Duergar Outpost',
    type: 'event',
    description: 'Draw 5 Monster Cards. Discard any Monster that is not a Devil. Shuffle the remaining cards and put them on top of the Monster Card deck.',
    effect: { type: 'special', description: 'Filter monster deck for Devils.' },
    imagePath: 'assets/Encounter_DuergarOutpost.png',
  },
  {
    id: 'frenzied-leap',
    name: 'Frenzied Leap',
    type: 'event',
    description: 'If a Monster is on the same tile as the active Hero, that Hero takes 2 damage. Otherwise, draw a Monster Card and place it on the closest unexplored edge.',
    effect: { type: 'damage', amount: 2, target: 'active-hero' },
    imagePath: 'assets/Encounter_FrenziedLeap.png',
  },
  {
    id: 'hall-of-orcs',
    name: 'Hall of the Orcs',
    type: 'event',
    description: 'Draw 5 Monster Cards. Discard any Monster that is not an Orc. Shuffle the remaining cards and put them on top of the Monster Card deck.',
    effect: { type: 'special', description: 'Filter monster deck for Orcs.' },
    imagePath: 'assets/Encounter_HallOfOrcs.png',
  },
  {
    id: 'hidden-treasure',
    name: 'Hidden Treasure',
    type: 'event',
    description: 'Place 1 Treasure token on any tile that does not have a Hero on it. Draw another Encounter Card.',
    effect: { type: 'special', description: 'Place treasure token. Draw another encounter.' },
    imagePath: 'assets/Encounter_HiddenTreasure.png',
  },
  {
    id: 'kobold-warren',
    name: 'Kobold Warren',
    type: 'event',
    description: 'Draw 5 Monster Cards. Discard any Monster that is not a Reptile. Shuffle the remaining cards and put them on top of the Monster Card deck.',
    effect: { type: 'special', description: 'Filter monster deck for Reptiles.' },
    imagePath: 'assets/Encounter_KoboldWarren.png',
  },
  {
    id: 'lost',
    name: 'Lost',
    type: 'event',
    description: '"All these tunnels look the same!" Without looking at it, take the bottom Dungeon Tile from the stack and place it on top.',
    effect: { type: 'special', description: 'Move bottom tile to top of tile deck.' },
    imagePath: 'assets/Encounter_Lost.png',
  },
  {
    id: 'occupied-lair',
    name: 'Occupied Lair',
    type: 'event',
    description: 'Draw a tile from the bottom of the tile stack and place next to closest unexplored edge. Draw a Monster Card and place it on that tile. Place 1 Treasure token on that tile.',
    effect: { type: 'special', description: 'Place tile, monster, and treasure.' },
    imagePath: 'assets/Encounter_OccupiedLair.png',
  },
  {
    id: 'quick-advance',
    name: 'Quick Advance',
    type: 'event',
    description: 'Choose a Monster not on any Hero\'s tile. That Monster moves 1 tile closer to the active Hero. Draw another Encounter Card.',
    effect: { type: 'special', description: 'Move a monster closer. Draw another encounter.' },
    imagePath: 'assets/Encounter_QuickAdvance.png',
  },
  {
    id: 'revel-in-destruction',
    name: 'Revel in Destruction',
    type: 'event',
    description: 'Choose a damaged Monster. That Monster regains 1 Hit Point.',
    effect: { type: 'special', description: 'Heal a damaged monster 1 HP.' },
    imagePath: 'assets/Encounter_RevelInDestruction.png',
  },
  {
    id: 'scream-of-sentry',
    name: 'Scream of the Sentry',
    type: 'event',
    description: 'If no Monster is in play, discard this card. Otherwise, choose a Monster, place a tile from the bottom of the deck next to the closest unexplored edge to that Monster, and spawn a monster on the new tile.',
    effect: { type: 'special', description: 'Place tile and monster near existing monster.' },
    imagePath: 'assets/Encounter_ScreamOfSentry.png',
  },
  {
    id: 'spotted',
    name: 'Spotted!',
    type: 'event',
    description: 'Draw 5 Monster Cards, discard non-Sentry monsters, shuffle remaining on top. Place bottom tile next to closest unexplored edge to active Hero, spawn a monster on it.',
    effect: { type: 'special', description: 'Filter deck for Sentries, place tile and monster.' },
    imagePath: 'assets/Encounter_Spotted.png',
  },
  {
    id: 'thief-in-dark',
    name: 'Thief in the Dark',
    type: 'event',
    description: 'The active Hero discards a Treasure Card. If no Treasure Card, discard a Treasure token instead. If neither, nothing happens.',
    effect: { type: 'special', description: 'Active hero loses a treasure.' },
    imagePath: 'assets/Encounter_ThiefInDark.png',
  },
  {
    id: 'unbearable-heat',
    name: 'Unbearable Heat',
    type: 'event',
    description: 'Each Hero takes 1 damage.',
    effect: { type: 'damage', amount: 1, target: 'all-heroes' },
    imagePath: 'assets/Encounter_UnbearableHeat.png',
  },
  {
    id: 'unnatural-corruption',
    name: 'Unnatural Corruption',
    type: 'event',
    description: 'Draw 5 Monster Cards. Discard any Monster that is not an Aberrant. Shuffle the remaining cards and put them on top of the Monster Card deck.',
    effect: { type: 'special', description: 'Filter monster deck for Aberrants.' },
    imagePath: 'assets/Encounter_UnnaturalCorruption.png',
  },
  {
    id: 'wandering-monster',
    name: 'Wandering Monster',
    type: 'event',
    description: 'Draw a Monster Card and place its figure on any tile with an unexplored edge.',
    effect: { type: 'special', description: 'Spawn a monster on tile with unexplored edge.' },
    imagePath: 'assets/Encounter_WanderingMonster.png',
  },
  {
    id: 'warp-in-time',
    name: 'Warp in Time',
    type: 'event',
    description: 'Each player passes one Monster Card (if he or she has one) to the player on the right. Draw another Encounter Card.',
    effect: { type: 'special', description: 'Pass monster cards right. Draw another encounter.' },
    imagePath: 'assets/Encounter_WarpInTime.png',
  },

  // ===== EVENT CARDS WITH ATTACK EFFECTS (83-96) =====
  // These events make attack rolls against heroes
  {
    id: 'blinding-bomb',
    name: 'Blinding Bomb',
    type: 'event',
    description: 'Attack +8 vs each Hero within 1 tile of the active Hero. Hit: Dazed. After, each Sentry Monster moves 1 tile toward closest unexplored edge.',
    effect: { type: 'attack', attackBonus: 8, damage: 0, target: 'heroes-within-1-tile', statusEffect: 'dazed' },
    imagePath: 'assets/Encounter_BlindingBomb.png',
  },
  {
    id: 'bulls-eye',
    name: "Bull's Eye!",
    type: 'event',
    description: 'Attack +10 vs the active Hero. Hit: 1 damage.',
    effect: { type: 'attack', attackBonus: 10, damage: 1, target: 'active-hero' },
    imagePath: 'assets/Encounter_BullsEye.png',
  },
  {
    id: 'concussive-blast',
    name: 'Concussive Blast',
    type: 'event',
    description: 'Attack +8 vs each Hero on the active Hero\'s tile. Hit: 2 damage. Miss: 1 damage. After, move each Hero to an adjacent tile.',
    effect: { type: 'attack', attackBonus: 8, damage: 2, missDamage: 1, target: 'heroes-on-tile' },
    imagePath: 'assets/Encounter_ConcussiveBlast.png',
  },
  {
    id: 'deep-tremor',
    name: 'Deep Tremor',
    type: 'event',
    description: 'Attack +8 vs each Hero. Hit: 1 damage.',
    effect: { type: 'attack', attackBonus: 8, damage: 1, target: 'all-heroes' },
    imagePath: 'assets/Encounter_DeepTremor.png',
  },
  {
    id: 'earthquake',
    name: 'Earthquake!',
    type: 'event',
    description: 'Attack +6 vs each Hero. Hit: 2 damage and Dazed. Miss: 1 damage.',
    effect: { type: 'attack', attackBonus: 6, damage: 2, missDamage: 1, target: 'all-heroes', statusEffect: 'dazed' },
    imagePath: 'assets/Encounter_Earthquake.png',
  },
  {
    id: 'fungal-bloom',
    name: 'Fungal Bloom',
    type: 'event',
    description: 'Attack +8 vs the active Hero and each Hero within 1 tile. Hit: Dazed and Poisoned.',
    effect: { type: 'attack', attackBonus: 8, damage: 0, target: 'heroes-within-1-tile', statusEffect: 'dazed,poisoned' },
    imagePath: 'assets/Encounter_FungalBloom.png',
  },
  {
    id: 'lurkers-strike',
    name: "Lurker's Strike",
    type: 'event',
    description: 'Attack +8 vs the active Hero. Hit: 1 damage and Poisoned. After, draw a Monster Card and place on active Hero\'s tile.',
    effect: { type: 'attack', attackBonus: 8, damage: 1, target: 'active-hero', statusEffect: 'poisoned' },
    imagePath: 'assets/Encounter_LurkersStrike.png',
  },
  {
    id: 'phalagars-lair',
    name: "Phalagar's Lair",
    type: 'event',
    description: 'Attack +4 vs each Hero on the active Hero\'s tile. Hit: 3 damage and Dazed. Miss: 1 damage.',
    effect: { type: 'attack', attackBonus: 4, damage: 3, missDamage: 1, target: 'heroes-on-tile', statusEffect: 'dazed' },
    imagePath: 'assets/Encounter_PhalagarsLair.png',
  },
  {
    id: 'poisoned-arrow',
    name: 'Poisoned Arrow',
    type: 'event',
    description: 'Attack +8 vs the active Hero. Hit: 2 damage and Poisoned. Miss: 1 damage.',
    effect: { type: 'attack', attackBonus: 8, damage: 2, missDamage: 1, target: 'active-hero', statusEffect: 'poisoned' },
    imagePath: 'assets/Encounter_PoisonedArrow.png',
  },
  {
    id: 'steam-vent',
    name: 'Steam Vent',
    type: 'event',
    description: 'Attack +8 vs each Hero on the active Hero\'s tile. Hit: 2 damage. Miss: 1 damage.',
    effect: { type: 'attack', attackBonus: 8, damage: 2, missDamage: 1, target: 'heroes-on-tile' },
    imagePath: 'assets/Encounter_SteamVent.png',
  },
  {
    id: 'sulphurous-cloud',
    name: 'Sulphurous Cloud',
    type: 'event',
    description: 'Attack +8 vs each Hero on the active Hero\'s tile. Hit: 1 damage and Poisoned. Miss: Poisoned.',
    effect: { type: 'attack', attackBonus: 8, damage: 1, target: 'heroes-on-tile', statusEffect: 'poisoned' },
    imagePath: 'assets/Encounter_SulphurousCloud.png',
  },
  {
    id: 'trip-wire',
    name: 'Trip Wire',
    type: 'event',
    description: 'Attack +10 vs the active Hero. Hit: Poisoned. After, draw a Monster Card and place on closest unexplored edge.',
    effect: { type: 'attack', attackBonus: 10, damage: 0, target: 'active-hero', statusEffect: 'poisoned' },
    imagePath: 'assets/Encounter_TripWire.png',
  },
  {
    id: 'volcanic-burst',
    name: 'Volcanic Burst',
    type: 'event',
    description: 'Attack +6 vs each Hero on the active Hero\'s tile. Hit: 3 damage. Miss: 1 damage.',
    effect: { type: 'attack', attackBonus: 6, damage: 3, missDamage: 1, target: 'heroes-on-tile' },
    imagePath: 'assets/Encounter_VolcanicBurst.png',
  },
  {
    id: 'waking-dream',
    name: 'Waking Dream',
    type: 'event',
    description: 'Attack +8 vs the active Hero. Hit: 1 damage and Dazed.',
    effect: { type: 'attack', attackBonus: 8, damage: 1, target: 'active-hero', statusEffect: 'dazed' },
    imagePath: 'assets/Encounter_WakingDream.png',
  },

  // ===== HAZARD CARDS (97-99) =====
  // Hazards place markers and have ongoing effects
  {
    id: 'cave-in-hazard',
    name: 'Cave In',
    type: 'hazard',
    description: 'Place Cave In marker on active Hero\'s tile (if no marker). Attack +9 vs each Hero on tile. Hit: 2 damage. Miss: 1 damage.',
    effect: { type: 'hazard', attackBonus: 9, damage: 2, missDamage: 1, description: 'Place Cave In marker. Attack heroes on tile.' },
    imagePath: 'assets/Token_Hazard_CaveIn.png',
  },
  {
    id: 'pit',
    name: 'Pit',
    type: 'hazard',
    description: 'Place Pit marker on active Hero\'s tile (if no marker). Attack +10 vs each Hero on tile. Hit: 2 damage and hero falls into pit.',
    effect: { type: 'hazard', attackBonus: 10, damage: 2, description: 'Place Pit marker. Attack heroes, hit heroes fall in.' },
    imagePath: 'assets/Token_Hazard_Pit.png',
  },
  {
    id: 'volcanic-vapors',
    name: 'Volcanic Vapors',
    type: 'hazard',
    description: 'A Hero that moves onto this tile or starts his or her turn there is Poisoned.',
    effect: { type: 'hazard', description: 'Heroes on tile become Poisoned.' },
    imagePath: 'assets/Token_Hazard_VolcanicVapors.png',
  },

  // ===== TRAP CARDS (100-103) =====
  // Traps are persistent and trigger each Villain Phase until disabled
  {
    id: 'lava-flow',
    name: 'Lava Flow',
    type: 'trap',
    description: 'Place Lava Flow marker. Each Villain Phase: spread to adjacent tile, heroes on Lava Flow tiles take 1 damage. Disable: Roll 10+',
    effect: { type: 'trap', disableDC: 10, damage: 1, description: 'Spreads each turn, damages heroes on lava tiles.' },
    imagePath: 'assets/Token_Encounter_LavaFlow.png',
  },
  {
    id: 'poisoned-dart-trap',
    name: 'Poisoned Dart Trap',
    type: 'trap',
    description: 'Place marker. Each Villain Phase: Attack +8 vs each Hero on tile. Hit: 2 damage and Poisoned. Miss: 1 damage. Disable: Roll 10+',
    effect: { type: 'trap', disableDC: 10, attackBonus: 8, damage: 2, description: 'Attacks heroes on tile each Villain Phase.' },
    imagePath: 'assets/Token_Encounter_PoisonedDartTrap.png',
  },
  {
    id: 'rolling-boulder',
    name: 'Rolling Boulder',
    type: 'trap',
    description: 'Place marker. Each Villain Phase: move 1 tile toward closest Hero, heroes on that tile take 2 damage. Disable: Roll 10+',
    effect: { type: 'trap', disableDC: 10, damage: 2, description: 'Moves toward heroes, damages those on tile.' },
    imagePath: 'assets/Token_Encounter_RollingBoulder.png',
  },
  {
    id: 'whirling-blades',
    name: 'Whirling Blades',
    type: 'trap',
    description: 'Place marker. Each Villain Phase: move 1 tile toward closest Hero, Attack +8 vs each Hero on tile. Hit: 2 damage. Miss: 1 damage. Disable: Roll 10+',
    effect: { type: 'trap', disableDC: 10, attackBonus: 8, damage: 2, description: 'Moves and attacks heroes each Villain Phase.' },
    imagePath: 'assets/Token_Encounter_WhirlingBlades.png',
  },
];

/**
 * Initial encounter deck (encounter IDs that can be drawn)
 * Contains all 53 encounter cards from Wrath of Ashardalon
 */
export const INITIAL_ENCOUNTER_DECK: string[] = [
  // Curses (8 cards)
  'gap-in-armor',
  'bad-luck',
  'bloodlust',
  'cage',
  'dragon-fear',
  'terrifying-roar',
  'time-leap',
  'wrath-of-enemy',
  // Environments (6 cards)
  'dragons-tribute',
  'hidden-snipers',
  'high-alert',
  'kobold-trappers',
  'surrounded',
  'walls-of-magma',
  // Events with special effects (18 cards)
  'ancient-spirits-blessing',
  'deadly-poison',
  'duergar-outpost',
  'frenzied-leap',
  'hall-of-orcs',
  'hidden-treasure',
  'kobold-warren',
  'lost',
  'occupied-lair',
  'quick-advance',
  'revel-in-destruction',
  'scream-of-sentry',
  'spotted',
  'thief-in-dark',
  'unbearable-heat',
  'unnatural-corruption',
  'wandering-monster',
  'warp-in-time',
  // Events with attack effects (14 cards)
  'blinding-bomb',
  'bulls-eye',
  'concussive-blast',
  'deep-tremor',
  'earthquake',
  'fungal-bloom',
  'lurkers-strike',
  'phalagars-lair',
  'poisoned-arrow',
  'steam-vent',
  'sulphurous-cloud',
  'trip-wire',
  'volcanic-burst',
  'waking-dream',
  // Hazards (3 cards)
  'cave-in-hazard',
  'pit',
  'volcanic-vapors',
  // Traps (4 cards)
  'lava-flow',
  'poisoned-dart-trap',
  'rolling-boulder',
  'whirling-blades',
];
