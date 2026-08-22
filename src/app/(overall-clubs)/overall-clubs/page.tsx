'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Building2, Users, CalendarClock, Activity, ArrowRight, Download, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { getClubAllocations } from '@/app/actions/dashboard';

export default function ClubsCoordinatorDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    clubs: any[],
    stats: {
      totalClubs: number,
      totalCapacity: number,
      totalBooked: number,
      occupancyRate: number
    },
    chartData: any[]
  } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Fetch all clubs
    const { data: clubs } = await supabase.from('clubs').select('*').order('name');
    
    // 2. Fetch all slots that belong to clubs
    const { data: slots } = await supabase
      .from('slots')
      .select('*')
      .not('club_id', 'is', null)
      .eq('status', 'ACTIVE');

    // 3. Fetch allocations to calculate UNIQUE students per club
    const allocations = await getClubAllocations();
      
    if (clubs && slots) {
      let totalCapacity = 0;
      let totalBooked = 0;
      
      const enrichedClubs = clubs.map(club => {
        const clubSlots = slots.filter(s => s.club_id === club.id);
        
        // UNIQUE CAPACITY: The max physical capacity across its slots
        const capacity = clubSlots.length > 0 ? Math.max(...clubSlots.map(s => s.capacity || 0)) : 0;
        
        // UNIQUE BOOKINGS: The number of unique students booked into this club
        const clubAllocs = (allocations || []).filter((a: any) => a.slot?.club_id === club.id);
        const booked = new Set(clubAllocs.map((a: any) => a.student_id)).size;
        
        totalCapacity += capacity;
        totalBooked += booked;
        
        return {
          ...club,
          capacity,
          booked,
          available: Math.max(0, capacity - booked),
          occupancyRate: capacity > 0 ? Math.round((booked / capacity) * 100) : 0,
          status: capacity === 0 ? 'INACTIVE' : (booked >= capacity ? 'FULL' : 'OPEN')
        };
      });

      // Sort by booked count descending for the chart (top 10)
      const chartData = [...enrichedClubs]
        .sort((a, b) => b.booked - a.booked)
        .slice(0, 10)
        .map(c => ({
          name: c.name.length > 20 ? c.name.substring(0, 20) + '...' : c.name,
          Booked: c.booked,
          Available: c.available
        }));

      setData({
        clubs: enrichedClubs,
        stats: {
          totalClubs: clubs.length,
          totalCapacity,
          totalBooked,
          occupancyRate: totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0
        },
        chartData
      });
    }
    
    setLoading(false);
  };

  const exportToCSV = () => {
    if (!data) return;
    const headers = ['Club Name', 'Faculty Coordinator', 'Contact', 'Capacity', 'Booked', 'Available', 'Occupancy %', 'Status'];
    const csvContent = [
      headers.join(','),
      ...data.clubs.map(c => 
        `"${c.name}","${c.faculty_name || 'Unassigned'}","${c.faculty_mobile || 'N/A'}",${c.capacity},${c.booked},${c.available},${c.occupancyRate},"${c.status}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Clubs_Coordinator_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            Overall Clubs Dashboard
          </h1>
          <p className="text-slate-500 font-medium mt-1">Master overview of all club capacities and occupancies.</p>
        </div>
        <button 
          onClick={exportToCSV}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition-all"
        >
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-10"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Clubs</p>
              <h3 className="text-3xl font-black text-slate-900">{data?.stats.totalClubs}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -z-10"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Capacity</p>
              <h3 className="text-3xl font-black text-slate-900">{data?.stats.totalCapacity}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-10"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Booked</p>
              <h3 className="text-3xl font-black text-slate-900">{data?.stats.totalBooked}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -z-10"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Occupancy Rate</p>
              <h3 className="text-3xl font-black text-slate-900">{data?.stats.occupancyRate}%</h3>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-2">
            <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${data?.stats.occupancyRate}%` }}></div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Top 10 Clubs by Bookings
        </h2>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#64748B' }} 
                angle={-45}
                textAnchor="end"
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
              <Tooltip 
                cursor={{ fill: '#F1F5F9' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="Booked" stackId="a" fill="#3B82F6" radius={[0, 0, 4, 4]} />
              <Bar dataKey="Available" stackId="a" fill="#E2E8F0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <h2 className="text-xl font-extrabold text-slate-900">Comprehensive Club Registry</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Detailed capacity and booking breakdown for all registered clubs.</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Club Details</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Coordinator</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Capacity</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Booked</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Available</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Occupancy</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {data?.clubs.map(club => (
                <tr key={club.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-extrabold text-slate-900">{club.name}</p>
                    {club.description && <p className="text-xs text-slate-500 font-medium truncate max-w-xs">{club.description}</p>}
                  </td>
                  <td className="px-6 py-4">
                    {club.faculty_name ? (
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{club.faculty_name}</p>
                        <p className="text-xs font-medium text-slate-500">{club.faculty_mobile}</p>
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-500 text-xs font-bold uppercase">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-slate-700">{club.capacity}</td>
                  <td className="px-6 py-4 text-center font-bold text-blue-600">{club.booked}</td>
                  <td className="px-6 py-4 text-center font-black text-slate-900">{club.available}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm font-bold text-slate-700 w-8">{club.occupancyRate}%</span>
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${club.occupancyRate >= 90 ? 'bg-red-500' : club.occupancyRate >= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                          style={{ width: `${club.occupancyRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {club.status === 'INACTIVE' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest border border-slate-200">No Slots</span>
                    ) : club.status === 'FULL' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest border border-red-100">Full</span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">Open</span>
                    )}
                  </td>
                </tr>
              ))}
              {data?.clubs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium">No clubs found in the system.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
