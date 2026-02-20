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
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';

export default function ResetPasswordScreen({ route, navigation }) {
  const { token } = route.params || {};
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Load theme preference on mount
  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await AsyncStorage.getItem('isDarkMode');
      if (savedTheme !== null) setIsDarkMode(JSON.parse(savedTheme));
    };
    loadTheme();
  }, []);

  const theme = {
    background: isDarkMode ? '#121212' : '#fff',
    text: isDarkMode ? '#fff' : '#000',
    subText: isDarkMode ? '#aaa' : '#555',
    inputBg: isDarkMode ? '#1e1e1e' : '#f9f9f9',
    inputBorder: isDarkMode ? '#333' : '#ddd',
    buttonBg: isDarkMode ? '#2c3e50' : '#bbd2f0',
    placeholder: isDarkMode ? '#666' : '#999',
  };

  const handleReset = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in both password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });

      if (error) throw error;

      Alert.alert('Success', 'Password updated! You can now log in.', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Auth')
        }
      ]);
    } catch (error) {
      Alert.alert('Error', error.message || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: theme.text }]}>Reset Your Password</Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>
          Enter your new password below
        </Text>

        <View style={styles.form}>
          <Text style={[styles.label, { color: theme.text }]}>New Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
            placeholder="Enter new password"
            placeholderTextColor={theme.placeholder}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <Text style={[styles.label, { color: theme.text }]}>Confirm New Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
            placeholder="Confirm new password"
            placeholderTextColor={theme.placeholder}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.buttonBg }, loading && styles.buttonDisabled]}
            onPress={handleReset}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { color: theme.text }]}>
              {loading ? 'Updating...' : 'Update Password'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => navigation.navigate('Auth')} 
            style={styles.cancelLink}
          >
            <Text style={[styles.cancelText, { color: theme.subText }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 32 },
  form: { width: '100%' },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  input: { 
    borderWidth: 1, 
    borderRadius: 12, 
    padding: 16, 
    fontSize: 16, 
    marginBottom: 20 
  },
  button: { 
    borderRadius: 12, 
    padding: 18, 
    alignItems: 'center', 
    marginTop: 16 
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontSize: 18, fontWeight: '600' },
  cancelLink: { marginTop: 24, alignItems: 'center' },
  cancelText: { fontSize: 16 },
});