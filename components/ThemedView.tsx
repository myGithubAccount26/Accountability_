import React from 'react';
import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, children, ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');
  
  // Filter out any text nodes to avoid React Native warnings
  const safeChildren = React.Children.toArray(children).filter(
    child => typeof child !== 'string' && typeof child !== 'number'
  );
  
  return <View style={[{ backgroundColor }, style]} {...otherProps}>{safeChildren}</View>;
}
