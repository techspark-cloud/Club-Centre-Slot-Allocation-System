import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

// Create a Supabase admin client to bypass RLS and create Auth users


export async function POST(request: Request) {
  const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

  // 1. Verify caller is an admin
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['SUPER_ADMIN', 'ALLOCATION_ADMIN'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2. Process students
  try {
    const { students } = await request.json();
    
    if (!students || !Array.isArray(students)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const createdAuthUsers = [];

    // Create users one by one to handle errors gracefully
    for (const student of students) {
      // The initial password is the contact number
      const password = student.contact_no || '12345678';
      
      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: student.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: student.name,
          role: 'STUDENT',
        }
      });

      if (createError) {
        // If user already exists, we might want to fetch their ID, but for now we'll just skip
        if (createError.code !== 'email_exists') {
          console.error(`Failed to create auth for ${student.email}:`, createError);
        } else {
          // If they exist, let's fetch their user id
          const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = existingUsers.users.find(u => u.email === student.email);
          if (existingUser) {
             createdAuthUsers.push({ email: student.email, id: existingUser.id });
          }
        }
      } else if (authData.user) {
        createdAuthUsers.push({ email: student.email, id: authData.user.id });
      }
    }

    return NextResponse.json({ data: createdAuthUsers });
  } catch (error: any) {
    console.error('Seed auth error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
