import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  Text,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { ExerciseDetails, getExerciseTypes } from '@/services/points-api';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { CustomPicker } from './CustomPicker';

// Interface for the component props
interface ExerciseFormProps {
  activityId: number;
  initialDetails?: ExerciseDetails;
  onSubmit: (activityId: number, details: ExerciseDetails) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

// Units for distance and weight
const DISTANCE_UNITS = ['km', 'mi'];
const WEIGHT_UNITS = ['kg', 'lb'];

const ExerciseForm: React.FC<ExerciseFormProps> = ({
  activityId,
  initialDetails,
  onSubmit,
  onCancel,
  isEditing = false
}) => {
  // Default values for new exercise details
  const defaultDetails: ExerciseDetails = {
    exercise_type: '',
    intensity: 5,
    distance: 0,
    distance_unit: 'km',
    weight: 0,
    weight_unit: 'kg',
    sets: 0,
    reps: 0,
    calories: 0,
    heart_rate: 0
  };

  // State for the form data
  const [details, setDetails] = useState<ExerciseDetails>(initialDetails || defaultDetails);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exerciseTypes, setExerciseTypes] = useState<string[]>([]);
  const [customExerciseType, setCustomExerciseType] = useState('');
  const [showCustomExerciseInput, setShowCustomExerciseInput] = useState(false);
  
  // State for tracking which metrics are enabled
  const [trackDistance, setTrackDistance] = useState(false);
  const [trackWeight, setTrackWeight] = useState(false);
  const [trackSetsReps, setTrackSetsReps] = useState(false);
  const [trackCalories, setTrackCalories] = useState(false);
  const [trackHeartRate, setTrackHeartRate] = useState(false);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const cardColor = useThemeColor({}, 'card');
  const errorColor = '#FF3B30'; // iOS red

