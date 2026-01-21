/**
 * Visual Components Property-Based Tests
 * Feature: executive-command-center
 * 
 * Tests Properties 11, 13, 15 for visual components
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateBrandHealthScore,
  getScoreColor,
  type BrandHealthMetrics,
} from './BrandHealthGauge';
import {
  getStatusColor,
  getStatusColorConfig,
  getStatusHexColor,
} from '../utils/statusColorCoding';

// ============================================================================
// Property 13: Multi-Platform Data Aggregation
// Validates: Requirements 8.1, 8.3
// ============================================================================

describe('Property 13: Multi-Platform Data Aggregation', () => {
  it('should aggregate platform metrics using weighted formula', () => {
    fc.assert(
      fc.property(
        fc.record({
          stockAvailability: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
          turnoverRate: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
          expiryRisk: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
          replenishmentEfficiency: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
        }),
        (metrics: BrandHealthMetrics) => {
          const score = calculateBrandHealthScore(metrics);
          
          // Score should be between 0 and 100
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
          
          // Verify weighted calculation
          const expectedScore =
            metrics.stockAvailability * 0.4 +
            metrics.turnoverRate * 0.3 +
            (100 - metrics.expiryRisk) * 0.2 +
            metrics.replenishmentEfficiency * 0.1;
          
          const roundedExpected = Math.round(Math.min(100, Math.max(0, expectedScore)));
          expect(score).toBe(roundedExpected);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge cases (all zeros, all 100s)', () => {
    // All zeros
    const zeroMetrics: BrandHealthMetrics = {
      stockAvailability: 0,
      turnoverRate: 0,
      expiryRisk: 100, // High risk = bad
      replenishmentEfficiency: 0,
    };
    const zeroScore = calculateBrandHealthScore(zeroMetrics);
    expect(zeroScore).toBe(0);

    // All perfect
    const perfectMetrics: BrandHealthMetrics = {
      stockAvailability: 100,
      turnoverRate: 100,
      expiryRisk: 0, // No risk = good
      replenishmentEfficiency: 100,
    };
    const perfectScore = calculateBrandHealthScore(perfectMetrics);
    expect(perfectScore).toBe(100);
  });
});

// ============================================================================
// Property 15: Visual Data Mapping Consistency
// Validates: Requirements 9.2, 9.3
// ============================================================================

describe('Property 15: Visual Data Mapping Consistency', () => {
  it('should map higher sales to larger bubble sizes', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: Math.fround(1000), max: Math.fround(100000), noNaN: true }), {
          minLength: 2,
          maxLength: 10,
        }),
        (salesVolumes) => {
          // Sort to get min and max
          const sorted = [...salesVolumes].sort((a, b) => a - b);
          const minVolume = sorted[0];
          const maxVolume = sorted[sorted.length - 1];
          
          // Calculate bubble sizes (same logic as GeographicBubbleChart)
          const calculateSize = (volume: number) => {
            if (minVolume === maxVolume) return 2000;
            const normalized = (volume - minVolume) / (maxVolume - minVolume);
            return 400 + normalized * 3600;
          };
          
          const minSize = calculateSize(minVolume);
          const maxSize = calculateSize(maxVolume);
          
          // Verify: higher sales = larger bubble
          expect(maxSize).toBeGreaterThanOrEqual(minSize);
          
          // Verify monotonic relationship
          for (let i = 0; i < sorted.length - 1; i++) {
            const size1 = calculateSize(sorted[i]);
            const size2 = calculateSize(sorted[i + 1]);
            expect(size2).toBeGreaterThanOrEqual(size1);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should map higher ROI to darker color intensity', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: Math.fround(-50), max: Math.fround(200), noNaN: true }), {
          minLength: 2,
          maxLength: 10,
        }),
        (roiValues) => {
          // Sort to get min and max
          const sorted = [...roiValues].sort((a, b) => a - b);
          const minROI = sorted[0];
          const maxROI = sorted[sorted.length - 1];
          
          // Calculate opacity (same logic as GeographicBubbleChart)
          const calculateOpacity = (roi: number) => {
            if (minROI === maxROI) return 1.0;
            const normalized = (roi - minROI) / (maxROI - minROI);
            return 0.3 + normalized * 0.7;
          };
          
          const minOpacity = calculateOpacity(minROI);
          const maxOpacity = calculateOpacity(maxROI);
          
          // Verify: higher ROI = higher opacity (darker)
          expect(maxOpacity).toBeGreaterThanOrEqual(minOpacity);
          
          // Verify monotonic relationship
          for (let i = 0; i < sorted.length - 1; i++) {
            const opacity1 = calculateOpacity(sorted[i]);
            const opacity2 = calculateOpacity(sorted[i + 1]);
            expect(opacity2).toBeGreaterThanOrEqual(opacity1);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 11: Status Color Coding Consistency
// Validates: Requirements 6.4
// ============================================================================

describe('Property 11: Status Color Coding Consistency', () => {
  it('should map green statuses consistently', () => {
    const greenStatuses = [
      'healthy',
      'moving',
      'good',
      'excellent',
      'active',
      'completed',
      'success',
    ];

    for (const status of greenStatuses) {
      const color = getStatusColor(status);
      expect(color).toBe('green');
      
      const hex = getStatusHexColor(status);
      expect(hex).toBe('#10b981');
    }
  });

  it('should map yellow statuses consistently', () => {
    const yellowStatuses = [
      'warning',
      'medium',
      'idle',
      'pending',
      'moderate',
      'caution',
    ];

    for (const status of yellowStatuses) {
      const color = getStatusColor(status);
      expect(color).toBe('yellow');
      
      const hex = getStatusHexColor(status);
      expect(hex).toBe('#f59e0b');
    }
  });

  it('should map red statuses consistently', () => {
    const redStatuses = [
      'critical',
      'high',
      'expiry_risk',
      'expiry-risk',
      'urgent',
      'danger',
      'error',
      'out-of-stock',
    ];

    for (const status of redStatuses) {
      const color = getStatusColor(status);
      expect(color).toBe('red');
      
      const hex = getStatusHexColor(status);
      expect(hex).toBe('#ef4444');
    }
  });

  it('should handle case-insensitive and whitespace variations', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('healthy', 'warning', 'critical'),
        fc.constantFrom('', ' ', '  '),
        fc.constantFrom('lower', 'UPPER', 'MiXeD'),
        (baseStatus, whitespace, caseVariant) => {
          let status = baseStatus;
          
          // Apply case variant
          if (caseVariant === 'UPPER') {
            status = status.toUpperCase();
          } else if (caseVariant === 'MiXeD') {
            status = status.charAt(0).toUpperCase() + status.slice(1);
          }
          
          // Add whitespace
          status = whitespace + status + whitespace;
          
          const color = getStatusColor(status);
          const expectedColor = getStatusColor(baseStatus);
          
          expect(color).toBe(expectedColor);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return consistent color config for each status', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'healthy',
          'moving',
          'warning',
          'idle',
          'critical',
          'expiry_risk'
        ),
        (status) => {
          const config1 = getStatusColorConfig(status);
          const config2 = getStatusColorConfig(status);
          
          // Should return same config every time
          expect(config1).toEqual(config2);
          
          // Config should have all required fields
          expect(config1.bg).toBeDefined();
          expect(config1.text).toBeDefined();
          expect(config1.border).toBeDefined();
          expect(config1.hex).toBeDefined();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Unit Tests for Brand Health Score
// ============================================================================

describe('Brand Health Score Calculation', () => {
  it('should calculate score with correct weights', () => {
    const metrics: BrandHealthMetrics = {
      stockAvailability: 80,
      turnoverRate: 70,
      expiryRisk: 10,
      replenishmentEfficiency: 90,
    };

    const score = calculateBrandHealthScore(metrics);
    
    // Manual calculation:
    // 80 * 0.4 + 70 * 0.3 + (100-10) * 0.2 + 90 * 0.1
    // = 32 + 21 + 18 + 9 = 80
    expect(score).toBe(80);
  });

  it('should classify scores correctly', () => {
    expect(getScoreColor(85)).toBe('green'); // Excellent
    expect(getScoreColor(70)).toBe('green'); // Good
    expect(getScoreColor(50)).toBe('yellow'); // Warning
    expect(getScoreColor(30)).toBe('red'); // Critical
  });

  it('should handle boundary values', () => {
    expect(getScoreColor(80)).toBe('green'); // Boundary: Excellent
    expect(getScoreColor(60)).toBe('green'); // Boundary: Good
    expect(getScoreColor(40)).toBe('yellow'); // Boundary: Warning
    expect(getScoreColor(0)).toBe('red'); // Minimum
    expect(getScoreColor(100)).toBe('green'); // Maximum
  });
});
