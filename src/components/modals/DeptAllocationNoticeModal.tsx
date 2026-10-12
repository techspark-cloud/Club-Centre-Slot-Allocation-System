'use client';

import { useState, useEffect } from 'react';
import { Lock, Sparkles, Cpu, CheckCircle2, X, Bell, CalendarClock } from 'lucide-react';

export default function DeptAllocationNoticeModal({
  isOpen,
  onClose,
  deptName
}: {
  isOpen: boolean;
  onClose: () => void;
  deptName?: string | null;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Container */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in zoom-in-95 duration-200">
        
        {/* Institutional Gradient Header */}
        <div className="relative bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white p-5 sm:p-6 shrink-0">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner shrink-0">
                <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-blue-200 bg-blue-500/20 px-2 py-0.5 rounded-md border border-blue-400/30">
                  Official Academic Notice
                </span>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-1">
                  Centre Slots Allocation Policy
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs sm:text-sm text-blue-100/90 font-medium mt-3 leading-relaxed relative z-10">
            Important update regarding Department-wise mandatory centre locking and student open choices for this semester.
          </p>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4 custom-scrollbar text-slate-700 text-xs sm:text-sm leading-relaxed">
          
          {/* Item 1: Mandatory Dept Centre Lock */}
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg sm:rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                Mandatory Department Centres Locked
                {deptName && (
                  <span className="text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                    {deptName}
                  </span>
                )}
              </h3>
              <p className="text-slate-600 mt-1 text-[11px] sm:text-xs leading-relaxed">
                Your department&apos;s core specialised centres have been automatically pre-allocated and locked into your weekly timetable matching your section schedule with <strong className="text-indigo-900">zero timing clashes</strong>.
              </p>
            </div>
          </div>

          {/* Item 2: Balance Slots Open */}
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg sm:rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                Balance Days Released for Student Choice
              </h3>
              <p className="text-slate-600 mt-1 text-[11px] sm:text-xs leading-relaxed">
                All non-mandatory centre slots have been freed up. For any remaining open centre days in your weekly timetable, you are free to explore and choose your preferred centres.
              </p>
            </div>
          </div>

          {/* Item 3: Semiconductor Exclusivity */}
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-purple-50/70 border border-purple-100 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg sm:rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                Semiconductor Design Centre Access
              </h3>
              <p className="text-slate-600 mt-1 text-[11px] sm:text-xs leading-relaxed">
                Centre for Semiconductor Design is prioritised for <strong>VLSI</strong> students as their core mandatory centre, with balance remaining capacity accessible exclusively to <strong>ECE</strong> students.
              </p>
            </div>
          </div>

          {/* Item 4: Action Required with 12:00 PM Timing */}
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-50/80 border border-amber-200 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg sm:rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                  Balance Slot Booking Opens at 12:00 PM IST Today
                </h3>
                <span className="text-[9px] font-black uppercase bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                  ⏰ 12:00 PM Today
                </span>
              </div>
              <p className="text-slate-600 mt-1 text-[11px] sm:text-xs leading-relaxed">
                The portal is locked right now and will <strong>automatically unlock at 12:00 PM IST</strong> with a live countdown. Once it opens, complete your pending choices and click <strong>&ldquo;Confirm Booking&rdquo;</strong> to finalize your schedule.
              </p>
            </div>
          </div>

        </div>

        {/* Footer Action */}
        <div className="p-3.5 sm:p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-[10px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-wider text-center sm:text-left">
            RIT Academic Slot Management • 2026-27
          </p>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Understood, Proceed to Dashboard
          </button>
        </div>

      </div>
    </div>
  );
}
