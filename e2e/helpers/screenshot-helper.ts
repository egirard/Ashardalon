import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface ScreenshotOptions {
  fullPage?: boolean;
  programmaticCheck?: () => Promise<void>;
}

export interface ScreenshotHelper {
  capture(page: Page, description: string, options?: ScreenshotOptions): Promise<void>;
  reset(): void;
  getCounter(): number;
}

/**
 * Creates a screenshot helper for numbered screenshots in E2E tests.
 * Screenshots are captured after programmatic verification passes.
 */
export function createScreenshotHelper(): ScreenshotHelper {
  let counter = 0;

  return {
    async capture(page: Page, description: string, options: ScreenshotOptions = {}) {
      // Run programmatic verification first
      if (options.programmaticCheck) {
        await options.programmaticCheck();
      }

      // Format counter as 3-digit string
      const counterStr = counter.toString().padStart(3, '0');
      const screenshotName = `${counterStr}-${description}`;
      
      // Use Playwright's built-in screenshot comparison
      await expect(page).toHaveScreenshot(`${screenshotName}.png`, {
        fullPage: options.fullPage ?? false,
      });

      counter++;
    },

    reset() {
      counter = 0;
    },

    getCounter() {
      return counter;
    },
  };
}
