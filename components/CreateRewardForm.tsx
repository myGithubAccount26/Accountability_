import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { purchaseReward } from '@/services/points-api';

interface CreateRewardFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreateRewardForm({ onSuccess, onCancel }: CreateRewardFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pointsCost, setPointsCost] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const colorScheme = useColorScheme();

  const handleSubmit = async () => {
    // Validate inputs
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a reward name');
      return;
    }

    const cost = parseInt(pointsCost);
    if (isNaN(cost) || cost <= 0) {
      Alert.alert('Error', 'Please enter a valid positive number for points');
      return;
    }

    setSubmitting(true);
    try {
      // Create the reward in the system
      const result = await purchaseReward(name, -cost, description); // Negative cost creates a reward without spending points
      
      if (result.success) {
        Alert.alert('Success', 'Reward created successfully!');
        if (onSuccess) onSuccess();
      } else {
        Alert.alert('Error', result.message || 'Failed to create reward');
      }
    } catch (error) {
      console.error('Error creating reward:', error);
      Alert.alert('Error', 'An error occurred while creating the reward');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Create Custom Reward</ThemedText>
      
      <View style={styles.formGroup}>
        <ThemedText style={styles.label}>Reward Name</ThemedText>
        <TextInput
          style={[styles.input, { color: Colors[colorScheme].text }]}
          value={name}
          onChangeText={setName}
          placeholder="e.g., Movie Night"
          placeholderTextColor={Colors[colorScheme].text + '80'}
        />
      </View>

      <View style={styles.formGroup}>
        <ThemedText style={styles.label}>Description (Optional)</ThemedText>
        <TextInput
          style={[styles.input, styles.multilineInput, { color: Colors[colorScheme].text }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your reward"
          placeholderTextColor={Colors[colorScheme].text + '80'}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.formGroup}>
        <ThemedText style={styles.label}>Points Cost</ThemedText>
        <TextInput
          style={[styles.input, { color: Colors[colorScheme].text }]}
          value={pointsCost}
          onChangeText={setPointsCost}
          placeholder="100"
          placeholderTextColor={Colors[colorScheme].text + '80'}
          keyboardType="number-pad"
        />
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity 
          style={[styles.button, styles.cancelButton]} 
          onPress={onCancel}
          disabled={submitting}
        >
          <ThemedText style={styles.buttonText}>Cancel</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.submitButton]} 
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <ThemedText style={styles.submitButtonText}>Create Reward</ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  submitButton: {
    backgroundColor: Colors.light.tint,
    marginLeft: 8,
  },
  buttonText: {
    fontSize: 16,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});