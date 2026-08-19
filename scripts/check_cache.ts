import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const envUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL="?(.*?)"?(?:\n|$)/)?.[1];
const envKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY="?(.*?)"?(?:\n|$)/)?.[1];
const supabase = createClient(envUrl!, envKey!);
async function check() {
  const { data, error } = await supabase.from('slots').select('id').limit(1);
  console.log("Error checking slots:", error);
  
  const { data: d2, error: e2 } = await supabase.from('allocations').select('id').limit(1);
  console.log("Error checking allocations:", e2);
}
check();
