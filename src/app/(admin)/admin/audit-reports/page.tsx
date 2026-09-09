'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Calendar, MapPin, Users, Image as ImageIcon, ExternalLink, RefreshCw, Loader2, User, AlertCircle, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Link from 'next/link';
import { addTechsparkFooter } from '@/lib/pdfFooter';

export default function AuditReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);

  const [filterDate, setFilterDate] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('2026-08-03');
  const [endDate, setEndDate] = useState<string>('');
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
    const localToday = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    setEndDate(localToday);
    setFilterDate(''); // Default to Date Range
    
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

  const exportPDF = async () => {
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
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      let y = 14;

      // 1. Dual Header Logos
      try {
        const logoRes = await fetch('/rit-logo.png');
        const logoBlob = await logoRes.blob();
        const ritDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(logoBlob);
        });
        doc.addImage(ritDataUrl, 'PNG', margin, y, 50, 14);

        const tsRes = await fetch('/techspark-logo.png');
        const tsBlob = await tsRes.blob();
        const tsDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(tsBlob);
        });
        doc.addImage(tsDataUrl, 'PNG', pageWidth - margin - 35, y, 35, 12);
      } catch (e) {
        console.warn("Logo loading failed in exportPDF", e);
      }

      // Title & Subtitle
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138); // blue-900
      doc.text('RAJALAKSHMI INSTITUTE OF TECHNOLOGY', pageWidth / 2, y + 5, { align: 'center' });

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Club & Centre Slot Allocation Portal | Official Audit Report', pageWidth / 2, y + 11, { align: 'center' });

      y += 18;
      doc.setDrawColor(30, 58, 138);
      doc.setLineWidth(1.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      // Executive Title Box
      doc.setFillColor(15, 23, 42); // slate-900
      doc.roundedRect(margin, y, pageWidth - margin * 2, 16, 3, 3, 'F');
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`AUDIT REPORT & COMPLIANCE SUMMARY: ${filterEntity.toUpperCase()}`, margin + 6, y + 10.5);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin - 6, y + 10.5, { align: 'right' });

      y += 22;

      // Metrics Summary Bar
      const totalSessions = entityReports.length;
      const submittedCount = entityReports.filter(r => r.status === 'SUBMITTED').length;
      const pendingCount = entityReports.filter(r => r.status === 'REPORT_PENDING').length;
      const missingCount = entityReports.filter(r => r.status === 'NOT_SUBMITTED').length;
      const complianceRate = totalSessions > 0 ? Math.round(((submittedCount + pendingCount) / totalSessions) * 100) : 0;

      const boxW = (pageWidth - margin * 2 - 12) / 4;
      const metrics = [
        { label: 'TOTAL SESSIONS', val: `${totalSessions}`, color: [30, 41, 59] },
        { label: 'SUBMITTED', val: `${submittedCount}`, color: [22, 163, 74] },
        { label: 'REPORT PENDING', val: `${pendingCount}`, color: [217, 119, 6] },
        { label: 'NOT MARKED', val: `${missingCount}`, color: [220, 38, 38] },
      ];

      metrics.forEach((m, idx) => {
        const bX = margin + idx * (boxW + 4);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(bX, y, boxW, 14, 2, 2, 'FD');
        
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(m.label, bX + boxW / 2, y + 4.5, { align: 'center' });

        doc.setFontSize(10.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(m.color[0], m.color[1], m.color[2]);
        doc.text(m.val, bX + boxW / 2, y + 11, { align: 'center' });
      });

      y += 19;

      // Index Table Header
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text('AUDIT INDEX TABLE', margin, y);
      y += 4;

      const tableColumn = ["S.No", "Date & Day", "Session & Timing", "Venue", "Coordinator", "Expected", "Present", "Status", "Evidence Link"];
      const tableRows = entityReports.map((r, i) => {
        const isSubmitted = r.status === 'SUBMITTED';
        const isPending = r.status === 'REPORT_PENDING';
        const isHoliday = r.status === 'HOLIDAY';
        const isMissing = r.status === 'NOT_SUBMITTED' || (!isSubmitted && !isPending && !isHoliday);

        const dObj = r.date ? new Date(r.date) : null;
        const dStr = (dObj && !isNaN(dObj.getTime()))
          ? dObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : r.date || 'N/A';

        const statusLabel = isSubmitted ? 'SUBMITTED' : isPending ? 'REPORT PENDING' : isHoliday ? 'HOLIDAY' : 'NOT MARKED';

        return [
          i + 1,
          `${dStr} (${r.day || ''})`,
          `${r.session || ''} (${r.timing || ''})`,
          r.venue || 'N/A',
          r.coordinatorName || 'N/A',
          r.expected,
          isMissing || isHoliday ? 0 : r.present,
          statusLabel,
          r.imageUrl ? 'View Photo' : 'No Evidence'
        ];
      });

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 35, fontStyle: 'bold' },
          2: { cellWidth: 45 },
          3: { cellWidth: 25 },
          4: { cellWidth: 40 },
          5: { cellWidth: 18, halign: 'center' },
          6: { cellWidth: 18, halign: 'center' },
          7: { cellWidth: 32, fontStyle: 'bold', halign: 'center' },
          8: { cellWidth: 26, textColor: [37, 99, 235], halign: 'center' }
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 7) {
            if (data.cell.raw === 'SUBMITTED') {
              data.cell.styles.textColor = [22, 163, 74];
            } else if (data.cell.raw === 'REPORT PENDING') {
              data.cell.styles.textColor = [217, 119, 6];
            } else if (data.cell.raw === 'HOLIDAY') {
              data.cell.styles.textColor = [147, 51, 234];
            } else {
              data.cell.styles.textColor = [220, 38, 38];
            }
          }
        },
        didDrawCell: function (data) {
          if (data.section === 'body' && data.column.index === 8) {
            const url = entityReports[data.row.index]?.imageUrl;
            if (url) {
              doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: url });
            }
          }
        }
      });

      await addTechsparkFooter(doc);

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

      // 3. Check if the filterDate is a declared holiday or a Sunday
      const filterDateObj = new Date(filterDate);
      const isSunday = filterDateObj.getDay() === 0;

      let isHoliday = false;
      let holidayReason = '';

      if (isSunday) {
        isHoliday = true;
        holidayReason = 'Sunday (Weekly Off)';
      } else {
        const { data: holidayData } = await supabase
          .from('holidays')
          .select('description')
          .eq('date', filterDate)
          .single();
          
        isHoliday = !!holidayData;
        holidayReason = holidayData?.description || '';
      }

      // 4. Identify Defaulters (Expected but not submitted) ONLY IF NOT A HOLIDAY
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

          if (!isHoliday && entityName && !submittedEntityNames.has(entityName)) {
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

      // 6. Build Defaulters HTML Table
      let defaulterRows = '';
      if (isHoliday) {
        defaulterRows = `<tr><td colspan="4" style="padding: 15px; text-align: center; color: #d97706; font-weight: bold; background-color: #fef3c7;">🚨 Holiday Declared (${holidayReason}). No activities were expected to run.</td></tr>`;
      } else if (defaulters.length === 0) {
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
            <div className="flex gap-2 w-full sm:w-auto">
              <Link 
                href={`/admin/audit-reports/print?entity=${encodeURIComponent(filterEntity)}&startDate=${startDate}&endDate=${endDate}`}
                target="_blank"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-500 transition-colors shadow-sm"
              >
                <ImageIcon className="w-4 h-4" />
                Visual Report
              </Link>
              <button 
                onClick={exportPDF}
                disabled={isGeneratingPDF}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm"
              >
                {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Export PDF
              </button>
            </div>
          )}
          
          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-xs sm:text-sm"
          >
            <option value="ALL">All Clubs & Centres</option>
            {uniqueEntities.map((entity, i) => (
              <option key={i} value={entity as string}>{entity as string}</option>
            ))}
          </select>
          
          {/* Date Range Inputs */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto bg-white p-1.5 border-2 border-slate-200 rounded-xl">
            <div className="flex items-center gap-1 text-xs font-bold text-slate-500 px-2">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Period:</span>
            </div>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
              title="Start Date"
            />
            <span className="text-slate-400 font-bold text-xs">to</span>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
              title="End Date"
            />
            <button 
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setStartDate('2026-08-03');
                setEndDate(today);
                setFilterDate('');
              }}
              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-[11px] border border-blue-200 transition-colors"
              title="Full Academic Term (Aug 3 - Today)"
            >
              Full Term
            </button>
            <button 
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setStartDate(today);
                setEndDate(today);
                setFilterDate(today);
              }}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] border border-slate-200 transition-colors"
            >
              Today
            </button>
          </div>

          <select
            value={filterSession}
            onChange={(e) => setFilterSession(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-xs sm:text-sm"
          >
            <option value="ALL">All Sessions</option>
            <option value="FORENOON">Forenoon</option>
            <option value="AFTERNOON">Afternoon</option>
          </select>
          <button 
            onClick={fetchReports}
            disabled={isLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border-2 border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold hover:border-blue-500 hover:text-blue-600 transition-colors disabled:opacity-50 shadow-sm text-xs sm:text-sm"
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
                const rDate = new Date(r.date).toISOString().split('T')[0];
                if (rDate !== filterDate) return false;
              }
              if (filterSession !== 'ALL' && r.session !== filterSession) return false;
              return true;
            })
            .map((report, idx) => {
              const isSubmitted = report.status === 'SUBMITTED';
              const isPending = report.status === 'REPORT_PENDING';
              const isHoliday = report.status === 'HOLIDAY';
              const isMissing = report.status === 'NOT_SUBMITTED' || (!isSubmitted && !isPending && !isHoliday);

              return (
                <div key={idx} className={`border rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group ${isMissing ? 'bg-red-50/30 border-red-200' : isPending ? 'bg-amber-50/30 border-amber-200' : isHoliday ? 'bg-purple-50/30 border-purple-200' : 'bg-white border-slate-200'}`}>
                  <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform ${isMissing ? 'bg-red-100' : isPending ? 'bg-amber-100' : isHoliday ? 'bg-purple-100' : 'bg-blue-50'}`}></div>
                  
                  <div className="flex items-start justify-between relative">
                    <div>
                      <h3 className="text-lg font-black text-slate-800">{report.entityName}</h3>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        <User className="w-3.5 h-3.5" /> <span className={isMissing ? 'text-red-600 font-bold' : isPending ? 'text-amber-700 font-bold' : isHoliday ? 'text-purple-700 font-bold' : ''}>{report.coordinatorName}</span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1.5">
                      <span className="text-sm font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-lg inline-block border border-slate-200 shadow-xs">
                        📅 {new Date(report.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ({report.day || ''})
                      </span>
                      {isSubmitted ? (
                        <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md inline-block">
                          ✅ SUBMITTED
                        </span>
                      ) : isPending ? (
                        <span className="text-xs font-black text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-md inline-block">
                          ⚠️ REPORT PENDING
                        </span>
                      ) : isHoliday ? (
                        <span className="text-xs font-black text-purple-800 bg-purple-100 border border-purple-300 px-2.5 py-0.5 rounded-md inline-block">
                          🎉 HOLIDAY
                        </span>
                      ) : (
                        <span className="text-xs font-black text-red-700 bg-red-100 border border-red-200 px-2.5 py-0.5 rounded-md inline-block">
                          ❌ ATTENDANCE NOT MARKED
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Session & Timing</p>
                        <p className="text-sm font-bold text-slate-700">{report.session || 'N/A'} {report.timing ? `(${report.timing})` : ''}</p>
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

                  <div className={`rounded-xl p-4 mb-6 border relative ${isMissing ? 'bg-red-50/80 border-red-200' : isPending ? 'bg-amber-50/80 border-amber-200' : isHoliday ? 'bg-purple-50/80 border-purple-200' : 'bg-slate-50 border-slate-100'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isMissing ? 'text-red-500' : isPending ? 'text-amber-600' : isHoliday ? 'text-purple-600' : 'text-slate-400'}`}>Activity Description</p>
                    <p className={`text-sm font-medium leading-relaxed relative z-10 ${isMissing ? 'text-red-800 font-bold' : isPending ? 'text-amber-900 font-semibold' : isHoliday ? 'text-purple-900 font-semibold' : 'text-slate-700 italic'}`}>
                      "{report.description}"
                    </p>
                  </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-5 mt-auto relative z-10">
                <div className="flex gap-2">
                  <div className="px-3 py-1.5 bg-slate-100 rounded-lg">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Expected</span>
                    <span className="text-sm font-black text-slate-700">{report.expected}</span>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg border ${isMissing ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                    <span className={`text-[10px] font-black uppercase tracking-wider block ${isMissing ? 'text-red-600' : 'text-green-600'}`}>Present</span>
                    <span className={`text-sm font-black ${isMissing ? 'text-red-700' : 'text-green-700'}`}>{report.present}</span>
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
          );
        })}
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
                    <div className="relative group rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-50 aspect-video flex items-center justify-center">
                      {(() => {
                        const url = selectedReport.imageUrl;
                        // Foolproof regex to extract Google Drive IDs (which are typically 33 chars of letters, numbers, hyphens, underscores)
                        const match = url.match(/[-\w]{25,}/);
                        const driveId = match ? match[0] : null;
                        
                        if (driveId) {
                          return (
                            <iframe 
                              src={`https://drive.google.com/file/d/${driveId}/preview`}
                              className="w-full h-full border-0 bg-slate-100"
                              allow="autoplay"
                            />
                          );
                        } else {
                           return (
                             <a href={url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-blue-600 transition-colors">
                               <ImageIcon className="w-12 h-12 mb-2" />
                               <span className="text-sm font-bold">Open Evidence Link</span>
                             </a>
                           );
                        }
                      })()}
                      
                      {/* External Link Overlay Button */}
                      <div className="absolute top-3 right-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                        <a 
                          href={selectedReport.imageUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="pointer-events-auto flex items-center gap-2 bg-slate-900/80 backdrop-blur text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors shadow-lg"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Open Full
                        </a>
                      </div>
                    </div>
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
