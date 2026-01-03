import type { Platform, PlatformContext, PlatformConfig } from '../types';
import { PLATFORM_CONFIG, PLATFORM } from '../types';

/**
 * Service for managing platform context and filtering across the application
 * Handles platform switching, data filtering, and configuration management
 */
export class PlatformContextService {
  private static activePlatform: Platform = PLATFORM.BLINKIT; // Default to Blinkit for backward compatibility
  private static listeners: ((platform: Platform) => void)[] = [];

  /**
   * Set the active platform and notify all listeners
   */
  static setActivePlatform(platform: Platform): void {
    if (platform !== this.activePlatform) {
      this.activePlatform = platform;
      this.notifyListeners();
      
      // Persist platform selection
      try {
        localStorage.setItem('vyndo-active-platform', platform);
      } catch (error) {
        console.warn('Failed to persist platform selection:', error);
      }
    }
  }

  /**
   * Get the currently active platform
   */
  static getActivePlatform(): Platform {
    return this.activePlatform;
  }

  /**
   * Initialize platform context from localStorage or default
   */
  static initialize(): void {
    try {
      const savedPlatform = localStorage.getItem('vyndo-active-platform') as Platform;
      if (savedPlatform && Object.values(PLATFORM).includes(savedPlatform)) {
        this.activePlatform = savedPlatform;
      }
    } catch (error) {
      console.warn('Failed to load saved platform selection:', error);
      this.activePlatform = PLATFORM.BLINKIT;
    }
  }

  /**
   * Get platform configuration for a specific platform
   */
  static getPlatformConfig(platform: Platform): PlatformConfig {
    return PLATFORM_CONFIG[platform];
  }

  /**
   * Get all available platforms
   */
  static getAvailablePlatforms(): Platform[] {
    return [PLATFORM.ALL, PLATFORM.BLINKIT, PLATFORM.AMAZON];
  }

  /**
   * Get complete platform context
   */
  static getPlatformContext(): PlatformContext {
    return {
      activePlatform: this.activePlatform,
      availablePlatforms: this.getAvailablePlatforms(),
      platformConfig: PLATFORM_CONFIG
    };
  }

  /**
   * Filter data array by platform
   * If platform is 'All', returns all data
   * Otherwise filters by exact platform match
   */
  static filterDataByPlatform<T extends { platform?: Platform }>(
    data: T[], 
    platform: Platform = this.activePlatform
  ): T[] {
    if (platform === PLATFORM.ALL) {
      return data;
    }

    return data.filter(item => {
      // Default to 'Blinkit' for backward compatibility with existing data
      const itemPlatform = item.platform || PLATFORM.BLINKIT;
      return itemPlatform === platform;
    });
  }

  /**
   * Aggregate data across platforms using provided aggregation function
   */
  static aggregateAcrossPlatforms<T, R>(
    data: T[], 
    aggregationFn: (items: T[]) => R,
    groupByPlatform: boolean = false
  ): R | Record<Platform, R> {
    if (!groupByPlatform) {
      return aggregationFn(data);
    }

    const result: Partial<Record<Platform, R>> = {};
    
    // Group data by platform
    const blinkitData = this.filterDataByPlatform(data as any[], PLATFORM.BLINKIT);
    const amazonData = this.filterDataByPlatform(data as any[], PLATFORM.AMAZON);

    if (blinkitData.length > 0) {
      result[PLATFORM.BLINKIT] = aggregationFn(blinkitData as T[]);
    }

    if (amazonData.length > 0) {
      result[PLATFORM.AMAZON] = aggregationFn(amazonData as T[]);
    }

    return result as Record<Platform, R>;
  }

  /**
   * Check if a platform is currently active
   */
  static isPlatformActive(platform: Platform): boolean {
    return this.activePlatform === platform;
  }

  /**
   * Get platform-specific lead time
   */
  static getPlatformLeadTime(platform: Platform): number {
    return PLATFORM_CONFIG[platform].leadTime;
  }

  /**
   * Get platform-specific referral fee (Amazon only)
   */
  static getPlatformReferralFee(platform: Platform): number {
    return PLATFORM_CONFIG[platform].referralFee || 0;
  }

  /**
   * Get platform display name
   */
  static getPlatformDisplayName(platform: Platform): string {
    return PLATFORM_CONFIG[platform].displayName;
  }

  /**
   * Get platform icon name
   */
  static getPlatformIcon(platform: Platform): string {
    return PLATFORM_CONFIG[platform].icon;
  }

  /**
   * Get platform brand colors
   */
  static getPlatformColors(platform: Platform): { primary: string; accent: string } {
    return PLATFORM_CONFIG[platform].brandColors;
  }

  /**
   * Subscribe to platform changes
   */
  static subscribe(listener: (platform: Platform) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of platform change
   */
  private static notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.activePlatform);
      } catch (error) {
        console.error('Error in platform change listener:', error);
      }
    });
  }

  /**
   * Reset to default platform (Blinkit)
   */
  static reset(): void {
    this.setActivePlatform(PLATFORM.BLINKIT);
  }

  /**
   * Validate platform value
   */
  static isValidPlatform(platform: string): platform is Platform {
    return Object.values(PLATFORM).includes(platform as Platform);
  }

  /**
   * Get platform-specific safety stock multiplier
   * Can be extended for platform-specific business rules
   */
  static getPlatformSafetyStockDays(_platform: Platform): number {
    // Default safety stock is 3 days for all platforms
    // Can be customized per platform in the future
    return 3;
  }
}

// Initialize on module load
PlatformContextService.initialize();