import { describe, it, expect } from 'vitest';
import {
  parseActionCard,
  requiresMultiAttack,
  requiresMovementFirst,
  getActionDescription,
  getUnparsedCards,
  type ParsedAction,
} from './actionCardParser';
import { POWER_CARDS, getPowerCardById } from './powerCards';

describe('actionCardParser', () => {
  describe('parseActionCard', () => {
    describe('Reaping Strike (attack twice)', () => {
      it('should parse Reaping Strike as attacking twice on the same target', () => {
        const card = getPowerCardById(13); // Reaping Strike
        expect(card).toBeDefined();
        
        const parsed = parseActionCard(card!);
        
        expect(parsed.attack).toBeDefined();
        expect(parsed.attack?.attackCount).toBe(2);
        expect(parsed.attack?.sameTarget).toBe(true);
        expect(parsed.attack?.targetType).toBe('adjacent');
      });

      it('should identify Reaping Strike as requiring multi-attack handling', () => {
        const card = getPowerCardById(13);
        const parsed = parseActionCard(card!);
        
        expect(requiresMultiAttack(parsed)).toBe(true);
      });
    });

    describe('Charge (move then attack)', () => {
      it('should parse Charge as requiring movement before attack', () => {
        const card = getPowerCardById(12); // Charge
        expect(card).toBeDefined();
        
        const parsed = parseActionCard(card!);
        
        expect(parsed.movement).toBeDefined();
        expect(parsed.movement?.moveFirst).toBe(true);
        expect(parsed.movement?.moveOptional).toBe(true);
        expect(parsed.movement?.moveDistance).toBe(-1); // "your speed"
        
        expect(parsed.attack).toBeDefined();
        expect(parsed.attack?.targetType).toBe('adjacent');
      });

      it('should identify Charge as requiring movement first', () => {
        const card = getPowerCardById(12);
        const parsed = parseActionCard(card!);
        
        expect(requiresMovementFirst(parsed)).toBe(true);
      });
    });

    describe('Tornado Strike (attack four times)', () => {
      it('should parse Tornado Strike as attacking four times with multiple targets', () => {
        const card = getPowerCardById(37); // Tornado Strike
        expect(card).toBeDefined();
        
        const parsed = parseActionCard(card!);
        
        expect(parsed.attack).toBeDefined();
        expect(parsed.attack?.attackCount).toBe(4);
        expect(parsed.attack?.targetType).toBe('tile');
      });
    });

    describe('Arcing Strike (attack one or two)', () => {
      it('should parse Arcing Strike as allowing up to 2 targets', () => {
        const card = getPowerCardById(25); // Arcing Strike
        expect(card).toBeDefined();
        
        const parsed = parseActionCard(card!);
        
        expect(parsed.attack).toBeDefined();
        expect(parsed.attack?.maxTargets).toBe(2);
        expect(parsed.attack?.targetType).toBe('adjacent');
      });
    });

    describe('Arc Lightning (attack up to two within range)', () => {
      it('should parse Arc Lightning as ranged multi-target', () => {
        const card = getPowerCardById(42); // Arc Lightning
        expect(card).toBeDefined();
        
        const parsed = parseActionCard(card!);
        
        expect(parsed.attack).toBeDefined();
        expect(parsed.attack?.maxTargets).toBe(2);
        expect(parsed.attack?.range).toBe(1);
      });
    });

    describe('Comeback Strike (heal on hit, no flip on miss)', () => {
      it('should parse hit effects correctly', () => {
        const card = getPowerCardById(15); // Comeback Strike
        expect(card).toBeDefined();
        
        const parsed = parseActionCard(card!);
        
        expect(parsed.hitEffects).toBeDefined();
        expect(parsed.hitEffects?.length).toBeGreaterThan(0);
        expect(parsed.hitEffects?.[0].type).toBe('heal');
        expect(parsed.hitEffects?.[0].amount).toBe(2);
      });

      it('should parse miss effects correctly', () => {
        const card = getPowerCardById(15);
        const parsed = parseActionCard(card!);
        
        expect(parsed.missEffects).toBeDefined();
        expect(parsed.missEffects?.length).toBeGreaterThan(0);
        expect(parsed.missEffects?.[0].type).toBe('no-flip');
      });
    });

    describe('Righteous Smite (hit or miss effect)', () => {
      it('should parse hit or miss effects correctly', () => {
        const card = getPowerCardById(27); // Righteous Smite
        expect(card).toBeDefined();
        
        const parsed = parseActionCard(card!);
        
        expect(parsed.hitOrMissEffects).toBeDefined();
        expect(parsed.hitOrMissEffects?.length).toBeGreaterThan(0);
        expect(parsed.hitOrMissEffects?.[0].type).toBe('heal');
      });
    });

    describe('Sure Strike (simple attack)', () => {
      it('should parse a simple attack correctly', () => {
        const card = getPowerCardById(14); // Sure Strike
        expect(card).toBeDefined();
        
        const parsed = parseActionCard(card!);
        
        expect(parsed.attack).toBeDefined();
        expect(parsed.attack?.attackCount).toBe(1);
        expect(parsed.attack?.maxTargets).toBe(1);
        expect(parsed.attack?.targetType).toBe('adjacent');
        expect(requiresMultiAttack(parsed)).toBe(false);
        expect(requiresMovementFirst(parsed)).toBe(false);
      });
    });

    describe('Divine Challenge (placement then adjacent attack)', () => {
      it('should parse as adjacent attack despite "within 1 tile" in placement action', () => {
        const card = getPowerCardById(22); // Divine Challenge
        expect(card).toBeDefined();
        // Rule: "Choose one Monster within 1 tile of you. Place that Monster adjacent to your Hero.\nAttack one adjacent Monster."
        
        const parsed = parseActionCard(card!);
        
        expect(parsed.attack).toBeDefined();
        expect(parsed.attack?.targetType).toBe('adjacent');
        expect(parsed.attack?.range).toBe(0);
        expect(parsed.attack?.attackCount).toBe(1);
        expect(parsed.attack?.maxTargets).toBe(1);
      });
    });

    describe('Ray of Frost (ranged attack)', () => {
      it('should parse range correctly', () => {
        const card = getPowerCardById(44); // Ray of Frost
        expect(card).toBeDefined();
        
        const parsed = parseActionCard(card!);
        
        expect(parsed.attack).toBeDefined();
        expect(parsed.attack?.range).toBe(2);
      });
    });

    describe('Shock Sphere (attack all on tile)', () => {
      it('should parse attack all monsters on tile', () => {
        const card = getPowerCardById(46); // Shock Sphere
        expect(card).toBeDefined();
        
        const parsed = parseActionCard(card!);
        
        expect(parsed.attack).toBeDefined();
        expect(parsed.attack?.maxTargets).toBe(-1); // All monsters
      });
    });

    describe('Taunting Advance (move then attack)', () => {
      it('should parse movement before attack pattern', () => {
        const card = getPowerCardById(17); // Taunting Advance
        expect(card).toBeDefined();
        
        const parsed = parseActionCard(card!);
        
        expect(parsed.movement).toBeDefined();
        expect(parsed.movement?.moveFirst).toBe(true);
        expect(requiresMovementFirst(parsed)).toBe(true);
      });
    });
  });

  describe('getActionDescription', () => {
    it('should generate description for Reaping Strike', () => {
      const card = getPowerCardById(13);
      const parsed = parseActionCard(card!);
      
      const description = getActionDescription(parsed);
      
      expect(description).toContain('Attack twice');
      expect(description).toContain('adjacent');
    });

    it('should generate description for Charge', () => {
      const card = getPowerCardById(12);
      const parsed = parseActionCard(card!);
      
      const description = getActionDescription(parsed);
      
      expect(description).toContain('Move');
      expect(description).toContain('speed');
    });

    it('should generate description for Arcing Strike', () => {
      const card = getPowerCardById(25);
      const parsed = parseActionCard(card!);
      
      const description = getActionDescription(parsed);
      
      expect(description).toContain('up to 2');
    });
  });

  describe('getUnparsedCards', () => {
    it('should return a list of cards with complex mechanics', () => {
      const unparsedCards = getUnparsedCards(POWER_CARDS);
      
      // Should have some unparsed cards but not all
      expect(unparsedCards.length).toBeGreaterThan(0);
      expect(unparsedCards.length).toBeLessThan(POWER_CARDS.length);
    });

    it('should include reason for each unparsed card', () => {
      const unparsedCards = getUnparsedCards(POWER_CARDS);
      
      for (const card of unparsedCards) {
        expect(card.reason).toBeDefined();
        expect(card.reason.length).toBeGreaterThan(0);
      }
    });
  });

  describe('requiresMultiAttack', () => {
    it('should return false for simple attacks', () => {
      const simpleAttack: ParsedAction = {
        attack: {
          attackCount: 1,
          maxTargets: 1,
          targetType: 'adjacent',
          range: 0,
          sameTarget: false,
        },
        originalRule: 'Attack one adjacent Monster.',
      };
      
      expect(requiresMultiAttack(simpleAttack)).toBe(false);
    });

    it('should return true for multi-attack patterns', () => {
      const multiAttack: ParsedAction = {
        attack: {
          attackCount: 2,
          maxTargets: 1,
          targetType: 'adjacent',
          range: 0,
          sameTarget: true,
        },
        originalRule: 'Attack one adjacent Monster twice.',
      };
      
      expect(requiresMultiAttack(multiAttack)).toBe(true);
    });

    it('should return true for multi-target patterns', () => {
      const multiTarget: ParsedAction = {
        attack: {
          attackCount: 1,
          maxTargets: 2,
          targetType: 'adjacent',
          range: 0,
          sameTarget: false,
        },
        originalRule: 'Attack one or two adjacent Monsters.',
      };
      
      expect(requiresMultiAttack(multiTarget)).toBe(true);
    });

    it('should return false when no attack is present', () => {
      const noAttack: ParsedAction = {
        originalRule: 'You regain 2 Hit Points.',
      };
      
      expect(requiresMultiAttack(noAttack)).toBe(false);
    });
  });

  describe('requiresMovementFirst', () => {
    it('should return true for move-then-attack patterns', () => {
      const moveFirst: ParsedAction = {
        movement: {
          moveFirst: true,
          moveDistance: -1,
          moveOptional: true,
        },
        attack: {
          attackCount: 1,
          maxTargets: 1,
          targetType: 'adjacent',
          range: 0,
          sameTarget: false,
        },
        originalRule: 'Move up to your speed, then attack one adjacent Monster.',
      };
      
      expect(requiresMovementFirst(moveFirst)).toBe(true);
    });

    it('should return false when no movement is present', () => {
      const noMovement: ParsedAction = {
        attack: {
          attackCount: 1,
          maxTargets: 1,
          targetType: 'adjacent',
          range: 0,
          sameTarget: false,
        },
        originalRule: 'Attack one adjacent Monster.',
      };
      
      expect(requiresMovementFirst(noMovement)).toBe(false);
    });
  });
});
