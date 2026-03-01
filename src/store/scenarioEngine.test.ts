import { describe, it, expect } from 'vitest';
import {
  applyDeckSetup,
  registerScenarioHooks,
  createCreepingVoidHandler,
  createDazeAllHeroesHandler,
  createReflectNaturalOneHandler,
  createHeatExhaustionHandler,
  createAutomatedDefenseHandler,
  createForgeAwakensHandler,
  evaluateWinConditions,
  evaluateLossConditions,
  areHeroesAdjacent,
  getHeroDailyDamageBonus,
  getMonsterAcBonus,
  hasReflectNaturalOne,
  SCENARIO_HOOK_POWER_CARD_ID,
  SCENARIO_HOOK_HERO_ID,
} from './scenarioEngine';
import { CHAMBER_ENTRANCE_TILE_ID, INITIAL_TILE_DECK } from './types';
import type { DeckSetupConfig, ScenarioDefinition } from './scenarios';
import { createEventHookState, getHooksForEvent } from './gameEvents';
import type {
  VillainPhaseStartEvent,
  ChamberRevealEvent,
  AttackMissEvent,
  HeroPhaseEndEvent,
  EncounterDrawEvent,
} from './gameEvents';

describe('scenarioEngine', () => {
  describe('applyDeckSetup', () => {
    const deterministicRandom = () => 0.5; // Produces a consistent shuffle

    it('places the Chamber Entrance tile immediately after the mini-stack', () => {
      const config: DeckSetupConfig = { miniStackSize: 10, chamberEntrancePosition: 0 };
      const tiles = [...INITIAL_TILE_DECK];

      const deck = applyDeckSetup(tiles, config, deterministicRandom);

      // Chamber Entrance should be at index miniStackSize
      expect(deck[10]).toBe(CHAMBER_ENTRANCE_TILE_ID);
    });

    it('places 10 regular tiles before the Chamber Entrance (Adventure 14 config)', () => {
      const config: DeckSetupConfig = { miniStackSize: 10, chamberEntrancePosition: 0 };
      const tiles = [...INITIAL_TILE_DECK];

      const deck = applyDeckSetup(tiles, config, deterministicRandom);

      // First 10 tiles should all be regular tiles (not the chamber entrance)
      const miniStack = deck.slice(0, 10);
      miniStack.forEach(tileId => {
        expect(tileId).not.toBe(CHAMBER_ENTRANCE_TILE_ID);
      });
    });

    it('places 12 regular tiles before the Chamber Entrance (Adventure 15 config)', () => {
      const config: DeckSetupConfig = { miniStackSize: 12, chamberEntrancePosition: 0 };
      const tiles = [...INITIAL_TILE_DECK];

      const deck = applyDeckSetup(tiles, config, deterministicRandom);

      // Chamber Entrance should be at index 12
      expect(deck[12]).toBe(CHAMBER_ENTRANCE_TILE_ID);

      // First 12 tiles should be regular tiles
      const miniStack = deck.slice(0, 12);
      miniStack.forEach(tileId => {
        expect(tileId).not.toBe(CHAMBER_ENTRANCE_TILE_ID);
      });
    });

    it('includes all regular tiles from INITIAL_TILE_DECK plus the Chamber Entrance', () => {
      const config: DeckSetupConfig = { miniStackSize: 10, chamberEntrancePosition: 0 };
      const tiles = [...INITIAL_TILE_DECK];

      const deck = applyDeckSetup(tiles, config, deterministicRandom);

      // Total length = regular tiles + 1 chamber entrance
      expect(deck).toHaveLength(INITIAL_TILE_DECK.length + 1);

      // All original tiles should be present
      INITIAL_TILE_DECK.forEach(tileId => {
        expect(deck).toContain(tileId);
      });

      // Chamber entrance should appear exactly once
      expect(deck.filter(id => id === CHAMBER_ENTRANCE_TILE_ID)).toHaveLength(1);
    });

    it('does not include chamber entrance in the regular tile pool (tiles param only)', () => {
      const config: DeckSetupConfig = { miniStackSize: 5, chamberEntrancePosition: 0 };
      const tiles = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

      const deck = applyDeckSetup(tiles, config, () => 0);

      // Should have 7 regular tiles + 1 chamber entrance
      expect(deck).toHaveLength(8);
      expect(deck[5]).toBe(CHAMBER_ENTRANCE_TILE_ID);
    });

    it('places remaining tiles after the Chamber Entrance', () => {
      const config: DeckSetupConfig = { miniStackSize: 3, chamberEntrancePosition: 0 };
      const tiles = ['a', 'b', 'c', 'd', 'e'];

      const deck = applyDeckSetup(tiles, config, () => 0);

      // Deck: [3 regular tiles, CHAMBER_ENTRANCE, 2 remaining regular tiles]
      expect(deck).toHaveLength(6);
      expect(deck[3]).toBe(CHAMBER_ENTRANCE_TILE_ID);
      // Remaining tiles after the chamber entrance should not include chamber entrance
      const remainder = deck.slice(4);
      remainder.forEach(id => {
        expect(id).not.toBe(CHAMBER_ENTRANCE_TILE_ID);
      });
    });

    it('shuffles the input tiles before splitting into mini-stack and remainder', () => {
      const config: DeckSetupConfig = { miniStackSize: 4, chamberEntrancePosition: 0 };
      const tiles = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

      const deck1 = applyDeckSetup([...tiles], config, () => 0.1);
      const deck2 = applyDeckSetup([...tiles], config, () => 0.9);

      // Different random functions should produce different orderings
      const deck1WithoutChamber = deck1.filter(id => id !== CHAMBER_ENTRANCE_TILE_ID);
      const deck2WithoutChamber = deck2.filter(id => id !== CHAMBER_ENTRANCE_TILE_ID);
      expect(deck1WithoutChamber.join(',')).not.toBe(deck2WithoutChamber.join(','));
    });

    it('handles miniStackSize of 0 (Chamber Entrance is the first tile drawn)', () => {
      const config: DeckSetupConfig = { miniStackSize: 0, chamberEntrancePosition: 0 };
      const tiles = ['a', 'b', 'c'];

      const deck = applyDeckSetup(tiles, config, () => 0);

      expect(deck[0]).toBe(CHAMBER_ENTRANCE_TILE_ID);
      expect(deck).toHaveLength(4);
    });
  });

  // ---------------------------------------------------------------------------
  // registerScenarioHooks
  // ---------------------------------------------------------------------------
  describe('registerScenarioHooks', () => {
    const baseScenario: ScenarioDefinition = {
      id: 'test',
      title: 'Test Scenario',
      goal: 'Test',
      intro: 'Test',
      villain: 'None',
      splashImage: null,
      monstersToDefeat: 1,
    };

    it('registers no hooks when eventHooks is undefined', () => {
      const state = createEventHookState();
      const result = registerScenarioHooks(baseScenario, state);
      expect(Object.keys(result.hooks)).toHaveLength(0);
    });

    it('registers hooks for known handlerIds', () => {
      const scenario: ScenarioDefinition = {
        ...baseScenario,
        eventHooks: [
          { eventType: 'villain-phase-start', handlerId: 'creeping-void' },
          { eventType: 'encounter-draw', handlerId: 'automated-defense' },
        ],
      };
      const state = createEventHookState();
      const result = registerScenarioHooks(scenario, state);
      expect(Object.keys(result.hooks)).toHaveLength(2);
    });

    it('skips unknown handlerIds gracefully', () => {
      const scenario: ScenarioDefinition = {
        ...baseScenario,
        eventHooks: [
          { eventType: 'villain-phase-start', handlerId: 'nonexistent-handler' },
        ],
      };
      const state = createEventHookState();
      const result = registerScenarioHooks(scenario, state);
      expect(Object.keys(result.hooks)).toHaveLength(0);
    });

    it('uses SCENARIO_HOOK_POWER_CARD_ID and SCENARIO_HOOK_HERO_ID', () => {
      const scenario: ScenarioDefinition = {
        ...baseScenario,
        eventHooks: [{ eventType: 'villain-phase-start', handlerId: 'creeping-void' }],
      };
      const state = createEventHookState();
      const result = registerScenarioHooks(scenario, state);
      const hook = Object.values(result.hooks)[0];
      expect(hook.powerCardId).toBe(SCENARIO_HOOK_POWER_CARD_ID);
      expect(hook.heroId).toBe(SCENARIO_HOOK_HERO_ID);
    });

    it('assigns priority 100 to scenario hooks', () => {
      const scenario: ScenarioDefinition = {
        ...baseScenario,
        eventHooks: [{ eventType: 'villain-phase-start', handlerId: 'creeping-void' }],
      };
      const state = createEventHookState();
      const result = registerScenarioHooks(scenario, state);
      const hook = Object.values(result.hooks)[0];
      expect(hook.priority).toBe(100);
    });
  });

  // ---------------------------------------------------------------------------
  // areHeroesAdjacent
  // ---------------------------------------------------------------------------
  describe('areHeroesAdjacent', () => {
    it('returns false for an empty list', () => {
      expect(areHeroesAdjacent([])).toBe(false);
    });

    it('returns false for a single hero', () => {
      expect(areHeroesAdjacent([{ heroId: 'quinn', position: { x: 5, y: 5 } }])).toBe(false);
    });

    it('returns true when two heroes are on the same position', () => {
      expect(areHeroesAdjacent([
        { heroId: 'quinn', position: { x: 2, y: 2 } },
        { heroId: 'vistra', position: { x: 2, y: 2 } },
      ])).toBe(true);
    });

    it('returns true when two heroes are diagonally adjacent', () => {
      expect(areHeroesAdjacent([
        { heroId: 'quinn', position: { x: 2, y: 2 } },
        { heroId: 'vistra', position: { x: 3, y: 3 } },
      ])).toBe(true);
    });

    it('returns false when heroes are not adjacent', () => {
      expect(areHeroesAdjacent([
        { heroId: 'quinn', position: { x: 0, y: 0 } },
        { heroId: 'vistra', position: { x: 5, y: 5 } },
      ])).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // createCreepingVoidHandler (Adventure 14 villain-phase-start)
  // ---------------------------------------------------------------------------
  describe('createCreepingVoidHandler', () => {
    const makeEvent = (heroPositions?: Array<{ heroId: string; position: { x: number; y: number } }>): VillainPhaseStartEvent => ({
      type: 'villain-phase-start',
      heroId: 'quinn',
      turnNumber: 1,
      heroPositions,
    });

    it('returns drawExtraEncounter=true when no hero positions provided', () => {
      const handler = createCreepingVoidHandler();
      const result = handler(makeEvent(undefined));
      expect(result?.drawExtraEncounter).toBe(true);
    });

    it('returns drawExtraEncounter=true when heroes are isolated (not adjacent)', () => {
      const handler = createCreepingVoidHandler();
      const result = handler(makeEvent([
        { heroId: 'quinn', position: { x: 0, y: 0 } },
        { heroId: 'vistra', position: { x: 10, y: 10 } },
      ]));
      expect(result?.drawExtraEncounter).toBe(true);
    });

    it('returns null when heroes are adjacent', () => {
      const handler = createCreepingVoidHandler();
      const result = handler(makeEvent([
        { heroId: 'quinn', position: { x: 2, y: 2 } },
        { heroId: 'vistra', position: { x: 3, y: 2 } },
      ]));
      expect(result).toBeNull();
    });

    it('returns drawExtraEncounter=true for single hero', () => {
      const handler = createCreepingVoidHandler();
      const result = handler(makeEvent([{ heroId: 'quinn', position: { x: 2, y: 2 } }]));
      expect(result?.drawExtraEncounter).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // createDazeAllHeroesHandler (Adventure 14 chamber-reveal)
  // ---------------------------------------------------------------------------
  describe('createDazeAllHeroesHandler', () => {
    const makeEvent = (heroIds: string[]): ChamberRevealEvent => ({
      type: 'chamber-reveal',
      heroId: heroIds[0] ?? 'quinn',
      turnNumber: 1,
      chamberType: 'horrid',
      position: { col: 0, row: 0 },
      heroIds,
    });

    it('applies dazed to all heroes in the event', () => {
      const handler = createDazeAllHeroesHandler();
      const result = handler(makeEvent(['quinn', 'vistra', 'tarak']));
      expect(result?.applyHeroStatusEffects).toHaveLength(3);
      result?.applyHeroStatusEffects?.forEach(effect => {
        expect(effect.statusType).toBe('dazed');
        expect(effect.duration).toBe(1);
      });
    });

    it('returns empty array when no heroes', () => {
      const handler = createDazeAllHeroesHandler();
      const result = handler(makeEvent([]));
      expect(result?.applyHeroStatusEffects).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // createReflectNaturalOneHandler (Adventure 14 attack-miss)
  // ---------------------------------------------------------------------------
  describe('createReflectNaturalOneHandler', () => {
    const makeEvent = (roll: number): AttackMissEvent => ({
      type: 'attack-miss',
      heroId: 'quinn',
      attackerId: 'quinn',
      turnNumber: 1,
      targetMonsterId: 'monster-1',
      attackResult: { roll, attackBonus: 5, total: roll + 5, targetAC: 18, isHit: false, damage: 0, isCritical: false },
    });

    it('returns dealDamageToHero on natural 1', () => {
      const handler = createReflectNaturalOneHandler();
      const result = handler(makeEvent(1));
      expect(result?.dealDamageToHero?.heroId).toBe('quinn');
      expect(result?.dealDamageToHero?.damage).toBe(1);
    });

    it('returns null on rolls other than 1', () => {
      const handler = createReflectNaturalOneHandler();
      expect(handler(makeEvent(2))).toBeNull();
      expect(handler(makeEvent(5))).toBeNull();
      expect(handler(makeEvent(10))).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // createHeatExhaustionHandler (Adventure 15 hero-phase-end)
  // ---------------------------------------------------------------------------
  describe('createHeatExhaustionHandler', () => {
    const makeEvent = (features: string[]): HeroPhaseEndEvent => ({
      type: 'hero-phase-end',
      heroId: 'quinn',
      turnNumber: 1,
      currentTileFeatures: features,
    });

    it('returns null when tile has no volcanic-vent feature', () => {
      const handler = createHeatExhaustionHandler(() => 0.1); // would roll 1
      expect(handler(makeEvent([]))).toBeNull();
      expect(handler(makeEvent(['normal']))).toBeNull();
    });

    it('applies Slowed on volcanic-vent when d6 ≤ 5', () => {
      const handler = createHeatExhaustionHandler(() => 0); // rolls 1 (≤5)
      const result = handler(makeEvent(['volcanic-vent']));
      expect(result?.applyHeroStatusEffects?.[0]).toMatchObject({
        heroId: 'quinn',
        statusType: 'slowed',
        duration: 1,
      });
    });

    it('returns null on volcanic-vent when d6 = 6', () => {
      const handler = createHeatExhaustionHandler(() => 0.999); // rolls 6
      const result = handler(makeEvent(['volcanic-vent']));
      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // createAutomatedDefenseHandler (Adventure 15 encounter-draw)
  // ---------------------------------------------------------------------------
  describe('createAutomatedDefenseHandler', () => {
    const makeEvent = (keywords: string[], hasExistingTrap: boolean): EncounterDrawEvent => ({
      type: 'encounter-draw',
      heroId: 'quinn',
      turnNumber: 1,
      encounterId: 'trap-card',
      currentXp: 0,
      baseCancelCost: 5,
      encounterKeywords: keywords,
      hasExistingTrapOnTile: hasExistingTrap,
    });

    it('returns null for non-trap encounters', () => {
      const handler = createAutomatedDefenseHandler();
      expect(handler(makeEvent(['monster'], false))).toBeNull();
      expect(handler(makeEvent([], false))).toBeNull();
    });

    it('places a trap token when trap encounter drawn and no existing trap', () => {
      const handler = createAutomatedDefenseHandler();
      const result = handler(makeEvent(['trap'], false));
      expect(result?.placeTrapToken).toBe(true);
      expect(result?.preventDefault).toBe(true);
    });

    it('deals 1 damage when trap encounter drawn and trap already present', () => {
      const handler = createAutomatedDefenseHandler();
      const result = handler(makeEvent(['trap'], true));
      expect(result?.dealDamageToHero?.damage).toBe(1);
      expect(result?.placeTrapToken).toBeUndefined();
      expect(result?.preventDefault).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // createForgeAwakensHandler (Adventure 15 chamber-reveal)
  // ---------------------------------------------------------------------------
  describe('createForgeAwakensHandler', () => {
    it('activates hero-daily-damage-bonus and monster-ac-bonus modifiers', () => {
      const handler = createForgeAwakensHandler();
      const event: ChamberRevealEvent = {
        type: 'chamber-reveal',
        heroId: 'quinn',
        turnNumber: 1,
        chamberType: 'dire',
        position: { col: 0, row: 0 },
        heroIds: ['quinn'],
      };
      const result = handler(event);
      const modifiers = result?.activatePersistentModifiers ?? [];
      expect(modifiers).toContainEqual({ type: 'hero-daily-damage-bonus', bonus: 1 });
      expect(modifiers).toContainEqual({ type: 'monster-ac-bonus', bonus: 2 });
    });

    it('returns monsterSpawnMultiplier of 2', () => {
      const handler = createForgeAwakensHandler();
      const event: ChamberRevealEvent = {
        type: 'chamber-reveal',
        heroId: 'quinn',
        turnNumber: 1,
        chamberType: 'dire',
        position: { col: 0, row: 0 },
        heroIds: [],
      };
      const result = handler(event);
      expect(result?.monsterSpawnMultiplier).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // evaluateWinConditions
  // ---------------------------------------------------------------------------
  describe('evaluateWinConditions', () => {
    const baseScenario = {
      scenarioId: 'test',
      monstersDefeated: 0,
      monstersToDefeat: 12,
      objective: '',
      title: '',
      description: '',
      introductionShown: false,
      chamberRevealed: false,
      villainInstanceId: null as string | null,
      activePersistentModifiers: [] as import('./types').PersistentModifier[],
    };

    it('returns null when no conditions match', () => {
      const ctx = { scenario: baseScenario, villainDefeated: false, tileDeckEmpty: false, allHeroesDefeated: false };
      expect(evaluateWinConditions(ctx, [{ type: 'defeat-villain', villainId: 'malphas' }])).toBeNull();
    });

    it('matches defeat-villain when villain is defeated', () => {
      const ctx = { scenario: baseScenario, villainDefeated: true, tileDeckEmpty: false, allHeroesDefeated: false };
      const result = evaluateWinConditions(ctx, [{ type: 'defeat-villain', villainId: 'malphas' }]);
      expect(result?.type).toBe('defeat-villain');
    });

    it('matches defeat-n-monsters when enough monsters defeated', () => {
      const ctx = {
        scenario: { ...baseScenario, monstersDefeated: 12 },
        villainDefeated: false, tileDeckEmpty: false, allHeroesDefeated: false,
      };
      const result = evaluateWinConditions(ctx, [{ type: 'defeat-n-monsters', count: 12 }]);
      expect(result?.type).toBe('defeat-n-monsters');
    });

    it('does not match defeat-n-monsters when not enough monsters defeated', () => {
      const ctx = {
        scenario: { ...baseScenario, monstersDefeated: 11 },
        villainDefeated: false, tileDeckEmpty: false, allHeroesDefeated: false,
      };
      expect(evaluateWinConditions(ctx, [{ type: 'defeat-n-monsters', count: 12 }])).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // evaluateLossConditions
  // ---------------------------------------------------------------------------
  describe('evaluateLossConditions', () => {
    const baseScenario = {
      scenarioId: 'test',
      monstersDefeated: 0,
      monstersToDefeat: 12,
      objective: '',
      title: '',
      description: '',
      introductionShown: false,
      chamberRevealed: false,
      villainInstanceId: null as string | null,
      activePersistentModifiers: [] as import('./types').PersistentModifier[],
    };

    it('returns null when no loss conditions match', () => {
      const ctx = { scenario: baseScenario, villainDefeated: false, tileDeckEmpty: false, allHeroesDefeated: false };
      expect(evaluateLossConditions(ctx, [{ type: 'hero-defeated-no-surges' }])).toBeNull();
    });

    it('matches hero-defeated-no-surges when all heroes are defeated', () => {
      const ctx = { scenario: baseScenario, villainDefeated: false, tileDeckEmpty: false, allHeroesDefeated: true };
      const result = evaluateLossConditions(ctx, [{ type: 'hero-defeated-no-surges' }]);
      expect(result?.type).toBe('hero-defeated-no-surges');
    });

    it('matches tile-deck-exhausted-before-chamber when deck empty and chamber not revealed', () => {
      const ctx = {
        scenario: { ...baseScenario, chamberRevealed: false },
        villainDefeated: false, tileDeckEmpty: true, allHeroesDefeated: false,
      };
      const result = evaluateLossConditions(ctx, [{ type: 'tile-deck-exhausted-before-chamber' }]);
      expect(result?.type).toBe('tile-deck-exhausted-before-chamber');
    });

    it('does not match tile-deck-exhausted-before-chamber when chamber already revealed', () => {
      const ctx = {
        scenario: { ...baseScenario, chamberRevealed: true },
        villainDefeated: false, tileDeckEmpty: true, allHeroesDefeated: false,
      };
      expect(evaluateLossConditions(ctx, [{ type: 'tile-deck-exhausted-before-chamber' }])).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Persistent modifier helpers
  // ---------------------------------------------------------------------------
  describe('persistent modifier helpers', () => {
    it('getHeroDailyDamageBonus sums all bonuses', () => {
      expect(getHeroDailyDamageBonus([])).toBe(0);
      expect(getHeroDailyDamageBonus([{ type: 'hero-daily-damage-bonus', bonus: 1 }])).toBe(1);
      expect(getHeroDailyDamageBonus([
        { type: 'hero-daily-damage-bonus', bonus: 1 },
        { type: 'hero-daily-damage-bonus', bonus: 2 },
        { type: 'monster-ac-bonus', bonus: 2 },
      ])).toBe(3);
    });

    it('getMonsterAcBonus sums all bonuses', () => {
      expect(getMonsterAcBonus([])).toBe(0);
      expect(getMonsterAcBonus([{ type: 'monster-ac-bonus', bonus: 2 }])).toBe(2);
    });

    it('hasReflectNaturalOne returns true only when modifier present', () => {
      expect(hasReflectNaturalOne([])).toBe(false);
      expect(hasReflectNaturalOne([{ type: 'monster-ac-bonus', bonus: 2 }])).toBe(false);
      expect(hasReflectNaturalOne([{ type: 'reflect-natural-one', damage: 1 }])).toBe(true);
    });
  });
});
