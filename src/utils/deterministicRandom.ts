// Seeded random number generator for consistent demo data
export class DeterministicRandom {
  private seed: number;
  private current: number;

  constructor(seed: string | number = 'default') {
    this.seed = typeof seed === 'string' ? this.stringToSeed(seed) : seed;
    this.current = this.seed;
  }

  private stringToSeed(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Linear Congruential Generator
  next(): number {
    this.current = (this.current * 1664525 + 1013904223) % Math.pow(2, 32);
    return this.current / Math.pow(2, 32);
  }

  // Generate random number between min and max
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  // Generate random integer between min and max (inclusive)
  integer(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  // Pick random element from array
  pick<T>(array: T[]): T {
    return array[this.integer(0, array.length - 1)];
  }

  // Generate random boolean with given probability
  boolean(probability: number = 0.5): boolean {
    return this.next() < probability;
  }
}

export const deterministicRandom = new DeterministicRandom();

// Helper function to create seeded random for specific contexts
export function createSeededRandom(seed: string): DeterministicRandom {
  return new DeterministicRandom(seed);
}