'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Users, Building2, Layers, Calendar, Activity, CheckCircle, RefreshCw } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClubs: 0,
    totalCentres: 0,
    totalSlots: 0,
    totalCapacity: 0,
    totalAllocated: 0,
    studentsCompleted: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  
  const supabase = createClient();

  const fetchStats = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);

    try {
      // 1. Total Students
      const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
      
      // 2. Clubs & Centres
      const { count: clubCount } = await supabase.from('clubs').select('*', { count: 'exact', head: true });
      const { count: centreCount } = await supabase.from('centres').select('*', { count: 'exact', head: true });
      
      // 3. Slots (Capacity and Allocated)
      const { data: slots } = await supabase.from('slots').select('capacity, allocated_count');
      const totalCapacity = slots?.reduce((acc, slot) => acc + (slot.capacity || 0), 0) || 0;
      const totalAllocated = slots?.reduce((acc, slot) => acc + (slot.allocated_count || 0), 0) || 0;
      
      // 4. Students Completed
      const { data: allocations } = await supabase.from('allocations').select('student_id');
      const studentAllocCounts: Record<string, number> = {};
      allocations?.forEach(a => {
        studentAllocCounts[a.student_id] = (studentAllocCounts[a.student_id] || 0) + 1;
      });
      const studentsCompleted = Object.values(studentAllocCounts).filter(count => count >= 2).length;
      
      setStats({
        totalStudents: studentCount || 0,
        totalClubs: clubCount || 0,
        totalCentres: centreCount || 0,
        totalSlots: slots?.length || 0,
        totalCapacity,
        totalAllocated,
        studentsCompleted
      });
      
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Failed to fetch stats", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Calculate percentages
  const completionPercentage = stats.totalStudents > 0 
    ? Math.round((stats.studentsCompleted / stats.totalStudents) * 100) 
    : 0;
    
  const seatUtilizationPercentage = stats.totalCapacity > 0 
    ? Math.round((stats.totalAllocated / stats.totalCapacity) * 100) 
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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Live Analytics Dashboard</h1>
          <p className="text-slate-500 font-medium flex items-center gap-2">
            System Dashboard
          </p>
        </div>
        
        <button 
          onClick={() => fetchStats(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 px-4 py-2 rounded-xl font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : `Updated ${lastRefreshed.toLocaleTimeString()}`}
        </button>
      </div>

      {/* Main Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Overall Completion */}
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
          
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="bg-blue-100 p-2.5 rounded-xl">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Allocation Progress</h2>
          </div>
          
          <div className="mb-4 relative z-10">
            <div className="flex justify-between items-end mb-2">
              <span className="text-5xl font-black text-slate-900">{stats.studentsCompleted}</span>
              <span className="text-slate-400 font-bold text-lg mb-1">/ {stats.totalStudents} Students</span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center mt-3">
              <span className="text-slate-500 text-sm font-semibold">Fully Allocated (Club & Centre)</span>
              <span className="font-black text-blue-600 text-lg">{completionPercentage}%</span>
            </div>
          </div>
        </div>

        {/* Seat Utilization */}
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
          
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="bg-emerald-100 p-2.5 rounded-xl">
              <Activity className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Seat Utilization</h2>
          </div>
          
          <div className="mb-4 relative z-10">
            <div className="flex justify-between items-end mb-2">
              <span className="text-5xl font-black text-slate-900">{stats.totalAllocated}</span>
              <span className="text-slate-400 font-bold text-lg mb-1">/ {stats.totalCapacity} Total Seats</span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${seatUtilizationPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center mt-3">
              <span className="text-slate-500 text-sm font-semibold">Total Claimed Seats</span>
              <span className="font-black text-emerald-600 text-lg">{seatUtilizationPercentage}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="bg-slate-50 p-4 rounded-xl">
              <Users className="w-6 h-6 text-slate-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Students</p>
              <h3 className="text-3xl font-black text-slate-800 leading-none">{stats.totalStudents}</h3>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="bg-blue-50 p-4 rounded-xl">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Clubs</p>
              <h3 className="text-3xl font-black text-slate-800 leading-none">{stats.totalClubs}</h3>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-50 p-4 rounded-xl">
              <Layers className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Centres</p>
              <h3 className="text-3xl font-black text-slate-800 leading-none">{stats.totalCentres}</h3>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="bg-orange-50 p-4 rounded-xl">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Active Slots</p>
              <h3 className="text-3xl font-black text-slate-800 leading-none">{stats.totalSlots}</h3>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
