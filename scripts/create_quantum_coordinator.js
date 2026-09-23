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

async function createCoordinator() {
  console.log('--- Creating Coordinator Login for Quantum Centre ---');
  
  const mobile = '9840259511';
  const fullName = 'Dr. Mariselvam A K, Associate Professor';
  const email = `${mobile}@rit.faculty`;
  const password = mobile;

  // 1. Get Quantum Centre ID
  const { data: centre, error: centreErr } = await supabase
    .from('centres')
    .select('id, name')
    .ilike('name', '%Quantum%')
    .single();

  if (centreErr || !centre) {
    console.error('Quantum centre not found:', centreErr);
    return;
  }
  console.log(`Found Centre: ${centre.name} (ID: ${centre.id})`);

  // 2. Check or Create Auth User
  let userId = null;
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: 'CENTRE_COORDINATOR'
    }
  });

  if (authErr) {
    if (authErr.message?.includes('already registered') || authErr.code === 'email_exists') {
      console.log(`User ${email} already exists, fetching user ID...`);
      const { data: usersData } = await supabase.auth.admin.listUsers();
      const existingUser = usersData.users.find(u => u.email === email);
      if (existingUser) {
        userId = existingUser.id;
        // Update password just in case
        await supabase.auth.admin.updateUserById(userId, {
          password: password,
          user_metadata: { full_name: fullName, role: 'CENTRE_COORDINATOR' }
        });
      }
    } else {
      console.error('Error creating auth user:', authErr);
      return;
    }
  } else {
    userId = authData.user.id;
    console.log(`✅ Created Auth User with ID: ${userId}`);
  }

  // 3. Upsert Profile
  const { error: profileErr } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email: email,
      full_name: fullName,
      role: 'CENTRE_COORDINATOR',
      must_change_password: false
    });

  if (profileErr) {
    console.error('Error upserting profile:', profileErr);
  } else {
    console.log('✅ Created / Updated profile for Dr. Mariselvam A K');
  }

  // 4. Map in centre_coordinators table
  const { error: mapErr } = await supabase
    .from('centre_coordinators')
    .upsert({
      centre_id: centre.id,
      profile_id: userId,
      is_primary: true
    });

  if (mapErr) {
    console.error('Error mapping centre_coordinators:', mapErr);
  } else {
    console.log(`✅ Successfully mapped Dr. Mariselvam A K to ${centre.name}`);
  }

  console.log('\n--- Credentials Summary ---');
  console.log(`Username / Mobile: ${mobile}`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Role: CENTRE_COORDINATOR`);
}

createCoordinator();
