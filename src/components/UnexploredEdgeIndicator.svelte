<script lang="ts">
  import type { Direction, StartTileSubTileId } from '../store/types';
  
  interface Props {
    direction: Direction;
    cellSize: number;
    tileWidth: number;
    tileHeight: number;
    /** Optional sub-tile ID for start tile edges with multiple exits per side */
    subTileId?: StartTileSubTileId;
  }
  
  let { direction, cellSize, tileWidth, tileHeight, subTileId }: Props = $props();
  
  // Calculate position and size for the indicator based on direction
  const getIndicatorStyle = () => {
    const indicatorThickness = 8;
    const indicatorLength = cellSize * 1.5;
    const offset = 36; // Match TOKEN_OFFSET from GameBoard
    
    switch (direction) {
      case 'north':
        return {
          left: `${tileWidth / 2 - indicatorLength / 2}px`,
          top: `${offset - indicatorThickness / 2}px`,
          width: `${indicatorLength}px`,
          height: `${indicatorThickness}px`,
        };
      case 'south':
        return {
          left: `${tileWidth / 2 - indicatorLength / 2}px`,
          bottom: `${offset - indicatorThickness / 2}px`,
          width: `${indicatorLength}px`,
          height: `${indicatorThickness}px`,
        };
      case 'east':
        // For start tile sub-tiles, position at the center of each sub-tile half
        // North sub-tile: center at 1/4 of tile height
        // South sub-tile: center at 3/4 of tile height
        // Regular tile: center at 1/2 of tile height
        let eastVerticalPosition: number;
        if (subTileId === 'start-tile-north') {
          eastVerticalPosition = tileHeight / 4 - indicatorLength / 2;
        } else if (subTileId === 'start-tile-south') {
          eastVerticalPosition = (3 * tileHeight) / 4 - indicatorLength / 2;
        } else {
          eastVerticalPosition = tileHeight / 2 - indicatorLength / 2;
        }
        return {
          right: `${offset - indicatorThickness / 2}px`,
          top: `${eastVerticalPosition}px`,
          width: `${indicatorThickness}px`,
          height: `${indicatorLength}px`,
        };
      case 'west':
        // Same positioning logic as east
        let westVerticalPosition: number;
        if (subTileId === 'start-tile-north') {
          westVerticalPosition = tileHeight / 4 - indicatorLength / 2;
        } else if (subTileId === 'start-tile-south') {
          westVerticalPosition = (3 * tileHeight) / 4 - indicatorLength / 2;
        } else {
          westVerticalPosition = tileHeight / 2 - indicatorLength / 2;
        }
        return {
          left: `${offset - indicatorThickness / 2}px`,
          top: `${westVerticalPosition}px`,
          width: `${indicatorThickness}px`,
          height: `${indicatorLength}px`,
        };
    }
  };
  
  const style = getIndicatorStyle();
  const styleString = Object.entries(style)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
</script>

<div 
  class="unexplored-edge" 
  data-testid="unexplored-edge"
  data-direction={direction}
  style={styleString}
>
  <span class="question-mark">?</span>
</div>

<style>
  .unexplored-edge {
    position: absolute;
    background: linear-gradient(90deg, 
      rgba(255, 215, 0, 0.7) 0%, 
      rgba(255, 170, 0, 0.9) 50%, 
      rgba(255, 215, 0, 0.7) 100%
    );
    border: 2px dashed #ffd700;
    border-radius: 4px;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 5;
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  }
  
  .question-mark {
    font-size: 0.8rem;
    font-weight: bold;
    color: #1a1a2e;
    text-shadow: 0 0 2px rgba(255, 255, 255, 0.5);
  }
</style>
