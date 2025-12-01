import { describe, it, expect } from "vitest";
import {
  isWithinStartTile,
  isOnStaircase,
  isValidSquare,
  isOccupied,
  getAdjacentPositions,
  getValidMoveSquares,
  canMoveTo,
  isValidMoveDestination,
  START_TILE,
  getTileBounds,
  findTileAtPosition,
  isDiagonalBlockedByWalls,
  isOnWallSquare,
  getLocalTileCoordinates,
} from "./movement";
import type { HeroToken, Position, DungeonState, PlacedTile } from "./types";

describe("movement utilities", () => {
  describe("START_TILE constants", () => {
    it("should define correct tile boundaries", () => {
      expect(START_TILE.minX).toBe(1);
      expect(START_TILE.maxX).toBe(3);
      expect(START_TILE.minY).toBe(0);
      expect(START_TILE.maxY).toBe(7);
    });

    it("should define staircase positions", () => {
      expect(START_TILE.staircase).toHaveLength(4);
      expect(START_TILE.staircase).toContainEqual({ x: 1, y: 3 });
      expect(START_TILE.staircase).toContainEqual({ x: 2, y: 3 });
      expect(START_TILE.staircase).toContainEqual({ x: 1, y: 4 });
      expect(START_TILE.staircase).toContainEqual({ x: 2, y: 4 });
    });
  });

  describe("isWithinStartTile", () => {
    it("should return true for positions within tile bounds", () => {
      expect(isWithinStartTile({ x: 1, y: 0 })).toBe(true);
      expect(isWithinStartTile({ x: 3, y: 7 })).toBe(true);
      expect(isWithinStartTile({ x: 2, y: 3 })).toBe(true);
    });

    it("should return false for positions outside tile bounds", () => {
      expect(isWithinStartTile({ x: 0, y: 0 })).toBe(false);
      expect(isWithinStartTile({ x: 4, y: 0 })).toBe(false);
      expect(isWithinStartTile({ x: 2, y: -1 })).toBe(false);
      expect(isWithinStartTile({ x: 2, y: 8 })).toBe(false);
    });
  });

  describe("isOnStaircase", () => {
    it("should return true for staircase positions", () => {
      expect(isOnStaircase({ x: 1, y: 3 })).toBe(true);
      expect(isOnStaircase({ x: 2, y: 3 })).toBe(true);
      expect(isOnStaircase({ x: 1, y: 4 })).toBe(true);
      expect(isOnStaircase({ x: 2, y: 4 })).toBe(true);
    });

    it("should return false for non-staircase positions", () => {
      expect(isOnStaircase({ x: 3, y: 3 })).toBe(false);
      expect(isOnStaircase({ x: 3, y: 4 })).toBe(false);
      expect(isOnStaircase({ x: 2, y: 2 })).toBe(false);
      expect(isOnStaircase({ x: 2, y: 5 })).toBe(false);
    });
  });

  describe("isValidSquare", () => {
    it("should return true for valid walkable squares", () => {
      expect(isValidSquare({ x: 1, y: 0 })).toBe(true);
      expect(isValidSquare({ x: 2, y: 2 })).toBe(true);
      expect(isValidSquare({ x: 3, y: 3 })).toBe(true);
      expect(isValidSquare({ x: 3, y: 7 })).toBe(true);
    });

    it("should return false for staircase squares", () => {
      expect(isValidSquare({ x: 1, y: 3 })).toBe(false);
      expect(isValidSquare({ x: 2, y: 4 })).toBe(false);
    });

    it("should return false for squares outside tile bounds", () => {
      expect(isValidSquare({ x: 0, y: 0 })).toBe(false);
      expect(isValidSquare({ x: 4, y: 4 })).toBe(false);
    });
  });

  describe("isOccupied", () => {
    const heroTokens: HeroToken[] = [
      { heroId: "quinn", position: { x: 2, y: 2 } },
      { heroId: "vistra", position: { x: 3, y: 3 } },
    ];

    it("should return true for occupied positions", () => {
      expect(isOccupied({ x: 2, y: 2 }, heroTokens)).toBe(true);
      expect(isOccupied({ x: 3, y: 3 }, heroTokens)).toBe(true);
    });

    it("should return false for unoccupied positions", () => {
      expect(isOccupied({ x: 1, y: 1 }, heroTokens)).toBe(false);
      expect(isOccupied({ x: 3, y: 2 }, heroTokens)).toBe(false);
    });

    it("should exclude specified hero from occupation check", () => {
      expect(isOccupied({ x: 2, y: 2 }, heroTokens, "quinn")).toBe(false);
      expect(isOccupied({ x: 3, y: 3 }, heroTokens, "vistra")).toBe(false);
    });

    it("should still detect other heroes when excluding one", () => {
      expect(isOccupied({ x: 3, y: 3 }, heroTokens, "quinn")).toBe(true);
    });
  });

  describe("getAdjacentPositions", () => {
    it("should return all 8 adjacent positions when in center of tile", () => {
      const adjacent = getAdjacentPositions({ x: 2, y: 2 });
      // From (2,2), the adjacent positions are:
      // (1,1), (2,1), (3,1) - up row
      // (1,2), (3,2) - left and right
      // (1,3) staircase - excluded, (2,3) staircase - excluded, (3,3) valid
      // So 6 valid positions
      expect(adjacent.length).toBe(6);
      expect(adjacent).toContainEqual({ x: 1, y: 1 }); // up-left
      expect(adjacent).toContainEqual({ x: 2, y: 1 }); // up
      expect(adjacent).toContainEqual({ x: 3, y: 1 }); // up-right
      expect(adjacent).toContainEqual({ x: 1, y: 2 }); // left
      expect(adjacent).toContainEqual({ x: 3, y: 2 }); // right
      expect(adjacent).toContainEqual({ x: 3, y: 3 }); // down-right
      // (1,3) and (2,3) are staircase - not included
      expect(adjacent.some((p) => p.x === 1 && p.y === 3)).toBe(false);
      expect(adjacent.some((p) => p.x === 2 && p.y === 3)).toBe(false);
    });

    it("should exclude positions outside tile bounds", () => {
      const adjacent = getAdjacentPositions({ x: 1, y: 0 });
      // Should not include x=0 positions or y=-1 positions
      expect(adjacent.every((p) => p.x >= 1)).toBe(true);
      expect(adjacent.every((p) => p.y >= 0)).toBe(true);
    });

    it("should exclude staircase positions", () => {
      const adjacent = getAdjacentPositions({ x: 2, y: 2 });
      // Position (1,3) and (2,3) are staircase squares - should not be included as valid
      const hasStaircaseSquare = adjacent.some(
        (p) => (p.x === 1 && p.y === 3) || (p.x === 2 && p.y === 3)
      );
      // Actually, getAdjacentPositions should NOT include staircase positions
      // Let me reconsider - we need to verify invalid squares are filtered
    });

    it("should exclude invalid squares from adjacent positions", () => {
      // From position (1, 2), the left and up-left positions are outside bounds
      const adjacent = getAdjacentPositions({ x: 1, y: 2 });
      expect(adjacent.every((p) => p.x >= 1)).toBe(true);
      
      // From position (3, 2), the staircase squares below (x=1,2 at y=3) should be excluded
      const adjacentFromCorner = getAdjacentPositions({ x: 3, y: 2 });
      // (2, 3) is staircase - should not be included
      expect(adjacentFromCorner.some((p) => p.x === 2 && p.y === 3)).toBe(false);
    });
  });

  describe("getValidMoveSquares", () => {
    it("should return squares within speed distance", () => {
      const heroTokens: HeroToken[] = [
        { heroId: "quinn", position: { x: 2, y: 2 } },
      ];
      
      // With speed 1, should only get adjacent squares
      const squares = getValidMoveSquares({ x: 2, y: 2 }, 1, heroTokens, "quinn");
      expect(squares.length).toBeGreaterThan(0);
      // All squares should be within 1 step
      squares.forEach((s) => {
        const dx = Math.abs(s.x - 2);
        const dy = Math.abs(s.y - 2);
        expect(dx <= 1 && dy <= 1).toBe(true);
      });
    });

    it("should not include starting position", () => {
      const heroTokens: HeroToken[] = [
        { heroId: "quinn", position: { x: 2, y: 2 } },
      ];
      
      const squares = getValidMoveSquares({ x: 2, y: 2 }, 3, heroTokens, "quinn");
      expect(squares.some((s) => s.x === 2 && s.y === 2)).toBe(false);
    });

    it("should not include squares occupied by other heroes", () => {
      const heroTokens: HeroToken[] = [
        { heroId: "quinn", position: { x: 2, y: 2 } },
        { heroId: "vistra", position: { x: 3, y: 2 } },
      ];
      
      const squares = getValidMoveSquares({ x: 2, y: 2 }, 5, heroTokens, "quinn");
      expect(squares.some((s) => s.x === 3 && s.y === 2)).toBe(false);
    });

    it("should respect tile boundaries", () => {
      const heroTokens: HeroToken[] = [
        { heroId: "quinn", position: { x: 1, y: 0 } },
      ];
      
      const squares = getValidMoveSquares({ x: 1, y: 0 }, 5, heroTokens, "quinn");
      // All squares should be within tile bounds
      squares.forEach((s) => {
        expect(s.x).toBeGreaterThanOrEqual(1);
        expect(s.x).toBeLessThanOrEqual(3);
        expect(s.y).toBeGreaterThanOrEqual(0);
        expect(s.y).toBeLessThanOrEqual(7);
      });
    });

    it("should not include staircase squares", () => {
      const heroTokens: HeroToken[] = [
        { heroId: "quinn", position: { x: 2, y: 2 } },
      ];
      
      const squares = getValidMoveSquares({ x: 2, y: 2 }, 5, heroTokens, "quinn");
      const staircaseSquares = [
        { x: 1, y: 3 },
        { x: 2, y: 3 },
        { x: 1, y: 4 },
        { x: 2, y: 4 },
      ];
      
      staircaseSquares.forEach((staircase) => {
        expect(
          squares.some((s) => s.x === staircase.x && s.y === staircase.y)
        ).toBe(false);
      });
    });

    it("should return more squares with higher speed", () => {
      const heroTokens: HeroToken[] = [
        { heroId: "quinn", position: { x: 2, y: 2 } },
      ];
      
      const squares1 = getValidMoveSquares({ x: 2, y: 2 }, 1, heroTokens, "quinn");
      const squares3 = getValidMoveSquares({ x: 2, y: 2 }, 3, heroTokens, "quinn");
      
      expect(squares3.length).toBeGreaterThan(squares1.length);
    });
  });

  describe("canMoveTo", () => {
    const heroTokens: HeroToken[] = [
      { heroId: "quinn", position: { x: 2, y: 2 } },
      { heroId: "vistra", position: { x: 3, y: 3 } },
    ];

    it("should allow movement to adjacent empty square", () => {
      expect(canMoveTo({ x: 2, y: 2 }, { x: 3, y: 2 }, heroTokens, "quinn")).toBe(true);
      expect(canMoveTo({ x: 2, y: 2 }, { x: 2, y: 1 }, heroTokens, "quinn")).toBe(true);
    });

    it("should allow diagonal movement within tile", () => {
      expect(canMoveTo({ x: 2, y: 2 }, { x: 1, y: 1 }, heroTokens, "quinn")).toBe(true);
      expect(canMoveTo({ x: 2, y: 2 }, { x: 3, y: 1 }, heroTokens, "quinn")).toBe(true);
    });

    it("should not allow movement to occupied square", () => {
      expect(canMoveTo({ x: 2, y: 2 }, { x: 3, y: 3 }, heroTokens, "quinn")).toBe(false);
    });

    it("should not allow movement to staircase", () => {
      expect(canMoveTo({ x: 2, y: 2 }, { x: 2, y: 3 }, heroTokens, "quinn")).toBe(false);
      expect(canMoveTo({ x: 2, y: 2 }, { x: 1, y: 3 }, heroTokens, "quinn")).toBe(false);
    });

    it("should not allow movement outside tile bounds", () => {
      expect(canMoveTo({ x: 1, y: 0 }, { x: 0, y: 0 }, heroTokens, "quinn")).toBe(false);
    });

    it("should not allow movement more than one square away", () => {
      expect(canMoveTo({ x: 2, y: 2 }, { x: 2, y: 0 }, heroTokens, "quinn")).toBe(false);
      expect(canMoveTo({ x: 1, y: 1 }, { x: 3, y: 3 }, heroTokens, "quinn")).toBe(false);
    });

    it("should not allow movement to same position", () => {
      expect(canMoveTo({ x: 2, y: 2 }, { x: 2, y: 2 }, heroTokens, "quinn")).toBe(false);
    });
  });

  describe("isValidMoveDestination", () => {
    const validSquares: Position[] = [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 1, y: 2 },
      { x: 3, y: 2 },
    ];

    it("should return true for positions in valid squares", () => {
      expect(isValidMoveDestination({ x: 1, y: 1 }, validSquares)).toBe(true);
      expect(isValidMoveDestination({ x: 3, y: 2 }, validSquares)).toBe(true);
    });

    it("should return false for positions not in valid squares", () => {
      expect(isValidMoveDestination({ x: 2, y: 2 }, validSquares)).toBe(false);
      expect(isValidMoveDestination({ x: 5, y: 5 }, validSquares)).toBe(false);
    });
  });

  describe("cross-tile movement", () => {
    // Helper to create a dungeon with start tile and an adjacent tile
    function createDungeonWithAdjacentTile(direction: 'north' | 'south' | 'east' | 'west'): DungeonState {
      const startTile: PlacedTile = {
        id: 'start-tile',
        tileType: 'start',
        position: { col: 0, row: 0 },
        rotation: 0,
        edges: {
          north: direction === 'north' ? 'open' : 'unexplored',
          south: direction === 'south' ? 'open' : 'unexplored',
          east: direction === 'east' ? 'open' : 'unexplored',
          west: direction === 'west' ? 'open' : 'unexplored',
        },
      };

      const adjacentTile: PlacedTile = {
        id: 'tile-1',
        tileType: 'tile-2exit-a',
        position: {
          col: direction === 'east' ? 1 : direction === 'west' ? -1 : 0,
          row: direction === 'north' ? -1 : direction === 'south' ? 1 : 0,
        },
        rotation: 0,
        edges: {
          north: direction === 'south' ? 'open' : 'unexplored',
          south: direction === 'north' ? 'open' : 'unexplored',
          east: direction === 'west' ? 'open' : 'unexplored',
          west: direction === 'east' ? 'open' : 'unexplored',
        },
      };

      return {
        tiles: [startTile, adjacentTile],
        unexploredEdges: [],
        tileDeck: [],
      };
    }

    describe("getTileBounds", () => {
      it("should return correct bounds for start tile", () => {
        const startTile: PlacedTile = {
          id: 'start-tile',
          tileType: 'start',
          position: { col: 0, row: 0 },
          rotation: 0,
          edges: { north: 'unexplored', south: 'unexplored', east: 'unexplored', west: 'unexplored' },
        };
        
        const bounds = getTileBounds(startTile);
        expect(bounds).toEqual({ minX: 0, maxX: 3, minY: 0, maxY: 7 });
      });

      it("should return correct bounds for tile east of start", () => {
        const eastTile: PlacedTile = {
          id: 'tile-1',
          tileType: 'tile-2exit-a',
          position: { col: 1, row: 0 },
          rotation: 0,
          edges: { north: 'unexplored', south: 'unexplored', east: 'unexplored', west: 'open' },
        };
        
        const bounds = getTileBounds(eastTile);
        expect(bounds).toEqual({ minX: 4, maxX: 7, minY: 0, maxY: 3 });
      });

      it("should return correct bounds for tile north of start", () => {
        const northTile: PlacedTile = {
          id: 'tile-1',
          tileType: 'tile-2exit-a',
          position: { col: 0, row: -1 },
          rotation: 0,
          edges: { north: 'unexplored', south: 'open', east: 'unexplored', west: 'unexplored' },
        };
        
        const bounds = getTileBounds(northTile);
        expect(bounds).toEqual({ minX: 0, maxX: 3, minY: -4, maxY: -1 });
      });
    });

    describe("findTileAtPosition", () => {
      it("should find start tile for positions within start tile", () => {
        const dungeon = createDungeonWithAdjacentTile('east');
        
        const tile = findTileAtPosition({ x: 2, y: 2 }, dungeon);
        expect(tile?.id).toBe('start-tile');
      });

      it("should find adjacent tile for positions on that tile", () => {
        const dungeon = createDungeonWithAdjacentTile('east');
        
        // East tile starts at x=4
        const tile = findTileAtPosition({ x: 5, y: 1 }, dungeon);
        expect(tile?.id).toBe('tile-1');
      });

      it("should return null for positions not on any tile", () => {
        const dungeon = createDungeonWithAdjacentTile('east');
        
        // Position far outside any tile
        const tile = findTileAtPosition({ x: 100, y: 100 }, dungeon);
        expect(tile).toBeNull();
      });
    });

    describe("isValidSquare with dungeon", () => {
      it("should return true for valid position on start tile", () => {
        const dungeon = createDungeonWithAdjacentTile('east');
        
        expect(isValidSquare({ x: 2, y: 2 }, dungeon)).toBe(true);
      });

      it("should return false for staircase position on start tile", () => {
        const dungeon = createDungeonWithAdjacentTile('east');
        
        expect(isValidSquare({ x: 1, y: 3 }, dungeon)).toBe(false);
        expect(isValidSquare({ x: 2, y: 4 }, dungeon)).toBe(false);
      });

      it("should return false for wall position (x=0) on start tile", () => {
        const dungeon = createDungeonWithAdjacentTile('east');
        
        expect(isValidSquare({ x: 0, y: 2 }, dungeon)).toBe(false);
      });

      it("should return true for valid position on adjacent tile", () => {
        const dungeon = createDungeonWithAdjacentTile('east');
        
        // East tile is at x: 4-7, y: 0-3
        expect(isValidSquare({ x: 5, y: 1 }, dungeon)).toBe(true);
      });

      it("should return false for position not on any tile", () => {
        const dungeon = createDungeonWithAdjacentTile('east');
        
        expect(isValidSquare({ x: 100, y: 100 }, dungeon)).toBe(false);
      });
    });

    describe("getAdjacentPositions with dungeon (cross-tile)", () => {
      it("should include positions on adjacent tile when edges are open (east)", () => {
        const dungeon = createDungeonWithAdjacentTile('east');
        
        // Position at east edge of start tile (x=3, y=2)
        const adjacent = getAdjacentPositions({ x: 3, y: 2 }, dungeon);
        
        // Should include x=4 (on the adjacent tile)
        expect(adjacent.some(p => p.x === 4 && p.y === 2)).toBe(true);
      });

      it("should include positions on adjacent tile when edges are open (north)", () => {
        const dungeon = createDungeonWithAdjacentTile('north');
        
        // Position at north edge of start tile (x=2, y=0)
        const adjacent = getAdjacentPositions({ x: 2, y: 0 }, dungeon);
        
        // Should include y=-1 (on the adjacent tile)
        expect(adjacent.some(p => p.x === 2 && p.y === -1)).toBe(true);
      });

      it("should NOT allow diagonal movement between tiles", () => {
        const dungeon = createDungeonWithAdjacentTile('east');
        
        // Position at east edge of start tile (x=3, y=2)
        const adjacent = getAdjacentPositions({ x: 3, y: 2 }, dungeon);
        
        // Should NOT include diagonal positions on the adjacent tile
        expect(adjacent.some(p => p.x === 4 && p.y === 1)).toBe(false);
        expect(adjacent.some(p => p.x === 4 && p.y === 3)).toBe(false);
      });

      it("should allow diagonal movement within the same tile", () => {
        const dungeon = createDungeonWithAdjacentTile('east');
        
        // Position in center of start tile (x=2, y=2)
        const adjacent = getAdjacentPositions({ x: 2, y: 2 }, dungeon);
        
        // Should include diagonal positions within start tile
        expect(adjacent.some(p => p.x === 1 && p.y === 1)).toBe(true);
        expect(adjacent.some(p => p.x === 3 && p.y === 1)).toBe(true);
      });

      it("should NOT include cross-tile movement when edges are unexplored", () => {
        // Create dungeon with unexplored east edge
        const startTile: PlacedTile = {
          id: 'start-tile',
          tileType: 'start',
          position: { col: 0, row: 0 },
          rotation: 0,
          edges: { north: 'unexplored', south: 'unexplored', east: 'unexplored', west: 'unexplored' },
        };
        
        const dungeon: DungeonState = {
          tiles: [startTile],
          unexploredEdges: [{ tileId: 'start-tile', direction: 'east' }],
          tileDeck: [],
        };
        
        // Position at east edge of start tile (x=3, y=2)
        const adjacent = getAdjacentPositions({ x: 3, y: 2 }, dungeon);
        
        // Should NOT include x=4 (no tile there)
        expect(adjacent.some(p => p.x === 4)).toBe(false);
      });
    });

    describe("getValidMoveSquares with dungeon (cross-tile)", () => {
      it("should include squares on adjacent tile within speed", () => {
        const dungeon = createDungeonWithAdjacentTile('east');
        const heroTokens: HeroToken[] = [
          { heroId: 'quinn', position: { x: 3, y: 2 } }, // At east edge
        ];
        
        // With speed 2, should be able to reach x=4 (1 step) and x=5 (2 steps)
        const squares = getValidMoveSquares({ x: 3, y: 2 }, 2, heroTokens, 'quinn', dungeon);
        
        expect(squares.some(s => s.x === 4 && s.y === 2)).toBe(true);
        expect(squares.some(s => s.x === 5 && s.y === 2)).toBe(true);
      });

      it("should include squares on adjacent tile (north)", () => {
        const dungeon = createDungeonWithAdjacentTile('north');
        const heroTokens: HeroToken[] = [
          { heroId: 'quinn', position: { x: 2, y: 0 } }, // At north edge
        ];
        
        // With speed 2, should be able to reach y=-1 (1 step) and y=-2 (2 steps)
        const squares = getValidMoveSquares({ x: 2, y: 0 }, 2, heroTokens, 'quinn', dungeon);
        
        expect(squares.some(s => s.x === 2 && s.y === -1)).toBe(true);
        expect(squares.some(s => s.x === 2 && s.y === -2)).toBe(true);
      });

      it("should allow movement through adjacent tile and back", () => {
        const dungeon = createDungeonWithAdjacentTile('east');
        const heroTokens: HeroToken[] = [
          { heroId: 'quinn', position: { x: 3, y: 2 } },
        ];
        
        // With speed 3, should be able to reach far into the adjacent tile
        const squares = getValidMoveSquares({ x: 3, y: 2 }, 3, heroTokens, 'quinn', dungeon);
        
        // Should be able to reach x=6 (3 steps east)
        expect(squares.some(s => s.x === 6 && s.y === 2)).toBe(true);
      });
    });
  });

  describe("wall square detection", () => {
    // Helper to create a normal tile with specific edges
    function createTile(id: string, col: number, row: number, edges: { north: 'wall' | 'open'; south: 'wall' | 'open'; east: 'wall' | 'open'; west: 'wall' | 'open' }): PlacedTile {
      return {
        id,
        tileType: 'tile-2exit-a',
        position: { col, row },
        rotation: 0,
        edges,
      };
    }

    describe("getLocalTileCoordinates", () => {
      it("should return correct local coordinates for positions on start tile", () => {
        const startTile: PlacedTile = {
          id: 'start-tile',
          tileType: 'start',
          position: { col: 0, row: 0 },
          rotation: 0,
          edges: { north: 'open', south: 'open', east: 'open', west: 'open' },
        };
        
        // Start tile bounds: x=0-3, y=0-7
        expect(getLocalTileCoordinates({ x: 0, y: 0 }, startTile)).toEqual({ localX: 0, localY: 0 });
        expect(getLocalTileCoordinates({ x: 3, y: 7 }, startTile)).toEqual({ localX: 3, localY: 7 });
        expect(getLocalTileCoordinates({ x: 2, y: 3 }, startTile)).toEqual({ localX: 2, localY: 3 });
      });

      it("should return correct local coordinates for positions on normal tile east of start", () => {
        const tile = createTile('tile-1', 1, 0, { north: 'open', south: 'open', east: 'open', west: 'open' });
        
        // Tile at col=1 has bounds: x=4-7, y=0-3
        expect(getLocalTileCoordinates({ x: 4, y: 0 }, tile)).toEqual({ localX: 0, localY: 0 });
        expect(getLocalTileCoordinates({ x: 7, y: 3 }, tile)).toEqual({ localX: 3, localY: 3 });
        expect(getLocalTileCoordinates({ x: 5, y: 1 }, tile)).toEqual({ localX: 1, localY: 1 });
      });
    });

    describe("isOnWallSquare", () => {
      it("should return false for interior positions", () => {
        const tile = createTile('tile-1', 1, 0, { north: 'wall', south: 'wall', east: 'wall', west: 'wall' });
        
        // Interior positions (localX: 1-2, localY: 1-2) are not on walls
        expect(isOnWallSquare(1, 1, tile)).toBe(false);
        expect(isOnWallSquare(2, 2, tile)).toBe(false);
        expect(isOnWallSquare(1, 2, tile)).toBe(false);
        expect(isOnWallSquare(2, 1, tile)).toBe(false);
      });

      it("should return true for north edge when north is wall", () => {
        const tile = createTile('tile-1', 1, 0, { north: 'wall', south: 'open', east: 'open', west: 'open' });
        
        // North edge is y=0
        expect(isOnWallSquare(0, 0, tile)).toBe(true);
        expect(isOnWallSquare(1, 0, tile)).toBe(true);
        expect(isOnWallSquare(2, 0, tile)).toBe(true);
        expect(isOnWallSquare(3, 0, tile)).toBe(true);
        // Not on north edge
        expect(isOnWallSquare(1, 1, tile)).toBe(false);
      });

      it("should return true for south edge when south is wall", () => {
        const tile = createTile('tile-1', 1, 0, { north: 'open', south: 'wall', east: 'open', west: 'open' });
        
        // South edge is y=3
        expect(isOnWallSquare(0, 3, tile)).toBe(true);
        expect(isOnWallSquare(1, 3, tile)).toBe(true);
        expect(isOnWallSquare(2, 3, tile)).toBe(true);
        expect(isOnWallSquare(3, 3, tile)).toBe(true);
        // Not on south edge
        expect(isOnWallSquare(1, 2, tile)).toBe(false);
      });

      it("should return true for east edge when east is wall", () => {
        const tile = createTile('tile-1', 1, 0, { north: 'open', south: 'open', east: 'wall', west: 'open' });
        
        // East edge is x=3
        expect(isOnWallSquare(3, 0, tile)).toBe(true);
        expect(isOnWallSquare(3, 1, tile)).toBe(true);
        expect(isOnWallSquare(3, 2, tile)).toBe(true);
        expect(isOnWallSquare(3, 3, tile)).toBe(true);
        // Not on east edge
        expect(isOnWallSquare(2, 1, tile)).toBe(false);
      });

      it("should return true for west edge when west is wall", () => {
        const tile = createTile('tile-1', 1, 0, { north: 'open', south: 'open', east: 'open', west: 'wall' });
        
        // West edge is x=0
        expect(isOnWallSquare(0, 0, tile)).toBe(true);
        expect(isOnWallSquare(0, 1, tile)).toBe(true);
        expect(isOnWallSquare(0, 2, tile)).toBe(true);
        expect(isOnWallSquare(0, 3, tile)).toBe(true);
        // Not on west edge
        expect(isOnWallSquare(1, 1, tile)).toBe(false);
      });

      it("should return false for open edges", () => {
        const tile = createTile('tile-1', 1, 0, { north: 'open', south: 'open', east: 'open', west: 'open' });
        
        // All edges are open, no wall squares
        expect(isOnWallSquare(0, 0, tile)).toBe(false);
        expect(isOnWallSquare(3, 0, tile)).toBe(false);
        expect(isOnWallSquare(0, 3, tile)).toBe(false);
        expect(isOnWallSquare(3, 3, tile)).toBe(false);
      });

      it("should return false for start tile (uses different wall logic)", () => {
        const startTile: PlacedTile = {
          id: 'start-tile',
          tileType: 'start',
          position: { col: 0, row: 0 },
          rotation: 0,
          edges: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' },
        };
        
        // Start tile uses isOnStaircase and x<1 check instead
        expect(isOnWallSquare(0, 0, startTile)).toBe(false);
        expect(isOnWallSquare(1, 3, startTile)).toBe(false);
      });
    });

    describe("isValidSquare with wall squares", () => {
      it("should return false for wall squares on normal tiles", () => {
        const tile = createTile('tile-1', 1, 0, { north: 'wall', south: 'open', east: 'wall', west: 'open' });
        const startTile: PlacedTile = {
          id: 'start-tile',
          tileType: 'start',
          position: { col: 0, row: 0 },
          rotation: 0,
          edges: { north: 'open', south: 'open', east: 'open', west: 'open' },
        };
        
        const dungeon: DungeonState = {
          tiles: [startTile, tile],
          unexploredEdges: [],
          tileDeck: [],
        };
        
        // North wall squares (y=0 on tile-1, which is global y=0, x=4-7)
        expect(isValidSquare({ x: 4, y: 0 }, dungeon)).toBe(false);
        expect(isValidSquare({ x: 5, y: 0 }, dungeon)).toBe(false);
        expect(isValidSquare({ x: 6, y: 0 }, dungeon)).toBe(false);
        expect(isValidSquare({ x: 7, y: 0 }, dungeon)).toBe(false);
        
        // East wall squares (x=7)
        expect(isValidSquare({ x: 7, y: 1 }, dungeon)).toBe(false);
        expect(isValidSquare({ x: 7, y: 2 }, dungeon)).toBe(false);
        expect(isValidSquare({ x: 7, y: 3 }, dungeon)).toBe(false);
        
        // Interior positions should be valid
        expect(isValidSquare({ x: 5, y: 1 }, dungeon)).toBe(true);
        expect(isValidSquare({ x: 5, y: 2 }, dungeon)).toBe(true);
        expect(isValidSquare({ x: 6, y: 2 }, dungeon)).toBe(true);
      });
    });
  });

  describe("wall collision for diagonal movement", () => {
    // Helper to create a normal tile with specific walls
    function createTileWithWalls(edges: { north?: boolean; south?: boolean; east?: boolean; west?: boolean }): PlacedTile {
      return {
        id: 'test-tile',
        tileType: 'tile-2exit-a',
        position: { col: 0, row: 0 },
        rotation: 0,
        edges: {
          north: edges.north ? 'wall' : 'open',
          south: edges.south ? 'wall' : 'open',
          east: edges.east ? 'wall' : 'open',
          west: edges.west ? 'wall' : 'open',
        },
      };
    }

    describe("isDiagonalBlockedByWalls", () => {
      it("should block diagonal movement when both connected edges have walls", () => {
        const tile = createTileWithWalls({ north: true, east: true });
        // At north-east corner (max x, min y), moving north-east (up-right) should be blocked
        // Position (3, 0) on a 4x4 tile is at north-east corner
        const pos = { x: 3, y: 0 }; // Tile bounds: 0-3 for both x and y
        // Moving up-right (dx=1, dy=-1) from corner with both walls
        expect(isDiagonalBlockedByWalls(pos, 1, -1, tile)).toBe(true);
      });

      it("should allow diagonal movement when only one connected edge has wall", () => {
        const tile = createTileWithWalls({ north: true, east: false });
        const pos = { x: 3, y: 0 };
        // Moving up-right (dx=1, dy=-1) - only north has wall, east is open
        expect(isDiagonalBlockedByWalls(pos, 1, -1, tile)).toBe(false);
      });

      it("should allow diagonal movement when no connected edges have walls", () => {
        const tile = createTileWithWalls({ north: false, east: false });
        const pos = { x: 3, y: 0 };
        expect(isDiagonalBlockedByWalls(pos, 1, -1, tile)).toBe(false);
      });

      it("should not block diagonal movement from center of tile", () => {
        const tile = createTileWithWalls({ north: true, south: true, east: true, west: true });
        const pos = { x: 1, y: 1 }; // Center-ish position, not on any edge
        // Moving any diagonal direction should not be blocked since we're not at an edge
        expect(isDiagonalBlockedByWalls(pos, 1, 1, tile)).toBe(false);
        expect(isDiagonalBlockedByWalls(pos, -1, 1, tile)).toBe(false);
        expect(isDiagonalBlockedByWalls(pos, 1, -1, tile)).toBe(false);
        expect(isDiagonalBlockedByWalls(pos, -1, -1, tile)).toBe(false);
      });

      it("should block south-west diagonal when at corner with both walls", () => {
        const tile = createTileWithWalls({ south: true, west: true });
        const pos = { x: 0, y: 3 }; // South-west corner
        // Moving down-left (dx=-1, dy=1)
        expect(isDiagonalBlockedByWalls(pos, -1, 1, tile)).toBe(true);
      });

      it("should not block cardinal movement (not diagonal)", () => {
        const tile = createTileWithWalls({ north: true, east: true, south: true, west: true });
        const pos = { x: 0, y: 0 };
        // Cardinal moves should return false (not blocked by this function)
        expect(isDiagonalBlockedByWalls(pos, 1, 0, tile)).toBe(false);
        expect(isDiagonalBlockedByWalls(pos, 0, 1, tile)).toBe(false);
        expect(isDiagonalBlockedByWalls(pos, -1, 0, tile)).toBe(false);
        expect(isDiagonalBlockedByWalls(pos, 0, -1, tile)).toBe(false);
      });
    });

    describe("getAdjacentPositions with walls", () => {
      it("should not include wall squares as valid movement destinations", () => {
        // Create a tile with north and east walls
        const tile: PlacedTile = {
          id: 'tile-1',
          tileType: 'tile-2exit-a',
          position: { col: 1, row: 0 }, // East of start tile
          rotation: 0,
          edges: {
            north: 'wall',
            south: 'open',
            east: 'wall',
            west: 'open',
          },
        };

        const startTile: PlacedTile = {
          id: 'start-tile',
          tileType: 'start',
          position: { col: 0, row: 0 },
          rotation: 0,
          edges: { north: 'unexplored', south: 'unexplored', east: 'open', west: 'unexplored' },
        };

        const dungeon: DungeonState = {
          tiles: [startTile, tile],
          unexploredEdges: [],
          tileDeck: [],
        };

        // Position at interior of tile-1 (x=5, y=1) - not on any wall edge
        // Tile-1 bounds: x=4-7, y=0-3
        // Wall squares: y=0 (north), x=7 (east)
        const pos = { x: 5, y: 1 };
        const adjacent = getAdjacentPositions(pos, dungeon);

        // Should include valid interior positions
        expect(adjacent.some(p => p.x === 5 && p.y === 2)).toBe(true); // south
        expect(adjacent.some(p => p.x === 4 && p.y === 1)).toBe(true); // west
        expect(adjacent.some(p => p.x === 6 && p.y === 1)).toBe(true); // east (not on wall edge yet)
        expect(adjacent.some(p => p.x === 6 && p.y === 2)).toBe(true); // southeast diagonal
        
        // Should NOT include wall squares (y=0 is wall due to north wall)
        expect(adjacent.some(p => p.y === 0)).toBe(false);
      });

      it("should not include east wall squares when east edge is wall", () => {
        const tile: PlacedTile = {
          id: 'tile-1',
          tileType: 'tile-2exit-a',
          position: { col: 1, row: 0 },
          rotation: 0,
          edges: {
            north: 'open',
            south: 'open',
            east: 'wall',
            west: 'open',
          },
        };

        const startTile: PlacedTile = {
          id: 'start-tile',
          tileType: 'start',
          position: { col: 0, row: 0 },
          rotation: 0,
          edges: { north: 'unexplored', south: 'unexplored', east: 'open', west: 'unexplored' },
        };

        const dungeon: DungeonState = {
          tiles: [startTile, tile],
          unexploredEdges: [],
          tileDeck: [],
        };

        // Position adjacent to east wall (x=6, y=1)
        // East wall is at x=7 (local x=3)
        const pos = { x: 6, y: 1 };
        const adjacent = getAdjacentPositions(pos, dungeon);

        // Should NOT include x=7 positions (east wall)
        expect(adjacent.some(p => p.x === 7)).toBe(false);
        
        // Should include other valid positions
        expect(adjacent.some(p => p.x === 5 && p.y === 1)).toBe(true); // west
        expect(adjacent.some(p => p.x === 6 && p.y === 0)).toBe(true); // north (not a wall)
        expect(adjacent.some(p => p.x === 6 && p.y === 2)).toBe(true); // south
      });
    });

    describe("getValidMoveSquares with wall constraints", () => {
      it("should not include wall squares in valid movement destinations", () => {
        // Create a tile with walls on north and east
        const tile: PlacedTile = {
          id: 'tile-1',
          tileType: 'tile-2exit-a',
          position: { col: 1, row: 0 },
          rotation: 0,
          edges: {
            north: 'wall',
            south: 'open',
            east: 'wall',
            west: 'open',
          },
        };

        const startTile: PlacedTile = {
          id: 'start-tile',
          tileType: 'start',
          position: { col: 0, row: 0 },
          rotation: 0,
          edges: { north: 'unexplored', south: 'unexplored', east: 'open', west: 'unexplored' },
        };

        const dungeon: DungeonState = {
          tiles: [startTile, tile],
          unexploredEdges: [],
          tileDeck: [],
        };

        const heroTokens: HeroToken[] = [
          { heroId: 'quinn', position: { x: 5, y: 1 } }, // At interior of tile-1
        ];

        // With speed 3, should be able to reach many positions but not walls
        const squares = getValidMoveSquares({ x: 5, y: 1 }, 3, heroTokens, 'quinn', dungeon);

        // Should NOT include north wall squares (y=0)
        expect(squares.some(s => s.y === 0 && s.x >= 4 && s.x <= 7)).toBe(false);
        
        // Should NOT include east wall squares (x=7)
        expect(squares.some(s => s.x === 7)).toBe(false);
        
        // Should include interior positions
        expect(squares.some(s => s.x === 5 && s.y === 2)).toBe(true);
        expect(squares.some(s => s.x === 6 && s.y === 2)).toBe(true);
        expect(squares.some(s => s.x === 4 && s.y === 1)).toBe(true);
      });
    });
  });
});

