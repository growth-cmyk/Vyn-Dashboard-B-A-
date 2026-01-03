// Quick test to verify platform lead times are working correctly
import { ReplenishmentService } from './src/services/ReplenishmentService.js';
import { PLATFORM } from './src/types/index.js';

console.log('Testing Platform Lead Times:');
console.log('Blinkit Lead Time:', ReplenishmentService.getPlatformLeadTime(PLATFORM.BLINKIT), 'days (expected: 15)');
console.log('Amazon Lead Time:', ReplenishmentService.getPlatformLeadTime(PLATFORM.AMAZON), 'days (expected: 7)');

const config = ReplenishmentService.getPlatformConfiguration();
console.log('\nPlatform Configuration:');
console.log('Blinkit:', config[PLATFORM.BLINKIT]);
console.log('Amazon:', config[PLATFORM.AMAZON]);