'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, ShieldAlert, Loader2 } from 'lucide-react';

interface Slot {
  id: string;
  club_id: string | null;
  centre_id: string | null;
  start_time: string;
  end_time: string;
  venue: string;
  day: string;
  allocated_count: number;
  capacity: number;
  club?: { name: string };
  centre?: { name: string };
}

interface AdminAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  allowedDay: string;
  allowedSession: string;
  onSuccess: () => void;
}

export default function AdminAllocationModal({ isOpen, onClose, studentId, studentName, allowedDay, allowedSession, onSuccess }: AdminAllocationModalProps) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (isOpen && allowedDay && allowedSession) {
      fetchSlots();
    }
  }, [isOpen, allowedDay, allowedSession]);

  const fetchSlots = async () => {
    setLoading(true);
    setError('');
    
    const days = allowedDay.split(',').map(d => d.trim());
    
    // Fetch ALL slots for this student's allowed days and matching their session
    const { data, error } = await supabase
      .from('slots')
      .select(`
        id, club_id, centre_id, start_time, end_time, venue, day, allocated_count, capacity,
        club:clubs(name),
        centre:centres(name)
      `)
      .in('day', days)
      .eq('session', allowedSession);

    if (error) {
      setError(`Failed to fetch slots: ${error.message}`);
    } else if (data) {
      setSlots(data);
    }
    setLoading(false);
  };

  const handleForceAllocate = async () => {
    if (!selectedSlotId) {
      setError('Please select a slot first.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/admin/force-allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          slotId: selectedSlotId
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error || 'Failed to force allocate.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-orange-500" />
            Force Allocation Override
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <p className="text-sm text-slate-600 mb-1">You are forcing an allocation for:</p>
            <p className="font-bold text-lg text-slate-900">{studentName}</p>
            <p className="text-xs text-orange-600 font-medium mt-1">
              Warning: If you select a slot that is full, this action will exceed its maximum capacity (e.g. 101/100).
            </p>
          </div>

          {error && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-8 flex justify-center items-center">
              <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Select a Slot ({allowedDay} - {allowedSession})
                </label>
                <select 
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"
                  value={selectedSlotId}
                  onChange={(e) => setSelectedSlotId(e.target.value)}
                >
                  <option value="">-- Choose a slot --</option>
                  {slots.map(slot => {
                    const isFull = slot.allocated_count >= slot.capacity;
                    const name = slot.club_id ? slot.club?.name : slot.centre?.name;
                    return (
                      <option key={slot.id} value={slot.id}>
                        {isFull ? '⚠️ [FULL] ' : ''}{name} - {slot.start_time} to {slot.end_time} ({slot.allocated_count}/{slot.capacity})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={onClose}
                  className="flex-1 py-3 px-4 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleForceAllocate}
                  disabled={!selectedSlotId || submitting}
                  className="flex-1 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Force Allocate Now'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
