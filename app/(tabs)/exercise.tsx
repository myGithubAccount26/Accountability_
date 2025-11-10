import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  FlatList,
  View,
  TouchableOpacity,
  Text,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Icon } from '@rneui/themed';
import {
  ExerciseActivity,
  ExerciseDetails,
  fetchExerciseActivities,
  addExerciseDetails,
  updateExerciseDetails,
  deleteExerciseDetails
} from '@/services/points-api';
import { Activity, ActivityForm } from '@/components/ActivityForm';
import { ExerciseForm } from '@/components';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { FilterBar } from '@/components/FilterBar';
import { SearchBar } from '@/components/SearchBar';
import { createActivity } from '@/services/api';

// Constants for filter options
const FILTER_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Running', value: 'Running' },
  { label: 'Weightlifting', value: 'Weightlifting' },
  { label: 'Cycling', value: 'Cycling' },
  { label: 'Yoga', value: 'Yoga' },
  { label: 'HIIT', value: 'HIIT' },
  { label: 'Other', value: 'other' },
];

export default function Exercise() {
  const [activities, setActivities] = useState<ExerciseActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ExerciseActivity | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const cardColor = useThemeColor({}, 'card');

  // Navigation
  const navigation = useNavigation();

  // Load exercise activities
  const loadExerciseActivities = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }
    
    try {
      // Build filters for the API request
      const filters: Record<string, string> = {};
      
      if (filter) {
        filters.exercise_type = filter;
      }
      
      if (searchQuery) {
        filters.search = searchQuery;
      }
      
      const data = await fetchExerciseActivities(filters);
      setActivities(data);
    } catch (error) {
      console.error('Error loading exercise activities:', error);
      Alert.alert('Error', 'Failed to load exercise activities');
    } finally {
      setLoading(false);
      if (refreshing) {
        setRefreshing(false);
      }
    }
  }, [filter, searchQuery, refreshing]);

  // Initial load and refresh on focus
  useFocusEffect(
    useCallback(() => {
      loadExerciseActivities();
    }, [loadExerciseActivities])
  );

  // Pull-to-refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    loadExerciseActivities(false);
  };

  // Filter change handler
  const handleFilterChange = (value: string) => {
    console.log('Filter changed to:', value);
    setFilter(value);
    // The loadExerciseActivities will be triggered by the dependency array in the useCallback
  };

  // Search query change handler
  const handleSearchChange = (query: string) => {
    console.log('Search query changed to:', query);
    setSearchQuery(query);
    // Don't trigger search immediately, let the user finish typing
    // The search will be triggered by the Search button or by pressing Enter
  };

  // Handle adding exercise details to an activity
  const handleAddDetails = (activity: ExerciseActivity) => {
    setSelectedActivity(activity);
    setShowModal(true);
  };

  // Handle editing exercise details
  const handleEditDetails = (activity: ExerciseActivity) => {
    setSelectedActivity(activity);
    setShowModal(true);
  };

  // Handle deleting exercise details
  const handleDeleteDetails = async (activity: ExerciseActivity) => {
    if (!activity.activity_id || !activity.exercise_details) return;
    
    Alert.alert(
      'Delete Exercise Details',
      'Are you sure you want to delete these exercise details?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExerciseDetails(activity.activity_id as number);
              // Refresh the list
              loadExerciseActivities();
            } catch (error) {
              console.error('Error deleting exercise details:', error);
              Alert.alert('Error', 'Failed to delete exercise details');
            }
          }
        }
      ]
    );
  };

  // Handle form submission (both add and update)
  const handleSubmitForm = async (activityId: number, details: ExerciseDetails) => {
    try {
      if (selectedActivity?.exercise_details) {
        // Update existing details
        await updateExerciseDetails(activityId, details);
      } else {
        // Add new details
        await addExerciseDetails(activityId, details);
      }
      
      // Close the modal and refresh the list
      setShowModal(false);
      loadExerciseActivities();
    } catch (error) {
      console.error('Error saving exercise details:', error);
      Alert.alert('Error', 'Failed to save exercise details');
    }
  };
  
  // Handle adding a new exercise activity
  const handleAddExercise = async (activity: Partial<Activity>) => {
    try {
      setLoading(true);
      
      // Get current date if not provided
      if (!activity.Date) {
        const today = new Date();
        activity.Date = today.toISOString().split('T')[0];
      }
      
      // Pre-set the activity category to "Exercise" if not specified
      if (!activity.Category) {
        activity.Category = "Exercise";
      }
      
      console.log('Creating new exercise activity:', activity);
      
      // Create the base activity
      const result = await createActivity(activity);
      
      // Close the modal
      setShowAddModal(false);
      
      if (result && result.activity_id) {
        const activityId = result.activity_id;
        
        // Create default exercise details based on the activity name
        const exerciseType = activity.Activity?.toLowerCase() || "";
        let defaultDetails: ExerciseDetails = {
          exercise_type: FILTER_OPTIONS.find(option => 
            option.value !== '' && exerciseType.includes(option.value.toLowerCase())
          )?.value || "Other",
          intensity: 5  // Medium intensity by default
        };
        
        // Add more specific defaults based on common exercise types
        if (exerciseType.includes("run") || exerciseType.includes("jog")) {
          defaultDetails = {
            ...defaultDetails,
            exercise_type: "Running",
            distance: 5,
            distance_unit: "km",
            calories: 300
          };
        } else if (exerciseType.includes("cycl") || exerciseType.includes("bike")) {
          defaultDetails = {
            ...defaultDetails,
            exercise_type: "Cycling",
            distance: 10,
            distance_unit: "km",
            calories: 250
          };
        } else if (exerciseType.includes("weight") || exerciseType.includes("lift")) {
          defaultDetails = {
            ...defaultDetails,
            exercise_type: "Weightlifting",
            weight: 50,
            weight_unit: "kg",
            sets: 3,
            reps: 10
          };
        } else if (exerciseType.includes("yoga")) {
          defaultDetails = {
            ...defaultDetails,
            exercise_type: "Yoga",
            intensity: 3
          };
        } else if (exerciseType.includes("hiit") || exerciseType.includes("interval")) {
          defaultDetails = {
            ...defaultDetails,
            exercise_type: "HIIT",
            intensity: 8,
            calories: 400
          };
        }
        
        console.log("Adding default exercise details:", defaultDetails);
        
        try {
          // Automatically add the default exercise details
          await addExerciseDetails(activityId, defaultDetails);
          
          Alert.alert('Success', 'Exercise activity created with default details! You can edit the details if needed.');
          
          // Refresh the list to show the new activity with details
          loadExerciseActivities();
        } catch (detailsError) {
          console.error('Error adding default exercise details:', detailsError);
          
          // Let the user add details manually if automatic addition fails
          Alert.alert('Success', 'Activity created! Now add exercise details.');
          
          // Set the newly created activity as selected to add exercise details
          const newActivity: ExerciseActivity = {
            ...result,
            activity_id: activityId
          };
          
          setSelectedActivity(newActivity);
          setShowModal(true); // Open the exercise details modal
        }
      } else {
        Alert.alert('Warning', 'Activity created but some information may be missing.');
        // Refresh the list to show the new activity
        loadExerciseActivities();
      }
    } catch (error) {
      console.error('Error creating exercise activity:', error);
      Alert.alert('Error', 'Failed to create exercise activity');
    } finally {
      setLoading(false);
    }
  };

  // Render each exercise activity item
  const renderItem = ({ item }: { item: ExerciseActivity }) => {
    const hasExerciseDetails = !!item.exercise_details;
    
    // Format distance with unit
    const formatDistance = (details: ExerciseDetails) => {
      if (!details.distance) return '';
      return `${details.distance} ${details.distance_unit || 'km'}`;
    };
    
    // Format weight training details
    const formatWeightTraining = (details: ExerciseDetails) => {
      if (!details.weight || !details.sets || !details.reps) return '';
      return `${details.weight} ${details.weight_unit || 'kg'} × ${details.sets} sets × ${details.reps} reps`;
    };
    
    // Get points value handling both upper and lowercase property names
    const pointsValue = item.Points || item.points || 0;
    
    // Get activity name and other properties handling both cases
    const activityName = item.Activity || item.activity;
    const activityDate = item.Date || item.date;
    const startTime = item.Start_Time || item.start_time;
    const endTime = item.End_Time || item.end_time;
    
    return (
      <ThemedView style={styles.card}>
        <View style={styles.cardHeader}>
          <ThemedText style={styles.activityTitle}>
            {activityName}
          </ThemedText>
          <ThemedText style={styles.date}>
            {activityDate}
          </ThemedText>
        </View>
        
        <ThemedText style={styles.time}>
          {startTime} - {endTime}
        </ThemedText>
        
        {hasExerciseDetails ? (
          <View style={styles.exerciseDetails}>
            <ThemedText style={styles.exerciseType}>
              {item.exercise_details?.exercise_type}
            </ThemedText>
            
            <ThemedText style={styles.intensity}>
              Intensity: {item.exercise_details?.intensity}/10
            </ThemedText>
            
            {item.exercise_details?.distance ? (
              <ThemedText style={styles.metric}>
                Distance: {formatDistance(item.exercise_details)}
              </ThemedText>
            ) : null}
            
            {item.exercise_details?.weight && item.exercise_details?.sets && item.exercise_details?.reps ? (
              <ThemedText style={styles.metric}>
                {formatWeightTraining(item.exercise_details)}
              </ThemedText>
            ) : null}
            
            {item.exercise_details?.calories ? (
              <ThemedText style={styles.metric}>
                Calories: {item.exercise_details.calories} kcal
              </ThemedText>
            ) : null}
            
            {item.exercise_details?.heart_rate ? (
              <ThemedText style={styles.metric}>
                Heart Rate: {item.exercise_details.heart_rate} bpm
              </ThemedText>
            ) : null}
          </View>
        ) : (
          <View style={styles.addDetailsContainer}>
            <TouchableOpacity 
              style={[styles.addDetailsButton, { borderColor: tintColor }]}
              onPress={() => handleAddDetails(item)}
            >
              <Ionicons name="fitness-outline" size={16} color={tintColor} />
              <Text style={[styles.addDetailsText, { color: tintColor }]}>
                Add Exercise Details
              </Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Action buttons for exercise with details */}
        {hasExerciseDetails && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: tintColor }]}
              onPress={() => handleEditDetails(item)}
            >
              <Ionicons name="create-outline" size={16} color={tintColor} />
              <Text style={[styles.actionButtonText, { color: tintColor }]}>Edit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: '#FF3B30' }]}
              onPress={() => handleDeleteDetails(item)}
            >
              <Ionicons name="trash-outline" size={16} color="#FF3B30" />
              <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.cardFooter}>
          <View style={styles.pointsContainer}>
            <Ionicons name="star" size={16} color={tintColor} />
            <ThemedText style={styles.points}>
              {pointsValue} points
            </ThemedText>
          </View>
        </View>
      </ThemedView>
    );
  };

  // Empty state when no activities are found
  const renderEmptyState = () => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyState}>
        <Ionicons name="fitness-outline" size={50} color="#ccc" />
        <ThemedText style={styles.emptyStateText}>
          No exercise activities found
        </ThemedText>
        <ThemedText style={styles.emptyStateSubtext}>
          Add exercise details to your activities to track your workouts
        </ThemedText>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Exercise Log</ThemedText>
        </View>
        
        <SearchBar 
          value={searchQuery} 
          onChangeText={handleSearchChange} 
          onSearch={() => loadExerciseActivities(true)} // Pass true to force refresh
          placeholder="Search exercises..."
        />
        
        <FilterBar
          options={FILTER_OPTIONS || []}
          selectedValue={filter}
          onValueChange={handleFilterChange}
        />
        
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={tintColor} />
          </View>
        ) : (
          <FlatList
            data={activities}
            renderItem={renderItem}
            keyExtractor={(item) => item.activity_id?.toString() || Math.random().toString()}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[tintColor]}
                tintColor={tintColor}
              />
            }
          />
        )}
      </View>
      
      {/* Add Exercise FAB */}
      <TouchableOpacity
        style={[styles.fabContainer, { backgroundColor: tintColor }]}
        onPress={() => setShowAddModal(true)}
      >
        <Icon name="add" color="white" size={24} />
      </TouchableOpacity>
      
      {/* Modal for adding/editing exercise details */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            {selectedActivity && (
              <ExerciseForm
                activityId={selectedActivity.activity_id as number}
                initialDetails={selectedActivity.exercise_details}
                onSubmit={handleSubmitForm}
                onCancel={() => setShowModal(false)}
                isEditing={!!selectedActivity.exercise_details}
              />
            )}
          </View>
        </View>
      </Modal>
      
      {/* Modal for adding new exercise activity */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <ActivityForm 
              initialActivity={{ Category: "Exercise" }}
              onSubmit={handleAddExercise}
              onCancel={() => setShowAddModal(false)}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    zIndex: 99,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E7EB',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    shadowOpacity: 0.1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  date: {
    fontSize: 14,
    color: '#495057',
  },
  time: {
    fontSize: 14,
    marginBottom: 12,
    color: '#495057',
  },
  exerciseDetails: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
    marginTop: 8,
  },
  exerciseType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000000',
  },
  intensity: {
    fontSize: 14,
    marginBottom: 4,
    color: '#343A40',
  },
  metric: {
    fontSize: 14,
    marginBottom: 4,
    color: '#343A40',
  },
  addDetailsContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  addDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  addDetailsText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginLeft: 8,
  },
  actionButtonText: {
    marginLeft: 4,
    fontWeight: '500',
    fontSize: 12,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 12,
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  points: {
    fontWeight: 'bold',
    marginLeft: 4,
    color: '#000000',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 32,
    opacity: 0.7,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    width: Platform.OS === 'web' ? '80%' : '90%',
    maxWidth: 500,
    maxHeight: '90%',
    overflow: 'hidden',
  },
});