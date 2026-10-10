import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // 1. Verify caller is authenticated admin
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['SUPER_ADMIN', 'ALLOCATION_ADMIN', 'DEPARTMENT_ADMIN', 'OVERALL_CLUB_COORDINATOR', 'OVERALL_CENTRE_COORDINATOR'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Fetch slots with joined clubs, centres, allocations, and students
    const { data: slots, error: slotsError } = await supabaseAdmin
      .from('slots')
      .select(`
        id, day, session, capacity, allocated_count, venue, start_time, end_time, status,
        club:clubs(id, name, faculty_name, faculty_mobile), 
        centre:centres(id, name, faculty_name, faculty_mobile),
        allocations(
          id,
          student_id,
          student:students(name, register_no, course, semester, academic_year, section, contact_no)
        )
      `)
      .order('venue')
      .order('day')
      .order('session');

    if (slotsError) {
      console.error('Error fetching slots from DB:', slotsError);
      return NextResponse.json({ error: slotsError.message }, { status: 500 });
    }

    return NextResponse.json({ slots: slots || [] });
  } catch (error: any) {
    console.error('API /api/admin/slots error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
