/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#0a7ea4'; // Using same tint color for both themes for consistency

export const Colors = {
  light: {
    text: '#11181C',           // Dark gray, almost black
    background: '#FFFFFF',     // Pure white
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    card: '#F8F9FA',          // Very light gray for cards
    border: '#E9ECEF',        // Light gray for borders
    cardBackground: '#F8F9FA', // Card background color
  },
  dark: {
    text: '#000000',          // Black text for better contrast
    background: '#FFFFFF',    // White background in both modes
    tint: tintColorDark,
    icon: '#495057',          // Darker icon color for contrast
    tabIconDefault: '#6C757D',
    tabIconSelected: tintColorDark,
    card: '#F8F9FA',          // Same card color for consistency
    border: '#E9ECEF',        // Same border color for consistency
    cardBackground: '#F8F9FA', // Card background color
  },
};
