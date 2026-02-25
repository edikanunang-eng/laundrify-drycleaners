import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Platform,
  TouchableOpacity,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as MailComposer from 'expo-mail-composer';
import { supabase } from '../supabase';
import { useFocusEffect } from '@react-navigation/native';

export default function AccountScreen({ isDarkMode }) {
  const theme = {
    background: isDarkMode ? '#121212' : '#ffffff',
    card: isDarkMode ? '#1e1e1e' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#000000',
    subText: isDarkMode ? '#aaaaaa' : '#666666',
    border: isDarkMode ? '#333333' : '#eeeeee',
    headerBg: isDarkMode ? '#1e1e1e' : '#bbd2f0',
  };

  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0); // New state for orders
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: laundryData } = await supabase
        .from('laundries')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (laundryData) {
        setProfile(laundryData);

        // 1. Fetch Reviews with Customer Usernames
        const { data: reviewData, error: reviewError } = await supabase
          .from('reviews')
          .select(`
            id,
            rating,
            comment,
            created_at,
            profiles!fk_customer (username)
          `)
          .eq('laundry_id', laundryData.id)
          .order('created_at', { ascending: false });

        if (reviewError) throw reviewError;
        setReviews(reviewData || []);

        // 2. Fetch Total Orders Count
        const { count, error: orderError } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('laundry_id', laundryData.id);

        if (!orderError) {
          setTotalOrders(count || 0);
        }
      }
    } catch (err) {
      console.error('Fetch Account Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const handleFlagReview = async (review) => {
    const username = review.profiles?.username || 'anonymous_user';
    const isAvailable = await MailComposer.isAvailableAsync();

    if (isAvailable) {
      await MailComposer.composeAsync({
        recipients: ['support@laundrify.com.ng'],
        subject: `Report Review - ${profile?.name}`,
        body: `I would like to report the following review:\n\nCustomer: @${username}\nComment: "${review.comment}"\nReview ID: ${review.id}\n\nReason for reporting: `,
      });
    } else {
      Alert.alert("Support", "Please email support@laundrify.com.ng to report this review.");
    }
  };

  const renderReviewItem = ({ item }) => (
    <View style={[styles.reviewCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.reviewHeader}>
        <View>
          <Text style={[styles.customerName, { color: theme.text }]}>
            @{item.profiles?.username || 'anonymous_user'}
          </Text>
          <View style={styles.itemRating}>
            <Text style={styles.starSmall}>★</Text>
            <Text style={[styles.ratingText, { color: theme.text }]}>{item.rating}</Text>
          </View>
        </View>
        
        <TouchableOpacity onPress={() => handleFlagReview(item)} style={styles.flagButton}>
          <Text style={styles.flagIcon}>🚩</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={[styles.comment, { color: theme.text }]}>{item.comment}</Text>
      
      <View style={styles.reviewFooter}>
        <Text style={[styles.date, { color: theme.subText }]}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  if (loading && !profile) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#bbd2f0" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView 
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} colors={['#bbd2f0']} />}
      >
        <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {profile?.name || 'Laundry Profile'}
          </Text>
          <View style={styles.ratingRow}>
            <Text style={styles.star}>★</Text>
            <Text style={[styles.rating, { color: theme.text }]}>
              {profile?.rating ?? '0.0'}
            </Text>
          </View>
        </View>

        <View style={styles.statsBar}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: theme.text }]}>{reviews.length}</Text>
            <Text style={[styles.statLabel, { color: theme.subText }]}>Total Reviews</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: theme.text }]}>{totalOrders}</Text>
            <Text style={[styles.statLabel, { color: theme.subText }]}>Total Orders</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Customer Reviews</Text>
          
          {reviews.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: theme.subText }]}>No reviews yet.</Text>
            </View>
          ) : (
            <FlatList
              data={reviews}
              renderItem={renderReviewItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { padding: 30, alignItems: 'center' },
  headerTitle: { fontSize: 26, fontWeight: 'bold' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  star: { fontSize: 20, color: '#FFD700', marginRight: 4 },
  rating: { fontSize: 18, fontWeight: '600' },
  statsBar: { flexDirection: 'row', margin: 16, padding: 15, justifyContent: 'space-around', alignItems: 'center' },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: '80%' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  reviewCard: { padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  customerName: { fontWeight: '700', fontSize: 15 },
  itemRating: { flexDirection: 'row', alignItems: 'center' },
  starSmall: { color: '#FFD700', fontSize: 14, marginRight: 2 },
  ratingText: { fontSize: 14, fontWeight: '600' },
  flagButton: { padding: 5 },
  flagIcon: { fontSize: 18 },
  comment: { fontSize: 15, lineHeight: 22, marginBottom: 10 },
  reviewFooter: { flexDirection: 'row', justifyContent: 'flex-end' },
  date: { fontSize: 12 },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { textAlign: 'center', fontSize: 14 }
});