<script lang="ts">
  import { store } from './store';
  import CharacterSelect from './components/CharacterSelect.svelte';
  import GameBoard from './components/GameBoard.svelte';
  import VictoryScreen from './components/VictoryScreen.svelte';
  import DefeatScreen from './components/DefeatScreen.svelte';
  import type { GameScreen } from './store/types';
  
  let currentScreen: GameScreen = $state('character-select');
  
  // Subscribe to store updates
  $effect(() => {
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      currentScreen = state.game.currentScreen;
    });
    
    // Initialize state
    const state = store.getState();
    currentScreen = state.game.currentScreen;
    
    return unsubscribe;
  });
</script>

<main>
  {#if currentScreen === 'character-select'}
    <CharacterSelect />
  {:else if currentScreen === 'game-board'}
    <GameBoard />
  {:else if currentScreen === 'victory'}
    <VictoryScreen />
  {:else if currentScreen === 'defeat'}
    <DefeatScreen />
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  }
  
  main {
    min-height: 100vh;
  }
</style>