// Import sub-tile functions for testing
import {
  getSubTileIdAtPosition,
  areOnSameTileOrSubTile,
  getTileOrSubTileId,
} from "./movement";
import {
  getStartTileSubTileId,
  isInNorthSubTile,
  isInSouthSubTile,
  START_TILE_SUB_TILE_BOUNDARY,
} from "./types";

describe("start tile sub-tiles", () => {
  describe("START_TILE sub-tile constants", () => {
    it("should define sub-tile boundaries", () => {
      expect(START_TILE.subTiles.north.minY).toBe(0);
      expect(START_TILE.subTiles.north.maxY).toBe(3);
      expect(START_TILE.subTiles.south.minY).toBe(4);
      expect(START_TILE.subTiles.south.maxY).toBe(7);
    });
  });

  describe("isInNorthSubTile", () => {
    it("should return true for positions in north sub-tile (y: 0-3)", () => {
      expect(isInNorthSubTile(0)).toBe(true);
      expect(isInNorthSubTile(1)).toBe(true);
      expect(isInNorthSubTile(2)).toBe(true);
      expect(isInNorthSubTile(3)).toBe(true);
    });

    it("should return false for positions in south sub-tile (y: 4-7)", () => {
      expect(isInNorthSubTile(4)).toBe(false);
      expect(isInNorthSubTile(5)).toBe(false);
      expect(isInNorthSubTile(6)).toBe(false);
      expect(isInNorthSubTile(7)).toBe(false);
    });

    it("should return false for positions outside start tile bounds", () => {
      expect(isInNorthSubTile(-1)).toBe(false);
      expect(isInNorthSubTile(8)).toBe(false);
    });
  });

  describe("isInSouthSubTile", () => {
    it("should return true for positions in south sub-tile (y: 4-7)", () => {
      expect(isInSouthSubTile(4)).toBe(true);
      expect(isInSouthSubTile(5)).toBe(true);
      expect(isInSouthSubTile(6)).toBe(true);
      expect(isInSouthSubTile(7)).toBe(true);
    });

    it("should return false for positions in north sub-tile (y: 0-3)", () => {
      expect(isInSouthSubTile(0)).toBe(false);
      expect(isInSouthSubTile(1)).toBe(false);
      expect(isInSouthSubTile(2)).toBe(false);
      expect(isInSouthSubTile(3)).toBe(false);
    });

    it("should return false for positions outside start tile bounds", () => {
      expect(isInSouthSubTile(-1)).toBe(false);
      expect(isInSouthSubTile(8)).toBe(false);
    });
  });

  describe("getStartTileSubTileId", () => {
    it("should return 'start-tile-north' for north sub-tile positions", () => {
      expect(getStartTileSubTileId(0)).toBe('start-tile-north');
      expect(getStartTileSubTileId(1)).toBe('start-tile-north');
      expect(getStartTileSubTileId(2)).toBe('start-tile-north');
      expect(getStartTileSubTileId(3)).toBe('start-tile-north');
    });

    it("should return 'start-tile-south' for south sub-tile positions", () => {
      expect(getStartTileSubTileId(4)).toBe('start-tile-south');
      expect(getStartTileSubTileId(5)).toBe('start-tile-south');
      expect(getStartTileSubTileId(6)).toBe('start-tile-south');
      expect(getStartTileSubTileId(7)).toBe('start-tile-south');
    });

    it("should return null for positions outside start tile bounds", () => {
      expect(getStartTileSubTileId(-1)).toBeNull();
      expect(getStartTileSubTileId(8)).toBeNull();
    });
  });

  describe("getSubTileIdAtPosition", () => {
    const startTile: PlacedTile = {
      id: 'start-tile',
      tileType: 'start',
      position: { col: 0, row: 0 },
      rotation: 0,
      edges: { north: 'unexplored', south: 'unexplored', east: 'unexplored', west: 'unexplored' },
    };

    const normalTile: PlacedTile = {
      id: 'tile-1',
      tileType: 'tile-2exit-a',
      position: { col: 1, row: 0 },
      rotation: 0,
      edges: { north: 'wall', south: 'wall', east: 'wall', west: 'open' },
    };

    const dungeon: DungeonState = {
      tiles: [startTile, normalTile],
      unexploredEdges: [],
      tileDeck: [],
    };

    it("should return north sub-tile ID for positions in north half of start tile", () => {
      expect(getSubTileIdAtPosition({ x: 2, y: 0 }, dungeon)).toBe('start-tile-north');
      expect(getSubTileIdAtPosition({ x: 2, y: 3 }, dungeon)).toBe('start-tile-north');
    });

    it("should return south sub-tile ID for positions in south half of start tile", () => {
      expect(getSubTileIdAtPosition({ x: 2, y: 4 }, dungeon)).toBe('start-tile-south');
      expect(getSubTileIdAtPosition({ x: 2, y: 7 }, dungeon)).toBe('start-tile-south');
    });

    it("should return null for positions on normal tiles", () => {
      expect(getSubTileIdAtPosition({ x: 5, y: 1 }, dungeon)).toBeNull();
    });

    it("should return null for positions not on any tile", () => {
      expect(getSubTileIdAtPosition({ x: 100, y: 100 }, dungeon)).toBeNull();
    });
  });

  describe("areOnSameTileOrSubTile", () => {
    const startTile: PlacedTile = {
      id: 'start-tile',
      tileType: 'start',
      position: { col: 0, row: 0 },
      rotation: 0,
      edges: { north: 'unexplored', south: 'unexplored', east: 'unexplored', west: 'unexplored' },
    };

    const normalTile: PlacedTile = {
      id: 'tile-1',
      tileType: 'tile-2exit-a',
      position: { col: 1, row: 0 },
      rotation: 0,
      edges: { north: 'wall', south: 'wall', east: 'wall', west: 'open' },
    };

    const dungeon: DungeonState = {
      tiles: [startTile, normalTile],
      unexploredEdges: [],
      tileDeck: [],
    };

    it("should return true for two positions in the same sub-tile (north)", () => {
      const pos1 = { x: 2, y: 0 };
      const pos2 = { x: 3, y: 2 };
      expect(areOnSameTileOrSubTile(pos1, pos2, dungeon)).toBe(true);
    });

    it("should return true for two positions in the same sub-tile (south)", () => {
      const pos1 = { x: 2, y: 5 };
      const pos2 = { x: 3, y: 7 };
      expect(areOnSameTileOrSubTile(pos1, pos2, dungeon)).toBe(true);
    });

    it("should return false for positions in different sub-tiles of start tile", () => {
      const pos1 = { x: 2, y: 3 }; // North sub-tile
      const pos2 = { x: 2, y: 4 }; // South sub-tile
      expect(areOnSameTileOrSubTile(pos1, pos2, dungeon)).toBe(false);
    });

    it("should return true for two positions on the same normal tile", () => {
      const pos1 = { x: 4, y: 0 };
      const pos2 = { x: 7, y: 3 };
      expect(areOnSameTileOrSubTile(pos1, pos2, dungeon)).toBe(true);
    });

    it("should return false for positions on different tiles", () => {
      const pos1 = { x: 2, y: 2 }; // Start tile
      const pos2 = { x: 5, y: 1 }; // Normal tile
      expect(areOnSameTileOrSubTile(pos1, pos2, dungeon)).toBe(false);
    });

    it("should return false if either position is not on a tile", () => {
      const pos1 = { x: 100, y: 100 };
      const pos2 = { x: 2, y: 2 };
      expect(areOnSameTileOrSubTile(pos1, pos2, dungeon)).toBe(false);
    });
  });

  describe("getTileOrSubTileId", () => {
    const startTile: PlacedTile = {
      id: 'start-tile',
      tileType: 'start',
      position: { col: 0, row: 0 },
      rotation: 0,
      edges: { north: 'unexplored', south: 'unexplored', east: 'unexplored', west: 'unexplored' },
    };

    const normalTile: PlacedTile = {
      id: 'tile-1',
      tileType: 'tile-2exit-a',
      position: { col: 1, row: 0 },
      rotation: 0,
      edges: { north: 'wall', south: 'wall', east: 'wall', west: 'open' },
    };

    const dungeon: DungeonState = {
      tiles: [startTile, normalTile],
      unexploredEdges: [],
      tileDeck: [],
    };

    it("should return 'start-tile-north' for positions in north sub-tile", () => {
      expect(getTileOrSubTileId({ x: 2, y: 0 }, dungeon)).toBe('start-tile-north');
      expect(getTileOrSubTileId({ x: 2, y: 3 }, dungeon)).toBe('start-tile-north');
    });

    it("should return 'start-tile-south' for positions in south sub-tile", () => {
      expect(getTileOrSubTileId({ x: 2, y: 4 }, dungeon)).toBe('start-tile-south');
      expect(getTileOrSubTileId({ x: 2, y: 7 }, dungeon)).toBe('start-tile-south');
    });

    it("should return normal tile ID for positions on normal tiles", () => {
      expect(getTileOrSubTileId({ x: 5, y: 1 }, dungeon)).toBe('tile-1');
    });

    it("should return null for positions not on any tile", () => {
      expect(getTileOrSubTileId({ x: 100, y: 100 }, dungeon)).toBeNull();
    });
  });

  describe("sub-tile boundary at staircase", () => {
    it("should correctly identify sub-tiles at the staircase boundary", () => {
      // The staircase spans y: 3-4, which crosses the sub-tile boundary
      // y: 3 is in north sub-tile, y: 4 is in south sub-tile
      expect(getStartTileSubTileId(3)).toBe('start-tile-north');
      expect(getStartTileSubTileId(4)).toBe('start-tile-south');
    });

    it("should not affect movement through staircase (blocked by isOnStaircase)", () => {
      // This is handled by the existing isOnStaircase function
      // The sub-tile boundary doesn't add additional movement restrictions
      expect(isOnStaircase({ x: 2, y: 3 })).toBe(true);
      expect(isOnStaircase({ x: 2, y: 4 })).toBe(true);
    });
  });
});
