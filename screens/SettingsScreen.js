import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  ScrollView,
  Switch,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system';
import * as Device from 'expo-device';
import * as MailComposer from 'expo-mail-composer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';

export default function SettingsScreen({ isDarkMode, setIsDarkMode }) {
  const [loading, setLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const theme = {
    background: isDarkMode ? '#121212' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#000000',
    subText: isDarkMode ? '#aaaaaa' : '#8e8e93',
    card: isDarkMode ? '#1e1e1e' : '#f9f9f9',
    border: isDarkMode ? '#333333' : '#eeeeee'
  };

  useEffect(() => {
    const checkNotificationStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('laundries')
          .select('expo_push_token')
          .eq('owner_id', user.id)
          .single();
        
        if (data && data.expo_push_token) {
          setNotificationsEnabled(true);
        } else {
          setNotificationsEnabled(false);
        }
      }
    };
    checkNotificationStatus();
  }, []);

  const handleThemeToggle = async (value) => {
    setIsDarkMode(value);
    try {
      await AsyncStorage.setItem('isDarkMode', JSON.stringify(value));
    } catch (e) {
      console.error("Error saving theme", e);
    }
  };

  const handleClearCache = async () => {
    try {
      setLoading(true);
      const cacheDir = FileSystem.cacheDirectory;
      if (cacheDir) {
        const files = await FileSystem.readDirectoryAsync(cacheDir);
        for (const file of files) {
          // Use a try-catch per file to prevent one "busy" file from stopping the whole process
          try {
            await FileSystem.deleteAsync(cacheDir + file, { idempotent: true });
          } catch (fileErr) {
            console.log(`Could not delete ${file}`);
          }
        }
      }
      Alert.alert("Success", "App cache cleared!");
    } catch (e) {
      Alert.alert("Error", "Could not access cache directory.");
    } finally {
      setLoading(false);
    }
  };

  const toggleNotifications = async (value) => {
    setNotificationsEnabled(value);
    
    if (value) {
      if (!Device.isDevice) {
        Alert.alert("Simulator", "Push notifications require a physical device.");
        setNotificationsEnabled(false);
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert("Permission Denied", "Please enable notifications in system settings.");
        setNotificationsEnabled(false);
        return;
      }

      // If granted, get token and update the column in 'laundries' table
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          await supabase
            .from('laundries')
            .update({ expo_push_token: tokenData.data })
            .eq('owner_id', user.id);
        }
      } catch (err) {
        console.error("Token sync error:", err);
      }
    } else {
      // Logic for disabling: remove token from the laundries column
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('laundries')
          .update({ expo_push_token: null })
          .eq('owner_id', user.id);
      }
    }
  };

  const handleReportBug = async () => {
    const isAvailable = await MailComposer.isAvailableAsync();
    if (isAvailable) {
      await MailComposer.composeAsync({
        recipients: ['unangtech-s@execs.com'],
        subject: `Bug Report - ${Platform.OS}`,
        body: `\n\n--- Device Info ---\nOS: ${Platform.OS} ${Platform.Version}\nModel: ${Device.modelName}`,
      });
    } else {
      Alert.alert("Support", "Please email: unangtech-s@execs.com");
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: async () => {
          setLoading(true);
          await supabase.auth.signOut();
      }}
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
            <Text style={[styles.settingText, { color: theme.text }]}>Dark Mode</Text>
            <Switch 
              value={isDarkMode} 
              onValueChange={handleThemeToggle}
              trackColor={{ false: "#767577", true: "#bbd2f0" }}
              thumbColor={isDarkMode ? "#ffffff" : "#f4f3f4"}
            />
          </View>

          <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
            <Text style={[styles.settingText, { color: theme.text }]}>Enable Notifications</Text>
            <Switch 
              value={notificationsEnabled} 
              onValueChange={toggleNotifications}
              trackColor={{ false: "#767577", true: "#bbd2f0" }}
              thumbColor={notificationsEnabled ? "#ffffff" : "#f4f3f4"}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System</Text>
          
          <TouchableOpacity 
            style={[styles.actionItem, { borderBottomColor: theme.border }]} 
            onPress={handleClearCache}
          >
            <Text style={[styles.settingText, { color: theme.text }]}>Clear App Cache</Text>
            <Text style={[styles.subText, { color: theme.subText }]}>Free up space used by images/temp data</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={handleReportBug}>
            <Text style={[styles.settingText, { color: theme.text }]}>Report a Bug</Text>
            <Text style={[styles.subText, { color: theme.subText }]}>Check your spam folder if you don't see our reply in your inbox.</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#FF3B30" /> : <Text style={styles.logoutText}>Logout</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 20 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#8e8e93', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 },
  settingItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  actionItem: {
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  settingText: { fontSize: 16, fontWeight: '500' },
  subText: { fontSize: 12, marginTop: 4 },
  footer: { marginTop: 'auto', paddingBottom: 20 },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#FF3B30',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
  },
  logoutText: { color: '#FF3B30', fontSize: 16, fontWeight: 'bold' },
});