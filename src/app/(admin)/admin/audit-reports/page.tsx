'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Calendar, MapPin, Users, Image as ImageIcon, ExternalLink, RefreshCw, Loader2, User, AlertCircle, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function AuditReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);

  const [filterDate, setFilterDate] = useState<string>('');
  const [filterSession, setFilterSession] = useState<string>('ALL');
  const [filterEntity, setFilterEntity] = useState<string>('ALL');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [sendingClubsEmail, setSendingClubsEmail] = useState(false);
  const [sendingCentresEmail, setSendingCentresEmail] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

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
    setIsMounted(true);
    // Set to local date on client side to avoid SSR hydration mismatch
    const today = new Date();
    const localDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    setFilterDate(localDate);
    
    fetchReports();
  }, []);

  if (!isMounted) return null;

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

  const uniqueEntities = Array.from(new Set(reports.map(r => r.entityName))).sort();

  const exportPDF = () => {
    if (filterEntity === 'ALL') return;
    
    setIsGeneratingPDF(true);
    try {
      const entityReports = reports
        .filter(r => r.entityName === filterEntity)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (entityReports.length === 0) {
        alert("No reports found for this entity.");
        setIsGeneratingPDF(false);
        return;
      }

      const doc = new jsPDF('landscape');
      
      doc.setFontSize(18);
      doc.text(`Overall Audit Report: ${filterEntity}`, 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
      
      const tableColumn = ["Date", "Session", "Venue", "Coordinator", "Expected", "Present", "Description", "Evidence Link"];
      const tableRows = entityReports.map(r => [
        new Date(r.date).toLocaleDateString('en-GB'),
        r.session || 'N/A',
        r.venue || 'N/A',
        r.coordinatorName || 'N/A',
        r.expected,
        r.present,
        r.description,
        r.imageUrl ? 'View Photo (Click Here)' : 'No Evidence'
      ]);

      autoTable(doc, {
        startY: 35,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [30, 41, 59] },
        columnStyles: {
          6: { cellWidth: 80 },
          7: { cellWidth: 40, textColor: [37, 99, 235] }
        },
        didDrawCell: function (data) {
          if (data.section === 'body' && data.column.index === 7) {
            const url = entityReports[data.row.index].imageUrl;
            if (url) {
              doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: url });
            }
          }
        }
      });

      doc.save(`${filterEntity.replace(/ /g, '_')}_Overall_Report.pdf`);
    } catch (err) {
      console.error("PDF Error:", err);
      alert("Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const sendOverallEmail = async (type: 'CLUB' | 'CENTRE') => {
    try {
      if (!filterDate) {
        alert("Please select a specific Date to send the Overall Report (needed to identify defaulters).");
        return;
      }

      if (type === 'CLUB') setSendingClubsEmail(true);
      if (type === 'CENTRE') setSendingCentresEmail(true);

      const displayDate = new Date(filterDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      // 1. Fetch Clubs/Centres valid for this type
      const { data: dbData } = await supabase.from(type === 'CLUB' ? 'clubs' : 'centres').select('name');
      if (!dbData) throw new Error(`Failed to fetch ${type} list`);
      const validNames = new Set(dbData.map(d => d.name));

      // 2. Filter visible (submitted) reports
      const visibleReports = reports.filter(r => {
        const rDate = new Date(r.date).toISOString().split('T')[0];
        if (rDate !== filterDate) return false;
        if (filterSession !== 'ALL' && r.session !== filterSession) return false;
        return validNames.has(r.entityName);
      });

      const submittedEntityNames = new Set(visibleReports.map(r => r.entityName));

      // 3. Identify Defaulters (Expected but not submitted)
      const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const targetDay = days[new Date(filterDate).getDay()];

      let query = supabase.from('slots').select(`
        session, venue, club_id, centre_id,
        clubs(name, faculty_name),
        centres(name, faculty_name)
      `).eq('day', targetDay);

      if (filterSession !== 'ALL') {
        query = query.eq('session', filterSession);
      }

      const { data: expectedSlots, error: slotsError } = await query;
      if (slotsError) throw slotsError;

      const defaulters: any[] = [];
      if (expectedSlots) {
        expectedSlots.forEach(slot => {
          // Check if this slot belongs to the requested type
          const isClubSlot = !!slot.club_id;
          const isCentreSlot = !!slot.centre_id;
          
          if (type === 'CLUB' && !isClubSlot) return;
          if (type === 'CENTRE' && !isCentreSlot) return;

          const entityName = isClubSlot ? slot.clubs?.name : slot.centres?.name;
          const facultyName = isClubSlot ? slot.clubs?.faculty_name : slot.centres?.faculty_name;

          if (entityName && !submittedEntityNames.has(entityName)) {
            defaulters.push({
              entityName,
              facultyName: facultyName || 'Coordinator',
              session: slot.session,
              venue: slot.venue || 'N/A'
            });
          }
        });
      }

      if (visibleReports.length === 0 && defaulters.length === 0) {
        alert(`No ${type} activities scheduled or submitted for the selected filters.`);
        return;
      }

      // 4. Build Submitted Reports HTML Table
      let submittedRows = '';
      if (visibleReports.length === 0) {
        submittedRows = '<tr><td colspan="10" style="padding: 15px; text-align: center; color: #64748b; font-style: italic;">No reports submitted yet.</td></tr>';
      } else {
        visibleReports.forEach(r => {
          const absentCount = (r.expected || 0) - (r.present || 0);
          submittedRows += `
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; white-space: nowrap;">${displayDate}</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${r.session || 'N/A'}</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${r.venue || 'N/A'}</td>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${r.entityName}</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${r.coordinatorName}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${r.expected}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #22c55e; font-weight: bold;">${r.present}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #ef4444; font-weight: bold;">${absentCount > 0 ? absentCount : 0}</td>
              <td style="padding: 10px; border: 1px solid #ddd; font-style: italic;">${r.description}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${r.imageUrl ? `<a href="${r.imageUrl}" target="_blank" style="color: #2563eb; text-decoration: none; font-weight: bold;">View</a>` : '-'}</td>
            </tr>
          `;
        });
      }

      // 5. Build Defaulters HTML Table
      let defaulterRows = '';
      if (defaulters.length === 0) {
        defaulterRows = '<tr><td colspan="4" style="padding: 15px; text-align: center; color: #22c55e; font-weight: bold;">🎉 Amazing! All scheduled activities have submitted their reports!</td></tr>';
      } else {
        defaulters.forEach(d => {
          defaulterRows += `
            <tr style="background-color: #fef2f2;">
              <td style="padding: 10px; border: 1px solid #fecaca; font-weight: bold; color: #991b1b;">${d.entityName}</td>
              <td style="padding: 10px; border: 1px solid #fecaca; color: #991b1b;">${d.facultyName}</td>
              <td style="padding: 10px; border: 1px solid #fecaca; color: #991b1b;">${d.session}</td>
              <td style="padding: 10px; border: 1px solid #fecaca; color: #991b1b;">${d.venue}</td>
            </tr>
          `;
        });
      }

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 1200px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Overall ${type === 'CLUB' ? 'Clubs' : 'Centres'} Activity Audit Report</h2>
          <p><strong>Date Filter:</strong> ${displayDate} | <strong>Session Filter:</strong> ${filterSession}</p>
          
          <h3 style="margin-top: 30px; color: #166534;">✅ Submitted Activity Reports</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px;">
            <thead>
              <tr style="background-color: #f0fdf4; color: #166534;">
                <th style="padding: 10px; border: 1px solid #bbf7d0; text-align: left;">Date</th>
                <th style="padding: 10px; border: 1px solid #bbf7d0; text-align: left;">Session</th>
                <th style="padding: 10px; border: 1px solid #bbf7d0; text-align: left;">Venue</th>
                <th style="padding: 10px; border: 1px solid #bbf7d0; text-align: left;">Name</th>
                <th style="padding: 10px; border: 1px solid #bbf7d0; text-align: left;">Faculty</th>
                <th style="padding: 10px; border: 1px solid #bbf7d0; text-align: center;">Expected</th>
                <th style="padding: 10px; border: 1px solid #bbf7d0; text-align: center;">Present</th>
                <th style="padding: 10px; border: 1px solid #bbf7d0; text-align: center;">Absent</th>
                <th style="padding: 10px; border: 1px solid #bbf7d0; text-align: left; width: 30%;">Activity Description</th>
                <th style="padding: 10px; border: 1px solid #bbf7d0; text-align: center;">Evidence</th>
              </tr>
            </thead>
            <tbody>
              ${submittedRows}
            </tbody>
          </table>

          <h3 style="margin-top: 40px; color: #991b1b;">❌ Pending Submissions (Defaulters)</h3>
          <p style="font-size: 13px; color: #64748b;">The following ${type === 'CLUB' ? 'clubs' : 'centres'} were scheduled for an activity but have not submitted a report yet.</p>
          <table style="width: 100%; max-width: 800px; border-collapse: collapse; margin-top: 10px; font-size: 14px;">
            <thead>
              <tr style="background-color: #fee2e2; color: #991b1b;">
                <th style="padding: 10px; border: 1px solid #fecaca; text-align: left;">Name</th>
                <th style="padding: 10px; border: 1px solid #fecaca; text-align: left;">Faculty Coordinator</th>
                <th style="padding: 10px; border: 1px solid #fecaca; text-align: left;">Scheduled Session</th>
                <th style="padding: 10px; border: 1px solid #fecaca; text-align: left;">Scheduled Venue</th>
              </tr>
            </thead>
            <tbody>
              ${defaulterRows}
            </tbody>
          </table>

          <p style="margin-top: 40px; font-size: 12px; color: #64748b;">This is an automated message from the RIT Activity Allocation Portal.</p>
        </div>
      `;

      const targetEmail = type === 'CLUB' ? 'Porchelvi.n@ritchennai.edu.in' : 'ashok.m@ritchennai.edu.in';
      const payload = [{
        to: targetEmail,
        subject: `[RIT Portal] ${displayDate} ${filterSession !== 'ALL' ? filterSession : ''} - Overall ${type === 'CLUB' ? 'Clubs' : 'Centres'} Activity Report`,
        htmlBody
      }];

      const EMAIL_GAS_URL = "https://script.google.com/macros/s/AKfycbxvoRfmASBoYbevaOn5TfIwgxTxLs4BnOMaOPgSwsYFv8ID73by6uiuYIfZi9Y-fSAH/exec";
      const gasRes = await fetch(EMAIL_GAS_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: "send_hod_emails",
          emails: payload
        }),
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        }
      });

      const gasResult = await gasRes.json();
      if (gasResult.success) {
        alert(`Success! Email sent to ${targetEmail}.`);
      } else {
        throw new Error(gasResult.error || "Failed to send email");
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to send email: ${err.message}`);
    } finally {
      if (type === 'CLUB') setSendingClubsEmail(false);
      if (type === 'CENTRE') setSendingCentresEmail(false);
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
        
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full md:w-auto md:justify-end">
          {filterEntity !== 'ALL' && (
            <button 
              onClick={exportPDF}
              disabled={isGeneratingPDF}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm"
            >
              {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Download PDF
            </button>
          )}
          
          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
          >
            <option value="ALL">All Clubs & Centres</option>
            {uniqueEntities.map((entity, i) => (
              <option key={i} value={entity as string}>{entity as string}</option>
            ))}
          </select>
          
          <input 
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
          <select
            value={filterSession}
            onChange={(e) => setFilterSession(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
          >
            <option value="ALL">All Sessions</option>
            <option value="FORENOON">Forenoon</option>
            <option value="AFTERNOON">Afternoon</option>
          </select>
          <button 
            onClick={fetchReports}
            disabled={isLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border-2 border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold hover:border-blue-500 hover:text-blue-600 transition-colors disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-blue-50 border border-blue-100 p-4 rounded-2xl">
        <div className="text-sm font-bold text-blue-800">
          Ready to send reports to the Overall Coordinators?
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={() => sendOverallEmail('CLUB')}
            disabled={sendingClubsEmail || isLoading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            {sendingClubsEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            Email Clubs Report
          </button>
          <button 
            onClick={() => sendOverallEmail('CENTRE')}
            disabled={sendingCentresEmail || isLoading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            {sendingCentresEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            Email Centres Report
          </button>
        </div>
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
          {reports
            .filter(r => {
              if (filterEntity !== 'ALL' && r.entityName !== filterEntity) return false;
              if (filterDate) {
                // The date from GAS might be a full ISO string or YYYY-MM-DD
                const rDate = new Date(r.date).toISOString().split('T')[0];
                if (rDate !== filterDate) return false;
              }
              if (filterSession !== 'ALL' && r.session !== filterSession) return false;
              return true;
            })
            .map((report, idx) => (
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
