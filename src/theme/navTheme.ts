import { DefaultTheme } from '@react-navigation/native';
import { getAppColors } from './tokens';

export function createNavTheme(scheme?: 'light' | 'dark' | null) {
  const appColors = getAppColors(scheme);
  return {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: appColors.bg,
      card: appColors.surface,
      text: appColors.text,
      border: appColors.border,
      primary: appColors.primary,
      notification: appColors.accent
    }
  };
}
