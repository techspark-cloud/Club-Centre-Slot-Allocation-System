'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle2, XCircle, AlertCircle, Phone, Calendar, 
  User, Award, Loader2, Clock, MapPin, AlertTriangle, ShieldCheck
} from 'lucide-react';

interface StudentAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  slotId: string;
  entityName: string;
}

export default function StudentAttendanceModal({
  isOpen,
  onClose,
  studentId,
  slotId,
  entityName,
}: StudentAttendanceModalProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !studentId || !slotId) return;

    const fetchStudentAttendance = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/coordinator/student-attendance?student_id=${studentId}&slot_id=${slotId}`);
        const result = await res.json();
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || 'Failed to load student attendance record.');
        }
      } catch (err: any) {
        console.error('Error fetching student attendance modal:', err);
        setError('Network error loading attendance record.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentAttendance();
  }, [isOpen, studentId, slotId]);

  if (!isOpen) return null;

  const student = data?.student;
  const percentage = data?.percentage ?? 0;

  // Status Badge Classifier
  const getStatusBadge = (pct: number) => {
    if (pct >= 85) {
      return {
        label: 'Good Standing',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />
      };
    } else if (pct >= 75) {
      return {
        label: 'Borderline Warning',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
        icon: <AlertTriangle className="w-4 h-4 text-amber-600" />
      };
    } else {
      return {
        label: 'Defaulter Alert (<75%)',
        badgeClass: 'bg-red-100 text-red-800 border-red-300',
        icon: <AlertCircle className="w-4 h-4 text-red-600" />
      };
    }
  };

  const badgeInfo = getStatusBadge(percentage);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded border border-blue-400/30">
              {entityName} • Student Attendance Track
            </span>
            <h3 className="text-xl font-bold text-white mt-1">Individual Performance Monitor</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {isLoading ? (
            <div className="py-16 text-center text-slate-500 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              <p className="font-bold text-sm">Fetching student attendance record...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-50 rounded-2xl border border-red-200 text-center text-red-700 font-bold text-sm">
              {error}
            </div>
          ) : (
            <>
              {/* Student Profile Card */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white font-black text-base flex items-center justify-center shrink-0 shadow-md">
                    {student?.name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold font-mono text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                        {student?.register_no}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                        {student?.course} - {student?.section}
                      </span>
                    </div>
                    <h4 className="text-lg font-black text-slate-900 tracking-tight">{student?.name}</h4>
                    {student?.contact_no && (
                      <a href={`tel:${student.contact_no}`} className="text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1 mt-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" /> {student.contact_no}
                      </a>
                    )}
                  </div>
                </div>

                <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shrink-0 ${badgeInfo.badgeClass}`}>
                  {badgeInfo.icon}
                  <span>{badgeInfo.label}</span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-xs">
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Sessions</span>
                  <span className="block text-2xl font-black text-slate-900 mt-1">{data?.totalSessions}</span>
                </div>
                <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 text-center shadow-xs">
                  <span className="block text-[10px] font-black uppercase text-emerald-700 tracking-wider">Days Present</span>
                  <span className="block text-2xl font-black text-emerald-700 mt-1">{data?.presentCount}</span>
                </div>
                <div className="bg-red-50 p-3.5 rounded-2xl border border-red-200 text-center shadow-xs">
                  <span className="block text-[10px] font-black uppercase text-red-700 tracking-wider">Days Absent</span>
                  <span className="block text-2xl font-black text-red-700 mt-1">{data?.absentCount}</span>
                </div>
                <div className="bg-blue-50 p-3.5 rounded-2xl border border-blue-200 text-center shadow-xs">
                  <span className="block text-[10px] font-black uppercase text-blue-700 tracking-wider">Attendance %</span>
                  <span className="block text-2xl font-black text-blue-950 mt-1">{percentage}%</span>
                </div>
              </div>

              {/* Session History Table */}
              <div className="space-y-3">
                <h5 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" /> Chronological Session Records
                  </span>
                  <span className="text-slate-400 font-semibold">{data?.history?.length || 0} sessions</span>
                </h5>

                {data?.history?.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-bold text-xs">
                    No attendance sessions recorded yet for this slot.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-black uppercase tracking-wider">
                        <tr>
                          <th className="p-3 text-center border-b">S.No</th>
                          <th className="p-3 border-b">Date & Day</th>
                          <th className="p-3 border-b">Timing & Venue</th>
                          <th className="p-3 text-center border-b">Attendance Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {data?.history?.map((h: any, idx: number) => {
                          const isPresent = h.status === 'PRESENT';
                          const isAbsent = h.status === 'ABSENT';

                          return (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                              <td className="p-3 font-black text-slate-800">
                                {new Date(h.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ({h.day})
                              </td>
                              <td className="p-3 text-slate-600 font-semibold">
                                {h.timing} • <span className="text-slate-500 font-normal">{h.venue}</span>
                              </td>
                              <td className="p-3 text-center font-bold">
                                {isPresent ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Present
                                  </span>
                                ) : isAbsent ? (
                                  <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 border border-red-200 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase">
                                    <XCircle className="w-3 h-3 text-red-600" /> Absent
                                  </span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                    Unmarked
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-sm transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
