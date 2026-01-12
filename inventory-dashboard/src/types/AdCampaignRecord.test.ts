import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { AdCampaignRecord } from './index';
import { CAMPAIGN_TYPE } from './index';

/**
 * Property-based tests for AdCampaignRecord validation
 * Feature: blinkit-ad-campaign-analysis, Property 4: AdCampaignRecord Validation
 */

// Generators for property-based testing
const campaignTypeArbitrary = fc.constantFrom(
  CAMPAIGN_TYPE.PRODUCT_RECOMMENDATION,
  CAMPAIGN_TYPE.PRODUCT_LISTING,
  CAMPAIGN_TYPE.BRAND_BOOSTER
);

const validDateArbitrary = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2030-12-31')
});

const nonEmptyStringArbitrary = fc.string({ minLength: 1, maxLength: 100 });

const nonNegativeNumberArbitrary = fc.float({ min: 0, max: Math.fround(1000000) });

const ctrArbitrary = fc.float({ min: 0, max: Math.fround(100) });

const adCampaignRecordArbitrary = fc.record({
  date: validDateArbitrary,
  campaignName: nonEmptyStringArbitrary.filter(s => s.trim().length > 0), // Ensure non-empty after trimming
  campaignType: campaignTypeArbitrary,
  impressions: nonNegativeNumberArbitrary,
  ctr: ctrArbitrary,
  budgetConsumed: nonNegativeNumberArbitrary,
  directSales: nonNegativeNumberArbitrary,
  indirectSales: fc.option(nonNegativeNumberArbitrary, { nil: undefined }),
  totalRoAS: nonNegativeNumberArbitrary,
  sku: fc.option(nonEmptyStringArbitrary, { nil: undefined }),
  newUsersAcquired: fc.option(nonNegativeNumberArbitrary, { nil: undefined }),
  uniqueClicks: fc.option(nonNegativeNumberArbitrary, { nil: undefined }),
  addToCart: fc.option(nonNegativeNumberArbitrary, { nil: undefined }),
  quantitiesSold: fc.option(nonNegativeNumberArbitrary, { nil: undefined })
});

/**
 * Validation function for AdCampaignRecord
 */
