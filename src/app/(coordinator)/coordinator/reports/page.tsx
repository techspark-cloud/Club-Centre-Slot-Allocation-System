import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import FacultyReportsClient from './FacultyReportsClient';

export default async function FacultyReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'CLUB_COORDINATOR' && profile.role !== 'CENTRE_COORDINATOR')) {
    redirect('/unauthorized');
  }

  // 2. Fetch assigned clubs for this coordinator
  const { data: clubLinks } = await supabase
    .from('club_coordinators')
    .select('club_id, clubs(*)')
    .eq('profile_id', user.id);

  // 3. Fetch assigned centres for this coordinator
  const { data: centreLinks } = await supabase
    .from('centre_coordinators')
    .select('centre_id, centres(*)')
    .eq('profile_id', user.id);

  const assignedClubs = clubLinks?.map(c => c.clubs).filter(Boolean) || [];
  const assignedCentres = centreLinks?.map(c => c.centres).filter(Boolean) || [];

  return (
    <FacultyReportsClient 
      assignedClubs={assignedClubs}
      assignedCentres={assignedCentres}
      coordinatorName={profile.full_name || user.email || 'Faculty Coordinator'}
    />
  );
}
