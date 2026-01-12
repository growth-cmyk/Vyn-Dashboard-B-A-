import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { MarketingService } from './MarketingService';
import type { AdCampaignRecord } from '../types';
import { CAMPAIGN_TYPE, STOCK_STATUS, STRATEGIC_ACTION } from '../types';

/**
 * Property-based tests for MarketingService
 * Feature: blinkit-ad-campaign-analysis
 */

// Generators for property-based testing
const campaignTypeArbitrary = fc.constantFrom(
  CAMPAIGN_TYPE.PRODUCT_RECOMMENDATION,
  CAMPAIGN_TYPE.PRODUCT_LISTING,
  CAMPAIGN_TYPE.BRAND_BOOSTER
);

const adCampaignRecordArbitrary = fc.record({
  date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
  campaignName: fc.string({ minLength: 1, maxLength: 50 }),
  campaignType: campaignTypeArbitrary,
  impressions: fc.float({ min: 0, max: Math.fround(1000000) }),
  ctr: fc.float({ min: 0, max: Math.fround(100) }),
  budgetConsumed: fc.float({ min: 0, max: Math.fround(100000) }),
  directSales: fc.float({ min: 0, max: Math.fround(200000) }),
  indirectSales: fc.option(fc.float({ min: 0, max: Math.fround(100000) }), { nil: undefined }),
  totalRoAS: fc.float({ min: 0, max: Math.fround(10) }),
  sku: fc.option(fc.string({ minLength: 3, maxLength: 20 }), { nil: undefined }),
  newUsersAcquired: fc.option(fc.integer({ min: 0, max: 1000 }), { nil: undefined }),
  uniqueClicks: fc.option(fc.integer({ min: 0, max: 50000 }), { nil: undefined }),
  addToCart: fc.option(fc.integer({ min: 0, max: 10000 }), { nil: undefined }),
  quantitiesSold: fc.option(fc.integer({ min: 0, max: 5000 }), { nil: undefined })
});

const inventoryItemArbitrary = fc.record({
  itemId: fc.string({ minLength: 3, maxLength: 20 }),
  itemName: fc.string({ minLength: 1, maxLength: 50 }),
  brandName: fc.string({ minLength: 1, maxLength: 30 }),
  upc: fc.string({ minLength: 0, maxLength: 20 }),
  uom: fc.string({ minLength: 0, maxLength: 10 }),
  warehouseFacilityId: fc.string({ minLength: 1, maxLength: 20 }),
  warehouseFacilityName: fc.string({ minLength: 1, maxLength: 50 }),
  totalSellable: fc.float({ min: 0, max: Math.fround(10000) }),
  incomingScheduled: fc.float({ min: 0, max: Math.fround(5000) }),
  totalUnsellable: fc.float({ min: 0, max: Math.fround(1000) }),
  last7Days: fc.float({ min: 0, max: Math.fround(1000) }),
  last15Days: fc.float({ min: 0, max: Math.fround(2000) }),
  last30Days: fc.float({ min: 0, max: Math.fround(4000) })
});

