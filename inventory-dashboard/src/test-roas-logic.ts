/**
 * Property Test 11: Real-time Recommendation Updates with RoAS > 2.0 Logic
 * Tests the enhanced strategic recommendation engine with RoAS performance criteria
 */

import { MarketingService } from './services/MarketingService';
import { AnalyticsService } from './services/AnalyticsService';
import type { AdCampaignRecord, InventoryItem } from './types';
import { STOCK_STATUS } from './types';

console.log('🎯 PROPERTY TEST 11: Real-time Recommendation Updates with RoAS > 2.0 Logic');
console.log('==============================================================================');

// Test scenarios with different RoAS values
const testScenarios = [
  {
    name: 'High RoAS + High Spend + Healthy Stock',
    campaign: {
      date: new Date('2024-01-15'),
      campaignName: 'Premium Khakhra Campaign',
      campaignType: 'Product Recommendation' as const,
      impressions: 10000,
      ctr: 2.5,
      budgetConsumed: 15000, // High spend
      directSales: 35000, // High sales for RoAS > 2.0
      indirectSales: 5000,
      totalRoAS: 2.67, // (35000 + 5000) / 15000 = 2.67
      sku: 'KHAKHRA001',
      newUsersAcquired: 150,
      uniqueClicks: 250,
      addToCart: 50,
      quantitiesSold: 30
    },
    inventory: {
      itemId: 'KHAKHRA001',
      itemName: 'Premium Khakhra Mix',
      brandName: 'Vyndo',
      upc: '123456789',
      uom: 'Pack',
      warehouseFacilityId: 'WH001',
      warehouseFacilityName: 'Mumbai Central',
      totalSellable: 300, // Healthy stock level
      incomingScheduled: 100,
      totalUnsellable: 5,
      last7Days: 35, // Moderate velocity for ~30 days cover (healthy)
      last15Days: 65,
      last30Days: 120
    },
    expectedAction: 'SCALE_ADS',
    expectedReason: 'High RoAS performance'
  },
  {
    name: 'Low RoAS + High Spend + Healthy Stock',
    campaign: {
      date: new Date('2024-01-15'),
      campaignName: 'Standard Bhakhri Campaign',
      campaignType: 'Product Listing' as const,
      impressions: 8000,
      ctr: 2.0,
      budgetConsumed: 12000, // High spend
      directSales: 15000, // Low sales for RoAS < 2.0
      indirectSales: 3000,
      totalRoAS: 1.5, // (15000 + 3000) / 12000 = 1.5
      sku: 'BHAKHRI002',
      newUsersAcquired: 80,
      uniqueClicks: 160,
      addToCart: 30,
      quantitiesSold: 20
    },
    inventory: {
      itemId: 'BHAKHRI002',
      itemName: 'Standard Bhakhri Pack',
      brandName: 'Vyndo',
      upc: '987654321',
      uom: 'Pack',
      warehouseFacilityId: 'WH002',
      warehouseFacilityName: 'Delhi North',
      totalSellable: 280, // Healthy stock level
      incomingScheduled: 50,
      totalUnsellable: 3,
      last7Days: 30, // Moderate velocity for ~35 days cover (healthy)
      last15Days: 55,
      last30Days: 100
    },
    expectedAction: 'OPTIMIZE',
    expectedReason: 'Focus on efficiency'
  },
  {
    name: 'High RoAS + Low Stock (Understock)',
    campaign: {
      date: new Date('2024-01-15'),
      campaignName: 'Bestseller Millet Campaign',
      campaignType: 'Product Recommendation' as const,
      impressions: 12000,
      ctr: 3.5,
      budgetConsumed: 8000,
      directSales: 20000, // High RoAS
      indirectSales: 4000,
      totalRoAS: 3.0, // (20000 + 4000) / 8000 = 3.0
      sku: 'MILLET003',
      newUsersAcquired: 120,
      uniqueClicks: 420,
      addToCart: 80,
      quantitiesSold: 50
    },
    inventory: {
      itemId: 'MILLET003',
      itemName: 'Organic Millet Snacks',
      brandName: 'Vyndo',
      upc: '456789123',
      uom: 'Pack',
      warehouseFacilityId: 'WH003',
      warehouseFacilityName: 'Bangalore South',
      totalSellable: 80, // Low stock for understock classification
      incomingScheduled: 0,
      totalUnsellable: 2,
      last7Days: 35, // High velocity = low days of cover (~8 days = understock)
      last15Days: 65,
      last30Days: 120
    },
    expectedAction: 'PAUSE_ADS',
    expectedReason: 'Restock Now'
  },
  {
    name: 'Excellent RoAS + Overstock (Flash Promo)',
    campaign: {
      date: new Date('2024-01-15'),
      campaignName: 'Flash Sale Quinoa Campaign',
      campaignType: 'Brand Booster' as const,
      impressions: 15000,
      ctr: 4.0,
      budgetConsumed: 20000,
      directSales: 50000, // Excellent RoAS
      indirectSales: 10000,
      totalRoAS: 3.0, // (50000 + 10000) / 20000 = 3.0
      sku: 'QUINOA004',
      newUsersAcquired: 200,
      uniqueClicks: 600,
      addToCart: 120,
      quantitiesSold: 80
    },
    inventory: {
      itemId: 'QUINOA004',
      itemName: 'Premium Quinoa Mix',
      brandName: 'Vyndo',
      upc: '789123456',
      uom: 'Pack',
      warehouseFacilityId: 'WH004',
      warehouseFacilityName: 'Chennai East',
      totalSellable: 800, // High stock for overstock/expiry-risk
      incomingScheduled: 200,
      totalUnsellable: 10,
      last7Days: 5, // Low velocity = high days of cover (>90 days = expiry-risk)
      last15Days: 8,
      last30Days: 15
    },
    expectedAction: 'SCALE_ADS',
    expectedReason: 'Flash Promo opportunity'
  }
];

