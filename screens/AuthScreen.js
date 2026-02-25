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
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import * as Linking from 'expo-linking';

export default function AuthScreen({ navigation }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mode, setMode] = useState('login'); 
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false); // New state for T&C

  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Load theme preference on mount
  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await AsyncStorage.getItem('isDarkMode');
      if (savedTheme !== null) setIsDarkMode(JSON.parse(savedTheme));
    };
    loadTheme();
  }, []);

  // Handle deep link for password reset
  useEffect(() => {
    const handleDeepLink = (event) => {
      const url = event.url;
      if (url && url.includes('reset-password')) {
        navigation.navigate('ResetPassword');
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url && url.includes('reset-password')) {
        navigation.navigate('ResetPassword');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [navigation]);

  const theme = {
    background: isDarkMode ? '#121212' : '#fff',
    text: isDarkMode ? '#fff' : '#000',
    subText: isDarkMode ? '#aaa' : '#555',
    inputBg: isDarkMode ? '#1e1e1e' : '#f9f9f9',
    inputBorder: isDarkMode ? '#333' : '#ddd',
    tabBg: isDarkMode ? '#1e1e1e' : '#f5f5f5',
    activeTab: isDarkMode ? '#2c3e50' : '#bbd2f0',
    placeholder: isDarkMode ? '#666' : '#999',
    modalBg: isDarkMode ? '#1e1e1e' : '#fff',
  };

  const handleAuth = async () => {
    if (mode === 'signup' && !agreed) {
      Alert.alert('Terms & Conditions', 'Please agree to the Terms and Conditions to continue.');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (mode === 'login') {
        const { data: laundryData, error: lookupError } = await supabase
          .from('laundries')
          .select('email')
          .eq('name', username.trim())
          .single();

        if (lookupError || !laundryData?.email) {
          result = await supabase.auth.signInWithPassword({
            email: `${username.trim()}@laundrify.com`,
            password: password.trim(),
          });
        } else {
          result = await supabase.auth.signInWithPassword({
            email: laundryData.email,
            password: password.trim(),
          });
        }
      } else {
        if (!email.includes('@')) {
          Alert.alert('Error', 'Please enter a valid email address');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          Alert.alert('Error', 'Passwords do not match');
          setLoading(false);
          return;
        }

        result = await supabase.auth.signUp({
          email: email.trim(), 
          password: password.trim(),
          options: {
            data: { 
              username: username.trim(),
              display_email: email.trim() 
            },
          },
        });
      }
      
      const { data, error } = result;
      if (error) {
        Alert.alert(mode === 'login' ? 'Login Failed' : 'Sign Up Failed', error.message);
        throw error;
      }

      if (mode === 'signup' && data.user) {
        const { error: insertError } = await supabase
          .from('laundries')
          .insert({
            owner_id: data.user.id,
            name: username.trim(),
            email: email.trim(), 
            address: '',
            description: '',
            contact_details: '',
            services: [],
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('Failed to create laundry profile:', insertError);
          Alert.alert('Account Created', 'Profile setup incomplete — please complete it in Dashboard.');
        }
      }

      Alert.alert('Success', mode === 'login' ? 'Logged in successfully!' : 'Account created! Welcome. Please add a valid NIN and email support to get verified');
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Error', 'Please enter your registered email address');
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: 'laundrify-drycleaners://reset-password',
      });
      if (error) throw error;
      Alert.alert('Reset Link Sent', 'Check your email for the password reset link.');
      setForgotModalVisible(false);
      setResetEmail('');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.appName, { color: theme.text }]}>Laundrify DryCleaners</Text>

        <View style={[styles.tabContainer, { backgroundColor: theme.tabBg }]}>
          <TouchableOpacity
            style={[styles.tab, mode === 'login' && { backgroundColor: theme.activeTab }]}
            onPress={() => setMode('login')}
          >
            <Text style={[styles.tabText, { color: theme.subText }, mode === 'login' && { color: theme.text }]}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'signup' && { backgroundColor: theme.activeTab }]}
            onPress={() => setMode('signup')}
          >
            <Text style={[styles.tabText, { color: theme.subText }, mode === 'signup' && { color: theme.text }]}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, { color: theme.text }]}>Username</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
            placeholder="Enter your username"
            placeholderTextColor={theme.placeholder}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {mode === 'signup' && (
            <>
              <Text style={[styles.label, { color: theme.text }]}>Email Address (For password recovery)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                placeholder="Enter your real email"
                placeholderTextColor={theme.placeholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </>
          )}

          <Text style={[styles.label, { color: theme.text }]}>Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
            placeholder="Enter your password"
            placeholderTextColor={theme.placeholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          {mode === 'signup' && (
            <>
              <Text style={[styles.label, { color: theme.text }]}>Confirm Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                placeholder="Confirm your password"
                placeholderTextColor={theme.placeholder}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
              />

              {/* T&C Tick Box Section */}
              <View style={styles.checkboxContainer}>
                <TouchableOpacity 
                  style={[styles.checkbox, { borderColor: theme.activeTab }, agreed && { backgroundColor: theme.activeTab }]} 
                  onPress={() => setAgreed(!agreed)}
                >
                  {agreed && <Text style={styles.checkIcon}>✓</Text>}
                </TouchableOpacity>
                <Text style={[styles.checkboxText, { color: theme.text }]}>
                  By signing up, you agree to our{' '}
                  <Text style={{ color: theme.activeTab }} onPress={() => Linking.openURL('http://laundrify.com.ng/terms-of-service')}>ToS</Text>
                  {' '}and{' '}
                  <Text style={{ color: theme.activeTab }} onPress={() => Linking.openURL('http://laundrify.com.ng/privacy-policy')}>Privacy Policy</Text>
                </Text>
              </View>
            </>
          )}

          <TouchableOpacity
            style={[
              styles.button, 
              { backgroundColor: theme.activeTab }, 
              (loading || (mode === 'signup' && !agreed)) && styles.buttonDisabled
            ]}
            onPress={handleAuth}
            disabled={loading || (mode === 'signup' && !agreed)}
          >
            <Text style={[styles.buttonText, { color: theme.text }]}>
              {loading ? 'Processing...' : mode === 'login' ? 'Login' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

          {mode === 'login' && (
            <TouchableOpacity onPress={() => setForgotModalVisible(true)} style={styles.forgotLink}>
              <Text style={[styles.forgotText, { color: theme.activeTab }]}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'signup' : 'login')} style={styles.switchLink}>
            <Text style={[styles.switchText, { color: theme.text }]}>
              {mode === 'login' ? "New user? Sign Up here" : 'Already have an account? Login'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Forgot Password Modal */}
      <Modal animationType="fade" transparent={true} visible={forgotModalVisible}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.modalBg }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Reset Password</Text>
            <Text style={[styles.modalText, { color: theme.subText }]}>Enter your registered email address.</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              placeholder="Your Email"
              placeholderTextColor={theme.placeholder}
              value={resetEmail}
              onChangeText={setResetEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.activeTab }]} onPress={handleForgotPassword}>
              <Text style={[styles.modalButtonText, { color: theme.text }]}>
                {resetLoading ? 'Sending...' : 'Send Reset Link'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setForgotModalVisible(false)} style={styles.modalCancel}>
              <Text style={[styles.modalCancelText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  appName: { fontSize: 36, fontWeight: 'bold', textAlign: 'center', marginBottom: 48 },
  tabContainer: { flexDirection: 'row', borderRadius: 12, overflow: 'hidden', marginBottom: 32 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { fontSize: 18, fontWeight: '600' },
  form: { width: '100%' },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 20 },
  button: { borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 16 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontSize: 18, fontWeight: '600' },
  switchLink: { marginTop: 24, alignItems: 'center' },
  switchText: { fontSize: 16 },
  forgotLink: { marginTop: 16, alignItems: 'flex-end' },
  forgotText: { fontSize: 16, fontWeight: '500' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 5, marginBottom: 15, paddingRight: 20 },
  checkbox: { width: 22, height: 22, borderWidth: 2, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  checkIcon: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  checkboxText: { fontSize: 14, flexShrink: 1, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { borderRadius: 16, padding: 24, width: '90%', maxWidth: 400 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  modalText: { fontSize: 16, textAlign: 'center', marginBottom: 24 },
  modalInput: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 20 },
  modalButton: { borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  modalButtonText: { fontSize: 16, fontWeight: '600' },
  modalCancel: { alignItems: 'center' },
  modalCancelText: { fontSize: 16 },
});