import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zzjuvujmclxncicjrpmb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6anV2dWptY2x4bmNpY2pycG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxODU5NTEsImV4cCI6MjA4Mjc2MTk1MX0.SFx2SJJHyfAqw9DtmATPsMjuakjIij_9bwN266iDmwg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);