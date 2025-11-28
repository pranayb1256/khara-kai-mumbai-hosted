import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config(
  {
    path:'./.env'
  }
);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase env vars not set. Set SUPABASE_URL and SUPABASE_KEY.');
  process.exit(1);
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});
