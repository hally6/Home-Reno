export const lightAppColors = {
  bg: '#F7F5EF',
  surface0: '#F7F5EF',
  surface1: '#FFFFFF',
  surface2: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#EAE5D9',
  primary: '#0E6B56',
  accent: '#C97A2B',
  text: '#1D2A24',
  textMuted: '#5A655F',
  buttonText: '#FFFFFF',
  overlayText: '#FFFFFF',
  overlayBackground: '#FFFFFFCC',
  border: '#D5D0C3',
  danger: '#9C2F2F'
} as const;

export const darkAppColors = {
  bg: '#0F1412',
  surface0: '#0F1412',
  surface1: '#18201D',
  surface2: '#1F2925',
  surface: '#18201D',
  surfaceMuted: '#23302B',
  primary: '#3FB894',
  accent: '#D78D41',
  text: '#E8F0EC',
  textMuted: '#A9B8B0',
  buttonText: '#0F1412',
  overlayText: '#FFFFFF',
  overlayBackground: '#000000B3',
  border: '#2D3D37',
  danger: '#E06A6A'
} as const;

export type AppColors = { -readonly [Key in keyof typeof lightAppColors]: string };

const lightStatusColors = {
  success: { bg: '#E6F3EF', text: '#0E6B56' },
  warning: { bg: '#FFF2E6', text: '#8A531E' },
  danger: { bg: '#FDECEC', text: '#9C2F2F' },
  info: { bg: '#E8EFF7', text: '#1E4D78' },
  neutral: { bg: '#EAE5D9', text: '#415048' }
} as const;

const darkStatusColors = {
  success: { bg: '#163126', text: '#8CDEC4' },
  warning: { bg: '#3A2A1A', text: '#F3C28B' },
  danger: { bg: '#3C2020', text: '#F0A4A4' },
  info: { bg: '#1C2A39', text: '#9BC4EA' },
  neutral: { bg: '#2B322F', text: '#C2CEC8' }
} as const;

export type StatusColors = {
  -readonly [Color in keyof typeof lightStatusColors]: {
    -readonly [Tone in keyof (typeof lightStatusColors)[Color]]: string;
  };
};

export function getStatusColors(scheme?: 'light' | 'dark' | null): StatusColors {
  return scheme === 'dark' ? darkStatusColors : lightStatusColors;
}

export const statusColors: StatusColors = {
  success: { ...lightStatusColors.success },
  warning: { ...lightStatusColors.warning },
  danger: { ...lightStatusColors.danger },
  info: { ...lightStatusColors.info },
  neutral: { ...lightStatusColors.neutral }
};

function applyStatusColors(scheme?: 'light' | 'dark' | null): void {
  const next = getStatusColors(scheme);
  for (const color of Object.keys(next) as Array<keyof StatusColors>) {
    for (const tone of Object.keys(next[color]) as Array<keyof StatusColors[typeof color]>) {
      statusColors[color][tone] = next[color][tone];
    }
  }
}

export function getAppColors(scheme?: 'light' | 'dark' | null): AppColors {
  return scheme === 'dark' ? darkAppColors : lightAppColors;
}

export const appColors: AppColors = { ...lightAppColors };

export function applyAppColors(scheme?: 'light' | 'dark' | null): void {
  const next = getAppColors(scheme);
  for (const key of Object.keys(next) as Array<keyof AppColors>) {
    appColors[key] = next[key];
  }
  applyStatusColors(scheme);
}

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6
  }
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30
} as const;

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16
} as const;

export const typography = {
  titleLg: {
    fontSize: 20,
    fontWeight: '700'
  },
  titleMd: {
    fontSize: 16,
    fontWeight: '600'
  },
  body: {
    fontSize: 14,
    fontWeight: '400'
  },
  bodyStrong: {
    fontSize: 14,
    fontWeight: '600'
  },
  caption: {
    fontSize: 12,
    fontWeight: '400'
  },
  captionStrong: {
    fontSize: 12,
    fontWeight: '600'
  },
  metric: {
    fontSize: 24,
    fontWeight: '800'
  }
} as const;
