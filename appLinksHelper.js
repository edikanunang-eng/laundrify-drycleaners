import { supabase } from './supabase';
import { Platform } from 'react-native';

/**
 * Fetch app store link from Supabase
 * @param {string} appName - 'customer' or 'partner'
 * @param {string} platform - 'ios' or 'android' (optional, defaults to current platform)
 * @returns {Promise<string>} - Store URL
 */
export const getAppLink = async (appName, platform = null) => {
  try {
    const currentPlatform = platform || (Platform.OS === 'ios' ? 'ios' : 'android');
    
    const { data, error } = await supabase
      .from('app_links')
      .select('store_url')
      .eq('app_name', appName)
      .eq('platform', currentPlatform)
      .single();

    if (error) {
      console.warn(`Could not fetch ${appName} link for ${currentPlatform}:`, error);
      // Return fallback URL (your website)
      return 'https://laundrify.com.ng';
    }

    return data?.store_url || 'https://laundrify.com.ng';
  } catch (err) {
    console.error('Error fetching app link:', err);
    return 'https://laundrify.com.ng';
  }
};

/**
 * Get both iOS and Android links for an app
 * @param {string} appName - 'customer' or 'partner'
 * @returns {Promise<{ios: string, android: string}>}
 */
export const getAppLinksBoth = async (appName) => {
  try {
    const { data, error } = await supabase
      .from('app_links')
      .select('platform, store_url')
      .eq('app_name', appName);

    if (error) {
      console.warn(`Could not fetch links for ${appName}:`, error);
      return { ios: 'https://laundrify.com.ng', android: 'https://laundrify.com.ng' };
    }

    const links = {
      ios: 'https://laundrify.com.ng',
      android: 'https://laundrify.com.ng'
    };

    data?.forEach(item => {
      if (item.platform === 'ios') links.ios = item.store_url;
      if (item.platform === 'android') links.android = item.store_url;
    });

    return links;
  } catch (err) {
    console.error('Error fetching app links:', err);
    return { ios: 'https://laundrify.com.ng', android: 'https://laundrify.com.ng' };
  }
};