'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, RadialBarChart, RadialBar, Legend
} from 'recharts';
import {
  Activity, Users, Building2, TrendingUp, AlertTriangle, Calendar, Layers,
  Loader2, Sparkles, MapPin, ImageIcon, ExternalLink, GraduationCap,
  FileText, Filter, RefreshCw, ChevronDown, Trophy, TrendingDown,
  Eye, ArrowUpRight, ArrowDownRight, BarChart3, Download
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const PERF_COLORS = { CLUB: '#3b82f6', CENTRE: '#8b5cf6' };

export default function ExecutiveDashboard() {
  const [isMounted, setIsMounted] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter states
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [filterEntityType, setFilterEntityType] = useState('ALL');
  const [filterSession, setFilterSession] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);

  // Active tab for leaderboard
  const [leaderboardTab, setLeaderboardTab] = useState<'top' | 'bottom'>('top');

  useEffect(() => {
    setIsMounted(true);
    // Default: last 30 days
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 30);
    setDateFrom(from.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (isMounted && dateFrom && dateTo) {
      fetchData();
    }
  }, [isMounted, dateFrom, dateTo, filterDepartment, filterEntityType, filterSession]);

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (filterDepartment !== 'ALL') params.set('department', filterDepartment);
      if (filterEntityType !== 'ALL') params.set('entityType', filterEntityType);
      if (filterSession !== 'ALL') params.set('session', filterSession);

      const [statsRes, reportsRes] = await Promise.all([
        fetch(`/api/admin/executive-stats?${params.toString()}`),
        fetch('/api/admin/audit-reports')
      ]);

      const statsData = await statsRes.json();
      const reportsData = await reportsRes.json();

      if (statsData.success) {
        setStats(statsData.data);
      } else {
        throw new Error(statsData.error);
      }

      if (reportsData.success) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentReports = reportsData.data
          .filter((r: any) => new Date(r.timestamp) >= sevenDaysAgo)
          .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setReports(recentReports);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const setPresetRange = (days: number) => {
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - days);
    setDateFrom(from.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);
  };

  const resetFilters = () => {
    setFilterDepartment('ALL');
    setFilterEntityType('ALL');
    setFilterSession('ALL');
    setPresetRange(30);
  };

  const hasActiveFilters = filterDepartment !== 'ALL' || filterEntityType !== 'ALL' || filterSession !== 'ALL';

  if (!isMounted) return null;

  if (isLoading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
        <div className="relative w-20 h-20 mb-4">
          <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Compiling Analytics...</h2>
        <p className="text-slate-500 font-medium">Crunching institutional data across all departments</p>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-2 border-red-100 p-6 rounded-2xl flex items-start gap-4">
          <AlertTriangle className="w-8 h-8 text-red-600 shrink-0" />
          <div>
            <h3 className="text-lg font-bold text-red-900">Failed to load analytics</h3>
            <p className="text-red-700 font-medium mt-1">{error}</p>
            <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-100 text-red-800 font-bold rounded-lg hover:bg-red-200">Try Again</button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const kpis = stats.kpis;
  const todayRate = kpis.todaysFootfall.expected > 0 ? Math.round((kpis.todaysFootfall.present / kpis.todaysFootfall.expected) * 100) : 0;

  const coverageData = [
    { name: 'Clubs', value: kpis.totalClubs, fill: '#3b82f6' },
    { name: 'Centres', value: kpis.totalCentres, fill: '#8b5cf6' }
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500 pb-20">

      {/* ═══════════════════════ HEADER + FILTERS ═══════════════════════ */}
      <div className="relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 opacity-5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/4"></div>
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black tracking-widest uppercase mb-2 border border-blue-100">
              <Sparkles className="w-3 h-3" /> Executive Analytics
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Institutional Overview</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {isLoading && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${
                showFilters || hasActiveFilters 
                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-black rounded-md">ON</span>
              )}
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-600 border-2 border-slate-200 rounded-xl font-bold text-sm hover:border-slate-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Expandable Filter Panel */}
        {showFilters && (
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm animate-in slide-in-from-top-2 duration-200 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              
              {/* Date Range Presets */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Quick Range</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '7D', days: 7 },
                    { label: '14D', days: 14 },
                    { label: '30D', days: 30 },
                    { label: '90D', days: 90 },
                  ].map(preset => (
                    <button
                      key={preset.days}
                      onClick={() => setPresetRange(preset.days)}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date From */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              {/* Department Filter */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Department</label>
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Departments</option>
                  {stats.filters.allDepartments.map((d: string) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Entity Type + Session */}
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Type</label>
                  <select
                    value={filterEntityType}
                    onChange={(e) => setFilterEntityType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
                  >
                    <option value="ALL">All</option>
                    <option value="CLUB">Clubs Only</option>
                    <option value="CENTRE">Centres Only</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Session</label>
                  <select
                    value={filterSession}
                    onChange={(e) => setFilterSession(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
                  >
                    <option value="ALL">All Sessions</option>
                    <option value="FORENOON">Forenoon</option>
                    <option value="AFTERNOON">Afternoon</option>
                  </select>
                </div>
              </div>
            </div>
            
            {hasActiveFilters && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                <button onClick={resetFilters} className="text-sm font-bold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                  Reset All Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════ KPI CARDS ═══════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Attendance */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-900/20 relative overflow-hidden group col-span-2 lg:col-span-1">
          <div className="absolute -right-4 -top-4 w-28 h-28 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-blue-200 font-bold text-xs uppercase tracking-wider">Attendance Rate</p>
              <TrendingUp className="w-5 h-5 text-blue-200" />
            </div>
            <h2 className="text-4xl font-black">{kpis.overallAttendanceRate}%</h2>
            <p className="text-blue-200 text-xs font-medium mt-1">{kpis.totalPresent.toLocaleString()} present / {kpis.totalMarked.toLocaleString()} marked</p>
          </div>
        </div>

        {/* Student Coverage */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition-colors relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Coverage</p>
            <Users className="w-5 h-5 text-slate-400" />
          </div>
          <h2 className="text-3xl font-black text-slate-900">
            {kpis.totalStudents > 0 ? Math.round((kpis.totalAllocated / kpis.totalStudents) * 100) : 0}%
          </h2>
          <p className="text-slate-500 text-xs font-medium mt-1">{kpis.totalAllocated.toLocaleString()} / {kpis.totalStudents.toLocaleString()}</p>
          <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-slate-700 rounded-full transition-all duration-1000" style={{ width: `${kpis.totalStudents > 0 ? (kpis.totalAllocated / kpis.totalStudents) * 100 : 0}%` }}></div>
          </div>
        </div>

        {/* Today's Footfall */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm hover:border-emerald-300 transition-colors relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Today's Footfall</p>
            <Activity className="w-5 h-5 text-emerald-500" />
          </div>
          <h2 className="text-3xl font-black text-slate-900">
            {kpis.todaysFootfall.present}
            <span className="text-lg font-bold text-slate-400 ml-1">/ {kpis.todaysFootfall.expected}</span>
          </h2>
          <p className="text-xs font-bold mt-1">
            <span className={todayRate >= 75 ? 'text-emerald-600' : 'text-amber-500'}>{todayRate}% turnout</span>
          </p>
        </div>

        {/* Venues Active */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm hover:border-purple-300 transition-colors relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Active Venues</p>
            <MapPin className="w-5 h-5 text-purple-500" />
          </div>
          <h2 className="text-3xl font-black text-slate-900">{kpis.activeVenues}</h2>
          <p className="text-slate-500 text-xs font-medium mt-1">{kpis.totalClubs} Clubs · {kpis.totalCentres} Centres</p>
        </div>
      </div>

      {/* ═══════════════════════ ROW 2: TREND + CLUBS vs CENTRES ═══════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Attendance Trend */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-500" /> Attendance Trend</h3>
              <p className="text-slate-500 text-xs font-medium mt-0.5">
                {dateFrom && dateTo ? `${new Date(dateFrom).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — ${new Date(dateTo).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Last 30 Days'}
              </p>
            </div>
          </div>
          
          <div className="flex-1 w-full min-h-[280px]">
            {stats.trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} dy={8} interval={Math.max(0, Math.floor(stats.trendData.length / 10))} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} domain={[0, 100]} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.15)', padding: '10px 14px', fontSize: '13px' }}
                    itemStyle={{ fontWeight: 'bold' }}
                    labelStyle={{ color: '#64748b', fontWeight: 600, marginBottom: '2px' }}
                    formatter={(value: number, name: string) => {
                      if (name === 'rate') return [`${value}%`, 'Attendance'];
                      return [value, name];
                    }}
                  />
                  <Area type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRate)" activeDot={{ r: 6, strokeWidth: 0, fill: '#2563eb' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 font-medium bg-slate-50 rounded-xl border border-slate-100">
                No active slots in the selected date range.
              </div>
            )}
          </div>
        </div>

        {/* Clubs vs Centres */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
          <h3 className="text-lg font-black text-slate-800 mb-4">Clubs vs Centres</h3>
          
          <div className="flex-1 space-y-5">
            {stats.performanceComparison.map((item: any, idx: number) => {
              const color = idx === 0 ? '#3b82f6' : '#8b5cf6';
              return (
                <div key={item.name} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-slate-700 flex items-center gap-2">
                      {idx === 0 ? <Building2 className="w-4 h-4" style={{color}} /> : <Layers className="w-4 h-4" style={{color}} />}
                      {item.name}
                    </span>
                    <span className="text-2xl font-black" style={{color}}>{item.rate}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${item.rate}%`, backgroundColor: color }}></div>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-2">{item.present.toLocaleString()} present / {item.total.toLocaleString()} total</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════ ROW 3: LEADERBOARD + DEPARTMENT ATTENDANCE ═══════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Entity Leaderboard */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm flex flex-col max-h-[520px] overflow-hidden">
          <div className="p-5 border-b border-slate-100 shrink-0">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" /> Performance Leaderboard
              </h3>
            </div>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setLeaderboardTab('top')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  leaderboardTab === 'top' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" /> Top 5
              </button>
              <button
                onClick={() => setLeaderboardTab('bottom')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  leaderboardTab === 'bottom' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5" /> Bottom 5
              </button>
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1">
            {(leaderboardTab === 'top' ? stats.topPerformers : stats.bottomPerformers).length > 0 ? (
              <div className="divide-y divide-slate-100">
                {(leaderboardTab === 'top' ? stats.topPerformers : stats.bottomPerformers).map((entity: any, idx: number) => (
                  <div key={idx} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                      leaderboardTab === 'top'
                        ? idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-200 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                        : 'bg-red-50 text-red-600'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 text-sm truncate">{entity.name}</div>
                      <div className="text-xs text-slate-500 font-medium">{entity.type} · {entity.faculty}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-lg font-black ${
                        leaderboardTab === 'top' ? 'text-emerald-600' : 'text-red-600'
                      }`}>{entity.rate}%</div>
                      <div className="text-[10px] text-slate-400 font-bold">{entity.present}/{entity.total}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full p-8 text-slate-400 font-medium text-sm">
                No attendance data for this filter range
              </div>
            )}
          </div>
        </div>

        {/* Department Attendance */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col max-h-[520px]">
          <div className="flex items-center gap-3 mb-4 shrink-0">
            <GraduationCap className="w-5 h-5 text-purple-500" />
            <div>
              <h3 className="text-lg font-black text-slate-800">Department Attendance</h3>
              <p className="text-slate-500 text-xs font-medium">Avg attendance rate by branch</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-1">
            {stats.departmentAttendance.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 pb-2">
                {stats.departmentAttendance.map((dept: any, idx: number) => {
                  // Generate abbreviation for common dept names
                  let abbr = dept.name;
                  if (abbr.includes('Computer Science and Engineering (Artificial Intelligence')) abbr = 'CSE (AIML)';
                  else if (abbr.includes('Computer Science and Engineering (Cyber Security)')) abbr = 'CSE (CYS)';
                  else if (abbr === 'B.E. Computer Science and Engineering') abbr = 'CSE';
                  else if (abbr.includes('Computer and Communication Engineering')) abbr = 'CCE';
                  else if (abbr.includes('Electronics and Communication Engineering')) abbr = 'ECE';
                  else if (abbr.includes('Artificial Intelligence and Data Science')) abbr = 'AI&DS';
                  else if (abbr.includes('Mechanical Engineering')) abbr = 'MECH';
                  else if (abbr.includes('Information Technology')) abbr = 'IT';
                  else if (abbr.includes('Electrical and Electronics Engineering')) abbr = 'EEE';
                  else if (abbr.includes('Civil Engineering')) abbr = 'CIVIL';
                  else if (abbr.includes('Computer Science and Business Systems')) abbr = 'CSBS';
                  else if (abbr.includes('VLSI Design')) abbr = 'VLSI';
                  else if (abbr.includes('Biotechnology')) abbr = 'BIOTECH';
                  else {
                    // Fallback generic abbreviation
                    abbr = abbr.replace(/B\.E\.|B\.Tech\./g, '').trim();
                    if (abbr.length > 8 && abbr.includes(' ')) {
                      abbr = abbr.split(' ').map((w: string) => w[0]).join('').substring(0, 4).toUpperCase();
                    } else if (abbr.length > 8) {
                      abbr = abbr.substring(0, 6).toUpperCase();
                    }
                  }

                  return (
                    <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-100 hover:border-slate-200 transition-colors flex flex-col justify-between" title={dept.name}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-black text-slate-800 tracking-tight">{abbr}</span>
                        <span className={`text-sm font-black ${dept.rate >= 75 ? 'text-emerald-600' : dept.rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {dept.rate}%
                        </span>
                      </div>
                      <div>
                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-1.5">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${dept.rate >= 75 ? 'bg-emerald-500' : dept.rate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${dept.rate}%` }}
                          ></div>
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 text-right">
                          <span className="text-slate-600">{dept.present}</span> present / {dept.total} total
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 font-medium text-sm">
                No attendance data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════ ROW 4: DEPT ALLOCATION + TODAY'S SCHEDULE ═══════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Department Allocation Chart */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <GraduationCap className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="text-lg font-black text-slate-800">Department Allocation</h3>
              <p className="text-slate-500 text-xs font-medium">How many students per dept are allocated</p>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.departmentStats.slice(0, 10)} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} angle={-35} textAnchor="end" height={60} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="allocated" name="Allocated" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="unallocated" name="Unallocated" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Today's Live Schedule */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm flex flex-col max-h-[460px] overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3 shrink-0">
            <Calendar className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-lg font-black text-slate-800">Today's Schedule</h3>
              <p className="text-slate-500 text-xs font-medium">{stats.todaySchedule.length} activities · {kpis.activeVenues} venues</p>
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1">
            {stats.todaySchedule.length > 0 ? (
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="px-5 py-3 border-b border-slate-100">Entity</th>
                    <th className="px-5 py-3 border-b border-slate-100">Session</th>
                    <th className="px-5 py-3 border-b border-slate-100">Venue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stats.todaySchedule.map((slot: any) => (
                    <tr key={slot.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-bold text-slate-800 text-sm">{slot.entityName}</div>
                        <div className="text-[11px] text-slate-500 font-medium">{slot.coordinator}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${
                          slot.session === 'FORENOON' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                        }`}>{slot.session}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1 text-sm font-bold text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {slot.venue || 'TBA'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <MapPin className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500 font-medium">No activities today</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════ ROW 4.5: SEAT CAPACITY + VENUE UTILIZATION ═══════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Seat Capacity + Session Breakdown */}
        <div className="space-y-4">
          {/* Overall Seat Utilization */}
          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg shadow-purple-900/20 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-28 h-28 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-purple-200 font-bold text-xs uppercase tracking-wider">Seat Utilization</p>
                <Layers className="w-5 h-5 text-purple-200" />
              </div>
              <h2 className="text-4xl font-black">{kpis.seatUtilization}%</h2>
              <p className="text-purple-200 text-xs font-medium mt-1">{kpis.totalSeatsAllocated?.toLocaleString()} filled / {kpis.totalSeatCapacity?.toLocaleString()} total seats</p>
            </div>
          </div>

          {/* Session Breakdown */}
          {stats.sessionBreakdown && (
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">Session Breakdown</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-orange-600 flex items-center gap-1.5">☀️ Forenoon</span>
                    <span className="text-sm font-black text-slate-800">
                      {stats.sessionBreakdown.forenoon.allocated}
                      <span className="text-slate-400 text-xs font-normal ml-1">/ {stats.sessionBreakdown.forenoon.capacity}</span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full transition-all duration-700" style={{ width: `${stats.sessionBreakdown.forenoon.capacity > 0 ? Math.round((stats.sessionBreakdown.forenoon.allocated / stats.sessionBreakdown.forenoon.capacity) * 100) : 0}%` }}></div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">{stats.sessionBreakdown.forenoon.slots} slots</p>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5">🌙 Afternoon</span>
                    <span className="text-sm font-black text-slate-800">
                      {stats.sessionBreakdown.afternoon.allocated}
                      <span className="text-slate-400 text-xs font-normal ml-1">/ {stats.sessionBreakdown.afternoon.capacity}</span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${stats.sessionBreakdown.afternoon.capacity > 0 ? Math.round((stats.sessionBreakdown.afternoon.allocated / stats.sessionBreakdown.afternoon.capacity) * 100) : 0}%` }}></div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">{stats.sessionBreakdown.afternoon.slots} slots</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Venue Utilization Table */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm flex flex-col max-h-[460px] overflow-hidden lg:col-span-2">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-violet-500" />
              <div>
                <h3 className="text-lg font-black text-slate-800">Venue Capacity & Utilization</h3>
                <p className="text-slate-500 text-xs font-medium">{stats.venueUtilization?.length || 0} venues across campus</p>
              </div>
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1">
            {stats.venueUtilization && stats.venueUtilization.length > 0 ? (
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="px-5 py-3 border-b border-slate-100">Venue</th>
                    <th className="px-5 py-3 border-b border-slate-100 text-center">Slots</th>
                    <th className="px-5 py-3 border-b border-slate-100 text-center">Capacity</th>
                    <th className="px-5 py-3 border-b border-slate-100 text-center">Filled</th>
                    <th className="px-5 py-3 border-b border-slate-100 text-right">Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stats.venueUtilization.map((v: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-bold text-slate-800 text-sm">{v.venue}</div>
                        <div className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]" title={v.entities.join(', ')}>
                          {v.entities.slice(0, 2).join(', ')}{v.entities.length > 2 ? ` +${v.entities.length - 2}` : ''}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center text-sm font-bold text-slate-600">{v.slotCount}</td>
                      <td className="px-5 py-3 text-center text-sm font-bold text-slate-600">{v.totalCapacity}</td>
                      <td className="px-5 py-3 text-center text-sm font-bold text-slate-800">{v.allocated}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${v.utilization >= 90 ? 'bg-red-500' : v.utilization >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${v.utilization}%` }}></div>
                          </div>
                          <span className={`text-sm font-black ${v.utilization >= 90 ? 'text-red-600' : v.utilization >= 70 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {v.utilization}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-full p-8 text-slate-400 font-medium text-sm">No venue data available</div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════ ROW 5: WEEKLY ACTIVITY FEED ═══════════════════════ */}
      <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden relative border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="p-6 md:p-8 border-b border-slate-800 relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
              <ImageIcon className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Weekly Activity Feed</h2>
              <p className="text-slate-400 font-medium text-sm">Evidence submitted by faculty (Past 7 Days)</p>
            </div>
          </div>
          <div className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-bold text-slate-300">
            {reports.length} Reports
          </div>
        </div>

        <div className="p-6 md:p-8 relative z-10">
          {reports.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {reports.slice(0, 9).map((report, idx) => (
                <div key={idx} className="bg-slate-800/50 backdrop-blur-md rounded-xl border border-slate-700/50 overflow-hidden hover:border-slate-600 transition-colors group">
                  <div className="h-40 bg-slate-900 relative overflow-hidden">
                    {report.imageUrl ? (
                      <a href={report.imageUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full relative">
                        <img
                          src={report.imageUrl.includes('/d/') ? `https://drive.google.com/thumbnail?id=${report.imageUrl.match(/\/d\/(.*?)\//)?.[1]}&sz=w800` : report.imageUrl}
                          alt="Evidence"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                        <div className="absolute inset-0 bg-blue-900/0 group-hover:bg-blue-900/60 transition-colors flex items-center justify-center">
                          <span className="text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-sm">
                            <ExternalLink className="w-4 h-4" /> View
                          </span>
                        </div>
                      </a>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800"><ImageIcon className="w-8 h-8 text-slate-600" /></div>
                    )}
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md">
                      {new Date(report.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-white text-sm leading-tight line-clamp-1">{report.entityName}</h4>
                      <span className={`shrink-0 inline-flex px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest ${
                        report.session === 'FORENOON' ? 'bg-orange-500/20 text-orange-300' : 'bg-blue-500/20 text-blue-300'
                      }`}>{report.session}</span>
                    </div>
                    <div className="space-y-1 mb-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <Users className="w-3 h-3" /> <span className="text-slate-300">{report.coordinatorName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <MapPin className="w-3 h-3" /> <span className="text-slate-300">{report.venue || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-900/50 rounded-lg border border-slate-700/50">
                      <div>
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Expected</div>
                        <div className="text-base font-black text-slate-200">{report.expected}</div>
                      </div>
                      <div>
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Present</div>
                        <div className="text-base font-black text-emerald-400">{report.present}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 flex flex-col items-center justify-center text-center bg-slate-800/30 rounded-xl border border-slate-800 border-dashed">
              <FileText className="w-8 h-8 text-slate-500 mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">No Reports This Week</h3>
              <p className="text-slate-400 text-sm max-w-sm">No activity reports have been submitted in the last 7 days.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
