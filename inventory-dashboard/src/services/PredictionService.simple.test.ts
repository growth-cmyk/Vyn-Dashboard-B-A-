/**
 * Simple test to verify PredictionService works
 */

import { describe, it, expect } from 'vitest';
import { PredictionService } from './PredictionService';

const predictionService = new PredictionService();

describe('PredictionService - Basic Tests', () => {
  it('should create an instance', () => {
    expect(predictionService).toBeDefined();
  });

  it('should return 0 velocity for empty sales history', () => {
    const velocity = predictionService.calculateSalesVelocity([]);
    expect(velocity).toBe(0);
  });

  it('should return null stockout date for zero velocity', () => {
    const stockoutDate = predictionService.calculateStockoutDate('SKU1', 100, []);
    expect(stockoutDate).toBeNull();
  });
});
