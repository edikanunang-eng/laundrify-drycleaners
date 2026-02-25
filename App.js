import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { Alert, Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import * as SplashScreen from 'expo-splash-screen';

// Screen Imports
import LoadingScreen from './screens/LoadingScreen';
import AuthScreen from './screens/AuthScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import DashboardScreen from './screens/DashboardScreen';
import ServicesEditScreen from './screens/ServicesEditScreen';
import OrdersScreen from './screens/OrdersScreen';
import AccountScreen from './screens/AccountScreen';
import PaymentScreen from './screens/PaymentScreen';
import SettingsScreen from './screens/SettingsScreen';
import AboutScreen from './screens/AboutScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const notificationListener = useRef();

  // --- RESET PASSWORD STATES (RESTORED) ---
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const theme = {
    background: isDarkMode ? '#121212' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#000000',
    header: isDarkMode ? '#1e1e1e' : '#bbd2f0',
    headerText: isDarkMode ? '#ffffff' : '#000000',
    modalCard: isDarkMode ? '#1e1e1e' : '#ffffff',
    inputBorder: isDarkMode ? '#444' : '#ddd'
  };

  useEffect(() => {
    const initializeApp = async () => {
      const timer = new Promise(resolve => setTimeout(resolve, 3000));
     
      try {
        const savedTheme = await AsyncStorage.getItem('isDarkMode');
        if (savedTheme !== null) {
          setIsDarkMode(JSON.parse(savedTheme));
        }
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
      } catch (e) {
        console.log("Initialization error:", e);
      } finally {
        await SplashScreen.hideAsync();
        await timer;
        setLoading(false);
      }
    };
    initializeApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'PASSWORD_RECOVERY') {
        setResetModalVisible(true);
      }
      setTimeout(() => setSession(session), 100);
    });

    const checkInitialUrl = async () => {
      const url = await Linking.getInitialURL();
      if (url && (url.includes('access_token') || url.includes('type=recovery'))) {
        setResetModalVisible(true);
      }
    };
    checkInitialUrl();

    const linkingSubscription = Linking.addEventListener('url', (event) => {
      if (event.url.includes('type=recovery')) setResetModalVisible(true);
    });

    // Android Notification Channel Setup
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    registerForPushNotificationsAsync();

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification Received:', notification);
    });

    return () => {
      subscription.unsubscribe();
      linkingSubscription.remove();
      if (notificationListener.current) {
       notificationListener.current?.remove(); 
  };
    };
  }, []);

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    setResetLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setResetLoading(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", "Password updated successfully!");
      setResetModalVisible(false);
      setNewPassword('');
    }
  };

  async function registerForPushNotificationsAsync() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;
    try {
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('laundries').update({ expo_push_token: token }).eq('owner_id', user.id);
      }
    } catch (e) { console.log("Token error:", e); }
  }

  // Custom Drawer Content – only changed what you asked
  function CustomDrawerContent(props) {
    return (
      <DrawerContentScrollView {...props}>
        {/* Top section – Laundrify DryCleaners + version */}
        <View style={{ padding: 20, paddingTop: 40, alignItems: 'center' }}>
          <Text style={{ 
            fontSize: 20, 
            fontWeight: 'bold', 
            color: '#007AFF',
            marginBottom: 8 
          }}>
            Laundrify DryCleaners
          </Text>
          <Text style={{ 
            fontSize: 14, 
            color: theme.text === '#ffffff' ? '#aaa' : '#666' 
          }}>
          Manage a laundry business and earn at your convinience!
          </Text>
        </View>

        {/* Top division line */}
        <View style={{ 
          height: 1, 
          backgroundColor: theme.text === '#ffffff' ? '#333' : '#ddd', 
          marginVertical: 10 
        }} />

        {/* Bottom section – all drawer items */}
        <DrawerItemList {...props} />

      </DrawerContentScrollView>
    );
  }

  function MainDrawer() {
    return (
      <Drawer.Navigator
        initialRouteName="Dashboard"
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          drawerStyle: { backgroundColor: theme.background, width: 280 },
          drawerActiveTintColor: '#007AFF',
          drawerInactiveTintColor: theme.text,
          headerStyle: { backgroundColor: theme.header },
          headerTintColor: theme.headerText,
        }}
      >
        <Drawer.Screen 
    name="Dashboard" 
    options={{ drawerLabel: '📊 Dashboard' }}
  >
    {(props) => <DashboardScreen {...props} isDarkMode={isDarkMode} />}
  </Drawer.Screen>

  <Drawer.Screen 
    name="Orders" 
    options={{ drawerLabel: '🧺 Orders' }}
  >
    {(props) => <OrdersScreen {...props} isDarkMode={isDarkMode} />}
  </Drawer.Screen>

  <Drawer.Screen 
    name="Payments" 
    options={{ drawerLabel: '💳 Payments' }}
  >
    {(props) => <PaymentScreen {...props} isDarkMode={isDarkMode} />}
  </Drawer.Screen>

  <Drawer.Screen 
    name="Account" 
    options={{ drawerLabel: '👤 Account' }}
  >
    {(props) => <AccountScreen {...props} isDarkMode={isDarkMode} />}
  </Drawer.Screen>

  <Drawer.Screen 
    name="Settings" 
    options={{ drawerLabel: '⚙ Settings' }}
  >
    {(props) => <SettingsScreen {...props} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />}
  </Drawer.Screen>

  <Drawer.Screen 
    name="About" 
    options={{ drawerLabel: 'ⓘ About' }}
  >
    {(props) => <AboutScreen {...props} isDarkMode={isDarkMode} />}
  </Drawer.Screen>
