export const colors = {
  brand: '#2563EB',
  brandPressed: '#1D4ED8',
  purple: '#7C3AED',
  light: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceVariant: '#F1F5F9',
    text: '#0F172A',
    muted: '#64748B',
    border: '#E2E8F0',
    error: '#B91C1C',
    errorContainer: '#FEE2E2',
    onError: '#FFFFFF',
    onErrorContainer: '#7F1D1D',
    warning: '#B45309',
    warningContainer: '#FEF3C7',
    info: '#1D4ED8',
    infoContainer: '#DBEAFE',
    success: '#15803D',
    successContainer: '#DCFCE7',
  },
  dark: {
    background: '#020617',
    surface: '#0F172A',
    surfaceVariant: '#1E293B',
    text: '#F8FAFC',
    muted: '#CBD5E1',
    border: '#334155',
    error: '#FCA5A5',
    errorContainer: '#7F1D1D',
    onError: '#450A0A',
    onErrorContainer: '#FEE2E2',
    warning: '#FCD34D',
    warningContainer: '#78350F',
    info: '#93C5FD',
    infoContainer: '#1E3A8A',
    success: '#86EFAC',
    successContainer: '#14532D',
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
