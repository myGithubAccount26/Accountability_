import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { AvailableReward, getAvailableRewards, getTotalPoints, purchaseReward, getRewards, Reward } from '@/services/points-api';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function ShopScreen() {
  const [rewards, setRewards] = useState<AvailableReward[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReward, setSelectedReward] = useState<AvailableReward | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<Reward[]>([]);
  const [activeTab, setActiveTab] = useState<'shop' | 'history'>('shop');
  const colorScheme = useColorScheme();

  // Load rewards and points
  const loadData = useCallback(async () => {
    console.log('Loading shop data...');
    setRefreshing(true);
    
    // Default mock data to use if API calls fail
    const mockRewards = [
      {
        id: 1,
        name: "Movie Night",
        points_cost: 300,
        description: "Enjoy a movie of your choice with snacks",
        category: "Entertainment"
      },
      {
        id: 2,
        name: "Restaurant Dinner",
        points_cost: 1000,
        description: "Dinner at a restaurant of your choice",
        category: "Food"
      },
      {
        id: 3,
        name: "Video Game Time",
        points_cost: 200,
        description: "2 hours of guilt-free gaming",
        category: "Entertainment"
      },
      {
        id: 4,
        name: "Sleep In",
        points_cost: 250,
        description: "Wake up 1 hour later than usual",
        category: "Rest"
      }
    ];
    
    try {
      console.log('Fetching total points...');
      // Always get points first and separately to ensure latest balance
      const freshPoints = await getTotalPoints(true);
      console.log('Current points:', freshPoints);
      setTotalPoints(freshPoints);
      
      // Then load the other data
      console.log('Fetching rewards and history...');
      const [rewardsData, purchasedRewards] = await Promise.all([
        getAvailableRewards().catch(err => {
          console.error('Error fetching rewards:', err);
          return mockRewards;
        }),
        getRewards().catch(err => {
          console.error('Error fetching purchase history:', err);
          return []; // Empty purchase history as fallback
        })
      ]);
      
      console.log(`Loaded ${rewardsData.length} rewards and ${purchasedRewards.length} purchase records`);
      setRewards(rewardsData);
      setPurchaseHistory(purchasedRewards);
    } catch (error) {
      console.error('Error loading shop data:', error);
      // Use fallback data only if points fetch fails
      setRewards(mockRewards);
      setPurchaseHistory([]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Refresh data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle reward purchase
  const handlePurchase = async (reward: AvailableReward) => {
    console.log(`Attempting to purchase ${reward.name} for ${reward.points_cost} points. Current points: ${totalPoints}`);
    
    if (totalPoints < reward.points_cost) {
      Alert.alert(
        'Not enough points',
        `You need ${reward.points_cost - totalPoints} more points to purchase this reward.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Confirm purchase with simpler flow
    const confirmPurchase = async () => {
      try {
        console.log('Making purchase API call...');
        
        // Simple direct purchase
        const result = await purchaseReward(reward.name, reward.points_cost, reward.description);
        console.log('Purchase API response:', result);
        
        if (result && result.success) {
          // Update points balance
          const newTotal = result.remaining_points || result.points_remaining || 0;
          setTotalPoints(newTotal);
          
          // Show success message
          Alert.alert(
            'Purchase Successful!', 
            `You've purchased "${reward.name}" for ${reward.points_cost} points.\n\nYou now have ${newTotal} points remaining.`,
            [
              { 
                text: 'View Inventory', 
                onPress: () => {
                  setActiveTab('history');
                  loadData();
                }
              },
              { 
                text: 'Stay in Shop', 
                onPress: () => loadData()
              }
            ]
          );
        } else {
          // Show error message
          Alert.alert(
            'Purchase Failed', 
            result?.message || 'Could not complete your purchase',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('Error purchasing reward:', error);
        
        // Show error message
        Alert.alert(
          'Purchase Error', 
          String(error),
          [{ text: 'OK' }]
        );
      }
    };

    // Initial confirmation
    Alert.alert(
      'Confirm Purchase',
      `Are you sure you want to purchase "${reward.name}" for ${reward.points_cost} points?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purchase',
          onPress: confirmPurchase
        }
      ]
    );
  };

  // Render reward item
  const renderRewardItem = ({ item }: { item: AvailableReward }) => {
    const isAffordable = totalPoints >= item.points_cost;
    
    // Direct purchase handler for each item that bypasses confirmation
    const directPurchase = async () => {
      console.log(`Direct purchase attempt for ${item.name}`, item);
      
      if (totalPoints < item.points_cost) {
        Alert.alert('Not enough points', `You need ${item.points_cost - totalPoints} more points.`);
        return;
      }
      
      try {
        console.log('Making direct purchase API call...');
        const result = await purchaseReward(item.name, item.points_cost, item.description);
        console.log('Direct purchase result:', result);
        
        if (result && result.success) {
          // Update points balance immediately
          const newTotal = result.remaining_points || 0;
          setTotalPoints(newTotal);
          
          // Add the purchase to history immediately
          const newPurchase = {
            id: result.transaction_id || Date.now(),
            date: new Date().toISOString(),
            reward_name: item.name,
            points_cost: item.points_cost,
            description: item.description || ""
          };
          
          // Update history state
          setPurchaseHistory(prev => [newPurchase, ...prev]);
          
          // Show success message
          Alert.alert(
            'Purchase Successful!', 
            `You've purchased "${item.name}" for ${item.points_cost} points.\n\nYou now have ${newTotal} points remaining.`,
            [
              { 
                text: 'View Inventory', 
                onPress: () => {
                  // Refresh data and switch to history tab
                  loadData();
                  setActiveTab('history');
                }
              },
              { 
                text: 'Continue Shopping', 
                onPress: () => loadData() 
              }
            ]
          );
        } else {
          Alert.alert('Purchase Failed', result?.message || 'Failed to complete purchase');
        }
      } catch (error) {
        console.error('Direct purchase error:', error);
        Alert.alert('Purchase Error', String(error));
      }
    };
    
    return (
      <TouchableOpacity
        style={[
          styles.rewardCard,
          { backgroundColor: Colors[colorScheme].cardBackground },
          selectedReward?.id === item.id && styles.selectedCard,
          !isAffordable && styles.unaffordableCard
        ]}
        onPress={() => setSelectedReward(item)}
        activeOpacity={0.7}
      >
        <View style={styles.rewardContent}>
          <ThemedText style={styles.rewardName}>{item.name}</ThemedText>
          <ThemedText style={styles.rewardDescription}>{item.description}</ThemedText>
          <View style={styles.rewardCost}>
            <ThemedText style={[
              styles.pointsText, 
              !isAffordable && styles.unaffordableText
            ]}>
              {item.points_cost} points
            </ThemedText>
          </View>
        </View>
        
        {/* Always show purchase button for all cards */}
        <TouchableOpacity 
          style={[
            styles.purchaseButton,
            !isAffordable && styles.disabledButton
          ]}
          onPress={directPurchase}
          disabled={!isAffordable}
        >
          <ThemedText style={styles.purchaseButtonText}>
            {isAffordable ? `Buy for ${item.points_cost} pts` : 'Not enough points'}
          </ThemedText>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Render purchase history item
  const renderHistoryItem = ({ item }: { item: Reward }) => (
    <ThemedView style={styles.historyItem}>
      <View style={styles.historyHeader}>
        <ThemedText style={styles.historyName}>{item.reward_name || item.name}</ThemedText>
        <ThemedText style={styles.historyDate}>{formatDate(item.date)}</ThemedText>
      </View>
      {item.description && (
        <ThemedText style={styles.historyDescription}>{item.description}</ThemedText>
      )}
      <View style={styles.historyFooter}>
        <ThemedText style={styles.historyCost}>-{item.points_cost} points</ThemedText>
      </View>
    </ThemedView>
  );

  // Mock purchase (when API isn't available)
  const mockPurchase = (rewardName: string, pointsCost: number) => {
    // Update total points
    const newPoints = totalPoints - pointsCost;
    setTotalPoints(newPoints);
    
    // Add to purchase history
    const newPurchase = {
      id: Date.now(),
      date: new Date().toISOString(),
      reward_name: rewardName,
      points_cost: pointsCost,
      description: "Purchased with mock data"
    };
    
    setPurchaseHistory([newPurchase, ...purchaseHistory]);
    
    return {
      success: true,
      message: `Successfully purchased ${rewardName} for ${pointsCost} points`,
      remaining_points: newPoints,
      transaction_id: Date.now()
    };
  };
  
  // Debug function to test purchase
  const debugPurchase = async () => {
    console.log("Testing direct purchase...");
    try {
      // Basic purchase request without fallbacks
      const result = await purchaseReward(
        "Test Reward", 
        50, 
        "Test purchase for debugging"
      );
      
      console.log("Debug purchase result:", result);
      
      if (result && result.success) {
        // Update points balance immediately
        const newTotal = result.remaining_points || 0;
        setTotalPoints(newTotal);
        
        // Add the purchase to history immediately
        const newPurchase = {
          id: result.transaction_id || Date.now(),
          date: new Date().toISOString(),
          reward_name: "Test Reward",
          points_cost: 50,
          description: "Test purchase for debugging"
        };
        
        // Update history state
        setPurchaseHistory(prev => [newPurchase, ...prev]);
        
        Alert.alert(
          "Purchase Successful!", 
          `You've purchased "Test Reward" for 50 points.\n\nYou now have ${newTotal} points remaining.`,
          [
            { 
              text: 'View Inventory', 
              onPress: () => {
                loadData();
                setActiveTab('history');
              }
            },
            { 
              text: 'Stay in Shop', 
              onPress: () => loadData() 
            }
          ]
        );
      }
    } catch (error) {
      console.error("Debug purchase error:", error);
      Alert.alert(
        "Purchase Failed", 
        String(error),
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Rewards</ThemedText>
        <TouchableOpacity 
          onPress={debugPurchase}
          style={{padding: 8, backgroundColor: '#eaeaea', borderRadius: 4}}
        >
          <ThemedText>Test Purchase</ThemedText>
        </TouchableOpacity>
        <View style={styles.pointsContainer}>
          <ThemedText style={styles.pointsLabel}>Your Points:</ThemedText>
          <ThemedText style={styles.pointsValue}>{totalPoints}</ThemedText>
        </View>
      </View>
      
      {/* Tab navigation */}
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'shop' && styles.activeTab]} 
          onPress={() => setActiveTab('shop')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'shop' && styles.activeTabText]}>Shop</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'history' && styles.activeTab]} 
          onPress={() => setActiveTab('history')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>Inventory</ThemedText>
        </TouchableOpacity>
      </View>
      
      {activeTab === 'shop' ? (
        <>
          <FlatList
            data={rewards}
            renderItem={renderRewardItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.rewardsList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={loadData}
                colors={[Colors[colorScheme].tint]}
                tintColor={Colors[colorScheme].tint}
              />
            }
            ListEmptyComponent={
              <ThemedView style={styles.emptyContainer}>
                <ThemedText style={styles.emptyText}>
                  {refreshing ? 'Loading rewards...' : 'No rewards available'}
                </ThemedText>
              </ThemedView>
            }
          />
          
          {selectedReward && (
            <View style={styles.detailsContainer}>
              <ThemedText style={styles.detailsTitle}>
                {selectedReward.name}
              </ThemedText>
              <ThemedText style={styles.detailsDescription}>
                {selectedReward.description}
              </ThemedText>
              <TouchableOpacity 
                style={[
                  styles.detailsPurchaseButton,
                  totalPoints < selectedReward.points_cost && styles.disabledButton
                ]}
                onPress={() => handlePurchase(selectedReward)}
                disabled={totalPoints < selectedReward.points_cost}
              >
                <ThemedText style={styles.purchaseButtonText}>
                  {totalPoints >= selectedReward.points_cost 
                    ? `Purchase for ${selectedReward.points_cost} points` 
                    : `Need ${selectedReward.points_cost - totalPoints} more points`}
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </>
      ) : (
        <FlatList
          data={purchaseHistory}
          renderItem={renderHistoryItem}
          keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
          contentContainerStyle={styles.historyList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={loadData}
              colors={[Colors[colorScheme].tint]}
              tintColor={Colors[colorScheme].tint}
            />
          }
          ListEmptyComponent={
            <ThemedView style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>
                {refreshing ? 'Loading inventory...' : 'No purchases found. Buy something nice!'}
              </ThemedText>
            </ThemedView>
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  pointsContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  pointsLabel: {
    fontSize: 14,
  },
  pointsValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.light.tint,
  },
  tabText: {
    fontSize: 16,
  },
  activeTabText: {
    fontWeight: 'bold',
    color: Colors.light.tint,
  },
  rewardsList: {
    padding: 16,
  },
  historyList: {
    padding: 16,
  },
  rewardCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: Colors.light.tint,
  },
  unaffordableCard: {
    opacity: 0.7,
  },
  rewardContent: {
    flex: 1,
  },
  rewardName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  rewardDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  rewardCost: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  pointsText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  unaffordableText: {
    color: 'red',
  },
  purchaseButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  purchaseButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  historyItem: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    backgroundColor: Colors.light.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  historyDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  historyCost: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F44336',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  detailsContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eaeaea',
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  detailsDescription: {
    fontSize: 16,
    marginBottom: 16,
  },
  detailsPurchaseButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
});