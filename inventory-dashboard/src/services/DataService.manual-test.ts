// Manual test file for DataService - to be run in browser console or Node.js
import { DataService } from './DataService';

/**
 * Test helper to create a mock CSV file
 */
function createMockCSVFile(content: string, filename: string): File {
  const blob = new Blob([content], { type: 'text/csv' });
  return new File([blob], filename, { type: 'text/csv' });
}

/**
 * Test inventory CSV loading
 */
export async function testInventoryLoading() {
  console.log('Testing inventory CSV loading...');
  
  // Valid inventory CSV content
  const validInventoryCSV = `itemId,itemName,brandName,upc,uom,warehouseFacilityId,warehouseFacilityName,totalSellable,incomingScheduled,totalUnsellable,last7Days,last15Days,last30Days
ITEM001,Test Product 1,Test Brand,123456789,EA,WH001,Main Warehouse,100,50,10,5,12,25
ITEM002,Test Product 2,Test Brand,987654321,EA,WH002,Secondary Warehouse,200,0,5,8,15,30`;

  const file = createMockCSVFile(validInventoryCSV, 'inventory.csv');
  
  try {
    const result = await DataService.loadInventoryData(file);
    console.log('✅ Inventory loading successful:', result);
    
    // Verify data structure
    if (result.length === 2) {
      console.log('✅ Correct number of items loaded');
    } else {
      console.error('❌ Expected 2 items, got:', result.length);
    }
    
    // Verify first item
    const firstItem = result[0];
    if (firstItem.itemId === 'ITEM001' && firstItem.totalSellable === 100) {
      console.log('✅ First item data correct');
    } else {
      console.error('❌ First item data incorrect:', firstItem);
    }
    
  } catch (error) {
    console.error('❌ Inventory loading failed:', error);
  }
}

/**
 * Test sales CSV loading
 */
export async function testSalesLoading() {
  console.log('Testing sales CSV loading...');
  
  // Valid sales CSV content
  const validSalesCSV = `orderId,orderDate,itemId,productName,brandName,upc,supplyCity,supplyState,customerCity,customerState,quantity,sellingPrice
ORD001,2024-01-15,ITEM001,Test Product 1,Test Brand,123456789,New York,NY,Boston,MA,2,29.99
ORD002,2024-01-16,ITEM002,Test Product 2,Test Brand,987654321,Chicago,IL,Detroit,MI,1,49.99`;

  const file = createMockCSVFile(validSalesCSV, 'sales.csv');
  
  try {
    const result = await DataService.loadSalesData(file);
    console.log('✅ Sales loading successful:', result);
    
    // Verify data structure
    if (result.length === 2) {
      console.log('✅ Correct number of sales records loaded');
    } else {
      console.error('❌ Expected 2 records, got:', result.length);
    }
    
    // Verify first record
    const firstRecord = result[0];
    if (firstRecord.orderId === 'ORD001' && firstRecord.quantity === 2) {
      console.log('✅ First sales record data correct');
    } else {
      console.error('❌ First sales record data incorrect:', firstRecord);
    }
    
    // Verify date parsing
    if (firstRecord.orderDate instanceof Date && !isNaN(firstRecord.orderDate.getTime())) {
      console.log('✅ Date parsing successful');
    } else {
      console.error('❌ Date parsing failed:', firstRecord.orderDate);
    }
    
  } catch (error) {
    console.error('❌ Sales loading failed:', error);
  }
}

/**
 * Test CSV validation errors
 */
export async function testValidationErrors() {
  console.log('Testing validation errors...');
  
  // Invalid inventory CSV (missing required fields)
  const invalidInventoryCSV = `itemId,itemName
,Test Product 1
ITEM002,`;

  const file = createMockCSVFile(invalidInventoryCSV, 'invalid_inventory.csv');
  
  try {
    await DataService.loadInventoryData(file);
    console.error('❌ Expected validation error but loading succeeded');
  } catch (error) {
    console.log('✅ Validation error caught correctly:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Test data integrity validation
 */
export async function testDataIntegrity() {
  console.log('Testing data integrity validation...');
  
  const inventory = [
    {
      itemId: 'ITEM001',
      itemName: 'Test Product 1',
      brandName: 'Test Brand',
      upc: '123456789',
      uom: 'EA',
      warehouseFacilityId: 'WH001',
      warehouseFacilityName: 'Main Warehouse',
      totalSellable: 100,
      incomingScheduled: 50,
      totalUnsellable: 10,
      last7Days: 5,
      last15Days: 12,
      last30Days: 25
    }
  ];
  
  const sales = [
    {
      orderId: 'ORD001',
      orderDate: new Date('2024-01-15'),
      itemId: 'ITEM002', // Different item ID - should generate warning
      productName: 'Test Product 2',
      brandName: 'Test Brand',
      upc: '987654321',
      supplyCity: 'New York',
      supplyState: 'NY',
      customerCity: 'Boston',
      customerState: 'MA',
      quantity: 2,
      sellingPrice: 29.99
    }
  ];
  
  const result = DataService.validateDataIntegrity(inventory, sales);
  
  if (result.warnings.length > 0) {
    console.log('✅ Data integrity warnings detected correctly:', result.warnings);
  } else {
    console.error('❌ Expected data integrity warnings but none found');
  }
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('🧪 Running DataService tests...\n');
  
  await testInventoryLoading();
  console.log('');
  
  await testSalesLoading();
  console.log('');
  
  await testValidationErrors();
  console.log('');
  
  await testDataIntegrity();
  console.log('');
  
  console.log('🏁 All tests completed!');
}

// Export for manual testing
if (typeof window !== 'undefined') {
  // Browser environment
  (window as any).DataServiceTests = {
    runAllTests,
    testInventoryLoading,
    testSalesLoading,
    testValidationErrors,
    testDataIntegrity
  };
}