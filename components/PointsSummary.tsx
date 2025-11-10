import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from '@rneui/themed';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';

interface PointsSummaryProps {
  dailyPoints: number;
  weeklyPoints: number;
  monthlyPoints: number;
  totalPoints: number;
  streakDays: number;
  onPress?: () => void;
}

export function PointsSummary({
  dailyPoints = 0,
  weeklyPoints = 0,
  monthlyPoints = 0, 
  totalPoints = 0,
  streakDays = 0,
  onPress
}: PointsSummaryProps) {
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <ThemedView style={styles.card}>
        {/* Total Points Section */}
        <View style={styles.totalPointsContainer}>
          <ThemedText type="title" style={styles.totalPoints}>
            {totalPoints}
          </ThemedText>
          <ThemedText style={styles.pointsLabel}>
            Total Points
          </ThemedText>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Daily Points */}
          <View style={styles.statItem}>
            <Icon name="today" size={18} color={textColor} style={styles.statIcon} />
            <ThemedText style={styles.statValue}>{dailyPoints}</ThemedText>
            <ThemedText style={styles.statLabel}>Today</ThemedText>
          </View>

          {/* Weekly Points */}
          <View style={styles.statItem}>
            <Icon name="date-range" size={18} color={textColor} style={styles.statIcon} />
            <ThemedText style={styles.statValue}>{weeklyPoints}</ThemedText>
            <ThemedText style={styles.statLabel}>This Week</ThemedText>
          </View>

          {/* Monthly Points */}
          <View style={styles.statItem}>
            <Icon name="calendar-today" size={18} color={textColor} style={styles.statIcon} />
            <ThemedText style={styles.statValue}>{monthlyPoints}</ThemedText>
            <ThemedText style={styles.statLabel}>This Month</ThemedText>
          </View>

          {/* Streak Days */}
          <View style={styles.statItem}>
            <Icon name="whatshot" size={18} color={textColor} style={styles.statIcon} />
            <ThemedText style={styles.statValue}>{streakDays}</ThemedText>
            <ThemedText style={styles.statLabel}>Day Streak</ThemedText>
          </View>
        </View>

        {/* Show details indicator */}
        {onPress && (
          <View style={styles.detailsIndicator}>
            <Icon name="chevron-right" size={20} color={tintColor} />
          </View>
        )}
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  totalPointsContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  totalPoints: {
    fontSize: 36,
    lineHeight: 40,
  },
  pointsLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  statIcon: {
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  detailsIndicator: {
    position: 'absolute',
    right: 8,
    top: 8,
    padding: 4,
  },
});