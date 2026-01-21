/**
 * StatusColorCoding - Consistent color mapping utility
 * 
 * Provides consistent color coding across the application:
 * - Green: healthy, moving, good, excellent
 * - Yellow: warning, medium, idle
 * - Red: critical, high, expiry_risk
 * 
 * Requirements: 6.4
 */

export type StatusColor = 'green' | 'yellow' | 'red' | 'gray';

export interface ColorConfig {
  bg: string; // Background color class
  text: string; // Text color class
  border: string; // Border color class
  hex: string; // Hex color value
}

/**
 * Status to color mapping
 */
const STATUS_COLOR_MAP: Record<string, StatusColor> = {
  // Green statuses (healthy, positive)
  healthy: 'green',
  moving: 'green',
  good: 'green',
  excellent: 'green',
  active: 'green',
  completed: 'green',
  success: 'green',
  available: 'green',
  
  // Yellow statuses (warning, caution)
  warning: 'yellow',
  medium: 'yellow',
  idle: 'yellow',
  pending: 'yellow',
  moderate: 'yellow',
  caution: 'yellow',
  
  // Red statuses (critical, urgent)
  critical: 'red',
  high: 'red',
  expiry_risk: 'red',
  'expiry-risk': 'red',
  urgent: 'red',
  danger: 'red',
  error: 'red',
  failed: 'red',
  'out-of-stock': 'red',
  'out_of_stock': 'red',
  
  // Gray statuses (neutral, inactive)
  inactive: 'gray',
  disabled: 'gray',
  unknown: 'gray',
  'n/a': 'gray',
  na: 'gray',
};

/**
 * Color configuration for each status color
 */
const COLOR_CONFIGS: Record<StatusColor, ColorConfig> = {
  green: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-300',
    hex: '#10b981',
  },
  yellow: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-300',
    hex: '#f59e0b',
  },
  red: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300',
    hex: '#ef4444',
  },
  gray: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-300',
    hex: '#6b7280',
  },
};

/**
 * Get status color based on status string
 * 
 * @param status - Status string (case-insensitive)
 * @returns StatusColor ('green', 'yellow', 'red', or 'gray')
 */
export const getStatusColor = (status: string): StatusColor => {
  const normalizedStatus = status.toLowerCase().trim().replace(/\s+/g, '_');
  return STATUS_COLOR_MAP[normalizedStatus] || 'gray';
};

/**
 * Get color configuration for a status
 * 
 * @param status - Status string
 * @returns ColorConfig with Tailwind classes and hex value
 */
export const getStatusColorConfig = (status: string): ColorConfig => {
  const color = getStatusColor(status);
  return COLOR_CONFIGS[color];
};

/**
 * Get hex color value for a status
 * 
 * @param status - Status string
 * @returns Hex color string (e.g., '#10b981')
 */
export const getStatusHexColor = (status: string): string => {
  const config = getStatusColorConfig(status);
  return config.hex;
};

/**
 * Get Tailwind background class for a status
 * 
 * @param status - Status string
 * @returns Tailwind class string (e.g., 'bg-green-100')
 */
export const getStatusBgClass = (status: string): string => {
  const config = getStatusColorConfig(status);
  return config.bg;
};

/**
 * Get Tailwind text class for a status
 * 
 * @param status - Status string
 * @returns Tailwind class string (e.g., 'text-green-800')
 */
export const getStatusTextClass = (status: string): string => {
  const config = getStatusColorConfig(status);
  return config.text;
};

/**
 * Get Tailwind border class for a status
 * 
 * @param status - Status string
 * @returns Tailwind class string (e.g., 'border-green-300')
 */
export const getStatusBorderClass = (status: string): string => {
  const config = getStatusColorConfig(status);
  return config.border;
};

/**
 * Get complete badge classes for a status
 * 
 * @param status - Status string
 * @returns Combined Tailwind classes for a badge
 */
export const getStatusBadgeClasses = (status: string): string => {
  const config = getStatusColorConfig(status);
  return `${config.bg} ${config.text} ${config.border} border px-2 py-1 rounded-full text-xs font-medium`;
};