</Drawer.Navigator>
    );
  }

  if (loading) return <LoadingScreen isDarkMode={isDarkMode} />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <>
            <Stack.Screen name="Main" component={MainDrawer} />
            <Stack.Screen
              name="ServicesEdit"
              options={{
                headerShown: true,
                title: 'Edit Services',
                headerStyle: { backgroundColor: theme.header },
                headerTintColor: theme.headerText
              }}
            >
              {(props) => <ServicesEditScreen {...props} isDarkMode={isDarkMode} />}
            </Stack.Screen>
          </>
        ) : (
          <>
            <Stack.Screen name="Auth">
              {(props) => <AuthScreen {...props} isDarkMode={isDarkMode} />}
            </Stack.Screen>
            <Stack.Screen
              name="ResetPassword"
              options={{
                headerShown: true,
                title: 'Reset Password',
                headerStyle: { backgroundColor: theme.header },
                headerTintColor: theme.headerText
              }}
            >
              {(props) => <ResetPasswordScreen {...props} isDarkMode={isDarkMode} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>

      <Modal visible={resetModalVisible} transparent animationType="slide">
        <View style={appStyles.modalOverlay}>
          <View style={[appStyles.modalContent, { backgroundColor: theme.modalCard }]}>
            <Text style={[appStyles.modalTitle, { color: theme.text }]}>Set New Password</Text>
            <TextInput
              style={[appStyles.input, { color: theme.text, borderColor: theme.inputBorder }]}
              placeholder="New Password"
              placeholderTextColor={isDarkMode ? "#888" : "#666"}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TouchableOpacity style={appStyles.button} onPress={handleUpdatePassword} disabled={resetLoading}>
              <Text style={appStyles.buttonText}>{resetLoading ? "Updating..." : "Update Password"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setResetModalVisible(false)} style={{marginTop: 15}}>
              <Text style={{textAlign: 'center', color: isDarkMode ? "#aaa" : "#666"}}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </NavigationContainer>
  );
}

const appStyles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { padding: 25, borderRadius: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, padding: 15, borderRadius: 10, marginBottom: 20 },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold' }
});