import { createClient } from '@supabase/supabase-js'
import { getPublicEnv, validatePublicEnv } from './env'

validatePublicEnv()
const supabaseUrl = getPublicEnv('VITE_SUPABASE_URL')
const supabaseAnonKey = getPublicEnv('VITE_SUPABASE_ANON_KEY')

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
