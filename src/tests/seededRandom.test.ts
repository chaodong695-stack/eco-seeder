import { describe, it, expect } from 'vitest';
import { hashSeed, createSeededRandom, buildSeed, seededPick, seededIntInRange, seededWeightedPick } from '@/domain/weather/seededRandom';

describe('seededRandom', () => {
  describe('hashSeed', () => {
    it('produces a number for a string', () => {
      const hash = hashSeed('test');
      expect(typeof hash).toBe('number');
      expect(hash).toBeGreaterThanOrEqual(0);
    });

    it('produces different hashes for different strings', () => {
      expect(hashSeed('a')).not.toBe(hashSeed('b'));
    });

    it('produces same hash for same string', () => {
      expect(hashSeed('hello')).toBe(hashSeed('hello'));
    });
  });

  describe('createSeededRandom', () => {
    it('produces deterministic sequence for same seed', () => {
      const rng1 = createSeededRandom(12345);
      const rng2 = createSeededRandom(12345);
      const seq1 = [rng1(), rng1(), rng1()];
      const seq2 = [rng2(), rng2(), rng2()];
      expect(seq1).toEqual(seq2);
    });

    it('produces different sequences for different seeds', () => {
      const rng1 = createSeededRandom(12345);
      const rng2 = createSeededRandom(54321);
      const seq1 = [rng1(), rng1(), rng1()];
      const seq2 = [rng2(), rng2(), rng2()];
      expect(seq1).not.toEqual(seq2);
    });

    it('returns values in [0, 1)', () => {
      const rng = createSeededRandom(999);
      for (let i = 0; i < 100; i++) {
        const v = rng();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });
  });

  describe('buildSeed', () => {
    it('combines parts into a number', () => {
      const seed = buildSeed('player1', '2024-01-01', 'map1', 'v1');
      expect(typeof seed).toBe('number');
      expect(seed).toBeGreaterThanOrEqual(0);
    });

    it('same parts produce same seed', () => {
      const s1 = buildSeed('player1', '2024-01-01', 'map1', 'v1');
      const s2 = buildSeed('player1', '2024-01-01', 'map1', 'v1');
      expect(s1).toBe(s2);
    });

    it('different parts produce different seeds', () => {
      const s1 = buildSeed('player1', '2024-01-01', 'map1', 'v1');
      const s2 = buildSeed('player1', '2024-01-02', 'map1', 'v1');
      expect(s1).not.toBe(s2);
    });
  });

  describe('seededPick', () => {
    it('picks from array deterministically', () => {
      const rng = createSeededRandom(42);
      const arr = ['a', 'b', 'c', 'd'];
      const pick1 = seededPick(rng, arr);
      const rng2 = createSeededRandom(42);
      const pick2 = seededPick(rng2, arr);
      expect(pick1).toBe(pick2);
      expect(arr).toContain(pick1);
    });
  });

  describe('seededIntInRange', () => {
    it('returns integer within range', () => {
      const rng = createSeededRandom(100);
      for (let i = 0; i < 100; i++) {
        const v = seededIntInRange(rng, 5, 10);
        expect(v).toBeGreaterThanOrEqual(5);
        expect(v).toBeLessThanOrEqual(10);
        expect(Number.isInteger(v)).toBe(true);
      }
    });
  });

  describe('seededWeightedPick', () => {
    it('picks according to weights', () => {
      const rng = createSeededRandom(42);
      const result = seededWeightedPick(rng, { a: 100, b: 0 });
      expect(result).toBe('a');
    });

    it('returns one of the keys', () => {
      const rng = createSeededRandom(42);
      const result = seededWeightedPick(rng, { a: 10, b: 10, c: 10 });
      expect(['a', 'b', 'c']).toContain(result);
    });

    it('is deterministic for same seed', () => {
      const rng1 = createSeededRandom(77);
      const rng2 = createSeededRandom(77);
      const r1 = seededWeightedPick(rng1, { a: 10, b: 20, c: 30 });
      const r2 = seededWeightedPick(rng2, { a: 10, b: 20, c: 30 });
      expect(r1).toBe(r2);
    });
  });
});
