import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as XLSX from 'xlsx';
import { DataService } from './DataService';
// Remove unused imports
import { CAMPAIGN_TYPE, EXCEL_TAB_CONFIGS } from '../types';

/**
 * Property-based tests for Excel campaign data processing
 * Feature: blinkit-ad-campaign-analysis
 */

// Helper function to create mock Excel file
function createMockExcelFile(tabData: Record<string, any[]>): File {
  const workbook = XLSX.utils.book_new();
  
  Object.entries(tabData).forEach(([tabName, data]) => {
    if (data.length > 0) {
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, tabName);
    }
  });
  
  const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new File([excelBuffer], 'test-campaigns.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

// Generators for property-based testing
const campaignDataArbitrary = fc.record({
  'Date': fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString().split('T')[0]),
  'Campaign Name': fc.string({ minLength: 1, maxLength: 50 }),
  'Impressions': fc.integer({ min: 0, max: 1000000 }),
  'CTR': fc.float({ min: 0, max: 100 }),
  'Budget Consumed': fc.float({ min: 0, max: 100000 }),
  'Direct Sales': fc.float({ min: 0, max: 200000 }),
  'Indirect Sales': fc.option(fc.float({ min: 0, max: 100000 })),
  'Total RoAS': fc.float({ min: 0, max: 10 }),
  'New Users Acquired': fc.option(fc.integer({ min: 0, max: 1000 })),
  'Unique Clicks': fc.option(fc.integer({ min: 0, max: 50000 })),
  'Add to Cart': fc.option(fc.integer({ min: 0, max: 10000 }))
});

const brandBoosterDataArbitrary = fc.record({
  'Date': fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString().split('T')[0]),
  'Campaign Name': fc.string({ minLength: 1, maxLength: 50 }),
  'Impressions': fc.integer({ min: 0, max: 1000000 }),
  'CTR': fc.float({ min: 0, max: 100 }),
  'Budget Consumed': fc.float({ min: 0, max: 100000 }),
  // Note: BRAND_BOOSTER may not have Direct Sales
  'Unique Clicks': fc.option(fc.integer({ min: 0, max: 50000 })),
  'Add to Cart': fc.option(fc.integer({ min: 0, max: 10000 }))
});

