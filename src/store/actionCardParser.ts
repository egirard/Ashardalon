/**
 * Action card parser for extracting and interpreting action card effects from card text.
 * This module parses the 'rule' field of power cards to determine their mechanical effects.
 */

import type { PowerCard } from './powerCards';

/**
 * Target type for attacks
 */
export type TargetType = 'adjacent' | 'tile' | 'within-tiles';

/**
 * Parsed attack action from a card
 */
export interface ParsedAttack {
  /** Number of times to repeat the attack */
  attackCount: number;
  /** Target type for the attack */
  targetType: TargetType;
  /** Maximum number of targets (e.g., 2 for "attack up to two monsters") */
  maxTargets: number;
  /** Range in tiles (0 = same tile, 1 = within 1 tile, etc.) */
  range: number;
  /** Whether to attack the same target each time (e.g., Reaping Strike) */
  sameTarget: boolean;
}

/**
 * Parsed movement action from a card
 */
export interface ParsedMovement {
  /** Whether movement is required before attack */
  moveFirst: boolean;
  /** Movement distance (in squares, -1 for "your speed") */
  moveDistance: number;
  /** Whether movement is optional ("up to your speed") */
  moveOptional: boolean;
}

/**
 * Hit effect that can be triggered on a successful attack
 */
export interface HitEffect {
  type: 'heal' | 'extra-damage' | 'move-monster' | 'move-hero' | 'conditional-damage';
  amount?: number;
  /** For conditional damage, the condition */
  condition?: string;
}

/**
 * Miss effect that can be triggered on a missed attack
 */
export interface MissEffect {
  type: 'no-flip' | 'effect-still-applies';
}

/**
 * Hit or miss effect that triggers regardless of hit/miss
 */
export interface HitOrMissEffect {
  type: 'heal' | 'move-monster' | 'move-hero' | 'ac-bonus' | 'ally-move';
  amount?: number;
  target?: string;
}

/**
 * Complete parsed action from a power card
 */
export interface ParsedAction {
  /** The attack component (if any) */
  attack?: ParsedAttack;
  /** The movement component (if any) */
  movement?: ParsedMovement;
  /** Effects that trigger on hit */
  hitEffects?: HitEffect[];
  /** Effects that trigger on miss */
  missEffects?: MissEffect[];
  /** Effects that trigger regardless of hit/miss */
  hitOrMissEffects?: HitOrMissEffect[];
  /** Whether the card could not be fully parsed */
  unparsed?: boolean;
  /** Description of what couldn't be parsed */
  unparsedReason?: string;
  /** Original rule text for reference */
  originalRule: string;
}

/**
 * Parse the rule text of a power card to extract its mechanical effects.
 * @param card The power card to parse
 * @returns Parsed action containing attack, movement, and effect information
 */
export function parseActionCard(card: PowerCard): ParsedAction {
  const rule = card.rule.toLowerCase();
  const result: ParsedAction = {
    originalRule: card.rule,
  };

  // Parse attack patterns
  const attackInfo = parseAttackPattern(rule);
  if (attackInfo) {
    result.attack = attackInfo;
  }

  // Parse movement patterns
  const movementInfo = parseMovementPattern(rule);
  if (movementInfo) {
    result.movement = movementInfo;
  }

  // Parse hit effects
  const hitEffects = parseHitEffects(rule);
  if (hitEffects.length > 0) {
    result.hitEffects = hitEffects;
  }

  // Parse miss effects
  const missEffects = parseMissEffects(rule);
  if (missEffects.length > 0) {
    result.missEffects = missEffects;
  }

  // Parse hit or miss effects
  const hitOrMissEffects = parseHitOrMissEffects(rule);
  if (hitOrMissEffects.length > 0) {
    result.hitOrMissEffects = hitOrMissEffects;
  }

  // Check for unparsable elements
  const unparsedCheck = checkForUnparsedElements(rule, result);
  if (unparsedCheck) {
    result.unparsed = true;
    result.unparsedReason = unparsedCheck;
  }

  return result;
}

/**
 * Parse attack patterns from rule text
 */
