/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EFF6FF',
          500: '#2563EB',
          600: '#1D4ED8',
          purple: '#7C3AED',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#0F172A',
          subtle: '#F8FAFC',
          'subtle-dark': '#1E293B',
        },
        ink: {
          DEFAULT: '#0F172A',
          dark: '#F8FAFC',
          muted: '#64748B',
          'muted-dark': '#CBD5E1',
        },
        line: {
          DEFAULT: '#E2E8F0',
          dark: '#334155',
        },
        success: '#15803D',
        warning: '#B45309',
        danger: '#B91C1C',
      },
      fontFamily: {
        jakarta: ['PlusJakartaSans_400Regular'],
        'jakarta-medium': ['PlusJakartaSans_500Medium'],
        'jakarta-semibold': ['PlusJakartaSans_600SemiBold'],
        'jakarta-bold': ['PlusJakartaSans_700Bold'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        sheet: '24px',
      },
      spacing: {
        touch: '44px',
        control: '48px',
      },
    },
  },
  plugins: [],
};
