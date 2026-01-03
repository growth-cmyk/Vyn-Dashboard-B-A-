import React from 'react';
import { Layers, ShoppingBag, Box } from 'lucide-react';
import type { Platform } from '../types';
import { PLATFORM } from '../types';
import { PlatformContextService } from '../services/PlatformContextService';

interface PlatformSwitcherProps {
  activePlatform: Platform;
  onPlatformChange: (platform: Platform) => void;
  availablePlatforms?: Platform[];
  className?: string;
}

/**
 * Platform switcher component for the sidebar
 * Allows users to switch between Blinkit, Amazon, and unified views
 */
export const PlatformSwitcher: React.FC<PlatformSwitcherProps> = ({
  activePlatform,
  onPlatformChange,
  availablePlatforms = [PLATFORM.ALL, PLATFORM.BLINKIT, PLATFORM.AMAZON],
  className = ''
}) => {
  const getPlatformIcon = (platform: Platform) => {
    switch (platform) {
      case PLATFORM.ALL:
        return <Layers className="w-4 h-4" />;
      case PLATFORM.BLINKIT:
        return <ShoppingBag className="w-4 h-4" />;
      case PLATFORM.AMAZON:
        return <Box className="w-4 h-4" />;
      default:
        return <Layers className="w-4 h-4" />;
    }
  };

  const getPlatformColors = (platform: Platform, isActive: boolean) => {
    const colors = PlatformContextService.getPlatformColors(platform);
    
    if (isActive) {
      return {
        backgroundColor: `${colors.primary}15`, // 15% opacity
        borderColor: colors.primary,
        color: colors.primary
      };
    }
    
    return {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      color: 'inherit'
    };
  };

  const handlePlatformClick = (platform: Platform) => {
    if (platform !== activePlatform) {
      onPlatformChange(platform);
    }
  };

  return (
    <div className={`platform-switcher ${className}`}>
      {/* Platform Options */}
      <div className="space-y-1">
        {availablePlatforms.map((platform) => {
          const isActive = platform === activePlatform;
          const displayName = PlatformContextService.getPlatformDisplayName(platform);
          const colors = getPlatformColors(platform, isActive);

          return (
            <button
              key={platform}
              onClick={() => handlePlatformClick(platform)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200 ease-in-out
                hover:bg-gray-50 dark:hover:bg-gray-800
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                ${isActive 
                  ? 'shadow-sm border' 
                  : 'border border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                }
              `}
              style={{
                backgroundColor: colors.backgroundColor,
                borderColor: colors.borderColor,
                color: colors.color
              }}
              title={`Switch to ${displayName}`}
            >
              {/* Platform Icon */}
              <span className="flex-shrink-0">
                {getPlatformIcon(platform)}
              </span>

              {/* Platform Name */}
              <span className="flex-1 text-left">
                {displayName}
              </span>

              {/* Active Indicator */}
              {isActive && (
                <span 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: colors.color }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Platform Info */}
      {activePlatform !== PLATFORM.ALL && (
        <div className="mt-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <div className="flex justify-between items-center">
              <span>Lead Time:</span>
              <span className="font-medium">
                {PlatformContextService.getPlatformLeadTime(activePlatform)} days
              </span>
            </div>
            {activePlatform === PLATFORM.AMAZON && (
              <div className="flex justify-between items-center mt-1">
                <span>Referral Fee:</span>
                <span className="font-medium">
                  {(PlatformContextService.getPlatformReferralFee(activePlatform) * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unified View Info */}
      {activePlatform === PLATFORM.ALL && (
        <div className="mt-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-xs text-blue-600 dark:text-blue-400">
            <div className="font-medium mb-1">Unified View</div>
            <div>Showing data from all platforms</div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Compact version of platform switcher for mobile/tablet
 */
export const CompactPlatformSwitcher: React.FC<PlatformSwitcherProps> = ({
  activePlatform,
  onPlatformChange,
  availablePlatforms = [PLATFORM.ALL, PLATFORM.BLINKIT, PLATFORM.AMAZON],
  className = ''
}) => {
  const getPlatformIcon = (platform: Platform) => {
    switch (platform) {
      case PLATFORM.ALL:
        return <Layers className="w-5 h-5" />;
      case PLATFORM.BLINKIT:
        return <ShoppingBag className="w-5 h-5" />;
      case PLATFORM.AMAZON:
        return <Box className="w-5 h-5" />;
      default:
        return <Layers className="w-5 h-5" />;
    }
  };

  return (
    <div className={`compact-platform-switcher flex gap-1 ${className}`}>
      {availablePlatforms.map((platform) => {
        const isActive = platform === activePlatform;
        const displayName = PlatformContextService.getPlatformDisplayName(platform);
        const colors = PlatformContextService.getPlatformColors(platform);

        return (
          <button
            key={platform}
            onClick={() => onPlatformChange(platform)}
            className={`
              flex items-center justify-center p-2 rounded-lg
              transition-all duration-200 ease-in-out
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              ${isActive 
                ? 'shadow-sm border-2' 
                : 'border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }
            `}
            style={isActive ? {
              backgroundColor: `${colors.primary}15`,
              borderColor: colors.primary,
              color: colors.primary
            } : {}}
            title={displayName}
          >
            {getPlatformIcon(platform)}
          </button>
        );
      })}
    </div>
  );
};

export default PlatformSwitcher;