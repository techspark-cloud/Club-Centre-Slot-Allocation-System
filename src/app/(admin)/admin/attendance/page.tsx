import LiveAttendanceGrid from '@/app/components/LiveAttendanceGrid';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function MasterAdminAttendancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['SUPER_ADMIN', 'ALLOCATION_ADMIN'].includes(profile.role)) {
    redirect('/');
  }

  return (
    <div className="p-6 sm:p-8 space-y-8 animate-in fade-in duration-500">
      <LiveAttendanceGrid type="ALL" />
    </div>
  );
}
