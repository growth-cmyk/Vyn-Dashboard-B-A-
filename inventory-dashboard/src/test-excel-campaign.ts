// Test Excel campaign data loading functionality
import { DataService } from './services/DataService';

// Create a mock Excel file with campaign data
function createMockExcelFile(): File {
  // This would normally be a real Excel file, but for testing we'll simulate the structure
  // In a real test, you'd use a library like xlsx to create actual Excel data
  const mockData = new Uint8Array([
    0x50, 0x4B, 0x03, 0x04, // ZIP file header (Excel files are ZIP archives)
    // ... more Excel file bytes would go here
  ]);
  
  return new File([mockData], 'campaign-data.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

// Test the Excel campaign data loading
export async function testExcelCampaignLoading() {
  console.log('🧪 Testing Excel Campaign Data Loading...');
  
  try {
    // Create mock Excel file
    const excelFile = createMockExcelFile();
    
    // Test the loadExcelCampaignData method
    console.log('📊 Loading Excel campaign data...');
    const campaigns = await DataService.loadExcelCampaignData(excelFile);
    
    console.log(`✅ FINAL RESULT: ${campaigns.length} campaigns loaded`);
    
    if (campaigns.length > 0) {
      console.log('Sample campaign:', campaigns[0]);
      
      // Verify platform tagging
      const campaignsWithPlatform = campaigns.filter(c => c.platform === 'Blinkit');
      console.log(`✅ Platform tagging: ${campaignsWithPlatform.length}/${campaigns.length} campaigns have Blinkit platform`);
      
      // Verify date parsing
      const campaignsWithValidDates = campaigns.filter(c => c.date instanceof Date && !isNaN(c.date.getTime()));
      console.log(`✅ Date parsing: ${campaignsWithValidDates.length}/${campaigns.length} campaigns have valid dates`);
      
      // Verify numeric parsing
      const campaignsWithBudget = campaigns.filter(c => typeof c.budgetConsumed === 'number' && c.budgetConsumed >= 0);
      console.log(`✅ Numeric parsing: ${campaignsWithBudget.length}/${campaigns.length} campaigns have valid budget data`);
    }
    
    return campaigns.length > 0;
    
  } catch (error) {
    console.error('❌ Excel campaign loading test failed:', error);
    return false;
  }
}

// Simple console test runner
if (typeof window === 'undefined') {
  testExcelCampaignLoading().then(success => {
    console.log(success ? '✅ Test passed' : '❌ Test failed');
  });
}