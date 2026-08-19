import { User, Mail, GraduationCap, Building2, IdCard, Calendar, Clock, BookOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (!student) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
        Profile data not found. Please contact administration.
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 flex flex-col flex-1 w-full h-full">
      <div className="bg-white rounded-[2rem] p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden flex-1 flex flex-col">
        {/* Subtle decorative background */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-50/50 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>

        {/* Unified Header */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 mb-5 border-b border-slate-100">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">My Profile</h1>
            <p className="text-slate-500 font-medium text-sm">Your personal details synced from the Master Student Record.</p>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-50/80 px-5 py-3 rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-extrabold text-lg shadow-inner">
              {student.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 leading-tight">{student.name}</h2>
              <p className="text-slate-500 font-medium text-xs mt-0.5">{student.email}</p>
            </div>
          </div>
        </div>

        {/* Grid Content */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ROW 1 */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center transition-colors hover:bg-slate-100/50">
            <div className="flex items-center gap-2.5 mb-1.5">
              <IdCard className="w-4 h-4 text-slate-400" />
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Register No</p>
            </div>
            <p className="font-extrabold text-lg text-slate-800 ml-6">{student.register_no}</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 flex flex-col justify-center transition-colors hover:bg-slate-100/50">
            <div className="flex items-center gap-2.5 mb-1.5">
              <GraduationCap className="w-4 h-4 text-slate-400" />
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Course & Sec</p>
            </div>
            <p className="font-extrabold text-lg text-slate-800 ml-6">{student.course} - {student.section}</p>
          </div>

          {/* ROW 2 */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center transition-colors hover:bg-slate-100/50">
            <div className="flex items-center gap-2.5 mb-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Academic Year</p>
            </div>
            <p className="font-extrabold text-base text-slate-800 ml-6">{student.academic_year} • Sem {student.semester}</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center transition-colors hover:bg-slate-100/50">
            <div className="flex items-center gap-2.5 mb-1.5">
              <User className="w-4 h-4 text-slate-400" />
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Gender & Accom.</p>
            </div>
            <p className="font-extrabold text-base text-slate-800 ml-6 uppercase">{student.gender || 'N/A'} • {student.hosteler === 'Y' || student.hosteler === 'Yes' ? 'Hosteler' : 'Day Scholar'}</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center transition-colors hover:bg-slate-100/50">
            <div className="flex items-center gap-2.5 mb-1.5">
              <Building2 className="w-4 h-4 text-slate-400" />
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Contact Info</p>
            </div>
            <p className="font-extrabold text-base text-slate-800 ml-6">{student.contact_no || 'Not Provided'}</p>
          </div>

          {/* ROW 3 (Highlight) */}
          <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-2xl border border-blue-100 shadow-sm lg:col-span-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1 transition-all hover:shadow-md">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <Clock className="w-5 h-5 text-blue-600" />
                <p className="text-[11px] text-blue-700 font-extrabold uppercase tracking-widest">Assigned Timetable Session</p>
              </div>
              <p className="text-slate-600 font-medium text-sm ml-7">This determines when you can attend club and centre activities.</p>
            </div>
            <div className="flex flex-col sm:items-end ml-7 sm:ml-0">
              <p className="font-extrabold text-xl text-blue-900 uppercase">
                {student.activity_session || 'Not Assigned'}
              </p>
              {student.allowed_day && (
                <p className="text-emerald-700 font-bold text-xs tracking-wide mt-1 uppercase bg-emerald-100 px-2.5 py-0.5 rounded-md inline-block">
                  {student.allowed_day}S ONLY
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
