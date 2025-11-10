import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Modal, Alert, Platform, ScrollView, KeyboardAvoidingView, TextInput, ActivityIndicator, Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { 
  JournalEntry, 
  MoodData, 
  MoodOption, 
  getJournalEntries, 
  getMoodOptions, 
  getMoodLogs,
  addJournalEntry, 
  updateJournalEntry, 
  deleteJournalEntry 
} from '@/services/points-api';

// Import Victory components for charts with alias in metro.config.js
import {
  VictoryLine,
  VictoryChart,
  VictoryAxis,
  VictoryScatter,
  VictoryArea,
  VictoryBar,
  VictoryTooltip,
  VictoryVoronoiContainer,
  VictoryTheme
} from 'victory';

// Get screen dimensions for chart sizing
const screenWidth = Dimensions.get('window').width;
const chartWidth = Platform.OS === 'web' ? Math.min(800, screenWidth - 40) : screenWidth - 40;
const chartHeight = Platform.OS === 'web' ? 400 : 300;

// Create chart theme similar to explore.tsx
const createMaterialTheme = (isDarkMode: boolean) => {
  // Theme colors based on mode
  const colors = {
    text: isDarkMode ? "#FFFFFF" : "#455A64",
    axisStroke: isDarkMode ? "#607D8B" : "#90A4AE",
    gridStroke: isDarkMode ? "#37474F" : "#ECEFF1",
    primary: isDarkMode ? "#64B5F6" : "#4285F4",
    accent: isDarkMode ? "#FF9800" : "#c43a31",
    background: isDarkMode ? "#263238" : "transparent",
  };

  return {
    area: {
      style: {
        data: {
          fill: colors.accent
        },
        labels: {
          fontFamily: "'Roboto', 'Helvetica Neue', Helvetica, sans-serif",
          fontSize: 12,
          padding: 8,
          fill: colors.text
        }
      }
    },
    axis: {
      style: {
        axis: {
          fill: colors.background,
          stroke: colors.axisStroke,
          strokeWidth: Platform.OS === 'web' ? 1 : 2,
          strokeLinecap: "round",
          strokeLinejoin: "round"
        },
        axisLabel: {
          textAnchor: "middle",
          fontFamily: Platform.OS === 'web' ? 
            "'Roboto', 'Helvetica Neue', Helvetica, sans-serif" : 
            "'System'",
          fontSize: Platform.OS === 'web' ? 14 : 12,
          padding: 8,
          fill: colors.text
        },
        grid: {
          fill: "none",
          stroke: colors.gridStroke,
          strokeDasharray: Platform.OS === 'web' ? "5, 3" : "10, 5",
          strokeLinecap: "round",
          strokeLinejoin: "round",
          pointerEvents: "painted"
        },
        ticks: {
          fill: "transparent",
          size: 5,
          stroke: colors.axisStroke,
          strokeWidth: 1,
          strokeLinecap: "round",
          strokeLinejoin: "round"
        },
        tickLabels: {
          fontFamily: Platform.OS === 'web' ? 
            "'Roboto', 'Helvetica Neue', Helvetica, sans-serif" : 
            "'System'",
          fontSize: Platform.OS === 'web' ? 14 : 12,
          padding: 8,
          fill: colors.text
        }
      }
    },
    bar: {
      style: {
        data: {
          fill: colors.primary,
          padding: 8,
          strokeWidth: 0
        },
        labels: {
          fontFamily: "'Roboto', 'Helvetica Neue', Helvetica, sans-serif",
          fontSize: 12,
          padding: 8,
          fill: colors.text
        }
      }
    },
    chart: {
      width: 450,
      height: 300,
      padding: 50
    }
  };
};

