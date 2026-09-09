'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Calendar, Building2, Users, RefreshCw, Loader2, Image as ImageIcon, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

interface FacultyReportsClientProps {
  assignedClubs: any[];
  assignedCentres: any[];
  coordinatorName: string;
}

export default function FacultyReportsClient({
  assignedClubs,
  assignedCentres,
  coordinatorName,
}: FacultyReportsClientProps) {
  const allAssignedEntities = [...assignedClubs, ...assignedCentres];
  
  const [selectedEntity, setSelectedEntity] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('2026-08-03');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAuditReports = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/audit-reports?startDate=${startDate}&endDate=${endDate}`);
      const result = await res.json();
      if (result.success) {
        setReports(result.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch audit reports:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditReports();
  }, [startDate, endDate]);

  const filteredEntities = selectedEntity === 'ALL'
    ? allAssignedEntities
    : allAssignedEntities.filter(e => e.name === selectedEntity);

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-8 rounded-3xl text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full border border-blue-400/30">
              FACULTY REPORTS & AUDIT PORTAL
            </span>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-wider text-white mt-3">
              Activity Audit Reports
            </h1>
            <p className="text-slate-300 text-sm font-medium mt-2 max-w-xl">
              Coordinator: <span className="text-blue-300 font-bold">{coordinatorName}</span> | Monitor submission compliance, view scheduled timetable audit records, and export official PDF reports.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10 text-center shrink-0">
            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-300">Assigned Entities</span>
            <span className="block text-2xl font-black text-white mt-1">{allAssignedEntities.length}</span>
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Entity Selector */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-xs font-black uppercase text-slate-400 tracking-wider shrink-0">Entity:</label>
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="w-full md:w-auto px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-800 text-sm outline-none focus:border-blue-500 transition-all"
          >
            <option value="ALL">All Assigned Clubs & Centres ({allAssignedEntities.length})</option>
            {allAssignedEntities.map((e, idx) => (
              <option key={idx} value={e.name}>{e.name}</option>
            ))}
          </select>
        </div>

        {/* Date Range Inputs & Presets */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 border-2 border-slate-200 rounded-xl">
            <span className="text-xs font-bold text-slate-500 px-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> Period:
            </span>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
              title="Start Date"
            />
            <span className="text-slate-400 font-bold text-xs">to</span>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
              title="End Date"
            />
          </div>

          <button 
            onClick={() => {
              const todayStr = new Date().toISOString().split('T')[0];
              setStartDate('2026-08-03');
              setEndDate(todayStr);
            }}
            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl font-bold text-xs border border-blue-200 transition-colors"
          >
            Full Term
          </button>
          <button 
            onClick={() => {
              const todayStr = new Date().toISOString().split('T')[0];
              setStartDate(todayStr);
              setEndDate(todayStr);
            }}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs border border-slate-200 transition-colors"
          >
            Today
          </button>
          <button 
            onClick={fetchAuditReports}
            disabled={isLoading}
            className="p-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Reports Section Content */}
      <div className="space-y-8">
        {filteredEntities.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-bold text-base">No assigned clubs or centres match your selection.</p>
          </div>
        ) : (
          filteredEntities.map((entity) => {
            const entityReports = reports
              .filter(r => r.entityName === entity.name)
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            const totalSessions = entityReports.length;
            const submittedCount = entityReports.filter(r => r.submitted !== false && r.status !== 'NOT_SUBMITTED').length;
            const missingCount = entityReports.filter(r => r.submitted === false || r.status === 'NOT_SUBMITTED').length;
            const complianceRate = totalSessions > 0 ? Math.round((submittedCount / totalSessions) * 100) : 0;

            return (
              <div key={entity.id} className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
                
                {/* Entity Header & Export Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-100 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 shrink-0">
                      <FileText className="w-7 h-7 text-blue-900" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded">
                          {entity.type || 'Extracurricular Entity'}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded">
                          {complianceRate}% Compliance
                        </span>
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-1">{entity.name}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/audit-reports/print/${encodeURIComponent(entity.name)}?startDate=${startDate}&endDate=${endDate}`}
                      target="_blank"
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-800 hover:to-indigo-800 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md text-xs sm:text-sm shrink-0 border border-blue-800/40"
                    >
                      <ImageIcon className="w-4 h-4 text-blue-300" />
                      View & Download Visual PDF Report
                    </Link>
                  </div>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Total Timetable Slots</span>
                    <span className="block text-2xl font-black text-slate-900 mt-1">{totalSessions}</span>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 text-center">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-emerald-700">Submitted Reports</span>
                    <span className="block text-2xl font-black text-emerald-700 mt-1">{submittedCount}</span>
                  </div>
                  <div className="bg-red-50 p-4 rounded-2xl border border-red-200 text-center">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-red-700">Not Marked</span>
                    <span className="block text-2xl font-black text-red-700 mt-1">{missingCount}</span>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 text-center">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-blue-700">Compliance Rate</span>
                    <span className="block text-2xl font-black text-blue-900 mt-1">{complianceRate}%</span>
                  </div>
                </div>

                {/* Audit Records Table */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                    <span>📊 Activity Audit Records ({startDate} to {endDate})</span>
                    <span className="text-slate-500 font-bold">{entityReports.length} sessions</span>
                  </h4>

                  {isLoading ? (
                    <div className="p-12 text-center text-slate-400 font-bold text-sm">Loading activity audit records...</div>
                  ) : entityReports.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 font-medium text-sm bg-slate-50 rounded-2xl">
                      No audit records found for this period.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-black uppercase tracking-wider">
                          <tr>
                            <th className="p-3 text-center border-b">S.No</th>
                            <th className="p-3 border-b">Date & Day</th>
                            <th className="p-3 border-b">Session & Timing</th>
                            <th className="p-3 border-b">Venue</th>
                            <th className="p-3 text-center border-b">Expected</th>
                            <th className="p-3 text-center border-b">Present</th>
                            <th className="p-3 text-center border-b">Status</th>
                            <th className="p-3 text-center border-b">Evidence</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {entityReports.map((r, i) => {
                            const isMissing = r.submitted === false || r.status === 'NOT_SUBMITTED';
                            const dObj = r.date ? new Date(r.date) : null;
                            const dStr = (dObj && !isNaN(dObj.getTime()))
                              ? dObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                              : r.date || 'N/A';

                            return (
                              <tr key={i} className={isMissing ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-slate-50'}>
                                <td className="p-2.5 text-center font-bold text-slate-400">{i + 1}</td>
                                <td className="p-2.5 font-black text-slate-800">{dStr} ({r.day || ''})</td>
                                <td className="p-2.5 text-slate-700 font-semibold">{r.session} ({r.timing || ''})</td>
                                <td className="p-2.5 font-bold text-slate-600">{r.venue || 'N/A'}</td>
                                <td className="p-2.5 text-center font-black text-slate-700">{r.expected}</td>
                                <td className="p-2.5 text-center font-black">{isMissing ? <span className="text-red-600">0</span> : <span className="text-emerald-700">{r.present}</span>}</td>
                                <td className="p-2.5 text-center">
                                  {isMissing ? (
                                    <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded font-black text-[10px]">NOT MARKED</span>
                                  ) : (
                                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-black text-[10px]">SUBMITTED</span>
                                  )}
                                </td>
                                <td className="p-2.5 text-center font-bold">
                                  {r.imageUrl ? (
                                    <a href={r.imageUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                                      View Photo <ExternalLink className="w-3 h-3" />
                                    </a>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
