'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MapPin, Search, Filter, Users, X } from 'lucide-react';
import { getSlotGroupedDetails } from '@/app/actions/dashboard';

type Slot = {
  id: string;
  day: string;
  session: string;
  venue: string;
  start_time: string;
  end_time: string;
  capacity: number;
  allocated_count: number;
  clubs: { name: string } | null;
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

export default function OverallClubsTimetable() {
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
        .select('*, clubs(name)')
        .not('club_id', 'is', null)
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
      s.clubs?.name.toLowerCase().includes(term) ||
      s.venue.toLowerCase().includes(term)
    );
    const matchesDay = selectedDay === 'All' || s.day === selectedDay;
    const matchesVenue = selectedVenue === 'All' || s.venue === selectedVenue;

    return matchesSearch && matchesDay && matchesVenue;
  });

  // Grouped modal state
  const [groupedDetails, setGroupedDetails] = useState<[string, any][]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const handleSlotClick = async (slot: Slot) => {
    setSelectedSlot(slot);
    setLoadingDetails(true);
    setGroupedDetails([]);
    
    // Use the secure server action to bypass RLS and fetch aggregated data
    const data = await getSlotGroupedDetails(slot.id);
    setGroupedDetails(data);
    
    setLoadingDetails(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Clubs Master Timetable</h2>
          <p className="text-slate-500 mt-1">View schedules and click any slot to see section-wise student breakdown.</p>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-slate-700 text-sm">Timetable Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search club or venue..."
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
          <table className="w-full text-sm text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-32 border-r border-slate-200 text-center uppercase tracking-wider text-xs">Day</th>
                <th className="px-6 py-4 w-1/2 border-r border-slate-200 uppercase tracking-wider text-xs">Forenoon Session</th>
                <th className="px-6 py-4 w-1/2 uppercase tracking-wider text-xs">Afternoon Session</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex justify-center mb-4">
                      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                    Loading timetable...
                  </td>
                </tr>
              ) : filteredSlots.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No slots found matching your filters.
                  </td>
                </tr>
              ) : (
                ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].map(day => {
                  if (selectedDay !== 'All' && day !== selectedDay) return null;
                  const daySlots = filteredSlots.filter(s => s.day === day);
                  if (daySlots.length === 0) return null;

                  const forenoonSlots = daySlots.filter(s => s.session === 'FORENOON');
                  const afternoonSlots = daySlots.filter(s => s.session === 'AFTERNOON');

                  const getDayStyles = (d: string) => {
                    switch (d) {
                      case 'MONDAY': return { bg: 'bg-blue-50/40', badge: 'bg-blue-100 border-blue-200 text-blue-800' };
                      case 'TUESDAY': return { bg: 'bg-amber-50/40', badge: 'bg-amber-100 border-amber-200 text-amber-800' };
                      case 'WEDNESDAY': return { bg: 'bg-emerald-50/40', badge: 'bg-emerald-100 border-emerald-200 text-emerald-800' };
                      case 'THURSDAY': return { bg: 'bg-purple-50/40', badge: 'bg-purple-100 border-purple-200 text-purple-800' };
                      case 'FRIDAY': return { bg: 'bg-rose-50/40', badge: 'bg-rose-100 border-rose-200 text-rose-800' };
                      case 'SATURDAY': return { bg: 'bg-cyan-50/40', badge: 'bg-cyan-100 border-cyan-200 text-cyan-800' };
                      default: return { bg: 'bg-slate-50/40', badge: 'bg-slate-100 border-slate-200 text-slate-800' };
                    }
                  };
                  const styles = getDayStyles(day);

                  const renderSlotCard = (slot: Slot) => (
                    <div 
                      key={slot.id}
                      onClick={() => handleSlotClick(slot)}
                      className="p-3 border border-slate-200 rounded-xl bg-white shadow-sm hover:border-blue-400 hover:shadow-md cursor-pointer transition-all min-w-[180px] flex-1 max-w-[240px]"
                      title="Click to view section-wise breakdown"
                    >
                      <h4 className="font-bold text-slate-900 text-sm truncate">{slot.clubs?.name || 'Unknown Club'}</h4>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> {slot.venue}
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {slot.start_time.slice(0,5)} - {slot.end_time.slice(0,5)}
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${slot.allocated_count >= slot.capacity ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                          {slot.allocated_count}/{slot.capacity}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-2">
                        <div 
                          className={`h-full rounded-full ${slot.allocated_count >= slot.capacity ? 'bg-red-500' : 'bg-green-500'}`} 
                          style={{width: `${Math.min(100, (slot.allocated_count / slot.capacity) * 100)}%`}}
                        />
                      </div>
                    </div>
                  );

                  return (
                    <tr key={day} className={`hover:bg-slate-100/50 transition-colors ${styles.bg}`}>
                      <td className="px-6 py-4 border-r border-slate-200 align-top bg-white/50">
                        <div className={`font-black text-center tracking-widest text-xs uppercase py-3 rounded-xl border shadow-sm ${styles.badge}`}>
                          {day.substring(0, 3)}
                        </div>
                      </td>
                      <td className="px-4 py-4 border-r border-slate-200 align-top">
                        <div className="flex flex-wrap gap-3">
                          {forenoonSlots.length > 0 ? forenoonSlots.map(renderSlotCard) : (
                            <span className="text-sm text-slate-400 font-medium italic">No forenoon slots</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap gap-3">
                          {afternoonSlots.length > 0 ? afternoonSlots.map(renderSlotCard) : (
                            <span className="text-sm text-slate-400 font-medium italic">No afternoon slots</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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
                <h3 className="font-bold text-lg text-slate-900">{selectedSlot.clubs?.name}</h3>
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
                <Users className="w-4 h-4 text-blue-600" />
                Section-wise Breakdown ({selectedSlot.allocated_count} Students)
              </h4>
              
              {loadingDetails ? (
                <div className="py-8 flex justify-center">
                  <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
              ) : groupedDetails.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  No students are currently allocated to this slot.
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedDetails.map(([key, groupData]: any) => (
                    <div key={key} className="flex flex-col rounded-lg bg-slate-50 border border-slate-100 overflow-hidden">
                      <div 
                        className="flex justify-between items-center p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => setExpandedSection(expandedSection === key ? null : key)}
                      >
                        <span className="text-sm font-medium text-slate-700 select-none flex-1">{key}</span>
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                            {groupData.count} {groupData.count === 1 ? 'student' : 'students'}
                          </span>
                        </div>
                      </div>
                      
                      {expandedSection === key && (
                        <div className="p-3 border-t border-slate-100 bg-white">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="text-slate-400 border-b border-slate-100">
                                <th className="pb-2 font-medium w-1/3">Register No</th>
                                <th className="pb-2 font-medium">Student Name</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {groupData.students.map((student: any) => (
                                <tr key={student.register_no} className="hover:bg-slate-50">
                                  <td className="py-2 text-slate-600 font-mono tracking-tight">{student.register_no}</td>
                                  <td className="py-2 text-slate-800 font-medium">{student.name}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
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
