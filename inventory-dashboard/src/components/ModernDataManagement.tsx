import React, { useState, useCallback } from 'react';
import { History, AlertCircle } from 'lucide-react';
import { ModernCard, ModernCardHeader, ModernCardTitle, ModernCardContent } from './ModernCard';
import { DropZone } from './DropZone';
import { LoadingTimeline } from './LoadingTimeline';
import { UploadTimeline } from './UploadTimeline';
import { DataService } from '../services';
import { HistoryService } from '../services/HistoryService';
import type { InventoryItem, SalesRecord } from '../types';

export interface ModernDataManagementProps {
  onInventoryUpload: (data: InventoryItem[]) => void;
  onSalesUpload: (data: SalesRecord[]) => void;
  inventoryCount: number;
  salesCount: number;
  error: string | null;
  onErrorDismiss: () => void;
}

interface UploadState {
  inventory: {
    isUploading: boolean;
    isComplete: boolean;
  };
  sales: {
    isUploading: boolean;
    isComplete: boolean;
  };
}

/**
 * ModernDataManagement - Premium data upload interface with modern UX
 * Features drag-and-drop zones, loading timelines, and glassmorphism styling
 */
export const ModernDataManagement: React.FC<ModernDataManagementProps> = ({
  onInventoryUpload,
  onSalesUpload,
  inventoryCount,
  salesCount,
  error,
  onErrorDismiss
}) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    inventory: { isUploading: false, isComplete: false },
    sales: { isUploading: false, isComplete: false }
  });

  // Handle inventory file upload
  const handleInventoryUpload = useCallback(async (file: File) => {
    setUploadState(prev => ({
      ...prev,
      inventory: { isUploading: true, isComplete: false }
    }));

    try {
      const inventoryData = await DataService.loadInventoryData(file);
      
      // Save inventory snapshot for historical tracking
      await HistoryService.saveInventorySnapshot(inventoryData, file.name, []);
      
      onInventoryUpload(inventoryData);
      
      setUploadState(prev => ({
        ...prev,
        inventory: { isUploading: false, isComplete: true }
      }));

      // Reset complete state after 3 seconds
      setTimeout(() => {
        setUploadState(prev => ({
          ...prev,
          inventory: { ...prev.inventory, isComplete: false }
        }));
      }, 3000);
    } catch (error) {
      setUploadState(prev => ({
        ...prev,
        inventory: { isUploading: false, isComplete: false }
      }));
      // Error handling is managed by parent component
    }
  }, [onInventoryUpload]);

  // Handle sales file upload
  const handleSalesUpload = useCallback(async (file: File) => {
    setUploadState(prev => ({
      ...prev,
      sales: { isUploading: true, isComplete: false }
    }));

    try {
      const salesData = await DataService.loadSalesData(file);
      onSalesUpload(salesData);
      
      setUploadState(prev => ({
        ...prev,
        sales: { isUploading: false, isComplete: true }
      }));

      // Reset complete state after 3 seconds
      setTimeout(() => {
        setUploadState(prev => ({
          ...prev,
          sales: { ...prev.sales, isComplete: false }
        }));
      }, 3000);
    } catch (error) {
      setUploadState(prev => ({
        ...prev,
        sales: { isUploading: false, isComplete: false }
      }));
      // Error handling is managed by parent component
    }
  }, [onSalesUpload]);

  // Handle snapshot revert
  const handleRevertSnapshot = useCallback((snapshotId: string) => {
    // In a real implementation, this would restore the snapshot data
    // For now, just show a confirmation
    if (window.confirm(`Are you sure you want to revert to snapshot ${snapshotId}? This will replace your current data.`)) {
      // Implementation would restore the snapshot data
      alert('Snapshot revert functionality would be implemented here');
    }
  }, []);

  // Handle snapshot deletion
  const handleDeleteSnapshot = useCallback((snapshotId: string) => {
    if (window.confirm(`Are you sure you want to delete snapshot ${snapshotId}? This action cannot be undone.`)) {
      // Implementation would delete the snapshot
      alert('Snapshot deletion functionality would be implemented here');
    }
  }, []);

  // Get history information
  const historySnapshots = HistoryService.getInventorySnapshots();

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <ModernCard variant="glass" gradient>
        <ModernCardHeader>
          <div className="flex items-center justify-between">
            <ModernCardTitle level={2}>Data Management</ModernCardTitle>
            
            {/* History Indicator */}
            <div className="flex items-center text-sm text-vyndo-neutral-600 dark:text-vyndo-neutral-400">
              <History className="h-4 w-4 mr-2" />
              <span>
                {historySnapshots.length > 0 
                  ? `${historySnapshots.length} days of history captured`
                  : 'No history yet'
                }
              </span>
            </div>
          </div>
        </ModernCardHeader>
      </ModernCard>

      {/* Error Display */}
      {error && (
        <ModernCard variant="elevated" className="border-l-4 border-vyndo-danger-500">
          <ModernCardContent>
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-vyndo-danger-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-vyndo-danger-800 dark:text-vyndo-danger-200 mb-1">
                  Data Processing Error
                </div>
                <div className="text-sm text-vyndo-danger-700 dark:text-vyndo-danger-300">
                  {error.length > 200 
                    ? `${error.substring(0, 200)}...` 
                    : error
                  }
                </div>
                {error.length > 200 && (
                  <details className="mt-2">
                    <summary className="text-sm text-vyndo-danger-600 cursor-pointer hover:text-vyndo-danger-800">
                      Show full error details
                    </summary>
                    <div className="mt-2 text-xs text-vyndo-danger-600 bg-vyndo-danger-50 dark:bg-vyndo-danger-900/20 p-3 rounded-lg border max-h-32 overflow-y-auto">
                      {error}
                    </div>
                  </details>
                )}
                <button
                  onClick={onErrorDismiss}
                  className="mt-3 text-sm text-vyndo-danger-600 hover:text-vyndo-danger-800 underline transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </ModernCardContent>
        </ModernCard>
      )}

      {/* Upload Zones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Upload */}
        <ModernCard variant="elevated" size="lg">
          <ModernCardHeader>
            <ModernCardTitle level={3}>Inventory Data</ModernCardTitle>
            <div className="text-sm text-vyndo-neutral-600 dark:text-vyndo-neutral-400">
              Upload CSV file with inventory levels and stock data
            </div>
            <div className="text-xs text-vyndo-primary-600 dark:text-vyndo-primary-400">
              Supports both detailed and master inventory formats
            </div>
          </ModernCardHeader>
          
          <ModernCardContent>
            <DropZone
              onFileSelect={handleInventoryUpload}
              title="Upload Inventory CSV"
              description="Drag and drop your inventory file here"
              supportText="Supports CSV files up to 10MB"
              disabled={uploadState.inventory.isUploading}
            />
            
            {inventoryCount > 0 && !uploadState.inventory.isUploading && (
              <div className="mt-4 p-3 bg-vyndo-success-50 dark:bg-vyndo-success-900/20 rounded-lg border border-vyndo-success-200 dark:border-vyndo-success-800">
                <div className="text-sm font-medium text-vyndo-success-800 dark:text-vyndo-success-200">
                  ✓ {inventoryCount.toLocaleString()} inventory items loaded
                </div>
              </div>
            )}
          </ModernCardContent>
        </ModernCard>

        {/* Sales Upload */}
        <ModernCard variant="elevated" size="lg">
          <ModernCardHeader>
            <ModernCardTitle level={3}>Sales Data</ModernCardTitle>
            <div className="text-sm text-vyndo-neutral-600 dark:text-vyndo-neutral-400">
              Upload CSV file with sales transactions and revenue
            </div>
          </ModernCardHeader>
          
          <ModernCardContent>
            <DropZone
              onFileSelect={handleSalesUpload}
              title="Upload Sales CSV"
              description="Drag and drop your sales file here"
              supportText="Supports CSV files up to 10MB"
              disabled={uploadState.sales.isUploading}
            />
            
            {salesCount > 0 && !uploadState.sales.isUploading && (
              <div className="mt-4 p-3 bg-vyndo-success-50 dark:bg-vyndo-success-900/20 rounded-lg border border-vyndo-success-200 dark:border-vyndo-success-800">
                <div className="text-sm font-medium text-vyndo-success-800 dark:text-vyndo-success-200">
                  ✓ {salesCount.toLocaleString()} sales records loaded
                </div>
              </div>
            )}
          </ModernCardContent>
        </ModernCard>
      </div>

      {/* Loading Timeline */}
      {(uploadState.inventory.isUploading || uploadState.sales.isUploading) && (
        <LoadingTimeline
          isActive={uploadState.inventory.isUploading || uploadState.sales.isUploading}
          onComplete={() => {
            // Timeline completion is handled by individual upload handlers
          }}
        />
      )}

      {/* Upload History Timeline */}
      <UploadTimeline
        onRevertSnapshot={handleRevertSnapshot}
        onDeleteSnapshot={handleDeleteSnapshot}
      />

      {/* Data Summary */}
      {(inventoryCount > 0 || salesCount > 0) && (
        <ModernCard variant="glass">
          <ModernCardContent>
            <div className="flex items-center justify-center space-x-8 text-sm text-vyndo-neutral-600 dark:text-vyndo-neutral-400">
              {inventoryCount > 0 && (
                <span>{inventoryCount.toLocaleString()} inventory items</span>
              )}
              {inventoryCount > 0 && salesCount > 0 && (
                <span className="text-vyndo-neutral-400">•</span>
              )}
              {salesCount > 0 && (
                <span>{salesCount.toLocaleString()} sales records</span>
              )}
            </div>
          </ModernCardContent>
        </ModernCard>
      )}
    </div>
  );
};

export default ModernDataManagement;