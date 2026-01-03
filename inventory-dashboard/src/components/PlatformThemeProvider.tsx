import React, { createContext, useContext, useEffect } from 'react';
import type { Platform } from '../types';
import { PlatformContextService } from '../services/PlatformContextService';

interface PlatformTheme {
  primary: string;
  accent: string;
  displayName: string;
  icon: string;
}

interface PlatformThemeContextType {
  theme: PlatformTheme;
  platform: Platform;
  setPlatform: (platform: Platform) => void;
}

const PlatformThemeContext = createContext<PlatformThemeContextType | null>(null);

interface PlatformThemeProviderProps {
  children: React.ReactNode;
  activePlatform: Platform;
  onPlatformChange: (platform: Platform) => void;
}

export const PlatformThemeProvider: React.FC<PlatformThemeProviderProps> = ({
  children,
  activePlatform,
  onPlatformChange
}) => {
  const theme: PlatformTheme = {
    primary: PlatformContextService.getPlatformColors(activePlatform).primary,
    accent: PlatformContextService.getPlatformColors(activePlatform).accent,
    displayName: PlatformContextService.getPlatformDisplayName(activePlatform),
    icon: PlatformContextService.getPlatformIcon(activePlatform)
  };

  // Apply CSS custom properties for dynamic theming
  useEffect(() => {
    const root = document.documentElement;
    
    // Set platform-specific colors as CSS variables
    root.style.setProperty('--platform-primary', theme.primary);
    root.style.setProperty('--platform-accent', theme.accent);
    
    // Apply platform-specific color overrides
    if (activePlatform === 'Amazon') {
      root.style.setProperty('--vyndo-primary', '#146EB4'); // Amazon Blue
      root.style.setProperty('--vyndo-accent', '#FF9900'); // Amazon Yellow
      root.style.setProperty('--chart-primary', '#146EB4');
      root.style.setProperty('--chart-accent', '#FF9900');
    } else if (activePlatform === 'Blinkit') {
      root.style.setProperty('--vyndo-primary', '#F36F21'); // Vyndo Orange
      root.style.setProperty('--vyndo-accent', '#2D6A4F'); // Millet Green
      root.style.setProperty('--chart-primary', '#F36F21');
      root.style.setProperty('--chart-accent', '#2D6A4F');
    } else {
      // Unified view - neutral colors
      root.style.setProperty('--vyndo-primary', '#6B7280'); // Neutral Gray
      root.style.setProperty('--vyndo-accent', '#4F46E5'); // Neutral Purple
      root.style.setProperty('--chart-primary', '#6B7280');
      root.style.setProperty('--chart-accent', '#4F46E5');
    }
    
    // Add platform-specific class to body for conditional styling
    document.body.className = document.body.className.replace(/platform-\w+/g, '');
    document.body.classList.add(`platform-${activePlatform.toLowerCase()}`);
    
    return () => {
      // Cleanup on unmount
      document.body.className = document.body.className.replace(/platform-\w+/g, '');
    };
  }, [activePlatform, theme.primary, theme.accent]);

  const contextValue: PlatformThemeContextType = {
    theme,
    platform: activePlatform,
    setPlatform: onPlatformChange
  };

  return (
    <PlatformThemeContext.Provider value={contextValue}>
      {children}
    </PlatformThemeContext.Provider>
  );
};

export const usePlatformTheme = (): PlatformThemeContextType => {
  const context = useContext(PlatformThemeContext);
  if (!context) {
    throw new Error('usePlatformTheme must be used within a PlatformThemeProvider');
  }
  return context;
};

// Utility function to get platform-specific styles
export const getPlatformStyles = (platform: Platform) => {
  const colors = PlatformContextService.getPlatformColors(platform);
  
  return {
    primary: colors.primary,
    accent: colors.accent,
    gradient: `linear-gradient(135deg, ${colors.primary}20, ${colors.accent}20)`,
    border: `1px solid ${colors.primary}30`,
    shadow: `0 4px 12px ${colors.primary}20`
  };
};

// Platform-aware button component
interface PlatformButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  className?: string;
  disabled?: boolean;
}

export const PlatformButton: React.FC<PlatformButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false
}) => {
  const { theme } = usePlatformTheme();
  
  const baseStyles = 'px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const primaryStyles = disabled 
    ? 'bg-gray-400 text-white opacity-50 cursor-not-allowed'
    : 'text-white hover:opacity-90';
    
  const secondaryStyles = disabled
    ? 'border border-gray-400 text-gray-400 opacity-50 cursor-not-allowed'
    : 'border hover:text-white';
  
  const dynamicStyles = variant === 'primary' ? primaryStyles : secondaryStyles;
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${dynamicStyles} ${className}`}
      style={{
        backgroundColor: variant === 'primary' && !disabled ? theme.primary : undefined,
        borderColor: variant === 'secondary' && !disabled ? theme.primary : undefined,
        color: variant === 'secondary' && !disabled ? theme.primary : undefined,
      }}
      onMouseEnter={(e) => {
        if (!disabled && variant === 'secondary') {
          e.currentTarget.style.backgroundColor = theme.primary;
          e.currentTarget.style.color = 'white';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && variant === 'secondary') {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = theme.primary;
        }
      }}
    >
      {children}
    </button>
  );
};