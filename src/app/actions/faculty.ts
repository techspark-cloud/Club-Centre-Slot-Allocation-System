'use server';

import { createClient } from '@supabase/supabase-js';

// Requires service role key to manage Auth users
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function syncFacultyAuthUser(name: string, mobileRaw: string, type: 'CLUB' | 'CENTRE' = 'CLUB', entityId?: string) {
  try {
    const mobile = mobileRaw?.trim();
    if (!mobile || !name) return { success: false, error: 'Missing faculty details' };

    const email = `${mobile}@rit.faculty`;
    const password = mobile; // Default password is the mobile number
    const userRole = type === 'CLUB' ? 'CLUB_COORDINATOR' : 'CENTRE_COORDINATOR';

    // Check if user already exists
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return { success: false, error: listError.message };
    }

    const existingUser = users.users.find(u => u.email === email);
    let authUserId = existingUser?.id;

    if (!existingUser) {
      // Create the Auth user
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          role: userRole
        }
      });

      if (error) {
        console.error('Error creating auth user:', error);
        return { success: false, error: error.message };
      }
      
      authUserId = data.user?.id;
      console.log('Successfully created auth user for faculty:', email);
    } else {
      console.log('Faculty auth user already exists:', email);
    }

    // Link coordinator to club or centre if entityId is provided
    if (authUserId && entityId) {
      if (type === 'CLUB') {
        await supabaseAdmin.from('club_coordinators').upsert({ club_id: entityId, profile_id: authUserId, is_primary: true });
      } else {
        await supabaseAdmin.from('centre_coordinators').upsert({ centre_id: entityId, profile_id: authUserId, is_primary: true });
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Server Action Error (syncFacultyAuthUser):', err);
    return { success: false, error: err.message };
  }
}
