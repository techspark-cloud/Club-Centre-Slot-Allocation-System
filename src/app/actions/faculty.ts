'use server';

import { createClient } from '@supabase/supabase-js';

// Requires service role key to manage Auth users
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function syncFacultyAuthUser(name: string, mobileRaw: string) {
  try {
    const mobile = mobileRaw?.trim();
    if (!mobile || !name) return { success: false, error: 'Missing faculty details' };

    const email = `${mobile}@rit.faculty`;
    const password = mobile; // Default password is the mobile number

    // Check if user already exists
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return { success: false, error: listError.message };
    }

    const existingUser = users.users.find(u => u.email === email);

    if (!existingUser) {
      // Create the Auth user
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          role: 'CLUB_CENTRE_COORDINATOR'
        }
      });

      if (error) {
        console.error('Error creating auth user:', error);
        return { success: false, error: error.message };
      }
      
      console.log('Successfully created auth user for faculty:', email);
    } else {
      console.log('Faculty auth user already exists:', email);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Server Action Error (syncFacultyAuthUser):', err);
    return { success: false, error: err.message };
  }
}
