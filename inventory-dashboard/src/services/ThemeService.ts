/**
 * ThemeService - Manages application theming and user preferences
 * Provides light/dark mode switching, system preference detection, and theme persistence
 */

export interface UITheme {
  mode: 'light' | 'dark';
  primaryColor: string;
  accentColor: string;
  reducedMotion: boolean;
  highContrast: boolean;
}

export interface ThemePreferences {
  autoDetectSystem: boolean;
  preferredMode: 'light' | 'dark';
  customColors?: {
    primary?: string;
    accent?: string;
  };
}

class ThemeServiceClass {
  private currentTheme: UITheme;
  private preferences: ThemePreferences;
  private readonly STORAGE_KEY = 'vyndo-theme-preferences';
  private readonly THEME_ATTRIBUTE = 'data-theme';
  
  constructor() {
    // Initialize with default theme
    this.currentTheme = {
      mode: 'light',
      primaryColor: '#F36F21', // Vyndo Orange
      accentColor: '#2D6A4F',  // Millet Green
      reducedMotion: false,
      highContrast: false
    };
    
    // Load preferences from localStorage
    this.preferences = this.loadPreferences();
    
    // Initialize theme based on preferences and system settings
    this.initializeTheme();
    
    // Listen for system preference changes
    this.setupSystemListeners();
  }
  
  /**
   * Get current theme configuration
   */
  getTheme(): UITheme {
    return { ...this.currentTheme };
  }
  
  /**
   * Set theme configuration
   */
  setTheme(theme: Partial<UITheme>): void {
    const previousTheme = { ...this.currentTheme };
    this.currentTheme = { ...this.currentTheme, ...theme };
    
    // Apply theme to DOM
    this.applyThemeToDOM();
    
    // Save preferences if mode changed
    if (theme.mode && theme.mode !== previousTheme.mode) {
      this.preferences.preferredMode = theme.mode;
      this.savePreferences();
    }
    
    // Dispatch theme change event
    this.dispatchThemeChangeEvent(previousTheme, this.currentTheme);
  }
  
  /**
   * Toggle between light and dark modes
   */
  toggleDarkMode(): void {
    const newMode = this.currentTheme.mode === 'light' ? 'dark' : 'light';
    this.setTheme({ mode: newMode });
  }
  
  /**
   * Apply custom brand colors while maintaining semantic relationships
   */
  applyCustomColors(colors: { primary?: string; accent?: string }): void {
    const updatedTheme: Partial<UITheme> = {};
    
    if (colors.primary) {
      updatedTheme.primaryColor = colors.primary;
    }
    
    if (colors.accent) {
      updatedTheme.accentColor = colors.accent;
    }
    
    this.setTheme(updatedTheme);
    
    // Save custom colors to preferences
    this.preferences.customColors = {
      ...this.preferences.customColors,
      ...colors
    };
    this.savePreferences();
  }
  
  /**
   * Enable/disable automatic system preference detection
   */
  setAutoDetectSystem(enabled: boolean): void {
    this.preferences.autoDetectSystem = enabled;
    this.savePreferences();
    
    if (enabled) {
      this.respectSystemPreferences();
    }
  }
  
  /**
   * Respect system preferences for theme and accessibility
   */
  respectSystemPreferences(): void {
    // Detect system color scheme preference
    if (this.preferences.autoDetectSystem) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const systemMode = prefersDark ? 'dark' : 'light';
      
      if (systemMode !== this.currentTheme.mode) {
        this.setTheme({ mode: systemMode });
      }
    }
    
