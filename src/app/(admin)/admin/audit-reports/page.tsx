'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Calendar, MapPin, Users, Image as ImageIcon, ExternalLink, RefreshCw, Loader2, User, AlertCircle, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AuditReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);

  const GAS_URL = "https://script.google.com/macros/s/AKfycbzCt4gzTXrlASBm-fV26GSMPLHprdA5hvNwTH4Ko6NugcxnyB1dX_GSbaz-zLk80zq6/exec";
  const supabase = createClient();

  const fetchReports = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Use local API proxy to avoid browser CORS issues with Google Apps Script
      const res = await fetch('/api/admin/audit-reports');
      const result = await res.json();
      if (result.success) {
        // Sort by timestamp descending
        const sorted = result.data.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setReports(sorted);
      } else {
        setError(result.error || 'Failed to load reports.');
      }
    } catch (err: any) {
      setError('Failed to fetch from Google Sheets: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const openReportDetails = async (report: any) => {
    setSelectedReport(report);
    setIsStudentsLoading(true);
    setStudentsList([]);
    
    try {
      // 1. Fetch allocated students for this slot
      const { data: allocations, error: allocError } = await supabase
        .from('allocations')
        .select(`
          student_id,
          students (
            register_no,
            name,
            course,
            section
          )
        `)
        .eq('slot_id', report.slotId);
        
      if (allocError) throw allocError;

      // 2. Fetch attendance for this slot and date
      const { data: attendance, error: attError } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('slot_id', report.slotId)
        .eq('date', report.date.split('T')[0]);

      if (attError) throw attError;

      // Merge data
      const merged = allocations?.map((a: any) => {
        const att = attendance?.find((at: any) => at.student_id === a.student_id);
        return {
          ...a.students,
          status: att ? att.status : 'UNMARKED'
        };
      }).sort((a: any, b: any) => a.register_no.localeCompare(b.register_no)) || [];

      setStudentsList(merged);
    } catch (err: any) {
      console.error("Failed to fetch details:", err);
    } finally {
      setIsStudentsLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            Activity Audit Reports
          </h1>
          <p className="text-slate-500 font-medium mt-1 text-sm md:text-base">
            Live reports fetched directly from Google Sheets & Drive
          </p>
        </div>
        <button 
          onClick={fetchReports}
          disabled={isLoading}
          className="flex items-center gap-2 bg-white border-2 border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold hover:border-blue-500 hover:text-blue-600 transition-colors disabled:opacity-50 shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl font-bold border-2 border-red-100 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="font-bold">Fetching latest reports from Google...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <FileText className="w-12 h-12 mb-3 opacity-20" />
          <p className="font-bold text-lg">No reports found.</p>
          <p className="text-sm font-medium mt-1">When coordinators submit reports, they will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {reports.map((report, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform"></div>
              
              <div className="flex items-start justify-between relative">
                <div>
                  <h3 className="text-lg font-black text-slate-800">{report.entityName}</h3>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    <User className="w-3.5 h-3.5" /> {report.coordinatorName}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg inline-block">
                    {new Date(report.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Session</p>
                    <p className="text-sm font-bold text-slate-700">{report.session || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Venue</p>
                    <p className="text-sm font-bold text-slate-700 truncate pr-2">{report.venue || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100 relative">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Activity Description</p>
                <p className="text-sm font-medium text-slate-700 leading-relaxed italic relative z-10">
                  "{report.description}"
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-5 mt-auto relative z-10">
                <div className="flex gap-2">
                  <div className="px-3 py-1.5 bg-slate-100 rounded-lg">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Expected</span>
                    <span className="text-sm font-black text-slate-700">{report.expected}</span>
                  </div>
                  <div className="px-3 py-1.5 bg-green-50 border border-green-100 rounded-lg">
                    <span className="text-[10px] font-black text-green-600 uppercase tracking-wider block">Present</span>
                    <span className="text-sm font-black text-green-700">{report.present}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {report.imageUrl && (
                    <a 
                      href={report.imageUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                      title="View Photo Evidence"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </a>
                  )}
                  <button 
                    onClick={() => openReportDetails(report)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    <Users className="w-4 h-4" />
                    Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report Details Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-2xl font-black text-slate-800">{selectedReport.entityName}</h2>
                <p className="text-sm font-bold text-slate-500 mt-1">
                  Report Date: {new Date(selectedReport.date).toLocaleDateString()} | Coordinator: {selectedReport.coordinatorName}
                </p>
              </div>
              <button 
                onClick={() => setSelectedReport(null)}
                className="w-10 h-10 flex items-center justify-center bg-white border-2 border-slate-200 text-slate-500 rounded-full hover:border-slate-800 hover:text-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Activity Summary</h3>
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
                    <p className="text-sm font-medium text-slate-700 leading-relaxed italic">
                      "{selectedReport.description}"
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Photo Evidence</h3>
                  {selectedReport.imageUrl ? (
                    <a href={selectedReport.imageUrl} target="_blank" rel="noopener noreferrer" className="block relative group rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-50 aspect-video flex items-center justify-center">
                      <img 
                        src={selectedReport.imageUrl.includes('/d/') ? `https://drive.google.com/thumbnail?id=${selectedReport.imageUrl.match(/\/d\/(.*?)\//)?.[1]}&sz=w1000` : selectedReport.imageUrl} 
                        alt="Activity Evidence" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to icon if thumbnail fails (e.g. strict sharing permissions)
                          (e.target as HTMLElement).style.display = 'none';
                          e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                        }}
                      />
                      <ImageIcon className="fallback-icon hidden w-12 h-12 text-slate-300 group-hover:scale-110 transition-transform" />
                      <div className="absolute inset-0 bg-blue-900/0 group-hover:bg-blue-900/60 transition-colors flex items-center justify-center">
                        <span className="text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                          <ExternalLink className="w-5 h-5" /> Open in Google Drive
                        </span>
                      </div>
                    </a>
                  ) : (
                    <div className="h-full min-h-[120px] rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 bg-slate-50">
                      <p className="text-sm font-bold">No photo attached</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                  <span>Student Attendance List ({studentsList.length})</span>
                  <div className="flex gap-4">
                    <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded">Present: {studentsList.filter(s => s.status === 'PRESENT').length}</span>
                    <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded">Absent: {studentsList.filter(s => s.status === 'ABSENT').length}</span>
                  </div>
                </h3>
                
                {isStudentsLoading ? (
                  <div className="py-12 flex justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left whitespace-nowrap">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Register No</th>
                          <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Name</th>
                          <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Class</th>
                          <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {studentsList.map((student, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3 text-xs font-bold font-mono text-slate-600">{student.register_no}</td>
                            <td className="px-5 py-3 text-sm font-bold text-slate-800">{student.name}</td>
                            <td className="px-5 py-3 text-xs font-bold text-slate-500">{student.course} - {student.section}</td>
                            <td className="px-5 py-3 text-right">
                              {student.status === 'PRESENT' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black bg-green-100 text-green-700">
                                  PRESENT
                                </span>
                              ) : student.status === 'ABSENT' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black bg-red-100 text-red-700">
                                  ABSENT
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black bg-slate-100 text-slate-500">
                                  UNMARKED
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
