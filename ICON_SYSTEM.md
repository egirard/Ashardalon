# Icon System Documentation

## Overview

The Wrath of Ashardalon UI now uses SVG icon components instead of emoji characters to ensure consistent rendering across all platforms and devices, regardless of font support.

## Icon Components Location

All icon components are located in `/src/components/icons/`:

- `Icon.svelte` - Base wrapper component providing consistent sizing and styling
- Individual icon components (e.g., `HeartIcon.svelte`, `SwordIcon.svelte`, etc.)
- `index.ts` - Central export file for all icons

## Available Icons

### Health & Status
- **HeartIcon** (`❤️`) - Health, healing, HP
- **SkullIcon** (`💀`) - Death, knocked out, defeat
- **BandageIcon** (`❤️‍🩹`) - Healing surge
- **HeartBrokenIcon** (`💔`) - Weakened condition

### Combat
- **SwordIcon** (`⚔️`) - Attack, damage
- **ShieldIcon** (`🛡️`) - Defense, armor class
- **BoomIcon** (`💥`) - Critical hits, explosions
- **TargetIcon** (`🎯`) - Objectives, targeting

### Status Effects
- **LightningIcon** (`⚡`) - Speed, energy, stunning
- **FireIcon** (`🔥`) - Fire damage, ongoing damage
- **DiceIcon** (`🎲`) - Reroll, luck
- **WarningIcon** (`⚠️`) - Warnings, traps, alerts
- **CrystalIcon** (`🔮`) - Mystical effects, curses
- **ChainIcon** (`⛓️`) - Immobilized, cage
- **BloodIcon** (`🩸`) - Bloodlust curse

### Progression & Rewards
- **StarIcon** (`⭐`) - Experience points, level
- **TrophyIcon** (`🏆`) - Victory

### UI State
- **CheckIcon** (`✓`) - Complete, success
- **XIcon** (`✗`) - Used, flipped, failed
- **CircleIcon** (`○`) - Incomplete, unselected

### Characters
- **PersonIcon** (`👤`) - Characters, heroes

## Usage

### Basic Usage

```svelte
<script>
  import { HeartIcon } from './icons';
</script>

<HeartIcon size={16} ariaLabel="Health" />
```

### Props

All icon components accept the following props:

- `size` (number | string) - Icon size in pixels (default: 16)
- `color` (string) - Icon color, uses currentColor by default
- `class` (string) - Additional CSS classes
- `ariaLabel` (string) - Accessibility label for screen readers

### Examples

```svelte
<!-- Standard icon -->
<HeartIcon size={20} ariaLabel="Health points" />

<!-- Custom colored icon -->
<SkullIcon size={24} color="#dc2626" ariaLabel="Defeated" />

<!-- Icon with custom class -->
<StarIcon size={16} class="animated-icon" ariaLabel="Experience" />
```

## Replaced Components

The following UI components have been updated to use SVG icons:

- ActionSurgePrompt.svelte
- CharacterSelect.svelte
- CombatResultDisplay.svelte
- DefeatAnimation.svelte
- DefeatScreen.svelte
- EncounterCard.svelte
- EncounterEffectNotification.svelte
- GameBoard.svelte
- HealingSurgeAnimation.svelte
- HealingSurgeCounter.svelte
- LevelUpAnimation.svelte
- MonsterCardMini.svelte
- PlayerCard.svelte
- PowerCardSelection.svelte
- TrapMarker.svelte
- TreasureCard.svelte
- VictoryScreen.svelte
- XPCounter.svelte

## Accessibility

All icons include:
- ARIA labels for screen reader support
- Semantic meaning through descriptive labels
- Consistent sizing for readability
- Color contrast considerations

## Performance

- SVG icons are inline components, no additional HTTP requests
- Icons scale perfectly at any size without pixelation
- Small file sizes (each icon ~600-900 bytes)
- Theme-aware (respect system dark/light mode)

## Future Additions

To add a new icon:

1. Create a new `.svelte` file in `/src/components/icons/`
2. Use the `Icon.svelte` wrapper component
3. Add SVG path data within the wrapper
4. Export the new icon from `index.ts`
5. Import and use in UI components

Example template:

```svelte
<script lang="ts">
  import Icon from './Icon.svelte';
  
  interface Props {
    size?: number | string;
    color?: string;
    class?: string;
    ariaLabel?: string;
  }
  
  let { size = 16, color = 'currentColor', class: className = '', ariaLabel = 'Icon description' }: Props = $props();
</script>

<Icon {size} {color} class={className} {ariaLabel}>
  <svg viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <!-- SVG path data here -->
  </svg>
</Icon>
```

## Migration Notes

- Emoji characters are still present in store data structures (statusEffects.ts, boardTokens.ts) as string values
- These are not rendered directly but passed as metadata
- Tests checking emoji data values remain unchanged
- UI rendering now uses icon components exclusively
