import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();

  // Verify caller is an admin
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['SUPER_ADMIN', 'ALLOCATION_ADMIN', 'DEPARTMENT_ADMIN'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch all allocation student_ids (paginated)
  let allAllocs: string[] = [];
  let from = 0;
  const step = 1000;
  let keepFetching = true;

  while (keepFetching) {
    const { data, error } = await supabase
      .from('allocations')
      .select('student_id')
      .range(from, from + step - 1);

    if (error) {
      console.error('Error fetching allocations:', error);
      break;
    }
    if (data && data.length > 0) {
      allAllocs = [...allAllocs, ...data.map((a: any) => a.student_id)];
      from += step;
      if (data.length < step) keepFetching = false;
    } else {
      keepFetching = false;
    }
  }

  // Fetch all preference student_ids (paginated)
  let allPrefs: string[] = [];
  from = 0;
  keepFetching = true;

  while (keepFetching) {
    const { data, error } = await supabase
      .from('preferences')
      .select('student_id')
      .range(from, from + step - 1);

    if (error) {
      console.error('Error fetching preferences:', error);
      break;
    }
    if (data && data.length > 0) {
      allPrefs = [...allPrefs, ...data.map((p: any) => p.student_id)];
      from += step;
      if (data.length < step) keepFetching = false;
    } else {
      keepFetching = false;
    }
  }

  // Count per student
  const allocCounts: Record<string, number> = {};
  allAllocs.forEach(id => { allocCounts[id] = (allocCounts[id] || 0) + 1; });

  const prefCounts: Record<string, number> = {};
  allPrefs.forEach(id => { prefCounts[id] = (prefCounts[id] || 0) + 1; });

  return NextResponse.json({ allocCounts, prefCounts });
}
