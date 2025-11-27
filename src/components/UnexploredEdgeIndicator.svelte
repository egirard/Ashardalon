<script lang="ts">
  import type { Direction } from '../store/types';
  
  interface Props {
    direction: Direction;
    cellSize: number;
    tileWidth: number;
    tileHeight: number;
  }
  
  let { direction, cellSize, tileWidth, tileHeight }: Props = $props();
  
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
        return {
          right: `${offset - indicatorThickness / 2}px`,
          top: `${tileHeight / 2 - indicatorLength / 2}px`,
          width: `${indicatorThickness}px`,
          height: `${indicatorLength}px`,
        };
      case 'west':
        return {
          left: `${offset - indicatorThickness / 2}px`,
          top: `${tileHeight / 2 - indicatorLength / 2}px`,
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
    animation: pulse-glow 2s ease-in-out infinite;
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  }
  
  .question-mark {
    font-size: 0.8rem;
    font-weight: bold;
    color: #1a1a2e;
    text-shadow: 0 0 2px rgba(255, 255, 255, 0.5);
  }
  
  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
      opacity: 0.8;
    }
    50% {
      box-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
      opacity: 1;
    }
  }
</style>
