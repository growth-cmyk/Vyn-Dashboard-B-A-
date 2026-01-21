import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { PredictionService } from './PredictionService';

const service = new PredictionService();

describe('PredictionService PBT', () => {
  it('Property 10: Stock < ROP always gives Level 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 51, max: 200 }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(50) }),
        (stock, rop, velocity) => {
          const result = service.calculateUrgencyLevel('SKU1', stock, rop, velocity);
          return result.level === 1 && result.label === 'Critical';
        }
      ),
      { numRuns: 100 }
    );
  });
});
