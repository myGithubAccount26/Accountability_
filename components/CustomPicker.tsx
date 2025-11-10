import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  Text
} from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';

interface PickerItem {
  label: string;
  value: string;
}

interface CustomPickerProps {
  selectedValue: string;
  onValueChange: (value: string) => void;
  items: PickerItem[];
  placeholder?: string;
}

export const CustomPicker = ({
  selectedValue = '',
  onValueChange = () => {},
  items = [],
  placeholder = 'Select an item...'
}: CustomPickerProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const cardColor = useThemeColor({}, 'card');
  
  // Find the selected item's label
  const selectedItem = Array.isArray(items) ? items.find(item => item.value === selectedValue) : undefined;
  const displayText = selectedItem ? selectedItem.label : placeholder;
  
  return (
    <View>
      <TouchableOpacity
        style={[styles.pickerButton, { backgroundColor: cardColor }]}
        onPress={() => setModalVisible(true)}
      >
        <ThemedText style={selectedItem ? styles.selectedText : styles.placeholderText}>
          {displayText}
        </ThemedText>
      </TouchableOpacity>
      
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select an Option</ThemedText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={[styles.closeButton, { color: tintColor }]}>Close</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={Array.isArray(items) ? items : []}
              keyExtractor={(item) => item.value || String(Math.random())}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.item,
                    item.value === selectedValue && { backgroundColor: `${tintColor}20` }
                  ]}
                  onPress={() => {
                    onValueChange(item.value);
                    setModalVisible(false);
                  }}
                >
                  <ThemedText style={styles.itemText}>{item.label}</ThemedText>
                  {item.value === selectedValue && (
                    <Text style={[styles.checkmark, { color: tintColor }]}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  pickerButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    height: 46,
    justifyContent: 'center',
  },
  selectedText: {
    fontSize: 16,
  },
  placeholderText: {
    fontSize: 16,
    color: '#888',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '70%',
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
  closeButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemText: {
    fontSize: 16,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: 'bold',
  }
});