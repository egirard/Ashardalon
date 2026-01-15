/**
 * Unit tests for status effects system
 */

import { describe, it, expect } from 'vitest';
import {
  type StatusEffect,
  applyStatusEffect,
  removeStatusEffect,
  removeAllStatusEffects,
  processStatusEffectsStartOfTurn,
  hasStatusEffect,
  getStatusDisplayData,
  getModifiedSpeed,
  getModifiedAttackBonus,
  getModifiedAttackBonusWithCurses,
  getModifiedDamage,
  canMove,
  canAttack,
  isDazed,
  attemptPoisonRecovery,
  attemptCurseRemoval,
  getModifiedAC,
} from './statusEffects';

describe('StatusEffects', () => {
  describe('applyStatusEffect', () => {
    it('should add a new status effect', () => {
      const statuses: StatusEffect[] = [];
      const result = applyStatusEffect(statuses, 'poisoned', 'snake-1', 1);
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('poisoned');
      expect(result[0].source).toBe('snake-1');
      expect(result[0].appliedOnTurn).toBe(1);
    });

    it('should add status with duration', () => {
      const statuses: StatusEffect[] = [];
      const result = applyStatusEffect(statuses, 'dazed', 'encounter-1', 5, 2);
      
      expect(result[0].duration).toBe(2);
    });

    it('should add status with data', () => {
      const statuses: StatusEffect[] = [];
      const result = applyStatusEffect(
        statuses, 
        'ongoing-damage', 
        'trap-1', 
        3, 
        undefined,
        { damage: 2 }
      );
      
      expect(result[0].data?.damage).toBe(2);
    });

    it('should replace existing status from same source', () => {
      const statuses: StatusEffect[] = [
        { type: 'poisoned', source: 'snake-1', appliedOnTurn: 1 }
      ];
      const result = applyStatusEffect(statuses, 'poisoned', 'snake-1', 2);
      
      expect(result).toHaveLength(1);
      expect(result[0].appliedOnTurn).toBe(2);
    });

    it('should allow multiple of same status from different sources', () => {
      const statuses: StatusEffect[] = [
        { type: 'poisoned', source: 'snake-1', appliedOnTurn: 1 }
      ];
      const result = applyStatusEffect(statuses, 'poisoned', 'cultist-1', 2);
      
      expect(result).toHaveLength(2);
    });
  });

  describe('removeStatusEffect', () => {
    it('should remove a specific status type', () => {
      const statuses: StatusEffect[] = [
        { type: 'poisoned', source: 'snake-1', appliedOnTurn: 1 },
        { type: 'dazed', source: 'encounter-1', appliedOnTurn: 1 }
      ];
      const result = removeStatusEffect(statuses, 'poisoned');
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('dazed');
    });

    it('should remove all instances of a status type', () => {
      const statuses: StatusEffect[] = [
        { type: 'poisoned', source: 'snake-1', appliedOnTurn: 1 },
        { type: 'poisoned', source: 'cultist-1', appliedOnTurn: 2 }
      ];
      const result = removeStatusEffect(statuses, 'poisoned');
      
      expect(result).toHaveLength(0);
    });

    it('should return unchanged array if status not present', () => {
      const statuses: StatusEffect[] = [
        { type: 'dazed', source: 'encounter-1', appliedOnTurn: 1 }
      ];
      const result = removeStatusEffect(statuses, 'poisoned');
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('dazed');
    });
  });

  describe('removeAllStatusEffects', () => {
    it('should remove all status effects', () => {
      const statuses: StatusEffect[] = [
        { type: 'poisoned', source: 'snake-1', appliedOnTurn: 1 },
        { type: 'dazed', source: 'encounter-1', appliedOnTurn: 1 },
        { type: 'slowed', source: 'trap-1', appliedOnTurn: 2 }
      ];
      const result = removeAllStatusEffects(statuses);
      
      expect(result).toHaveLength(0);
    });
  });

  describe('processStatusEffectsStartOfTurn', () => {
    it('should calculate ongoing damage', () => {
      const statuses: StatusEffect[] = [
        { 
          type: 'ongoing-damage', 
          source: 'fire-trap', 
          appliedOnTurn: 1,
          data: { damage: 2 }
        }
      ];
      const result = processStatusEffectsStartOfTurn(statuses, 2);
      
      expect(result.ongoingDamage).toBe(2);
      expect(result.poisonedDamage).toBe(0);
    });

    it('should sum multiple ongoing damage sources', () => {
      const statuses: StatusEffect[] = [
        { 
          type: 'ongoing-damage', 
          source: 'fire-trap', 
          appliedOnTurn: 1,
          data: { damage: 2 }
        },
        { 
          type: 'ongoing-damage', 
          source: 'poison', 
          appliedOnTurn: 1,
          data: { damage: 1 }
        }
      ];
      const result = processStatusEffectsStartOfTurn(statuses, 2);
      
      expect(result.ongoingDamage).toBe(3);
      expect(result.poisonedDamage).toBe(0);
    });

    it('should calculate poisoned damage', () => {
      const statuses: StatusEffect[] = [
        { type: 'poisoned', source: 'snake-1', appliedOnTurn: 1 }
      ];
      const result = processStatusEffectsStartOfTurn(statuses, 2);
      
      expect(result.poisonedDamage).toBe(1);
      expect(result.ongoingDamage).toBe(0);
    });

    it('should sum multiple poisoned sources', () => {
      const statuses: StatusEffect[] = [
        { type: 'poisoned', source: 'snake-1', appliedOnTurn: 1 },
        { type: 'poisoned', source: 'cultist-1', appliedOnTurn: 2 }
      ];
      const result = processStatusEffectsStartOfTurn(statuses, 3);
      
      expect(result.poisonedDamage).toBe(2);
      expect(result.ongoingDamage).toBe(0);
    });

    it('should remove expired statuses', () => {
      const statuses: StatusEffect[] = [
        { type: 'dazed', source: 'encounter-1', appliedOnTurn: 1, duration: 2 },
        { type: 'slowed', source: 'trap-1', appliedOnTurn: 2, duration: 3 }
      ];
      const result = processStatusEffectsStartOfTurn(statuses, 3);
      
      expect(result.updatedStatuses).toHaveLength(1);
      expect(result.updatedStatuses[0].type).toBe('slowed');
    });

    it('should keep statuses without duration', () => {
      const statuses: StatusEffect[] = [
        { type: 'poisoned', source: 'snake-1', appliedOnTurn: 1 }
      ];
      const result = processStatusEffectsStartOfTurn(statuses, 10);
      
      expect(result.updatedStatuses).toHaveLength(1);
    });

    it('should handle status expiring on exact duration', () => {
      const statuses: StatusEffect[] = [
        { type: 'dazed', source: 'encounter-1', appliedOnTurn: 1, duration: 2 }
      ];
      const result = processStatusEffectsStartOfTurn(statuses, 3);
      
      expect(result.updatedStatuses).toHaveLength(0);
    });

    it('should calculate bloodlust curse damage', () => {
      const statuses: StatusEffect[] = [
        { type: 'curse-bloodlust', source: 'bloodlust', appliedOnTurn: 1 }
      ];
      const result = processStatusEffectsStartOfTurn(statuses, 2);
      
      expect(result.bloodlustDamage).toBe(1);
      expect(result.poisonedDamage).toBe(0);
      expect(result.ongoingDamage).toBe(0);
    });

    it('should sum bloodlust damage with other damage sources', () => {
      const statuses: StatusEffect[] = [
        { type: 'curse-bloodlust', source: 'bloodlust', appliedOnTurn: 1 },
        { type: 'poisoned', source: 'snake-1', appliedOnTurn: 1 },
        { 
          type: 'ongoing-damage', 
          source: 'fire-trap', 
          appliedOnTurn: 1,
          data: { damage: 2 }
        }
      ];
      const result = processStatusEffectsStartOfTurn(statuses, 2);
      
      expect(result.bloodlustDamage).toBe(1);
      expect(result.poisonedDamage).toBe(1);
      expect(result.ongoingDamage).toBe(2);
    });
  });

  describe('hasStatusEffect', () => {
    it('should return true when status is present', () => {
      const statuses: StatusEffect[] = [
        { type: 'poisoned', source: 'snake-1', appliedOnTurn: 1 }
      ];
      
      expect(hasStatusEffect(statuses, 'poisoned')).toBe(true);
    });

    it('should return false when status is not present', () => {
      const statuses: StatusEffect[] = [
        { type: 'poisoned', source: 'snake-1', appliedOnTurn: 1 }
      ];
      
      expect(hasStatusEffect(statuses, 'dazed')).toBe(false);
    });

    it('should return false for empty status array', () => {
      expect(hasStatusEffect([], 'poisoned')).toBe(false);
    });
  });

  describe('getStatusDisplayData', () => {
    it('should return display data for all statuses', () => {
      const statuses: StatusEffect[] = [
        { type: 'poisoned', source: 'snake-1', appliedOnTurn: 1 },
        { type: 'dazed', source: 'encounter-1', appliedOnTurn: 1 }
      ];
      const result = getStatusDisplayData(statuses);
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('poisoned');
      expect(result[0].name).toBe('Poisoned');
      expect(result[0].icon).toBe('🤢');
      expect(result[1].id).toBe('dazed');
      expect(result[1].name).toBe('Dazed');
      expect(result[1].icon).toBe('😵');
    });

    it('should return empty array for no statuses', () => {
      const result = getStatusDisplayData([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('getModifiedSpeed', () => {
    it('should return 0 when immobilized', () => {
      const statuses: StatusEffect[] = [
        { type: 'immobilized', source: 'trap-1', appliedOnTurn: 1 }
      ];
      
      expect(getModifiedSpeed(statuses, 6)).toBe(0);
    });

    it('should return half speed when slowed', () => {
      const statuses: StatusEffect[] = [
        { type: 'slowed', source: 'encounter-1', appliedOnTurn: 1 }
      ];
      
      expect(getModifiedSpeed(statuses, 6)).toBe(3);
      expect(getModifiedSpeed(statuses, 5)).toBe(2);
    });

    it('should return base speed when no movement statuses', () => {
      const statuses: StatusEffect[] = [
        { type: 'poisoned', source: 'snake-1', appliedOnTurn: 1 }
      ];
      
      expect(getModifiedSpeed(statuses, 6)).toBe(6);
    });

    it('immobilized should take precedence over slowed', () => {
      const statuses: StatusEffect[] = [
        { type: 'immobilized', source: 'trap-1', appliedOnTurn: 1 },
        { type: 'slowed', source: 'encounter-1', appliedOnTurn: 1 }
      ];
      
      expect(getModifiedSpeed(statuses, 6)).toBe(0);
    });
  });

  describe('getModifiedAttackBonus', () => {
    it('should reduce attack bonus when blinded', () => {
      const statuses: StatusEffect[] = [
        { type: 'blinded', source: 'encounter-1', appliedOnTurn: 1 }
      ];
      
      expect(getModifiedAttackBonus(statuses, 7)).toBe(5);
    });

    it('should return base attack bonus when no attack statuses', () => {
      const statuses: StatusEffect[] = [
        { type: 'poisoned', source: 'snake-1', appliedOnTurn: 1 }
      ];
      
      expect(getModifiedAttackBonus(statuses, 7)).toBe(7);
    });
  });

  describe('getModifiedDamage', () => {
    it('should reduce damage when weakened', () => {
      const statuses: StatusEffect[] = [
        { type: 'weakened', source: 'encounter-1', appliedOnTurn: 1 }
      ];
      
      expect(getModifiedDamage(statuses, 3)).toBe(2);
    });

    it('should not reduce damage below 0', () => {
      const statuses: StatusEffect[] = [
        { type: 'weakened', source: 'encounter-1', appliedOnTurn: 1 }
      ];
      
      expect(getModifiedDamage(statuses, 0)).toBe(0);
    });

    it('should return base damage when not weakened', () => {
      const statuses: StatusEffect[] = [
        { type: 'poisoned', source: 'snake-1', appliedOnTurn: 1 }
      ];
      
      expect(getModifiedDamage(statuses, 3)).toBe(3);
    });
  });

  describe('canMove', () => {
    it('should return false when immobilized', () => {
      const statuses: StatusEffect[] = [
        { type: 'immobilized', source: 'trap-1', appliedOnTurn: 1 }
      ];
      
      expect(canMove(statuses)).toBe(false);
    });

    it('should return false when stunned', () => {
      const statuses: StatusEffect[] = [
        { type: 'stunned', source: 'encounter-1', appliedOnTurn: 1 }
      ];
      
      expect(canMove(statuses)).toBe(false);
    });

    it('should return true when slowed (can still move)', () => {
      const statuses: StatusEffect[] = [
        { type: 'slowed', source: 'encounter-1', appliedOnTurn: 1 }
      ];
      
      expect(canMove(statuses)).toBe(true);
    });

    it('should return true when no movement-restricting statuses', () => {
      const statuses: StatusEffect[] = [
        { type: 'poisoned', source: 'snake-1', appliedOnTurn: 1 }
      ];
      
      expect(canMove(statuses)).toBe(true);
    });
  });

  describe('canAttack', () => {
    it('should return false when stunned', () => {
      const statuses: StatusEffect[] = [
        { type: 'stunned', source: 'encounter-1', appliedOnTurn: 1 }
      ];
      
      expect(canAttack(statuses)).toBe(false);
    });

    it('should return true when dazed (can still attack)', () => {
      const statuses: StatusEffect[] = [
        { type: 'dazed', source: 'encounter-1', appliedOnTurn: 1 }
      ];
      
      expect(canAttack(statuses)).toBe(true);
    });

    it('should return true when no attack-restricting statuses', () => {
      const statuses: StatusEffect[] = [
        { type: 'poisoned', source: 'snake-1', appliedOnTurn: 1 }
      ];
      
      expect(canAttack(statuses)).toBe(true);
    });
  });

  describe('isDazed', () => {
    it('should return true when dazed', () => {
      const statuses: StatusEffect[] = [
        { type: 'dazed', source: 'encounter-1', appliedOnTurn: 1 }
      ];
      
      expect(isDazed(statuses)).toBe(true);
    });

    it('should return false when not dazed', () => {
      const statuses: StatusEffect[] = [
        { type: 'poisoned', source: 'snake-1', appliedOnTurn: 1 }
      ];
      
      expect(isDazed(statuses)).toBe(false);
    });
  });

  describe('attemptPoisonRecovery', () => {
    it('should remove poisoned status on roll of 10 or higher', () => {
      const statuses: StatusEffect[] = [
        { type: 'poisoned', source: 'snake-1', appliedOnTurn: 1 },
        { type: 'dazed', source: 'encounter-1', appliedOnTurn: 1 }
      ];
      const result = attemptPoisonRecovery(statuses, 10);
      
      expect(result.recovered).toBe(true);
      expect(result.updatedStatuses).toHaveLength(1);
      expect(result.updatedStatuses[0].type).toBe('dazed');
    });

    it('should remove all poisoned statuses on successful recovery', () => {
      const statuses: StatusEffect[] = [
        { type: 'poisoned', source: 'snake-1', appliedOnTurn: 1 },
        { type: 'poisoned', source: 'cultist-1', appliedOnTurn: 2 }
      ];
      const result = attemptPoisonRecovery(statuses, 15);
      
      expect(result.recovered).toBe(true);
      expect(result.updatedStatuses).toHaveLength(0);
    });

    it('should keep poisoned status on roll below 10', () => {
      const statuses: StatusEffect[] = [
        { type: 'poisoned', source: 'snake-1', appliedOnTurn: 1 }
      ];
      const result = attemptPoisonRecovery(statuses, 9);
      
      expect(result.recovered).toBe(false);
      expect(result.updatedStatuses).toHaveLength(1);
      expect(result.updatedStatuses[0].type).toBe('poisoned');
    });

    it('should work with natural 20', () => {
      const statuses: StatusEffect[] = [
        { type: 'poisoned', source: 'snake-1', appliedOnTurn: 1 }
      ];
      const result = attemptPoisonRecovery(statuses, 20);
      
      expect(result.recovered).toBe(true);
      expect(result.updatedStatuses).toHaveLength(0);
    });

    it('should not affect other statuses on failed recovery', () => {
      const statuses: StatusEffect[] = [
        { type: 'poisoned', source: 'snake-1', appliedOnTurn: 1 },
        { type: 'dazed', source: 'encounter-1', appliedOnTurn: 1 }
      ];
      const result = attemptPoisonRecovery(statuses, 5);
      
      expect(result.recovered).toBe(false);
      expect(result.updatedStatuses).toHaveLength(2);
    });
  });

  describe('attemptCurseRemoval', () => {
    it('should remove specific curse on roll of 10 or higher', () => {
      const statuses: StatusEffect[] = [
        { type: 'curse-wrath-of-enemy', source: 'wrath-of-enemy', appliedOnTurn: 1 },
        { type: 'dazed', source: 'encounter-1', appliedOnTurn: 1 }
      ];
      const result = attemptCurseRemoval(statuses, 'curse-wrath-of-enemy', 10);
      
      expect(result.removed).toBe(true);
      expect(result.updatedStatuses).toHaveLength(1);
      expect(result.updatedStatuses[0].type).toBe('dazed');
    });

    it('should keep curse on roll below 10', () => {
      const statuses: StatusEffect[] = [
        { type: 'curse-wrath-of-enemy', source: 'wrath-of-enemy', appliedOnTurn: 1 }
      ];
      const result = attemptCurseRemoval(statuses, 'curse-wrath-of-enemy', 9);
      
      expect(result.removed).toBe(false);
      expect(result.updatedStatuses).toHaveLength(1);
      expect(result.updatedStatuses[0].type).toBe('curse-wrath-of-enemy');
    });

    it('should work with natural 20', () => {
      const statuses: StatusEffect[] = [
        { type: 'curse-wrath-of-enemy', source: 'wrath-of-enemy', appliedOnTurn: 1 }
      ];
      const result = attemptCurseRemoval(statuses, 'curse-wrath-of-enemy', 20);
      
      expect(result.removed).toBe(true);
      expect(result.updatedStatuses).toHaveLength(0);
    });

    it('should not affect other curses or statuses on successful removal', () => {
      const statuses: StatusEffect[] = [
        { type: 'curse-wrath-of-enemy', source: 'wrath-of-enemy', appliedOnTurn: 1 },
        { type: 'curse-dragon-fear', source: 'dragon-fear', appliedOnTurn: 2 },
        { type: 'dazed', source: 'encounter-1', appliedOnTurn: 1 }
      ];
      const result = attemptCurseRemoval(statuses, 'curse-wrath-of-enemy', 15);
      
      expect(result.removed).toBe(true);
      expect(result.updatedStatuses).toHaveLength(2);
      expect(result.updatedStatuses.find(s => s.type === 'curse-dragon-fear')).toBeDefined();
      expect(result.updatedStatuses.find(s => s.type === 'dazed')).toBeDefined();
    });
  });

  describe('getModifiedAttackBonusWithCurses', () => {
    it('should apply -4 penalty for Terrifying Roar curse', () => {
      const statuses: StatusEffect[] = [
        { type: 'curse-terrifying-roar', source: 'terrifying-roar', appliedOnTurn: 1 }
      ];
      
      expect(getModifiedAttackBonusWithCurses(statuses, 7)).toBe(3);
    });

    it('should return base attack bonus when no curse present', () => {
      const statuses: StatusEffect[] = [];
      
      expect(getModifiedAttackBonusWithCurses(statuses, 7)).toBe(7);
    });

    it('should stack with blinded penalty', () => {
      const statuses: StatusEffect[] = [
        { type: 'blinded', source: 'encounter-1', appliedOnTurn: 1 },
        { type: 'curse-terrifying-roar', source: 'terrifying-roar', appliedOnTurn: 1 }
      ];
      
      // Blinded gives -2, Terrifying Roar gives -4, total -6
      expect(getModifiedAttackBonusWithCurses(statuses, 7)).toBe(1);
    });

    it('should not be affected by other curses', () => {
      const statuses: StatusEffect[] = [
        { type: 'curse-gap-in-armor', source: 'gap-in-armor', appliedOnTurn: 1 },
        { type: 'curse-wrath-of-enemy', source: 'wrath-of-enemy', appliedOnTurn: 1 }
      ];
      
      // Other curses don't affect attack bonus
      expect(getModifiedAttackBonusWithCurses(statuses, 7)).toBe(7);
    });

    it('should handle negative attack bonuses', () => {
      const statuses: StatusEffect[] = [
        { type: 'curse-terrifying-roar', source: 'terrifying-roar', appliedOnTurn: 1 }
      ];
      
      // Starting with +2, curse makes it -2
      expect(getModifiedAttackBonusWithCurses(statuses, 2)).toBe(-2);
    });
  });

  describe('getModifiedAC', () => {
    it('should apply -4 penalty for Gap in Armor curse', () => {
      const statuses: StatusEffect[] = [
        { type: 'curse-gap-in-armor', source: 'gap-in-armor', appliedOnTurn: 1 }
      ];
      
      expect(getModifiedAC(statuses, 17)).toBe(13);
    });

    it('should apply -2 penalty for Cage curse', () => {
      const statuses: StatusEffect[] = [
        { type: 'curse-cage', source: 'cage', appliedOnTurn: 1 }
      ];
      
      expect(getModifiedAC(statuses, 17)).toBe(15);
    });

    it('should stack both AC curses', () => {
      const statuses: StatusEffect[] = [
        { type: 'curse-gap-in-armor', source: 'gap-in-armor', appliedOnTurn: 1 },
        { type: 'curse-cage', source: 'cage', appliedOnTurn: 2 }
      ];
      
      // Gap in Armor -4, Cage -2, total -6
      expect(getModifiedAC(statuses, 17)).toBe(11);
    });

    it('should return base AC when no AC-affecting curses present', () => {
      const statuses: StatusEffect[] = [
        { type: 'curse-terrifying-roar', source: 'terrifying-roar', appliedOnTurn: 1 }
      ];
      
      expect(getModifiedAC(statuses, 17)).toBe(17);
    });
  });
});
