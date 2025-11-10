import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Icon } from '@rneui/themed';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  children?: React.ReactNode;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  children,
}) => {
  return (
    <ThemedView style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>
          <ThemedText type="title" style={styles.value}>{value}</ThemedText>
          {subtitle && <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>}
        </View>
        {icon && <Icon name={icon} size={28} color="rgba(0,0,0,0.4)" />}
      </View>
      {children}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1,
    opacity: 0.7,
  },
  value: {
    fontSize: 28,
    marginVertical: 4,
  },
  subtitle: {
    opacity: 0.7,
  },
});
