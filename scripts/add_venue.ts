import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const envUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL="?(.*?)"?(?:\n|$)/)?.[1];
const envKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY="?(.*?)"?(?:\n|$)/)?.[1];
const supabase = createClient(envUrl!, envKey!);
async function run() {
  const { error } = await supabase.rpc('run_sql', { sql: "ALTER TABLE activity_pairs ADD COLUMN venue TEXT NOT NULL DEFAULT 'TBD';" });
  if (error) console.error("RPC failed, trying raw query...", error);
  // Actually, Supabase JS doesn't support raw DDL queries unless we use a pg client.
}
run();
