'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, AlertTriangle, CheckCircle, Lightbulb, RefreshCw, Layers, Building2, Users } from 'lucide-react';

export default function CapacityDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<{
    demand: any,
    capacity: any,
    suggestions: any[],
    totalStudents: number,
    unmappedCount: number,
    slots: any[]
  } | null>(null);

  // State for detailed breakdown UI
  const [selectedDetailedDay, setSelectedDetailedDay] = useState('MONDAY');
  const [selectedDetailedSession, setSelectedDetailedSession] = useState<'FORENOON'|'AFTERNOON'>('FORENOON');

  const supabase = createClient();

  const fetchAnalytics = async () => {
    setRefreshing(true);
    try {
      // 1. Fetch Students
      let allStudents: any[] = [];
      let from = 0;
      const step = 1000;
      while (true) {
        const { data: stdData, error } = await supabase.from('students').select('activity_session, allowed_day').range(from, from + step - 1);
        if (error) throw error;
        if (!stdData || stdData.length === 0) break;
        allStudents = [...allStudents, ...stdData];
        if (stdData.length < step) break;
        from += step;
      }

      // 2. Fetch Slots
      const { data: slots, error: slotsError } = await supabase
        .from('slots')
        .select('*, club:clubs(name), centre:centres(name)')
        .eq('status', 'ACTIVE');
      if (slotsError) throw slotsError;

      // 3. Process Demand
      const demand = {
        FORENOON: { MONDAY: 0, TUESDAY: 0, WEDNESDAY: 0, THURSDAY: 0, FRIDAY: 0, SATURDAY: 0, SUNDAY: 0, ANY: 0 },
        AFTERNOON: { MONDAY: 0, TUESDAY: 0, WEDNESDAY: 0, THURSDAY: 0, FRIDAY: 0, SATURDAY: 0, SUNDAY: 0, ANY: 0 }
      };
      
      let unmappedCount = 0;

      allStudents.forEach(s => {
        if (s.allowed_day === 'INDEPENDENT') {
          return;
        }
        if (!s.activity_session || !s.allowed_day) {
          unmappedCount++;
          return;
        }
        
        const session = s.activity_session as 'FORENOON' | 'AFTERNOON';
        
        if (s.allowed_day === 'ANY') {
          demand[session]['ANY']++;
        } else {
          const days = s.allowed_day.split(',');
          days.forEach((day: string) => {
            if (demand[session][day] !== undefined) {
              demand[session][day]++;
            }
          });
        }
      });

      // 4. Process Capacity
      const capacity = {
        FORENOON: { MONDAY: { CLUB: 0, CENTRE: 0 }, TUESDAY: { CLUB: 0, CENTRE: 0 }, WEDNESDAY: { CLUB: 0, CENTRE: 0 }, THURSDAY: { CLUB: 0, CENTRE: 0 }, FRIDAY: { CLUB: 0, CENTRE: 0 }, SATURDAY: { CLUB: 0, CENTRE: 0 }, SUNDAY: { CLUB: 0, CENTRE: 0 } },
        AFTERNOON: { MONDAY: { CLUB: 0, CENTRE: 0 }, TUESDAY: { CLUB: 0, CENTRE: 0 }, WEDNESDAY: { CLUB: 0, CENTRE: 0 }, THURSDAY: { CLUB: 0, CENTRE: 0 }, FRIDAY: { CLUB: 0, CENTRE: 0 }, SATURDAY: { CLUB: 0, CENTRE: 0 }, SUNDAY: { CLUB: 0, CENTRE: 0 } }
      };

      slots.forEach((slot: any) => {
        const session = slot.session as 'FORENOON' | 'AFTERNOON';
        const day = slot.day;
        if (!capacity[session]) return;
        if (!capacity[session][day]) return;
        
        if (slot.club_id) {
          capacity[session][day].CLUB += slot.capacity;
        } else if (slot.centre_id) {
          capacity[session][day].CENTRE += slot.capacity;
        }
      });

      // 5. Generate Suggestions
      const suggestions: any[] = [];
      const standardDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
      
      standardDays.forEach(day => {
        ['FORENOON', 'AFTERNOON'].forEach(sess => {
          const session = sess as 'FORENOON' | 'AFTERNOON';
          const dem = demand[session][day as keyof typeof demand['FORENOON']];
          const clCap = capacity[session][day as keyof typeof capacity['FORENOON']].CLUB;
          const ceCap = capacity[session][day as keyof typeof capacity['FORENOON']].CENTRE;
          
          if (dem > clCap) {
            suggestions.push({ type: 'CLUB', day, session, deficit: dem - clCap, demand: dem, capacity: clCap });
          }
          if (dem > ceCap) {
            suggestions.push({ type: 'CENTRE', day, session, deficit: dem - ceCap, demand: dem, capacity: ceCap });
          }
        });
      });

      setData({
        demand,
        capacity,
        suggestions,
        totalStudents: allStudents.length,
        unmappedCount,
        slots: slots || []
      });

    } catch (err) {
      console.error('Error fetching capacity analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-5rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold animate-pulse">Running Capacity Analysis...</p>
        </div>
      </div>
    );
  }

  const standardDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl text-white">
          <p className="font-bold mb-2 border-b border-slate-700 pb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm font-medium my-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }}></div>
              <span className="text-slate-300">{entry.name}:</span>
              <span className="font-bold ml-auto">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-[1600px] mx-auto pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Activity className="w-8 h-8 text-indigo-600" />
            Capacity vs Demand
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Real-time analysis of student session assignments against available slot caps.
          </p>
        </div>
        
        <button 
          onClick={fetchAnalytics}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          Refresh Analysis
        </button>
      </div>

      {data && (
        <>
          {/* Actionable Suggestions Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <Lightbulb className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Actionable Suggestions</h3>
                  <p className="text-slate-400 text-sm">Identified bottlenecks that will cause booking errors.</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${data.suggestions.length === 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                  {data.suggestions.length === 0 ? 'Optimal' : `${data.suggestions.length} Deficits Found`}
                </span>
              </div>
            </div>
            
            <div className="p-6">
              {data.suggestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h4 className="text-slate-900 font-black text-lg mb-1">Perfectly Balanced!</h4>
                  <p className="text-slate-500 font-medium">You have enough Club and Centre capacity across all sessions to handle the current student demand.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {data.suggestions.map((sugg, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-rose-100 bg-rose-50/50">
                      <div className="mt-1">
                        <AlertTriangle className="w-5 h-5 text-rose-500" />
                      </div>
                      <div>
                        <h5 className="font-bold text-rose-900 text-sm mb-0.5">
                          Increase {sugg.type === 'CLUB' ? 'Club' : 'Centre'} Slots
                        </h5>
                        <p className="text-rose-700/80 text-xs mb-2">
                          {sugg.day} • {sugg.session === 'FORENOON' ? 'Morning Batch' : 'Evening Batch'}
                        </p>
                        <div className="bg-white rounded border border-rose-100 px-3 py-2 flex items-center justify-between shadow-sm">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Deficit</p>
                            <p className="text-lg font-black text-rose-600">+{sugg.deficit}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cap vs Demand</p>
                            <p className="text-xs font-bold text-slate-600">{sugg.capacity} / {sugg.demand}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* MORNING BATCH CHART */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  Morning Batch (Forenoon)
                </h3>
              </div>
              <div className="p-6 flex-1 min-h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={standardDays.map(day => ({
                      name: day.substring(0, 3),
                      Demand: data.demand.FORENOON[day as keyof typeof data.demand.FORENOON],
                      ClubCapacity: data.capacity.FORENOON[day as keyof typeof data.capacity.FORENOON].CLUB,
                      CentreCapacity: data.capacity.FORENOON[day as keyof typeof data.capacity.FORENOON].CENTRE,
                    }))}
                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 700, fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 600, fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="Demand" name="Student Demand" fill="#0f172a" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="ClubCapacity" name="Club Cap" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="CentreCapacity" name="Centre Cap" fill="#ec4899" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* EVENING BATCH CHART */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                  Evening Batch (Afternoon)
                </h3>
              </div>
              <div className="p-6 flex-1 min-h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={standardDays.map(day => ({
                      name: day.substring(0, 3),
                      Demand: data.demand.AFTERNOON[day as keyof typeof data.demand.AFTERNOON],
                      ClubCapacity: data.capacity.AFTERNOON[day as keyof typeof data.capacity.AFTERNOON].CLUB,
                      CentreCapacity: data.capacity.AFTERNOON[day as keyof typeof data.capacity.AFTERNOON].CENTRE,
                    }))}
                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 700, fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 600, fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="Demand" name="Student Demand" fill="#0f172a" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="ClubCapacity" name="Club Cap" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="CentreCapacity" name="Centre Cap" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* DETAILED VENUE BREAKDOWN */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <Layers className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Detailed Venue Analysis</h3>
                  <p className="text-slate-400 text-sm">Capacity vs Live Bookings for every specific Club and Centre.</p>
                </div>
              </div>

              {/* Day & Session Selectors */}
              <div className="flex flex-wrap items-center gap-3">
                <select 
                  value={selectedDetailedDay}
                  onChange={(e) => setSelectedDetailedDay(e.target.value)}
                  className="bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {standardDays.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                  <button 
                    onClick={() => setSelectedDetailedSession('FORENOON')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${selectedDetailedSession === 'FORENOON' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                  >
                    MORNING
                  </button>
                  <button 
                    onClick={() => setSelectedDetailedSession('AFTERNOON')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${selectedDetailedSession === 'AFTERNOON' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                  >
                    EVENING
                  </button>
                </div>
              </div>
            </div>

            {/* Tables Area */}
            <div className="p-6 bg-slate-50">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* Clubs Table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                  <div className="bg-blue-50 border-b border-blue-100 p-4 flex items-center justify-between">
                    <h4 className="font-black text-blue-900 flex items-center gap-2 text-sm uppercase tracking-widest">
                      <Building2 className="w-4 h-4 text-blue-600" /> Clubs
                    </h4>
                  </div>
                  <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">Venue Name</th>
                          <th className="p-3">Timing</th>
                          <th className="p-3 text-right">Booked</th>
                          <th className="p-3 text-right text-emerald-600">Available</th>
                          <th className="p-3 text-right">Capacity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.slots
                          .filter((s: any) => s.day === selectedDetailedDay && s.session === selectedDetailedSession && !!s.club_id)
                          .sort((a: any, b: any) => a.club.name.localeCompare(b.club.name))
                          .map((slot: any) => {
                            const isFull = slot.allocated_count >= slot.capacity;
                            return (
                              <tr key={slot.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                <td className="p-3 font-bold text-slate-800">{slot.club.name}</td>
                                <td className="p-3 font-semibold text-slate-500 text-xs">
                                  {slot.start_time.substring(0,5)} - {slot.end_time.substring(0,5)}
                                </td>
                                <td className={`p-3 text-right font-black ${isFull ? 'text-rose-600' : 'text-slate-700'}`}>
                                  {slot.allocated_count}
                                </td>
                                <td className="p-3 text-right font-bold text-emerald-600">
                                  {slot.capacity - slot.allocated_count}
                                </td>
                                <td className="p-3 text-right font-bold text-slate-400">
                                  {slot.capacity}
                                </td>
                              </tr>
                            );
                        })}
                        {data.slots.filter((s: any) => s.day === selectedDetailedDay && s.session === selectedDetailedSession && !!s.club_id).length === 0 && (
                          <tr><td colSpan={5} className="p-4 text-center text-slate-500 font-medium">No active clubs for this slot.</td></tr>
                        )}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t border-slate-200">
                        <tr>
                          <td colSpan={2} className="p-3 font-black text-slate-700 uppercase tracking-widest text-xs">Total</td>
                          <td className="p-3 text-right font-black text-slate-900">
                            {data.slots
                              .filter((s: any) => s.day === selectedDetailedDay && s.session === selectedDetailedSession && !!s.club_id)
                              .reduce((acc: number, slot: any) => acc + slot.allocated_count, 0)}
                          </td>
                          <td className="p-3 text-right font-black text-emerald-700">
                            {data.capacity[selectedDetailedSession as keyof typeof data.capacity][selectedDetailedDay as keyof typeof data.capacity['FORENOON']].CLUB - data.slots
                              .filter((s: any) => s.day === selectedDetailedDay && s.session === selectedDetailedSession && !!s.club_id)
                              .reduce((acc: number, slot: any) => acc + slot.allocated_count, 0)}
                          </td>
                          <td className="p-3 text-right font-black text-slate-900">
                            {data.capacity[selectedDetailedSession as keyof typeof data.capacity][selectedDetailedDay as keyof typeof data.capacity['FORENOON']].CLUB}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Centres Table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                  <div className="bg-pink-50 border-b border-pink-100 p-4 flex items-center justify-between">
                    <h4 className="font-black text-pink-900 flex items-center gap-2 text-sm uppercase tracking-widest">
                      <Layers className="w-4 h-4 text-pink-600" /> Centres
                    </h4>
                  </div>
                  <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">Venue Name</th>
                          <th className="p-3">Timing</th>
                          <th className="p-3 text-right">Booked</th>
                          <th className="p-3 text-right text-emerald-600">Available</th>
                          <th className="p-3 text-right">Capacity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.slots
                          .filter((s: any) => s.day === selectedDetailedDay && s.session === selectedDetailedSession && !!s.centre_id)
                          .sort((a: any, b: any) => a.centre.name.localeCompare(b.centre.name))
                          .map((slot: any) => {
                            const isFull = slot.allocated_count >= slot.capacity;
                            return (
                              <tr key={slot.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                <td className="p-3 font-bold text-slate-800">{slot.centre.name}</td>
                                <td className="p-3 font-semibold text-slate-500 text-xs">
                                  {slot.start_time.substring(0,5)} - {slot.end_time.substring(0,5)}
                                </td>
                                <td className={`p-3 text-right font-black ${isFull ? 'text-rose-600' : 'text-slate-700'}`}>
                                  {slot.allocated_count}
                                </td>
                                <td className="p-3 text-right font-bold text-emerald-600">
                                  {slot.capacity - slot.allocated_count}
                                </td>
                                <td className="p-3 text-right font-bold text-slate-400">
                                  {slot.capacity}
                                </td>
                              </tr>
                            );
                        })}
                        {data.slots.filter((s: any) => s.day === selectedDetailedDay && s.session === selectedDetailedSession && !!s.centre_id).length === 0 && (
                          <tr><td colSpan={5} className="p-4 text-center text-slate-500 font-medium">No active centres for this slot.</td></tr>
                        )}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t border-slate-200">
                        <tr>
                          <td colSpan={2} className="p-3 font-black text-slate-700 uppercase tracking-widest text-xs">Total</td>
                          <td className="p-3 text-right font-black text-slate-900">
                            {data.slots
                              .filter((s: any) => s.day === selectedDetailedDay && s.session === selectedDetailedSession && !!s.centre_id)
                              .reduce((acc: number, slot: any) => acc + slot.allocated_count, 0)}
                          </td>
                          <td className="p-3 text-right font-black text-emerald-700">
                            {data.capacity[selectedDetailedSession as keyof typeof data.capacity][selectedDetailedDay as keyof typeof data.capacity['FORENOON']].CENTRE - data.slots
                              .filter((s: any) => s.day === selectedDetailedDay && s.session === selectedDetailedSession && !!s.centre_id)
                              .reduce((acc: number, slot: any) => acc + slot.allocated_count, 0)}
                          </td>
                          <td className="p-3 text-right font-black text-slate-900">
                            {data.capacity[selectedDetailedSession as keyof typeof data.capacity][selectedDetailedDay as keyof typeof data.capacity['FORENOON']].CENTRE}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
