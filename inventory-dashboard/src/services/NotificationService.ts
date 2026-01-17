/**
 * Simple notification service for user feedback
 * Provides console logging and could be extended with UI notifications
 */
export class NotificationService {
  /**
   * Show success notification
   */
  static success(message: string, details?: any): void {
    console.log(`✅ ${message}`, details);
    // Future: Could dispatch to a toast UI component
  }

  /**
   * Show error notification
   */
  static error(message: string, details?: any): void {
    console.error(`❌ ${message}`, details);
    // Future: Could dispatch to a toast UI component
  }

  /**
   * Show warning notification
   */
  static warning(message: string, details?: any): void {
    console.warn(`⚠️ ${message}`, details);
    // Future: Could dispatch to a toast UI component
  }

  /**
   * Show info notification
   */
  static info(message: string, details?: any): void {
    console.info(`ℹ️ ${message}`, details);
    // Future: Could dispatch to a toast UI component
  }

  /**
   * Show migration-specific notifications
   */
  static migration(result: {
    success: boolean;
    migratedCount: number;
    errors: string[];
    message: string;
  }): void {
    if (result.success && result.migratedCount > 0) {
      this.success(`Migration completed: ${result.message}`, {
        migratedCount: result.migratedCount
      });
    } else if (!result.success && result.errors.length > 0) {
      this.error(`Migration failed: ${result.message}`, {
        errors: result.errors
      });
    } else if (result.migratedCount === 0) {
      this.info('Migration check: No data to migrate');
    }
  }
}