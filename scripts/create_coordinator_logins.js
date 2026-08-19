const { createClient } = require('@supabase/supabase-js');

// Must use the Service Role Key to bypass RLS and use auth.admin
const supabaseUrl = 'https://kjestbshetpglycmmrem.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqZXN0YnNoZXRwZ2x5Y21tcmVtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzA2MjIyNiwiZXhwIjoyMTAyNjM4MjI2fQ.tvbYzoSBKhJZgbBEwJSs2MhBRy4NAVtkKtyACdOlWmE';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  console.log("Starting coordinator credential generation (fixing formatting)...");

  const { data: clubs } = await supabase.from('clubs').select('*');

  for (const club of (clubs || [])) {
    if (!club.faculty_mobile || !club.faculty_name) continue;

    // Sanitize mobile number to remove any spaces, tabs, etc.
    const mobile = club.faculty_mobile.replace(/\s+/g, '').trim();

    const email = `${mobile}@rit.faculty`;
    const password = mobile;
    let userId = null;

    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: club.faculty_name,
        role: 'CLUB_COORDINATOR'
      }
    });

    if (authErr) {
      if (authErr.code === 'email_exists') {
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const user = existingUsers.users.find(u => u.email === email);
        if (user) userId = user.id;
      } else {
        console.error(`Error creating auth user for ${email}:`, authErr.message);
        continue;
      }
    } else {
      userId = authData.user.id;
      console.log(`✅ Created Auth User for ${club.faculty_name} (${email})`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (userId) {
      const { error: insertErr } = await supabase.from('club_coordinators').upsert({
        club_id: club.id,
        profile_id: userId,
        is_primary: true
      });
      if (!insertErr) console.log(`🔗 Mapped ${club.faculty_name} to ${club.name}`);
    }
  }

  // Same for Centres
  const { data: centres } = await supabase.from('centres').select('*');
  for (const centre of (centres || [])) {
    if (!centre.faculty_mobile || !centre.faculty_name) continue;

    const mobile = centre.faculty_mobile.replace(/\s+/g, '').trim();
    const email = `${mobile}@rit.faculty`;
    const password = mobile;
    let userId = null;

    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: centre.faculty_name,
        role: 'CENTRE_COORDINATOR'
      }
    });

    if (authErr) {
      if (authErr.code === 'email_exists') {
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const user = existingUsers.users.find(u => u.email === email);
        if (user) userId = user.id;
      } else {
        console.error(`Error creating auth user for ${email}:`, authErr.message);
        continue;
      }
    } else {
      userId = authData.user.id;
      console.log(`✅ Created Auth User for ${centre.faculty_name} (${email})`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (userId) {
      const { error: insertErr } = await supabase.from('centre_coordinators').upsert({
        centre_id: centre.id,
        profile_id: userId,
        is_primary: true
      });
      if (!insertErr) console.log(`🔗 Mapped ${centre.faculty_name} to ${centre.name}`);
    }
  }

  console.log("Finished generating credentials.");
}

run();
