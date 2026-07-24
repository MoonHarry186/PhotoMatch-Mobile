export const colors = {
  brand: '#2563EB',
  brandPressed: '#1D4ED8',
  purple: '#7C3AED',
  light: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#0F172A',
    muted: '#64748B',
    border: '#E2E8F0',
  },
  dark: {
    background: '#020617',
    surface: '#0F172A',
    text: '#F8FAFC',
    muted: '#CBD5E1',
    border: '#334155',
  },
  success: '#15803D',
  warning: '#B45309',
  danger: '#B91C1C',
} as const;

export const gradients = {
  brand: [colors.brand, colors.purple] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  sheet: 24,
  full: 999,
} as const;
export const elevation = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
} as const;
export const motion = {
  fast: 150,
  normal: 240,
  slow: 360,
} as const;
export const typography = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  fallback: 'System',
} as const;

export const touchTarget = 44;
export const controlHeight = 48;
