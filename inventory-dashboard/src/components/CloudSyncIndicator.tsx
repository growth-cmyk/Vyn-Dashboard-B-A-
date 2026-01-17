import React from 'react';
import { Cloud, CloudOff, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '../utils/cn';

export interface CloudSyncIndicatorProps {
  status: 'syncing' | 'synced' | 'offline' | 'error';
  className?: string;
}

/**
 * CloudSyncIndicator - Shows cloud sync status in the top right
 * 
 * Status indicators:
 * - syncing: Blue spinner (re-hydrating data)
 * - synced: Green pulse (data successfully loaded)
 * - offline: Gray cloud (cloud unavailable)
 * - error: Red cloud (sync failed)
 */
export const CloudSyncIndicator: React.FC<CloudSyncIndicatorProps> = ({
  status,
  className
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'syncing':
        return {
          icon: Loader2,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          label: 'Syncing...',
          animate: 'animate-spin'
        };
      case 'synced':
        return {
          icon: CheckCircle2,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          label: 'Cloud Synced',
          animate: 'animate-pulse'
        };
      case 'offline':
        return {
          icon: CloudOff,
          color: 'text-gray-400',
          bgColor: 'bg-gray-50',
          label: 'Offline',
          animate: ''
        };
      case 'error':
        return {
          icon: Cloud,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          label: 'Sync Error',
          animate: ''
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div 
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300',
        config.bgColor,
        className
      )}
      title={config.label}
    >
      <Icon className={cn('h-4 w-4', config.color, config.animate)} />
      <span className={cn('text-xs font-medium', config.color)}>
        {config.label}
      </span>
    </div>
  );
};

export default CloudSyncIndicator;