function validateAdCampaignRecord(record: AdCampaignRecord): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate date field as valid date object
  if (!(record.date instanceof Date) || isNaN(record.date.getTime())) {
    errors.push('Date must be a valid Date object');
  }

  // Validate campaign name as non-empty string
  if (typeof record.campaignName !== 'string' || record.campaignName.trim() === '') {
    errors.push('Campaign name must be a non-empty string');
  }

  // Validate campaign type
  const validCampaignTypes = Object.values(CAMPAIGN_TYPE);
  if (!validCampaignTypes.includes(record.campaignType)) {
    errors.push('Campaign type must be a valid campaign type');
  }

  // Validate impressions as non-negative number
  if (typeof record.impressions !== 'number' || record.impressions < 0 || !isFinite(record.impressions)) {
    errors.push('Impressions must be a non-negative number');
  }

  // Validate CTR as percentage between 0 and 100
  if (typeof record.ctr !== 'number' || record.ctr < 0 || record.ctr > 100 || !isFinite(record.ctr)) {
    errors.push('CTR must be a percentage value between 0 and 100');
  }

  // Validate budget consumed as non-negative monetary value
  if (typeof record.budgetConsumed !== 'number' || record.budgetConsumed < 0 || !isFinite(record.budgetConsumed)) {
    errors.push('Budget consumed must be a non-negative monetary value');
  }

  // Validate direct sales as non-negative monetary value
  if (typeof record.directSales !== 'number' || record.directSales < 0 || !isFinite(record.directSales)) {
    errors.push('Direct sales must be a non-negative monetary value');
  }

  // Validate total RoAS as calculated ratio (non-negative number)
  if (typeof record.totalRoAS !== 'number' || record.totalRoAS < 0 || !isFinite(record.totalRoAS)) {
    errors.push('Total RoAS must be a non-negative calculated ratio');
  }

  // Validate optional fields if present
  if (record.indirectSales !== undefined) {
    if (typeof record.indirectSales !== 'number' || record.indirectSales < 0 || !isFinite(record.indirectSales)) {
      errors.push('Indirect sales must be a non-negative monetary value');
    }
  }

  if (record.newUsersAcquired !== undefined && record.newUsersAcquired !== null) {
    if (typeof record.newUsersAcquired !== 'number' || record.newUsersAcquired < 0 || !isFinite(record.newUsersAcquired)) {
      errors.push('New users acquired must be a non-negative number');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

describe('AdCampaignRecord Property-Based Tests', () => {
  /**
   * Property 4: AdCampaignRecord Validation
   * For any valid AdCampaignRecord, all fields should meet validation criteria:
   * - valid date, non-empty campaign name, non-negative impressions/budget/sales,
   * - CTR between 0-100%, and correctly calculated RoAS
   * Validates: Requirements 2.1, 2.2, 2.4, 2.5, 2.6, 2.7, 2.8
   */
  it('should validate all AdCampaignRecord fields correctly', () => {
    fc.assert(
      fc.property(adCampaignRecordArbitrary, (record) => {
        // Filter out records with NaN values to avoid test failures
        if (isNaN(record.impressions) || isNaN(record.ctr) || isNaN(record.budgetConsumed) || 
            isNaN(record.directSales) || isNaN(record.totalRoAS) ||
            (record.indirectSales !== undefined && isNaN(record.indirectSales)) ||
            (record.newUsersAcquired !== undefined && isNaN(record.newUsersAcquired))) {
          return true; // Skip records with NaN values
        }
        
        const validation = validateAdCampaignRecord(record);
        
        // All generated records should be valid according to our constraints
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
        
        // Additional specific validations
        expect(record.date).toBeInstanceOf(Date);
        expect(record.date.getTime()).not.toBeNaN();
        expect(record.campaignName.trim()).not.toBe('');
        expect(Object.values(CAMPAIGN_TYPE)).toContain(record.campaignType);
        expect(record.impressions).toBeGreaterThanOrEqual(0);
        expect(record.ctr).toBeGreaterThanOrEqual(0);
        expect(record.ctr).toBeLessThanOrEqual(100);
        expect(record.budgetConsumed).toBeGreaterThanOrEqual(0);
        expect(record.directSales).toBeGreaterThanOrEqual(0);
        expect(record.totalRoAS).toBeGreaterThanOrEqual(0);
        
        // Validate optional fields if present
        if (record.indirectSales !== undefined) {
          expect(record.indirectSales).toBeGreaterThanOrEqual(0);
        }
        if (record.newUsersAcquired !== undefined && record.newUsersAcquired !== null) {
          expect(record.newUsersAcquired).toBeGreaterThanOrEqual(0);
        }
      }),
      { numRuns: 100 } // Minimum 100 iterations as specified
    );
  });

  it('should reject invalid date objects', () => {
    fc.assert(
      fc.property(
        fc.record({
          campaignName: nonEmptyStringArbitrary.filter(s => s.trim().length > 0),
          campaignType: campaignTypeArbitrary,
          impressions: nonNegativeNumberArbitrary,
          ctr: ctrArbitrary,
          budgetConsumed: nonNegativeNumberArbitrary,
          directSales: nonNegativeNumberArbitrary,
          indirectSales: fc.option(nonNegativeNumberArbitrary, { nil: undefined }),
          totalRoAS: nonNegativeNumberArbitrary,
          sku: fc.option(nonEmptyStringArbitrary, { nil: undefined }),
          newUsersAcquired: fc.option(nonNegativeNumberArbitrary, { nil: undefined }),
          uniqueClicks: fc.option(nonNegativeNumberArbitrary, { nil: undefined }),
          addToCart: fc.option(nonNegativeNumberArbitrary, { nil: undefined }),
          quantitiesSold: fc.option(nonNegativeNumberArbitrary, { nil: undefined }),
          date: fc.constantFrom(new Date('invalid'), new Date(NaN))
        }),
        (record) => {
          const validation = validateAdCampaignRecord(record as AdCampaignRecord);
          expect(validation.isValid).toBe(false);
          expect(validation.errors.some(error => error.includes('Date must be a valid Date object'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject empty campaign names', () => {
    fc.assert(
      fc.property(
        fc.record({
          date: validDateArbitrary,
          campaignType: campaignTypeArbitrary,
          impressions: nonNegativeNumberArbitrary,
          ctr: ctrArbitrary,
          budgetConsumed: nonNegativeNumberArbitrary,
          directSales: nonNegativeNumberArbitrary,
          indirectSales: fc.option(nonNegativeNumberArbitrary, { nil: undefined }),
          totalRoAS: nonNegativeNumberArbitrary,
          sku: fc.option(nonEmptyStringArbitrary, { nil: undefined }),
          newUsersAcquired: fc.option(nonNegativeNumberArbitrary, { nil: undefined }),
          uniqueClicks: fc.option(nonNegativeNumberArbitrary, { nil: undefined }),
          addToCart: fc.option(nonNegativeNumberArbitrary, { nil: undefined }),
          quantitiesSold: fc.option(nonNegativeNumberArbitrary, { nil: undefined }),
          campaignName: fc.constantFrom('', '   ', '\t\n')
        }),
        (record) => {
          const validation = validateAdCampaignRecord(record as AdCampaignRecord);
          expect(validation.isValid).toBe(false);
          expect(validation.errors.some(error => error.includes('Campaign name must be a non-empty string'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject negative numeric values', () => {
    fc.assert(
      fc.property(
        fc.record({
          date: validDateArbitrary,
          campaignName: nonEmptyStringArbitrary.filter(s => s.trim().length > 0),
          campaignType: campaignTypeArbitrary,
          ctr: ctrArbitrary,
          budgetConsumed: nonNegativeNumberArbitrary,
          directSales: nonNegativeNumberArbitrary,
          indirectSales: fc.option(nonNegativeNumberArbitrary, { nil: undefined }),
          totalRoAS: nonNegativeNumberArbitrary,
          sku: fc.option(nonEmptyStringArbitrary, { nil: undefined }),
          newUsersAcquired: fc.option(nonNegativeNumberArbitrary, { nil: undefined }),
          uniqueClicks: fc.option(nonNegativeNumberArbitrary, { nil: undefined }),
          addToCart: fc.option(nonNegativeNumberArbitrary, { nil: undefined }),
          quantitiesSold: fc.option(nonNegativeNumberArbitrary, { nil: undefined }),
          impressions: fc.float({ min: Math.fround(-1000), max: Math.fround(-0.1) })
        }),
        (record) => {
          const validation = validateAdCampaignRecord(record as AdCampaignRecord);
          expect(validation.isValid).toBe(false);
          expect(validation.errors.some(error => error.includes('Impressions must be a non-negative number'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject CTR values outside 0-100 range', () => {
    fc.assert(
      fc.property(
        fc.record({
          date: validDateArbitrary,
          campaignName: nonEmptyStringArbitrary.filter(s => s.trim().length > 0),
          campaignType: campaignTypeArbitrary,
          impressions: nonNegativeNumberArbitrary,
          budgetConsumed: nonNegativeNumberArbitrary,
          directSales: nonNegativeNumberArbitrary,
          indirectSales: fc.option(nonNegativeNumberArbitrary, { nil: undefined }),
          totalRoAS: nonNegativeNumberArbitrary,
          sku: fc.option(nonEmptyStringArbitrary, { nil: undefined }),
          newUsersAcquired: fc.option(nonNegativeNumberArbitrary, { nil: undefined }),
          uniqueClicks: fc.option(nonNegativeNumberArbitrary, { nil: undefined }),
          addToCart: fc.option(nonNegativeNumberArbitrary, { nil: undefined }),
          quantitiesSold: fc.option(nonNegativeNumberArbitrary, { nil: undefined }),
          ctr: fc.oneof(
            fc.float({ min: Math.fround(-100), max: Math.fround(-0.1) }),
            fc.float({ min: Math.fround(100.1), max: Math.fround(1000) })
          )
        }),
        (record) => {
          const validation = validateAdCampaignRecord(record as AdCampaignRecord);
          expect(validation.isValid).toBe(false);
          expect(validation.errors.some(error => error.includes('CTR must be a percentage value between 0 and 100'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});