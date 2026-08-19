import { createClient } from '@/lib/supabase/server';
import { Clock, AlertCircle, CalendarClock, ShieldCheck } from 'lucide-react';
import BookingClient from './BookingClient';
import IDVerificationClient from './IDVerificationClient';

export default async function StudentDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (!student) {
    return (
      <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Student Record Not Found</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Your profile was created, but your master student record is missing. Please contact the administrator.
        </p>
      </div>
    );
  }

  // Fetch available slots for the student's assigned session and day
  let clubSlots: any[] = [];
  let centreSlots: any[] = [];
  
  if (student.activity_session && student.allowed_day) {
    const { data: slots } = await supabase
      .from('slots')
      .select(`*, club:clubs(id, name, faculty_name, faculty_mobile), centre:centres(name)`)
      .eq('session', student.activity_session)
      .eq('day', student.allowed_day)
      .eq('status', 'ACTIVE');
      
    if (slots) {
      clubSlots = slots.filter(s => s.club_id !== null);
      centreSlots = slots.filter(s => s.centre_id !== null);
    }
  }

  // Fetch student's existing allocations
  const { data: allocations } = await supabase
    .from('allocations')
    .select(`*, slot:slots(*, club:clubs(id, name, faculty_name, faculty_mobile), centre:centres(name))`)
    .eq('student_id', student.id);

  const existingClubBooking = allocations?.find(a => a.slot.club_id !== null);
  const existingCentreBooking = allocations?.find(a => a.slot.centre_id !== null);

  return (
    <div className="flex flex-col flex-1 gap-4 w-full">
      {/* INSTITUTIONAL HEADER */}
      <div className="bg-white rounded-[2rem] p-5 sm:p-6 border border-slate-200 shadow-sm relative overflow-hidden shrink-0">
        {/* Subtle decorative background for institutional feel */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50/80 rounded-full blur-3xl opacity-60 -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between mb-5 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-1 flex flex-wrap items-center gap-3">
              Welcome, {student.name}
              {student.id_card_verified && (
                <span className="flex items-center gap-1.5 text-sm bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1 rounded-full font-bold shadow-sm">
                  <ShieldCheck className="w-4 h-4" />
                  Verified
                </span>
              )}
            </h1>
            <p className="text-slate-500 font-medium text-base">Manage your Club and Centre bookings for the academic session.</p>
          </div>
        </div>
        
        {/* Premium Unified Stats Bar */}
        <div className="flex flex-col lg:flex-row gap-5 relative z-10 bg-slate-50/50 p-5 rounded-2xl border border-slate-100 backdrop-blur-sm">
          
          {/* Register No */}
          <div className="w-full lg:w-auto lg:flex-[0.8] lg:border-r border-slate-200/60 lg:pr-5 flex flex-col justify-center">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1">Register No</p>
            <p className="font-extrabold text-xl text-slate-800">{student.register_no}</p>
          </div>
          
          {/* Course & Sec */}
          <div className="w-full lg:w-auto lg:flex-[2.5] lg:border-r border-slate-200/60 lg:px-5 flex flex-col justify-center">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1">Course & Sec</p>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-extrabold text-sm sm:text-base text-slate-800 leading-snug">
                {student.course}
              </p>
              <div className="bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded-md font-extrabold text-[11px] border border-slate-300/50 shadow-sm uppercase tracking-wider">
                Sec {student.section}
              </div>
            </div>
          </div>
          
          {/* Assigned Timetable Slot */}
          <div className="w-full lg:w-auto lg:flex-[1.5] lg:pl-5 flex flex-col justify-center">
            <p className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest mb-1.5">Assigned Timetable Slot</p>
            <div className="flex flex-wrap items-center gap-2">
              {student.activity_session ? (
                <div className="flex items-center gap-1.5 bg-blue-100 text-blue-700 px-3 py-1 rounded-lg font-extrabold text-sm border border-blue-200/60 shadow-sm">
                  <Clock className="w-4 h-4" />
                  {student.activity_session}
                </div>
              ) : (
                <div className="bg-red-50 text-red-600 px-3 py-1 rounded-lg font-bold text-sm border border-red-100">
                  Session Unassigned
                </div>
              )}

              {student.allowed_day ? (
                <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg font-extrabold text-sm uppercase tracking-wide border border-emerald-200/60 shadow-sm">
                  {student.allowed_day === 'INDEPENDENT' ? 'INDEPENDENT' : `${student.allowed_day}S ONLY`}
                </div>
              ) : (
                <div className="bg-red-50 text-red-600 px-3 py-1 rounded-lg font-bold text-sm border border-red-100">
                  Day Unassigned
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {!student.id_card_verified ? (
        <IDVerificationClient studentId={student.id} />
      ) : !student.activity_session || !student.allowed_day ? (
        <div className="bg-white rounded-[2rem] p-8 sm:p-10 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col items-center justify-center text-center flex-1">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-orange-50/80 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-rose-50/50 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>
          
          <div className="relative z-10 w-16 h-16 bg-gradient-to-br from-orange-50 to-rose-50 rounded-2xl flex items-center justify-center mb-5 border border-orange-100 shadow-inner rotate-3 transition-transform hover:rotate-6 duration-300">
            <CalendarClock className="w-8 h-8 text-orange-500 -rotate-3" />
          </div>
          
          <h3 className="relative z-10 text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-3">
            Booking Schedule Not Assigned
          </h3>
          
          <p className="relative z-10 text-slate-500 text-base sm:text-lg max-w-xl leading-relaxed">
            {!student.activity_session 
              ? "You haven't been assigned to a Forenoon or Afternoon session yet." 
              : "Your specific booking day (e.g. Monday, Tuesday) hasn't been assigned yet."}
            <br className="hidden sm:block" />
            <span className="font-semibold text-slate-700 mt-1 block">Please wait for your coordinator to configure your schedule before booking slots.</span>
          </p>

          <div className="relative z-10 mt-6 flex items-center gap-2 text-xs font-extrabold text-orange-600 bg-orange-50/80 px-4 py-2 rounded-xl border border-orange-100/50 backdrop-blur-sm shadow-sm">
            <AlertCircle className="w-4 h-4" />
            Check back later
          </div>
        </div>
      ) : student.allowed_day === 'INDEPENDENT' ? (
        <div className="bg-white rounded-[2rem] p-8 sm:p-10 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col items-center justify-center text-center flex-1">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-50/80 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
          
          <div className="relative z-10 w-16 h-16 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl flex items-center justify-center mb-5 border border-emerald-100 shadow-inner">
            <ShieldCheck className="w-8 h-8 text-emerald-500" />
          </div>
          
          <h3 className="relative z-10 text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-3">
            Independent Student
          </h3>
          
          <p className="relative z-10 text-slate-500 text-base sm:text-lg max-w-xl leading-relaxed">
            You have been assigned as an Independent student for this semester.
            <br className="hidden sm:block" />
            <span className="font-semibold text-slate-700 mt-1 block">You are exempt from the standard Club and Centre slot allocation process.</span>
          </p>
        </div>
      ) : (
        <BookingClient 
          student={student}
          studentId={student.id} 
          clubSlots={clubSlots} 
          centreSlots={centreSlots} 
          existingClubBooking={existingClubBooking} 
          existingCentreBooking={existingCentreBooking} 
        />
      )}
    </div>
  );
}
