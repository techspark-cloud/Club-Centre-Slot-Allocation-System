import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Parse .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const email = '9941352189@rit.faculty';
  console.log(`Checking user: ${email}`);
  
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) { 
    console.error('Auth Error:', error); 
    return;
  }
  
  const user = users?.users.find(u => u.email === email);
  console.log('Auth User ID:', user ? user.id : 'NOT FOUND');
  
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    console.log('Profile:', profile || 'NOT FOUND');
  }
}

check();