describe('DataService Excel Processing Property Tests', () => {
  /**
   * Property 1: Multi-tab Excel Processing
   * For any Excel file with valid campaign tabs, the parser should successfully 
   * process all recognized tabs and handle missing tabs gracefully
   * Validates: Requirements 1.1, 1.6
   */
  it('should process all valid Excel tabs and handle missing tabs gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          PRODUCT_RECOMMENDATION: fc.option(fc.array(campaignDataArbitrary, { minLength: 1, maxLength: 10 })),
          PRODUCT_LISTING: fc.option(fc.array(campaignDataArbitrary, { minLength: 1, maxLength: 10 })),
          BRAND_BOOSTER: fc.option(fc.array(brandBoosterDataArbitrary, { minLength: 1, maxLength: 10 }))
        }),
        async (tabConfig) => {
          // Create Excel file with available tabs
          const tabData: Record<string, any[]> = {};
          let expectedTabCount = 0;
          
          if (tabConfig.PRODUCT_RECOMMENDATION) {
            tabData.PRODUCT_RECOMMENDATION = tabConfig.PRODUCT_RECOMMENDATION;
            expectedTabCount++;
          }
          if (tabConfig.PRODUCT_LISTING) {
            tabData.PRODUCT_LISTING = tabConfig.PRODUCT_LISTING;
            expectedTabCount++;
          }
          if (tabConfig.BRAND_BOOSTER) {
            tabData.BRAND_BOOSTER = tabConfig.BRAND_BOOSTER;
            expectedTabCount++;
          }

          // Skip if no tabs (would be invalid file)
          if (expectedTabCount === 0) return;

          const excelFile = createMockExcelFile(tabData);
          
          try {
            const campaigns = await DataService.loadExcelCampaignData(excelFile);
            
            // Should successfully process without throwing errors
            expect(campaigns).toBeDefined();
            expect(Array.isArray(campaigns)).toBe(true);
            
            // Should have campaigns if any tabs had data
            if (expectedTabCount > 0) {
              expect(campaigns.length).toBeGreaterThan(0);
            }
            
            // Each campaign should have required fields
            campaigns.forEach(campaign => {
              expect(campaign.date).toBeInstanceOf(Date);
              expect(typeof campaign.campaignName).toBe('string');
              expect(campaign.campaignName.trim()).not.toBe('');
              expect(Object.values(CAMPAIGN_TYPE)).toContain(campaign.campaignType);
              expect(typeof campaign.impressions).toBe('number');
              expect(campaign.impressions).toBeGreaterThanOrEqual(0);
              expect(typeof campaign.ctr).toBe('number');
              expect(campaign.ctr).toBeGreaterThanOrEqual(0);
              expect(campaign.ctr).toBeLessThanOrEqual(100);
              expect(typeof campaign.budgetConsumed).toBe('number');
              expect(campaign.budgetConsumed).toBeGreaterThanOrEqual(0);
              expect(typeof campaign.directSales).toBe('number');
              expect(campaign.directSales).toBeGreaterThanOrEqual(0);
            });
            
          } catch (error) {
            // Should not throw errors for valid Excel files with campaign tabs
            throw new Error(`Unexpected error processing valid Excel file: ${error}`);
          }
        }
      ),
      { numRuns: 50 } // Reduced runs for file I/O operations
    );
  });

  /**
   * Property 2: Campaign Type Mapping
   * For any valid tab name, the system should correctly map tab names to campaign types
   * Validates: Requirements 1.2, 1.3, 1.4, 2.3
   */
  it('should correctly map tab names to campaign types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('PRODUCT_RECOMMENDATION', 'PRODUCT_LISTING', 'BRAND_BOOSTER'),
        fc.array(campaignDataArbitrary, { minLength: 1, maxLength: 5 }),
        async (tabName, campaignData) => {
          const tabData = { [tabName]: campaignData };
          const excelFile = createMockExcelFile(tabData);
          
          const campaigns = await DataService.loadExcelCampaignData(excelFile);
          
          // All campaigns should have the correct type based on tab name
          const expectedType = EXCEL_TAB_CONFIGS[tabName].campaignType;
          campaigns.forEach(campaign => {
            expect(campaign.campaignType).toBe(expectedType);
          });
          
          // Verify specific mappings
          switch (tabName) {
            case 'PRODUCT_RECOMMENDATION':
              campaigns.forEach(campaign => {
                expect(campaign.campaignType).toBe(CAMPAIGN_TYPE.PRODUCT_RECOMMENDATION);
              });
              break;
            case 'PRODUCT_LISTING':
              campaigns.forEach(campaign => {
                expect(campaign.campaignType).toBe(CAMPAIGN_TYPE.PRODUCT_LISTING);
              });
              break;
            case 'BRAND_BOOSTER':
              campaigns.forEach(campaign => {
                expect(campaign.campaignType).toBe(CAMPAIGN_TYPE.BRAND_BOOSTER);
              });
              break;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: Data Extraction Completeness
   * For any valid campaign data row, the system should extract all required fields
   * with proper data types
   * Validates: Requirements 1.5
   */
  it('should extract all required fields with proper data types', async () => {
    await fc.assert(
      fc.asyncProperty(
        campaignDataArbitrary,
        async (campaignRow) => {
          const tabData = { 'PRODUCT_RECOMMENDATION': [campaignRow] };
          const excelFile = createMockExcelFile(tabData);
          
          const campaigns = await DataService.loadExcelCampaignData(excelFile);
          expect(campaigns).toHaveLength(1);
          
          const campaign = campaigns[0];
          
          // Verify all required fields are extracted with correct types
          expect(campaign.date).toBeInstanceOf(Date);
          expect(typeof campaign.campaignName).toBe('string');
          expect(campaign.campaignName.trim()).not.toBe('');
          expect(typeof campaign.campaignType).toBe('string');
          expect(typeof campaign.impressions).toBe('number');
          expect(typeof campaign.ctr).toBe('number');
          expect(typeof campaign.budgetConsumed).toBe('number');
          expect(typeof campaign.directSales).toBe('number');
          expect(typeof campaign.totalRoAS).toBe('number');
          
          // Verify numeric constraints
          expect(campaign.impressions).toBeGreaterThanOrEqual(0);
          expect(campaign.ctr).toBeGreaterThanOrEqual(0);
          expect(campaign.ctr).toBeLessThanOrEqual(100);
          expect(campaign.budgetConsumed).toBeGreaterThanOrEqual(0);
          expect(campaign.directSales).toBeGreaterThanOrEqual(0);
          expect(campaign.totalRoAS).toBeGreaterThanOrEqual(0);
          
          // Verify optional fields if present
          if (campaign.indirectSales !== undefined) {
            expect(typeof campaign.indirectSales).toBe('number');
            expect(campaign.indirectSales).toBeGreaterThanOrEqual(0);
          }
          
          if (campaign.newUsersAcquired !== undefined) {
            expect(typeof campaign.newUsersAcquired).toBe('number');
            expect(campaign.newUsersAcquired).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test BRAND_BOOSTER specific handling (missing Direct Sales column)
   */
  it('should handle BRAND_BOOSTER tab missing Direct Sales column gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        brandBoosterDataArbitrary,
        async (campaignRow) => {
          const tabData = { 'BRAND_BOOSTER': [campaignRow] };
          const excelFile = createMockExcelFile(tabData);
          
          const campaigns = await DataService.loadExcelCampaignData(excelFile);
          expect(campaigns).toHaveLength(1);
          
          const campaign = campaigns[0];
          
          // Should have default value for Direct Sales (0)
          expect(campaign.directSales).toBe(0);
          expect(campaign.campaignType).toBe(CAMPAIGN_TYPE.BRAND_BOOSTER);
          
          // Other fields should still be processed correctly
          expect(campaign.date).toBeInstanceOf(Date);
          expect(typeof campaign.campaignName).toBe('string');
          expect(campaign.impressions).toBeGreaterThanOrEqual(0);
          expect(campaign.ctr).toBeGreaterThanOrEqual(0);
          expect(campaign.budgetConsumed).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test error handling with malformed data
   */
  it('should handle malformed data gracefully and continue processing valid records', async () => {
    const malformedData = [
      {
        'Date': 'invalid-date',
        'Campaign Name': '',
        'Impressions': 'not-a-number',
        'CTR': -50, // Invalid CTR
        'Budget Consumed': 'invalid',
        'Direct Sales': -100 // Negative sales
      },
      {
        'Date': '2024-01-15',
        'Campaign Name': 'Valid Campaign',
        'Impressions': 1000,
        'CTR': 2.5,
        'Budget Consumed': 500,
        'Direct Sales': 1200
      }
    ];
    
    const tabData = { 'PRODUCT_RECOMMENDATION': malformedData };
    const excelFile = createMockExcelFile(tabData);
    
    // Should not throw error, but may have warnings
    const campaigns = await DataService.loadExcelCampaignData(excelFile);
    
    // Should process at least the valid record
    expect(campaigns.length).toBeGreaterThanOrEqual(1);
    
    // Valid records should have correct data
    const validCampaigns = campaigns.filter(c => c.campaignName === 'Valid Campaign');
    expect(validCampaigns).toHaveLength(1);
    expect(validCampaigns[0].impressions).toBe(1000);
    expect(validCampaigns[0].ctr).toBe(2.5);
  });
});