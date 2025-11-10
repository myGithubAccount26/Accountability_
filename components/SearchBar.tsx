import React from 'react';
import { StyleSheet, TextInput, View, TouchableOpacity, Platform } from 'react-native';
import { Icon } from '@rneui/themed';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ThemedView } from './ThemedView';

type SearchBarProps = {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  onSearch?: () => void;
};

export const SearchBar = ({ 
  placeholder = 'Search activities...', 
  value, 
  onChangeText,
  onClear,
  onSearch
}: SearchBarProps) => {
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');

  return (
    <ThemedView style={[styles.container, { borderColor }]}>
      <Icon
        name="search"
        type="material"
        size={20}
        color={tintColor}
        style={styles.searchIcon}
      />
      <TextInput
        style={[styles.input, { color: textColor }]}
        placeholder={placeholder}
        placeholderTextColor="#888888"
        value={value}
        onChangeText={onChangeText}
        clearButtonMode="while-editing"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={onSearch}
      />
      {value.length > 0 && Platform.OS !== 'ios' && (
        <TouchableOpacity 
          onPress={() => {
            onChangeText('');
            if (onClear) onClear();
            if (onSearch) onSearch();
          }}
          style={styles.clearButton}
        >
          <Icon name="close" type="material" size={20} color="#888" />
        </TouchableOpacity>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
});