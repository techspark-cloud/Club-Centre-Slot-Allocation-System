import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const envUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL="?(.*?)"?(?:\n|$)/)?.[1];
const envKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY="?(.*?)"?(?:\n|$)/)?.[1];
const supabase = createClient(envUrl!, envKey!);
async function checkSchema() {
  const { data, error } = await supabase.from('activity_pairs').select('venue').limit(1);
  console.log("Error:", error);
  console.log("Data:", data);
}
checkSchema();
