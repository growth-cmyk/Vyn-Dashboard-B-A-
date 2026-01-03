/**
 * AccessibilityService - Manages accessibility features and compliance
 * Ensures WCAG 2.1 AA compliance and provides accessibility utilities
 */

export interface AccessibilityPreferences {
  reducedMotion: boolean;
  highContrast: boolean;
  screenReaderOptimized: boolean;
  keyboardNavigation: boolean;
  focusIndicators: boolean;
}

export interface ColorContrastResult {
  ratio: number;
  level: 'AAA' | 'AA' | 'A' | 'FAIL';
  passes: boolean;
}

class AccessibilityServiceClass {
  private preferences: AccessibilityPreferences;
  private readonly STORAGE_KEY = 'vyndo-accessibility-preferences';
  
  constructor() {
    this.preferences = this.loadPreferences();
    this.initializeAccessibility();
    this.setupSystemListeners();
  }
  
  /**
   * Get current accessibility preferences
   */
  getPreferences(): AccessibilityPreferences {
    return { ...this.preferences };
  }
  
  /**
   * Update accessibility preferences
   */
  updatePreferences(updates: Partial<AccessibilityPreferences>): void {
    this.preferences = { ...this.preferences, ...updates };
    this.savePreferences();
    this.applyAccessibilitySettings();
    this.dispatchAccessibilityChangeEvent();
  }
  
  /**
   * Check color contrast ratio between two colors
   */
  checkColorContrast(foreground: string, background: string): ColorContrastResult {
    const fgLuminance = this.getLuminance(foreground);
    const bgLuminance = this.getLuminance(background);
    
    const ratio = (Math.max(fgLuminance, bgLuminance) + 0.05) / 
                  (Math.min(fgLuminance, bgLuminance) + 0.05);
    
    let level: ColorContrastResult['level'];
    let passes = false;
    
    if (ratio >= 7) {
      level = 'AAA';
      passes = true;
    } else if (ratio >= 4.5) {
      level = 'AA';
      passes = true;
    } else if (ratio >= 3) {
      level = 'A';
      passes = false; // A is not sufficient for WCAG compliance
    } else {
      level = 'FAIL';
      passes = false;
    }
    
    return { ratio, level, passes };
  }
  
  /**
   * Validate all brand colors for WCAG compliance
   */
  validateBrandColors(): Record<string, ColorContrastResult> {
    const brandColors = {
      'primary-on-white': this.checkColorContrast('#F36F21', '#FFFFFF'),
      'primary-on-neutral-50': this.checkColorContrast('#F36F21', '#F9FAFB'),
      'success-on-white': this.checkColorContrast('#2D6A4F', '#FFFFFF'),
      'warning-on-white': this.checkColorContrast('#FFB703', '#FFFFFF'),
      'danger-on-white': this.checkColorContrast('#D90429', '#FFFFFF'),
      'neutral-900-on-white': this.checkColorContrast('#1A1A1A', '#FFFFFF'),
      'neutral-600-on-white': this.checkColorContrast('#6B7280', '#FFFFFF'),
      
      // Dark mode combinations
      'primary-dark-on-slate-900': this.checkColorContrast('#FB923C', '#0F172A'),
      'success-dark-on-slate-900': this.checkColorContrast('#34D399', '#0F172A'),
      'warning-dark-on-slate-900': this.checkColorContrast('#FBBF24', '#0F172A'),
      'danger-dark-on-slate-900': this.checkColorContrast('#F87171', '#0F172A'),
      'slate-100-on-slate-900': this.checkColorContrast('#F1F5F9', '#0F172A'),
      'slate-300-on-slate-800': this.checkColorContrast('#CBD5E1', '#1E293B'),
    };
    
    return brandColors;
  }
  
