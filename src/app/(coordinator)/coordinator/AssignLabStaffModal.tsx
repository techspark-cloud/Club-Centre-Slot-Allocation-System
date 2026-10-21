'use client';

import React, { useState } from 'react';
import { 
  X, UserPlus, ShieldCheck, Phone, User, Building, 
  CheckCircle2, AlertCircle, Loader2, KeyRound, Copy, Check
} from 'lucide-react';

interface AssignLabStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  slotPlan: any;
  onStaffAssigned: (slotId: string, assignedStaff: any, updatedPlan?: any) => void;
}

export default function AssignLabStaffModal({
  isOpen,
  onClose,
  slotPlan,
  onStaffAssigned,
}: AssignLabStaffModalProps) {
  const currentAssigned = slotPlan?.planB?.assignedStaff;

  const [staffName, setStaffName] = useState(currentAssigned?.name || '');
  const [staffMobile, setStaffMobile] = useState(currentAssigned?.mobile || '');
  const [staffDept, setStaffDept] = useState(currentAssigned?.dept || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !slotPlan) return null;

  const venueB = slotPlan.planB?.venue || 'Lab B';
  const slotTiming = slotPlan.timing || 'Assigned Slot';
  const centreName = slotPlan.centreName || 'Centre';
  const day = slotPlan.day || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanMobile = staffMobile.replace(/\D/g, '');
    if (!staffName.trim()) {
      setError('Please enter faculty / staff full name.');
      return;
    }
    if (cleanMobile.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/coordinator/assign-lab-venue-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: slotPlan.id,
          staffName: staffName.trim(),
          staffMobile: cleanMobile,
          staffDept: staffDept.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to assign staff.');
      }

      setSuccessResult(data.assignedStaff);
      onStaffAssigned(slotPlan.id, data.assignedStaff, data.updatedPlan);
    } catch (err: any) {
      console.error('Error assigning staff:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = () => {
    if (!successResult) return;
    const text = `RIT Extracurricular Portal Login:\nUser ID: ${successResult.loginEmail}\nPassword: ${successResult.mobile}\nVenue: ${venueB} (${centreName} - ${day})`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Assign Faculty for Lab B</h3>
              <p className="text-purple-200 text-xs font-medium">
                {centreName} • {day} ({slotTiming})
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* Target Venue Banner */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-purple-700 shrink-0" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 block">
                  Secondary / Spillover Venue
                </span>
                <span className="text-sm font-black text-purple-950">
                  Lab B: {venueB}
                </span>
              </div>
            </div>
            <span className="text-[11px] font-extrabold bg-purple-200/70 text-purple-800 px-2.5 py-1 rounded-lg">
              {slotPlan.planB?.studentCount || slotPlan.planB?.capacity || 'Spillover'} Students
            </span>
          </div>

          {successResult ? (
            /* Success Feedback Card */
            <div className="space-y-4 py-2">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900 space-y-2">
                <div className="flex items-center gap-2 font-black text-sm text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  Faculty Assigned & Login Activated!
                </div>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  <strong>{successResult.name}</strong> is now assigned to <strong>Lab B ({venueB})</strong>. Coordinator dashboard login credentials have been provisioned automatically.
                </p>
              </div>

              {/* Login Credentials Box */}
              <div className="bg-slate-900 rounded-xl p-4 text-white space-y-2 border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    Faculty Coordinator Login
                  </span>
                  <button
                    type="button"
                    onClick={copyCredentials}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px] font-semibold transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Details
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-xs">
                  <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-sans font-bold">User ID / Email</span>
                    <span className="text-indigo-300 font-bold select-all">{successResult.loginEmail}</span>
                  </div>
                  <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-sans font-bold">Password</span>
                    <span className="text-emerald-400 font-bold select-all">{successResult.mobile}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 pt-1">
                  The faculty can sign in at the Coordinator Portal (<code className="text-slate-300">/login</code>) and immediately view the Lab B roster and take attendance.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Assignment Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Faculty / Staff Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    placeholder="e.g. Dr. S. Karthi"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  10-Digit Mobile Number (Login ID) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={staffMobile}
                    onChange={(e) => setStaffMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 9876543210"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  This mobile number will be configured as both User ID and default password for coordinator login.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Department (Optional)
                </label>
                <input
                  type="text"
                  value={staffDept}
                  onChange={(e) => setStaffDept(e.target.value)}
                  placeholder="e.g. ECE / CSE / IT"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                />
              </div>

              {/* Informational Callout */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Automatic Role & Attendance Access
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Submitting will automatically link this faculty member to {centreName}. When they sign in at <span className="font-semibold text-slate-700">/login</span>, they can record attendance and generate official reports for Lab B.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Provisioning...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Save & Enable Access
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
