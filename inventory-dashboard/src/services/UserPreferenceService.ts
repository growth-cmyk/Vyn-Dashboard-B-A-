/**
 * UserPreferenceService - Manages user preferences and layout persistence
 * Handles theme mode, active tab, table sort preferences, and filter presets
 */

export interface TableSortPreference {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: Record<string, any>;
  createdAt: Date;
}

export interface LayoutPreferences {
  activeTab: string;
  sidebarCollapsed: boolean;
  tableSortPreferences: Record<string, TableSortPreference>;
  filterPresets: FilterPreset[];
  dashboardLayout: 'compact' | 'detailed' | 'executive';
  gridDensity: 'comfortable' | 'compact' | 'spacious';
}

export interface UserPreferences {
  theme: {
    mode: 'light' | 'dark';
    autoDetectSystem: boolean;
  };
  layout: LayoutPreferences;
  accessibility: {
    reducedMotion: boolean;
    highContrast: boolean;
  };
  lastUpdated: Date;
}

class UserPreferenceServiceClass {
  private preferences: UserPreferences;
  private readonly STORAGE_KEY = 'vyndo-user-preferences';
  private readonly STORAGE_VERSION = '1.0';
  
  constructor() {
    this.preferences = this.loadPreferences();
    this.setupStorageListener();
  }
  
  /**
   * Get all user preferences
   */
  getPreferences(): UserPreferences {
    return { ...this.preferences };
  }
  
  /**
   * Update theme preferences
   */
  updateThemePreferences(theme: Partial<UserPreferences['theme']>): void {
    this.preferences.theme = { ...this.preferences.theme, ...theme };
    this.preferences.lastUpdated = new Date();
    this.savePreferences();
    this.dispatchPreferenceChangeEvent('theme', theme);
  }
  
  /**
   * Update layout preferences
   */
  updateLayoutPreferences(layout: Partial<LayoutPreferences>): void {
    this.preferences.layout = { ...this.preferences.layout, ...layout };
    this.preferences.lastUpdated = new Date();
    this.savePreferences();
    this.dispatchPreferenceChangeEvent('layout', layout);
  }
  
  /**
   * Set active tab and persist it
   */
  setActiveTab(tabId: string): void {
    this.updateLayoutPreferences({ activeTab: tabId });
  }
  
  /**
   * Get active tab
   */
  getActiveTab(): string {
    return this.preferences.layout.activeTab;
  }
  
  /**
   * Save table sort preference for a specific table
   */
  saveTableSortPreference(tableId: string, sort: TableSortPreference): void {
    const tableSortPreferences = {
      ...this.preferences.layout.tableSortPreferences,
      [tableId]: sort
    };
    
    this.updateLayoutPreferences({ tableSortPreferences });
  }
  
  /**
   * Get table sort preference for a specific table
   */
  getTableSortPreference(tableId: string): TableSortPreference | null {
    return this.preferences.layout.tableSortPreferences[tableId] || null;
  }
  
  /**
   * Save a filter preset
   */
  saveFilterPreset(preset: Omit<FilterPreset, 'id' | 'createdAt'>): FilterPreset {
    const newPreset: FilterPreset = {
      ...preset,
      id: this.generatePresetId(),
      createdAt: new Date()
    };
    
    const filterPresets = [...this.preferences.layout.filterPresets, newPreset];
    this.updateLayoutPreferences({ filterPresets });
    
    return newPreset;
  }
  
  /**
   * Delete a filter preset
   */
  deleteFilterPreset(presetId: string): void {
    const filterPresets = this.preferences.layout.filterPresets.filter(
      preset => preset.id !== presetId
    );
    
    this.updateLayoutPreferences({ filterPresets });
  }
  
  /**
   * Get all filter presets
   */
  getFilterPresets(): FilterPreset[] {
    return [...this.preferences.layout.filterPresets];
  }
  
  /**
   * Set dashboard layout preference
   */
  setDashboardLayout(layout: LayoutPreferences['dashboardLayout']): void {
    this.updateLayoutPreferences({ dashboardLayout: layout });
  }
  
