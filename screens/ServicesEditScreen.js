import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../supabase';

export default function ServicesEditScreen({ navigation, isDarkMode }) {
  // --- THEME COLORS ---
  const theme = {
    background: isDarkMode ? '#121212' : '#ffffff',
    card: isDarkMode ? '#1e1e1e' : '#f9f9f9',
    headerBg: isDarkMode ? '#121212' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#000000',
    subText: isDarkMode ? '#aaaaaa' : '#333333',
    border: isDarkMode ? '#333333' : '#eeeeee',
    inputBg: isDarkMode ? '#2c2c2c' : '#ffffff',
    inputBorder: isDarkMode ? '#444444' : '#ccc',
    placeholder: isDarkMode ? '#666666' : '#999999',
    secondaryBtn: isDarkMode ? '#2c2c2c' : '#f0f0f0',
  };

  const [services, setServices] = useState({});
  const [currency, setCurrency] = useState('NGN'); 
  const [newGroupName, setNewGroupName] = useState('');
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [loading, setLoading] = useState(false);

  // HELPER: Dynamic Currency Formatter
  const formatCurrency = (amount) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase() || 'NGN',
      }).format(amount);
    } catch (e) {
      return `${currency.toUpperCase()} ${amount}`;
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const { data, error } = await supabase
        .from('laundries')
        .select('services, currency_code')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setServices(data.services || { 'Wash and Fold': [], 'Ironing': [], 'Dry Clean': [] });
        setCurrency(data.currency_code || 'NGN');
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      Alert.alert('Error', 'Could not load services.');
    } finally {
      setLoading(false);
    }
  };

  const addGroup = () => {
    if (!newGroupName.trim()) return Alert.alert('Error', 'Enter a category name');
    if (services[newGroupName.trim()]) return Alert.alert('Error', 'Category already exists');
    setServices({ ...services, [newGroupName.trim()]: [] });
    setNewGroupName('');
  };

  const deleteGroup = (groupName) => {
    Alert.alert(
      "Delete Category",
      `Are you sure you want to remove "${groupName}" and all its items?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => {
            const updatedServices = { ...services };
            delete updatedServices[groupName];
            setServices(updatedServices);
          }
        }
      ]
    );
  };

  const addService = (groupName) => {
    if (!newName.trim() || !newPrice.trim()) return Alert.alert('Error', 'Enter name and price');
    const updatedGroup = [...(services[groupName] || []), { name: newName.trim(), price: parseInt(newPrice) }];
    setServices({ ...services, [groupName]: updatedGroup });
    setNewName('');
    setNewPrice('');
  };

  const deleteService = (groupName, index) => {
    const updatedGroup = services[groupName].filter((_, i) => i !== index);
    setServices({ ...services, [groupName]: updatedGroup });
  };

  const saveAllChanges = async () => {
    if (currency.length !== 3) {
      return Alert.alert('Invalid Currency', 'Please enter a valid 3-letter currency code (e.g., USD, NGN)');
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('laundries')
        .update({ 
          services, 
          currency_code: currency.toUpperCase(), 
          updated_at: new Date().toISOString() 
        })
        .eq('owner_id', user.id);

      if (error) throw error;
      Alert.alert('Success', 'Profile updated!');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholder = (group) => {
    const g = group.toLowerCase();
    if (g.includes('wash')) return 'e.g. Shirt, bags, Agbada, duvet';
    if (g.includes('iron')) return 'e.g. suit';
    if (g.includes('pickup') || g.includes('delivery')) return 'e.g. Standard Pickup';
    return 'Item name';
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.headerBg }]}>
          <Text style={[styles.title, { color: theme.text }]}>Settings & Prices</Text>
        </View>

        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
          {loading ? (
            <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
          ) : (
            <>
              {/* Flexible Currency Input */}
              <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}> Currency </Text>
                <TextInput 
                  style={[styles.input, { 
                    backgroundColor: theme.inputBg, 
                    borderColor: theme.inputBorder, 
                    color: theme.text,
                    fontSize: 18,
                    fontWeight: 'bold',
                    textAlign: 'center'
                  }]} 
                  maxLength={3}
                  autoCapitalize="characters"
                  value={currency} 
                  onChangeText={setCurrency} 
                />
                <Text style={{ color: '#007AFF', textAlign: 'center', fontSize: 12 }}>
                  Preview: {formatCurrency(1000)}
                </Text>
              </View>

              {/* Category Creation */}
              <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Add New Category</Text>
                <TextInput 
                  style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]} 
                  placeholder="e.g. Wash & Fold, Pickup/Delivery, Dry Clean, " 
                  placeholderTextColor={theme.placeholder}
                  value={newGroupName} 
                  onChangeText={setNewGroupName} 
                />
                <TouchableOpacity style={styles.addButton} onPress={addGroup}>
                  <Text style={styles.addButtonText}>+ Create Category</Text>
                </TouchableOpacity>
              </View>

              {/* Render Categories */}
              {Object.keys(services).map((groupName) => (
                <View key={groupName} style={[styles.groupCard, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                  <View style={styles.groupHeaderRow}>
                    <Text style={styles.groupTitle}>{groupName}</Text>
                    <TouchableOpacity onPress={() => deleteGroup(groupName)}>
                      <Text style={styles.deleteGroupText}>Delete Category</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {services[groupName].map((item, index) => (
                    <View key={index} style={[styles.serviceRow, { borderBottomColor: theme.border }]}>
                      <Text style={[styles.serviceText, { color: theme.text }]}>{item.name}: {formatCurrency(item.price)}</Text>
                      <TouchableOpacity onPress={() => deleteService(groupName, index)}>
                        <Text style={styles.deleteBtn}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ))}

                  <View style={styles.addServiceInline}>
                    <TextInput 
                      style={[styles.input, { flex: 2, marginBottom: 0, backgroundColor: theme.background, borderColor: theme.inputBorder, color: theme.text }]} 
                      placeholder={getPlaceholder(groupName)} 
                      placeholderTextColor={theme.placeholder}
                      value={newName} 
                      onChangeText={setNewName} 
                    />
                    <TextInput 
                      style={[styles.input, { flex: 1, marginBottom: 0, marginLeft: 8, backgroundColor: theme.background, borderColor: theme.inputBorder, color: theme.text }]} 
                      placeholder="Price" 
                      placeholderTextColor={theme.placeholder}
                      value={newPrice} 
                      onChangeText={setNewPrice} 
                      keyboardType="numeric" 
                    />
                  </View>
                  <TouchableOpacity 
                    style={[styles.addToGroupButton, { backgroundColor: theme.secondaryBtn }]} 
                    onPress={() => addService(groupName)}
                  >
                    <Text style={styles.addToGroupText}>Add to {groupName}</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={() => navigation.goBack()}
                >
                  <Text style={[styles.cancelText, { color: theme.subText }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={saveAllChanges}>
                  <Text style={styles.saveText}>Save All Changes</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold' },
  container: { flex: 1, padding: 16 },
  sectionCard: { padding: 16, borderRadius: 12, marginBottom: 20, elevation: 2, shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' },
  groupCard: { padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1 },
  groupHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  groupTitle: { fontSize: 17, fontWeight: 'bold', color: '#007AFF' },
  deleteGroupText: { color: '#FF3B30', fontSize: 12, fontWeight: '600' },
  serviceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  serviceText: { fontSize: 15 },
  deleteBtn: { color: '#ff4444', fontWeight: '600', fontSize: 13 },
  addServiceInline: { flexDirection: 'row', marginTop: 15, marginBottom: 10 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 15 },
  addButton: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8, alignItems: 'center' },
  addButtonText: { color: '#fff', fontWeight: 'bold' },
  addToGroupButton: { padding: 10, borderRadius: 8, alignItems: 'center' },
  addToGroupText: { color: '#007AFF', fontWeight: '600' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 40 },
  cancelButton: { flex: 1, padding: 15, alignItems: 'center' },
  saveButton: { flex: 2, backgroundColor: '#34C759', padding: 15, borderRadius: 12, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelText: { fontWeight: '600' },
});