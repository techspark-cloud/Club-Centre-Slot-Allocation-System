import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
let envUrl = '';
let envKey = '';

if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL="?(.*?)"?(?:\n|$)/)?.[1] || '';
  envKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY="?(.*?)"?(?:\n|$)/)?.[1] || '';
}

if (!envUrl || !envKey) {
  console.error("Missing Supabase URL or Service Role Key in .env.local");
  process.exit(1);
}

const supabase = createClient(envUrl, envKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function seedUsers() {
  console.log('Seeding initial admin and test data...');

  // Helper to delete user if exists
  async function deleteUserByEmail(email: string) {
    const { data: users, error } = await supabase.auth.admin.listUsers();
    if (!error && users?.users) {
      const user = users.users.find(u => u.email === email);
      if (user) {
        await supabase.auth.admin.deleteUser(user.id);
        console.log(`Cleaned up existing user: ${email}`);
      }
    }
  }

  await deleteUserByEmail('techspark@ritchennai.edu.in');
  
  // 1. Create Super Admin
  const adminEmail = 'techspark@ritchennai.edu.in';
  const adminPassword = 'password123';
  
  const { data: adminAuth, error: adminErr } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { full_name: 'System Admin', role: 'SUPER_ADMIN' }
  });

  if (adminErr) {
    console.error('Error creating admin auth:', adminErr.message);
  } else if (adminAuth.user) {
    // Note: The handle_new_user trigger in Postgres will automatically create the profiles row.
    // We just need to update the profile if we want to bypass must_change_password
    await supabase.from('profiles').update({ must_change_password: false }).eq('id', adminAuth.user.id);
    console.log(`✅ Created Super Admin: ${adminEmail} (password: ${adminPassword})`);
  }

  // 2. Insert Timetable Rules based on the provided screenshot
  // Course, Semester, Section -> Session Mapping
  const rules = [
    // CSE
    { course: 'CSE', semester: 3, section: 'A', activity_session: 'FORENOON' },
    { course: 'CSE', semester: 3, section: 'B', activity_session: 'FORENOON' },
    { course: 'CSE', semester: 3, section: 'C', activity_session: 'FORENOON' },
    { course: 'CSE', semester: 3, section: 'D', activity_session: 'FORENOON' },
    { course: 'CSE', semester: 3, section: 'E', activity_session: 'FORENOON' },
    { course: 'CSE', semester: 3, section: 'F', activity_session: 'AFTERNOON' },
    { course: 'CSE', semester: 3, section: 'G', activity_session: 'AFTERNOON' },
    { course: 'CSE', semester: 3, section: 'H', activity_session: 'AFTERNOON' },
    { course: 'CSE', semester: 3, section: 'I', activity_session: 'AFTERNOON' },
    
    // ECE
    { course: 'ECE', semester: 3, section: 'A', activity_session: 'AFTERNOON' },
    { course: 'ECE', semester: 3, section: 'B', activity_session: 'AFTERNOON' },
    { course: 'ECE', semester: 3, section: 'C', activity_session: 'AFTERNOON' },
    { course: 'ECE', semester: 3, section: 'D', activity_session: 'FORENOON' },
    { course: 'ECE', semester: 3, section: 'E', activity_session: 'FORENOON' },
    
    // MECH
    { course: 'MECHANICAL', semester: 3, section: 'A', activity_session: 'AFTERNOON' },
    { course: 'MECHANICAL', semester: 3, section: 'B', activity_session: 'FORENOON' },

    // VLSI
    { course: 'VLSI', semester: 3, section: 'A', activity_session: 'AFTERNOON' },
    { course: 'VLSI', semester: 3, section: 'B', activity_session: 'FORENOON' },

    // BIO TECH
    { course: 'BIO TECH', semester: 3, section: 'A', activity_session: 'AFTERNOON' },

    // CSBS
    { course: 'CSBS', semester: 3, section: 'A', activity_session: 'AFTERNOON' },
    { course: 'CSBS', semester: 3, section: 'B', activity_session: 'FORENOON' },

    // CCE
    { course: 'CCE', semester: 3, section: 'A', activity_session: 'AFTERNOON' },
    { course: 'CCE', semester: 3, section: 'B', activity_session: 'FORENOON' },

    // AIDS
    { course: 'AIDS', semester: 3, section: 'A', activity_session: 'AFTERNOON' },
    { course: 'AIDS', semester: 3, section: 'B', activity_session: 'AFTERNOON' },
    { course: 'AIDS', semester: 3, section: 'C', activity_session: 'AFTERNOON' },
    { course: 'AIDS', semester: 3, section: 'D', activity_session: 'FORENOON' },
    { course: 'AIDS', semester: 3, section: 'E', activity_session: 'FORENOON' },
    { course: 'AIDS', semester: 3, section: 'F', activity_session: 'FORENOON' },
    { course: 'AIDS', semester: 3, section: 'G', activity_session: 'FORENOON' },

    // AIML
    { course: 'AIML', semester: 3, section: 'A', activity_session: 'AFTERNOON' },
    { course: 'AIML', semester: 3, section: 'B', activity_session: 'AFTERNOON' },
  ];

  const { error: ruleErr } = await supabase.from('timetable_rules').upsert(rules, { onConflict: 'course,semester,section' });
  if (ruleErr) {
    console.error('Error inserting timetable rules:', ruleErr);
  } else {
    console.log(`✅ Inserted ${rules.length} Timetable Mapping Rules!`);
  }
}

seedUsers();
