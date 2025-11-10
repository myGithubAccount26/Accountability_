import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Reward, getRewards } from '@/services/points-api';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface RewardHistoryProps {
  limit?: number;
}

export default function RewardHistory({ limit = 20 }: RewardHistoryProps) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();

  const loadRewards = async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const rewardsData = await getRewards(limit);
      setRewards(rewardsData);
    } catch (error) {
      console.error('Error loading rewards:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRewards();
  }, [limit]);

  const handleRefresh = () => {
    loadRewards(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const renderReward = ({ item }: { item: Reward }) => (
    <ThemedView style={styles.rewardItem}>
      <View style={styles.rewardHeader}>
        <ThemedText style={styles.rewardName}>{item.name}</ThemedText>
        <ThemedText style={styles.rewardDate}>{formatDate(item.date)}</ThemedText>
      </View>
      {item.description && (
        <ThemedText style={styles.rewardDescription}>{item.description}</ThemedText>
      )}
      <View style={styles.rewardFooter}>
        <ThemedText style={styles.rewardCost}>-{item.points_cost} points</ThemedText>
      </View>
    </ThemedView>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors[colorScheme].tint} />
      </View>
    );
  }

  return (
    <FlatList
      data={rewards}
      renderItem={renderReward}
      keyExtractor={(item) => item.id.toString()}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[Colors[colorScheme].tint]}
          tintColor={Colors[colorScheme].tint}
        />
      }
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={
        <ThemedView style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>
            No rewards history found.
          </ThemedText>
        </ThemedView>
      }
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContent: {
    padding: 16,
  },
  rewardItem: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rewardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rewardName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  rewardDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  rewardDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  rewardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  rewardCost: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F44336',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
});