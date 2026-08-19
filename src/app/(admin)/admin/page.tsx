'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Users, Building2, Layers, Calendar, Activity, CheckCircle, RefreshCw, Trophy, Clock, Target } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const PIE_COLORS = ['#3b82f6', '#ec4899'];
const HOSTEL_COLORS = ['#8b5cf6', '#10b981'];

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClubs: 0,
    totalCentres: 0,
    totalSlots: 0,
    clubCapacity: 0,
    centreCapacity: 0,
    clubAllocated: 0,
    centreAllocated: 0,
    studentsCompleted: 0,
    departmentStats: [] as any[],
    genderStats: [] as any[],
    hostelerStats: [] as any[],
    topClubs: [] as any[],
    topCentres: [] as any[],
    dayStats: [] as any[],
    recentActivity: [] as any[]
  });
  
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  
  const supabase = createClient();

  const fetchStats = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);

    try {
      // 1. Fetch Students (Bypass 1000 limit)
      let allStudents: any[] = [];
      let keepFetchingStudents = true;
      let fromS = 0;
      const limitS = 1000;
      while (keepFetchingStudents) {
        const { data, error } = await supabase.from('students').select('id, course, gender, hosteler, status').range(fromS, fromS + limitS - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allStudents = [...allStudents, ...data];
          fromS += limitS;
          if (data.length < limitS) keepFetchingStudents = false;
        } else {
          keepFetchingStudents = false;
        }
      }

      // Fetch all allocations bypassing 1000 limit to determine exact completion and true demand
      let allAllocations: any[] = [];
      let keepFetchingAllocations = true;
      let fromA = 0;
      const limitA = 1000;
      while (keepFetchingAllocations) {
        const { data, error } = await supabase.from('allocations').select(`
          student_id,
          slots(
            day,
            club:clubs(name),
            centre:centres(name)
          )
        `).range(fromA, fromA + limitA - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allAllocations = [...allAllocations, ...data];
          fromA += limitA;
          if (data.length < limitA) keepFetchingAllocations = false;
        } else {
          keepFetchingAllocations = false;
        }
      }
      
      const totalAllocated = allAllocations.length;
      
      const allocCounts: Record<string, number> = {};
      const clubMap: Record<string, number> = {};
      const centreMap: Record<string, number> = {};
      const dayMap: Record<string, number> = {};

      allAllocations.forEach(a => {
        // Count for student completion
        allocCounts[a.student_id] = (allocCounts[a.student_id] || 0) + 1;
        
        // Count for leaderboards and traffic
        const slot = a.slots;
        if (slot) {
          if (slot.day) {
             dayMap[slot.day] = (dayMap[slot.day] || 0) + 1;
          }
          if (slot.club?.name) {
            clubMap[slot.club.name] = (clubMap[slot.club.name] || 0) + 1;
          }
          if (slot.centre?.name) {
            centreMap[slot.centre.name] = (centreMap[slot.centre.name] || 0) + 1;
          }
        }
      });
      
      // A student is fully allocated if they have at least 2 bookings (1 club + 1 centre)
      const completedStudentIds = new Set(
        Object.entries(allocCounts).filter(([_, count]) => count >= 2).map(([id]) => id)
      );

      // Department Stats
      const deptMap: Record<string, { name: string, booked: number, pending: number }> = {};
      let maleBooked = 0, femaleBooked = 0;
      let hostelerBooked = 0, dayScholarBooked = 0;
      let studentsCompletedCount = 0;

      allStudents.forEach(s => {
        const c = s.course || 'Unknown';
        if (!deptMap[c]) deptMap[c] = { name: c, booked: 0, pending: 0 };
        
        if (completedStudentIds.has(s.id) || s.status === 'COMPLETED') {
          deptMap[c].booked += 1;
          studentsCompletedCount++;
          if (s.gender?.toUpperCase() === 'MALE') maleBooked++;
          if (s.gender?.toUpperCase() === 'FEMALE') femaleBooked++;
          
          if (s.hosteler?.toUpperCase() === 'YES') hostelerBooked++;
          if (s.hosteler?.toUpperCase() === 'NO') dayScholarBooked++;
        } else {
          deptMap[c].pending += 1;
        }
      });
      const departmentStats = Object.values(deptMap);

      // 2. Fetch Slots for capacity breakdown
      const { data: slotsData, error: slotsError } = await supabase.from('slots').select('capacity, club_id, centre_id');
      if (slotsError) throw slotsError;
      
      let clubCapacity = 0;
      let centreCapacity = 0;
      slotsData?.forEach((slot: any) => {
        if (slot.club_id) clubCapacity += (slot.capacity || 0);
        if (slot.centre_id) centreCapacity += (slot.capacity || 0);
      });
      
      let clubAllocatedCount = 0;
      let centreAllocatedCount = 0;
      allAllocations.forEach(a => {
        if (a.slots?.club?.name) clubAllocatedCount++;
        if (a.slots?.centre?.name) centreAllocatedCount++;
      });
      
      const topClubs = Object.entries(clubMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
        
      const topCentres = Object.entries(centreMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
        
      const dayStats = Object.entries(dayMap).map(([day, count]) => ({ day, count }));

      // 3. Fetch Recent Activity
      const { data: recentActivity, error: recentError } = await supabase
        .from('allocations')
        .select(`
          id,
          created_at,
          student:students(name, course, section),
          slot:slots(
            day,
            club:clubs(name),
            centre:centres(name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      if (recentError) throw recentError;
        
      const { count: clubCount, error: clubError } = await supabase.from('clubs').select('*', { count: 'exact', head: true });
      if (clubError) throw clubError;
      
      const { count: centreCount, error: centreError } = await supabase.from('centres').select('*', { count: 'exact', head: true });
      if (centreError) throw centreError;

      setStats({
        totalStudents: allStudents.length,
        totalClubs: clubCount || 0,
        totalCentres: centreCount || 0,
        totalSlots: slotsData?.length || 0,
        clubCapacity,
        centreCapacity,
        clubAllocated: clubAllocatedCount,
        centreAllocated: centreAllocatedCount,
        studentsCompleted: studentsCompletedCount,
        departmentStats,
        genderStats: [
          { name: 'Male', value: maleBooked },
          { name: 'Female', value: femaleBooked }
        ].filter(d => d.value > 0),
        hostelerStats: [
          { name: 'Hosteler', value: hostelerBooked },
          { name: 'Day Scholar', value: dayScholarBooked }
        ].filter(d => d.value > 0),
        topClubs,
        topCentres,
        dayStats,
        recentActivity: recentActivity || []
      });
      
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Failed to fetch advanced stats", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const completionPercentage = stats.totalStudents > 0 
    ? Math.round((stats.studentsCompleted / stats.totalStudents) * 100) 
    : 0;
    
  const clubUtilizationPercentage = stats.clubCapacity > 0 
    ? Math.round((stats.clubAllocated / stats.clubCapacity) * 100) 
    : 0;
    
  const centreUtilizationPercentage = stats.centreCapacity > 0 
    ? Math.round((stats.centreAllocated / stats.centreCapacity) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Overall Analytics Dashboard</h1>
          <p className="text-slate-500 font-medium flex items-center gap-2">
            System-wide Allocation Insights
          </p>
        </div>
        
        <button 
          onClick={() => fetchStats(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 px-4 py-2 rounded-xl font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Syncing...' : `Updated ${lastRefreshed.toLocaleTimeString()}`}
        </button>
      </div>

      {/* Main Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none group-hover:bg-blue-500/10 transition-colors"></div>
          
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="bg-blue-100 p-2.5 rounded-xl">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Booking Progress</h2>
          </div>
          
          <div className="mb-4 relative z-10">
            <div className="flex justify-between items-end mb-2">
              <span className="text-5xl font-black text-slate-900">{stats.studentsCompleted}</span>
              <span className="text-slate-400 font-bold text-lg mb-1">/ {stats.totalStudents} Students</span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out relative"
                style={{ width: `${completionPercentage}%` }}
              >
                <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
              </div>
            </div>
            <div className="flex justify-between items-center mt-3">
              <span className="text-slate-500 text-sm font-semibold">Fully Allocated</span>
              <span className="font-black text-blue-600 text-lg">{completionPercentage}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-colors">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none group-hover:opacity-10 transition-opacity"></div>
          
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="bg-emerald-100 p-2.5 rounded-xl">
              <Activity className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Venues Utilization</h2>
          </div>
          
          <div className="space-y-6 relative z-10">
            {/* Clubs Breakdown */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Clubs</span>
                  <span className="text-3xl font-black text-slate-900">{stats.clubAllocated}</span>
                </div>
                <span className="text-slate-400 font-bold text-sm mb-1">/ {stats.clubCapacity} Seats</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out relative"
                  style={{ width: `${clubUtilizationPercentage}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <span className="font-black text-emerald-600 text-sm">{clubUtilizationPercentage}% Claimed</span>
              </div>
            </div>

            {/* Centres Breakdown */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Centres</span>
                  <span className="text-3xl font-black text-slate-900">{stats.centreAllocated}</span>
                </div>
                <span className="text-slate-400 font-bold text-sm mb-1">/ {stats.centreCapacity} Seats</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out relative"
                  style={{ width: `${centreUtilizationPercentage}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <span className="font-black text-indigo-600 text-sm">{centreUtilizationPercentage}% Claimed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Department Bar Chart */}
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-500" />
            Department Booking Breakdown
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.departmentStats} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600 }} />
                <Bar dataKey="booked" name="Booked" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Demographics Pie Charts */}
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-800 mb-2 uppercase tracking-wider text-center">Gender Demographics</h3>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.genderStats} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">
                    {stats.genderStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {stats.genderStats.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></div>
                  {entry.name}: {entry.value}
                </div>
              ))}
            </div>
          </div>
          
          <div className="border-t-2 border-slate-100 pt-6">
            <h3 className="text-sm font-black text-slate-800 mb-2 uppercase tracking-wider text-center">Hosteler vs Day Scholar</h3>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.hostelerStats} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">
                    {stats.hostelerStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={HOSTEL_COLORS[index % HOSTEL_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {stats.hostelerStats.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: HOSTEL_COLORS[index % HOSTEL_COLORS.length] }}></div>
                  {entry.name}: {entry.value}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Entities Leaderboard */}
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Top Demanded Entities
          </h3>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Top 5 Clubs</h4>
              <div className="space-y-3">
                {stats.topClubs.map((club, i) => (
                  <div key={club.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-blue-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-white font-bold text-xs flex items-center justify-center text-slate-500 shadow-sm border border-slate-200">
                        {i + 1}
                      </div>
                      <span className="font-bold text-sm text-slate-700 truncate max-w-[150px]">{club.name}</span>
                    </div>
                    <span className="font-black text-blue-600 text-sm bg-blue-100 px-2 py-0.5 rounded-lg">{club.count}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="border-t-2 border-slate-100 pt-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Top 5 Centres</h4>
              <div className="space-y-3">
                {stats.topCentres.map((centre, i) => (
                  <div key={centre.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-emerald-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-white font-bold text-xs flex items-center justify-center text-slate-500 shadow-sm border border-slate-200">
                        {i + 1}
                      </div>
                      <span className="font-bold text-sm text-slate-700 truncate max-w-[150px]">{centre.name}</span>
                    </div>
                    <span className="font-black text-emerald-600 text-sm bg-emerald-100 px-2 py-0.5 rounded-lg">{centre.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Day-wise Traffic Visualization */}
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-2 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              Day-wise Seat Allocation Traffic
            </h3>
          </div>
          
          <div className="flex-1 w-full h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.dayStats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ stroke: '#8b5cf6', strokeWidth: 2, strokeDasharray: '5 5' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="count" name="Allocated Seats" stroke="#8b5cf6" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
    </div>
  );
}
