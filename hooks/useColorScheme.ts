import { ColorSchemeName, useColorScheme as nativeUseColorScheme } from 'react-native';

// The app can use this hook to get the current color scheme
// With the ability to override the default behavior if needed
export function useColorScheme(): NonNullable<ColorSchemeName> {
  // Get the device color scheme, defaulting to 'light' if not available
  const colorScheme = nativeUseColorScheme() ?? 'light';
  
  // For now, we always return 'light' for consistency, but you can modify this
  // to respect the system setting by returning colorScheme instead
  return 'light';
}