  /**
   * Announce message to screen readers
   */
  announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }
  
  /**
   * Setup keyboard navigation for a container
   */
  setupKeyboardNavigation(container: HTMLElement): void {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    container.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
      
      // Arrow key navigation for lists
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const currentIndex = Array.from(focusableElements).indexOf(document.activeElement as HTMLElement);
        if (currentIndex !== -1) {
          e.preventDefault();
          let nextIndex;
          
          if (e.key === 'ArrowDown') {
            nextIndex = (currentIndex + 1) % focusableElements.length;
          } else {
            nextIndex = (currentIndex - 1 + focusableElements.length) % focusableElements.length;
          }
          
          (focusableElements[nextIndex] as HTMLElement).focus();
        }
      }
    });
  }
  
  /**
   * Add focus indicators to an element
   */
  addFocusIndicators(element: HTMLElement): void {
    element.classList.add('focus-visible:ring-2', 'focus-visible:ring-vyndo-primary-500', 'focus-visible:ring-offset-2');
    
    if (this.preferences.highContrast) {
      element.classList.add('focus-visible:ring-4', 'focus-visible:ring-offset-4');
    }
  }
  
  /**
   * Generate accessible description for stock status
   */
  getStockStatusDescription(status: string, daysOfCover: number): string {
    switch (status) {
      case 'out-of-stock':
        return `Critical: Out of stock. Immediate restocking required.`;
      case 'understock':
        return `Warning: Low stock with ${daysOfCover} days of cover remaining. Restock recommended.`;
      case 'healthy':
        return `Good: Adequate stock levels with ${daysOfCover} days of cover.`;
      case 'overstock':
        return `Notice: High stock levels. Consider reducing orders.`;
      case 'expiry-risk':
        return `Alert: Stock at risk of expiry. Review inventory rotation.`;
      default:
        return `Stock status: ${status}`;
    }
  }
  
  /**
   * Generate accessible label for urgency badge
   */
  getUrgencyBadgeLabel(urgency: string): string {
    switch (urgency.toLowerCase()) {
      case 'critical':
        return 'Critical priority: Immediate action required';
      case 'urgent':
        return 'Urgent priority: Action needed within 24 hours';
      case 'high':
        return 'High priority: Action needed within 3 days';
      case 'medium':
        return 'Medium priority: Action needed within 1 week';
      case 'low':
        return 'Low priority: Monitor for changes';
      default:
        return `Priority level: ${urgency}`;
    }
  }
  
  /**
   * Initialize accessibility settings
   */
  private initializeAccessibility(): void {
    this.applyAccessibilitySettings();
    this.detectSystemPreferences();
  }
  
  /**
   * Apply accessibility settings to DOM
   */
  private applyAccessibilitySettings(): void {
    const root = document.documentElement;
    
    // Reduced motion
    if (this.preferences.reducedMotion) {
      root.style.setProperty('--animation-duration', '0ms');
      root.style.setProperty('--transition-duration', '0ms');
      root.classList.add('reduce-motion');
    } else {
      root.style.removeProperty('--animation-duration');
      root.style.removeProperty('--transition-duration');
      root.classList.remove('reduce-motion');
    }
    
    // High contrast
    if (this.preferences.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Screen reader optimizations
    if (this.preferences.screenReaderOptimized) {
      root.classList.add('screen-reader-optimized');
    } else {
      root.classList.remove('screen-reader-optimized');
    }
    
    // Focus indicators
    if (this.preferences.focusIndicators) {
      root.classList.add('enhanced-focus');
    } else {
      root.classList.remove('enhanced-focus');
    }
  }
  
  /**
   * Detect system accessibility preferences
   */
  private detectSystemPreferences(): void {
    // Reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion && !this.preferences.reducedMotion) {
      this.updatePreferences({ reducedMotion: true });
    }
    
    // High contrast
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    if (prefersHighContrast && !this.preferences.highContrast) {
      this.updatePreferences({ highContrast: true });
    }
  }
  
  /**
   * Setup system preference listeners
   */
  private setupSystemListeners(): void {
    // Reduced motion listener
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionQuery.addEventListener('change', (e) => {
      this.updatePreferences({ reducedMotion: e.matches });
    });
    
    // High contrast listener
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    highContrastQuery.addEventListener('change', (e) => {
      this.updatePreferences({ highContrast: e.matches });
    });
  }
  
  /**
   * Calculate luminance for color contrast
   */
  private getLuminance(color: string): number {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    // Apply gamma correction
    const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
    
    // Calculate luminance
    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  }
  
  /**
   * Load preferences from localStorage
   */
  private loadPreferences(): AccessibilityPreferences {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...this.getDefaultPreferences(),
          ...parsed
        };
      }
    } catch (error) {
      console.warn('Failed to load accessibility preferences:', error);
    }
    
    return this.getDefaultPreferences();
  }
  
  /**
   * Save preferences to localStorage
   */
  private savePreferences(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Failed to save accessibility preferences:', error);
    }
  }
  
  /**
   * Get default accessibility preferences
   */
  private getDefaultPreferences(): AccessibilityPreferences {
    return {
      reducedMotion: false,
      highContrast: false,
      screenReaderOptimized: false,
      keyboardNavigation: true,
      focusIndicators: true
    };
  }
  
  /**
   * Dispatch accessibility change event
   */
  private dispatchAccessibilityChangeEvent(): void {
    const event = new CustomEvent('accessibilitychange', {
      detail: {
        preferences: this.preferences
      }
    });
    
    window.dispatchEvent(event);
  }
}

// Export singleton instance
export const AccessibilityService = new AccessibilityServiceClass();