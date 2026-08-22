'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCentreAllocations } from '@/app/actions/dashboard';
import { Layers, Users, CalendarClock, Activity, ArrowRight, Download, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

export default function CentresCoordinatorDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    centres: any[],
    stats: {
      totalCentres: number,
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
    
    // 1. Fetch all centres
    const { data: centres } = await supabase.from('centres').select('*').order('name');
    
    // 2. Fetch all slots that belong to centres
    const { data: slots } = await supabase
      .from('slots')
      .select('*')
      .not('centre_id', 'is', null)
      .eq('status', 'ACTIVE');

    // 3. Fetch allocations to calculate UNIQUE students per centre
    const allocations = await getCentreAllocations();
      
    if (centres && slots) {
      let totalCapacity = 0;
      let totalBooked = 0;
      
      const enrichedCentres = centres.map(centre => {
        const centreSlots = slots.filter(s => s.centre_id === centre.id);
        
        // UNIQUE CAPACITY: The max physical capacity across its slots
        const capacity = centreSlots.length > 0 ? Math.max(...centreSlots.map(s => s.capacity || 0)) : 0;
        
        // UNIQUE BOOKINGS: The number of unique students booked into this centre
        const centreAllocs = (allocations || []).filter((a: any) => a.slot?.centre_id === centre.id);
        const booked = new Set(centreAllocs.map((a: any) => a.student_id)).size;
        
        totalCapacity += capacity;
        totalBooked += booked;
        
        return {
          ...centre,
          capacity,
          booked,
          available: Math.max(0, capacity - booked),
          occupancyRate: capacity > 0 ? Math.round((booked / capacity) * 100) : 0,
          status: capacity === 0 ? 'INACTIVE' : (booked >= capacity ? 'FULL' : 'OPEN')
        };
      });

      // Sort by booked count descending for the chart (top 10)
      const chartData = [...enrichedCentres]
        .sort((a, b) => b.booked - a.booked)
        .slice(0, 10)
        .map(c => ({
          name: c.name.length > 20 ? c.name.substring(0, 20) + '...' : c.name,
          Booked: c.booked,
          Available: c.available
        }));

      setData({
        centres: enrichedCentres,
        stats: {
          totalCentres: centres.length,
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
    const headers = ['Centre Name', 'Faculty Coordinator', 'Contact', 'Capacity', 'Booked', 'Available', 'Occupancy %', 'Status'];
    const csvContent = [
      headers.join(','),
      ...data.centres.map(c => 
        `"${c.name}","${c.faculty_name || 'Unassigned'}","${c.faculty_mobile || 'N/A'}",${c.capacity},${c.booked},${c.available},${c.occupancyRate},"${c.status}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Centres_Coordinator_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Layers className="w-8 h-8 text-indigo-600" />
            Overall Centres Dashboard
          </h1>
          <p className="text-slate-500 font-medium mt-1">Master overview of all centre capacities and occupancies.</p>
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
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -z-10"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Centres</p>
              <h3 className="text-3xl font-black text-slate-900">{data?.stats.totalCentres}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-10"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
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
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          Top 10 Centres by Bookings
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
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Bar dataKey="Booked" stackId="a" fill="#4F46E5" radius={[0, 0, 4, 4]} />
              <Bar dataKey="Available" stackId="a" fill="#E2E8F0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <h2 className="text-xl font-extrabold text-slate-900">Comprehensive Centre Registry</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Detailed capacity and booking breakdown for all registered centres.</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Centre Details</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Coordinator</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Capacity</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Booked</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Available</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Occupancy</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {data?.centres.map(centre => (
                <tr key={centre.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-extrabold text-slate-900">{centre.name}</p>
                    {centre.description && <p className="text-xs text-slate-500 font-medium truncate max-w-xs">{centre.description}</p>}
                  </td>
                  <td className="px-6 py-4">
                    {centre.faculty_name ? (
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{centre.faculty_name}</p>
                        <p className="text-xs font-medium text-slate-500">{centre.faculty_mobile}</p>
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-500 text-xs font-bold uppercase">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-slate-700">{centre.capacity}</td>
                  <td className="px-6 py-4 text-center font-bold text-indigo-600">{centre.booked}</td>
                  <td className="px-6 py-4 text-center font-black text-slate-900">{centre.available}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm font-bold text-slate-700 w-8">{centre.occupancyRate}%</span>
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${centre.occupancyRate >= 90 ? 'bg-red-500' : centre.occupancyRate >= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                          style={{ width: `${centre.occupancyRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {centre.status === 'INACTIVE' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest border border-slate-200">No Slots</span>
                    ) : centre.status === 'FULL' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest border border-red-100">Full</span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">Open</span>
                    )}
                  </td>
                </tr>
              ))}
              {data?.centres.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium">No centres found in the system.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
