import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Linking, 
  Image,
  Platform 
} from 'react-native';

export default function AboutScreen({ isDarkMode }) {
  const [expandedFaq, setExpandedFaq] = useState(null);

  // --- THEME COLORS ---
  const theme = {
    background: isDarkMode ? '#121212' : '#f8f9fa',
    card: isDarkMode ? '#1e1e1e' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#000000',
    subText: isDarkMode ? '#aaaaaa' : '#666666',
    accent: '#007AFF',
    border: isDarkMode ? '#333333' : '#eeeeee',
  };

  const faqs = [
    {
      id: 1,
      q: "How do I update my laundry prices?",
      a: "Go to your Dashboard, tap 'Edit Services' or 'Edit Profile', and you can update your pricing for each category."
    },
    {
      id: 2,
      q: "Is my business data secure?",
      a: "Yes. Laundrify uses industry-standard encryption through Supabase to ensure your earnings and customer data are protected."
    },
    {
      id: 3,
      q: "How do I report an unfair review?",
      a: "On the Account screen, tap the red flag icon 🚩 next to any review. This will open an email to our support team for investigation."
    },
    {
      id: 4,
      q: "Dummy Question #2?",
      a: "This is a placeholder for your future FAQ answer. You can replace this text anytime."
    }
  ];

  const openLink = (url) => {
    Linking.openURL(url).catch(() => {
      alert("Could not open link");
    });
  };

  const toggleFaq = (id) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const handleRateApp = () => {
    // Dummy store links - replace these with your actual Store IDs later
    const appleStoreLink = 'itms-apps://itunes.apple.com/app/idYOUR_ID';
    const googlePlayLink = 'market://details?id=YOUR_PACKAGE_NAME';
    
    const url = Platform.OS === 'ios' ? appleStoreLink : googlePlayLink;
    
    Linking.openURL(url).catch(() => {
      // Fallback to browser link if store app fails to open
      const webUrl = Platform.OS === 'ios' 
        ? 'https://apps.apple.com/app/idYOUR_ID' 
        : 'https://play.google.com/store/apps/details?id=YOUR_PACKAGE_NAME';
      openLink(webUrl);
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Scrollable content stops before the footer area */}
      <ScrollView 
        style={styles.flexScroll}
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        
        {/* Header Section */}
        <View style={styles.header}>
          <Image 
            source={require('../assets/adaptive-icon.png')} 
            style={styles.appIcon}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: theme.accent }]}>Laundrify DryCleaners</Text>
          <Text style={[styles.version, { color: theme.subText }]}>Version 1.0.0</Text>
        </View>

        {/* Mission Card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.description, { color: theme.text }]}>
            The complete management solution for modern laundry businesses. 
            Manage orders, track earnings, and connect with customers effortlessly.
          </Text>
        </View>

        {/* Rate the App Feature */}
        <TouchableOpacity 
          style={[styles.rateCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={handleRateApp}
        >
          <Text style={styles.rateIcon}>⭐</Text>
          <Text style={[styles.rateText, { color: theme.text }]}>Enjoying the app? Rate us on the Store!</Text>
        </TouchableOpacity>

        {/* Socials & Links */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Connect With Us</Text>
        <View style={styles.socialRow}>
          <TouchableOpacity 
            style={[styles.socialBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => openLink('https://x.com/unangtech')}
          >
            <Text style={styles.socialBtnText}>𝕏 Twitter</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.socialBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => openLink('https://example.com/instagram')}
          >
            <Text style={styles.socialBtnText}>📸 Instagram</Text>
          </TouchableOpacity>
        </View>

        {/* FAQ Section */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>FAQs</Text>
        {faqs.map((faq) => (
          <TouchableOpacity 
            key={faq.id} 
            activeOpacity={0.7}
            style={[styles.faqItem, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => toggleFaq(faq.id)}
          >
            <View style={styles.faqQuestionRow}>
              <Text style={[styles.faqQuestion, { color: theme.text }]}>{faq.q}</Text>
              <Text style={{ color: theme.accent, fontWeight: 'bold' }}>
                {expandedFaq === faq.id ? '−' : '+'}
              </Text>
            </View>
            {expandedFaq === faq.id && (
              <Text style={[styles.faqAnswer, { color: theme.subText }]}>{faq.a}</Text>
            )}
          </TouchableOpacity>
        ))}

        {/* Footer Links (Legal) */}
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => openLink('https://example.com/privacy')}>
            <Text style={[styles.legalText, { color: theme.accent }]}>Privacy Policy</Text>
          </TouchableOpacity>
          <View style={[styles.dot, { backgroundColor: theme.subText }]} />
          <TouchableOpacity onPress={() => openLink('https://example.com/terms')}>
            <Text style={[styles.legalText, { color: theme.accent }]}>Terms of Service</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom padding so content isn't cut off by the fixed footer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FIXED FOOTER - Outside ScrollView */}
      <View style={[styles.footerContainer, { backgroundColor: theme.background }]}>
         <Text style={[styles.footer, { color: theme.subText }]}>© 2026 unang Tech</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flexScroll: { flex: 1 },
  scrollContent: { 
    padding: 20, 
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 20 : 10 
  },
  header: { alignItems: 'center', marginBottom: 30 },
  appIcon: { 
    width: 200, 
    height: 200, 
    marginBottom: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  title: { fontSize: 26, fontWeight: 'bold' },
  version: { fontSize: 14, marginTop: 5 },
  card: { padding: 20, borderRadius: 15, width: '100%', borderWidth: 1, marginBottom: 25 },
  description: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
  rateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
    marginBottom: 25,
    justifyContent: 'center'
  },
  rateIcon: { fontSize: 20, marginRight: 10 },
  rateText: { fontSize: 15, fontWeight: '600' },
  sectionTitle: { alignSelf: 'flex-start', fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginTop: 5 },
  socialRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 25 },
  socialBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, width: '48%', alignItems: 'center' },
  socialBtnText: { fontWeight: '600', fontSize: 14, color: '#007AFF' },
  faqItem: { width: '100%', padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  faqQuestionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestion: { fontSize: 15, fontWeight: '600', flex: 0.9 },
  faqAnswer: { marginTop: 10, fontSize: 14, lineHeight: 20 },
  legalLinks: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  legalText: { fontSize: 13, fontWeight: '500' },
  dot: { width: 4, height: 4, borderRadius: 2, marginHorizontal: 10 },
  footerContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'transparent',
  },
  footer: { fontSize: 12 }
});