export default function JournalScreen() {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [moodOptions, setMoodOptions] = useState<MoodOption[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'journal' | 'moods'>('moods');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [editMode, setEditMode] = useState(false);
  const colorScheme = useColorScheme();
  
  // Mood history tab state
  const [moodLogs, setMoodLogs] = useState<MoodData[]>([]);
  const [loadingMoodData, setLoadingMoodData] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  // Form state
  const [entryForm, setEntryForm] = useState<JournalEntry>({
    date: new Date().toISOString().split('T')[0],
    title: '',
    content: '',
    tags: '',
    mood: {
      date: new Date().toISOString().split('T')[0],
      mood_score: 5,
      energy_level: 5,
      stress_level: 5,
      sleep_hours: 7, // Default 7 hours
      sleep_quality: 5, // Default medium quality
      bedtime: '', // Optional
      wake_time: '', // Optional
      notes: ''
    }
  });

  // Create chart theme based on color scheme
  const isDarkMode = colorScheme === 'dark';
  const chartTheme = useMemo(() => createMaterialTheme(isDarkMode), [isDarkMode]);

  // Load journal entries and mood options
  const loadData = useCallback(async () => {
    console.log('Loading journal data...');
    setRefreshing(true);
    setLoadingMoodData(true);
    
    try {
      // Calculate date ranges based on selected time range
      const now = new Date();
      let startDate;
      let endDate = new Date(now); // Set end date to current date/time
      
      if (timeRange === 'week') {
        // Past 7 days
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
      } else if (timeRange === 'month') {
        // Past 30 days
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
      } else if (timeRange === 'year') {
        // Past 365 days
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 365);
      }
      
      const startDateStr = startDate?.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // Fetch journal entries
      const entries = await getJournalEntries(20, 0);
      console.log(`Loaded ${entries.length} journal entries`);
      setJournalEntries(entries);
      
      // Fetch mood options
      const options = await getMoodOptions();
      console.log(`Loaded ${options.length} mood options`);
      setMoodOptions(options);
      
      // Fetch mood logs for the mood history tab
      console.log(`Fetching mood logs from ${startDateStr} to ${endDateStr}`);
      const filters = {
        start_date: startDateStr,
        end_date: endDateStr
      };
      const logs = await getMoodLogs(50, 0, filters);
      console.log(`Loaded ${logs.length} mood logs`);
      setMoodLogs(logs);
    } catch (error) {
      console.error('Error loading journal data:', error);
      Alert.alert('Error', 'Failed to load journal entries');
    } finally {
      setRefreshing(false);
      setLoadingMoodData(false);
    }
  }, [timeRange]);

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

  // Reset form
  const resetForm = () => {
    setEntryForm({
      date: new Date().toISOString().split('T')[0],
      title: '',
      content: '',
      tags: '',
      mood: {
        date: new Date().toISOString().split('T')[0],
        mood_score: 5,
        energy_level: 5,
        stress_level: 5,
        sleep_hours: 7, // Default 7 hours
        sleep_quality: 5, // Default medium quality
        bedtime: '', // Optional
        wake_time: '', // Optional
        notes: ''
      }
    });
    setEditMode(false);
    setSelectedEntry(null);
  };

  // Open form modal for new entry
  const openNewEntryForm = () => {
    resetForm();
    setModalVisible(true);
  };

  // Open form modal for editing
  const openEditForm = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setEntryForm({
      ...entry,
      // Ensure mood is properly structured
      mood: entry.mood || {
        date: entry.date,
        mood_score: 5,
        energy_level: 5,
        stress_level: 5,
        notes: ''
      }
    });
    setEditMode(true);
    setModalVisible(true);
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      console.log("Submitting form with data:", JSON.stringify(entryForm, null, 2));
      
      // Validate form
      if (!entryForm.title.trim()) {
        Alert.alert('Error', 'Title is required');
        return;
      }
      if (!entryForm.content.trim()) {
        Alert.alert('Error', 'Journal content is required');
        return;
      }

      // Submit entry
      if (editMode && selectedEntry?.id) {
        // Update existing entry
        const updated = await updateJournalEntry(selectedEntry.id, entryForm);
        console.log('Updated journal entry:', updated);
        
        // Update state
        setJournalEntries(prev => 
          prev.map(entry => entry.id === updated.id ? updated : entry)
        );
        
        Alert.alert('Success', 'Journal entry updated');
      } else {
        // Add new entry
        const added = await addJournalEntry(entryForm);
        console.log('Added journal entry:', added);
        
        // Update state
        setJournalEntries(prev => [added, ...prev]);
        
        Alert.alert('Success', 'Journal entry added');
      }
      
      // Close modal and reset form
      setModalVisible(false);
      resetForm();
    } catch (error) {
      console.error('Error saving journal entry:', error);
      Alert.alert('Error', 'Failed to save journal entry');
    }
  };

  // Handle entry deletion
  const handleDelete = async (entryId: number) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this journal entry? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteJournalEntry(entryId);
              
              // Update state
              setJournalEntries(prev => 
                prev.filter(entry => entry.id !== entryId)
              );
              
              Alert.alert('Success', 'Journal entry deleted');
              
              // Close modal if open
              if (modalVisible && selectedEntry?.id === entryId) {
                setModalVisible(false);
                resetForm();
              }
            } catch (error) {
              console.error(`Error deleting journal entry ${entryId}:`, error);
              Alert.alert('Error', 'Failed to delete journal entry');
            }
          }
        }
      ]
    );
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (error) {
      return dateString;
    }
  };

  // Get mood color based on score
  const getMoodColor = (moodScore: number | string): string => {
    const score = typeof moodScore === 'string' ? parseInt(moodScore, 10) : moodScore;
    const mood = moodOptions.find(option => option.score === score);
    return mood?.color || Colors[colorScheme].text;
  };
  
  // Get color based on sleep quality score
  const getSleepQualityColor = (quality: number): string => {
    if (quality <= 3) return '#d63031'; // Red - poor quality
    if (quality <= 6) return '#fdcb6e'; // Yellow - medium quality
    return '#00b894'; // Green - good quality
  };
  
  // Calculate average for a specific mood property
  const calculateAverage = (logs: MoodData[], property: keyof MoodData): number => {
    if (!logs || logs.length === 0) return 0;
    
    const validValues = logs
      .map(log => log[property])
      .filter(value => typeof value === 'number') as number[];
    
    if (validValues.length === 0) return 0;
    
    return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
  };
  
  // Prepare mood data for charts (standardized format for Victory)
  const prepareMoodData = (logs: MoodData[], property: keyof MoodData) => {
    if (!logs || logs.length === 0) return [];
    
    return logs
      .filter(log => {
        // Make sure the property exists and is a valid number (not NaN, undefined, etc.)
        const value = log[property];
        return value !== undefined && value !== null && !isNaN(Number(value));
      })
      .sort((a, b) => {
        // Ensure we have valid dates for sorting
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return isNaN(dateA) || isNaN(dateB) ? 0 : dateA - dateB;
      })
      .map(log => {
        // Convert property to number for the y-value
        const value = Number(log[property]);
        return {
          x: log.date,
          y: isNaN(value) ? 0 : value, // Fallback to 0 if value is NaN
          date: formatDate(log.date)
        };
      });
  };
  
  // Prepare sleep and mood correlation data
  const prepareSleepMoodData = (logs: MoodData[]) => {
    if (!logs || logs.length === 0) return [];
    
    return logs
      .filter(log => {
        // Ensure both sleep_hours and mood_score are valid numbers
        return log.sleep_hours !== undefined && 
               log.mood_score !== undefined && 
               !isNaN(Number(log.sleep_hours)) && 
               !isNaN(Number(log.mood_score));
      })
      .map(log => {
        // Ensure we're using valid numbers
        const sleepHours = Number(log.sleep_hours);
        const moodScore = Number(log.mood_score);
        return {
          x: isNaN(sleepHours) ? 0 : sleepHours,
          y: isNaN(moodScore) ? 0 : moodScore,
          date: formatDate(log.date)
        };
      });
  };
  
  // Prepare mood distribution data (count of each mood score)
  const prepareMoodDistributionData = (logs: MoodData[]) => {
    if (!logs || logs.length === 0) return [];
    
    // Count occurrences of each mood score
    const moodCounts: Record<number, number> = {};
    logs.forEach(log => {
      if (log.mood_score !== undefined && !isNaN(Number(log.mood_score))) {
        const score = Number(log.mood_score);
        moodCounts[score] = (moodCounts[score] || 0) + 1;
      }
    });
    
    // Convert to Victory data format and ensure values are valid
    return Object.entries(moodCounts)
      .map(([score, count]) => {
        const scoreNum = Number(score);
        return {
          x: isNaN(scoreNum) ? "0" : String(scoreNum), // Convert to string to avoid NaN issues
          y: count
        };
      })
      .filter(item => !isNaN(Number(item.x)) && !isNaN(item.y)); // Final safety check
  };
  
  // Prepare sleep hours data for charts
  const prepareSleepHoursData = (logs: MoodData[]) => {
    if (!logs || logs.length === 0) return [];
    
    return logs
      .filter(log => {
        const value = log.sleep_hours;
        return value !== undefined && value !== null && !isNaN(Number(value));
      })
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return isNaN(dateA) || isNaN(dateB) ? 0 : dateA - dateB;
      })
      .map(log => {
        const value = Number(log.sleep_hours);
        return {
          x: log.date,
          y: isNaN(value) ? 0 : value,
          date: formatDate(log.date)
        };
      });
  };
  
  // Check if there's any sleep quality data
  const hasSleepQualityData = (logs: MoodData[]): boolean => {
    return logs.some(log => log.sleep_quality !== undefined && log.sleep_quality !== null);
  };
  
  // Prepare sleep quality distribution data
  const prepareSleepQualityDistribution = (logs: MoodData[]) => {
    if (!logs || logs.length === 0) return [];
    
    // Count occurrences of each sleep quality score
    const qualityCounts: Record<number, number> = {};
    logs.forEach(log => {
      if (log.sleep_quality !== undefined && !isNaN(Number(log.sleep_quality))) {
        const score = Number(log.sleep_quality);
        qualityCounts[score] = (qualityCounts[score] || 0) + 1;
      }
    });
    
    // Convert to Victory data format and ensure values are valid
    return Object.entries(qualityCounts)
      .map(([score, count]) => {
        const scoreNum = Number(score);
        return {
          x: isNaN(scoreNum) ? "0" : String(scoreNum),
          y: count
        };
      })
      .filter(item => !isNaN(Number(item.x)) && !isNaN(item.y));
  };
  
  // Generate insights about sleep patterns
  const generateSleepInsights = (logs: MoodData[]) => {
    if (!logs || logs.length === 0) return [{
      icon: 'information-circle-outline',
      color: Colors[colorScheme].tint,
      text: 'No sleep data available. Start tracking your sleep to see insights.'
    }];
    
    // Sleep logs with valid sleep hours
    const sleepLogs = logs.filter(
      log => log.sleep_hours !== undefined && !isNaN(Number(log.sleep_hours))
    );
    
    if (sleepLogs.length === 0) return [{
      icon: 'information-circle-outline',
      color: Colors[colorScheme].tint,
      text: 'No sleep data available. Start tracking your sleep to see insights.'
    }];
    
    const insights = [];
    
    // Calculate average sleep hours
    const avgSleepHours = sleepLogs.reduce((sum, log) => sum + (log.sleep_hours || 0), 0) / sleepLogs.length;
    
    // Insight about average sleep
    if (avgSleepHours < 6) {
      insights.push({
        icon: 'alert-circle-outline',
        color: '#d63031',
        text: `You're averaging ${avgSleepHours.toFixed(1)} hours of sleep, which is below the recommended 7-8 hours.`
      });
    } else if (avgSleepHours >= 8) {
      insights.push({
        icon: 'checkmark-circle-outline',
        color: '#00b894',
        text: `Great job! You're averaging ${avgSleepHours.toFixed(1)} hours of sleep, which meets the recommended amount.`
      });
    } else {
      insights.push({
        icon: 'checkmark-circle-outline',
        color: '#fdcb6e',
        text: `You're averaging ${avgSleepHours.toFixed(1)} hours of sleep, which is within the recommended range.`
      });
    }
    
    // Sleep consistency insight
    if (sleepLogs.length >= 3) {
      const sleepHours = sleepLogs.map(log => log.sleep_hours || 0);
      const minSleep = Math.min(...sleepHours);
      const maxSleep = Math.max(...sleepHours);
      const range = maxSleep - minSleep;
      
      if (range > 3) {
        insights.push({
          icon: 'analytics-outline',
          color: '#d63031',
          text: `Your sleep duration varies significantly (${minSleep.toFixed(1)}-${maxSleep.toFixed(1)} hours). Try to maintain a more consistent sleep schedule.`
        });
      } else if (range < 1.5) {
        insights.push({
          icon: 'analytics-outline',
          color: '#00b894',
          text: `Your sleep schedule is very consistent. Great job maintaining regular sleep patterns!`
        });
      }
    }
    
    // Sleep-mood correlation insight
    const moodLogsWithSleep = logs.filter(
      log => log.sleep_hours !== undefined && log.mood_score !== undefined
    );
    
    if (moodLogsWithSleep.length >= 3) {
      // Calculate correlation between sleep and mood
      const sleepMoodCorrelation = calculateCorrelation(
        moodLogsWithSleep.map(log => log.sleep_hours || 0),
        moodLogsWithSleep.map(log => log.mood_score)
      );
      
      if (sleepMoodCorrelation > 0.4) {
        insights.push({
          icon: 'trending-up-outline',
          color: '#00b894',
          text: `There appears to be a positive correlation between your sleep duration and mood. More sleep tends to improve your mood.`
        });
      } else if (sleepMoodCorrelation < -0.2) {
        insights.push({
          icon: 'trending-down-outline',
          color: '#d63031',
          text: `Interestingly, your mood doesn't seem to improve with more sleep. Other factors might be affecting your mood more.`
        });
      }
    }
    
    // Default insight if no patterns are found
    if (insights.length === 0) {
      insights.push({
        icon: 'information-circle-outline',
        color: Colors[colorScheme].tint,
        text: 'Continue tracking your sleep to reveal patterns and receive more insights.'
      });
    }
    
    return insights;
  };
  
  // Helper function to calculate correlation coefficient
  const calculateCorrelation = (x: number[], y: number[]): number => {
    const n = Math.min(x.length, y.length);
    if (n < 3) return 0; // Need at least 3 points for meaningful correlation
    
    // Calculate means
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;
    
    // Calculate covariance and standard deviations
    let covariance = 0;
    let varX = 0;
    let varY = 0;
    
    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;
      covariance += diffX * diffY;
      varX += diffX * diffX;
      varY += diffY * diffY;
    }
    
    // Prevent division by zero
    if (varX === 0 || varY === 0) return 0;
    
    covariance /= n;
    const stdX = Math.sqrt(varX / n);
    const stdY = Math.sqrt(varY / n);
    
    return covariance / (stdX * stdY);
  };

  // Render journal entry item
  const renderJournalItem = ({ item }: { item: JournalEntry }) => {
    const moodColor = item.mood?.mood_score ? 
      getMoodColor(item.mood.mood_score) : 
      Colors[colorScheme].text;
    
    return (
      <TouchableOpacity
        style={[styles.journalCard, { backgroundColor: Colors[colorScheme].cardBackground }]}
        onPress={() => openEditForm(item)}
        activeOpacity={0.7}
      >
        <View style={styles.journalHeader}>
          <ThemedText style={styles.journalTitle}>{item.title}</ThemedText>
          <ThemedText style={styles.journalDate}>{formatDate(item.date)}</ThemedText>
        </View>
        
        {item.mood?.mood_score && (
          <View style={[styles.moodIndicator, { backgroundColor: moodColor }]}>
            <ThemedText style={styles.moodText}>
              {moodOptions.find(option => option.score === item.mood?.mood_score)?.label || `Mood: ${item.mood?.mood_score}/10`}
            </ThemedText>
          </View>
        )}
        
        <ThemedText style={styles.journalContent} numberOfLines={3}>
          {item.content}
        </ThemedText>
        
        {item.tags && (
          <View style={styles.tagsContainer}>
            {item.tags.split(',').map((tag, index) => (
              <View key={index} style={styles.tagPill}>
                <ThemedText style={styles.tagText}>{tag.trim()}</ThemedText>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Render entry form modal
  const renderFormModal = () => (
    <Modal
      animationType="slide"
      transparent={false}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ThemedView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
            <ThemedText style={styles.closeButtonText}>Cancel</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.modalTitle}>
            {editMode ? 'Edit Journal Entry' : 'New Journal Entry'}
          </ThemedText>
          <TouchableOpacity onPress={handleSubmit} style={styles.saveButton}>
            <ThemedText style={styles.saveButtonText}>Save</ThemedText>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={true}>
          <View>
          {/* Date Picker */}
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Date</ThemedText>
            <TextInput
              style={[styles.input, { color: Colors[colorScheme].text }]}
              value={entryForm.date}
              onChangeText={(text) => setEntryForm({ ...entryForm, date: text })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors[colorScheme].tabIconDefault}
            />
          </View>
          
          {/* Title */}
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Title</ThemedText>
            <TextInput
              style={[styles.input, { color: Colors[colorScheme].text }]}
              value={entryForm.title}
              onChangeText={(text) => setEntryForm({ ...entryForm, title: text })}
              placeholder="Enter title"
              placeholderTextColor={Colors[colorScheme].tabIconDefault}
            />
          </View>
          
          {/* Tags */}
          <View style={[styles.formGroup, styles.tagFormGroup]}>
            <ThemedText style={[styles.sectionTitle, {color: Colors[colorScheme].tint}]}>TAGS</ThemedText>
            <ThemedText style={styles.tagHelp}>Add comma-separated tags to organize your entries:</ThemedText>
            <TextInput
              style={[
                styles.input, 
                { 
                  color: Colors[colorScheme].text,
                  borderWidth: 2,
                  borderColor: Colors[colorScheme].tint,
                  backgroundColor: '#ffffff',
                  padding: 12,
                  fontSize: 16
                }
              ]}
              value={entryForm.tags}
              onChangeText={(text) => setEntryForm({ ...entryForm, tags: text })}
              placeholder="e.g. work, family, health"
              placeholderTextColor={Colors[colorScheme].tabIconDefault}
            />
            {entryForm.tags && (
              <View style={styles.tagPreviewContainer}>
                <ThemedText style={styles.tagPreviewLabel}>Preview:</ThemedText>
                <View style={styles.tagPreview}>
                  {entryForm.tags.split(',').map((tag, index) => (
                    tag.trim() && (
                      <View key={index} style={styles.tagPill}>
                        <ThemedText style={styles.tagText}>{tag.trim()}</ThemedText>
                      </View>
                    )
                  ))}
                </View>
              </View>
            )}
          </View>
          
          {/* Mood Section */}
          <View style={styles.moodSection}>
            <ThemedText style={styles.sectionTitle}>How are you feeling?</ThemedText>
            
            {/* Mood Score Selector */}
            <View style={styles.moodSelector}>
              {moodOptions.map((option) => (
                <TouchableOpacity
                  key={option.score}
                  style={[
                    styles.moodOption,
                    { backgroundColor: option.color },
                    entryForm.mood?.mood_score === option.score && styles.selectedMoodOption
                  ]}
                  onPress={() => setEntryForm({
                    ...entryForm,
                    mood: {
                      ...entryForm.mood!,
                      mood_score: option.score
                    }
                  })}
                >
                  <ThemedText style={[styles.moodOptionText, entryForm.mood?.mood_score === option.score && styles.selectedMoodText]}>
                    {option.score}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
            
            <ThemedText style={styles.moodLabel}>
              {moodOptions.find(option => option.score === entryForm.mood?.mood_score)?.label || 'Select mood'}
            </ThemedText>
            
            {/* Energy Level Slider */}
            <View style={styles.sliderContainer}>
              <ThemedText style={styles.label}>Energy Level: {entryForm.mood?.energy_level}/10</ThemedText>
              <View style={styles.slider}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.sliderPoint,
                      { backgroundColor: entryForm.mood?.energy_level === value ? Colors[colorScheme].tint : Colors[colorScheme].tabIconDefault }
                    ]}
                    onPress={() => setEntryForm({
                      ...entryForm,
                      mood: {
                        ...entryForm.mood!,
                        energy_level: value
                      }
                    })}
                  />
                ))}
              </View>
            </View>
            
            {/* Stress Level Slider */}
            <View style={styles.sliderContainer}>
              <ThemedText style={styles.label}>Stress Level: {entryForm.mood?.stress_level}/10</ThemedText>
              <View style={styles.slider}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.sliderPoint,
                      { backgroundColor: entryForm.mood?.stress_level === value ? Colors[colorScheme].tint : Colors[colorScheme].tabIconDefault }
                    ]}
                    onPress={() => setEntryForm({
                      ...entryForm,
                      mood: {
                        ...entryForm.mood!,
                        stress_level: value
                      }
                    })}
                  />
                ))}
              </View>
            </View>
            
            {/* Sleep Section */}
            <View style={styles.sleepSection}>
              <ThemedText style={styles.sectionTitle}>Sleep Information</ThemedText>

              {/* Sleep Hours */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Sleep Hours</ThemedText>
                <TextInput
                  style={[styles.input, { color: Colors[colorScheme].text }]}
                  value={entryForm.mood?.sleep_hours?.toString() || ''}
                  onChangeText={(text) => setEntryForm({
                    ...entryForm,
                    mood: {
                      ...entryForm.mood!,
                      sleep_hours: text ? parseFloat(text) : undefined
                    }
                  })}
                  placeholder="Hours of sleep"
                  placeholderTextColor={Colors[colorScheme].tabIconDefault}
                  keyboardType="numeric"
                />
              </View>

              {/* Sleep Quality */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Sleep Quality (1-10)</ThemedText>
                <View style={styles.slider}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.sliderPoint,
                        { backgroundColor: entryForm.mood?.sleep_quality === value 
                          ? getSleepQualityColor(value) 
                          : Colors[colorScheme].tabIconDefault }
                      ]}
                      onPress={() => setEntryForm({
                        ...entryForm,
                        mood: {
                          ...entryForm.mood!,
                          sleep_quality: value
                        }
                      })}
                    />
                  ))}
                </View>
                <View style={styles.sliderLabels}>
                  <ThemedText style={styles.sliderLabelText}>Poor</ThemedText>
                  <ThemedText style={styles.sliderLabelText}>Excellent</ThemedText>
                </View>
              </View>
              
              {/* Bedtime */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Bedtime (optional)</ThemedText>
                <TextInput
                  style={[styles.input, { color: Colors[colorScheme].text }]}
                  value={entryForm.mood?.bedtime || ''}
                  onChangeText={(text) => setEntryForm({
                    ...entryForm,
                    mood: {
                      ...entryForm.mood!,
                      bedtime: text
                    }
                  })}
                  placeholder="HH:MM (e.g. 22:30)"
                  placeholderTextColor={Colors[colorScheme].tabIconDefault}
                />
              </View>
              
              {/* Wake Time */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Wake Time (optional)</ThemedText>
                <TextInput
                  style={[styles.input, { color: Colors[colorScheme].text }]}
                  value={entryForm.mood?.wake_time || ''}
                  onChangeText={(text) => setEntryForm({
                    ...entryForm,
                    mood: {
                      ...entryForm.mood!,
                      wake_time: text
                    }
                  })}
                  placeholder="HH:MM (e.g. 07:00)"
                  placeholderTextColor={Colors[colorScheme].tabIconDefault}
                />
              </View>
            </View>
          </View>
          
          {/* Journal Content */}
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Journal Entry</ThemedText>
            <TextInput
              style={[styles.textArea, { color: Colors[colorScheme].text }]}
              value={entryForm.content}
              onChangeText={(text) => setEntryForm({ ...entryForm, content: text })}
              placeholder="Write your journal entry here..."
              placeholderTextColor={Colors[colorScheme].tabIconDefault}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
          </View>
          
          {/* Delete Button (only in edit mode) */}
          {editMode && selectedEntry?.id && (
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => handleDelete(selectedEntry.id!)}
            >
              <ThemedText style={styles.deleteButtonText}>Delete Entry</ThemedText>
            </TouchableOpacity>
          )}
          </View>
        </ScrollView>
      </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );

  // Debug activeTab value
  console.log('Current activeTab:', activeTab);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Journal & Mood</ThemedText>
      </View>
      
      {/* Tab navigation */}
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'journal' && styles.activeTab]} 
          onPress={() => setActiveTab('journal')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'journal' && styles.activeTabText]}>Journal</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'moods' && styles.activeTab]} 
          onPress={() => setActiveTab('moods')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'moods' && styles.activeTabText]}>Mood History</ThemedText>
        </TouchableOpacity>
      </View>
      
      {activeTab === 'journal' ? (
        <>
          <FlatList
            data={journalEntries}
            renderItem={renderJournalItem}
            keyExtractor={item => item.id?.toString() || `temp-${Date.now()}`}
            contentContainerStyle={styles.journalList}
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
                  {refreshing ? 'Loading journal entries...' : 'No journal entries yet. Start writing!'}
                </ThemedText>
              </ThemedView>
            }
          />
          
          {/* Add Entry Button */}
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: Colors[colorScheme].tint }]}
            onPress={openNewEntryForm}
          >
            <ThemedText style={styles.addButtonText}>+</ThemedText>
          </TouchableOpacity>
        </>
      ) : (
        <ScrollView
          contentContainerStyle={styles.moodHistoryContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={loadData}
              colors={[Colors[colorScheme].tint]}
              tintColor={Colors[colorScheme].tint}
            />
          }
        >
          {/* Time range selector */}
          <View style={styles.timeRangeSelector}>
            <TouchableOpacity 
              style={[styles.timeRangeButton, timeRange === 'week' && styles.activeTimeRange]} 
              onPress={() => setTimeRange('week')}
            >
              <ThemedText style={[styles.timeRangeText, timeRange === 'week' && styles.activeTimeRangeText]}>Week</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.timeRangeButton, timeRange === 'month' && styles.activeTimeRange]} 
              onPress={() => setTimeRange('month')}
            >
              <ThemedText style={[styles.timeRangeText, timeRange === 'month' && styles.activeTimeRangeText]}>Month</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.timeRangeButton, timeRange === 'year' && styles.activeTimeRange]} 
              onPress={() => setTimeRange('year')}
            >
              <ThemedText style={[styles.timeRangeText, timeRange === 'year' && styles.activeTimeRangeText]}>Year</ThemedText>
            </TouchableOpacity>
          </View>

          {loadingMoodData ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors[colorScheme].tint} />
              <ThemedText style={styles.loadingText}>Loading mood data...</ThemedText>
            </View>
          ) : moodLogs.length === 0 ? (
            <ThemedView style={styles.emptyContainer}>
              <Ionicons 
                name="happy-outline" 
                size={60} 
                color={Colors[colorScheme].icon} 
                style={{ marginBottom: 20, opacity: 0.5 }}
              />
              <ThemedText style={styles.emptyText}>
                No mood data available in this time range. Start tracking your mood in journal entries.
              </ThemedText>
            </ThemedView>
          ) : (
            <>
              {/* Mood Overview */}
              <View style={styles.moodOverviewCard}>
                <ThemedText style={styles.moodOverviewTitle}>Mood Overview</ThemedText>
                <View style={styles.moodStatsRow}>
                  <View style={styles.moodStatItem}>
                    <ThemedText style={styles.moodStatValue}>
                      {calculateAverage(moodLogs, 'mood_score').toFixed(1)}
                    </ThemedText>
                    <ThemedText style={styles.moodStatLabel}>Avg Mood</ThemedText>
                  </View>
                  <View style={styles.moodStatItem}>
                    <ThemedText style={styles.moodStatValue}>
                      {calculateAverage(moodLogs, 'energy_level').toFixed(1)}
                    </ThemedText>
                    <ThemedText style={styles.moodStatLabel}>Avg Energy</ThemedText>
                  </View>
                  <View style={styles.moodStatItem}>
                    <ThemedText style={styles.moodStatValue}>
                      {calculateAverage(moodLogs, 'stress_level').toFixed(1)}
                    </ThemedText>
                    <ThemedText style={styles.moodStatLabel}>Avg Stress</ThemedText>
                  </View>
                  <View style={styles.moodStatItem}>
                    <ThemedText style={styles.moodStatValue}>
                      {calculateAverage(moodLogs, 'sleep_hours').toFixed(1)}
                    </ThemedText>
                    <ThemedText style={styles.moodStatLabel}>Avg Sleep</ThemedText>
                  </View>
                </View>
              </View>

              {/* Mood Trend Chart */}
              <View style={styles.chartCard}>
                <ThemedText style={styles.chartTitle}>Mood Trend</ThemedText>
                <View style={styles.chartContainer}>
                  <VictoryChart
                    width={chartWidth}
                    height={chartHeight}
                    theme={chartTheme}
                    domainPadding={{ x: 20 }}
                    containerComponent={
                      <VictoryVoronoiContainer
                        voronoiDimension="x"
                        labels={({ datum }) => datum ? `${datum.date}: ${datum.y}` : ""}
                        labelComponent={<VictoryTooltip 
                          cornerRadius={5} 
                          flyoutStyle={{ 
                            fill: isDarkMode ? "#37474F" : "white", 
                            stroke: isDarkMode ? "#607D8B" : "#90A4AE" 
                          }} 
                        />}
                      />
                    }
                  >
                    <VictoryAxis
                      style={{
                        grid: { stroke: "none" },
                        tickLabels: { angle: -45, fontSize: 8, fill: Colors[colorScheme].text }
                      }}
                      tickCount={5}
                    />
                    <VictoryAxis
                      dependentAxis
                      domain={[0, 10]}
                      style={{
                        grid: { stroke: "#e0e0e0" },
                        tickLabels: { fill: Colors[colorScheme].text }
                      }}
                    />
                    <VictoryLine
                      data={prepareMoodData(moodLogs, 'mood_score')}
                      style={{
                        data: { stroke: "#0984e3", strokeWidth: 2 }
                      }}
                      animate={{
                        duration: 500,
                        onLoad: { duration: 500 }
                      }}
                      x={(datum) => datum.x}
                      y={(datum) => (!isNaN(datum.y) ? datum.y : 0)}
                    />
                    <VictoryScatter
                      data={prepareMoodData(moodLogs, 'mood_score')}
                      size={5}
                      style={{
                        data: { fill: "#0984e3" }
                      }}
                      x={(datum) => datum.x}
                      y={(datum) => (!isNaN(datum.y) ? datum.y : 0)}
                    />
                  </VictoryChart>
                </View>
              </View>

              {/* Energy Level Chart */}
              <View style={styles.chartCard}>
                <ThemedText style={styles.chartTitle}>Energy Level</ThemedText>
                <View style={styles.chartContainer}>
                  <VictoryChart
                    width={chartWidth}
                    height={chartHeight}
                    theme={chartTheme}
                    domainPadding={{ x: 20 }}
                    containerComponent={
                      <VictoryVoronoiContainer
                        voronoiDimension="x"
                        labels={({ datum }) => datum ? `${datum.date}: ${datum.y}` : ""}
                        labelComponent={<VictoryTooltip 
                          cornerRadius={5} 
                          flyoutStyle={{ 
                            fill: isDarkMode ? "#37474F" : "white", 
                            stroke: isDarkMode ? "#607D8B" : "#90A4AE" 
                          }} 
                        />}
                      />
                    }
                  >
                    <VictoryAxis
                      style={{
                        grid: { stroke: "none" },
                        tickLabels: { angle: -45, fontSize: 8, fill: Colors[colorScheme].text }
                      }}
                      tickCount={5}
                    />
                    <VictoryAxis
                      dependentAxis
                      domain={[0, 10]}
                      style={{
                        grid: { stroke: "#e0e0e0" },
                        tickLabels: { fill: Colors[colorScheme].text }
                      }}
                    />
                    <VictoryArea
                      data={prepareMoodData(moodLogs, 'energy_level')}
                      style={{
                        data: { 
                          fill: "#6c5ce7",
                          fillOpacity: 0.2,
                          stroke: "#6c5ce7",
                          strokeWidth: 2
                        }
                      }}
                      animate={{
                        duration: 500,
                        onLoad: { duration: 500 }
                      }}
                      x={(datum) => datum.x}
                      y={(datum) => (!isNaN(datum.y) ? datum.y : 0)}
                    />
                  </VictoryChart>
                </View>
              </View>

              {/* Stress Level Chart */}
              <View style={styles.chartCard}>
                <ThemedText style={styles.chartTitle}>Stress Level</ThemedText>
                <View style={styles.chartContainer}>
                  <VictoryChart
                    width={chartWidth}
                    height={chartHeight}
                    theme={chartTheme}
                    domainPadding={{ x: 20 }}
                    containerComponent={
                      <VictoryVoronoiContainer
                        voronoiDimension="x"
                        labels={({ datum }) => datum ? `${datum.date}: ${datum.y}` : ""}
                        labelComponent={<VictoryTooltip 
                          cornerRadius={5} 
                          flyoutStyle={{ 
                            fill: isDarkMode ? "#37474F" : "white", 
                            stroke: isDarkMode ? "#607D8B" : "#90A4AE" 
                          }} 
                        />}
                      />
                    }
                  >
                    <VictoryAxis
                      style={{
                        grid: { stroke: "none" },
                        tickLabels: { angle: -45, fontSize: 8, fill: Colors[colorScheme].text }
                      }}
                      tickCount={5}
                    />
                    <VictoryAxis
                      dependentAxis
                      domain={[0, 10]}
                      style={{
                        grid: { stroke: "#e0e0e0" },
                        tickLabels: { fill: Colors[colorScheme].text }
                      }}
                    />
                    <VictoryArea
                      data={prepareMoodData(moodLogs, 'stress_level')}
                      style={{
                        data: { 
                          fill: "#d63031",
                          fillOpacity: 0.2,
                          stroke: "#d63031",
                          strokeWidth: 2
                        }
                      }}
                      animate={{
                        duration: 500,
                        onLoad: { duration: 500 }
                      }}
                      x={(datum) => datum.x}
                      y={(datum) => (!isNaN(datum.y) ? datum.y : 0)}
                    />
                  </VictoryChart>
                </View>
              </View>

              {/* Sleep & Mood Correlation */}
              <View style={styles.chartCard}>
                <ThemedText style={styles.chartTitle}>Sleep & Mood Correlation</ThemedText>
                <View style={styles.chartContainer}>
                  <VictoryChart
                    width={chartWidth}
                    height={chartHeight}
                    theme={chartTheme}
                    domainPadding={{ x: 20 }}
                    containerComponent={
                      <VictoryVoronoiContainer
                        voronoiDimension="x"
                        labels={({ datum }) => datum ? `Sleep: ${datum.x}h | Mood: ${datum.y}` : ""}
                        labelComponent={<VictoryTooltip 
                          cornerRadius={5} 
                          flyoutStyle={{ 
                            fill: isDarkMode ? "#37474F" : "white", 
                            stroke: isDarkMode ? "#607D8B" : "#90A4AE" 
                          }} 
                        />}
                      />
                    }
                  >
                    <VictoryAxis
                      label="Sleep Hours"
                      style={{
                        grid: { stroke: "none" },
                        tickLabels: { fill: Colors[colorScheme].text },
                        axisLabel: { padding: 30, fill: Colors[colorScheme].text }
                      }}
                    />
                    <VictoryAxis
                      dependentAxis
                      label="Mood Score"
                      domain={[0, 10]}
                      style={{
                        grid: { stroke: "#e0e0e0" },
                        tickLabels: { fill: Colors[colorScheme].text },
                        axisLabel: { padding: 40, fill: Colors[colorScheme].text }
                      }}
                    />
                    <VictoryScatter
                      data={prepareSleepMoodData(moodLogs)}
                      size={7}
                      style={{
                        data: { fill: "#00b894" }
                      }}
                      animate={{
                        duration: 500,
                        onLoad: { duration: 500 }
                      }}
                      // Only include valid data points
                      x={(datum) => (!isNaN(datum.x) ? datum.x : 0)}
                      y={(datum) => (!isNaN(datum.y) ? datum.y : 0)}
                    />
                  </VictoryChart>
                </View>
              </View>

              {/* Mood Distribution */}
              <View style={styles.chartCard}>
                <ThemedText style={styles.chartTitle}>Mood Distribution</ThemedText>
                <View style={styles.chartContainer}>
                  <VictoryChart
                    width={chartWidth}
                    height={chartHeight}
                    domainPadding={{ x: 25 }}
                    theme={chartTheme}
                  >
                    <VictoryAxis
                      style={{
                        grid: { stroke: "none" },
                        tickLabels: { fill: Colors[colorScheme].text }
                      }}
                    />
                    <VictoryAxis
                      dependentAxis
                      style={{
                        grid: { stroke: "#e0e0e0" },
                        tickLabels: { fill: Colors[colorScheme].text }
                      }}
                    />
                    <VictoryBar
                      data={prepareMoodDistributionData(moodLogs)}
                      style={{
                        data: { 
                          fill: ({ datum }) => {
                            try {
                              return getMoodColor(datum.x) || "#6c5ce7";
                            } catch (e) {
                              return "#6c5ce7"; // Fallback color if there's an error
                            }
                          }
                        }
                      }}
                      animate={{
                        duration: 500,
                        onLoad: { duration: 500 }
                      }}
                      // Ensure we're parsing string values correctly
                      x={(datum) => String(datum.x)}
                      y={(datum) => Number(datum.y)}
                    />
                  </VictoryChart>
                </View>
              </View>
              
              {/* Sleep Analysis Section */}
              <View style={styles.sleepAnalysisSection}>
                <ThemedText style={styles.sectionHeaderTitle}>Sleep Analysis</ThemedText>
                
                {/* Sleep Duration Trend */}
                <View style={styles.chartCard}>
                  <ThemedText style={styles.chartTitle}>Sleep Duration Trend</ThemedText>
                  <View style={styles.chartContainer}>
                    <VictoryChart
                      width={chartWidth}
                      height={chartHeight}
                      theme={chartTheme}
                      domainPadding={{ x: 20 }}
                    >
                      <VictoryAxis
                        style={{
                          grid: { stroke: "none" },
                          tickLabels: { angle: -45, fontSize: 8, fill: Colors[colorScheme].text }
                        }}
                        tickCount={5}
                      />
                      <VictoryAxis
                        dependentAxis
                        domain={[0, 12]}
                        style={{
                          grid: { stroke: "#e0e0e0" },
                          tickLabels: { fill: Colors[colorScheme].text }
                        }}
                      />
                      <VictoryArea
                        data={prepareSleepHoursData(moodLogs)}
                        style={{
                          data: { 
                            fill: "#3498db",
                            fillOpacity: 0.2,
                            stroke: "#3498db",
                            strokeWidth: 2
                          }
                        }}
                        animate={{
                          duration: 500,
                          onLoad: { duration: 500 }
                        }}
                        x={(datum) => datum.x}
                        y={(datum) => (!isNaN(datum.y) ? datum.y : 0)}
                      />
                    </VictoryChart>
                  </View>
                </View>
                
                {/* Sleep Quality Distribution */}
                {hasSleepQualityData(moodLogs) && (
                  <View style={styles.chartCard}>
                    <ThemedText style={styles.chartTitle}>Sleep Quality Distribution</ThemedText>
                    <View style={styles.chartContainer}>
                      <VictoryChart
                        width={chartWidth}
                        height={chartHeight}
                        domainPadding={{ x: 25 }}
                        theme={chartTheme}
                      >
                        <VictoryAxis
                          style={{
                            grid: { stroke: "none" },
                            tickLabels: { fill: Colors[colorScheme].text }
                          }}
                        />
                        <VictoryAxis
                          dependentAxis
                          style={{
                            grid: { stroke: "#e0e0e0" },
                            tickLabels: { fill: Colors[colorScheme].text }
                          }}
                        />
                        <VictoryBar
                          data={prepareSleepQualityDistribution(moodLogs)}
                          style={{
                            data: { 
                              fill: ({ datum }) => getSleepQualityColor(Number(datum.x))
                            }
                          }}
                          animate={{
                            duration: 500,
                            onLoad: { duration: 500 }
                          }}
                          x={(datum) => String(datum.x)}
                          y={(datum) => Number(datum.y)}
                        />
                      </VictoryChart>
                    </View>
                  </View>
                )}
                
                {/* Sleep Insights */}
                <View style={styles.insightsCard}>
                  <ThemedText style={styles.insightsTitle}>Sleep Insights</ThemedText>
                  <View style={styles.insightsList}>
                    {generateSleepInsights(moodLogs).map((insight, index) => (
                      <View key={index} style={styles.insightItem}>
                        <Ionicons 
                          name={insight.icon} 
                          size={20} 
                          color={insight.color} 
                          style={styles.insightIcon} 
                        />
                        <ThemedText style={styles.insightText}>{insight.text}</ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      )}
      
      {/* Journal Entry Form Modal */}
      {renderFormModal()}
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
  journalList: {
    padding: 16,
    paddingBottom: 80, // Extra padding for add button
  },
  journalCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  journalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  journalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  journalDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  moodIndicator: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 8,
  },
  moodText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  journalContent: {
    fontSize: 14,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagFormGroup: {
    marginTop: 20,
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#edf7ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.tint,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tagHelp: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
  },
  tagPreviewContainer: {
    marginTop: 12,
  },
  tagPreviewLabel: {
    fontSize: 14,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  tagPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tagPill: {
    backgroundColor: Colors.light.tint + '33', // Add transparency
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  tagText: {
    fontSize: 12,
    color: Colors.light.tint,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  addButtonText: {
    fontSize: 32,
    color: '#fff',
    marginTop: -4,
  },
  modalContainer: {
    flex: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#999',
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    color: Colors.light.tint,
    fontWeight: 'bold',
  },
  formContainer: {
    flex: 1,
    paddingBottom: 30,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    minHeight: 120,
  },
  moodSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  sleepSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f0f9ff', // Light blue background for sleep section
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(120, 180, 220, 0.3)', // Subtle blue border
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  sliderLabelText: {
    fontSize: 12,
    opacity: 0.7,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  moodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  moodOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedMoodOption: {
    borderColor: '#000',
    transform: [{ scale: 1.2 }],
  },
  moodOptionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  selectedMoodText: {
    fontSize: 16,
  },
  moodLabel: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 16,
    fontWeight: 'bold',
  },
  sliderContainer: {
    marginBottom: 16,
  },
  slider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  sliderPoint: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  moodHistoryContainer: {
    flex: 1,
    padding: 20,
  },
  moodHistoryContent: {
    paddingBottom: 40,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    padding: 10,
    justifyContent: 'center',
    marginBottom: 10,
  },
  timeRangeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginHorizontal: 5,
    backgroundColor: '#f0f0f0',
  },
  activeTimeRange: {
    backgroundColor: Colors.light.tint,
  },
  timeRangeText: {
    fontSize: 12,
    color: '#666',
  },
  activeTimeRangeText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  moodOverviewCard: {
    backgroundColor: 'rgba(200, 230, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(200, 230, 255, 0.2)',
  },
  moodOverviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  moodStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moodStatItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(240, 240, 240, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(200, 200, 200, 0.2)',
  },
  moodStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  moodStatLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  chartCard: {
    backgroundColor: 'rgba(250, 250, 250, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(200, 200, 200, 0.2)',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 5,
  },
  sleepAnalysisSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(200, 200, 200, 0.3)',
  },
  sectionHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#3498db', // Blue color for sleep
  },
  insightsCard: {
    backgroundColor: 'rgba(240, 249, 255, 0.3)', // Light blue background
    borderRadius: 12,
    padding: 15,
    margin: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(120, 180, 220, 0.3)', // Subtle blue border
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  insightsList: {
    marginTop: 10,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200, 200, 200, 0.3)',
  },
  insightIcon: {
    marginRight: 10,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});