'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MapPin, Search, Filter, Users, X } from 'lucide-react';

type Slot = {
  id: string;
  day: string;
  session: string;
  venue: string;
  start_time: string;
  end_time: string;
  capacity: number;
  allocated_count: number;
  centres: { name: string } | null;
};

// Drill-down data type
type AllocationDetail = {
  students: {
    name: string;
    register_no: string;
    course: string;
    section: string;
    semester: number;
  };
};

export default function OverallCentresTimetable() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDay, setSelectedDay] = useState('All');
  const [selectedVenue, setSelectedVenue] = useState('All');
  
  // Modal State
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [slotDetails, setSlotDetails] = useState<AllocationDetail[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from('slots')
        .select('*, centres(name)')
        .not('centre_id', 'is', null)
        .order('day')
        .order('start_time');

      if (!error && data) {
        setSlots(data as Slot[]);
      }
      setLoading(false);
    }
    fetchData();
  }, [supabase]);

  const filterOptions = useMemo(() => {
    const days = new Set<string>();
    const venues = new Set<string>();

    slots.forEach(s => {
      days.add(s.day);
      venues.add(s.venue);
    });

    return {
      days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].filter(d => days.has(d)),
      venues: Array.from(venues).sort()
    };
  }, [slots]);

  const filteredSlots = slots.filter(s => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (
      s.centres?.name.toLowerCase().includes(term) ||
      s.venue.toLowerCase().includes(term)
    );
    const matchesDay = selectedDay === 'All' || s.day === selectedDay;
    const matchesVenue = selectedVenue === 'All' || s.venue === selectedVenue;

    return matchesSearch && matchesDay && matchesVenue;
  });

  const handleSlotClick = async (slot: Slot) => {
    setSelectedSlot(slot);
    setLoadingDetails(true);
    setSlotDetails([]);
    
    const { data, error } = await supabase
      .from('allocations')
      .select(`
        students (name, register_no, course, section, semester)
      `)
      .eq('slot_id', slot.id);
      
    if (!error && data) {
      setSlotDetails(data as unknown as AllocationDetail[]);
    }
    setLoadingDetails(false);
  };

  // Grouping students by Section and Batch for the modal
  const groupedDetails = useMemo(() => {
    const groups: Record<string, number> = {};
    slotDetails.forEach(d => {
      const key = `Sem ${d.students.semester} ${d.students.course} - Sec ${d.students.section}`;
      groups[key] = (groups[key] || 0) + 1;
    });
    return Object.entries(groups).sort((a, b) => b[1] - a[1]);
  }, [slotDetails]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Centres Master Timetable</h2>
          <p className="text-slate-500 mt-1">View schedules and click any slot to see section-wise student breakdown.</p>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-indigo-600" />
          <h3 className="font-bold text-slate-700 text-sm">Timetable Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search centre or venue..."
              className="pl-9 pr-3 py-2 w-full border border-slate-300 rounded-lg text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={selectedDay} onChange={e => setSelectedDay(e.target.value)}>
            <option value="All">All Days</option>
            {filterOptions.days.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={selectedVenue} onChange={e => setSelectedVenue(e.target.value)}>
            <option value="All">All Venues</option>
            {filterOptions.venues.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Centre Name</th>
                <th className="px-6 py-4">Day</th>
                <th className="px-6 py-4">Session</th>
                <th className="px-6 py-4">Venue</th>
                <th className="px-6 py-4">Timing</th>
                <th className="px-6 py-4">Capacity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex justify-center mb-4">
                      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                    Loading timetable...
                  </td>
                </tr>
              ) : filteredSlots.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No slots found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredSlots.map((slot) => (
                  <tr 
                    key={slot.id} 
                    onClick={() => handleSlotClick(slot)}
                    className="hover:bg-indigo-50 transition-colors cursor-pointer group"
                    title="Click to view section-wise breakdown"
                  >
                    <td className="px-6 py-4 font-bold text-slate-900 group-hover:text-indigo-700">
                      {slot.centres?.name || 'Unknown Centre'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                        {slot.day}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {slot.session}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-slate-700 font-medium">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {slot.venue}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              slot.allocated_count >= slot.capacity ? 'bg-red-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(100, (slot.allocated_count / slot.capacity) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-600">
                          {slot.allocated_count}/{slot.capacity}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill-down Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{selectedSlot.centres?.name}</h3>
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  {selectedSlot.day} • {selectedSlot.venue} • {selectedSlot.start_time.slice(0,5)}
                </p>
              </div>
              <button 
                onClick={() => setSelectedSlot(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto">
              <h4 className="font-bold text-sm text-slate-900 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Section-wise Breakdown ({selectedSlot.allocated_count} Students)
              </h4>
              
              {loadingDetails ? (
                <div className="py-8 flex justify-center">
                  <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
              ) : groupedDetails.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  No students are currently allocated to this slot.
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedDetails.map(([key, count]) => (
                    <div key={key} className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-sm font-medium text-slate-700">{key}</span>
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                        {count} {count === 1 ? 'student' : 'students'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