function parseAttackPattern(rule: string): ParsedAttack | undefined {
  // Default values
  let attackCount = 1;
  let maxTargets = 1;
  let targetType: TargetType = 'adjacent';
  let range = 0;
  let sameTarget = false;

  // Check for "attack X times" patterns
  const attackTimesMatch = rule.match(/attack\s+(?:one\s+)?(?:adjacent\s+)?monster\s+(twice|three times|four times)/);
  if (attackTimesMatch) {
    const timesWord = attackTimesMatch[1];
    attackCount = timesWord === 'twice' ? 2 : timesWord === 'three times' ? 3 : 4;
    sameTarget = true; // "attack one monster twice" implies same target
  }

  // Check for "attack X times" numeric patterns
  const attackNumericMatch = rule.match(/attack\s+(two|three|four)\s+times/);
  if (attackNumericMatch) {
    const numWord = attackNumericMatch[1];
    attackCount = numWord === 'two' ? 2 : numWord === 'three' ? 3 : 4;
  }

  // Check for multi-target patterns
  const multiTargetMatch = rule.match(/attack\s+(?:up\s+to\s+)?(one\s+or\s+two|two|three|four)\s+(?:adjacent\s+)?monsters?/);
  if (multiTargetMatch) {
    const targetWord = multiTargetMatch[1];
    if (targetWord === 'one or two' || targetWord === 'two') {
      maxTargets = 2;
    } else if (targetWord === 'three') {
      maxTargets = 3;
    } else if (targetWord === 'four') {
      maxTargets = 4;
    }
    sameTarget = false;
  }

  // Check for "attack up to two monsters" pattern
  const upToMatch = rule.match(/attack\s+up\s+to\s+(two|three|four)\s+monsters?/);
  if (upToMatch) {
    const numWord = upToMatch[1];
    maxTargets = numWord === 'two' ? 2 : numWord === 'three' ? 3 : 4;
    sameTarget = false;
  }

  // Check for "attack each monster" patterns
  if (rule.includes('attack each monster')) {
    maxTargets = -1; // All monsters
    sameTarget = false;
  }

  // Check for range patterns
  if (rule.includes('within 1 tile')) {
    targetType = 'within-tiles';
    range = 1;
  } else if (rule.includes('within 2 tiles')) {
    targetType = 'within-tiles';
    range = 2;
  } else if (rule.includes('within 3 tiles')) {
    targetType = 'within-tiles';
    range = 3;
  } else if (rule.includes('on your tile') || rule.includes('on that tile')) {
    targetType = 'tile';
    range = 0;
  }

  // Check if rule mentions attack at all
  if (!rule.includes('attack')) {
    return undefined;
  }

  return {
    attackCount,
    maxTargets,
    targetType,
    range,
    sameTarget,
  };
}

/**
 * Parse movement patterns from rule text
 */
function parseMovementPattern(rule: string): ParsedMovement | undefined {
  // Check for "move up to your speed, then attack" pattern
  if (rule.includes('move up to your speed, then attack') || 
      rule.includes('move up to your speed. then attack')) {
    return {
      moveFirst: true,
      moveDistance: -1, // -1 indicates "your speed"
      moveOptional: true,
    };
  }

  // Check for "move your speed" patterns without "up to"
  if (rule.includes('move your speed') && 
      (rule.indexOf('move your speed') < rule.indexOf('attack') || !rule.includes('attack'))) {
    return {
      moveFirst: true,
      moveDistance: -1,
      moveOptional: false,
    };
  }

  // Check for "after the attack, move your speed" pattern (move after, not before)
  if (rule.includes('after the attack') && rule.includes('move')) {
    // This is a move-after pattern, not move-first
    return undefined;
  }

  return undefined;
}

/**
 * Parse hit effects from rule text
 */
