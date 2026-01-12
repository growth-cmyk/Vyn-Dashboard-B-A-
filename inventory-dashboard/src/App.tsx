import { useState, useEffect } from 'react';
import { MainLayout, DashboardContent } from './components';
import { PlatformThemeProvider } from './components/PlatformThemeProvider';
import { ThemeService } from './services/ThemeService';
import { UserPreferenceService } from './services/UserPreferenceService';
import { PlatformContextService } from './services/PlatformContextService';
import type { Platform } from './types';
import { PLATFORM } from './types';
import './App.css';

function App() {
  const [activeView, setActiveView] = useState<'dashboard' | 'inventory' | 'sales' | 'action-center' | 'data-management' | 'marketing-analysis'>('data-management');
  const [activePlatform, setActivePlatform] = useState<Platform>(PLATFORM.BLINKIT);

  // Initialize theme and preferences on app startup
  useEffect(() => {
    // Initialize theme from user preferences
    const preferences = UserPreferenceService.getPreferences();
    ThemeService.setTheme({ mode: preferences.theme.mode });
    
    // Set auto-detect system preference
    ThemeService.setAutoDetectSystem(preferences.theme.autoDetectSystem);
    
    // Initialize platform context
    PlatformContextService.initialize();
    setActivePlatform(PlatformContextService.getActivePlatform());
    
    // ALWAYS start with data-management view for first-time user experience
    // This ensures users are prompted to upload their Blinkit CSV files
    setActiveView('data-management');
  }, []);

  const handleViewChange = (view: 'dashboard' | 'inventory' | 'sales' | 'action-center' | 'data-management' | 'marketing-analysis') => {
    setActiveView(view);
  };

  const handlePlatformChange = (platform: Platform) => {
    setActivePlatform(platform);
    PlatformContextService.setActivePlatform(platform);
  };

  return (
    <PlatformThemeProvider 
      activePlatform={activePlatform} 
      onPlatformChange={handlePlatformChange}
    >
      <MainLayout 
        activeView={activeView} 
        onViewChange={handleViewChange}
        activePlatform={activePlatform}
        onPlatformChange={handlePlatformChange}
      >
        <DashboardContent 
          activeView={activeView} 
          onViewChange={handleViewChange}
          activePlatform={activePlatform}
          onPlatformChange={handlePlatformChange}
        />
      </MainLayout>
    </PlatformThemeProvider>
  );
}

export default App;