    // Detect reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion !== this.currentTheme.reducedMotion) {
      this.setTheme({ reducedMotion: prefersReducedMotion });
    }
    
    // Detect high contrast preference
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    if (prefersHighContrast !== this.currentTheme.highContrast) {
      this.setTheme({ highContrast: prefersHighContrast });
    }
  }
  
  /**
   * Get theme preferences
   */
  getPreferences(): ThemePreferences {
    return { ...this.preferences };
  }
  
  /**
   * Reset theme to default settings
   */
  resetToDefault(): void {
    this.currentTheme = {
      mode: 'light',
      primaryColor: '#F36F21',
      accentColor: '#2D6A4F',
      reducedMotion: false,
      highContrast: false
    };
    
    this.preferences = {
      autoDetectSystem: true,
      preferredMode: 'light'
    };
    
    this.applyThemeToDOM();
    this.savePreferences();
  }
  
  /**
   * Initialize theme on service startup
   */
  private initializeTheme(): void {
    // Apply custom colors if saved
    if (this.preferences.customColors) {
      if (this.preferences.customColors.primary) {
        this.currentTheme.primaryColor = this.preferences.customColors.primary;
      }
      if (this.preferences.customColors.accent) {
        this.currentTheme.accentColor = this.preferences.customColors.accent;
      }
    }
    
    // Set initial mode based on preferences or system
    if (this.preferences.autoDetectSystem) {
      this.respectSystemPreferences();
    } else {
      this.setTheme({ mode: this.preferences.preferredMode });
    }
  }
  
  /**
   * Apply current theme to DOM elements
   */
  private applyThemeToDOM(): void {
    const root = document.documentElement;
    
    // Set theme attribute for CSS targeting
    root.setAttribute(this.THEME_ATTRIBUTE, this.currentTheme.mode);
    
    // Apply Tailwind dark mode class
    if (this.currentTheme.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Apply custom CSS properties for dynamic theming
    root.style.setProperty('--vyndo-primary-color', this.currentTheme.primaryColor);
    root.style.setProperty('--vyndo-accent-color', this.currentTheme.accentColor);
    
    // Apply dark mode specific glassmorphism colors
    if (this.currentTheme.mode === 'dark') {
      root.style.setProperty('--glass-bg', 'rgba(15, 23, 42, 0.7)'); // slate-900/70
      root.style.setProperty('--glass-border', 'rgba(51, 65, 85, 0.3)'); // slate-700/30
      root.style.setProperty('--glass-shadow', '0 8px 32px 0 rgba(0, 0, 0, 0.5)');
    } else {
      root.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.7)'); // white/70
      root.style.setProperty('--glass-border', 'rgba(229, 231, 235, 0.3)'); // gray-200/30
      root.style.setProperty('--glass-shadow', '0 8px 32px 0 rgba(31, 38, 135, 0.37)');
    }
    
    // Apply accessibility preferences
    if (this.currentTheme.reducedMotion) {
      root.style.setProperty('--animation-duration', '0ms');
      root.style.setProperty('--transition-duration', '0ms');
    } else {
      root.style.removeProperty('--animation-duration');
      root.style.removeProperty('--transition-duration');
    }
    
    // Apply high contrast mode
    if (this.currentTheme.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  }
  
  /**
   * Setup listeners for system preference changes
   */
  private setupSystemListeners(): void {
    // Listen for color scheme changes
    const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    colorSchemeQuery.addEventListener('change', () => {
      if (this.preferences.autoDetectSystem) {
        this.respectSystemPreferences();
      }
    });
    
    // Listen for reduced motion changes
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionQuery.addEventListener('change', () => {
      this.respectSystemPreferences();
    });
    
    // Listen for high contrast changes
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    highContrastQuery.addEventListener('change', () => {
      this.respectSystemPreferences();
    });
  }
  
  /**
   * Load theme preferences from localStorage
   */
  private loadPreferences(): ThemePreferences {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          autoDetectSystem: parsed.autoDetectSystem ?? true,
          preferredMode: parsed.preferredMode ?? 'light',
          customColors: parsed.customColors
        };
      }
    } catch (error) {
      console.warn('Failed to load theme preferences:', error);
    }
    
    // Return default preferences
    return {
      autoDetectSystem: true,
      preferredMode: 'light'
    };
  }
  
  /**
   * Save theme preferences to localStorage
   */
  private savePreferences(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.preferences));
    } catch (error) {
      console.warn('Failed to save theme preferences:', error);
    }
  }
  
  /**
   * Dispatch custom event when theme changes
   */
  private dispatchThemeChangeEvent(previousTheme: UITheme, currentTheme: UITheme): void {
    const event = new CustomEvent('themechange', {
      detail: {
        previous: previousTheme,
        current: currentTheme
      }
    });
    
    window.dispatchEvent(event);
  }
}

// Export singleton instance
export const ThemeService = new ThemeServiceClass();