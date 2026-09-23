const { createClient } = require('@supabase/supabase-js');

// Must use the Service Role Key to bypass RLS and use auth.admin
const supabaseUrl = 'https://kjestbshetpglycmmrem.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqZXN0YnNoZXRwZ2x5Y21tcmVtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzA2MjIyNiwiZXhwIjoyMTAyNjM4MjI2fQ.tvbYzoSBKhJZgbBEwJSs2MhBRy4NAVtkKtyACdOlWmE';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ============================================================
// 2 Centre Coordinator Changes
// ============================================================
const changes = [
  {
    centreName: 'ARVR',
    newFacultyName: 'Ms. Sharmathi R (AP/CSBS)',
    newMobile: '8825890921'
  },
  {
    centreName: 'Image Processing',
    newFacultyName: 'Mr. Surendran S (AP/CSE)',
    newMobile: '9865747588'
  }
];

async function updateCoordinator(change) {
  const { centreName, newFacultyName, newMobile } = change;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing: ${centreName} → ${newFacultyName}`);
  console.log('='.repeat(60));

  // 1. Find the centre
  const { data: centre, error: centreErr } = await supabase
    .from('centres')
    .select('*')
    .ilike('name', `%${centreName}%`)
    .maybeSingle();

  if (centreErr || !centre) {
    console.error(`❌ Centre "${centreName}" not found!`, centreErr?.message);
    return false;
  }
  console.log(`✅ Found centre: ${centre.name} (ID: ${centre.id})`);
  console.log(`   Old coordinator: ${centre.faculty_name || 'N/A'} | ${centre.faculty_mobile || 'N/A'}`);

  // 2. Remove old coordinator mapping from centre_coordinators
  const { data: oldMappings, error: oldMapErr } = await supabase
    .from('centre_coordinators')
    .select('*')
    .eq('centre_id', centre.id);

  if (oldMappings && oldMappings.length > 0) {
    console.log(`🗑️  Removing ${oldMappings.length} old coordinator mapping(s)...`);
    const { error: delErr } = await supabase
      .from('centre_coordinators')
      .delete()
      .eq('centre_id', centre.id);
    if (delErr) {
      console.error(`❌ Failed to remove old mappings:`, delErr.message);
    } else {
      console.log(`✅ Old coordinator mapping(s) removed`);
    }
  } else {
    console.log(`ℹ️  No existing coordinator mappings found`);
  }

  // 3. Create or find auth user for new coordinator
  const email = `${newMobile}@rit.faculty`;
  const password = newMobile;
  let authUserId = null;

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === email);

  if (existingUser) {
    authUserId = existingUser.id;
    console.log(`ℹ️  Auth user already exists: ${email} (ID: ${authUserId})`);
    
    // Update metadata to reflect new role
    await supabase.auth.admin.updateUserById(authUserId, {
      user_metadata: {
        full_name: newFacultyName,
        role: 'CENTRE_COORDINATOR'
      }
    });
    console.log(`✅ Updated auth user metadata`);

    // Update profile role if needed
    const { error: profileUpdateErr } = await supabase
      .from('profiles')
      .update({ full_name: newFacultyName, role: 'CENTRE_COORDINATOR' })
      .eq('id', authUserId);
    if (!profileUpdateErr) {
      console.log(`✅ Updated profile role to CENTRE_COORDINATOR`);
    }
  } else {
    // Create new auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: newFacultyName,
        role: 'CENTRE_COORDINATOR'
      }
    });

    if (authErr) {
      console.error(`❌ Failed to create auth user for ${email}:`, authErr.message);
      return false;
    }
    authUserId = authData.user.id;
    console.log(`✅ Created new auth user: ${email} (ID: ${authUserId})`);
    
    // Wait for profile trigger to fire
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 4. Create new centre_coordinators mapping
  if (authUserId) {
    const { error: mapErr } = await supabase
      .from('centre_coordinators')
      .upsert({
        centre_id: centre.id,
        profile_id: authUserId,
        is_primary: true
      });
    if (mapErr) {
      console.error(`❌ Failed to create coordinator mapping:`, mapErr.message);
    } else {
      console.log(`✅ Mapped ${newFacultyName} → ${centre.name}`);
    }
  }

  // 5. Update centres table faculty info
  const { error: updateErr } = await supabase
    .from('centres')
    .update({
      faculty_name: newFacultyName,
      faculty_mobile: newMobile
    })
    .eq('id', centre.id);

  if (updateErr) {
    console.error(`❌ Failed to update centre faculty info:`, updateErr.message);
  } else {
    console.log(`✅ Updated centres table: faculty_name=${newFacultyName}, faculty_mobile=${newMobile}`);
  }

  console.log(`\n🎉 DONE: ${centreName} coordinator changed to ${newFacultyName}`);
  console.log(`   Login: ${email} / ${password}`);
  return true;
}

async function run() {
  console.log('🚀 Starting Centre Coordinator Update...\n');
  console.log(`📋 Changes to make: ${changes.length}`);

  let success = 0;
  let failed = 0;

  for (const change of changes) {
    const result = await updateCoordinator(change);
    if (result) success++;
    else failed++;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Summary: ${success} succeeded, ${failed} failed`);
  console.log('='.repeat(60));
}

run().catch(console.error);
