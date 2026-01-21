import { describe, it, expect } from 'vitest';
import { MONSTER_TACTICS } from './types';

/**
 * Tests for monster attack effects (status effects and miss damage)
 * These tests verify that the monster tactics configuration supports
 * the features needed for non-interactive monster effects.
 */
describe('Monster Effects', () => {
  describe('Status Effects on Hit', () => {
    it('snake should apply poisoned status on hit', () => {
      const tactics = MONSTER_TACTICS['snake'];
      expect(tactics).toBeDefined();
      expect(tactics.adjacentAttack.statusEffect).toBe('poisoned');
    });

    it('cultist should apply poisoned status on hit', () => {
      const tactics = MONSTER_TACTICS['cultist'];
      expect(tactics).toBeDefined();
      expect(tactics.adjacentAttack.statusEffect).toBe('poisoned');
    });

    it('grell should apply poisoned status on adjacent bite', () => {
      const tactics = MONSTER_TACTICS['grell'];
      expect(tactics).toBeDefined();
      expect(tactics.adjacentAttack.statusEffect).toBe('poisoned');
    });

    it('grell should apply dazed status on tentacle attack', () => {
      const tactics = MONSTER_TACTICS['grell'];
      expect(tactics).toBeDefined();
      expect(tactics.moveAttack?.statusEffect).toBe('dazed');
    });

    it('orc-archer should apply dazed status on punch', () => {
      const tactics = MONSTER_TACTICS['orc-archer'];
      expect(tactics).toBeDefined();
      expect(tactics.adjacentAttack.statusEffect).toBe('dazed');
    });
  });

  describe('Miss Damage', () => {
    it('grell venomous bite should deal 1 damage on miss', () => {
      const tactics = MONSTER_TACTICS['grell'];
      expect(tactics).toBeDefined();
      expect(tactics.adjacentAttack.missDamage).toBe(1);
    });

    it('orc-archer arrow should deal 1 damage on miss', () => {
      const tactics = MONSTER_TACTICS['orc-archer'];
      expect(tactics).toBeDefined();
      expect(tactics.moveAttack?.missDamage).toBe(1);
    });

    it('snake should not have miss damage', () => {
      const tactics = MONSTER_TACTICS['snake'];
      expect(tactics).toBeDefined();
      expect(tactics.adjacentAttack.missDamage).toBeUndefined();
    });

    it('kobold should not have miss damage', () => {
      const tactics = MONSTER_TACTICS['kobold'];
      expect(tactics).toBeDefined();
      expect(tactics.adjacentAttack.missDamage).toBeUndefined();
    });
  });

  describe('Attack Stats', () => {
    it('orc-smasher should have correct attack stats', () => {
      const tactics = MONSTER_TACTICS['orc-smasher'];
      expect(tactics).toBeDefined();
      expect(tactics.type).toBe('move-and-attack');
      expect(tactics.adjacentAttack.name).toBe('Heavy Mace');
      expect(tactics.adjacentAttack.attackBonus).toBe(9);
      expect(tactics.adjacentAttack.damage).toBe(1);
      expect(tactics.moveAttackRange).toBe(1);
    });

    it('grell should have different attacks at different ranges', () => {
      const tactics = MONSTER_TACTICS['grell'];
      expect(tactics).toBeDefined();
      expect(tactics.type).toBe('ranged-attack');
      
      // Adjacent attack: Venomous Bite
      expect(tactics.adjacentAttack.name).toBe('Venomous Bite');
      expect(tactics.adjacentAttack.attackBonus).toBe(7);
      expect(tactics.adjacentAttack.damage).toBe(1);
      
      // Ranged attack: Tentacles
      expect(tactics.moveAttack).toBeDefined();
      expect(tactics.moveAttack?.name).toBe('Tentacles');
      expect(tactics.moveAttack?.attackBonus).toBe(7);
      expect(tactics.moveAttack?.damage).toBe(1);
    });

    it('orc-archer should have different attacks at different ranges', () => {
      const tactics = MONSTER_TACTICS['orc-archer'];
      expect(tactics).toBeDefined();
      expect(tactics.type).toBe('ranged-attack');
      expect(tactics.moveAttackRange).toBe(2); // Can attack within 2 tiles
      
      // Adjacent attack: Punch
      expect(tactics.adjacentAttack.name).toBe('Punch');
      expect(tactics.adjacentAttack.attackBonus).toBe(6);
      expect(tactics.adjacentAttack.damage).toBe(1);
      
      // Ranged attack: Arrow
      expect(tactics.moveAttack).toBeDefined();
      expect(tactics.moveAttack?.name).toBe('Arrow');
      expect(tactics.moveAttack?.attackBonus).toBe(6);
      expect(tactics.moveAttack?.damage).toBe(2);
      expect(tactics.moveAttack?.range).toBe(2);
    });
  });

  describe('Monster Tactic Types', () => {
    it('kobold should use attack-only tactics', () => {
      const tactics = MONSTER_TACTICS['kobold'];
      expect(tactics.type).toBe('attack-only');
    });

    it('snake and cultist should use move-and-attack tactics', () => {
      expect(MONSTER_TACTICS['snake'].type).toBe('move-and-attack');
      expect(MONSTER_TACTICS['cultist'].type).toBe('move-and-attack');
    });

    it('orc-smasher should use move-and-attack tactics', () => {
      expect(MONSTER_TACTICS['orc-smasher'].type).toBe('move-and-attack');
    });

    it('grell and orc-archer should use ranged-attack tactics', () => {
      expect(MONSTER_TACTICS['grell'].type).toBe('ranged-attack');
      expect(MONSTER_TACTICS['orc-archer'].type).toBe('ranged-attack');
    });
  });

  describe('Monster Ranges', () => {
    it('snake and cultist should attack within 1 tile', () => {
      expect(MONSTER_TACTICS['snake'].moveAttackRange).toBe(1);
      expect(MONSTER_TACTICS['cultist'].moveAttackRange).toBe(1);
    });

    it('orc-smasher should attack within 1 tile', () => {
      expect(MONSTER_TACTICS['orc-smasher'].moveAttackRange).toBe(1);
    });

    it('grell should attack within 1 tile', () => {
      expect(MONSTER_TACTICS['grell'].moveAttackRange).toBe(1);
    });

    it('orc-archer should attack within 2 tiles', () => {
      expect(MONSTER_TACTICS['orc-archer'].moveAttackRange).toBe(2);
    });
  });
});
