import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, Alert, RefreshControl, Modal, TextInput, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../supabase';

// PAYSTACK CONFIGURATION
const PAYSTACK_PUBLIC_KEY = 'pk_test_67fc651PbWWqgKDBDorh525uecKaGZD21FGSoCeR';

// Common Nigerian Bank List for Payouts (Paystack bank codes)
const NIGERIAN_BANKS = [
  { name: 'Access Bank', code: '044' },
  { name: 'Access Bank (Diamond)', code: '063' },
  { name: 'Citibank Nigeria', code: '023' },
  { name: 'EcoBank Nigeria', code: '050' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'First City Monument Bank (FCMB)', code: '214' },
  { name: 'Globus Bank', code: '00103' },
  { name: 'GTBank', code: '058' },
  { name: 'Heritage Bank', code: '030' },
  { name: 'Jaiz Bank', code: '301' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Kuda Bank', code: '50211' },
  { name: 'Lotus Bank', code: '303' },
  { name: 'Moniepoint MFB', code: '50515' },
  { name: 'MTN Momo PSB', code: '120003' },
  { name: 'OPay', code: '999992' },
  { name: 'Optimus Bank', code: '107' },
  { name: 'PalmPay', code: '999991' },
  { name: 'Parallex Bank', code: '104' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'PremiumTrust Bank', code: '105' },
  { name: 'Providus Bank', code: '101' },
  { name: 'Rubies MFB', code: '125' },
  { name: 'Safe Haven MFB', code: '51113' },
  { name: 'Sparkle Microfinance Bank', code: '51310' },
  { name: 'Stanbic IBTC Bank', code: '221' },
  { name: 'Standard Chartered Bank', code: '068' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Suntrust Bank', code: '100' },
  { name: 'TAJ Bank', code: '302' },
  { name: 'Tangerine Money', code: '51269' },
  { name: 'Titan Bank', code: '102' },
  { name: 'Union Bank of Nigeria', code: '032' },
  { name: 'United Bank For Africa (UBA)', code: '033' },
  { name: 'Unity Bank', code: '215' },
  { name: 'VFD Microfinance Bank', code: '566' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Zenith Bank', code: '057' },
].sort((a, b) => a.name.localeCompare(b.name));

export default function PaymentScreen({ isDarkMode }) {
  // --- THEME COLORS ---
  const theme = {
    background: isDarkMode ? '#121212' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#000000',
    subText: isDarkMode ? '#aaaaaa' : '#666666',
    card: isDarkMode ? '#1e1e1e' : '#F8F9FA',
    border: isDarkMode ? '#333333' : '#eeeeee',
    noticeBg: isDarkMode ? '#2a2410' : '#FFF9E6',
    noticeText: isDarkMode ? '#ffd700' : '#666',
    editBtnBg: isDarkMode ? '#1a2b3c' : '#F0F7FF',
    primary: '#007AFF',
    inputBg: isDarkMode ? '#2c2c2e' : '#fff',
  };

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isPickingBank, setIsPickingBank] = useState(false); 
  const [searchQuery, setSearchQuery] = useState('');

  // Bank Form State
  const [accName, setAccName] = useState('');
  const [accNum, setAccNum] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState(''); 
  const [currencyCode, setCurrencyCode] = useState('NGN');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessMobile, setBusinessMobile] = useState('');
  
  const [balance, setBalance] = useState(0);
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [systemFee, setSystemFee] = useState(0);
  const [laundryName, setLaundryName] = useState('');
  const [laundryId, setLaundryId] = useState('');
  const [paystackSubaccountCode, setPaystackSubaccountCode] = useState('');

  useEffect(() => {
    fetchPaymentDetails();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPaymentDetails();
    }, [])
  );

  const fetchPaymentDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: laundry, error } = await supabase
        .from('laundries')
        .select('id, name, current_balance, weekly_sales, system_fee, account_name, account_number, bank_name, bank_code, currency_code, paystack_subaccount_code, contact_details, email')
        .eq('owner_id', user.id)
        .single();

      if (error) throw error;

      if (laundry) {
        setLaundryId(laundry.id);
        setLaundryName(laundry.name || 'Laundry Owner');
        setPaystackSubaccountCode(laundry.paystack_subaccount_code || '');
        const currentCurrency = laundry.currency_code || 'NGN';
        const dbBalance = parseFloat(laundry.current_balance);
        const dbWeekly = parseFloat(laundry.weekly_sales);
        const dbFee = parseFloat(laundry.system_fee);

        setBalance(isNaN(dbBalance) ? 0 : dbBalance);
        setWeeklyTotal(isNaN(dbWeekly) ? 0 : dbWeekly);
        setSystemFee(isNaN(dbFee) ? 0 : dbFee);

        setAccName(laundry.account_name || '');
        setAccNum(laundry.account_number || '');
        setBankName(laundry.bank_name || '');
        setBankCode(laundry.bank_code || '');
        setCurrencyCode(currentCurrency); 
        setBusinessEmail(laundry.email || user.email || '');
        setBusinessMobile(laundry.contact_details || '');
      }
    } catch (err) {
      console.error("Payment Details Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreateSubaccount = async () => {
    if (!accNum || !bankName) {
      Alert.alert("Error", "Please fill in all bank details.");
      return;
    }

    if (!businessEmail) {
      Alert.alert("Error", "Business email is required.");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Auto-lookup bank code for NGN if not set
      let finalBankCode = bankCode;
      if (currencyCode === 'NGN' && !bankCode) {
        const matchedBank = NIGERIAN_BANKS.find(
          bank => bank.name.toLowerCase() === bankName.toLowerCase()
        );
        
        if (matchedBank) {
          finalBankCode = matchedBank.code;
        } else {
          Alert.alert(
            "Bank Selection Required", 
            "Please select your bank from the list to ensure correct bank code."
          );
          setLoading(false);
          return;
        }
      }

      // Validate bank code for NGN currency
      if (currencyCode === 'NGN' && !finalBankCode) {
        Alert.alert("Error", "Please select a bank from the list.");
        setLoading(false);
        return;
      }

      // Call Paystack Edge Function to create subaccount
      const { data, error } = await supabase.functions.invoke('create-paystack-subaccount', {
        body: {
          laundry_id: laundryId,
          account_number: accNum,
          bank_code: finalBankCode,
          business_name: laundryName,
          business_email: businessEmail,
        }
      });

      if (error) throw error;

      if (data.success) {
        // Save bank details and verified account name
        const { error: dbError } = await supabase
          .from('laundries')
          .update({
            account_name: data.verified_account_name || accName,
            account_number: accNum,
            bank_name: bankName,
            bank_code: finalBankCode,
            currency_code: currencyCode.toUpperCase(),
            email: businessEmail,
            contact_details: businessMobile,
            updated_at: new Date().toISOString()
          })
          .eq('owner_id', user.id);

        if (dbError) throw dbError;

        Alert.alert(
          "Success ✅", 
          `Subaccount created successfully!\n\nAccount verified as: ${data.verified_account_name}\n\nPayments will be split automatically (85% to you, 15% platform fee). Paystack pays out every Monday morning.`
        );
        setModalVisible(false);
        fetchPaymentDetails();
      } else {
        throw new Error(data.error || 'Failed to create subaccount');
      }
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to create subaccount.");
      console.error('Subaccount creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPaymentDetails();
  }, []);

  const formatCurrency = (amount) => {
    try {
      const code = (currencyCode || 'NGN').toUpperCase();
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: code,
      }).format(amount);
    } catch (e) {
      return `${currencyCode?.toUpperCase()} ${amount?.toLocaleString()}`;
    }
  };

  const filteredBanks = NIGERIAN_BANKS.filter(bank => 
    bank.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && !refreshing) return <ActivityIndicator size="large" style={{flex:1, backgroundColor: theme.background}} />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView 
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />}
      >
        <Text style={[styles.title, { color: theme.text }]}>Payments</Text>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Weekly Earnings</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
          <View style={styles.divider} />
          <Text style={styles.infoText}>Next Payout: Every Monday Morning (Paystack)</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: theme.card }]}>
            <Text style={[styles.statLabel, { color: theme.subText }]}>Weekly Sales ({currencyCode})</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{formatCurrency(weeklyTotal)}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.card }]}>
            <Text style={[styles.statLabel, {color: '#FF3B30'}]}>System Fee (15%)</Text>
            <Text style={[styles.statValue, {color: '#FF3B30'}]}>-{formatCurrency(systemFee)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: theme.subText }]}>SUBACCOUNT STATUS</Text>
          <View style={[styles.bankCard, { borderColor: theme.border }]}>
            <Text style={[styles.bankLabel, { color: theme.subText }]}>Bank: <Text style={[styles.bankValue, { color: theme.text }]}>{bankName || 'Not Set'}</Text></Text>
            <Text style={[styles.bankLabel, { color: theme.subText }]}>Account: <Text style={[styles.bankValue, { color: theme.text }]}>{accNum || 'Not Set'}</Text></Text>
            <Text style={[styles.bankLabel, { color: theme.subText }]}>Account Name: <Text style={[styles.bankValue, { color: theme.text }]}>{accName || 'Not Set'}</Text></Text>
            <Text style={[styles.bankLabel, { color: theme.subText }]}>Status: <Text style={[styles.bankValue, { color: paystackSubaccountCode ? '#34C759' : '#FF3B30' }]}>{paystackSubaccountCode ? 'Subaccount Active ✓' : 'Not Configured'}</Text></Text>
            
            <TouchableOpacity 
              style={[styles.editBtn, { backgroundColor: theme.editBtnBg }]} 
              onPress={() => {
                setIsPickingBank(false);
                setModalVisible(true);
              }}
            >
              <Text style={styles.editBtnText}>{paystackSubaccountCode ? 'Update Account' : 'Create Subaccount'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.noticeBox, { backgroundColor: theme.noticeBg }]}>
          <Text style={[styles.noticeText, { color: theme.noticeText }]}>
            Automatic payment splitting via Paystack: 85% goes directly to your bank account, 15% platform fee. Paystack settles every Monday morning automatically. Stats reset after each payout.
          </Text>
        </View>
      </ScrollView>

      {/* SINGLE UNIFIED MODAL FOR SETTINGS & PICKER */}
      <Modal 
        visible={modalVisible} 
        animationType="slide" 
        transparent={true}
        onRequestClose={() => {
          if (isPickingBank) setIsPickingBank(false);
          else setModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, maxHeight: '85%' }]}>
            {!isPickingBank ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Subaccount Setup</Text>

                <Text style={[styles.inputLabel, { color: theme.subText }]}>Business Email *</Text>
                <TextInput 
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]} 
                  placeholder="your@email.com" 
                  value={businessEmail}
                  onChangeText={setBusinessEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={[styles.inputLabel, { color: theme.subText }]}>Business Phone (Optional)</Text>
                <TextInput 
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]} 
                  placeholder="08012345678" 
                  value={businessMobile}
                  onChangeText={setBusinessMobile}
                  keyboardType="phone-pad"
                />

                <Text style={[styles.inputLabel, { color: theme.subText }]}>Bank Name *</Text>
                {currencyCode === 'NGN' ? (
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    style={[styles.input, { backgroundColor: theme.inputBg, justifyContent: 'center' }]}
                    onPress={() => setIsPickingBank(true)}
                  >
                    <Text style={{ color: bankName ? theme.text : '#999' }}>
                      {bankName || 'Select Bank'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TextInput 
                    style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]} 
                    placeholder="e.g. Chase" 
                    value={bankName}
                    onChangeText={setBankName}
                  />
                )}

                <Text style={[styles.inputLabel, { color: theme.subText }]}>Account Number *</Text>
                <TextInput 
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]} 
                  placeholder="Account Number" 
                  value={accNum}
                  onChangeText={setAccNum}
                  keyboardType="numeric"
                />

                <Text style={[styles.inputLabel, { color: theme.subText, fontSize: 11 }]}>
                  ℹ️ Account name will be verified automatically by Paystack
                </Text>

                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleCreateSubaccount} disabled={loading}>
                    <Text style={styles.saveBtnText}>{loading ? 'Verifying...' : 'Verify & Create'}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              <>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Select Bank</Text>
                <TextInput 
                  style={[styles.searchBar, { backgroundColor: theme.inputBg, color: theme.text, borderWidth: 0.5, borderColor: theme.border }]}
                  placeholder="Search Bank..."
                  placeholderTextColor="#999"
                  onChangeText={setSearchQuery}
                  autoFocus={true}
                />
                <FlatList
                  data={filteredBanks}
                  keyExtractor={(item) => item.code}
                  style={{ maxHeight: 400 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.bankOption}
                      onPress={() => {
                        setBankName(item.name);
                        setBankCode(item.code);
                        setIsPickingBank(false);
                        setSearchQuery('');
                      }}
                    >
                      <Text style={{ color: theme.text, fontSize: 16 }}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity style={styles.closePicker} onPress={() => setIsPickingBank(false)}>
                  <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Back</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  balanceCard: { backgroundColor: '#007AFF', padding: 25, borderRadius: 20, marginBottom: 20 },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 8 },
  balanceAmount: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 15 },
  infoText: { color: '#fff', fontSize: 12, opacity: 0.8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  statBox: { padding: 15, borderRadius: 12, width: '48%' },
  statLabel: { fontSize: 11, fontWeight: 'bold', marginBottom: 5 },
  statValue: { fontSize: 16, fontWeight: 'bold' },
  section: { marginBottom: 30 },
  sectionHeader: { fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  bankCard: { borderWidth: 1, borderRadius: 15, padding: 15 },
  bankLabel: { fontSize: 14, marginBottom: 10 },
  bankValue: { fontWeight: 'bold' },
  editBtn: { marginTop: 10, paddingVertical: 15, alignItems: 'center', borderRadius: 10 },
  editBtnText: { color: '#007AFF', fontWeight: 'bold', fontSize: 15 },
  noticeBox: { padding: 15, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: '#FFD700', marginBottom: 30 },
  noticeText: { fontSize: 12, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 20, padding: 25 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  inputLabel: { fontSize: 12, marginBottom: 5, fontWeight: '600' },
  input: { padding: 12, borderRadius: 8, marginBottom: 15, height: 50 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  cancelBtn: { padding: 15, width: '45%', alignItems: 'center' },
  cancelBtnText: { color: '#666', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, width: '48%', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
  searchBar: { padding: 12, borderRadius: 10, marginBottom: 15 },
  bankOption: { paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  closePicker: { marginTop: 15, alignItems: 'center', padding: 10 }
});