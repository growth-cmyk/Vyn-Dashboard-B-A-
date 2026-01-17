import { storageLayer } from './StorageLayer';
import { supabaseService } from './SupabaseService';
import { NotificationService } from './NotificationService';

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  errors: string[];
  message: string;
}

export class MigrationService {
  private static hasCheckedMigration = false;

  /**
   * Automatic migration routine - checks and migrates on app launch
   * Only runs once per session to avoid repeated checks
   */
  static async checkAndMigrateOnLaunch(): Promise<MigrationResult | null> {
    // Prevent multiple migration checks in the same session
    if (this.hasCheckedMigration) {
      return null;
    }

    this.hasCheckedMigration = true;

    try {
      // Check if migration is needed
      const shouldMigrate = await storageLayer.shouldMigrate();
      
      if (!shouldMigrate) {
        console.log('Migration check: No migration needed');
        return null;
      }

      console.log('Migration check: Local data found, starting migration...');
      
      // Perform the migration
      const result = await storageLayer.migrateLocalDataToCloud();
      
      const migrationResult: MigrationResult = {
        success: result.success,
        migratedCount: result.migratedCount,
        errors: result.errors,
        message: result.success 
          ? `Successfully migrated ${result.migratedCount} historical snapshots to cloud storage`
          : `Migration completed with ${result.errors.length} errors`
      };

      console.log('Migration completed:', migrationResult);
      
      // Show user notification
      NotificationService.migration(migrationResult);
      
      return migrationResult;

    } catch (error: any) {
      console.error('Migration check failed:', error);
      const errorResult = {
        success: false,
        migratedCount: 0,
        errors: [`Migration failed: ${error.message}`],
        message: 'Migration failed - data remains in local storage'
      };
      
      // Show user notification
      NotificationService.migration(errorResult);
      
      return errorResult;
    }
  }

  /**
   * Manual migration trigger for user-initiated migration
   */
  static async triggerManualMigration(): Promise<MigrationResult> {
    try {
      const result = await storageLayer.migrateLocalDataToCloud();
      
      const migrationResult: MigrationResult = {
        success: result.success,
        migratedCount: result.migratedCount,
        errors: result.errors,
        message: result.success 
          ? `Successfully migrated ${result.migratedCount} historical snapshots to cloud storage`
          : `Migration completed with ${result.errors.length} errors`
      };

      // Show user notification
      NotificationService.migration(migrationResult);

      return migrationResult;
    } catch (error: any) {
      const errorResult = {
        success: false,
        migratedCount: 0,
        errors: [`Migration failed: ${error.message}`],
        message: 'Migration failed - data remains in local storage'
      };
      
      // Show user notification
      NotificationService.migration(errorResult);
      
      return errorResult;
    }
  }

  /**
   * Check migration status without performing migration
   */
  static async getMigrationStatus(): Promise<{
    needsMigration: boolean;
    localDataCount: number;
    cloudDataCount: number;
  }> {
    try {
      const needsMigration = await storageLayer.shouldMigrate();
      
      // Get data counts for status
      const localSnapshots = JSON.parse(localStorage.getItem('inventory_snapshots') || '[]');
      const cloudSnapshots = await supabaseService.getInventoryHistory();
      
      return {
        needsMigration,
        localDataCount: localSnapshots.length,
        cloudDataCount: cloudSnapshots.length
      };
    } catch (error) {
      console.error('Failed to get migration status:', error);
      return {
        needsMigration: false,
        localDataCount: 0,
        cloudDataCount: 0
      };
    }
  }
}