describe('MarketingService Property Tests', () => {
  /**
   * Property 5: KPI Calculation Accuracy
   * For any set of campaign records, Total Ad Spend should equal sum of Budget Consumed,
   * Total Ad Sales should equal sum of Direct + Indirect Sales, and Average RoAS should
   * be correctly calculated from all campaigns
   * Validates: Requirements 4.1, 4.2, 4.3, 4.4
   */
  it('should calculate KPI metrics accurately', () => {
    fc.assert(
      fc.property(
        fc.array(adCampaignRecordArbitrary, { minLength: 1, maxLength: 20 }),
        (campaigns) => {
          // Filter out campaigns with NaN values to avoid test failures
          const validCampaigns = campaigns.filter(c => 
            !isNaN(c.budgetConsumed) && 
            !isNaN(c.directSales) && 
            !isNaN(c.impressions) && 
            !isNaN(c.ctr) &&
            (!c.indirectSales || !isNaN(c.indirectSales))
          );
          
          if (validCampaigns.length === 0) return true; // Skip if no valid campaigns
          
          const kpis = MarketingService.aggregateKPIMetrics(validCampaigns);
          
          // Total Ad Spend should equal sum of Budget Consumed
          const expectedTotalSpend = validCampaigns.reduce((sum, c) => sum + c.budgetConsumed, 0);
          expect(kpis.totalAdSpend).toBeCloseTo(expectedTotalSpend, 2);
          
          // Total Ad Sales should equal sum of Direct + Indirect Sales
          const expectedTotalSales = validCampaigns.reduce((sum, c) => 
            sum + c.directSales + (c.indirectSales || 0), 0
          );
          expect(kpis.totalAdSales).toBeCloseTo(expectedTotalSales, 2);
          
          // Campaign count should match array length
          expect(kpis.campaignCount).toBe(validCampaigns.length);
          
          // New Customer Acquisition should only include listing and recommendation campaigns
          const expectedNewCustomers = validCampaigns
            .filter(c => c.campaignType === 'Product Listing' || c.campaignType === 'Product Recommendation')
            .reduce((sum, c) => sum + (c.newUsersAcquired || 0), 0);
          expect(kpis.newCustomerAcquisition).toBe(expectedNewCustomers);
          
          // Total impressions should equal sum of all impressions
          const expectedImpressions = validCampaigns.reduce((sum, c) => sum + c.impressions, 0);
          expect(kpis.totalImpressions).toBeCloseTo(expectedImpressions, 2);
          
          // Average RoAS should be weighted by spend
          if (expectedTotalSpend > 0) {
            let weightedRoASSum = 0;
            let totalSpendForRoAS = 0;
            
            validCampaigns.forEach(campaign => {
              if (campaign.budgetConsumed > 0) {
                const campaignRoAS = MarketingService.calculateRoAS(campaign);
                weightedRoASSum += campaignRoAS * campaign.budgetConsumed;
                totalSpendForRoAS += campaign.budgetConsumed;
              }
            });
            
            const expectedAvgRoAS = totalSpendForRoAS > 0 ? weightedRoASSum / totalSpendForRoAS : 0;
            expect(kpis.averageRoAS).toBeCloseTo(expectedAvgRoAS, 2);
          } else {
            expect(kpis.averageRoAS).toBe(0);
          }
          
          // Top performing campaign should be valid
          expect(typeof kpis.topPerformingCampaign).toBe('string');
          if (validCampaigns.length > 0) {
            const campaignNames = validCampaigns.map(c => c.campaignName);
            expect(campaignNames).toContain(kpis.topPerformingCampaign);
          }
          
          // Overall CTR should be calculated correctly
          if (expectedImpressions > 0) {
            const expectedClicks = validCampaigns.reduce((sum, c) => 
              sum + (c.uniqueClicks || 0), 0
            );
            const expectedCTR = (expectedClicks / expectedImpressions) * 100;
            expect(kpis.overallCTR).toBeCloseTo(expectedCTR, 2);
          } else {
            expect(kpis.overallCTR).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6: Strategic Recommendation Logic
   * For any SKU with high ad spend, if inventory status is "Flash Promo" then recommendation
   * should be "High ROI Opportunity: Scale Ads", if status is "Restock Now" then recommendation
   * should be "Pause Ads: Low Inventory Risk"
   * Validates: Requirements 6.2, 6.3
   */
  it('should generate correct strategic recommendations based on spend and inventory status', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100000 }), // Ad spend
        fc.constantFrom(
          STOCK_STATUS.OUT_OF_STOCK,
          STOCK_STATUS.UNDERSTOCK,
          STOCK_STATUS.HEALTHY,
          STOCK_STATUS.OVERSTOCK,
          STOCK_STATUS.EXPIRY_RISK
        ),
        (adSpend, stockStatus) => {
          const recommendation = MarketingService.getStrategicRecommendation(adSpend, stockStatus);
          
          // Verify recommendation is valid
          expect(Object.values(STRATEGIC_ACTION)).toContain(recommendation);
          
          const highSpendThreshold = 10000;
          const isHighSpend = adSpend >= highSpendThreshold;
          
          // Test specific business logic
          switch (stockStatus) {
            case STOCK_STATUS.OUT_OF_STOCK:
              expect(recommendation).toBe(STRATEGIC_ACTION.PAUSE_ADS);
              break;
              
            case STOCK_STATUS.UNDERSTOCK:
              // ENHANCED: Always pause for understock (< 18 days) regardless of spend
              expect(recommendation).toBe(STRATEGIC_ACTION.PAUSE_ADS);
              break;
              
            case STOCK_STATUS.HEALTHY:
              if (isHighSpend) {
                expect(recommendation).toBe(STRATEGIC_ACTION.OPTIMIZE);
              } else {
                expect(recommendation).toBe(STRATEGIC_ACTION.MONITOR);
              }
              break;
              
            case STOCK_STATUS.OVERSTOCK:
            case STOCK_STATUS.EXPIRY_RISK:
              expect(recommendation).toBe(STRATEGIC_ACTION.SCALE_ADS);
              break;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7: Ad-Inventory Sync Completeness
   * For any generated sync table, each row should contain SKU identifier, current inventory status,
   * ad spend amount, and strategic recommendation
   * Validates: Requirements 6.1, 6.4
   */
  it('should generate complete ad-inventory sync items with all required fields', () => {
    fc.assert(
      fc.property(
        fc.array(adCampaignRecordArbitrary, { minLength: 1, maxLength: 10 }),
        fc.array(inventoryItemArbitrary, { minLength: 1, maxLength: 10 }),
        (campaigns, inventory) => {
          // Filter out inventory items with empty IDs
          const validInventory = inventory.filter(item => item.itemId.trim().length > 0);
          if (validInventory.length === 0) return true; // Skip if no valid inventory
          
          // Ensure some campaigns have SKUs that match inventory
          const campaignsWithMatchingSku = campaigns.map((campaign, index) => ({
            ...campaign,
            sku: validInventory[index % validInventory.length].itemId.toUpperCase()
          }));
          
          const syncItems = MarketingService.generateAdInventorySync(campaignsWithMatchingSku, validInventory);
          
          // Should generate sync items
          expect(Array.isArray(syncItems)).toBe(true);
          
          // If no campaigns have valid SKUs, sync items could be empty
          if (syncItems.length === 0) return true;
          
          // Each sync item should have all required fields
          syncItems.forEach(item => {
            // SKU identifier
            expect(typeof item.sku).toBe('string');
            expect(item.sku.trim()).not.toBe('');
            
            // Campaign name
            expect(typeof item.campaignName).toBe('string');
            expect(item.campaignName.trim()).not.toBe('');
            
            // Ad spend amount
            expect(typeof item.adSpend).toBe('number');
            expect(item.adSpend).toBeGreaterThanOrEqual(0);
            
            // Inventory status
            expect(Object.values(STOCK_STATUS)).toContain(item.inventoryStatus);
            
            // Strategic recommendation
            expect(Object.values(STRATEGIC_ACTION)).toContain(item.strategicAction);
            
            // Recommended action text
            expect(typeof item.recommendedAction).toBe('string');
            expect(item.recommendedAction.trim()).not.toBe('');
            
            // Urgency level
            expect(['low', 'medium', 'high', 'critical']).toContain(item.urgencyLevel);
          });
          
          // Should be sorted by urgency and spend (most critical first)
          for (let i = 1; i < syncItems.length; i++) {
            const prev = syncItems[i - 1];
            const curr = syncItems[i];
            
            const urgencyOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
            const prevUrgency = urgencyOrder[prev.urgencyLevel];
            const currUrgency = urgencyOrder[curr.urgencyLevel];
            
            // Should be sorted by urgency first, then by spend
            if (prevUrgency === currUrgency) {
              expect(prev.adSpend).toBeGreaterThanOrEqual(curr.adSpend);
            } else {
              expect(prevUrgency).toBeGreaterThanOrEqual(currUrgency);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test RoAS calculation accuracy
   */
  it('should calculate RoAS correctly', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.01), max: Math.fround(100000) }), // Budget consumed (non-zero)
        fc.float({ min: 0, max: Math.fround(200000) }), // Direct sales
        fc.option(fc.float({ min: 0, max: Math.fround(100000) }), { nil: undefined }), // Indirect sales
        (budgetConsumed, directSales, indirectSales) => {
          // Skip if any values are NaN
          if (isNaN(budgetConsumed) || isNaN(directSales) || (indirectSales && isNaN(indirectSales))) {
            return true;
          }
          
          const campaign: AdCampaignRecord = {
            date: new Date(),
            campaignName: 'Test Campaign',
            campaignType: CAMPAIGN_TYPE.PRODUCT_RECOMMENDATION,
            impressions: 1000,
            ctr: 2.5,
            budgetConsumed,
            directSales,
            indirectSales,
            totalRoAS: 0
          };
          
          const calculatedRoAS = MarketingService.calculateRoAS(campaign);
          const expectedRoAS = (directSales + (indirectSales || 0)) / budgetConsumed;
          
          expect(calculatedRoAS).toBeCloseTo(expectedRoAS, 6);
          expect(calculatedRoAS).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test zero budget handling
   */
  it('should handle zero budget gracefully', () => {
    const campaign: AdCampaignRecord = {
      date: new Date(),
      campaignName: 'Zero Budget Campaign',
      campaignType: CAMPAIGN_TYPE.PRODUCT_RECOMMENDATION,
      impressions: 1000,
      ctr: 2.5,
      budgetConsumed: 0,
      directSales: 1000,
      indirectSales: 500,
      totalRoAS: 0
    };
    
    const roas = MarketingService.calculateRoAS(campaign);
    expect(roas).toBe(0);
  });

  /**
   * Test empty campaigns array handling
   */
  it('should handle empty campaigns array', () => {
    const kpis = MarketingService.aggregateKPIMetrics([]);
    
    expect(kpis.totalAdSpend).toBe(0);
    expect(kpis.totalAdSales).toBe(0);
    expect(kpis.averageRoAS).toBe(0);
    expect(kpis.newCustomerAcquisition).toBe(0);
    expect(kpis.campaignCount).toBe(0);
    expect(kpis.topPerformingCampaign).toBe('');
    expect(kpis.totalImpressions).toBe(0);
    expect(kpis.totalClicks).toBe(0);
    expect(kpis.overallCTR).toBe(0);
  });
});