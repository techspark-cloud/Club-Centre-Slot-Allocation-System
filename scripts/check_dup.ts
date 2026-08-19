import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const envUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL="?(.*?)"?(?:\n|$)/)?.[1];
const envKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY="?(.*?)"?(?:\n|$)/)?.[1];
const supabase = createClient(envUrl!, envKey!);
async function check() {
  const { data, error } = await supabase.from('slots').select('*, club:clubs(name), centre:centres(name)').eq('day', 'FRIDAY').eq('session', 'FORENOON');
  console.log("Data:", data);
  console.log("Error:", error);
}
check();
