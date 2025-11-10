import { 
  StyleSheet, 
  TouchableOpacity, 
  View, 
  Image, 
  Alert, 
  Modal, 
  ActivityIndicator, 
  Platform,
  ScrollView
} from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList } from 'react-native-gesture-handler';
import { Icon, FAB } from '@rneui/themed';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Activity, ActivityForm } from '@/components/ActivityForm';
import { ActivityCard } from '@/components/ActivityCard';
import { SearchBar } from '@/components/SearchBar';
import { AdvancedFilterBar, ActivityFilters } from '@/components/FilterBar';
import { fetchActivities, createActivity, updateActivity, deleteActivity, withRetry } from '@/services/api';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function LoggingScreen() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableActivities, setAvailableActivities] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  
  const tintColor = useThemeColor({}, 'tint');
  
  // Track pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const itemsPerPage = 10;

  // Fetch activities from API (initial load)
  const loadActivities = useCallback(async (forceRefresh = false) => {
    console.log('🔄 Loading activities (initial load)... Force refresh:', forceRefresh);
    setIsLoading(true);
    setError(null);
    setPage(1); // Reset pagination
    
    try {
      // If forceRefresh is true, bypass cache completely
      const data = await withRetry(() => fetchActivities(forceRefresh, itemsPerPage), 3, 800);
      
      if (!data) {
        console.error('🔴 No data received');
        setError('No data received. Please try again.');
        return;
      }
      
      if (!Array.isArray(data)) {
        console.error('🔴 Data is not an array:', data);
        setError('Invalid data format received. Please try again.');
        return;
      }
      
      console.log(`📊 Received ${data.length} activities`);
      
      // Extract categories and tags for filters
      extractCategoriesAndTags(data);
      
      // Log some sample data to help with debugging
      if (data.length > 0) {
        console.log('Sample activity:', JSON.stringify(data[0]));
        
        // Check if we have property name casing issues
        const sampleActivity = data[0];
        console.log('Property check - lowercase:', 
          sampleActivity.activity ? 'activity ✓' : 'activity ✗',
          sampleActivity.category ? 'category ✓' : 'category ✗'
        );
        console.log('Property check - uppercase:', 
          sampleActivity.Activity ? 'Activity ✓' : 'Activity ✗',
          sampleActivity.Category ? 'Category ✓' : 'Category ✗'
        );
        
        // Normalize data to ensure consistent property names
        const normalizedData = data.map(item => {
          // Create a new object with both lowercase and uppercase property names
          return {
            // Ensure we have uppercase property names for backward compatibility
            Activity: item.Activity || item.activity,
            Category: item.Category || item.category,
            Date: item.Date || item.date,
            Start_Time: item.Start_Time || item.start_time,
            End_Time: item.End_Time || item.end_time,
            Notes: item.Notes || item.notes,
            Points: item.Points || item.points,
            Tags: item.Tags || item.tags,
            activity_id: item.activity_id,
            // Keep the original properties too
            ...item
          };
        });
        
        console.log('Normalized first item:', JSON.stringify(normalizedData[0]));
        
        // Extract categories and tags from the normalized data
        extractCategoriesAndTags(normalizedData);
        
        // Sort the normalized data
        const sortedActivities = sortActivities(normalizedData);
        
        // Update state with the normalized and sorted data
        if (sortedActivities.length > 0 || normalizedData.length === 0) {
          console.log(`Setting activities state with ${sortedActivities.length} normalized items`);
          setActivities(sortedActivities);
        }
        
        // Update pagination state based on the normalized data
        setHasMore(normalizedData.length >= itemsPerPage);
        
        // Return early since we've already handled everything
        return;
      }
      
      // If no data, still extract (empty) categories and tags
      
      // Sort the activities
      const sortedActivities = sortActivities(data);
      
      // Update state only if we got valid data
      if (sortedActivities.length > 0 || data.length === 0) {
        console.log(`Setting activities state with ${sortedActivities.length} items`);
        setActivities(sortedActivities);
      } else {
        console.warn('No activities to set after sorting');
      }
      
      // Update pagination state
      setHasMore(data.length >= itemsPerPage);
    } catch (err) {
      console.error('🔴 Error loading activities:', err);
      setError(`Failed to load activities: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [itemsPerPage]);
  
  // Load activities when the screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('Screen focused, loading fresh activities');
      // Always force fresh data load when screen is focused to ensure data consistency
      loadActivities(true);  // Force refresh from server
    }, [loadActivities])
  );
  
  // Extract unique categories, activities, and tags from activities data
  const extractCategoriesAndTags = (data: Activity[]) => {
    // Extract unique categories (handle both upper and lowercase property names)
    const categories = [...new Set(data.map(item => 
      item.Category || item.category
    ).filter(Boolean))];
    setAvailableCategories(categories);
    
    // Extract unique activity names (handle both upper and lowercase property names)
    const activities = [...new Set(data.map(item => 
      item.Activity || item.activity
    ).filter(Boolean))];
    setAvailableActivities(activities);
    
    // Extract unique tags (split comma-separated tags and flatten)
    const allTags = data
      .map(item => {
        const tags = item.Tags || item.tags;
        return tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
      })
      .flat();
    const uniqueTags = [...new Set(allTags)];
    setAvailableTags(uniqueTags);
  };
  
  // Utility function to sort activities
  const sortActivities = useCallback((data) => {
    if (!data || !Array.isArray(data)) {
      console.warn('Invalid data passed to sortActivities:', data);
      return [];
    }
    
    return [...data].sort((a, b) => {
      // Handle possible missing Date field safely
      const dateA = a?.Date ? new Date(a.Date).getTime() : 0;
      const dateB = b?.Date ? new Date(b.Date).getTime() : 0;
      
      // First compare dates in reverse (newest first)
      const dateComparison = dateB - dateA;
      if (dateComparison !== 0) return dateComparison;
      
      // If same date, compare start times
      const aTime = a?.Start_Time ? (typeof a.Start_Time === 'string' ? a.Start_Time : String(a.Start_Time)) : '';
      const bTime = b?.Start_Time ? (typeof b.Start_Time === 'string' ? b.Start_Time : String(b.Start_Time)) : '';
      return aTime.localeCompare(bTime);
    });
  }, []);
  
  // Function to load more activities (pagination)
  const loadMoreActivities = useCallback(async () => {
    if (!hasMore || isFetchingMore) return;
    
    setIsFetchingMore(true);
    console.log(`🔄 Loading more activities (page ${page + 1})...`);
    
    try {
      const nextPage = page + 1;
      const offset = itemsPerPage * (nextPage - 1);
      
      // For now, we're fetching all and simulating pagination
      // In the future, we should pass the offset to the API
      const timestamp = new Date().getTime();
      const allData = await withRetry(() => 
        fetchActivities(true, itemsPerPage * 2, offset), 2, 500);
      
      if (!allData || !Array.isArray(allData)) {
        console.warn('Invalid data received for pagination');
        setHasMore(false);
        return;
      }
      
      // Get the next batch
      // For real API pagination, we'd just use the returned data directly
      const newItems = allData.slice(0, itemsPerPage);
      
      if (newItems.length === 0) {
        console.log('No more items to load');
        setHasMore(false);
        return;
      }
      
      console.log(`📊 Loaded ${newItems.length} more activities`);
      
      // Check for duplicates before adding
      setActivities(prevActivities => {
        // Filter out any activities that are already in the list
        const existingIds = new Set(prevActivities.map(a => a.activity_id));
        const uniqueNewItems = newItems.filter(item => 
          item.activity_id && !existingIds.has(item.activity_id)
        );
        
        console.log(`Adding ${uniqueNewItems.length} unique new items to existing ${prevActivities.length} items`);
        
        if (uniqueNewItems.length === 0) {
          return prevActivities; // No changes if all items are duplicates
        }
        
        const combined = [...prevActivities, ...uniqueNewItems];
        return sortActivities(combined);
      });
      
      setPage(nextPage);
      setHasMore(newItems.length >= itemsPerPage);
    } catch (err) {
      console.error('Error loading more activities:', err);
    } finally {
      setIsFetchingMore(false);
    }
  }, [fetchActivities, hasMore, isFetchingMore, itemsPerPage, page, sortActivities]);
  
  // Apply search and filters to activities
  const filteredActivities = useMemo(() => {
    console.log(`Filtering ${activities.length} activities with query: "${searchQuery}" and filters:`, filters);
    
    return activities.filter(activity => {
      // Get property values handling both uppercase and lowercase
      const activityName = activity.Activity || activity.activity;
      const categoryName = activity.Category || activity.category;
      const tagsValue = activity.Tags || activity.tags || '';
      const notesValue = activity.Notes || activity.notes || '';
      const dateValue = activity.Date || activity.date;
      const pointsValue = activity.Points || activity.points || 0;
      
      // Skip items that don't have the basic required fields
      if (!activity || !activityName || !categoryName) {
        console.log('Skipping activity missing required fields:', activity);
        return false;
      }
      
      // Apply text search
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesActivity = activityName.toLowerCase().includes(searchLower);
        const matchesCategory = categoryName.toLowerCase().includes(searchLower);
        const matchesTags = tagsValue.toLowerCase().includes(searchLower);
        const matchesNotes = notesValue.toLowerCase().includes(searchLower);
        
        if (!(matchesActivity || matchesCategory || matchesTags || matchesNotes)) {
          return false;
        }
      }
      
      // Apply categories filter (multiple selection)
      if (filters.categories && filters.categories.length > 0) {
        if (!filters.categories.includes(categoryName)) {
          return false;
        }
      }
      
      // Apply activities filter (multiple selection)
      if (filters.activities && filters.activities.length > 0) {
        if (!filters.activities.includes(activityName)) {
          return false;
        }
      }
      
      // Apply date range filter
      if (filters.dateRange?.startDate) {
        const activityDate = dateValue ? new Date(dateValue) : null;
        const startDate = new Date(filters.dateRange.startDate);
        
        if (!activityDate || activityDate < startDate) {
          return false;
        }
        
        // Check end date if provided
        if (filters.dateRange.endDate) {
          const endDate = new Date(filters.dateRange.endDate);
          // Set to end of day
          endDate.setHours(23, 59, 59, 999);
          
          if (activityDate > endDate) {
            return false;
          }
        }
      }
      
      // Apply points filter
      if (filters.minPoints && pointsValue < filters.minPoints) {
        return false;
      }
      
      // Apply tags filter
      if (filters.tags && filters.tags.length > 0) {
        if (!tagsValue) return false;
        
        const activityTags = tagsValue.split(',').map(tag => tag.trim());
        const hasMatchingTag = filters.tags.some(filterTag => 
          activityTags.includes(filterTag)
        );
        
        if (!hasMatchingTag) {
          return false;
        }
      }
      
      return true;
    });
  }, [activities, searchQuery, filters]);
  
  // Handle adding a new activity
  const handleAddActivity = async (activity: Partial<Activity>) => {
    try {
      setIsLoading(true);
      console.log('Adding activity:', activity);
      
      // Get max activity_id to create a new one
      const maxId = activities.length > 0 
        ? activities.reduce((max, act) => (act.activity_id && act.activity_id > max ? act.activity_id : max), 0)
        : 0;
      
      // For web, ensure time values are properly formatted strings
      let formattedActivity = { ...activity };
      
      // Format the date if needed
      if (typeof formattedActivity.Date === 'string' && !formattedActivity.Date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = new Date(formattedActivity.Date);
        formattedActivity.Date = date.toISOString().split('T')[0];
      }
      
      const newActivity = {
        ...formattedActivity,
        activity_id: maxId + 1,
      };
      
      // Use the retry mechanism for better reliability
      console.log('Sending activity to server:', newActivity);
      const result = await withRetry(() => createActivity(newActivity));
      
      // Only close the modal if the operation was successful
      if (result) {
        setShowAddModal(false);
        // Show success message
        Alert.alert('Success', 'Activity added successfully!');
        
        console.log('Activity successfully added, refreshing list');
        
        // First immediately add to local state for better UX
        let addedActivity;
        if (result.activity_id) {
          // If we got a full activity object back
          addedActivity = result;
        } else if (result.activity) {
          // If we got an activity in a nested object
          addedActivity = result.activity;
        } else {
          // Otherwise, use what we sent plus any returned fields
          addedActivity = {...newActivity, ...result};
        }
        
        console.log('Adding to local state:', addedActivity);
        
        // Add to activities state to show immediately
        setActivities(prev => {
          // First check if it's already in the array
          const exists = prev.some(a => a.activity_id === addedActivity.activity_id);
          if (exists) {
            console.log('Activity already exists in state, replacing');
            const updated = prev.map(a => a.activity_id === addedActivity.activity_id ? addedActivity : a);
            return sortActivities(updated);
          } else {
            console.log('Adding new activity to state');
            const updated = [addedActivity, ...prev];
            return sortActivities(updated);
          }
        });
        
        // Immediately reload to ensure data consistency with backend
        console.log('Reloading activities from server to ensure consistency');
        loadActivities(true); // Force refresh from server
      } else {
        Alert.alert('Warning', 'Activity may not have been saved properly. Please check and try again.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add activity. Please try again.');
      console.error('Error adding activity:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle updating an activity
  const handleUpdateActivity = async (updatedActivity: Partial<Activity>) => {
    if (!selectedActivity || !selectedActivity.activity_id) return;
    
    try {
      setIsLoading(true);
      
      // Convert to field/value pairs and track what's changed
      const fields: Record<string, any> = {};
      let hasChanges = false;
      
      Object.keys(updatedActivity).forEach(key => {
        // Skip activity_id as it shouldn't be updated
        if (key !== 'activity_id' && key in updatedActivity) {
          const originalValue = selectedActivity[key as keyof Activity];
          const newValue = updatedActivity[key as keyof Activity];
          
          // Only update fields that have changed
          if (originalValue !== newValue) {
            fields[key] = newValue;
            hasChanges = true;
          }
        }
      });
      
      // Only send update if there are actual changes
      if (hasChanges) {
        // Use the retry mechanism for better reliability
        await withRetry(() => updateActivity(selectedActivity.activity_id!, fields));
        
        // Show success message
        Alert.alert('Success', 'Activity updated successfully!');
        
        // Immediately reload to get fresh data from the backend
        loadActivities();
      } else {
        console.log('No changes detected, skipping update');
      }
      
      setShowEditModal(false);
      setSelectedActivity(null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update activity. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle deleting an activity
  const handleDeleteActivity = async (activityId: number) => {
    Alert.alert(
      'Delete Activity',
      'Are you sure you want to delete this activity? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              
              // Use the retry mechanism for better reliability
              const result = await withRetry(() => deleteActivity(activityId));
              
              if (result && result.message) {
                // Show success message but keep it brief
                Alert.alert('Success', 'Activity deleted successfully.');
                
                // Optimistically remove from local state for immediate UI feedback
                setActivities(prev => prev.filter(activity => activity.activity_id !== activityId));
                
                // Immediately reload from server to ensure consistency
                loadActivities();
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete activity. Please try again.');
              console.error(err);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };
  
  // Calculate total points for the profile display
  const calculateTotalPoints = () => {
    return activities.reduce((sum, activity) => 
      sum + (activity.Points || 0), 0);
  };
  
  // Handle clearing all search and filters
  const handleClearAll = useCallback(() => {
    setSearchQuery('');
    setFilters({});
  }, []);
  
  // Calculate categories for the profile display
  const getTopCategories = () => {
    const categories = activities.reduce((acc, activity) => {
      const category = activity.Category;
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category]++;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);
  };
  
  // Render each activity item
  const renderActivityItem = ({ item }: { item: Activity }) => {
    if (!item) {
      console.log('Warning: Trying to render null or undefined activity item');
      return null;
    }
    
    // Check if we have properly formatted data
    if (!item.Activity || !item.Category) {
      console.log(`Warning: Activity missing required fields`, item);
    }
    
    console.log(`Rendering activity item: ${item.Activity || 'Unnamed'}, ID: ${item.activity_id || 'No ID'}`);
    
    return (
      <ActivityCard
        activity={item}
        onPress={() => {
          setSelectedActivity(item);
          setShowEditModal(true);
        }}
        onEdit={() => {
          setSelectedActivity(item);
          setShowEditModal(true);
        }}
        onDelete={() => item.activity_id && handleDeleteActivity(item.activity_id)}
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={tintColor} />
        </View>
      )}
      
      <View style={styles.mainContainer}>
        {/* Profile/Stats Section */}
        <View style={styles.profileContainer}>
          <Image
            source={require('@/assets/images/A_simple_and_clean_outline_of_a_humanoid_figure_st.jpeg')}
            style={styles.avatar}
          />
          
          <ThemedView style={styles.statsContainer}>
            <ThemedText type="title" style={styles.totalPoints}>
              {calculateTotalPoints()} Points
            </ThemedText>
            
            <ThemedText style={styles.statsLabel}>Top Categories:</ThemedText>
            {getTopCategories().map((category, index) => (
              <ThemedText key={index} style={styles.categoryItem}>
                • {category}
              </ThemedText>
            ))}
          </ThemedView>
        </View>
        
        {/* Activities List */}
        <ThemedView style={styles.activitiesContainer}>
          <View style={styles.listHeader}>
            <ThemedText type="title">Activities</ThemedText>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={loadActivities}
            >
              <Icon name="refresh" type="material" size={24} color={tintColor} />
            </TouchableOpacity>
          </View>
          
          {/* Search & Filter */}
          <SearchBar 
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search activities, categories, tags..."
          />
          
          <AdvancedFilterBar 
            filters={filters}
            onApplyFilters={setFilters}
            availableCategories={availableCategories}
            availableActivities={availableActivities}
            availableTags={availableTags}
          />
          
          {error ? (
            <ThemedView style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
              <TouchableOpacity 
                style={[styles.retryButton, { backgroundColor: tintColor }]}
                onPress={loadActivities}
              >
                <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          ) : filteredActivities.length === 0 && !isLoading ? (
            <ThemedView style={styles.emptyContainer}>
              {activities.length === 0 ? (
                <>
                  <Icon name="event-note" type="material" size={60} color={tintColor} />
                  <ThemedText style={styles.emptyText}>No activities yet!</ThemedText>
                  <ThemedText style={styles.emptySubtext}>
                    Tap the + button below to add your first activity.
                  </ThemedText>
                </>
              ) : (
                <>
                  <Icon name="search-off" type="material" size={60} color={tintColor} />
                  <ThemedText style={styles.emptyText}>No matching activities</ThemedText>
                  <ThemedText style={styles.emptySubtext}>
                    Try adjusting your search or filters to see more results.
                  </ThemedText>
                  {(searchQuery || Object.keys(filters).length > 0) && (
                    <TouchableOpacity
                      style={[styles.clearButton, { marginTop: 16 }]}
                      onPress={handleClearAll}
                    >
                      <ThemedText style={{ color: tintColor, fontWeight: 'bold' }}>
                        Clear All Filters
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </ThemedView>
          ) : (
            <View style={{flex: 1}}>
              <ThemedText style={{padding: 10, fontSize: 12, opacity: 0.7}}>
                Showing {filteredActivities.length} of {activities.length} activities
              </ThemedText>
              
              {filteredActivities.length > 0 ? (
                <FlatList
                  data={filteredActivities}
                  keyExtractor={(item, index) => `activity-${index}-${item.activity_id || 'new'}`}
                  renderItem={renderActivityItem}
                  style={{flex: 1}}
                  initialNumToRender={5}
                  maxToRenderPerBatch={10}
                  windowSize={5}
                  onEndReached={loadMoreActivities}
                  onEndReachedThreshold={0.5}
                  ItemSeparatorComponent={() => <View style={{height: 10}} />}
                  ListFooterComponent={
                    isFetchingMore ? (
                      <View style={{padding: 20, alignItems: 'center'}}>
                        <ActivityIndicator size="small" color={tintColor} />
                      </View>
                    ) : hasMore && searchQuery === '' && Object.keys(filters).length === 0 ? (
                      <TouchableOpacity
                        style={{padding: 16, alignItems: 'center'}}
                        onPress={loadMoreActivities}
                      >
                        <ThemedText>Load more</ThemedText>
                      </TouchableOpacity>
                    ) : null
                  }
                />
              ) : (
                <ThemedView style={styles.emptyListContainer}>
                  <ThemedText>No activities to display</ThemedText>
                  <ThemedText style={styles.emptyListDebug}>
                    Activities Array Length: {activities.length}
                  </ThemedText>
                </ThemedView>
              )}
            </View>
          )}
        </ThemedView>
      </View>
      
      {/* Add Activity FAB - use TouchableOpacity instead of FAB to avoid nested button warning */}
      <TouchableOpacity
        style={[styles.fabContainer, { backgroundColor: tintColor }]}
        onPress={() => setShowAddModal(true)}
      >
        <Icon name="add" color="white" size={24} />
      </TouchableOpacity>
      
      {/* Add Activity Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <ThemedView style={styles.modalContent}>
            {showAddModal && (
              <ActivityForm 
                onSubmit={handleAddActivity}
                onCancel={() => {
                  console.log('Cancel button pressed');
                  setShowAddModal(false);
                }}
              />
            )}
          </ThemedView>
        </View>
      </Modal>
      
      {/* Edit Activity Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowEditModal(false);
          setSelectedActivity(null);
        }}
      >
        <View style={styles.modalContainer}>
          <ThemedView style={styles.modalContent}>
            {showEditModal && selectedActivity && (
              <ActivityForm 
                initialActivity={selectedActivity}
                onSubmit={handleUpdateActivity}
                onCancel={() => {
                  console.log('Edit cancel button pressed');
                  setShowEditModal(false);
                  setSelectedActivity(null);
                }}
              />
            )}
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}


const styles = StyleSheet.create({
  emptyListContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  emptyListDebug: {
    marginTop: 10,
    opacity: 0.7,
    fontSize: 12,
  },
  container: {
    flex: 1,
    paddingTop: 40, // Give space for status bar
  },
  mainContainer: {
    flex: 1,
    padding: 16,
  },
  profileContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  statsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  totalPoints: {
    fontSize: 22,
    marginBottom: 8,
  },
  statsLabel: {
    fontWeight: 'bold',
    marginTop: 4,
  },
  categoryItem: {
    marginLeft: 8,
  },
  activitiesContainer: {
    flex: 1,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  refreshButton: {
    padding: 8,
  },
  list: {
    paddingBottom: 80, // Space for FAB
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    opacity: 0.7,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    paddingTop: 30,
  },
  modalContent: {
    margin: 0,
    borderRadius: 16,
    maxHeight: '90%',
    width: '95%',
    maxWidth: 450,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