  /**
   * Get dashboard layout preference
   */
  getDashboardLayout(): LayoutPreferences['dashboardLayout'] {
    return this.preferences.layout.dashboardLayout;
  }
  
  /**
   * Set grid density preference
   */
  setGridDensity(density: LayoutPreferences['gridDensity']): void {
    this.updateLayoutPreferences({ gridDensity: density });
  }
  
  /**
   * Get grid density preference
   */
  getGridDensity(): LayoutPreferences['gridDensity'] {
    return this.preferences.layout.gridDensity;
  }
  
  /**
   * Toggle sidebar collapsed state
   */
  toggleSidebar(): void {
    const sidebarCollapsed = !this.preferences.layout.sidebarCollapsed;
    this.updateLayoutPreferences({ sidebarCollapsed });
  }
  
  /**
   * Get sidebar collapsed state
   */
  isSidebarCollapsed(): boolean {
    return this.preferences.layout.sidebarCollapsed;
  }
  
  /**
   * Update accessibility preferences
   */
  updateAccessibilityPreferences(accessibility: Partial<UserPreferences['accessibility']>): void {
    this.preferences.accessibility = { ...this.preferences.accessibility, ...accessibility };
    this.preferences.lastUpdated = new Date();
    this.savePreferences();
    this.dispatchPreferenceChangeEvent('accessibility', accessibility);
  }
  
  /**
   * Reset all preferences to default
   */
  resetToDefaults(): void {
    this.preferences = this.getDefaultPreferences();
    this.savePreferences();
    this.dispatchPreferenceChangeEvent('reset', {});
  }
  
  /**
   * Export preferences as JSON
   */
  exportPreferences(): string {
    return JSON.stringify({
      version: this.STORAGE_VERSION,
      preferences: this.preferences,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }
  
  /**
   * Import preferences from JSON
   */
  importPreferences(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.version === this.STORAGE_VERSION && data.preferences) {
        this.preferences = {
          ...this.getDefaultPreferences(),
          ...data.preferences,
          lastUpdated: new Date()
        };
        
        this.savePreferences();
        this.dispatchPreferenceChangeEvent('import', {});
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to import preferences:', error);
      return false;
    }
  }
  
  /**
   * Load preferences from localStorage
   */
  private loadPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        
        // Validate and merge with defaults
        const defaultPrefs = this.getDefaultPreferences();
        return {
          ...defaultPrefs,
          ...data,
          // Ensure nested objects are properly merged
          theme: { ...defaultPrefs.theme, ...data.theme },
          layout: { ...defaultPrefs.layout, ...data.layout },
          accessibility: { ...defaultPrefs.accessibility, ...data.accessibility }
        };
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
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
      console.error('Failed to save user preferences:', error);
    }
  }
  
  /**
   * Get default preferences
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      theme: {
        mode: 'light',
        autoDetectSystem: true
      },
      layout: {
        activeTab: 'overview',
        sidebarCollapsed: false,
        tableSortPreferences: {},
        filterPresets: [],
        dashboardLayout: 'detailed',
        gridDensity: 'comfortable'
      },
      accessibility: {
        reducedMotion: false,
        highContrast: false
      },
      lastUpdated: new Date()
    };
  }
  
  /**
   * Generate unique preset ID
   */
  private generatePresetId(): string {
    return `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Setup storage event listener for cross-tab synchronization
   */
  private setupStorageListener(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === this.STORAGE_KEY && event.newValue) {
        try {
          const newPreferences = JSON.parse(event.newValue);
          this.preferences = newPreferences;
          this.dispatchPreferenceChangeEvent('sync', {});
        } catch (error) {
          console.warn('Failed to sync preferences from storage event:', error);
        }
      }
    });
  }
  
  /**
   * Dispatch preference change event
   */
  private dispatchPreferenceChangeEvent(type: string, data: any): void {
    const event = new CustomEvent('preferencechange', {
      detail: {
        type,
        data,
        preferences: this.preferences
      }
    });
    
    window.dispatchEvent(event);
  }
}

// Export singleton instance
export const UserPreferenceService = new UserPreferenceServiceClass();