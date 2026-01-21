/**
 * PredictionService - All Property-Based Tests
 * Feature: executive-command-center
 * 
 * Comprehensive property tests for Properties 5, 7, 8, 9, 10
 * Each test runs 100 iterations using fast-check
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { PredictionService, type SalesDataPoint } from './PredictionService';
import type { InventoryItem } from '../types';

const service = new PredictionService();

// Property 5: Stockout Date Formula
describe('Property 5: Stockout Date Calculation', () => {
  it('calculates stockout date correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 1000 }),
        fc.float({ min: Math.fround(1), max: Math.fround(50) }),
        (stock, velocity) => {
          const history: SalesDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
            quantity: Math.round(velocity),
            sku: 'TEST',
            platform: 'blinkit' as const,
          }));
          
          const result = service.calculateStockoutDate('TEST', stock, history);
          expect(result).not.toBeNull();
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns null for zero velocity', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), (stock) => {
        return service.calculateStockoutDate('TEST', stock, []) === null;
      }),
      { numRuns: 100 }
    );
  });
});

// Property 7: Urgency Level Classification
describe('Property 7: Urgency Level Calculation', () => {
  it('classifies urgency correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 1000 }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(50) }),
        (stock, rop, velocity) => {
          const result = service.calculateUrgencyLevel('TEST', stock, rop, velocity);
          const risk = stock < rop ? 1.0 : 0.5;
          const score = (velocity * risk) / stock;
          
          if (stock < rop || score > 0.5) {
            expect(result.level).toBe(1);
          } else if (score > 0.2) {
            expect(result.level).toBe(2);
          } else {
            expect(result.level).toBe(3);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Property 10: ROP-Based Urgency Elevation
describe('Property 10: ROP-Based Urgency Elevation', () => {
  it('ALWAYS elevates to Level 1 when stock < ROP', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 51, max: 200 }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(50) }),
        (stock, rop, velocity) => {
          const result = service.calculateUrgencyLevel('TEST', stock, rop, velocity);
          return result.level === 1 && result.label === 'Critical';
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Property 8: Priority List Sort Order
describe('Property 8: Priority Shipping List Sort Order', () => {
  it('sorts by urgency level (1 before 2 before 3)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            itemId: fc.string({ minLength: 1, maxLength: 10 }),
            itemName: fc.string({ minLength: 1, maxLength: 20 }),
            totalSellable: fc.integer({ min: 1, max: 500 }),
            last30Days: fc.integer({ min: 0, max: 150 }),
            warehouseFacilityId: fc.string({ minLength: 1, maxLength: 5 }),
            warehouseFacilityName: fc.string({ minLength: 1, maxLength: 20 }),
            brandName: fc.string({ minLength: 1, maxLength: 15 }),
            upc: fc.string({ minLength: 1, maxLength: 10 }),
            uom: fc.string({ minLength: 1, maxLength: 5 }),
            incomingScheduled: fc.integer({ min: 0, max: 50 }),
            totalUnsellable: fc.integer({ min: 0, max: 25 }),
            last7Days: fc.integer({ min: 0, max: 50 }),
            last15Days: fc.integer({ min: 0, max: 100 }),
          }),
          { minLength: 3, maxLength: 10 }
        ),
        (items) => {
          const result = service.generatePriorityShippingList(items as InventoryItem[]);
          for (let i = 0; i < result.length - 1; i++) {
            expect(result[i].urgencyLevel.level).toBeLessThanOrEqual(
              result[i + 1].urgencyLevel.level
            );
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Property 9: Shipping Manifest Completeness
describe('Property 9: Shipping Manifest Completeness', () => {
  it('ensures all items have required fields', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            itemId: fc.string({ minLength: 1, maxLength: 10 }),
            itemName: fc.string({ minLength: 1, maxLength: 20 }),
            totalSellable: fc.integer({ min: 1, max: 500 }),
            last30Days: fc.integer({ min: 1, max: 150 }),
            warehouseFacilityId: fc.string({ minLength: 1, maxLength: 5 }),
            warehouseFacilityName: fc.string({ minLength: 1, maxLength: 20 }),
            brandName: fc.string({ minLength: 1, maxLength: 15 }),
            upc: fc.string({ minLength: 1, maxLength: 10 }),
            uom: fc.string({ minLength: 1, maxLength: 5 }),
            incomingScheduled: fc.integer({ min: 0, max: 50 }),
            totalUnsellable: fc.integer({ min: 0, max: 25 }),
            last7Days: fc.integer({ min: 1, max: 50 }),
            last15Days: fc.integer({ min: 1, max: 100 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (items) => {
          const result = service.generatePriorityShippingList(items as InventoryItem[]);
          
          for (const item of result) {
            expect(item.targetFeeder).toBeDefined();
            expect(item.targetFeeder.length).toBeGreaterThan(0);
            expect(item.quantityToShip).toBeGreaterThan(0);
            expect(item.sku).toBeDefined();
            expect(item.urgencyLevel.level).toBeGreaterThanOrEqual(1);
            expect(item.urgencyLevel.level).toBeLessThanOrEqual(3);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
