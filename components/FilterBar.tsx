import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  ScrollView,
  Text,
  Modal,
  FlatList,
} from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Icon } from '@rneui/themed';

// Simple filter option type for the basic filter bar
type FilterOption = {
  label: string;
  value: string;
};

// Base FilterBar props
type FilterBarProps = {
  options: FilterOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
};

// Advanced filter properties for the home screen
export interface DateRange {
  startDate?: string;
  endDate?: string;
}

export interface ActivityFilters {
  categories?: string[];
  activities?: string[];
  tags?: string[];
  dateRange?: DateRange;
  minPoints?: number;
}

// Advanced FilterBar props
interface AdvancedFilterBarProps {
  filters: ActivityFilters;
  onApplyFilters: (filters: ActivityFilters) => void;
  availableCategories: string[];
  availableActivities: string[];
  availableTags: string[];
}

// Simple filter bar used in exercise.tsx
export const FilterBar = ({ 
  options = [],
  selectedValue = '',
  onValueChange = () => {}
}: FilterBarProps) => {
  const tintColor = useThemeColor({}, 'tint');
  
  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {Array.isArray(options) && options.map((option, index) => (
          <TouchableOpacity
            key={`filter-${index}`}
            style={[
              styles.filterButton,
              option.value === selectedValue && { backgroundColor: tintColor, borderColor: tintColor }
            ]}
            onPress={() => onValueChange(option.value)}
          >
            <Text 
              style={[
                styles.filterText,
                option.value === selectedValue && { color: 'white' }
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// Advanced filter component for the home screen
export const AdvancedFilterBar = ({
  filters = {},
  onApplyFilters,
  availableCategories = [],
  availableActivities = [],
  availableTags = []
}: AdvancedFilterBarProps) => {
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [tempFilters, setTempFilters] = useState<ActivityFilters>({...filters});
  
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  
  // Count active filters
  const activeFilterCount = 
    (filters.categories?.length || 0) + 
    (filters.activities?.length || 0) + 
    (filters.tags?.length || 0) + 
    (filters.dateRange ? 1 : 0) + 
    (filters.minPoints ? 1 : 0);
  
  // Apply filters and close modal
  const handleApplyFilters = () => {
    onApplyFilters(tempFilters);
    setShowFiltersModal(false);
  };
  
  // Clear all filters
  const handleClearFilters = () => {
    setTempFilters({});
    onApplyFilters({});
    setShowFiltersModal(false);
  };
  
  // Toggle selection in a multi-select filter
  const toggleSelection = (type: 'categories' | 'activities' | 'tags', value: string) => {
    setTempFilters(prev => {
      const current = prev[type] || [];
      const updated = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];
      
      return {
        ...prev,
        [type]: updated
      };
    });
  };
  
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.filterButtonMain}
        onPress={() => setShowFiltersModal(true)}
      >
        <Icon name="filter-list" type="material" size={20} color={tintColor} />
        <Text style={styles.filterButtonText}>Filters</Text>
        {activeFilterCount > 0 && (
          <View style={[styles.badge, { backgroundColor: tintColor }]}>
            <Text style={styles.badgeText}>{activeFilterCount}</Text>
          </View>
        )}
      </TouchableOpacity>
      
      <Modal
        visible={showFiltersModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFiltersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Filter Activities</ThemedText>
              <TouchableOpacity onPress={() => setShowFiltersModal(false)}>
                <Icon name="close" type="material" size={24} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {/* Categories Filter */}
              {availableCategories.length > 0 && (
                <View style={styles.filterSection}>
                  <ThemedText style={styles.filterSectionTitle}>Categories</ThemedText>
                  <View style={styles.chipContainer}>
                    {availableCategories.map(category => (
                      <TouchableOpacity
                        key={`cat-${category}`}
                        style={[
                          styles.chip,
                          tempFilters.categories?.includes(category) && { backgroundColor: tintColor }
                        ]}
                        onPress={() => toggleSelection('categories', category)}
                      >
                        <Text 
                          style={[
                            styles.chipText,
                            tempFilters.categories?.includes(category) && { color: 'white' }
                          ]}
                        >
                          {category}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              
              {/* Activities Filter */}
              {availableActivities.length > 0 && (
                <View style={styles.filterSection}>
                  <ThemedText style={styles.filterSectionTitle}>Activities</ThemedText>
                  <View style={styles.chipContainer}>
                    {availableActivities.map(activity => (
                      <TouchableOpacity
                        key={`act-${activity}`}
                        style={[
                          styles.chip,
                          tempFilters.activities?.includes(activity) && { backgroundColor: tintColor }
                        ]}
                        onPress={() => toggleSelection('activities', activity)}
                      >
                        <Text 
                          style={[
                            styles.chipText,
                            tempFilters.activities?.includes(activity) && { color: 'white' }
                          ]}
                        >
                          {activity}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              
              {/* Tags Filter */}
              {availableTags.length > 0 && (
                <View style={styles.filterSection}>
                  <ThemedText style={styles.filterSectionTitle}>Tags</ThemedText>
                  <View style={styles.chipContainer}>
                    {availableTags.map(tag => (
                      <TouchableOpacity
                        key={`tag-${tag}`}
                        style={[
                          styles.chip,
                          tempFilters.tags?.includes(tag) && { backgroundColor: tintColor }
                        ]}
                        onPress={() => toggleSelection('tags', tag)}
                      >
                        <Text 
                          style={[
                            styles.chipText,
                            tempFilters.tags?.includes(tag) && { color: 'white' }
                          ]}
                        >
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              
              {/* Add Date Range and Points filters here if needed */}
              
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.footerButton, styles.clearButton]}
                onPress={handleClearFilters}
              >
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.footerButton, styles.applyButton, { backgroundColor: tintColor }]}
                onPress={handleApplyFilters}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    marginHorizontal: 4,
  },
  filterButtonMain: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginHorizontal: 8,
  },
  filterButtonText: {
    fontSize: 14,
    marginLeft: 8,
  },
  filterText: {
    fontSize: 14,
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  footerButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  clearButton: {
    borderWidth: 1,
    borderColor: '#ccc',
  },
  clearButtonText: {
    fontSize: 16,
  },
  applyButton: {
    backgroundColor: '#007AFF',
  },
  applyButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
});