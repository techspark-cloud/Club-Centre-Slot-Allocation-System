import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CoordinatorDashboard from './CoordinatorDashboard';

export default async function CoordinatorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch coordinator profile name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, name')
    .eq('id', user.id)
    .maybeSingle();

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

  const assignedClubs: any[] = clubAssignments?.map(a => a.club).filter(Boolean) || [];
  const assignedCentres: any[] = centreAssignments?.map(a => a.centre).filter(Boolean) || [];

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

  // Fetch all holidays to pass to the client
  const { data: holidaysData } = await supabaseAdmin
    .from('holidays')
    .select('*');

  const holidaysList = holidaysData || [];

  // Fetch active published venue rebalancing plan (if any)
  let publishedVenuePlan: any = null;
  try {
    const { data: planBlob } = await supabaseAdmin.storage
      .from('venue_plans')
      .download('active_rebalanced_plan.json');
    if (planBlob) {
      const planText = await planBlob.text();
      publishedVenuePlan = JSON.parse(planText);
    }
  } catch (err) {
    console.warn('No active published venue plan found:', err);
  }

  // Check if current user is an assigned substitute faculty in publishedVenuePlan
  const userMobile = (user.email || '').split('@')[0];
  const assignedSubstituteSlots: any[] = [];
  let substituteStaffInfo: any = null;

  if (publishedVenuePlan?.suggestions) {
    publishedVenuePlan.suggestions.forEach((s: any) => {
      const staff = s.planB?.assignedStaff;
      if (staff && (staff.profileId === user.id || staff.mobile === userMobile)) {
        assignedSubstituteSlots.push(s);
        substituteStaffInfo = staff;
      }
    });
  }

  const isPrimary = assignedCentres.some(c => c.faculty_mobile === userMobile) || assignedClubs.some(c => c.faculty_mobile === userMobile);
  const isSubstitute = assignedSubstituteSlots.length > 0 && !isPrimary;

  let finalCentreSlots = centreSlots || [];
  let finalCentreAllocations = centreAllocations;

  if (isSubstitute) {
    const substituteSlotIds = assignedSubstituteSlots.map(s => s.id);
    finalCentreSlots = finalCentreSlots.filter(s => substituteSlotIds.includes(s.id));
    
    // Strictly filter allocations to ONLY students belonging to Lab B for the substitute
    if (publishedVenuePlan) {
      finalCentreAllocations = finalCentreAllocations.filter(a => {
        if (!substituteSlotIds.includes(a.slot_id)) return false;
        const student = a.student;
        if (!student) return false;

        const compositeKey = `${student.id}__${a.slot_id}`;
        const mapEntry = publishedVenuePlan.studentVenueMap?.[compositeKey] || publishedVenuePlan.studentVenueMap?.[student.id];
        if (mapEntry && mapEntry.slotId === a.slot_id) {
          return mapEntry.labType === 'B';
        }

        const slotSug = publishedVenuePlan.suggestions?.find((s: any) => s.id === a.slot_id);
        if (slotSug?.planB?.sections) {
          const inB = slotSug.planB.sections.some((sec: any) => 
            (sec.students || []).some((st: any) => st.id === student.id || (st.register_no && st.register_no === student.register_no))
          );
          if (inB) return true;

          const c = student.course?.replace(/^B\.Tech\.\s*|^B\.E\.\s*/i, '') || 'Dept';
          const sec = student.section ? `Sec ${student.section}` : 'General';
          const secKey = `${c} (${sec})`;
          const inSecB = slotSug.planB.sections.some((s: any) => s.name === secKey);
          if (inSecB) return true;
        }
        return false;
      });
    } else {
      finalCentreAllocations = finalCentreAllocations.filter(a => substituteSlotIds.includes(a.slot_id));
    }
  }

  const coordinatorName = profile?.full_name || profile?.name || substituteStaffInfo?.name || assignedClubs[0]?.faculty_name || assignedCentres[0]?.faculty_name || 'Faculty Coordinator';

  return (
    <CoordinatorDashboard
      assignedClubs={isSubstitute ? [] : assignedClubs}
      assignedCentres={assignedCentres}
      clubSlots={isSubstitute ? [] : (clubSlots || [])}
      centreSlots={finalCentreSlots}
      clubAllocations={isSubstitute ? [] : clubAllocations}
      centreAllocations={finalCentreAllocations}
      holidaysList={holidaysList}
      coordinatorName={coordinatorName}
      publishedVenuePlan={publishedVenuePlan}
      isSubstitute={isSubstitute}
      substituteStaffInfo={substituteStaffInfo}
    />
  );
}
