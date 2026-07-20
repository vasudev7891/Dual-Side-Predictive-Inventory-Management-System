import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error(
    'CRITICAL: Supabase backend configuration variables are missing. Please verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your environment.'
  );
  process.exit(1);
}

// Create a Supabase Client with service_role privileges
// This client bypasses RLS policies and is suitable for backend transactions
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
