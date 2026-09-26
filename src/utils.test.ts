import { describe, it, expect } from 'vitest';
import { isEven } from './utils';

describe('utils', () => {
  describe('isEven', () => {
    it('should return true for positive even numbers', () => {
      expect(isEven(2)).toBe(true);
      expect(isEven(4)).toBe(true);
      expect(isEven(100)).toBe(true);
    });

    it('should return false for positive odd numbers', () => {
      expect(isEven(1)).toBe(false);
      expect(isEven(3)).toBe(false);
      expect(isEven(99)).toBe(false);
    });

    it('should return true for zero', () => {
      expect(isEven(0)).toBe(true);
    });

    it('should return true for negative even numbers', () => {
      expect(isEven(-2)).toBe(true);
      expect(isEven(-4)).toBe(true);
    });

    it('should return false for negative odd numbers', () => {
      expect(isEven(-1)).toBe(false);
      expect(isEven(-3)).toBe(false);
    });
  });
});
