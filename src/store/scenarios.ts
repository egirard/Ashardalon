/**
 * Scenario registry
 *
 * Each entry contains the presentational metadata needed by the lobby book and
 * the scenario introduction modal.  Game-mechanics fields (win conditions, hooks,
 * villain stats, etc.) will be added in later implementation stages as described
 * in docs/scenario_design.md.
 */

export interface ScenarioDefinition {
  /** Unique identifier used to look up the scenario */
  id: string;
  /** Display title shown in the book and modal */
  title: string;
  /** One-line objective / goal */
  goal: string;
  /** Longer introductory paragraph */
  intro: string;
  /** Villain name */
  villain: string;
  /** Path to the splash/hero-screen image (relative to public folder) */
  splashImage: string | null;
  /** Number of monsters the party must defeat to win (will be replaced by richer
   *  win-condition logic in later stages) */
  monstersToDefeat: number;
}

/** All selectable scenarios, in the order they appear in the lobby book. */
export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'default',
    title: 'Into the Mountain',
    goal: 'Defeat 12 monsters',
    intro:
      'You and your fellow adventurers have entered the depths beneath Firestorm Peak. ' +
      "The dragon Ashardalon's corruption spreads through these caverns. As you explore " +
      'the dungeon, you\'ll face hordes of monsters and discover the source of evil.',
    villain: 'Ashardalon',
    splashImage: 'assets/Villain_Ashardalon.png',
    monstersToDefeat: 12,
  },
  {
    id: 'adventure-14',
    title: 'Adventure 14: The Shadow of the Void-Caller',
    goal: 'Find the Obsidian Sanctum and defeat Malphas, the Void-Caller.',
    intro:
      'A thick, unnatural fog has begun to seep out of the Firestorm Peak tunnels, ' +
      'chilling the surrounding villages and draining the life from the land. Whispers ' +
      'from the local rangers speak of a rogue sorcerer named Malphas who has occupied ' +
      'a forgotten ritual chamber deep in the mountain. He is said to be weaving a ' +
      '"Void Gate" that will swallow the light of the world. You must penetrate the ' +
      'depths, find his sanctum, and sever his connection to the void before the ' +
      'eclipse is complete.',
    villain: 'Malphas, the Void-Caller',
    splashImage: 'assets/HeroScreen_VoidCaller.png',
    monstersToDefeat: 12,
  },
  {
    id: 'adventure-15',
    title: 'Adventure 15: The Echo of the Cursed Forge',
    goal: 'Reach the Infernal Workshop and destroy Vraxos, the Cursed Sentinel.',
    intro:
      'Deep within the soot-stained corridors of Firestorm Peak lies an ancient forge ' +
      'once used to craft weapons of legend. However, a mechanical monstrosity known as ' +
      'Vraxos has claimed the forge, using its heat to build an army of animated armors ' +
      'and jagged blades. The forge\'s rhythmic pounding can be felt throughout the ' +
      'mountain, destabilizing the tunnels. You must find the workshop and dismantle the ' +
      'Sentinel before the mountain collapses.',
    villain: 'Vraxos, the Cursed Sentinel',
    splashImage: 'assets/HeroScreen_CursedForge.png',
    monstersToDefeat: 12,
  },
];

/** Lookup a scenario by its id.  Returns the default scenario if not found. */
export function getScenarioById(id: string): ScenarioDefinition {
  return SCENARIOS.find(s => s.id === id) ?? SCENARIOS[0];
}