function parseHitEffects(rule: string): HitEffect[] {
  const effects: HitEffect[] = [];

  // Check for healing on hit
  const healMatch = rule.match(/if\s+you\s+hit[^.]*regain\s+(\d+)\s+hit\s+points?/);
  if (healMatch) {
    effects.push({
      type: 'heal',
      amount: parseInt(healMatch[1], 10),
    });
  }

  // Check for extra damage on hit
  const extraDamageMatch = rule.match(/if\s+you\s+hit[^.]*deal\s+\+(\d+)\s+damage/);
  if (extraDamageMatch) {
    effects.push({
      type: 'extra-damage',
      amount: parseInt(extraDamageMatch[1], 10),
    });
  }

  // Check for conditional extra damage
  const conditionalDamageMatch = rule.match(/if\s+you\s+hit\s+and\s+([^,]+),\s+deal\s+\+(\d+)\s+damage/);
  if (conditionalDamageMatch) {
    effects.push({
      type: 'conditional-damage',
      condition: conditionalDamageMatch[1],
      amount: parseInt(conditionalDamageMatch[2], 10),
    });
  }

  // Check for monster movement on hit
  if (rule.includes('if you hit') && rule.includes('move the monster')) {
    effects.push({
      type: 'move-monster',
    });
  }

  return effects;
}

/**
 * Parse miss effects from rule text
 */
function parseMissEffects(rule: string): MissEffect[] {
  const effects: MissEffect[] = [];

  // Check for "do not flip this card over" on miss
  if (rule.includes('if you miss') && rule.includes('do not flip')) {
    effects.push({ type: 'no-flip' });
  }

  // Also check for the pattern where missing doesn't flip the card
  if (rule.includes('if the attack misses, do not flip')) {
    effects.push({ type: 'no-flip' });
  }

  return effects;
}

/**
 * Parse hit or miss effects from rule text
 */
function parseHitOrMissEffects(rule: string): HitOrMissEffect[] {
  const effects: HitOrMissEffect[] = [];

  // Check for "hit or miss" patterns
  // Capture everything from "Hit or Miss:" until the end of the paragraph or until a double newline
  const hitOrMissMatch = rule.match(/hit\s+or\s+miss[:\s]*((?:[^\n]|\n(?!\n))+)/s);
  if (hitOrMissMatch) {
    const effectText = hitOrMissMatch[1];
    
    // Check for healing
    const healMatch = effectText.match(/regain\s+(\d+)\s+hit\s+points?/);
    if (healMatch) {
      effects.push({
        type: 'heal',
        amount: parseInt(healMatch[1], 10),
      });
    }

    // Check for AC bonus
    const acBonusMatch = effectText.match(/gains?\s+a?\s*\+(\d+)\s+bonus\s+to\s+ac/);
    if (acBonusMatch) {
      effects.push({
        type: 'ac-bonus',
        amount: parseInt(acBonusMatch[1], 10),
      });
    }

    // Check for ally movement
    if (effectText.includes('hero') && effectText.includes('move')) {
      const moveMatch = effectText.match(/moves?\s+(\d+)\s+squares?/);
      effects.push({
        type: 'ally-move',
        amount: moveMatch ? parseInt(moveMatch[1], 10) : undefined,
      });
    }

    // Check for monster placement/movement
    if (effectText.includes('place') && effectText.includes('monster')) {
      effects.push({
        type: 'move-monster',
      });
    }
  }

  return effects;
}

/**
 * Check for complex elements that couldn't be fully parsed
 */
