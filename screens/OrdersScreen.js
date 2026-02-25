import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Modal, ScrollView, ActivityIndicator, Alert, Linking, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../supabase';

// --- IMPORTS ---
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Audio } from 'expo-av'; 

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function OrdersScreen({ isDarkMode }) {
  // --- THEME COLORS ---
  const theme = {
    background: isDarkMode ? '#121212' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#000000',
    subText: isDarkMode ? '#AAAAAA' : '#999999',
    border: isDarkMode ? '#333333' : '#F0F0F0',
    card: isDarkMode ? '#1E1E1E' : '#F9F9F9',
    modal: isDarkMode ? '#1E1E1E' : '#FFFFFF',
    tabInactive: isDarkMode ? '#555555' : '#999999',
    methodBadge: isDarkMode ? '#2C2C2C' : '#E5E5E5',
    methodText: isDarkMode ? '#BBBBBB' : '#666666',
  };

  const [activeTab, setActiveTab] = useState('Ongoing'); 
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null); 
  const [laundryId, setLaundryId] = useState(null);
  const [hasNewOrder, setHasNewOrder] = useState(false);

  // HELPER: Format currency
  const formatCurrency = (amount, orderCurrency) => {
    const code = orderCurrency || 'NGN';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: code,
      }).format(amount);
    } catch (e) {
      return `${code} ${amount}`;
    }
  };

  // --- AUDIO LOGIC ---
  async function playNotificationSound() {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3' } 
      );
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) sound.unloadAsync();
      });
    } catch (error) {
      console.log("Sound play error:", error);
    }
  }

  // --- NOTIFICATION SETUP ---
  useEffect(() => {
    if (laundryId) {
      registerForPushNotificationsAsync().then(token => {
        if (token) saveTokenToDatabase(token);
      });
    }
  }, [laundryId]);

  const saveTokenToDatabase = async (token) => {
    await supabase.from('laundries').update({ expo_push_token: token }).eq('id', laundryId);
  };

  async function registerForPushNotificationsAsync() {
    let token;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus === 'granted') {
        try {
          const projectId = Constants.expoConfig?.extra?.eas?.projectId;
          const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
          token = tokenResponse.data;
        } catch (e) {}
      }
    }
    return token;
  }

  // --- DATA FETCHING ---
  const fetchOrders = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: laundry } = await supabase.from('laundries').select('id').eq('owner_id', user.id).single();

      if (laundry) {
        setLaundryId(laundry.id);
        const statusFilter = activeTab === 'Ongoing' 
          ? ['paid', 'received', 'processing'] 
          : ['ready', 'picked_up'];

        const { data, error } = await supabase
          .from('orders')
          .select('*') 
          .eq('laundry_id', laundry.id)
          .in('status', statusFilter)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

// --- FIXED REALTIME SUBSCRIPTION ---
useEffect(() => {
  if (!laundryId) return;

  const subscription = supabase
    .channel('laundry-orders')
    .on(
      'postgres_changes',
      { 
        event: 'UPDATE', // Change from INSERT to UPDATE
        schema: 'public', 
        table: 'orders', 
        filter: `laundry_id=eq.${laundryId}` 
      },
      (payload) => {
        // ONLY trigger if the new status is 'paid' and the old status wasn't 'paid'
        if (payload.new.status === 'paid' && payload.old.status !== 'paid') {
          playNotificationSound();
          if (activeTab !== 'Ongoing') setHasNewOrder(true);
          
          Alert.alert(
            "New Paid Order! 🔔", 
            `Customer ${payload.new.customer_name} has just paid for an order!`
          );
          
          if (activeTab === 'Ongoing') {
            // Update the list: if the order is already there, update it; if not, add it.
            setOrders((prev) => {
              const exists = prev.find(o => o.id === payload.new.id);
              if (exists) {
                return prev.map(o => o.id === payload.new.id ? payload.new : o);
              }
              return [payload.new, ...prev];
            });
          }
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(subscription);
}, [laundryId, activeTab]);

  const handleTabSwitch = (tabName) => {
    setActiveTab(tabName);
    if (tabName === 'Ongoing') setHasNewOrder(false);
  };

  const handleDeliveryRedirect = (service) => {
    const url = service === 'bolt' ? 'https://m.bolt.eu/' : 'https://m.uber.com/ul/';
    Linking.openURL(url).catch(() => Alert.alert("Error", `Could not open ${service} app`));
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
      if (error) throw error;
      try {
        await supabase.functions.invoke('send-order-notif', {
          body: { 
            record: { ...selectedOrder, status: newStatus }, // Pass the updated order
            type: 'customer_update' 
          }
        });
        console.log("Customer notified via Edge Function");
      } catch (pushErr) {
        console.error("Failed to trigger push notification:", pushErr);
      }
      setSelectedOrder(null);
      fetchOrders(false);
      if (newStatus === 'ready') {
        setTimeout(() => {
          Alert.alert("Delivery Options", "How will this laundry reach the customer?", [
              { text: "Own Delivery", onPress: () => handleTabSwitch('Completed') },
              { text: "Bolt/Uber", onPress: () => {
                  Alert.alert("Choose Service", "Select an app to open", [
                    { text: "Bolt", onPress: () => handleDeliveryRedirect('bolt') },
                    { text: "Uber", onPress: () => handleDeliveryRedirect('uber') },
                    { text: "Cancel", style: "cancel" }
                  ]);
                  handleTabSwitch('Completed');
                }
              },
              { text: "Customer Pick-up", onPress: () => handleTabSwitch('Completed') }
          ]);
        }, 500); 
      } else {
        Alert.alert("Success", "Status updated!");
      }
    } catch (err) { Alert.alert("Error", "Update failed"); }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={[styles.orderRow, { borderBottomColor: theme.border }]} onPress={() => setSelectedOrder(item)}>
      <View>
        <Text style={[styles.customerName, { color: theme.text }]}>{item.customer_name || 'Customer'}</Text>
        <View style={[styles.methodBadge, { backgroundColor: item.payment_method === 'offline' ? theme.methodBadge : '#D4EDDA' }]}>
          <Text style={[styles.methodText, { color: item.payment_method === 'offline' ? theme.methodText : '#155724' }]}>
            {item.payment_method === 'offline' ? 'CASH' : 'PAID ONLINE'}
          </Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.orderTime}>{new Date(item.created_at).toLocaleDateString()}</Text>
        {item.status === 'paid' && <Text style={{ color: '#007AFF', fontSize: 10, fontWeight: 'bold', marginTop: 4 }}>NEW REQUEST</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Orders</Text>
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            onPress={() => handleTabSwitch('Ongoing')} 
            style={[styles.tab, activeTab === 'Ongoing' && styles.activeTab]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.tabText, { color: activeTab === 'Ongoing' ? theme.text : theme.tabInactive }]}>Ongoing Laundries</Text>
                {hasNewOrder && <View style={styles.redBadge} />}
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => handleTabSwitch('Completed')} 
            style={[styles.tab, activeTab === 'Completed' && styles.activeTab]}
          >
            <Text style={[styles.tabText, { color: activeTab === 'Completed' ? theme.text : theme.tabInactive }]}>Completed Laundries</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>No {activeTab.toLowerCase()} orders.</Text>}
        />
      )}

      <Modal visible={!!selectedOrder} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.modal }]}>
            {selectedOrder && (
              <>
                <View style={styles.modalHeaderRow}>
                  <Text style={[styles.modalHeader, { color: theme.text }]}>Order Details</Text>
                  <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                    <Text style={styles.closeIconText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={[styles.detailCard, { backgroundColor: theme.card }]}>
                    <Text style={styles.detailLabel}>CUSTOMER NAME</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>{selectedOrder.customer_name}</Text>
                    
                    <Text style={styles.detailLabel}>PHONE NUMBER</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>{selectedOrder.customer_phone}</Text>
                    
                    <Text style={styles.detailLabel}>DELIVERY ADDRESS</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>{selectedOrder.customer_address}</Text>

                    <Text style={styles.detailLabel}>SERVICES REQUESTED</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>{selectedOrder.items_summary}</Text>
                    
                    <Text style={styles.detailLabel}>TOTAL AMOUNT</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                      {formatCurrency(selectedOrder.total_price, selectedOrder.currency_code)}
                    </Text>
                  </View>

                  {activeTab === 'Ongoing' && (
                    <View style={styles.actionSection}>
                      <Text style={[styles.actionTitle, { color: theme.text }]}>Progress Toggles</Text>
                      
                      <TouchableOpacity 
                        style={[
                          styles.statusBtn, 
                          { 
                            backgroundColor: isDarkMode ? '#2C2C2C' : '#F0F0F0',
                            opacity: selectedOrder.status === 'paid' ? 1 : 0.5 
                          }
                        ]} 
                        onPress={() => updateStatus(selectedOrder.id, 'received')}
                        disabled={selectedOrder.status !== 'paid'}
                      >
                        <Text style={[styles.btnText, { color: '#007AFF' }]}>
                          {selectedOrder.status === 'paid' ? 'Laundry Received' : '✓ Received'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[
                          styles.statusBtn, 
                          { 
                            backgroundColor: isDarkMode ? '#2C2C2C' : '#F0F0F0',
                            opacity: selectedOrder.status === 'received' ? 1 : 0.5 
                          }
                        ]} 
                        onPress={() => updateStatus(selectedOrder.id, 'processing')}
                        disabled={selectedOrder.status !== 'received'}
                      >
                        <Text style={[styles.btnText, { color: '#007AFF' }]}>
                          {['paid', 'received'].includes(selectedOrder.status) ? 'Laundry Done' : '✓ Done'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[
                          styles.statusBtn, 
                          { 
                            backgroundColor: '#007AFF',
                            opacity: selectedOrder.status === 'processing' ? 1 : 0.5 
                          }
                        ]} 
                        onPress={() => updateStatus(selectedOrder.id, 'ready')}
                        disabled={selectedOrder.status !== 'processing'}
                      >
                        <Text style={styles.btnText}>Ready for Pickup/Delivery</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 10 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 15 },
  tabContainer: { flexDirection: 'row' },
  tab: { marginRight: 25, paddingBottom: 12 },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#007AFF' },
  tabText: { fontSize: 16, fontWeight: '600' },
  redBadge: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30', marginLeft: 6, marginBottom: 10 },
  listContent: { paddingHorizontal: 20 },
  orderRow: { paddingVertical: 18, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  customerName: { fontSize: 17, fontWeight: '500' },
  methodBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, marginTop: 4, alignSelf: 'flex-start' },
  methodText: { fontSize: 10, fontWeight: 'bold' },
  orderTime: { color: '#BBB', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, height: '85%' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalHeader: { fontSize: 20, fontWeight: 'bold' },
  closeIconText: { fontSize: 22, color: '#999' },
  detailCard: { padding: 15, borderRadius: 12 },
  detailLabel: { color: '#999', fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  detailValue: { fontSize: 16, fontWeight: '500', marginBottom: 15 },
  actionSection: { marginTop: 25 },
  actionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  statusBtn: { padding: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  empty: { color: '#CCC', textAlign: 'center', marginTop: 100, fontSize: 16 }
});