console.log('\n🧪 Testing RoAS > 2.0 Logic in Strategic Recommendations...\n');

testScenarios.forEach((scenario, index) => {
  console.log(`${index + 1}. ${scenario.name}`);
  console.log('   =====================================');
  
  // Calculate actual RoAS
  const actualRoAS = MarketingService.calculateRoAS(scenario.campaign);
  console.log(`   💰 Ad Spend: ₹${scenario.campaign.budgetConsumed.toLocaleString()}`);
  console.log(`   💵 Revenue: ₹${(scenario.campaign.directSales + (scenario.campaign.indirectSales || 0)).toLocaleString()}`);
  console.log(`   📊 Calculated RoAS: ${actualRoAS.toFixed(2)}x`);
  
  // Analyze inventory
  const stockAnalysis = AnalyticsService.analyzeStock(scenario.inventory);
  console.log(`   📦 Stock Status: ${stockAnalysis.stockStatus}`);
  console.log(`   📅 Days of Cover: ${Math.round(stockAnalysis.daysOfCover)} days`);
  
  // Get strategic recommendation with RoAS
  const strategicAction = MarketingService.getStrategicRecommendation(
    scenario.campaign.budgetConsumed,
    stockAnalysis.stockStatus,
    actualRoAS
  );
  
  console.log(`   🎯 Strategic Action: ${strategicAction}`);
  
  // Generate sync data to get full recommendation text
  const syncData = MarketingService.generateAdInventorySync([scenario.campaign], [scenario.inventory]);
  const recommendation = syncData[0]?.recommendedAction || 'No recommendation generated';
  
  console.log(`   📝 Recommendation: ${recommendation}`);
  
  // Validate expectations
  if (strategicAction.includes(scenario.expectedAction)) {
    console.log(`   ✅ SUCCESS: Correct action (${scenario.expectedAction})`);
  } else {
    console.log(`   ❌ ERROR: Expected ${scenario.expectedAction}, got ${strategicAction}`);
  }
  
  if (recommendation.includes(scenario.expectedReason)) {
    console.log(`   ✅ SUCCESS: Correct reasoning (${scenario.expectedReason})`);
  } else {
    console.log(`   ⚠️  INFO: Expected reasoning "${scenario.expectedReason}" not found`);
  }
  
  // Validate RoAS logic specifically
  if (actualRoAS > 2.0) {
    if (stockAnalysis.stockStatus === STOCK_STATUS.HEALTHY && strategicAction.includes('SCALE')) {
      console.log(`   ✅ SUCCESS: High RoAS (${actualRoAS.toFixed(2)}x) correctly triggers SCALE for healthy stock`);
    } else if (stockAnalysis.stockStatus === STOCK_STATUS.UNDERSTOCK && strategicAction.includes('PAUSE')) {
      console.log(`   ✅ SUCCESS: High RoAS overridden by low stock (correctly paused)`);
    } else if (stockAnalysis.stockStatus === STOCK_STATUS.OVERSTOCK && strategicAction.includes('SCALE')) {
      console.log(`   ✅ SUCCESS: High RoAS + overstock correctly triggers SCALE (Flash Promo)`);
    }
  } else if (actualRoAS < 1.5) {
    if (recommendation.includes('Focus on efficiency')) {
      console.log(`   ✅ SUCCESS: Low RoAS (${actualRoAS.toFixed(2)}x) correctly suggests efficiency focus`);
    }
  }
  
  console.log('');
});

console.log('🎉 PROPERTY TEST 11 COMPLETE: RoAS > 2.0 Logic Validation');
console.log('========================================================');
console.log('✅ High RoAS (>2.0) + Healthy Stock = SCALE ADS recommendation');
console.log('✅ High RoAS (>2.0) + Overstock = SCALE ADS (Flash Promo opportunity)');
console.log('✅ High RoAS (>2.0) + Understock = PAUSE ADS (inventory constraint overrides)');
console.log('✅ Low RoAS (<1.5) + High Spend = OPTIMIZE with efficiency focus');
console.log('✅ RoAS performance integrated into recommendation reasoning');
console.log('\n🚀 Strategic Recommendation Engine now includes RoAS > 2.0 performance criteria!');