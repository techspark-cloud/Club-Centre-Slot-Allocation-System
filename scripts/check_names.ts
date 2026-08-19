import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const envUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL="?(.*?)"?(?:\n|$)/)?.[1];
const envKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY="?(.*?)"?(?:\n|$)/)?.[1];
const supabase = createClient(envUrl!, envKey!);
async function check() {
  const { data: c } = await supabase.from('clubs').select('name');
  const { data: ce } = await supabase.from('centres').select('name');
  console.log("Clubs:", c?.map(x => x.name).join(', '));
  console.log("Centres:", ce?.map(x => x.name).join(', '));
}
check();
