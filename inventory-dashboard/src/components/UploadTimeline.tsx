import React, { useState, useMemo } from 'react';
import { 
  Upload, 
  Trash2, 
  RotateCcw, 
  CheckCircle2,
  AlertCircle,
  Clock,
  Database,
  Eye,
  X
} from 'lucide-react';
import { ModernCard, ModernCardHeader, ModernCardTitle, ModernCardContent } from './ModernCard';
import { HistoryService } from '../services/HistoryService';
import { cn } from '../utils/cn';

interface UploadTimelineProps {
  className?: string;
  onRevertSnapshot?: (snapshotId: string) => void;
  onDeleteSnapshot?: (snapshotId: string) => void;
}

interface SchemaPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  previewData: string[][];
  fileName: string;
}

const SchemaPreviewModal: React.FC<SchemaPreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  previewData,
  fileName
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <ModernCard variant="glass" className="max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <ModernCardHeader>
          <div className="flex items-center justify-between">
            <ModernCardTitle level={3} className="flex items-center">
              <Eye className="h-5 w-5 mr-2 text-vyndo-primary-600" />
              Schema Preview: {fileName}
            </ModernCardTitle>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-vyndo-neutral-100 transition-colors"
            >
              <X className="h-5 w-5 text-vyndo-neutral-500" />
            </button>
          </div>
          <p className="text-sm text-vyndo-neutral-600 mt-2">
            Review the first 3 rows of your data before processing. Confirm the structure looks correct.
          </p>
        </ModernCardHeader>

        <ModernCardContent>
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full divide-y divide-vyndo-neutral-200">
              <thead className="bg-vyndo-neutral-50">
                <tr>
                  {previewData[0]?.map((header, index) => (
                    <th
                      key={index}
                      className="px-4 py-3 text-left text-xs font-medium text-vyndo-neutral-500 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-vyndo-neutral-200">
                {previewData.slice(1, 4).map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-vyndo-neutral-50">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-4 py-3 text-sm text-vyndo-neutral-900 max-w-xs truncate"
                        title={cell}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-vyndo-neutral-700 bg-vyndo-neutral-100 rounded-lg hover:bg-vyndo-neutral-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-vyndo-primary-600 rounded-lg hover:bg-vyndo-primary-700 transition-colors"
            >
              Confirm & Process
            </button>
          </div>
        </ModernCardContent>
      </ModernCard>
    </div>
  );
};

/**
 * UploadTimeline - Premium data management with history tracking
 * 
 * Features:
 * - Vertical timeline of captured snapshots from HistoryService
 * - Schema preview modal for file validation
 * - Revert/Delete actions for each snapshot
 * - Glassmorphism styling with smooth animations
 */
export const UploadTimeline: React.FC<UploadTimelineProps> = ({
  className,
  onRevertSnapshot,
  onDeleteSnapshot
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [previewFileName] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Get snapshots from HistoryService
  const snapshots = useMemo(() => {
    return HistoryService.getInventorySnapshots()
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Most recent first
  }, []);

  const handleConfirmUpload = () => {
    if (pendingFile) {
      // Trigger the actual upload process
      const event = new CustomEvent('fileUpload', { detail: pendingFile });
      window.dispatchEvent(event);
    }
    setShowPreview(false);
    setPendingFile(null);
    setPreviewData([]);
  };

  const handleRevert = (snapshotId: string) => {
    onRevertSnapshot?.(snapshotId);
  };

  const handleDelete = (snapshotId: string) => {
    onDeleteSnapshot?.(snapshotId);
  };

  const getSnapshotIcon = (snapshot: any) => {
    if (snapshot.outOfStockCount > 0) {
      return <AlertCircle className="h-5 w-5 text-vyndo-danger-500" />;
    }
    if (snapshot.understockCount > 0) {
      return <Clock className="h-5 w-5 text-vyndo-warning-500" />;
    }
    return <CheckCircle2 className="h-5 w-5 text-vyndo-success-500" />;
  };

  return (
    <>
      <ModernCard variant="glass" className={cn('', className)}>
        <ModernCardHeader>
          <ModernCardTitle level={3} className="flex items-center">
            <Database className="h-5 w-5 mr-2 text-vyndo-primary-600" />
            Upload History & Timeline
          </ModernCardTitle>
          <p className="text-sm text-vyndo-neutral-600 mt-2">
            Track your data uploads and manage inventory snapshots. Each upload creates a snapshot for trend analysis.
          </p>
        </ModernCardHeader>

        <ModernCardContent>
          {snapshots.length === 0 ? (
            <div className="text-center py-8">
              <Upload className="h-12 w-12 text-vyndo-neutral-400 mx-auto mb-4" />
              <h4 className="text-sm font-medium text-vyndo-neutral-900 mb-2">No Upload History</h4>
              <p className="text-sm text-vyndo-neutral-500">
                Upload your first inventory file to start tracking snapshots and trends.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Timeline */}
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-vyndo-primary-200 to-vyndo-neutral-200"></div>
                
                {snapshots.map((snapshot, index) => (
                  <div key={snapshot.timestamp.toISOString()} className="relative flex items-start space-x-4 pb-6">
                    {/* Timeline dot */}
                    <div className="relative z-10 flex items-center justify-center w-12 h-12 bg-white border border-vyndo-primary-200/50 rounded-full shadow-sm">
                      {getSnapshotIcon(snapshot)}
                    </div>

                    {/* Snapshot card */}
                    <ModernCard variant="elevated" className="flex-1 border-l-4 border-vyndo-primary-200">
                      <ModernCardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="text-sm font-medium text-vyndo-neutral-900">
                              Snapshot #{snapshots.length - index}
                            </h4>
                            <p className="text-xs text-vyndo-neutral-500">
                              {snapshot.timestamp.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleRevert(snapshot.timestamp.toISOString())}
                              className="p-1 rounded-full hover:bg-vyndo-primary-100 transition-colors"
                              title="Revert to this snapshot"
                            >
                              <RotateCcw className="h-4 w-4 text-vyndo-primary-600" />
                            </button>
                            <button
                              onClick={() => handleDelete(snapshot.timestamp.toISOString())}
                              className="p-1 rounded-full hover:bg-vyndo-danger-100 transition-colors"
                              title="Delete this snapshot"
                            >
                              <Trash2 className="h-4 w-4 text-vyndo-danger-600" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-vyndo-neutral-500">Total Units:</span>
                            <span className="ml-1 font-medium text-vyndo-neutral-900">
                              {snapshot.totalUnits.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-vyndo-neutral-500">Items:</span>
                            <span className="ml-1 font-medium text-vyndo-neutral-900">
                              {snapshot.itemCount}
                            </span>
                          </div>
                          <div>
                            <span className="text-vyndo-neutral-500">Locations:</span>
                            <span className="ml-1 font-medium text-vyndo-neutral-900">
                              {snapshot.locationCount}
                            </span>
                          </div>
                          <div>
                            <span className="text-vyndo-neutral-500">Issues:</span>
                            <span className="ml-1 font-medium text-vyndo-danger-600">
                              {snapshot.outOfStockCount + snapshot.understockCount}
                            </span>
                          </div>
                        </div>

                        {/* Status indicators */}
                        <div className="flex items-center space-x-3 mt-3">
                          {snapshot.outOfStockCount > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-vyndo-danger-100 text-vyndo-danger-800">
                              {snapshot.outOfStockCount} out of stock
                            </span>
                          )}
                          {snapshot.understockCount > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-vyndo-warning-100 text-vyndo-warning-800">
                              {snapshot.understockCount} understock
                            </span>
                          )}
                          {snapshot.expiryRiskCount > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-vyndo-danger-100 text-vyndo-danger-800">
                              {snapshot.expiryRiskCount} expiry risk
                            </span>
                          )}
                        </div>
                      </ModernCardContent>
                    </ModernCard>
                  </div>
                ))}
              </div>

              {/* Storage usage summary */}
              <ModernCard variant="flat" className="bg-vyndo-neutral-50">
                <ModernCardContent className="p-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Database className="h-4 w-4 text-vyndo-neutral-500" />
                      <span className="text-vyndo-neutral-600">Storage Usage:</span>
                    </div>
                    <div className="text-vyndo-neutral-900 font-medium">
                      {snapshots.length} snapshots • ~{Math.round(snapshots.length * 0.5)}KB
                    </div>
                  </div>
                </ModernCardContent>
              </ModernCard>
            </div>
          )}
        </ModernCardContent>
      </ModernCard>

      {/* Schema Preview Modal */}
      <SchemaPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        onConfirm={handleConfirmUpload}
        previewData={previewData}
        fileName={previewFileName}
      />
    </>
  );
};

export default UploadTimeline;