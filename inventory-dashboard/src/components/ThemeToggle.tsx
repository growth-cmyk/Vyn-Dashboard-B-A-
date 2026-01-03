import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { ThemeService } from '../services/ThemeService';
import { UserPreferenceService } from '../services/UserPreferenceService';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

/**
 * ThemeToggle - Smooth theme toggle with sun/moon icons
 * Features smooth transitions and neon accent effects in dark mode
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  size = 'md',
  showLabel = false
}) => {
  const [isDark, setIsDark] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Initialize theme state
    const currentTheme = ThemeService.getTheme();
    setIsDark(currentTheme.mode === 'dark');

    // Listen for theme changes
    const handleThemeChange = (event: CustomEvent) => {
      setIsDark(event.detail.current.mode === 'dark');
    };

    window.addEventListener('themechange', handleThemeChange as EventListener);
    
    return () => {
      window.removeEventListener('themechange', handleThemeChange as EventListener);
    };
  }, []);

  const handleToggle = () => {
    setIsAnimating(true);
    
    // Toggle theme
    ThemeService.toggleDarkMode();
    
    // Update user preferences
    const newMode = isDark ? 'light' : 'dark';
    UserPreferenceService.updateThemePreferences({ mode: newMode });
    
    // Reset animation state
    setTimeout(() => setIsAnimating(false), 500);
  };

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <button
        onClick={handleToggle}
        className={`
          ${sizeClasses[size]}
          relative flex items-center justify-center
          rounded-full transition-all duration-300 ease-in-out
          bg-vyndo-neutral-100 hover:bg-vyndo-neutral-200
          dark:bg-slate-800 dark:hover:bg-slate-700
          border border-vyndo-neutral-200 dark:border-slate-600
          theme-toggle ${isAnimating ? 'rotating' : ''}
          focus:outline-none focus:ring-2 focus:ring-vyndo-primary-500 focus:ring-offset-2
          dark:focus:ring-vyndo-primary-400 dark:focus:ring-offset-slate-900
          ${isDark ? 'dark:shadow-lg dark:shadow-orange-500/20' : ''}
        `}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {/* Background glow effect for dark mode */}
        {isDark && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500/20 to-yellow-500/20 blur-sm" />
        )}
        
        {/* Icon container */}
        <div className="relative z-10">
          {isDark ? (
            <Moon 
              className={`
                ${iconSizes[size]} 
                text-slate-300 transition-all duration-300
                ${isAnimating ? 'scale-110' : ''}
              `}
            />
          ) : (
            <Sun 
              className={`
                ${iconSizes[size]} 
                text-amber-600 transition-all duration-300
                ${isAnimating ? 'scale-110' : ''}
              `}
            />
          )}
        </div>
        
        {/* Ripple effect */}
        <div className={`
          absolute inset-0 rounded-full opacity-0 transition-opacity duration-300
          ${isAnimating ? 'opacity-100' : ''}
          ${isDark 
            ? 'bg-gradient-to-r from-orange-400/30 to-yellow-400/30' 
            : 'bg-gradient-to-r from-amber-400/30 to-orange-400/30'
          }
        `} />
      </button>
      
      {showLabel && (
        <span className="text-sm font-medium text-vyndo-neutral-700 dark:text-slate-300 transition-colors duration-300">
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}
    </div>
  );
};

export default ThemeToggle;