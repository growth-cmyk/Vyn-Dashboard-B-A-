import { useState, useEffect } from 'react';
import { MainLayout, DashboardContent } from './components';
import { PlatformThemeProvider } from './components/PlatformThemeProvider';
import { useBlobRehydration } from './hooks/useBlobRehydration';
import { ThemeService } from './services/ThemeService';
import { UserPreferenceService } from './services/UserPreferenceService';
import { PlatformContextService } from './services/PlatformContextService';
import { MigrationService } from './services/MigrationService';
import type { Platform } from './types';
import { PLATFORM } from './types';
import './App.css';

function App() {
  const [activeView, setActiveView] = useState<'dashboard' | 'inventory' | 'sales' | 'action-center' | 'data-management' | 'marketing-analysis'>('data-management');
  const [activePlatform, setActivePlatform] = useState<Platform>(PLATFORM.BLINKIT);
  
  // Re-hydration hook for cloud sync status
  const { state: rehydrationState } = useBlobRehydration(activePlatform);
  
  // Determine cloud sync status
  const cloudSyncStatus = rehydrationState.isRehydrating 
    ? 'syncing' 
    : rehydrationState.error 
    ? 'error' 
    : rehydrationState.hasData 
    ? 'synced' 
    : 'offline';

  // Initialize theme and preferences on app startup
  useEffect(() => {
    const initializeApp = async () => {
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

      // Initialize demand map from cloud storage
      try {
        const { DataService } = await import('./services/DataService');
        await DataService.initializeDemandMap();
      } catch (error) {
        console.warn('Failed to initialize demand map:', error);
      }

      // Check and migrate local data to cloud on app launch
      try {
        const migrationResult = await MigrationService.checkAndMigrateOnLaunch();
        if (migrationResult) {
          console.log('Migration completed:', migrationResult);
          // You could show a toast notification here if needed
          if (migrationResult.success && migrationResult.migratedCount > 0) {
            console.log(`Successfully migrated ${migrationResult.migratedCount} items to cloud storage`);
          } else if (!migrationResult.success) {
            console.warn('Migration completed with errors:', migrationResult.errors);
          }
        }
      } catch (error) {
        console.error('Migration check failed:', error);
        // App continues to work normally even if migration fails
      }

      // CRITICAL: Re-hydrate dashboard from Vercel Blob Storage
      // This ensures data persists across sessions without re-uploading files
      try {
        const { BlobStorageService } = await import('./services/BlobStorageService');
        console.log('🔄 Checking for persisted files in Vercel Blob...');
        
        const isAvailable = await BlobStorageService.checkBlobStorageAvailability();
        if (isAvailable) {
          console.log('✅ Vercel Blob Storage is available - re-hydration will occur automatically');
        } else {
          console.log('ℹ️ Vercel Blob Storage not available - users will need to upload files manually');
        }
      } catch (error) {
        console.warn('⚠️ Blob storage check failed:', error);
        // App continues to work normally even if blob storage is unavailable
      }
    };

    initializeApp();
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
        cloudSyncStatus={cloudSyncStatus}
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
