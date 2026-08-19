import { createClient } from '@supabase/supabase-js';
import { CheckCircle2, ShieldAlert, BadgeCheck, Clock, MapPin, User, Hash, Calendar } from 'lucide-react';
import RoamingDetector from './RoamingDetector';

// Use service role to bypass RLS for public verification (NO LOGIN REQUIRED)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function VerifyPage(props: { searchParams: Promise<{ reg?: string, hash?: string }> }) {
  const searchParams = await props.searchParams;
  const regNo = searchParams.reg;
  const urlHash = searchParams.hash;

  if (!regNo || !urlHash) {
    return <ErrorState message="Invalid QR Code. Missing verification parameters." />;
  }

  // 1. Fetch student
  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('register_no', regNo)
    .single();

  if (!student) {
    return <ErrorState message="Student record not found in the official database." />;
  }

  // 2. Fetch allocations
  const { data: allocations } = await supabase
    .from('allocations')
    .select(`*, slot:slots(*, club:clubs(name), centre:centres(name))`)
    .eq('student_id', student.id);

  const clubAlloc = allocations?.find(a => a.slot.club_id !== null);
  const centreAlloc = allocations?.find(a => a.slot.centre_id !== null);

  if (!clubAlloc || !centreAlloc) {
    return <ErrorState message="Incomplete booking. Student does not have valid allocations." />;
  }

  // 3. Reconstruct Hash
  const expectedHash = `${clubAlloc.id.split('-')[0].toUpperCase()}-${centreAlloc.id.split('-')[0].toUpperCase()}`;

  if (urlHash !== expectedHash) {
    return <ErrorState message="FORGED DOCUMENT DETECTED. Digital hash does not match official records." />;
  }

  // 4. Success State
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-8 px-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden border border-slate-200">
        
        {/* Real-time Status Header */}
        <RoamingDetector student={student} clubAlloc={clubAlloc} centreAlloc={centreAlloc} />

        {/* Student Profile Info */}
        <div className="px-8 pt-8 pb-6 border-b border-slate-100">
          <div className="flex justify-between items-start mb-6">
            <img src="/rit-logo.png" className="h-10 w-auto object-contain" alt="RIT Logo" />
            <img src="/techspark-logo.png" className="h-10 w-auto object-contain" alt="TechSpark Logo" />
          </div>

          <div className="flex items-center gap-4 mb-1">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
              <User className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 leading-tight">{student.name}</h2>
              <p className="text-slate-500 font-bold">{student.register_no}</p>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/50">
          <div className="p-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Course & Sec</p>
            <p className="font-extrabold text-slate-800">{student.course} - {student.section}</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Session</p>
            <p className="font-extrabold text-slate-800">{student.activity_session}</p>
          </div>
        </div>

        {/* Venue Allocations */}
        <div className="p-8">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Allocated Venues ({student.allowed_day})
          </h3>
          
          <div className="space-y-4">
            {/* Club */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl -translate-y-1/2 translate-x-1/4"></div>
              <span className="bg-blue-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-sm inline-block mb-3">CLUB</span>
              <p className="text-lg font-black text-slate-900 mb-3">{clubAlloc.slot.club.name}</p>
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                  <MapPin className="w-4 h-4 text-blue-500" /> {clubAlloc.slot.venue}
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                  <Clock className="w-4 h-4 text-blue-500" /> {clubAlloc.slot.start_time.substring(0,5)} - {clubAlloc.slot.end_time.substring(0,5)}
                </div>
              </div>
            </div>

            {/* Centre */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl -translate-y-1/2 translate-x-1/4"></div>
              <span className="bg-indigo-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-sm inline-block mb-3">CENTRE</span>
              <p className="text-lg font-black text-slate-900 mb-3">{centreAlloc.slot.centre.name}</p>
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                  <MapPin className="w-4 h-4 text-indigo-500" /> {centreAlloc.slot.venue}
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                  <Clock className="w-4 h-4 text-indigo-500" /> {centreAlloc.slot.start_time.substring(0,5)} - {centreAlloc.slot.end_time.substring(0,5)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="bg-slate-50 p-6 border-t border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Scanned On</p>
            <p className="text-xs font-bold text-slate-600">{new Date().toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center justify-end gap-1">
              <Hash className="w-3 h-3" /> Hash ID
            </p>
            <p className="text-xs font-mono font-bold text-slate-600">{urlHash}</p>
          </div>
        </div>
      </div>
      
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-8">RIT TechSpark System &copy; 2026</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 text-center shadow-xl border border-red-100">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-10 h-10 text-red-500 animate-in zoom-in duration-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-3">Invalid Ticket</h2>
        <p className="text-slate-500 font-medium text-sm mb-6">{message}</p>
        
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-left">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Action Required</p>
          <p className="text-sm font-semibold text-slate-700">Please confiscate this document and report to the system administrator.</p>
        </div>
      </div>
    </div>
  );
}
