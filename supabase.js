// supabase.js
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://abbyesfjcvovdbrpbmuc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYnllc2ZqY3ZvdmRicnBibXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NDM5OTQsImV4cCI6MjA4NDMxOTk5NH0.l4rADjNSOpR0lg0DDGZD895Ot9w2eZ2d_oQ7U4wtmyg';

// Regular client 
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
