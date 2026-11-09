import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ouyzywnqbswmjpkhogiz.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91eXp5d25xYnN3bWpwa2hvZ2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNzI1MjcsImV4cCI6MjEwMDg0ODUyN30.bvDBpANAIRyL2WgQMCntEeAorl_HSC3mqY_yUqrunjE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
