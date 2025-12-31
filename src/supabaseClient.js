import { createClient } from '@supabase/supabase-client'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Garante que o login não se perca ao dar F5
    autoRefreshToken: true,
    detectSessionInUrl: true // Importante para capturar a confirmação de e-mail
  }
})