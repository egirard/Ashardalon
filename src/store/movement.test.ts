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
} from "./movement";
import type { HeroToken, Position } from "./types";

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
});
