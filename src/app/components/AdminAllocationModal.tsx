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
  course: string;
  section: string;
  onSuccess: () => void;
}

export default function AdminAllocationModal({ isOpen, onClose, studentId, studentName, allowedDay, allowedSession, course, section, onSuccess }: AdminAllocationModalProps) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      fetchSlots();
    }
  }, [isOpen]);

  const fetchSlots = async () => {
    setLoading(true);
    setError('');
    
    try {
      // 1. Fetch custom section rules
      let customRules: any[] = [];
      if (course && section) {
        const { data: rulesData } = await supabase
          .from('section_booking_rules')
          .select('*')
          .eq('course', course)
          .eq('section', section);
        if (rulesData) {
          customRules = rulesData;
        }
      }

      // 2. Fetch all ACTIVE slots
      const { data: slotsData, error: slotsError } = await supabase
        .from('slots')
        .select(`
          id, club_id, centre_id, start_time, end_time, venue, day, session, allocated_count, capacity,
          club:clubs(name),
          centre:centres(name)
        `)
        .eq('status', 'ACTIVE');

      if (slotsError) throw slotsError;

      // 3. Filter using the exact same logic as the student dashboard
      if (slotsData) {
        const allowedDaysArray = (allowedDay && allowedDay !== 'ANY' && allowedDay !== 'INDEPENDENT') 
          ? allowedDay.split(',').map((d: string) => d.trim()).filter(Boolean) 
          : [];
        
        const customDays = customRules.map(r => r.day.trim());
        
        const filteredSlots = slotsData.filter((s: any) => {
          if (allowedDay === 'ANY' || allowedDay === 'INDEPENDENT') return true;
          
          // Custom Rule Match
          if (customDays.includes(s.day)) {
            const ruleForDay = customRules.find(r => r.day.trim() === s.day);
            if (ruleForDay) {
              const formattedSlotTiming = `${s.start_time.substring(0,5)} - ${s.end_time.substring(0,5)}`;
              const dbSlotTiming = `${s.start_time}-${s.end_time}`;
              return ruleForDay.allowed_timings.some((t: string) => {
                return t === formattedSlotTiming || t === dbSlotTiming || t.replace(/\s+/g, '') === dbSlotTiming.replace(/\s+/g, '');
              });
            }
          }

          // Standard Match
          if (allowedDaysArray.includes(s.day) && s.session === allowedSession) return true;
          
          return false;
        });

        // Grouping logic handled in render, just sort them by Day
        const dayOrder: Record<string, number> = { 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3, 'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6, 'SUNDAY': 7 };
        filteredSlots.sort((a, b) => (dayOrder[a.day] || 99) - (dayOrder[b.day] || 99));

        setSlots(filteredSlots);
      }
    } catch (err: any) {
      setError(`Failed to fetch slots: ${err.message}`);
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
            <p className="text-sm text-slate-600 mb-1">You are changing/forcing an allocation for:</p>
            <p className="font-bold text-lg text-slate-900">{studentName}</p>
            <div className="flex flex-col gap-1 mt-2">
              <p className="text-xs text-orange-600 font-medium bg-orange-50 p-2 rounded">
                <strong>Change Override:</strong> If this student is currently in a club/centre, allocating them here will instantly remove them from their old one.
              </p>
              <p className="text-xs text-red-600 font-medium bg-red-50 p-2 rounded">
                <strong>Capacity Override:</strong> If you select a slot that is full, this action will force them in and exceed the maximum capacity.
              </p>
            </div>
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
                  Select a Slot (Grouped by Eligible Days)
                </label>
                <select 
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-white"
                  value={selectedSlotId}
                  onChange={(e) => setSelectedSlotId(e.target.value)}
                >
                  <option value="">-- Choose a slot --</option>
                  {Array.from(new Set(slots.map(s => s.day))).map(day => (
                    <optgroup key={day} label={`${day} SLOTS`} className="bg-slate-50 font-bold text-slate-800">
                      {slots.filter(s => s.day === day).map(slot => {
                        const isFull = slot.allocated_count >= slot.capacity;
                        const name = slot.club_id ? slot.club?.name : slot.centre?.name;
                        const type = slot.club_id ? '[CLUB]' : '[CENTRE]';
                        return (
                          <option key={slot.id} value={slot.id} className="font-normal bg-white text-slate-700">
                            {isFull ? '⚠️ [FULL] ' : ''}{type} {name} - {slot.start_time.substring(0,5)} to {slot.end_time.substring(0,5)} ({slot.allocated_count}/{slot.capacity})
                          </option>
                        );
                      })}
                    </optgroup>
                  ))}
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
