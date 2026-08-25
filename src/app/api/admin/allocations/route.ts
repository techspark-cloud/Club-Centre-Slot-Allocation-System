import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role for admin bypass
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Verify Admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const course = url.searchParams.get('course');
    const section = url.searchParams.get('section');

    if ((!search || search.trim() === '') && !course && !section) {
      return NextResponse.json({ students: [] });
    }

    let query = supabase
      .from('students')
      .select(`
        id, name, register_no, course, section, allowed_day, activity_session,
        allocations(
          id,
          slot:slots(
            id, club_id, centre_id, start_time, end_time, venue, day, session,
            club:clubs(name),
            centre:centres(name)
          )
        )
      `)
      .order('register_no');

    if (search) {
      query = query.or(`register_no.ilike.%${search}%,name.ilike.%${search}%`);
    } else {
      if (course) query = query.eq('course', course);
      if (section) query = query.eq('section', section);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ students: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
