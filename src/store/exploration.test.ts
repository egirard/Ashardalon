import { describe, it, expect } from "vitest";
import {
  isOnEdge,
  getOppositeDirection,
  checkExploration,
  getNewTilePosition,
  calculateTileRotation,
  placeTile,
  initializeDungeon,
  initializeTileDeck,
  drawTile,
  updateDungeonAfterExploration,
  shuffleArray,
  START_TILE_EDGE_POSITIONS,
  drawTileFromBottom,
  moveBottomTileToTop,
  shuffleTileDeck,
  rotateEdges,
} from "./exploration";
import type { DungeonState, HeroToken, PlacedTile, TileEdge } from "./types";
import { TILE_DEFINITIONS } from "./types";

describe("exploration", () => {
  describe("isOnEdge", () => {
    it("should return true for positions on the north edge", () => {
      expect(isOnEdge({ x: 1, y: 0 }, "north")).toBe(true);
      expect(isOnEdge({ x: 2, y: 0 }, "north")).toBe(true);
      expect(isOnEdge({ x: 3, y: 0 }, "north")).toBe(true);
    });

    it("should return true for positions on the south edge", () => {
      expect(isOnEdge({ x: 1, y: 7 }, "south")).toBe(true);
      expect(isOnEdge({ x: 2, y: 7 }, "south")).toBe(true);
      expect(isOnEdge({ x: 3, y: 7 }, "south")).toBe(true);
    });

    it("should return true for positions on the east edge", () => {
      expect(isOnEdge({ x: 3, y: 0 }, "east")).toBe(true);
      expect(isOnEdge({ x: 3, y: 1 }, "east")).toBe(true);
      expect(isOnEdge({ x: 3, y: 7 }, "east")).toBe(true);
    });

    it("should return true for positions on the west edge", () => {
      expect(isOnEdge({ x: 1, y: 0 }, "west")).toBe(true);
      expect(isOnEdge({ x: 1, y: 1 }, "west")).toBe(true);
      expect(isOnEdge({ x: 1, y: 7 }, "west")).toBe(true);
    });

    it("should return false for center positions", () => {
      expect(isOnEdge({ x: 2, y: 2 }, "north")).toBe(false);
      expect(isOnEdge({ x: 2, y: 2 }, "south")).toBe(false);
      expect(isOnEdge({ x: 2, y: 2 }, "east")).toBe(false);
      expect(isOnEdge({ x: 2, y: 2 }, "west")).toBe(false);
    });
  });

  describe("getOppositeDirection", () => {
    it("should return south for north", () => {
      expect(getOppositeDirection("north")).toBe("south");
    });

    it("should return north for south", () => {
      expect(getOppositeDirection("south")).toBe("north");
    });

    it("should return west for east", () => {
      expect(getOppositeDirection("east")).toBe("west");
    });

    it("should return east for west", () => {
      expect(getOppositeDirection("west")).toBe("east");
    });
  });

  describe("calculateTileRotation", () => {
    // Use a standard 2-exit tile with north/south openings for testing
    const testTileDef = TILE_DEFINITIONS.find(t => t.tileType === 'tile-black-2exit-a')!;
    
    it("should align an opening with south edge when exploring north", () => {
      // Hero explores north edge, new tile connects via its south edge
      // Rotation should result in south edge being open
      const rotation = calculateTileRotation("north", testTileDef);
      const rotatedEdges = rotateEdges(testTileDef.defaultEdges, rotation);
      expect(rotatedEdges.south).toBe('open');
    });

    it("should align an opening with north edge when exploring south", () => {
      // Hero explores south edge, new tile connects via its north edge
      // Rotation should result in north edge being open
      const rotation = calculateTileRotation("south", testTileDef);
      const rotatedEdges = rotateEdges(testTileDef.defaultEdges, rotation);
      expect(rotatedEdges.north).toBe('open');
    });

    it("should align an opening with west edge when exploring east", () => {
      // Hero explores east edge, new tile connects via its west edge
      // Rotation should result in west edge being open
      const rotation = calculateTileRotation("east", testTileDef);
      const rotatedEdges = rotateEdges(testTileDef.defaultEdges, rotation);
      expect(rotatedEdges.west).toBe('open');
    });

    it("should align an opening with east edge when exploring west", () => {
      // Hero explores west edge, new tile connects via its east edge
      // Rotation should result in east edge being open
      const rotation = calculateTileRotation("west", testTileDef);
      const rotatedEdges = rotateEdges(testTileDef.defaultEdges, rotation);
      expect(rotatedEdges.east).toBe('open');
    });
  });

  describe("checkExploration", () => {
    it("should return null when hero is not on an edge", () => {
      const hero: HeroToken = {
        heroId: "quinn",
        position: { x: 2, y: 2 },
      };
      const dungeon = initializeDungeon();
      
      const result = checkExploration(hero, dungeon);
      expect(result).toBeNull();
    });

    it("should return the north edge when hero is on north edge position", () => {
      const hero: HeroToken = {
        heroId: "quinn",
        position: { x: 2, y: 0 },
      };
      const dungeon = initializeDungeon();
      
      const result = checkExploration(hero, dungeon);
      expect(result).toEqual({ tileId: "start-tile", direction: "north" });
    });

    it("should return the south edge when hero is on south edge position", () => {
      const hero: HeroToken = {
        heroId: "quinn",
        position: { x: 2, y: 7 },
      };
      const dungeon = initializeDungeon();
      
      const result = checkExploration(hero, dungeon);
      expect(result).toEqual({ tileId: "start-tile", direction: "south" });
    });

    it("should return the east edge when hero is on east edge position", () => {
      const hero: HeroToken = {
        heroId: "quinn",
        position: { x: 3, y: 1 },
      };
      const dungeon = initializeDungeon();
      
      const result = checkExploration(hero, dungeon);
      // Hero at y=1 is in north sub-tile, so expect north sub-tile east edge
      expect(result).toEqual({ tileId: "start-tile", direction: "east", subTileId: "start-tile-north" });
    });

    it("should return the west edge when hero is on west edge position", () => {
      const hero: HeroToken = {
        heroId: "quinn",
        position: { x: 1, y: 1 },
      };
      const dungeon = initializeDungeon();
      
      const result = checkExploration(hero, dungeon);
      // Hero at y=1 is in north sub-tile, so expect north sub-tile west edge
      expect(result).toEqual({ tileId: "start-tile", direction: "west", subTileId: "start-tile-north" });
    });

    it("should return null when edge is already explored", () => {
      const hero: HeroToken = {
        heroId: "quinn",
        position: { x: 2, y: 0 },
      };
      const dungeon = initializeDungeon();
      // Remove north edge from unexplored edges
      dungeon.unexploredEdges = dungeon.unexploredEdges.filter(
        (e) => e.direction !== "north"
      );
      
      const result = checkExploration(hero, dungeon);
      expect(result).toBeNull();
    });

    it("should detect exploration on a newly placed tile's unexplored edge", () => {
      // Create a dungeon with start tile and a newly placed tile to the north
      const dungeon = initializeDungeon();
      
      // Add a new tile at position (col: 0, row: -1), which is north of the start tile
      // The tile is at grid position north, so in absolute coords:
      // minX = 0, maxX = 3 (col = 0, so same as start tile)
      // minY = -4, maxY = -1 (row = -1, so minY = -1 * 4 = -4)
      const newTile: PlacedTile = {
        id: "tile-1",
        tileType: "tile-black-2exit-a",
        position: { col: 0, row: -1 },
        rotation: 0,
        edges: {
          north: "unexplored",
          south: "open", // Connected to start tile
          east: "unexplored",
          west: "unexplored",
        },
      };
      
      // Update dungeon state
      dungeon.tiles.push(newTile);
      // Mark start tile's north edge as explored
      dungeon.unexploredEdges = dungeon.unexploredEdges.filter(
        (e) => !(e.tileId === "start-tile" && e.direction === "north")
      );
      // Add unexplored edges for the new tile (north, east, west - south is connected)
      dungeon.unexploredEdges.push(
        { tileId: "tile-1", direction: "north" },
        { tileId: "tile-1", direction: "east" },
        { tileId: "tile-1", direction: "west" }
      );
      
      // Hero is on the new tile's north edge
      // New tile at row -1: x: 0-3, y: -4 to -1
      // North edge is y = -4 (minY)
      const hero: HeroToken = {
        heroId: "quinn",
        position: { x: 1, y: -4 }, // North edge of the new tile
      };
      
      const result = checkExploration(hero, dungeon);
      expect(result).toEqual({ tileId: "tile-1", direction: "north" });
    });

    it("should return null when hero is on newly placed tile but not on an edge", () => {
      // Create a dungeon with start tile and a newly placed tile to the north
      const dungeon = initializeDungeon();
      
      const newTile: PlacedTile = {
        id: "tile-1",
        tileType: "tile-black-2exit-a",
        position: { col: 0, row: -1 },
        rotation: 0,
        edges: {
          north: "unexplored",
          south: "open",
          east: "unexplored",
          west: "unexplored",
        },
      };
      
      dungeon.tiles.push(newTile);
      dungeon.unexploredEdges = dungeon.unexploredEdges.filter(
        (e) => !(e.tileId === "start-tile" && e.direction === "north")
      );
      dungeon.unexploredEdges.push(
        { tileId: "tile-1", direction: "north" },
        { tileId: "tile-1", direction: "east" },
        { tileId: "tile-1", direction: "west" }
      );
      
      // Hero is in the center of the new tile, not on an edge
      // New tile at row -1, col 0: absolute coords x: 0-3, y: -4 to -1
      // Center position would be something like (1, -2) or (2, -3)
      const hero: HeroToken = {
        heroId: "quinn",
        position: { x: 1, y: -2 }, // Center, not on any edge
      };
      
      const result = checkExploration(hero, dungeon);
      expect(result).toBeNull();
    });
  });

  describe("getNewTilePosition", () => {
    const startTile: PlacedTile = {
      id: "start-tile",
      tileType: "start",
      position: { col: 0, row: 0 },
      rotation: 0,
      edges: {
        north: "unexplored",
        south: "unexplored",
        east: "unexplored",
        west: "unexplored",
      },
    };

    it("should return position above for north direction", () => {
      const result = getNewTilePosition(startTile, "north");
      expect(result).toEqual({ col: 0, row: -1 });
    });

    it("should return position below for south direction", () => {
      const result = getNewTilePosition(startTile, "south");
      expect(result).toEqual({ col: 0, row: 1 });
    });

    it("should return position to the right for east direction", () => {
      const result = getNewTilePosition(startTile, "east");
      expect(result).toEqual({ col: 1, row: 0 });
    });

    it("should return position to the left for west direction", () => {
      const result = getNewTilePosition(startTile, "west");
      expect(result).toEqual({ col: -1, row: 0 });
    });
  });

  describe("placeTile", () => {
    it("should create a new tile at the correct position", () => {
      const dungeon = initializeDungeon();
      const edge: TileEdge = { tileId: "start-tile", direction: "north" };
      
      const result = placeTile(edge, "tile-black-2exit-a", dungeon);
      
      expect(result).not.toBeNull();
      expect(result!.position).toEqual({ col: 0, row: -1 });
      expect(result!.tileType).toBe("tile-black-2exit-a");
    });

    it("should set the connecting edge to open", () => {
      const dungeon = initializeDungeon();
      const edge: TileEdge = { tileId: "start-tile", direction: "north" };
      
      const result = placeTile(edge, "tile-black-2exit-a", dungeon);
      
      expect(result).not.toBeNull();
      // When placing north, the new tile's south edge connects
      expect(result!.edges.south).toBe("open");
    });

    it("should return null for unknown tile type", () => {
      const dungeon = initializeDungeon();
      const edge: TileEdge = { tileId: "start-tile", direction: "north" };
      
      const result = placeTile(edge, "unknown-tile", dungeon);
      
      expect(result).toBeNull();
    });

    it("should return null if source tile does not exist", () => {
      const dungeon = initializeDungeon();
      const edge: TileEdge = { tileId: "nonexistent", direction: "north" };
      
      const result = placeTile(edge, "tile-black-2exit-a", dungeon);
      
      expect(result).toBeNull();
    });

    it("should set rotation that aligns opening with south when placing north", () => {
      const dungeon = initializeDungeon();
      const edge: TileEdge = { tileId: "start-tile", direction: "north" };
      
      const result = placeTile(edge, "tile-black-2exit-a", dungeon);
      
      expect(result).not.toBeNull();
      expect(result!.edges.south).toBe('open');  // Connecting edge must be open
      expect([0, 90, 180, 270]).toContain(result!.rotation);  // Must be a valid rotation
    });

    it("should set rotation that aligns opening with north when placing south", () => {
      const dungeon = initializeDungeon();
      const edge: TileEdge = { tileId: "start-tile", direction: "south" };
      
      const result = placeTile(edge, "tile-black-2exit-a", dungeon);
      
      expect(result).not.toBeNull();
      expect(result!.edges.north).toBe('open');  // Connecting edge must be open
      expect([0, 90, 180, 270]).toContain(result!.rotation);  // Must be a valid rotation
    });

    it("should set rotation that aligns opening with west when placing east", () => {
      const dungeon = initializeDungeon();
      const edge: TileEdge = { tileId: "start-tile", direction: "east" };
      
      const result = placeTile(edge, "tile-black-2exit-a", dungeon);
      
      expect(result).not.toBeNull();
      expect(result!.edges.west).toBe('open');  // Connecting edge must be open
      expect([0, 90, 180, 270]).toContain(result!.rotation);  // Must be a valid rotation
    });

    it("should set rotation that aligns opening with east when placing west", () => {
      const dungeon = initializeDungeon();
      const edge: TileEdge = { tileId: "start-tile", direction: "west" };
      
      const result = placeTile(edge, "tile-black-2exit-a", dungeon);
      
      expect(result).not.toBeNull();
      expect(result!.edges.east).toBe('open');  // Connecting edge must be open
      expect([0, 90, 180, 270]).toContain(result!.rotation);  // Must be a valid rotation
    });
  });

  describe("initializeDungeon", () => {
    it("should create a dungeon with the start tile", () => {
      const dungeon = initializeDungeon();
      
      expect(dungeon.tiles).toHaveLength(1);
      expect(dungeon.tiles[0].id).toBe("start-tile");
    });

    it("should have six unexplored edges on the start tile (2 per east/west sub-tile)", () => {
      const dungeon = initializeDungeon();
      
      // Start tile has 6 unexplored edges:
      // - 1 north (spans full width)
      // - 1 south (spans full width)
      // - 2 east (one per sub-tile: north and south)
      // - 2 west (one per sub-tile: north and south)
      expect(dungeon.unexploredEdges).toHaveLength(6);
      expect(dungeon.unexploredEdges).toContainEqual({
        tileId: "start-tile",
        direction: "north",
      });
      expect(dungeon.unexploredEdges).toContainEqual({
        tileId: "start-tile",
        direction: "south",
      });
      expect(dungeon.unexploredEdges).toContainEqual({
        tileId: "start-tile",
        direction: "east",
        subTileId: "start-tile-north",
      });
      expect(dungeon.unexploredEdges).toContainEqual({
        tileId: "start-tile",
        direction: "east",
        subTileId: "start-tile-south",
      });
      expect(dungeon.unexploredEdges).toContainEqual({
        tileId: "start-tile",
        direction: "west",
        subTileId: "start-tile-north",
      });
      expect(dungeon.unexploredEdges).toContainEqual({
        tileId: "start-tile",
        direction: "west",
        subTileId: "start-tile-south",
      });
    });

    it("should start with an empty tile deck", () => {
      const dungeon = initializeDungeon();
      expect(dungeon.tileDeck).toHaveLength(0);
    });
  });

  describe("initializeTileDeck", () => {
    it("should shuffle the tiles", () => {
      const tiles = ["a", "b", "c", "d", "e", "f", "g", "h"];
      // Use a fixed random function for deterministic testing
      let callCount = 0;
      const fixedRandom = () => {
        callCount++;
        return 0.5;
      };
      
      const result = initializeTileDeck([...tiles], fixedRandom);
      
      // Should have same length
      expect(result).toHaveLength(tiles.length);
      // Should contain all tiles
      tiles.forEach((tile) => {
        expect(result).toContain(tile);
      });
    });

    it("should produce different orders with different random seeds", () => {
      const tiles = ["a", "b", "c", "d", "e", "f", "g", "h"];
      
      const result1 = initializeTileDeck([...tiles], () => 0.1);
      const result2 = initializeTileDeck([...tiles], () => 0.9);
      
      // Results should be different (very likely with different seeds)
      expect(result1.join(",")).not.toBe(result2.join(","));
    });
  });

  describe("drawTile", () => {
    it("should draw the first tile from the deck", () => {
      const deck = ["tile-a", "tile-b", "tile-c"];
      
      const result = drawTile(deck);
      
      expect(result.drawnTile).toBe("tile-a");
      expect(result.remainingDeck).toEqual(["tile-b", "tile-c"]);
    });

    it("should return null when deck is empty", () => {
      const deck: string[] = [];
      
      const result = drawTile(deck);
      
      expect(result.drawnTile).toBeNull();
      expect(result.remainingDeck).toEqual([]);
    });

    it("should decrease deck size by one", () => {
      const deck = ["tile-a", "tile-b", "tile-c"];
      
      const result = drawTile(deck);
      
      expect(result.remainingDeck).toHaveLength(2);
    });
  });

  describe("updateDungeonAfterExploration", () => {
    it("should add the new tile to the dungeon", () => {
      const dungeon = initializeDungeon();
      const exploredEdge: TileEdge = { tileId: "start-tile", direction: "north" };
      const newTile: PlacedTile = {
        id: "tile-1",
        tileType: "tile-black-2exit-a",
        position: { col: 0, row: -1 },
        rotation: 0,
        edges: {
          north: "unexplored",
          south: "open",
          east: "unexplored",
          west: "unexplored",
        },
      };
      
      const result = updateDungeonAfterExploration(dungeon, exploredEdge, newTile);
      
      expect(result.tiles).toHaveLength(2);
      expect(result.tiles[1]).toEqual(newTile);
    });

    it("should remove the explored edge from unexplored edges", () => {
      const dungeon = initializeDungeon();
      const exploredEdge: TileEdge = { tileId: "start-tile", direction: "north" };
      const newTile: PlacedTile = {
        id: "tile-1",
        tileType: "tile-black-2exit-a",
        position: { col: 0, row: -1 },
        rotation: 0,
        edges: {
          north: "unexplored",
          south: "open",
          east: "unexplored",
          west: "unexplored",
        },
      };
      
      const result = updateDungeonAfterExploration(dungeon, exploredEdge, newTile);
      
      expect(
        result.unexploredEdges.some(
          (e) => e.tileId === "start-tile" && e.direction === "north"
        )
      ).toBe(false);
    });

    it("should add new unexplored edges from the new tile", () => {
      const dungeon = initializeDungeon();
      const exploredEdge: TileEdge = { tileId: "start-tile", direction: "north" };
      const newTile: PlacedTile = {
        id: "tile-1",
        tileType: "tile-black-2exit-a",
        position: { col: 0, row: -1 },
        rotation: 0,
        edges: {
          north: "unexplored",
          south: "open",
          east: "unexplored",
          west: "unexplored",
        },
      };
      
      const result = updateDungeonAfterExploration(dungeon, exploredEdge, newTile);
      
      // Should have new unexplored edges from tile-1 (north, east, west - not south which is connected)
      expect(
        result.unexploredEdges.some(
          (e) => e.tileId === "tile-1" && e.direction === "north"
        )
      ).toBe(true);
      expect(
        result.unexploredEdges.some(
          (e) => e.tileId === "tile-1" && e.direction === "east"
        )
      ).toBe(true);
      expect(
        result.unexploredEdges.some(
          (e) => e.tileId === "tile-1" && e.direction === "west"
        )
      ).toBe(true);
      // South should NOT be unexplored (it's connected)
      expect(
        result.unexploredEdges.some(
          (e) => e.tileId === "tile-1" && e.direction === "south"
        )
      ).toBe(false);
    });

    it("should update the existing tile's explored edge to open", () => {
      const dungeon = initializeDungeon();
      const exploredEdge: TileEdge = { tileId: "start-tile", direction: "north" };
      const newTile: PlacedTile = {
        id: "tile-1",
        tileType: "tile-black-2exit-a",
        position: { col: 0, row: -1 },
        rotation: 0,
        edges: {
          north: "unexplored",
          south: "open",
          east: "unexplored",
          west: "unexplored",
        },
      };
      
      const result = updateDungeonAfterExploration(dungeon, exploredEdge, newTile);
      
      const startTile = result.tiles.find((t) => t.id === "start-tile");
      expect(startTile?.edges.north).toBe("open");
    });

    it("should only remove the explored sub-tile edge, not all edges with same direction", () => {
      const dungeon = initializeDungeon();
      
      // Exploring the north sub-tile's east edge
      const exploredEdge: TileEdge = { 
        tileId: "start-tile", 
        direction: "east",
        subTileId: "start-tile-north"
      };
      
      const newTile: PlacedTile = {
        id: "tile-1",
        tileType: "tile-black-x2-01",
        position: { col: 1, row: 0 },
        rotation: 0,
        edges: {
          north: "unexplored",
          south: "open",
          east: "unexplored",
          west: "open",
        },
      };
      
      const result = updateDungeonAfterExploration(dungeon, exploredEdge, newTile);
      
      // The north sub-tile's east edge should be removed
      expect(
        result.unexploredEdges.some(
          (e) => e.tileId === "start-tile" && e.direction === "east" && e.subTileId === "start-tile-north"
        )
      ).toBe(false);
      
      // But the south sub-tile's east edge should still be present
      expect(
        result.unexploredEdges.some(
          (e) => e.tileId === "start-tile" && e.direction === "east" && e.subTileId === "start-tile-south"
        )
      ).toBe(true);
      
      // And both west edges should still be present
      expect(
        result.unexploredEdges.some(
          (e) => e.tileId === "start-tile" && e.direction === "west" && e.subTileId === "start-tile-north"
        )
      ).toBe(true);
      expect(
        result.unexploredEdges.some(
          (e) => e.tileId === "start-tile" && e.direction === "west" && e.subTileId === "start-tile-south"
        )
      ).toBe(true);
    });
  });

  describe("shuffleArray", () => {
    it("should return array with same length", () => {
      const array = [1, 2, 3, 4, 5];
      const result = shuffleArray(array);
      expect(result).toHaveLength(array.length);
    });

    it("should contain all original elements", () => {
      const array = [1, 2, 3, 4, 5];
      const result = shuffleArray(array);
      array.forEach((item) => {
        expect(result).toContain(item);
      });
    });

    it("should not modify the original array", () => {
      const array = [1, 2, 3, 4, 5];
      const original = [...array];
      shuffleArray(array);
      expect(array).toEqual(original);
    });
  });

  describe("drawTileFromBottom", () => {
    it("should draw the last tile from the deck", () => {
      const deck = ['tile-a', 'tile-b', 'tile-c'];

      const result = drawTileFromBottom(deck);

      expect(result.drawnTile).toBe('tile-c');
      expect(result.remainingDeck).toEqual(['tile-a', 'tile-b']);
    });

    it("should return null when deck is empty", () => {
      const deck: string[] = [];

      const result = drawTileFromBottom(deck);

      expect(result.drawnTile).toBeNull();
      expect(result.remainingDeck).toEqual([]);
    });

    it("should handle single tile deck", () => {
      const deck = ['tile-a'];

      const result = drawTileFromBottom(deck);

      expect(result.drawnTile).toBe('tile-a');
      expect(result.remainingDeck).toEqual([]);
    });
  });

  describe("moveBottomTileToTop", () => {
    it("should move bottom tile to top of deck", () => {
      const deck = ['tile-a', 'tile-b', 'tile-c'];

      const result = moveBottomTileToTop(deck);

      expect(result).toEqual(['tile-c', 'tile-a', 'tile-b']);
    });

    it("should handle empty deck", () => {
      const deck: string[] = [];

      const result = moveBottomTileToTop(deck);

      expect(result).toEqual([]);
    });

    it("should handle single tile deck", () => {
      const deck = ['tile-a'];

      const result = moveBottomTileToTop(deck);

      expect(result).toEqual(['tile-a']);
    });

    it("should not modify original deck", () => {
      const deck = ['tile-a', 'tile-b', 'tile-c'];
      const original = [...deck];

      moveBottomTileToTop(deck);

      expect(deck).toEqual(original);
    });
  });

  describe("shuffleTileDeck", () => {
    it("should shuffle the tile deck", () => {
      const deck = ['tile-a', 'tile-b', 'tile-c', 'tile-d', 'tile-e'];

      const result1 = shuffleTileDeck(deck, () => 0.1);
      const result2 = shuffleTileDeck(deck, () => 0.9);

      // Different random seeds should produce different orders
      expect(result1.join(',')).not.toBe(result2.join(','));
    });

    it("should maintain all tiles", () => {
      const deck = ['tile-a', 'tile-b', 'tile-c'];

      const result = shuffleTileDeck(deck);

      expect(result).toHaveLength(3);
      expect(result).toContain('tile-a');
      expect(result).toContain('tile-b');
      expect(result).toContain('tile-c');
    });
  });
});
