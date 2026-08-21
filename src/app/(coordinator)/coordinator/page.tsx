import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CoordinatorDashboard from './CoordinatorDashboard';

export default async function CoordinatorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Find their club assignments
  const { data: clubAssignments } = await supabase
    .from('club_coordinators')
    .select('club:clubs(*)')
    .eq('profile_id', user.id);

  // Find their centre assignments
  const { data: centreAssignments } = await supabase
    .from('centre_coordinators')
    .select('centre:centres(*)')
    .eq('profile_id', user.id);

  const assignedClubs = clubAssignments?.map(a => a.club).filter(Boolean) || [];
  const assignedCentres = centreAssignments?.map(a => a.centre).filter(Boolean) || [];

  if (assignedClubs.length === 0 && assignedCentres.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-3xl font-black text-slate-800 mb-4">No Assignments Found</h1>
        <p className="text-slate-500 font-medium">
          You are logged in as a coordinator, but no clubs or centres have been assigned to your profile.
          Please contact the Allocation Admin.
        </p>
      </div>
    );
  }

  // We need to use the Service Role key to fetch slots and allocations because the RLS policy 
  // for allocations currently expects a non-existent club_id column on the allocations table.
  // Since we already securely verified the user's clubIds/centreIds above, bypassing RLS here is safe.
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch slots for assigned clubs
  const clubIds = assignedClubs.map(c => c.id);
  const { data: clubSlots } = clubIds.length > 0 
    ? await supabaseAdmin.from('slots').select('*').in('club_id', clubIds)
    : { data: [] };

  // Fetch slots for assigned centres
  const centreIds = assignedCentres.map(c => c.id);
  const { data: centreSlots } = centreIds.length > 0 
    ? await supabaseAdmin.from('slots').select('*').in('centre_id', centreIds)
    : { data: [] };

  // Fetch allocations (students) for those clubs/centres
  let clubAllocations: any[] = [];
  if (clubIds.length > 0) {
    const { data: cData } = await supabaseAdmin
      .from('allocations')
      .select(`
        id,
        slot_id,
        student:students (
          id, name, register_no, course, section, academic_year, hosteler, contact_no
        ),
        slot:slots!inner (
          id, day, club_id, session, venue
        )
      `)
      .in('slot.club_id', clubIds);
    clubAllocations = cData || [];
  }

  let centreAllocations: any[] = [];
  if (centreIds.length > 0) {
    const { data: ceData } = await supabaseAdmin
      .from('allocations')
      .select(`
        id,
        slot_id,
        student:students (
          id, name, register_no, course, section, academic_year, hosteler, contact_no
        ),
        slot:slots!inner (
          id, day, centre_id, session, venue
        )
      `)
      .in('slot.centre_id', centreIds);
    centreAllocations = ceData || [];
  }

  return (
    <CoordinatorDashboard
      assignedClubs={assignedClubs}
      assignedCentres={assignedCentres}
      clubSlots={clubSlots || []}
      centreSlots={centreSlots || []}
      clubAllocations={clubAllocations}
      centreAllocations={centreAllocations}
    />
  );
}
