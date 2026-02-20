import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share, 
  RefreshControl,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../supabase';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';

export default function DashboardScreen({ isDarkMode, navigation }) {
  // --- THEME COLORS ---
  const theme = {
    background: isDarkMode ? '#121212' : '#ffffff',
    card: isDarkMode ? '#1e1e1e' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#000000',
    subText: isDarkMode ? '#aaaaaa' : '#666666',
    border: isDarkMode ? '#333333' : '#eeeeee',
    inputBg: isDarkMode ? '#2c2c2c' : '#f9f9f9',
    inputText: isDarkMode ? '#ffffff' : '#000000',
    headerBg: isDarkMode ? '#1e1e1e' : '#bbd2f0',
  };

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // Editable fields
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [contactDetails, setContactDetails] = useState('');
  const [services, setServices] = useState({});
  
  // Location, Currency, and Hours States
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [currency, setCurrency] = useState('NGN');
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('18:00');

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
    fetchProfile();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const onShare = async () => {
    try {
      await Share.share({
        message: `Check out ${name} on the Laundry App! Get your clothes cleaned at ${address}.`,
      });
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleGetLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access to help customers find your shop.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
      Alert.alert('Success', 'GPS coordinates pinned!');
    } catch (err) {
      Alert.alert('Error', 'Could not get your current location.');
    }
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');
      
      const { data, error } = await supabase.from('laundries').select('*').eq('owner_id', user.id).maybeSingle();
      if (error) throw error;
      if (data) {
        setProfile(data);
        setName(data.name || '');
        setAddress(data.address || '');
        setDescription(data.description || '');
        setContactDetails(data.contact_details || '');
        setServices(data.services || {});
        setLatitude(data.latitude || null);
        setLongitude(data.longitude || null);
        setCurrency(data.currency_code || 'NGN');
        setOpenTime(data.open_time || '08:00');
        setCloseTime(data.close_time || '18:00');
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveChanges = async () => {
    if (currency.length !== 3) {
        return Alert.alert('Invalid Currency', 'Please enter a valid 3-letter currency code (e.g., USD, NGN)');
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');
      const { error } = await supabase.from('laundries').update({
        name, address, description, contact_details: contactDetails,
        services, latitude, longitude, currency_code: currency.toUpperCase(),
        open_time: openTime,
        close_time: closeTime, updated_at: new Date().toISOString(),
      }).eq('owner_id', user.id);
      if (error) throw error;
      Alert.alert('Success', 'Profile updated!');
      setEditing(false);
      fetchProfile();
    } catch (err) {
      Alert.alert('Save Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    fetchProfile();
  };

  const deleteAccount = async () => {
    Alert.alert('Delete Account', 'This is irreversible. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete Forever', style: 'destructive', onPress: async () => {
          try {
            const { error } = await supabase.rpc('delete_my_account');
            if (error) throw error;
            await supabase.auth.signOut();
          } catch (err) { 
            Alert.alert('Error', err.message); 
          }
      }},
    ]);
  };

  // Show loading indicator while fetching initial data
  if (loading && !profile) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#bbd2f0" />
          <Text style={{ marginTop: 10, color: theme.text }}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView 
        style={styles.container} 
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchProfile} colors={['#bbd2f0']} />}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={Platform.OS === 'ios' ? { paddingBottom: 20 } : {}}
      >
        <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
          {editing ? (
            <TextInput 
              style={[styles.headerInput, { backgroundColor: theme.inputBg, color: theme.inputText }]} 
              value={name} 
              onChangeText={setName} 
              placeholder="Laundry Name" 
              placeholderTextColor={theme.subText}
            />
          ) : (
            <Text style={[styles.headerTitle, { color: theme.text }]}>{profile?.name || 'Your Laundry'}</Text>
          )}
          
          <View style={styles.ratingRow}>
            <Text style={styles.star}>★</Text>
            <Text style={[styles.rating, { color: theme.text }]}>{profile?.rating ?? 'No ratings yet'}</Text>
          </View>

          {!editing && (
            <TouchableOpacity style={[styles.shareBtn, { backgroundColor: theme.card }]} onPress={onShare}>
              <Text style={styles.shareText}>📤 Share Laundry Link</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => navigation.navigate('Orders')}>
            <Text style={styles.actionIcon}>🧺</Text>
            <Text style={[styles.actionLabel, { color: theme.text }]}>Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => navigation.navigate('Payments')}>
            <Text style={styles.actionIcon}>💰</Text>
            <Text style={[styles.actionLabel, { color: theme.text }]}>Earnings</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.sectionHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.label, { color: theme.text }]}>Business Settings</Text>
          </View>
          
          <View style={styles.settingsGrid}>
            <View style={styles.settingsItem}>
              <Text style={[styles.subLabel, { color: theme.subText }]}>Currency</Text>
              {editing ? (
                <TextInput 
                    style={[styles.smallInput, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.border }]} 
                    value={currency} 
                    onChangeText={setCurrency} 
                    maxLength={3} 
                    autoCapitalize="characters"
                />
              ) : (
                <Text style={[styles.value, { color: theme.text }]}>{currency}</Text>
              )}
            </View>

            <View style={styles.settingsItem}>
              <Text style={[styles.subLabel, { color: theme.subText }]}>Open</Text>
              {editing ? (
                <TextInput style={[styles.smallInput, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.border }]} value={openTime} onChangeText={setOpenTime} />
              ) : (
                <Text style={[styles.value, { color: theme.text }]}>{openTime}</Text>
              )}
            </View>

            <View style={styles.settingsItem}>
              <Text style={[styles.subLabel, { color: theme.subText }]}>Close</Text>
              {editing ? (
                <TextInput style={[styles.smallInput, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.border }]} value={closeTime} onChangeText={setCloseTime} />
              ) : (
                <Text style={[styles.value, { color: theme.text }]}>{closeTime}</Text>
              )}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.fieldRow}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[styles.label, { color: theme.text }]}>Address</Text>
              {editing && (
                <TouchableOpacity onPress={handleGetLocation}>
                  <Text style={styles.locationPinBtn}>📍 {latitude ? 'Pinned' : 'Pin GPS'}</Text>
                </TouchableOpacity>
              )}
            </View>
            {editing ? (
              <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.border }]} value={address} onChangeText={setAddress} />
            ) : (
              <Text style={[styles.value, { color: theme.text }]}>{profile?.address || 'No address set'}</Text>
            )}
            {!editing && latitude && <Text style={styles.gpsIndicator}>✓ Location Linked!</Text>}
          </View>

          <View style={styles.fieldRow}>
            <Text style={[styles.label, { color: theme.text }]}>Description</Text>
            {editing ? (
              <TextInput style={[styles.input, styles.textArea, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.border }]} value={description} onChangeText={setDescription} multiline />
            ) : (
              <Text style={[styles.value, { color: theme.text }]}>{profile?.description || 'No description'}</Text>
            )}
          </View>

          <View style={styles.fieldRow}>
            <Text style={[styles.label, { color: theme.text }]}>Contact Details</Text>
            {editing ? (
              <TextInput style={[styles.input, styles.textArea, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.border }]} value={contactDetails} onChangeText={setContactDetails} multiline />
            ) : (
              <Text style={[styles.value, { color: theme.text }]}>{profile?.contact_details || 'No contact info'}</Text>
            )}
          </View>

          <View style={styles.fieldRow}>
            <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                <Text style={[styles.label, { color: theme.text }]}>Services Offered</Text>
                <TouchableOpacity onPress={() => navigation.navigate('ServicesEdit')}>
                    <Text style={styles.editLink}>Edit Services</Text>
                </TouchableOpacity>
            </View>
            {Object.keys(services).length > 0 ? (
                Object.keys(services).map((groupName) => (
                <View key={groupName} style={styles.groupSection}>
                    <Text style={[styles.groupTitle, { color: theme.subText }]}>{groupName}</Text>
                    {services[groupName].map((s, i) => (
                    <Text key={i} style={[styles.serviceItem, { color: theme.text }]}>• {s.name}: {formatCurrency(s.price)}</Text>
                    ))}
                </View>
                ))
            ) : (
                <Text style={styles.noData}>No services added yet</Text>
            )}
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.editButton, loading && styles.buttonDisabled]}
              onPress={editing ? saveChanges : () => setEditing(true)}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{editing ? 'Save Changes' : 'Edit Profile'}</Text>
            </TouchableOpacity>

            {editing ? (
              <TouchableOpacity style={[styles.deleteButton, { backgroundColor: '#888' }]} onPress={handleCancel}>
                <Text style={styles.deleteText}>Cancel</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.deleteButton} onPress={deleteAccount}>
                <Text style={styles.deleteText}>Delete Account</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  header: { padding: 20, alignItems: 'center' },
  headerTitle: { fontSize: 26, fontWeight: 'bold' },
  headerInput: { fontSize: 24, fontWeight: 'bold', borderWidth: 1, borderRadius: 12, padding: 8, width: '90%', textAlign: 'center' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  star: { fontSize: 20, color: '#FFD700', marginRight: 4 },
  rating: { fontSize: 18, fontWeight: '600' },
  shareBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 12, borderWidth: 1, borderColor: '#007AFF' },
  shareText: { color: '#007AFF', fontWeight: 'bold', fontSize: 14 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, marginTop: 16 },
  actionCard: { width: '45%', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  actionIcon: { fontSize: 24, marginBottom: 4 },
  actionLabel: { fontWeight: '600' },
  card: { borderRadius: 16, padding: 20, margin: 16, borderWidth: 1 },
  sectionHeader: { marginBottom: 10, borderBottomWidth: 1, paddingBottom: 5 },
  settingsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  settingsItem: { flex: 1, alignItems: 'center' },
  subLabel: { fontSize: 12, marginBottom: 4, fontWeight: '600' },
  smallInput: { borderWidth: 1, borderRadius: 8, padding: 8, width: '80%', textAlign: 'center' },
  divider: { height: 1, marginVertical: 15 },
  fieldRow: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  value: { fontSize: 16 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 },
  textArea: { height: 70, textAlignVertical: 'top' },
  locationPinBtn: { color: '#007AFF', fontWeight: 'bold' },
  gpsIndicator: { fontSize: 12, color: '#34C759', marginTop: 4, fontWeight: '600' },
  editLink: { color: '#007AFF', fontWeight: '600' },
  groupSection: { marginTop: 10 },
  groupTitle: { fontSize: 15, fontWeight: '700' },
  serviceItem: { fontSize: 14, marginLeft: 10, marginTop: 2 },
  noData: { fontStyle: 'italic', color: '#888' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  editButton: { backgroundColor: '#bbd2f0', padding: 14, borderRadius: 12, flex: 1, marginRight: 10, alignItems: 'center' },
  deleteButton: { backgroundColor: '#ff4444', padding: 14, borderRadius: 12, flex: 1, alignItems: 'center' },
  buttonText: { fontWeight: '700', color: '#000' },
  deleteText: { color: '#fff', fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 }
});