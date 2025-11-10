import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, Platform, ScrollView, TouchableOpacity, Alert, Text, FlatList } from 'react-native';
import { Input } from '@rneui/themed';
import DateTimePicker from '@react-native-community/datetimepicker';
import { fetchActivities } from '@/services/api';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';

type ActivityFormProps = {
  initialActivity?: Activity;
  onSubmit: (activity: Partial<Activity>) => void;
  onCancel?: () => void;
};

// Activity type that matches your backend
export type Activity = {
  "Activity": string;
  "Category": string;
  "Category_Points_Lambda"?: number;
  "Date": string;
  "End_Time": number | string;
  "Notes": string;
  "Points"?: number;
  "Start_Time": number | string;
  "Tags": string;
  "activity_id"?: number;
};

export const ActivityForm = ({ initialActivity, onSubmit, onCancel }: ActivityFormProps) => {
  // Initialize state with either the initial activity or default values
  const [activity, setActivity] = useState<Partial<Activity>>(initialActivity || {
    Activity: '',
    Category: '',
    Date: new Date().toISOString().split('T')[0],
    End_Time: '',
    Notes: '',
    Start_Time: '',
    Tags: '',
    Points: 10, // Default points
  });

  // States for autocomplete
  const [categories, setCategories] = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<string[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<string[]>([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [showActivitySuggestions, setShowActivitySuggestions] = useState(false);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  // Handle input changes
  const handleChange = (name: keyof Activity, value: string | number) => {
    // Reduce logging to improve performance
    setActivity(prev => ({ ...prev, [name]: value }));
  };

  // Handle date change
  const handleDateChange = (event: any, selectedDate?: Date) => {
    // Always close the picker
    setShowDatePicker(false);
    
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      handleChange('Date', formattedDate);
    }
  };

  // Handle time changes
  const handleTimeChange = (isStart: boolean) => (event: any, selectedTime?: Date) => {
    // Always close the picker after selection
    if (isStart) {
      setShowStartPicker(false);
    } else {
      setShowEndPicker(false);
    }

    if (selectedTime) {
      const hours = selectedTime.getHours();
      const minutes = selectedTime.getMinutes();
      const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      handleChange(isStart ? 'Start_Time' : 'End_Time', formattedTime);
    }
  };
  
  // Load autocomplete data and set default times
  useEffect(() => {
    // Set default times if they're not already set
    if (!activity.Start_Time) {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      handleChange('Start_Time', formattedTime);
    }
    
    if (!activity.End_Time) {
      const now = new Date();
      const hours = now.getHours() + 1; // Default to one hour later
      const minutes = now.getMinutes();
      const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      handleChange('End_Time', formattedTime);
    }
    
    // Load existing activities for autocomplete
    const loadAutocompleteData = async () => {
      try {
        const data = await fetchActivities(false);
        
        if (Array.isArray(data) && data.length > 0) {
          // Extract unique categories
          const uniqueCategories = [...new Set(data.map(item => item.Category).filter(Boolean))];
          setCategories(uniqueCategories);
          
          // Extract unique activity names
          const uniqueActivities = [...new Set(data.map(item => item.Activity).filter(Boolean))];
          setActivities(uniqueActivities);
        }
      } catch (error) {
        // Silent fail - autocomplete is a nice-to-have
        console.error('Failed to load autocomplete data:', error);
      }
    };
    
    loadAutocompleteData();
  }, []);
  
  // Filter categories as user types
  const filterCategories = (text: string) => {
    setShowCategorySuggestions(true);
    const filtered = categories.filter(cat => 
      cat.toLowerCase().includes(text.toLowerCase())
    ).slice(0, 5); // Limit to 5 suggestions
    setFilteredCategories(filtered);
  };
  
  // Filter activities as user types
  const filterActivities = (text: string) => {
    setShowActivitySuggestions(true);
    const filtered = activities.filter(act => 
      act.toLowerCase().includes(text.toLowerCase())
    ).slice(0, 5); // Limit to 5 suggestions
    setFilteredActivities(filtered);
  };

  // Handle form submission
  const handleSubmit = () => {
    try {
      // Validate required fields
      if (!activity.Activity || !activity.Category || !activity.Date || 
          !activity.Start_Time || !activity.End_Time) {
        Alert.alert('Missing Information', 'Please fill in all required fields');
        return;
      }
      
      // Add Points (default to 10 if not specified)
      const activityWithPoints = { 
        ...activity,
        Points: activity.Points || 10 
      };
      
      if (typeof onSubmit !== 'function') {
        Alert.alert('Error', 'Internal error: onSubmit handler is not available');
        return;
      }
      
      onSubmit(activityWithPoints);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      Alert.alert('Error', 'An unexpected error occurred while submitting the form');
    }
  };

  // Close suggestion lists when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowCategorySuggestions(false);
      setShowActivitySuggestions(false);
    };
    
    // For web platform only
    if (Platform.OS === 'web') {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => {
      if (Platform.OS === 'web') {
        document.removeEventListener('click', handleClickOutside);
      }
    };
  }, []);

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.title, {color: textColor, fontSize: 20, fontWeight: 'bold'}]}>
          {initialActivity ? 'Edit Activity' : 'Add New Activity'}
        </Text>

        {/* Date Picker - simplified with better feedback */}
        <View style={styles.formGroup}>
          <ThemedText style={styles.inputLabel}>Date:</ThemedText>
          {Platform.OS !== 'web' ? (
            <>
              <TouchableOpacity 
                style={[styles.dateTimeButton, { borderColor: tintColor }]} 
                onPress={() => setShowDatePicker(true)}
              >
                <ThemedText>{activity.Date || 'Select Date'}</ThemedText>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={activity.Date ? new Date(activity.Date) : new Date()}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                />
              )}
            </>
          ) : (
            // Simplified web date input with clearer response
            <View style={styles.webDateContainer}>
              <View style={styles.dateInputWrapper}>
                <TextInput
                  style={styles.textInput}
                  value={activity.Date || ''}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="rgba(150,150,150,0.6)"
                  onChangeText={(text) => {
                    // Format as YYYY-MM-DD as user types
                    // Remove non-numeric characters
                    const cleaned = text.replace(/[^0-9]/g, '');
                    
                    // Format with dashes
                    let formatted = '';
                    if (cleaned.length > 0) {
                      // Add year
                      formatted = cleaned.substring(0, Math.min(4, cleaned.length));
                      
                      // Add first dash and month
                      if (cleaned.length > 4) {
                        formatted += '-' + cleaned.substring(4, Math.min(6, cleaned.length));
                      }
                      
                      // Add second dash and day
                      if (cleaned.length > 6) {
                        formatted += '-' + cleaned.substring(6, Math.min(8, cleaned.length));
                      }
                    }
                    
                    handleChange('Date', formatted);
                  }}
                  maxLength={10}
                  keyboardType="numeric"
                />
              </View>
            </View>
          )}
        </View>

        {/* Time Pickers - Simplified */}
        <View style={styles.timeRowContainer}>
          {/* Start Time */}
          <View style={styles.timeColumn}>
            <ThemedText style={styles.inputLabel}>Start Time:</ThemedText>
            
            {Platform.OS !== 'web' ? (
              <>
                <TouchableOpacity 
                  style={[styles.timeButton, { borderColor: tintColor }]} 
                  onPress={() => setShowStartPicker(true)}
                >
                  <ThemedText>{activity.Start_Time || 'Select'}</ThemedText>
                </TouchableOpacity>
                
                {showStartPicker && (
                  <DateTimePicker
                    value={new Date()}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange(true)}
                  />
                )}
              </>
            ) : (
              // Simple HH:MM input with clear feedback
              <TextInput
                style={styles.textInput}
                value={typeof activity.Start_Time === 'string' ? activity.Start_Time : ''}
                onChangeText={(text) => {
                  // Format as user types (HH:MM)
                  const cleaned = text.replace(/[^0-9]/g, '');
                  
                  let formatted = '';
                  if (cleaned.length > 0) {
                    // Add hours (00-23)
                    const hours = cleaned.substring(0, Math.min(2, cleaned.length));
                    formatted = hours;
                    
                    // Add colon and minutes
                    if (cleaned.length > 2) {
                      formatted += ':' + cleaned.substring(2, Math.min(4, cleaned.length));
                    }
                  }
                  
                  handleChange('Start_Time', formatted);
                }}
                placeholder="HH:MM (24h)"
                placeholderTextColor="rgba(150,150,150,0.6)"
                maxLength={5}
                keyboardType="numeric"
              />
            )}
          </View>
          
          {/* End Time */}
          <View style={styles.timeColumn}>
            <ThemedText style={styles.inputLabel}>End Time:</ThemedText>
            
            {Platform.OS !== 'web' ? (
              <>
                <TouchableOpacity 
                  style={[styles.timeButton, { borderColor: tintColor }]} 
                  onPress={() => setShowEndPicker(true)}
                >
                  <ThemedText>{activity.End_Time || 'Select'}</ThemedText>
                </TouchableOpacity>
                
                {showEndPicker && (
                  <DateTimePicker
                    value={new Date()}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange(false)}
                  />
                )}
              </>
            ) : (
              // Simple HH:MM input with clear feedback
              <TextInput
                style={styles.textInput}
                value={typeof activity.End_Time === 'string' ? activity.End_Time : ''}
                onChangeText={(text) => {
                  // Format as user types (HH:MM)
                  const cleaned = text.replace(/[^0-9]/g, '');
                  
                  let formatted = '';
                  if (cleaned.length > 0) {
                    // Add hours (00-23)
                    const hours = cleaned.substring(0, Math.min(2, cleaned.length));
                    formatted = hours;
                    
                    // Add colon and minutes
                    if (cleaned.length > 2) {
                      formatted += ':' + cleaned.substring(2, Math.min(4, cleaned.length));
                    }
                  }
                  
                  handleChange('End_Time', formatted);
                }}
                placeholder="HH:MM (24h)"
                placeholderTextColor="rgba(150,150,150,0.6)"
                maxLength={5}
                keyboardType="numeric"
              />
            )}
          </View>
        </View>

        {/* Category */}
        <View style={styles.formGroup}>
          <ThemedText style={styles.inputLabel}>Category:</ThemedText>
          <TextInput
            style={styles.textInput}
            value={activity.Category?.toString()}
            onChangeText={(value) => {
              handleChange('Category', value);
              filterCategories(value);
            }}
            onFocus={() => {
              if (activity.Category) {
                filterCategories(activity.Category.toString());
              }
              setShowCategorySuggestions(true);
            }}
            placeholder="Enter category (e.g. Work, Exercise)"
            placeholderTextColor="rgba(150,150,150,0.6)"
          />
          
          {/* Category suggestions */}
          {showCategorySuggestions && filteredCategories.length > 0 && (
            <View style={styles.suggestionContainer}>
              <FlatList
                data={filteredCategories}
                keyExtractor={(item, index) => `category-${index}`}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.suggestionItem}
                    onPress={() => {
                      handleChange('Category', item);
                      setShowCategorySuggestions(false);
                    }}
                  >
                    <Text style={styles.suggestionText}>{item}</Text>
                  </TouchableOpacity>
                )}
                style={styles.suggestionList}
              />
            </View>
          )}
        </View>

        {/* Activity */}
        <View style={styles.formGroup}>
          <ThemedText style={styles.inputLabel}>Activity:</ThemedText>
          <TextInput
            style={styles.textInput}
            value={activity.Activity?.toString()}
            onChangeText={(value) => {
              handleChange('Activity', value);
              filterActivities(value);
            }}
            onFocus={() => {
              if (activity.Activity) {
                filterActivities(activity.Activity.toString());
              }
              setShowActivitySuggestions(true);
            }}
            placeholder="Enter activity name"
            placeholderTextColor="rgba(150,150,150,0.6)"
          />
          
          {/* Activity suggestions */}
          {showActivitySuggestions && filteredActivities.length > 0 && (
            <View style={styles.suggestionContainer}>
              <FlatList
                data={filteredActivities}
                keyExtractor={(item, index) => `activity-${index}`}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.suggestionItem}
                    onPress={() => {
                      handleChange('Activity', item);
                      setShowActivitySuggestions(false);
                    }}
                  >
                    <Text style={styles.suggestionText}>{item}</Text>
                  </TouchableOpacity>
                )}
                style={styles.suggestionList}
              />
            </View>
          )}
        </View>

        {/* Tags */}
        <View style={styles.formGroup}>
          <ThemedText style={styles.inputLabel}>Tags (comma separated):</ThemedText>
          <TextInput
            style={styles.textInput}
            value={activity.Tags?.toString()}
            onChangeText={(value) => handleChange('Tags', value)}
            placeholder="work, important, etc."
            placeholderTextColor="rgba(150,150,150,0.6)"
          />
        </View>

        {/* Notes */}
        <View style={styles.formGroup}>
          <ThemedText style={styles.inputLabel}>Notes:</ThemedText>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            value={activity.Notes?.toString()}
            onChangeText={(value) => handleChange('Notes', value)}
            multiline
            numberOfLines={4}
            placeholder="Any additional notes about this activity"
            placeholderTextColor="rgba(150,150,150,0.6)"
            textAlignVertical="top"
          />
        </View>

        {/* Buttons - in fixed position container */}
        <View style={styles.fixedButtonContainer}>
          <TouchableOpacity 
            style={[styles.customButton, styles.cancelButton]}
            onPress={() => {
              if (onCancel) onCancel();
            }}
          >
            <Text style={{fontSize: 16, fontWeight: 'bold', color: 'black'}}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.customButton, styles.submitButton, { backgroundColor: tintColor }]}
            onPress={handleSubmit}
          >
            <Text style={{fontSize: 16, fontWeight: 'bold', color: 'white'}}>
              {initialActivity ? 'Update' : 'Add Activity'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Add padding at bottom to ensure scrolling shows everything */}
        <View style={{height: 100}} />
      </ScrollView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Extra padding at bottom for buttons
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 15,
  },
  timeRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    flexWrap: 'wrap',
  },
  timeColumn: {
    width: '48%',
    minWidth: 140,
    marginBottom: 10,
  },
  webDateContainer: {
    width: '100%',
  },
  dateInputWrapper: {
    width: '100%',
  },
  inputLabel: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  dateTimeButton: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
  },
  timeButton: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    width: '100%',
    marginBottom: 5,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  suggestionContainer: {
    marginTop: 0,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    maxHeight: 150,
    backgroundColor: 'white',
    zIndex: 10,
  },
  suggestionList: {
    width: '100%',
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    fontSize: 14,
  },  
  fixedButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 30,
    marginBottom: 20,
    paddingHorizontal: 10,
    width: '100%',
  },
  customButton: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  submitButton: {
    paddingHorizontal: 30,
    minWidth: 150,
    backgroundColor: '#007AFF',
  },
  cancelButton: {
    paddingHorizontal: 30,
    minWidth: 120,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ccc',
  },
});