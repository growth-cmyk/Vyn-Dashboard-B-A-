/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{html,js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Enhanced Vyndo Semantic Color System
        vyndo: {
          // Primary Brand Colors (Orange)
          primary: {
            50: '#FFF7ED',   // Lightest orange tint
            100: '#FFEDD5',  // Light orange tint  
            200: '#FED7AA',  // Lighter orange
            300: '#FDBA74',  // Light orange
            400: '#FB923C',  // Medium light orange
            500: '#ef5326',  // Vyndo Orange (primary) - EXACT BRAND COLOR
            600: '#EA580C',  // Darker orange
            700: '#C2410C',  // Dark orange
            800: '#9A3412',  // Darker orange
            900: '#7C2D12'   // Darkest orange
          },
          
          // Success Colors (Millet Green)
          success: {
            50: '#ECFDF5',   // Light green background
            100: '#D1FAE5',  // Lighter green
            200: '#A7F3D0',  // Light green
            300: '#6EE7B7',  // Medium light green
            400: '#34D399',  // Medium green
            500: '#2D6A4F',  // Millet Green (primary)
            600: '#166534',  // Darker green
            700: '#15803D',  // Dark green
            800: '#166534',  // Darker green
            900: '#14532D'   // Darkest green
          },
          
          // Warning Colors (Harvest Gold)
          warning: {
            50: '#FFFBEB',   // Light gold background
            100: '#FEF3C7',  // Lighter gold
            200: '#FDE68A',  // Light gold
            300: '#FCD34D',  // Medium light gold
            400: '#FBBF24',  // Medium gold
            500: '#FFB703',  // Harvest Gold (primary)
            600: '#D97706',  // Darker gold
            700: '#B45309',  // Dark gold
            800: '#92400E',  // Darker gold
            900: '#78350F'   // Darkest gold
          },
          
          // Danger Colors (Alert Red)
          danger: {
            50: '#FEF2F2',   // Light red background
            100: '#FEE2E2',  // Lighter red
            200: '#FECACA',  // Light red
            300: '#FCA5A5',  // Medium light red
            400: '#F87171',  // Medium red
            500: '#D90429',  // Alert Red (primary)
            600: '#DC2626',  // Darker red
            700: '#B91C1C',  // Dark red
            800: '#991B1B',  // Darker red
            900: '#7F1D1D'   // Darkest red
          },
          
          // Neutral System
          neutral: {
            50: '#F9FAFB',   // Background (lightest)
            100: '#F3F4F6',  // Light gray
            200: '#E5E7EB',  // Border gray
            300: '#D1D5DB',  // Medium light gray
            400: '#9CA3AF',  // Medium gray
            500: '#6B7280',  // Medium gray
            600: '#4B5563',  // Dark gray
            700: '#374151',  // Darker gray
            800: '#1F2937',  // Very dark gray
            900: '#1A1A1A'   // Text color (darkest)
          },
          
          // Legacy colors for backward compatibility
          orange: '#ef5326',  // EXACT BRAND COLOR
          green: '#2D6A4F',
          gold: '#FFB703',
          red: '#D90429',
          background: '#F9FAFB',
          surface: '#FFFFFF',
          text: '#1A1A1A',
        }
      },
      
      // Enhanced spacing system
      spacing: {
        'xs': '0.5rem',   // 8px
        'sm': '0.75rem',  // 12px
        'md': '1rem',     // 16px
        'lg': '1.5rem',   // 24px
        'xl': '2rem',     // 32px
        '2xl': '3rem',    // 48px
        '3xl': '4rem',    // 64px
      },
      
      // Typography system
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      
      // Glassmorphism and modern effects
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
      
      // Enhanced shadows for elevation
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glass-sm': '0 4px 16px 0 rgba(31, 38, 135, 0.25)',
        'glass-lg': '0 12px 48px 0 rgba(31, 38, 135, 0.45)',
        'elevated': '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'elevated-lg': '0 20px 50px -12px rgba(0, 0, 0, 0.25)',
      },
      
      // Animation and transition system
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
      },
      
      // Border radius system
      borderRadius: {
        'xs': '0.125rem',  // 2px
        'sm': '0.25rem',   // 4px
        'md': '0.375rem',  // 6px
        'lg': '0.5rem',    // 8px
        'xl': '0.75rem',   // 12px
        '2xl': '1rem',     // 16px
        '3xl': '1.5rem',   // 24px
      },
    },
  },
  plugins: [],
}