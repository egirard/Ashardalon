import type { EdgePosition } from './store/heroesSlice';

/**
 * Resolve an asset path relative to the base URL.
 * In development, base is typically '/', in production on GitHub Pages it's '/Ashardalon/'.
 * @param path - The asset path relative to the public folder (e.g., 'assets/Hero_Cleric_Quinn.png')
 * @returns The full path including the base URL
 */
export function assetPath(path: string): string {
  const base = import.meta.env.BASE_URL;
  // Remove leading slash from path if present, and ensure base ends with slash
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const cleanBase = base.endsWith('/') ? base : base + '/';
  return cleanBase + cleanPath;
}

/**
 * Get the rotation angle for UI elements based on the player's edge position.
 * This ensures UI modals and overlays face the player at their physical position around the table.
 * @param edge - The edge position of the player (bottom, top, left, right)
 * @returns The rotation angle in degrees
 */
export function getEdgeRotation(edge: EdgePosition | undefined): number {
  switch (edge) {
    case 'top':
      return 180;
    case 'left':
      return 90;
    case 'right':
      return -90;
    case 'bottom':
    default:
      return 0;
  }
}
