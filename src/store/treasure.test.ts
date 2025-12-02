import { describe, it, expect } from 'vitest';
import {
  TREASURE_CARDS,
  INITIAL_TREASURE_DECK,
  initializeTreasureDeck,
  drawTreasure,
  discardTreasure,
  getTreasureById,
  createHeroInventory,
  addTreasureToInventory,
  flipTreasureInInventory,
  removeTreasureFromInventory,
  getAttackBonusFromItems,
  getAcBonusFromItems,
  getSpeedBonusFromItems,
  getDamageBonusFromItems,
  type TreasureDeck,
  type HeroInventory,
} from './treasure';

describe('treasure', () => {
  describe('TREASURE_CARDS', () => {
    it('should have treasure cards defined', () => {
      expect(TREASURE_CARDS.length).toBeGreaterThan(0);
    });

    it('should have unique IDs for all cards', () => {
      const ids = TREASURE_CARDS.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have +1 Magic Sword as first card', () => {
      const card = getTreasureById(134);
      expect(card).toBeDefined();
      expect(card?.name).toBe('+1 Magic Sword');
      expect(card?.effect.type).toBe('attack-bonus');
      expect(card?.effect.value).toBe(1);
    });

    it('should have Potion of Healing', () => {
      const card = getTreasureById(150);
      expect(card).toBeDefined();
      expect(card?.name).toBe('Potion of Healing');
      expect(card?.effect.type).toBe('healing');
      expect(card?.effect.value).toBe(2);
      expect(card?.discardAfterUse).toBe(true);
    });
  });

  describe('initializeTreasureDeck', () => {
    it('should create a shuffled deck with all treasure cards', () => {
      const deck = initializeTreasureDeck();
      expect(deck.drawPile.length).toBe(INITIAL_TREASURE_DECK.length);
      expect(deck.discardPile).toHaveLength(0);
    });

    it('should use provided randomFn for shuffling', () => {
      // Fixed random function for deterministic results
      let counter = 0;
      const fixedRandom = () => {
        counter++;
        return 0.5;
      };
      
      const deck = initializeTreasureDeck(fixedRandom);
      expect(deck.drawPile.length).toBe(INITIAL_TREASURE_DECK.length);
      expect(counter).toBeGreaterThan(0); // Random was called
    });
  });

  describe('drawTreasure', () => {
    it('should draw top card from deck', () => {
      const deck: TreasureDeck = {
        drawPile: [134, 135, 136],
        discardPile: [],
      };
      
      const result = drawTreasure(deck);
      expect(result.treasure).toBe(134);
      expect(result.deck.drawPile).toEqual([135, 136]);
      expect(result.deck.discardPile).toEqual([]);
    });

    it('should shuffle discard pile when draw pile is empty', () => {
      const deck: TreasureDeck = {
        drawPile: [],
        discardPile: [134, 135, 136],
      };
      
      // Use fixed random to get predictable shuffle
      const result = drawTreasure(deck, () => 0);
      expect(result.treasure).toBeDefined();
      // After shuffle, draw pile should have the remaining cards
      expect(result.deck.drawPile.length).toBe(2);
      expect(result.deck.discardPile).toHaveLength(0);
    });

    it('should return null when both piles are empty', () => {
      const deck: TreasureDeck = {
        drawPile: [],
        discardPile: [],
      };
      
      const result = drawTreasure(deck);
      expect(result.treasure).toBeNull();
      expect(result.deck.drawPile).toHaveLength(0);
      expect(result.deck.discardPile).toHaveLength(0);
    });
  });

  describe('discardTreasure', () => {
    it('should add card to discard pile', () => {
      const deck: TreasureDeck = {
        drawPile: [135, 136],
        discardPile: [],
      };
      
      const result = discardTreasure(deck, 134);
      expect(result.drawPile).toEqual([135, 136]);
      expect(result.discardPile).toEqual([134]);
    });

    it('should append to existing discard pile', () => {
      const deck: TreasureDeck = {
        drawPile: [],
        discardPile: [134],
      };
      
      const result = discardTreasure(deck, 135);
      expect(result.discardPile).toEqual([134, 135]);
    });
  });

  describe('getTreasureById', () => {
    it('should return treasure card by ID', () => {
      const card = getTreasureById(136);
      expect(card).toBeDefined();
      expect(card?.name).toBe('Amulet of Protection');
    });

    it('should return undefined for invalid ID', () => {
      const card = getTreasureById(9999);
      expect(card).toBeUndefined();
    });
  });

  describe('HeroInventory', () => {
    describe('createHeroInventory', () => {
      it('should create empty inventory for hero', () => {
        const inventory = createHeroInventory('quinn');
        expect(inventory.heroId).toBe('quinn');
        expect(inventory.items).toHaveLength(0);
      });
    });

    describe('addTreasureToInventory', () => {
      it('should add treasure to inventory', () => {
        const inventory = createHeroInventory('quinn');
        const updated = addTreasureToInventory(inventory, 134);
        
        expect(updated.items).toHaveLength(1);
        expect(updated.items[0].cardId).toBe(134);
        expect(updated.items[0].isFlipped).toBe(false);
      });

      it('should allow multiple items', () => {
        let inventory = createHeroInventory('quinn');
        inventory = addTreasureToInventory(inventory, 134);
        inventory = addTreasureToInventory(inventory, 136);
        
        expect(inventory.items).toHaveLength(2);
        expect(inventory.items[0].cardId).toBe(134);
        expect(inventory.items[1].cardId).toBe(136);
      });
    });

    describe('flipTreasureInInventory', () => {
      it('should flip a treasure card', () => {
        let inventory = createHeroInventory('quinn');
        inventory = addTreasureToInventory(inventory, 134);
        inventory = flipTreasureInInventory(inventory, 134);
        
        expect(inventory.items[0].isFlipped).toBe(true);
      });

      it('should only flip the specified card', () => {
        let inventory = createHeroInventory('quinn');
        inventory = addTreasureToInventory(inventory, 134);
        inventory = addTreasureToInventory(inventory, 136);
        inventory = flipTreasureInInventory(inventory, 134);
        
        expect(inventory.items[0].isFlipped).toBe(true);
        expect(inventory.items[1].isFlipped).toBe(false);
      });
    });

    describe('removeTreasureFromInventory', () => {
      it('should remove a treasure card', () => {
        let inventory = createHeroInventory('quinn');
        inventory = addTreasureToInventory(inventory, 134);
        inventory = addTreasureToInventory(inventory, 136);
        inventory = removeTreasureFromInventory(inventory, 134);
        
        expect(inventory.items).toHaveLength(1);
        expect(inventory.items[0].cardId).toBe(136);
      });

      it('should do nothing if card not found', () => {
        let inventory = createHeroInventory('quinn');
        inventory = addTreasureToInventory(inventory, 134);
        const result = removeTreasureFromInventory(inventory, 999);
        
        expect(result.items).toHaveLength(1);
      });
    });
  });

  describe('item bonuses', () => {
    describe('getAttackBonusFromItems', () => {
      it('should return 0 for empty inventory', () => {
        const inventory = createHeroInventory('quinn');
        expect(getAttackBonusFromItems(inventory)).toBe(0);
      });

      it('should sum attack bonuses from equipped items', () => {
        let inventory = createHeroInventory('quinn');
        // +1 Magic Sword (+1 attack)
        inventory = addTreasureToInventory(inventory, 134);
        // +2 Magic Sword (+2 attack)
        inventory = addTreasureToInventory(inventory, 135);
        
        expect(getAttackBonusFromItems(inventory)).toBe(3);
      });

      it('should not include flipped items', () => {
        let inventory = createHeroInventory('quinn');
        inventory = addTreasureToInventory(inventory, 134);
        inventory = flipTreasureInInventory(inventory, 134);
        
        expect(getAttackBonusFromItems(inventory)).toBe(0);
      });

      it('should not include non-attack-bonus items', () => {
        let inventory = createHeroInventory('quinn');
        // Amulet of Protection (+1 AC, not attack)
        inventory = addTreasureToInventory(inventory, 136);
        
        expect(getAttackBonusFromItems(inventory)).toBe(0);
      });
    });

    describe('getAcBonusFromItems', () => {
      it('should return 0 for empty inventory', () => {
        const inventory = createHeroInventory('quinn');
        expect(getAcBonusFromItems(inventory)).toBe(0);
      });

      it('should sum AC bonuses from equipped items', () => {
        let inventory = createHeroInventory('quinn');
        // Amulet of Protection (+1 AC)
        inventory = addTreasureToInventory(inventory, 136);
        // Shield of Protection (+1 AC)
        inventory = addTreasureToInventory(inventory, 159);
        
        expect(getAcBonusFromItems(inventory)).toBe(2);
      });

      it('should not include flipped items', () => {
        let inventory = createHeroInventory('quinn');
        inventory = addTreasureToInventory(inventory, 136);
        inventory = flipTreasureInInventory(inventory, 136);
        
        expect(getAcBonusFromItems(inventory)).toBe(0);
      });
    });

    describe('getSpeedBonusFromItems', () => {
      it('should return speed bonus from Boots of Striding', () => {
        let inventory = createHeroInventory('quinn');
        // Boots of Striding (+1 Speed)
        inventory = addTreasureToInventory(inventory, 138);
        
        expect(getSpeedBonusFromItems(inventory)).toBe(1);
      });

      it('should not include flipped items', () => {
        let inventory = createHeroInventory('quinn');
        inventory = addTreasureToInventory(inventory, 138);
        inventory = flipTreasureInInventory(inventory, 138);
        
        expect(getSpeedBonusFromItems(inventory)).toBe(0);
      });
    });

    describe('getDamageBonusFromItems', () => {
      it('should return damage bonus from Gauntlets of Ogre Power', () => {
        let inventory = createHeroInventory('quinn');
        // Gauntlets of Ogre Power (+1 damage)
        inventory = addTreasureToInventory(inventory, 146);
        
        expect(getDamageBonusFromItems(inventory)).toBe(1);
      });

      it('should not include flipped items', () => {
        let inventory = createHeroInventory('quinn');
        inventory = addTreasureToInventory(inventory, 146);
        inventory = flipTreasureInInventory(inventory, 146);
        
        expect(getDamageBonusFromItems(inventory)).toBe(0);
      });
    });

    describe('combined bonuses', () => {
      it('should calculate multiple bonuses from different items', () => {
        let inventory = createHeroInventory('quinn');
        // +1 Magic Sword (+1 attack)
        inventory = addTreasureToInventory(inventory, 134);
        // Amulet of Protection (+1 AC)
        inventory = addTreasureToInventory(inventory, 136);
        // Boots of Striding (+1 Speed)
        inventory = addTreasureToInventory(inventory, 138);
        // Gauntlets of Ogre Power (+1 damage)
        inventory = addTreasureToInventory(inventory, 146);
        
        expect(getAttackBonusFromItems(inventory)).toBe(1);
        expect(getAcBonusFromItems(inventory)).toBe(1);
        expect(getSpeedBonusFromItems(inventory)).toBe(1);
        expect(getDamageBonusFromItems(inventory)).toBe(1);
      });

      it('should stack multiple items of the same type', () => {
        let inventory = createHeroInventory('quinn');
        // +1 Magic Sword (+1 attack)
        inventory = addTreasureToInventory(inventory, 134);
        // +2 Magic Sword (+2 attack)
        inventory = addTreasureToInventory(inventory, 135);
        
        expect(getAttackBonusFromItems(inventory)).toBe(3);
      });

      it('should stack multiple AC bonuses', () => {
        let inventory = createHeroInventory('quinn');
        // Amulet of Protection (+1 AC)
        inventory = addTreasureToInventory(inventory, 136);
        // Shield of Protection (+1 AC)
        inventory = addTreasureToInventory(inventory, 159);
        
        expect(getAcBonusFromItems(inventory)).toBe(2);
      });
    });
  });

  describe('treasure card types', () => {
    describe('immediate usage cards', () => {
      it('should have correct properties for +1 Magic Sword', () => {
        const card = getTreasureById(134);
        expect(card).toBeDefined();
        expect(card?.usage).toBe('immediate');
        expect(card?.discardAfterUse).toBe(false);
        expect(card?.effect.type).toBe('attack-bonus');
        expect(card?.effect.value).toBe(1);
      });

      it('should have correct properties for Blessed Shield', () => {
        const card = getTreasureById(137);
        expect(card).toBeDefined();
        expect(card?.usage).toBe('immediate');
        expect(card?.effect.type).toBe('ac-bonus');
        expect(card?.effect.value).toBe(2);
        expect(card?.effect.description).toContain('all Heroes on your tile');
      });

      it('should have correct properties for Gauntlets of Ogre Power', () => {
        const card = getTreasureById(146);
        expect(card).toBeDefined();
        expect(card?.usage).toBe('immediate');
        expect(card?.effect.type).toBe('damage-bonus');
        expect(card?.effect.value).toBe(1);
      });
    });

    describe('consumable cards', () => {
      it('should have correct properties for Potion of Healing', () => {
        const card = getTreasureById(150);
        expect(card).toBeDefined();
        expect(card?.usage).toBe('consumable');
        expect(card?.discardAfterUse).toBe(true);
        expect(card?.effect.type).toBe('healing');
        expect(card?.effect.value).toBe(2);
      });

      it('should have correct properties for Potion of Rejuvenation', () => {
        const card = getTreasureById(155);
        expect(card).toBeDefined();
        expect(card?.usage).toBe('consumable');
        expect(card?.discardAfterUse).toBe(true);
        expect(card?.effect.type).toBe('flip-power');
      });

      it('should have correct properties for Potion of Speed', () => {
        const card = getTreasureById(156);
        expect(card).toBeDefined();
        expect(card?.usage).toBe('consumable');
        expect(card?.discardAfterUse).toBe(true);
        expect(card?.effect.type).toBe('movement');
      });
    });

    describe('action cards', () => {
      it('should have correct properties for Crossbow of Speed', () => {
        const card = getTreasureById(141);
        expect(card).toBeDefined();
        expect(card?.usage).toBe('action');
        expect(card?.discardAfterUse).toBe(false);
        expect(card?.effect.type).toBe('attack-action');
        expect(card?.effect.attackBonus).toBe(4);
        expect(card?.effect.damage).toBe(1);
        expect(card?.effect.range).toBe(1);
      });

      it('should have correct properties for Ring of Shooting Stars', () => {
        const card = getTreasureById(157);
        expect(card).toBeDefined();
        expect(card?.usage).toBe('action');
        expect(card?.effect.type).toBe('attack-action');
        expect(card?.effect.attackBonus).toBe(8);
        expect(card?.effect.damage).toBe(1);
        expect(card?.effect.range).toBe(2);
      });

      it('should have correct properties for Tome of Experience', () => {
        const card = getTreasureById(163);
        expect(card).toBeDefined();
        expect(card?.usage).toBe('action');
        expect(card?.discardAfterUse).toBe(true);
        expect(card?.effect.type).toBe('level-up');
      });
    });

    describe('reaction cards', () => {
      it('should have correct properties for Lucky Charm', () => {
        const card = getTreasureById(147);
        expect(card).toBeDefined();
        expect(card?.usage).toBe('reaction');
        expect(card?.discardAfterUse).toBe(true);
        expect(card?.effect.type).toBe('reroll');
      });

      it('should have correct properties for Elven Cloak', () => {
        const card = getTreasureById(144);
        expect(card).toBeDefined();
        expect(card?.usage).toBe('reaction');
        expect(card?.effect.type).toBe('monster-control');
        expect(card?.effect.description).toContain('Another player places');
      });

      it('should have correct properties for Scroll of Monster Control', () => {
        const card = getTreasureById(158);
        expect(card).toBeDefined();
        expect(card?.usage).toBe('reaction');
        expect(card?.discardAfterUse).toBe(true);
        expect(card?.effect.type).toBe('monster-control');
        expect(card?.effect.attackBonus).toBe(9);
        expect(card?.effect.damage).toBe(1);
      });
    });
  });

  describe('treasure card count', () => {
    it('should have 29 unique treasure cards', () => {
      // Card IDs range from 134-166 with gaps for multi-line entries in source CSV
      // Skipped IDs: 148, 151, 152, 154 (continuation rows)
      expect(TREASURE_CARDS.length).toBe(29);
    });

    it('should have all cards with valid effect types', () => {
      const validEffectTypes = [
        'attack-bonus', 'damage-bonus', 'ac-bonus', 'speed-bonus',
        'healing', 'reroll', 'flip-power', 'attack-action',
        'monster-control', 'movement', 'level-up', 'trap-disable',
        'condition-removal', 'other'
      ];
      
      for (const card of TREASURE_CARDS) {
        expect(validEffectTypes).toContain(card.effect.type);
      }
    });

    it('should have all cards with valid usage types', () => {
      const validUsageTypes = ['immediate', 'action', 'reaction', 'consumable'];
      
      for (const card of TREASURE_CARDS) {
        expect(validUsageTypes).toContain(card.usage);
      }
    });
  });
});