function checkForUnparsedElements(rule: string, parsed: ParsedAction): string | undefined {
  const complexPatterns = [
    { pattern: /place\s+\d+\s+\w+\s+tokens?/, reason: 'Token placement mechanics' },
    { pattern: /instead\s+of\s+moving/, reason: 'Movement substitution mechanics' },
    { pattern: /during\s+your\s+exploration\s+phase/, reason: 'Exploration phase effects' },
    { pattern: /until\s+the\s+start\s+of/, reason: 'Duration-based effects' },
    { pattern: /pass\s+that\s+monster's\s+card/, reason: 'Monster control transfer' },
    { pattern: /swap\s+positions/, reason: 'Position swapping mechanics' },
    { pattern: /place\s+your\s+hero/, reason: 'Hero teleportation/placement' },
    { pattern: /use\s+an?\s+at-will\s+power\s+immediately/, reason: 'Chained power usage' },
    { pattern: /condition\s+on\s+that\s+hero/, reason: 'Condition removal mechanics' },
    { pattern: /disable\s+check/, reason: 'Trap disable mechanics' },
    { pattern: /reroll/, reason: 'Reroll mechanics' },
    { pattern: /cancel\s+the\s+encounter/, reason: 'Encounter cancellation' },
  ];

  for (const { pattern, reason } of complexPatterns) {
    if (pattern.test(rule)) {
      // Only flag if we don't have a basic attack parsed (utility cards are expected to be complex)
      if (!parsed.attack || parsed.attack.attackCount === 1 && parsed.attack.maxTargets === 1) {
        continue; // Skip if this is a simple or utility card
      }
      return reason;
    }
  }

  return undefined;
}

/**
 * Determine if a card requires special multi-attack handling
 */
export function requiresMultiAttack(parsed: ParsedAction): boolean {
  if (!parsed.attack) return false;
  return parsed.attack.attackCount > 1 || parsed.attack.maxTargets > 1 || parsed.attack.maxTargets === -1;
}

/**
 * Determine if a card requires movement before attack
 */
export function requiresMovementFirst(parsed: ParsedAction): boolean {
  return parsed.movement?.moveFirst === true;
}

/**
 * Get a user-friendly description of the parsed action
 */
export function getActionDescription(parsed: ParsedAction): string {
  const parts: string[] = [];

  if (parsed.movement?.moveFirst) {
    if (parsed.movement.moveOptional) {
      parts.push('Move up to your speed');
    } else {
      parts.push('Move your speed');
    }
  }

  if (parsed.attack) {
    const { attackCount, maxTargets, targetType, range, sameTarget } = parsed.attack;
    
    let attackDesc = '';
    
    if (attackCount > 1 && sameTarget) {
      attackDesc = `Attack ${attackCount === 2 ? 'twice' : attackCount === 3 ? 'three times' : 'four times'}`;
    } else if (maxTargets === -1) {
      attackDesc = 'Attack all monsters';
    } else if (maxTargets > 1) {
      attackDesc = `Attack up to ${maxTargets} monsters`;
    } else {
      attackDesc = 'Attack one monster';
    }

    if (targetType === 'adjacent') {
      attackDesc += ' (adjacent)';
    } else if (targetType === 'within-tiles') {
      attackDesc += ` (within ${range} tile${range > 1 ? 's' : ''})`;
    } else if (targetType === 'tile') {
      attackDesc += ' (on tile)';
    }

    parts.push(attackDesc);
  }

  if (parsed.hitEffects && parsed.hitEffects.length > 0) {
    for (const effect of parsed.hitEffects) {
      if (effect.type === 'heal') {
        parts.push(`On hit: Regain ${effect.amount} HP`);
      } else if (effect.type === 'extra-damage') {
        parts.push(`On hit: +${effect.amount} damage`);
      }
    }
  }

  if (parsed.hitOrMissEffects && parsed.hitOrMissEffects.length > 0) {
    for (const effect of parsed.hitOrMissEffects) {
      if (effect.type === 'heal') {
        parts.push(`Hit or miss: Regain ${effect.amount} HP`);
      } else if (effect.type === 'ac-bonus') {
        parts.push(`Hit or miss: +${effect.amount} AC`);
      }
    }
  }

  return parts.join(', then ');
}

/**
 * List of cards that are flagged as unparsed/complex
 */
export interface UnparsedCardInfo {
  id: number;
  name: string;
  reason: string;
  rule: string;
}

/**
 * Get a list of all cards that couldn't be fully parsed
 */
export function getUnparsedCards(cards: PowerCard[]): UnparsedCardInfo[] {
  const unparsedCards: UnparsedCardInfo[] = [];
  
  for (const card of cards) {
    // Skip utility cards without attack bonus - they're expected to be special
    if (card.type === 'utility' && card.attackBonus === undefined) {
      continue;
    }
    
    const parsed = parseActionCard(card);
    
    if (parsed.unparsed) {
      unparsedCards.push({
        id: card.id,
        name: card.name,
        reason: parsed.unparsedReason || 'Complex mechanics',
        rule: card.rule,
      });
    }
  }
  
  return unparsedCards;
}
