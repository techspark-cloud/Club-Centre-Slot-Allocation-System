import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const envUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL="?(.*?)"?(?:\n|$)/)?.[1];
const envKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY="?(.*?)"?(?:\n|$)/)?.[1];
const supabase = createClient(envUrl!, envKey!);
supabase.from('activity_pairs').select('id, day, session').then(res => console.log(JSON.stringify(res.data, null, 2)));
