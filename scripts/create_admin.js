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

async function main() {
  const email = 'pragadish.n@ritchennai.edu.in';
  const password = '9962567869';
  const fullName = 'Pragadish N';
  const role = 'SUPER_ADMIN';

  console.log(`Creating Admin: ${email}`);

  // 1. Check if auth user exists or create
  let userId = null;
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: role
    }
  });

  if (authErr) {
    if (authErr.message?.includes('already registered') || authErr.code === 'email_exists') {
      console.log(`User ${email} already exists in auth. Finding user ID and updating password...`);
      const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers();
      if (listErr) {
        console.error('Error listing users:', listErr);
        return;
      }
      const existingUser = usersData.users.find(u => u.email === email);
      if (existingUser) {
        userId = existingUser.id;
        const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
          password: password,
          user_metadata: { full_name: fullName, role: role }
        });
        if (updateErr) console.error('Error updating password:', updateErr);
        else console.log('✅ Updated existing auth user password and metadata.');
      }
    } else {
      console.error('Error creating auth user:', authErr);
      return;
    }
  } else {
    userId = authData.user.id;
    console.log(`✅ Created Auth User with ID: ${userId}`);
  }

  // 2. Upsert profile
  const { error: profileErr } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email: email,
      full_name: fullName,
      role: role,
      must_change_password: false
    });

  if (profileErr) {
    console.error('Error upserting profile:', profileErr);
  } else {
    console.log(`✅ Profile updated as ${role} for ${email}`);
  }

  // Verify profile
  const { data: verifiedProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  console.log('\n--- Admin Account Details ---');
  console.log('ID:', verifiedProfile?.id);
  console.log('Email / Username:', verifiedProfile?.email);
  console.log('Full Name:', verifiedProfile?.full_name);
  console.log('Role:', verifiedProfile?.role);
  console.log('Password:', password);
}

main();
