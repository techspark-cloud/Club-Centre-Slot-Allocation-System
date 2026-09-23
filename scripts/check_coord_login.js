const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');

const envUrl = envFile.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL='))?.split('=')[1]?.trim().replace(/^["']|["']$/g, '');
const envKey = envFile.split('\n').find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY='))?.split('=')[1]?.trim().replace(/^["']|["']$/g, '');

const supabase = createClient(envUrl, envKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkUsers() {
  const { data: usersData } = await supabase.auth.admin.listUsers();
  console.log('All Users Emails and Roles:');
  for (const u of usersData.users) {
    const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single();
    if (p && (p.role === 'CLUB_COORDINATOR' || p.role === 'CENTRE_COORDINATOR')) {
      console.log(`Email: ${u.email} | Name: ${p.full_name} | Role: ${p.role}`);
    }
  }
}

checkUsers();
