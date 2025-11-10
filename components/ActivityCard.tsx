import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Icon } from '@rneui/themed';
import { Activity } from './ActivityForm';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';

type ActivityCardProps = {
  activity: Activity;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

export const ActivityCard = ({ activity, onPress, onEdit, onDelete }: ActivityCardProps) => {
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');

  // Format time display (from numeric or string)
  const formatTime = (time: number | string | undefined) => {
    if (!time) return '';
    
    try {
      if (typeof time === 'number') {
        // If time is stored as a number, format it as HH:MM
        const hours = Math.floor(time);
        const minutes = Math.round((time - hours) * 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
      
      // For string times, validate the format
      if (typeof time === 'string') {
        // Check if it's already in HH:MM format
        if (/^\d{1,2}:\d{2}$/.test(time)) {
          return time;
        }
        
        // Try to parse as a numeric value that got converted to string
        const numTime = parseFloat(time);
        if (!isNaN(numTime)) {
          const hours = Math.floor(numTime);
          const minutes = Math.round((numTime - hours) * 60);
          return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
      }
      
      // Otherwise just return the string
      return String(time);
    } catch (e) {
      console.error('Error formatting time:', e, time);
      return String(time);
    }
  };

  // Format date display
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };

  // Calculate duration in readable format
  const calculateDuration = () => {
    // Get start and end times handling both uppercase and lowercase property names
    const start = activity.Start_Time || activity.start_time;
    const end = activity.End_Time || activity.end_time;
    
    if (!start || !end) return '';
    
    try {
      let startMinutes, endMinutes;
      
      if (typeof start === 'string') {
        const parts = start.split(':');
        if (parts.length !== 2) return 'Invalid time format';
        
        const [startHours, startMins] = parts.map(n => parseInt(n));
        if (isNaN(startHours) || isNaN(startMins)) return 'Invalid time';
        
        startMinutes = startHours * 60 + startMins;
      } else {
        const startHours = Math.floor(start);
        startMinutes = startHours * 60 + Math.round((start - startHours) * 60);
      }
      
      if (typeof end === 'string') {
        const parts = end.split(':');
        if (parts.length !== 2) return 'Invalid time format';
        
        const [endHours, endMins] = parts.map(n => parseInt(n));
        if (isNaN(endHours) || isNaN(endMins)) return 'Invalid time';
        
        endMinutes = endHours * 60 + endMins;
      } else {
        const endHours = Math.floor(end);
        endMinutes = endHours * 60 + Math.round((end - endHours) * 60);
      }
      
      const durationMinutes = endMinutes - startMinutes;
      
      if (durationMinutes < 0) return 'Invalid time range';
      
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      
      if (hours === 0) {
        return `${minutes}m`;
      } else if (minutes === 0) {
        return `${hours}h`;
      } else {
        return `${hours}h ${minutes}m`;
      }
    } catch (e) {
      console.error('Error calculating duration:', e, activity);
      return 'Error';
    }
  };

  // Handle both uppercase and lowercase property names
  const categoryName = activity.Category || activity.category;
  const activityName = activity.Activity || activity.activity;
  const dateValue = activity.Date || activity.date;
  const startTime = activity.Start_Time || activity.start_time;
  const endTime = activity.End_Time || activity.end_time;
  const tagsValue = activity.Tags || activity.tags;
  const notesValue = activity.Notes || activity.notes;
  const pointsValue = activity.Points || activity.points;

  return (
    <TouchableOpacity 
      onPress={onPress}
      style={[styles.card, { borderColor }]}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.cardHeader}>
        <View style={styles.categoryContainer}>
          <ThemedText style={styles.category}>{categoryName}</ThemedText>
          {pointsValue && (
            <View style={[styles.pointsBadge, { backgroundColor: tintColor }]}>
              <ThemedText style={styles.points}>{pointsValue} pts</ThemedText>
            </View>
          )}
        </View>
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
              <Icon name="edit" type="material" size={20} color={tintColor} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
              <Icon name="delete" type="material" size={20} color="#ff6b6b" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <ThemedText type="subtitle" style={styles.activity}>{activityName}</ThemedText>
      
      <View style={styles.timeContainer}>
        <View style={styles.timeRow}>
          <Icon name="calendar-today" type="material" size={16} color={tintColor} />
          <ThemedText style={styles.time}>{formatDate(dateValue)}</ThemedText>
        </View>
        <View style={styles.timeRow}>
          <Icon name="access-time" type="material" size={16} color={tintColor} />
          <ThemedText style={styles.time}>
            {formatTime(startTime)} - {formatTime(endTime)}
            <ThemedText style={styles.time}> ({calculateDuration()})</ThemedText>
          </ThemedText>
        </View>
      </View>
      
      {tagsValue && (
        <View style={styles.tagsContainer}>
          {tagsValue.split(',').map((tag, index) => (
            <View key={index} style={[styles.tag, { backgroundColor: `${tintColor}30` }]}>
              <ThemedText style={styles.tagText}>{tag.trim()}</ThemedText>
            </View>
          ))}
        </View>
      )}
      
      {notesValue && (
        <ThemedText style={styles.notes} numberOfLines={2}>{notesValue}</ThemedText>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E1E7EB',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    shadowOpacity: 0.1,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  category: {
    fontWeight: 'bold',
    marginRight: 8,
    color: '#000000',
  },
  activity: {
    marginBottom: 8,
    color: '#000000',
  },
  pointsBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  points: {
    color: 'white', // White text on tint color background for contrast
    fontSize: 12,
    fontWeight: 'bold',
  },
  timeContainer: {
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  time: {
    marginLeft: 4,
    fontSize: 14,
    color: '#495057',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tag: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#212529',
  },
  notes: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#495057',
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 10,
  },
});