  // Load exercise types and set initial toggle states
  useEffect(() => {
    const loadExerciseTypes = async () => {
      setLoading(true);
      try {
        const types = await getExerciseTypes();
        setExerciseTypes(types);
      } catch (error) {
        console.error('Error loading exercise types:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExerciseTypes();

    // Set toggle states based on initial data or defaults
    if (initialDetails) {
      setTrackDistance(initialDetails.distance > 0);
      setTrackWeight(initialDetails.weight > 0);
      setTrackSetsReps(initialDetails.sets > 0 || initialDetails.reps > 0);
      setTrackCalories(initialDetails.calories > 0);
      setTrackHeartRate(initialDetails.heart_rate > 0);
      
      // Check if the exercise type is custom (not in the standard list)
      if (initialDetails.exercise_type && exerciseTypes.length > 0) {
        if (!exerciseTypes.includes(initialDetails.exercise_type)) {
          setCustomExerciseType(initialDetails.exercise_type);
          setShowCustomExerciseInput(true);
        }
      }
    }
  }, [initialDetails, exerciseTypes.length]);

  // Input change handler
  const handleChange = (field: keyof ExerciseDetails, value: any) => {
    setDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle exercise type selection
  const handleExerciseTypeChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomExerciseInput(true);
      // Don't update the actual exercise_type yet, wait for custom input
    } else {
      setShowCustomExerciseInput(false);
      handleChange('exercise_type', value);
    }
  };

  // Handle custom exercise type input
  const handleCustomExerciseTypeChange = (text: string) => {
    setCustomExerciseType(text);
    handleChange('exercise_type', text);
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validate form data
    if (!details.exercise_type) {
      Alert.alert('Missing Information', 'Please select an exercise type');
      return;
    }

    setSubmitting(true);
    try {
      // Clone details and ensure correct types
      const detailsToSubmit = {
        ...details,
        intensity: Number(details.intensity),
        distance: trackDistance ? Number(details.distance) : 0,
        weight: trackWeight ? Number(details.weight) : 0,
        sets: trackSetsReps ? Number(details.sets) : 0,
        reps: trackSetsReps ? Number(details.reps) : 0,
        calories: trackCalories ? Number(details.calories) : 0,
        heart_rate: trackHeartRate ? Number(details.heart_rate) : 0
      };

      await onSubmit(activityId, detailsToSubmit);
    } catch (error) {
      console.error('Error submitting exercise details:', error);
      Alert.alert('Error', 'Failed to save exercise details. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={tintColor} />
        <ThemedText style={styles.loadingText}>Loading exercise types...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ThemedText style={styles.title}>
          {isEditing ? 'Edit Exercise Details' : 'Add Exercise Details'}
        </ThemedText>

        {/* Exercise Type */}
        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>Exercise Type*</ThemedText>
          
          {Platform.OS === 'web' ? (
            // Use a standard select for web
            <select
              style={{
                ...styles.select,
                backgroundColor: cardColor,
                color: textColor,
                borderColor: '#ccc'
              }}
              value={showCustomExerciseInput ? 'custom' : details.exercise_type}
              onChange={(e) => handleExerciseTypeChange(e.target.value)}
            >
              <option value="">Select an exercise type</option>
              {exerciseTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
              <option value="custom">Custom...</option>
            </select>
          ) : (
            // Use custom picker for native platforms
            <CustomPicker
              selectedValue={showCustomExerciseInput ? 'custom' : details.exercise_type}
              onValueChange={handleExerciseTypeChange}
              placeholder="Select an exercise type"
              items={[
                { label: "Select an exercise type", value: "" },
                ...exerciseTypes.map(type => ({ label: type, value: type })),
                { label: "Custom...", value: "custom" }
              ]}
            />
          )}

          {/* Custom exercise type input */}
          {showCustomExerciseInput && (
            <TextInput
              style={[styles.textInput, { backgroundColor: cardColor, color: textColor }]}
              placeholder="Enter custom exercise type"
              placeholderTextColor="gray"
              value={customExerciseType}
              onChangeText={handleCustomExerciseTypeChange}
            />
          )}
        </View>

        {/* Intensity Slider */}
        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>
            Intensity Level ({details.intensity}/10)
          </ThemedText>
          
          {Platform.OS === 'web' ? (
            <View style={styles.sliderContainer}>
              <input
                type="range"
                min="1"
                max="10"
                value={details.intensity}
                onChange={(e) => handleChange('intensity', parseInt(e.target.value, 10))}
                style={styles.webSlider}
              />
              <View style={styles.intensityLabels}>
                <ThemedText style={styles.smallText}>Easy</ThemedText>
                <ThemedText style={styles.smallText}>Moderate</ThemedText>
                <ThemedText style={styles.smallText}>Intense</ThemedText>
              </View>
            </View>
          ) : (
            // Use a row of buttons for mobile
            <View style={styles.intensityButtonContainer}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.intensityButton,
                    { 
                      backgroundColor: details.intensity === level ? tintColor : cardColor,
                      borderColor: tintColor
                    }
                  ]}
                  onPress={() => handleChange('intensity', level)}
                >
                  <Text
                    style={{
                      color: details.intensity === level ? 'white' : textColor,
                      fontWeight: details.intensity === level ? 'bold' : 'normal'
                    }}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Distance */}
        <View style={styles.formGroup}>
          <View style={styles.toggleRow}>
            <ThemedText style={styles.label}>Distance</ThemedText>
            <Switch
              value={trackDistance}
              onValueChange={setTrackDistance}
              trackColor={{ false: '#767577', true: `${tintColor}80` }}
              thumbColor={trackDistance ? tintColor : '#f4f3f4'}
            />
          </View>
          
          {trackDistance && (
            <View style={styles.metricRow}>
              <TextInput
                style={[
                  styles.textInput, 
                  styles.numberInput,
                  { backgroundColor: cardColor, color: textColor }
                ]}
                placeholder="0.0"
                placeholderTextColor="gray"
                keyboardType="numeric"
                value={details.distance?.toString()}
                onChangeText={(text) => {
                  // Allow only numbers and decimals
                  const filtered = text.replace(/[^0-9.]/g, '');
                  handleChange('distance', filtered);
                }}
              />
              
              <View style={[styles.unitSelector, { backgroundColor: cardColor }]}>
                {Platform.OS === 'web' ? (
                  <select
                    style={{
                      ...styles.unitSelect,
                      backgroundColor: cardColor,
                      color: textColor
                    }}
                    value={details.distance_unit}
                    onChange={(e) => handleChange('distance_unit', e.target.value)}
                  >
                    {DISTANCE_UNITS.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                ) : (
                  <CustomPicker
                    selectedValue={details.distance_unit || 'km'}
                    onValueChange={(value) => handleChange('distance_unit', value)}
                    items={DISTANCE_UNITS.map(unit => ({ label: unit, value: unit }))}
                  />
                )}
              </View>
            </View>
          )}
        </View>

        {/* Weight Training Section */}
        <View style={styles.formGroup}>
          <View style={styles.toggleRow}>
            <ThemedText style={styles.label}>Weight Training</ThemedText>
            <Switch
              value={trackWeight}
              onValueChange={(value) => {
                setTrackWeight(value);
                if (value) {
                  setTrackSetsReps(true);
                }
              }}
              trackColor={{ false: '#767577', true: `${tintColor}80` }}
              thumbColor={trackWeight ? tintColor : '#f4f3f4'}
            />
          </View>
          
          {trackWeight && (
            <>
              <View style={styles.metricRow}>
                <ThemedText style={styles.labelSmall}>Weight:</ThemedText>
                <TextInput
                  style={[
                    styles.textInput, 
                    styles.numberInput,
                    { backgroundColor: cardColor, color: textColor }
                  ]}
                  placeholder="0"
                  placeholderTextColor="gray"
                  keyboardType="numeric"
                  value={details.weight?.toString()}
                  onChangeText={(text) => {
                    const filtered = text.replace(/[^0-9.]/g, '');
                    handleChange('weight', filtered);
                  }}
                />
                
                <View style={[styles.unitSelector, { backgroundColor: cardColor }]}>
                  {Platform.OS === 'web' ? (
                    <select
                      style={{
                        ...styles.unitSelect,
                        backgroundColor: cardColor,
                        color: textColor
                      }}
                      value={details.weight_unit}
                      onChange={(e) => handleChange('weight_unit', e.target.value)}
                    >
                      {WEIGHT_UNITS.map((unit) => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  ) : (
                    <CustomPicker
                      selectedValue={details.weight_unit || 'kg'}
                      onValueChange={(value) => handleChange('weight_unit', value)}
                      items={WEIGHT_UNITS.map(unit => ({ label: unit, value: unit }))}
                    />
                  )}
                </View>
              </View>
              
              <View style={styles.metricRow}>
                <View style={styles.halfInput}>
                  <ThemedText style={styles.labelSmall}>Sets:</ThemedText>
                  <TextInput
                    style={[
                      styles.textInput, 
                      { backgroundColor: cardColor, color: textColor }
                    ]}
                    placeholder="0"
                    placeholderTextColor="gray"
                    keyboardType="numeric"
                    value={details.sets?.toString()}
                    onChangeText={(text) => {
                      const filtered = text.replace(/[^0-9]/g, '');
                      handleChange('sets', filtered);
                    }}
                  />
                </View>
                
                <View style={styles.halfInput}>
                  <ThemedText style={styles.labelSmall}>Reps:</ThemedText>
                  <TextInput
                    style={[
                      styles.textInput, 
                      { backgroundColor: cardColor, color: textColor }
                    ]}
                    placeholder="0"
                    placeholderTextColor="gray"
                    keyboardType="numeric"
                    value={details.reps?.toString()}
                    onChangeText={(text) => {
                      const filtered = text.replace(/[^0-9]/g, '');
                      handleChange('reps', filtered);
                    }}
                  />
                </View>
              </View>
            </>
          )}
        </View>

        {/* Additional Metrics Section */}
        <View style={styles.formGroup}>
          <ThemedText style={styles.sectionTitle}>Additional Metrics</ThemedText>
          
          {/* Calories */}
          <View style={styles.toggleRow}>
            <ThemedText style={styles.label}>Calories Burned</ThemedText>
            <Switch
              value={trackCalories}
              onValueChange={setTrackCalories}
              trackColor={{ false: '#767577', true: `${tintColor}80` }}
              thumbColor={trackCalories ? tintColor : '#f4f3f4'}
            />
          </View>
          
          {trackCalories && (
            <View style={styles.metricRow}>
              <TextInput
                style={[
                  styles.textInput, 
                  styles.numberInput,
                  { backgroundColor: cardColor, color: textColor }
                ]}
                placeholder="0"
                placeholderTextColor="gray"
                keyboardType="numeric"
                value={details.calories?.toString()}
                onChangeText={(text) => {
                  const filtered = text.replace(/[^0-9]/g, '');
                  handleChange('calories', filtered);
                }}
              />
              <ThemedText style={styles.unitText}>kcal</ThemedText>
            </View>
          )}
          
          {/* Heart Rate */}
          <View style={styles.toggleRow}>
            <ThemedText style={styles.label}>Average Heart Rate</ThemedText>
            <Switch
              value={trackHeartRate}
              onValueChange={setTrackHeartRate}
              trackColor={{ false: '#767577', true: `${tintColor}80` }}
              thumbColor={trackHeartRate ? tintColor : '#f4f3f4'}
            />
          </View>
          
          {trackHeartRate && (
            <View style={styles.metricRow}>
              <TextInput
                style={[
                  styles.textInput, 
                  styles.numberInput,
                  { backgroundColor: cardColor, color: textColor }
                ]}
                placeholder="0"
                placeholderTextColor="gray"
                keyboardType="numeric"
                value={details.heart_rate?.toString()}
                onChangeText={(text) => {
                  const filtered = text.replace(/[^0-9]/g, '');
                  handleChange('heart_rate', filtered);
                }}
              />
              <ThemedText style={styles.unitText}>bpm</ThemedText>
            </View>
          )}
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
            disabled={submitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.submitButton, { backgroundColor: tintColor }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isEditing ? 'Update' : 'Save'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Bottom padding to ensure content is scrollable past the buttons */}
        <View style={{height: 50}} />
      </ScrollView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  labelSmall: {
    fontSize: 14,
    marginRight: 8,
    alignSelf: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  textInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    flex: 1,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 8,
  },
  picker: {
    height: 40,
    width: '100%',
  },
  select: {
    height: 40,
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sliderContainer: {
    width: '100%',
  },
  webSlider: {
    width: '100%',
    height: 40,
  },
  intensityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  intensityButtonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  intensityButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    marginBottom: 10,
    marginHorizontal: 2,
  },
  numberInput: {
    flex: 2,
  },
  unitSelector: {
    flex: 1,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  unitPicker: {
    height: 40,
    width: '100%',
  },
  unitSelect: {
    height: 40,
    width: '100%',
  },
  halfInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  unitText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    width: 50,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  smallText: {
    fontSize: 12,
  },
});

export default ExerciseForm;