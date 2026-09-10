'use client';

import React, { useEffect, useState, use } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function PrintReportPage({ params }: { params: Promise<{ entity?: string }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();

  const initialStart = searchParams.get('startDate') || '2026-08-03';
  const initialEnd = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState<string>(initialStart);
  const [endDate, setEndDate] = useState<string>(initialEnd);
  
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [allEntities, setAllEntities] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [facultyCoordinator, setFacultyCoordinator] = useState<string>('');
  
  // Student attendance details option toggle
  const [includeStudentDetails, setIncludeStudentDetails] = useState(false);
  const [isFetchingStudents, setIsFetchingStudents] = useState(false);
  const [studentsMap, setStudentsMap] = useState<Record<string, any[]>>({});

  // Extract entity name from URL params or query searchParam and decode it properly
  const entityParam = searchParams.get('entity') || resolvedParams.entity || '';
  const entityName = decodeURIComponent(entityParam);

  useEffect(() => {
    const fetchReportsAndFaculty = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const targetName = entityName.trim().toLowerCase();

        // 1. Fetch faculty coordinator name from clubs or centres
        const { data: club } = await supabase.from('clubs').select('faculty_name').ilike('name', entityName).maybeSingle();
        const { data: centre } = await supabase.from('centres').select('faculty_name').ilike('name', entityName).maybeSingle();
        const faculty = club?.faculty_name || centre?.faculty_name || 'Faculty Coordinator';
        setFacultyCoordinator(faculty);

        // 2. Fetch reports with date range
        const res = await fetch(`/api/admin/audit-reports?startDate=${startDate}&endDate=${endDate}`);
        const result = await res.json();
        if (result.success) {
          const entities = [...new Set(result.data.map((r: any) => r.entityName))] as string[];
          setAllEntities(entities);
          
          const filtered = result.data
            .filter((r: any) => r.entityName && r.entityName.trim().toLowerCase() === targetName)
            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setReports(filtered);
        } else {
          setError(result.error || 'Failed to load reports.');
        }
      } catch (err: any) {
        setError('Failed to fetch audit data: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportsAndFaculty();
  }, [entityName, startDate, endDate]);

  const fetchStudentsForReports = async (reportsList: any[]) => {
    setIsFetchingStudents(true);
    try {
      const supabase = createClient();
      const slotIds = Array.from(new Set(reportsList.map((r: any) => r.slotId).filter(Boolean)));
      if (slotIds.length === 0) return {};

      const { data: allocations } = await supabase
        .from('allocations')
        .select('slot_id, student_id, students(register_no, name, course, section)')
        .in('slot_id', slotIds);

      const { data: attendance } = await supabase
        .from('attendance')
        .select('slot_id, date, student_id, status')
        .in('slot_id', slotIds);

      const map: Record<string, any[]> = {};

      reportsList.forEach((r: any) => {
        if (!r.slotId) return;
        const rDateStr = r.date ? new Date(r.date).toISOString().split('T')[0] : '';
        const key = `${r.slotId}_${rDateStr}`;

        const slotAllocs = (allocations || []).filter((a: any) => a.slot_id === r.slotId);
        const slotAtts = (attendance || []).filter((at: any) => at.slot_id === r.slotId && at.date === rDateStr);

        const merged = slotAllocs.map((a: any) => {
          const att = slotAtts.find((at: any) => at.student_id === a.student_id);
          return {
            register_no: a.students?.register_no || '',
            name: a.students?.name || '',
            course: a.students?.course || '',
            section: a.students?.section || '',
            status: att ? att.status : 'UNMARKED'
          };
        }).sort((a: any, b: any) => a.register_no.localeCompare(b.register_no));

        map[key] = merged;
      });

      setStudentsMap(map);
      return map;
    } catch (err) {
      console.error("Failed to fetch student details for report:", err);
      return {};
    } finally {
      setIsFetchingStudents(false);
    }
  };

  const handleToggleStudentDetails = async (checked: boolean) => {
    setIncludeStudentDetails(checked);
    if (checked && Object.keys(studentsMap).length === 0) {
      await fetchStudentsForReports(reports);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-slate-500 font-medium">Preparing Institutional Audit Report Cover Page...</p>
      </div>
    );
  }

  if (error) {
    return <div className="p-10 text-red-600 font-bold text-center">Error: {error}</div>;
  }

  if (reports.length === 0) {
    return (
      <div className="p-10 text-center">
        <p className="text-slate-700 font-black text-lg mb-2">No reports found for:</p>
        <p className="text-red-600 font-bold bg-red-50 px-4 py-2 rounded-lg inline-block mb-6">"{entityName}"</p>
        {allEntities.length > 0 && (
          <div className="mt-4">
            <p className="text-slate-500 font-bold mb-3 text-sm">Available entities in Google Sheets:</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
              {allEntities.map((e, i) => (
                <a key={i} href={`/admin/audit-reports/print/${encodeURIComponent(e)}`}
                  className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-600 hover:text-white transition-colors">
                  {e}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const toBase64 = async (url: string, isPng = false, timeoutMs = 4000): Promise<string | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          if (!isPng) { resolve(dataUrl); return; }
          const img = new window.Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d')!;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          };
          img.onerror = () => resolve(dataUrl);
          img.src = dataUrl;
        };
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const downloadPDF = async () => {
    setIsDownloading(true);
    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      // Fetch student data if toggle is ON and map is empty
      let currentStudentsMap = studentsMap;
      if (includeStudentDetails && Object.keys(studentsMap).length === 0) {
        currentStudentsMap = await fetchStudentsForReports(reports);
      }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 14;

      // ----------------------------------------------------
      // PAGE 1: INSTITUTIONAL COVER PAGE
      // ----------------------------------------------------
      // Top Accent Line
      doc.setFillColor(30, 58, 138); // Deep Navy Blue
      doc.rect(0, 0, pageWidth, 6, 'F');

      // Logos: RIT Logo on left, Techspark Logo on right
      try {
        const logoData = await toBase64('/rit-logo.png', true);
        if (logoData) {
          const logoH = 18;
          const logoW = logoH * 4.5;
          doc.addImage(logoData, 'PNG', margin, 12, logoW, logoH);
        }
      } catch {}

      try {
        const tsData = await toBase64('/techspark-logo.png', true);
        if (tsData) {
          const tsH = 14;
          const tsW = tsH * 3.5;
          doc.addImage(tsData, 'PNG', pageWidth - margin - tsW, 14, tsW, tsH);
        }
      } catch {}

      // Institutional Title
      let y = 36;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text('RAJALAKSHMI INSTITUTE OF TECHNOLOGY', pageWidth / 2, y, { align: 'center' });

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Autonomous Institution, Affiliated to Anna University | Accredited by NAAC', pageWidth / 2, y + 5, { align: 'center' });
      doc.text('CLUB & CENTRE SLOT ALLOCATION PORTAL', pageWidth / 2, y + 9, { align: 'center' });

      y += 15;

      // Official Report Banner
      doc.setFillColor(30, 58, 138);
      doc.roundedRect(margin, y, pageWidth - margin * 2, 10, 2, 2, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('OFFICIAL ACTIVITY AUDIT & COMPLIANCE REPORT', pageWidth / 2, y + 6.8, { align: 'center' });

      y += 16;

      // Entity & Coordinator Metadata Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, pageWidth - margin * 2, 26, 3, 3, 'FD');

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(entityName.toUpperCase(), margin + 6, y + 7);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Faculty Coordinator:', margin + 6, y + 14);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 58, 138);
      doc.text(facultyCoordinator || 'Faculty Coordinator', margin + 42, y + 14);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Academic Year:', margin + 6, y + 20);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text('2026 - 2027', margin + 34, y + 20);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Generated Date:', pageWidth - margin - 50, y + 14);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(new Date().toLocaleDateString('en-GB'), pageWidth - margin - 22, y + 14);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Audit Status:', pageWidth - margin - 50, y + 20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 163, 74);
      doc.text('VERIFIED', pageWidth - margin - 22, y + 20);

      y += 32;

      // Executive Summary Metrics Bar
      const totalSessions = reports.length;
      const submittedCount = reports.filter(r => r.status === 'SUBMITTED').length;
      const pendingCount = reports.filter(r => r.status === 'REPORT_PENDING').length;
      const missingCount = reports.filter(r => r.status === 'NOT_SUBMITTED').length;
      const complianceRate = totalSessions > 0 ? Math.round(((submittedCount + pendingCount) / totalSessions) * 100) : 0;

      const boxWidth = (pageWidth - margin * 2 - 9) / 4;
      const metricBoxes = [
        { label: 'TOTAL SESSIONS', val: `${totalSessions}`, color: [30, 41, 59] },
        { label: 'SUBMITTED', val: `${submittedCount}`, color: [22, 163, 74] },
        { label: 'REPORT PENDING', val: `${pendingCount}`, color: [217, 119, 6] },
        { label: 'NOT MARKED', val: `${missingCount}`, color: [220, 38, 38] },
      ];

      metricBoxes.forEach((box, bIdx) => {
        const bX = margin + bIdx * (boxWidth + 3);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(bX, y, boxWidth, 14, 2, 2, 'FD');
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(box.label, bX + boxWidth / 2, y + 4.5, { align: 'center' });
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(box.color[0], box.color[1], box.color[2]);
        doc.text(box.val, bX + boxWidth / 2, y + 10.5, { align: 'center' });
      });

      y += 19;

      // Index Table Header
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text('AUDIT INDEX & EXECUTIVE SUMMARY TABLE', margin, y);
      y += 4;

      const indexRows = reports.map((r, i) => {
        const isSubmitted = r.status === 'SUBMITTED';
        const isPending = r.status === 'REPORT_PENDING';
        const isMissing = r.status === 'NOT_SUBMITTED' || (!isSubmitted && !isPending);

        const dObj = r.date ? new Date(r.date) : null;
        const dStr = (dObj && !isNaN(dObj.getTime()))
          ? dObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : r.date || 'N/A';

        const statusText = isSubmitted ? 'SUBMITTED' : isPending ? 'REPORT PENDING' : 'NOT MARKED';

        return [
          i + 1,
          `${dStr} (${r.day || ''})`,
          `${r.session || ''} (${r.timing || ''})`,
          r.venue || 'N/A',
          r.expected || 0,
          isMissing ? 0 : r.present || 0,
          statusText
        ];
      });

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['S.No', 'Date & Day', 'Session & Timing', 'Venue', 'Expected', 'Present', 'Status']],
        body: indexRows,
        styles: { fontSize: 7.5, cellPadding: 1.8 },
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 38, fontStyle: 'bold' },
          2: { cellWidth: 50 },
          3: { cellWidth: 20 },
          4: { cellWidth: 18, halign: 'center' },
          5: { cellWidth: 18, halign: 'center' },
          6: { cellWidth: 28, fontStyle: 'bold', halign: 'center' }
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 6) {
            if (data.cell.raw === 'SUBMITTED') {
              data.cell.styles.textColor = [22, 163, 74];
            } else if (data.cell.raw === 'REPORT PENDING') {
              data.cell.styles.textColor = [217, 119, 6];
            } else {
              data.cell.styles.textColor = [220, 38, 38];
            }
          }
        }
      });

      // ----------------------------------------------------
      // PAGE 2 ONWARDS: DETAILED ACTIVITY & SESSION CARDS
      // ----------------------------------------------------
      doc.addPage();
      y = 15;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text('DETAILED ACTIVITY & SESSION AUDIT CARDS', margin, y);
      y += 8;

      for (let idx = 0; idx < reports.length; idx++) {
        const report = reports[idx];

        // Add new page if not enough space
        if (y > pageHeight - 80) {
          doc.addPage();
          y = 15;
        }

        const isSubmitted = report.status === 'SUBMITTED';
        const isPending = report.status === 'REPORT_PENDING';
        const isMissing = report.status === 'NOT_SUBMITTED' || (!isSubmitted && !isPending);

        const dateObj = report.date ? new Date(report.date) : null;
        const dateStr = (dateObj && !isNaN(dateObj.getTime()))
          ? dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : report.date || 'N/A';

        // Section header
        if (isMissing) {
          doc.setFillColor(220, 38, 38); // Red for missing
        } else if (isPending) {
          doc.setFillColor(217, 119, 6); // Amber for report pending
        } else {
          doc.setFillColor(30, 58, 138); // Blue for submitted
        }
        doc.roundedRect(margin, y, pageWidth - margin * 2, 8, 2, 2, 'F');
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        
        if (isMissing) {
          doc.text(`${idx + 1}. Date: ${dateStr} (${report.day || 'N/A'}) [${report.timing || report.session}]   |   Status: ATTENDANCE NOT MARKED`, margin + 3, y + 5.5);
        } else if (isPending) {
          doc.text(`${idx + 1}. Date: ${dateStr} (${report.day || 'N/A'}) [${report.timing || report.session}]   |   Coordinator: ${report.coordinatorName} (REPORT PENDING)`, margin + 3, y + 5.5);
        } else {
          doc.text(`${idx + 1}. Date: ${dateStr} (${report.day || 'N/A'}) [${report.timing || report.session}]   |   Coordinator: ${report.coordinatorName}`, margin + 3, y + 5.5);
        }
        y += 11;

        // Details row
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 65, 85);
        doc.text('Timing:', margin, y + 5);
        doc.setFont('helvetica', 'normal');
        doc.text(`${report.session || ''} (${report.timing || 'N/A'})`, margin + 15, y + 5);
        doc.setFont('helvetica', 'bold');
        doc.text('Venue:', margin + 75, y + 5);
        doc.setFont('helvetica', 'normal');
        doc.text(report.venue || 'N/A', margin + 87, y + 5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(22, 163, 74);
        doc.text(`Expected: ${report.expected}`, margin + 120, y + 5);
        
        if (!isMissing) {
          doc.setTextColor(21, 128, 61);
          doc.text(`Present: ${report.present}`, margin + 145, y + 5);
        } else {
          doc.setTextColor(220, 38, 38);
          doc.text(`Present: 0`, margin + 145, y + 5);
        }
        y += 9;

        // Description
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        if (isMissing) {
          doc.setTextColor(220, 38, 38);
        } else {
          doc.setTextColor(71, 85, 105);
        }
        const cleanDesc = (report.description || '').replace(/[^\x00-\x7F]/g, '');
        const descLines = doc.splitTextToSize(`"${cleanDesc}"`, pageWidth - margin * 2 - 65);
        doc.text(descLines, margin, y + 5);

        // Image
        if (report.imageUrl) {
          const match = report.imageUrl.match(/[-\w]{25,}/);
          const driveId = match ? match[0] : null;
          if (driveId) {
            const driveUrl = `https://drive.google.com/uc?export=view&id=${driveId}`;
            const proxiedUrl = `/api/admin/proxy-image?url=${encodeURIComponent(driveUrl)}`;
            const imgData = await toBase64(proxiedUrl, false);
            
            if (imgData) {
              const imgX = pageWidth - margin - 55;
              const imgY = y;
              doc.addImage(imgData, 'JPEG', imgX, imgY, 55, 40);
              doc.setDrawColor(226, 232, 240);
              doc.setLineWidth(0.3);
              doc.rect(imgX, imgY, 55, 40);
            }
          }
        }

        y += Math.max(descLines.length * 4 + 10, 48);

        // OPTIONAL: Include Student Details Table in PDF if turned ON
        if (includeStudentDetails) {
          const rDateStr = report.date ? new Date(report.date).toISOString().split('T')[0] : '';
          const key = `${report.slotId}_${rDateStr}`;
          const stList = (currentStudentsMap || studentsMap)[key] || [];

          if (stList.length > 0) {
            if (y > pageHeight - 50) {
              doc.addPage();
              y = 15;
            }

            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 58, 138);
            doc.text(`Student Attendance Roll (${stList.length} Students)`, margin, y + 4);
            y += 6;

            autoTable(doc, {
              startY: y,
              margin: { left: margin, right: margin },
              head: [['#', 'Register No', 'Student Name', 'Course & Sec', 'Status']],
              body: stList.map((st: any, i: number) => [
                i + 1,
                st.register_no,
                st.name,
                `${st.course} (${st.section})`,
                st.status
              ]),
              styles: { fontSize: 7, cellPadding: 1.5 },
              headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
              columnStyles: {
                0: { cellWidth: 8 },
                1: { cellWidth: 28, fontStyle: 'bold' },
                2: { cellWidth: 60, fontStyle: 'bold' },
                3: { cellWidth: 62 },
                4: { cellWidth: 22, fontStyle: 'bold' }
              },
              didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 4) {
                  if (data.cell.raw === 'PRESENT') {
                    data.cell.styles.textColor = [22, 163, 74];
                  } else if (data.cell.raw === 'ABSENT') {
                    data.cell.styles.textColor = [220, 38, 38];
                  } else {
                    data.cell.styles.textColor = [217, 119, 6];
                  }
                }
              }
            });
            y = (doc as any).lastAutoTable.finalY + 8;
          }
        }

        // Separator
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;
      }

      // Footer with Techspark logo on last page
      try {
        const tsData = await toBase64('/techspark-logo.png', true);
        if (tsData) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(148, 163, 184);

          const tsWidth = 28;
          const tsHeight = 8;
          const rightMargin = 15;
          const textStr = 'Managed by';
          const textWidth = doc.getTextWidth(textStr);

          const logoX = pageWidth - rightMargin - tsWidth;
          const logoY = pageHeight - 16;
          const textX = logoX - textWidth - 3;
          const textY = logoY + 5.5;

          doc.text(textStr, textX, textY);
          doc.addImage(tsData, 'PNG', logoX, logoY, tsWidth, tsHeight);
        }
      } catch {}

      doc.save(`${entityName.replace(/\s+/g, '_')}_Visual_Report.pdf`);
    } catch (err) {
      console.error(err);
      alert('PDF generation failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const totalSessions = reports.length;
  const submittedCount = reports.filter(r => r.status === 'SUBMITTED').length;
  const pendingCount = reports.filter(r => r.status === 'REPORT_PENDING').length;
  const missingCount = reports.filter(r => r.status === 'NOT_SUBMITTED').length;
  const complianceRate = totalSessions > 0 ? Math.round(((submittedCount + pendingCount) / totalSessions) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-100 py-8">
      {/* Non-printable controls */}
      <div className="print:hidden max-w-[210mm] mx-auto mb-6 p-4 bg-slate-900 text-white rounded-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sticky top-4 z-50 shadow-xl border border-slate-800">
        <div>
          <h1 className="font-bold text-lg">Visual Report: {entityName}</h1>
          <p className="text-xs text-slate-400">{reports.length} timetable slot(s) & activity report(s)</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Date Range Inputs */}
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 p-1.5 rounded-xl text-xs font-bold">
            <span className="text-slate-400 px-1 text-[11px]">Period:</span>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-900 text-slate-200 border border-slate-700 rounded px-2 py-1 text-xs outline-none focus:border-blue-400"
            />
            <span className="text-slate-500 text-[10px]">to</span>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-900 text-slate-200 border border-slate-700 rounded px-2 py-1 text-xs outline-none focus:border-blue-400"
            />
          </div>

          <label className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700/80 px-3 py-2 rounded-xl cursor-pointer text-xs font-bold border border-slate-700 transition-all select-none">
            <input 
              type="checkbox" 
              checked={includeStudentDetails} 
              onChange={(e) => handleToggleStudentDetails(e.target.checked)}
              className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
            />
            <span className="text-slate-200 flex items-center gap-1.5 text-xs">
              📋 Student Roll
              {isFetchingStudents && <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full"></span>}
            </span>
          </label>

          <button 
            onClick={downloadPDF}
            disabled={isDownloading || isFetchingStudents}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 text-xs shadow-sm"
          >
            {isDownloading ? (
              <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> Generating PDF...</>
            ) : (
              '⬇ Download PDF'
            )}
          </button>
        </div>
      </div>

      {/* Printable Area - Standard A4 styling */}
      <div className="w-full max-w-[210mm] mx-auto bg-white min-h-[297mm] p-8 md:p-12 text-slate-900 rounded-2xl shadow-xl border border-slate-200" style={{ margin: '0 auto' }}>
        
        {/* Institutional Header with Dual Logos */}
        <div className="flex items-center justify-between border-b-4 border-blue-900 pb-6 mb-8">
          <div className="flex-1">
            <Image src="/rit-logo.png" alt="RIT Logo" width={260} height={70} priority className="object-contain" />
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-black text-blue-900 tracking-tight">RAJALAKSHMI INSTITUTE OF TECHNOLOGY</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Autonomous Institution | Affiliated to Anna University</p>
            <p className="text-[11px] font-black text-blue-950 uppercase tracking-wider mt-1 bg-blue-50 py-0.5 px-2 rounded inline-block border border-blue-200">
              Club & Centre Slot Allocation Portal
            </p>
          </div>
          <div className="flex-1 flex justify-end">
            <Image src="/techspark-logo.png" alt="TechSpark Logo" width={140} height={50} priority className="object-contain" />
          </div>
        </div>

        {/* Official Executive Cover Title Card */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-8 rounded-2xl border border-slate-800 text-white mb-8 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl"></div>
          
          <div className="text-center mb-6">
            <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full border border-blue-400/30">
              OFFICIAL ACTIVITY AUDIT & COMPLIANCE REPORT
            </span>
            <h2 className="text-3xl font-black uppercase tracking-wider text-white mt-3">{entityName}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10 text-xs font-medium mb-6">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Faculty Coordinator</span>
              <span className="text-blue-200 font-bold text-sm">{facultyCoordinator}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Report Audit Period</span>
              <span className="text-blue-300 font-bold text-xs">{startDate} to {endDate}</span>
            </div>
            <div className="md:text-right">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Academic Year & Status</span>
              <span className="text-white font-bold text-sm">2026-2027 <span className="text-emerald-400 text-xs ml-2">✓ VERIFIED AUDIT</span></span>
            </div>
          </div>
          
          {/* Executive Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-white/10">
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl text-center">
              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-300">Total Sessions</span>
              <span className="block text-xl font-black text-white mt-1">{totalSessions}</span>
            </div>
            <div className="bg-emerald-500/20 backdrop-blur-sm p-3 rounded-xl text-center border border-emerald-400/20">
              <span className="block text-[10px] font-black uppercase tracking-widest text-emerald-300">Submitted</span>
              <span className="block text-xl font-black text-emerald-400 mt-1">{submittedCount}</span>
            </div>
            <div className="bg-amber-500/20 backdrop-blur-sm p-3 rounded-xl text-center border border-amber-400/20">
              <span className="block text-[10px] font-black uppercase tracking-widest text-amber-300">Report Pending</span>
              <span className="block text-xl font-black text-amber-400 mt-1">{pendingCount}</span>
            </div>
            <div className="bg-red-500/20 backdrop-blur-sm p-3 rounded-xl text-center border border-red-400/20">
              <span className="block text-[10px] font-black uppercase tracking-widest text-red-300">Not Marked</span>
              <span className="block text-xl font-black text-red-400 mt-1">{missingCount}</span>
            </div>
          </div>
        </div>

        {/* INDEX SUMMARY TABLE (Page 1 Web View) */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 mb-12 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-blue-900 uppercase tracking-wider flex items-center gap-2">
                📊 Audit Index & Executive Summary Table
              </h3>
              <p className="text-xs text-slate-500 font-bold mt-0.5">
                Official table of contents & compliance summary for all scheduled sessions.
              </p>
            </div>
            <span className="text-[10px] font-black bg-blue-50 text-blue-700 px-3 py-1 rounded-lg border border-blue-200 uppercase tracking-widest">
              PDF Front Cover Page
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-black uppercase tracking-wider">
                <tr>
                  <th className="p-2.5 border-b text-center">S.No</th>
                  <th className="p-2.5 border-b">Date & Day</th>
                  <th className="p-2.5 border-b">Session & Timing</th>
                  <th className="p-2.5 border-b">Venue</th>
                  <th className="p-2.5 border-b text-center">Expected</th>
                  <th className="p-2.5 border-b text-center">Present</th>
                  <th className="p-2.5 border-b text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {reports.map((r, i) => {
                  const isSubmitted = r.status === 'SUBMITTED';
                  const isPending = r.status === 'REPORT_PENDING';
                  const isNotMarked = r.status === 'NOT_SUBMITTED' || (!isSubmitted && !isPending);
                  
                  const dObj = r.date ? new Date(r.date) : null;
                  const dStr = (dObj && !isNaN(dObj.getTime()))
                    ? dObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : r.date || 'N/A';

                  return (
                    <tr key={i} className={isNotMarked ? 'bg-red-50/40 hover:bg-red-50/70' : isPending ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50'}>
                      <td className="p-2 text-center font-bold text-slate-400">{i + 1}</td>
                      <td className="p-2 font-black text-slate-800">{dStr} ({r.day || ''})</td>
                      <td className="p-2 text-slate-700 font-semibold">{r.session} {r.timing ? `(${r.timing})` : ''}</td>
                      <td className="p-2 font-bold text-slate-600">{r.venue || 'N/A'}</td>
                      <td className="p-2 text-center font-black text-slate-700">{r.expected}</td>
                      <td className="p-2 text-center font-black">{isNotMarked ? <span className="text-red-600">0</span> : <span className="text-emerald-700">{r.present}</span>}</td>
                      <td className="p-2 text-center">
                        {isSubmitted ? (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-black text-[10px]">SUBMITTED</span>
                        ) : isPending ? (
                          <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded font-black text-[10px]">REPORT PENDING</span>
                        ) : (
                          <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded font-black text-[10px]">NOT MARKED</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Events Loop */}
        <div className="space-y-16">
          <div className="border-b-2 border-blue-900 pb-2 mb-6">
            <h3 className="text-lg font-black text-blue-900 uppercase tracking-wider">
              Detailed Activity & Session Audit Cards
            </h3>
          </div>

          {reports.map((report, idx) => {
            const isSubmitted = report.status === 'SUBMITTED';
            const isPending = report.status === 'REPORT_PENDING';
            const isNotMarked = report.status === 'NOT_SUBMITTED' || (!isSubmitted && !isPending);
            const isMissing = isNotMarked;
            
            const rDateStr = report.date ? new Date(report.date).toISOString().split('T')[0] : '';
            const key = `${report.slotId}_${rDateStr}`;
            const studentList = studentsMap[key] || [];

            return (
              <div key={idx} className="page-break-inside-avoid">
                <div className="flex items-center justify-between border-b-2 border-slate-100 pb-2 mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xl shrink-0 ${isNotMarked ? 'bg-red-600 text-white' : isPending ? 'bg-amber-600 text-white' : 'bg-blue-900 text-white'}`}>
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">
                        Date: {new Date(report.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ({report.day || 'N/A'})
                      </h3>
                      <p className="text-sm font-medium text-slate-500">Coordinator: <span className={`font-bold ${isNotMarked ? 'text-red-600' : isPending ? 'text-amber-700' : 'text-slate-700'}`}>{report.coordinatorName}</span></p>
                    </div>
                  </div>
                  {isSubmitted ? (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase">
                      ✅ SUBMITTED
                    </span>
                  ) : isPending ? (
                    <span className="bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase">
                      ⚠️ REPORT PENDING
                    </span>
                  ) : (
                    <span className="bg-red-100 text-red-700 border border-red-200 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase">
                      ❌ ATTENDANCE NOT MARKED
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                  {/* Details Column */}
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Session & Timing</span>
                        <span className="block text-sm font-bold text-slate-700">{report.session || 'N/A'} {report.timing ? `(${report.timing})` : ''}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Venue</span>
                        <span className="block text-sm font-bold text-slate-700">{report.venue || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-100 p-3 rounded-lg border border-slate-300">
                        <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Expected</span>
                        <span className="block text-lg font-black text-slate-800">{report.expected}</span>
                      </div>
                      <div className={`p-3 rounded-lg border ${isMissing ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                        <span className={`block text-[10px] font-black uppercase tracking-wider ${isMissing ? 'text-red-500' : 'text-green-600'}`}>Present</span>
                        <span className={`block text-lg font-black ${isMissing ? 'text-red-700' : 'text-green-700'}`}>{isMissing ? '0 (Unmarked)' : report.present}</span>
                      </div>
                    </div>

                    <div className={`p-4 rounded-lg border ${isMissing ? 'bg-red-50/70 border-red-200' : 'bg-blue-50/50 border-blue-100'}`}>
                      <span className={`block text-[10px] font-black uppercase tracking-wider mb-2 ${isMissing ? 'text-red-600' : 'text-blue-500'}`}>Description</span>
                      <p className={`text-sm font-medium leading-relaxed ${isMissing ? 'text-red-800 font-bold' : 'text-slate-700 italic'}`}>
                        "{report.description}"
                      </p>
                    </div>
                  </div>

                  {/* Photo Column */}
                  <div>
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Photographic Evidence</span>
                    {report.imageUrl ? (
                      <div className="rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50 flex items-center justify-center relative w-full h-64 shadow-inner">
                        {(() => {
                          const url = report.imageUrl;
                          const match = url.match(/[-\w]{25,}/);
                          const driveId = match ? match[0] : null;
                          
                          if (driveId) {
                            const thumbUrl = `https://drive.google.com/thumbnail?id=${driveId}&sz=w800`;
                            return (
                              <div className="relative w-full h-full">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                  src={thumbUrl}
                                  alt="Activity Evidence"
                                  className="object-cover w-full h-full"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://drive.google.com/uc?export=view&id=${driveId}`;
                                  }}
                                />
                                <a href={url} target="_blank" rel="noopener noreferrer"
                                  className="absolute bottom-2 right-2 bg-slate-900/70 text-white text-xs px-2 py-1 rounded font-bold">
                                  Open Full ↗
                                </a>
                              </div>
                            );
                          } else {
                            return (
                              <div className="p-4 text-center">
                                <p className="text-sm font-bold text-slate-500">External Image URL</p>
                                <a href={url} className="text-xs text-blue-600 break-all">{url}</a>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    ) : (
                      <div className={`rounded-xl border-2 border-dashed flex items-center justify-center w-full h-64 ${isMissing ? 'border-red-200 bg-red-50/40 text-red-400' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                        <p className="text-sm font-bold">{isMissing ? '❌ Report Not Uploaded' : 'No Photo Uploaded'}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Optional Student Attendance Roll Table */}
                {includeStudentDetails && (
                  <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-200">
                    <h4 className="text-sm font-black text-blue-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                      📋 Student Attendance Roll ({studentList.length} Students Allocated)
                    </h4>
                    {isFetchingStudents ? (
                      <div className="p-6 text-center text-slate-400 text-xs font-bold flex items-center justify-center gap-2">
                        <span className="animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></span>
                        Loading student attendance records from database...
                      </div>
                    ) : studentList.length === 0 ? (
                      <p className="text-xs text-slate-400 font-bold italic bg-slate-50 p-4 rounded-xl text-center border border-slate-200">
                        No student allocation data recorded for this slot.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 text-slate-700 font-black uppercase tracking-wider">
                            <tr>
                              <th className="p-3 border-b">#</th>
                              <th className="p-3 border-b">Register No</th>
                              <th className="p-3 border-b">Student Name</th>
                              <th className="p-3 border-b">Course / Sec</th>
                              <th className="p-3 border-b text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {studentList.map((st: any, i: number) => (
                              <tr key={i} className={st.status === 'PRESENT' ? 'bg-green-50/50' : st.status === 'ABSENT' ? 'bg-red-50/50' : ''}>
                                <td className="p-2.5 font-bold text-slate-400">{i + 1}</td>
                                <td className="p-2.5 font-black text-slate-800">{st.register_no}</td>
                                <td className="p-2.5 font-bold text-slate-700">{st.name}</td>
                                <td className="p-2.5 text-slate-500 font-semibold">{st.course} ({st.section})</td>
                                <td className="p-2.5 text-center">
                                  {st.status === 'PRESENT' ? (
                                    <span className="bg-green-100 text-green-800 border border-green-200 px-2.5 py-0.5 rounded-md font-black text-[10px]">PRESENT</span>
                                  ) : st.status === 'ABSENT' ? (
                                    <span className="bg-red-100 text-red-800 border border-red-200 px-2.5 py-0.5 rounded-md font-black text-[10px]">ABSENT</span>
                                  ) : (
                                    <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-md font-bold text-[10px]">UNMARKED</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer with Techspark Logo - Printed at the bottom of the document */}
        <div className="mt-20 pt-8 border-t-2 border-slate-100 flex items-center justify-between text-slate-500 page-break-inside-avoid">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest">Rajalakshmi Institute of Technology</p>
            <p className="text-[10px] font-medium mt-1">Club & Centre Slot Allocation Portal</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold italic text-slate-400">Managed by</span>
            <Image src="/techspark-logo.png" alt="Techspark Logo" width={120} height={40} className="object-contain opacity-80" />
          </div>
        </div>

      </div>
      
      {/* Global Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background-color: white !important; }
          .page-break-inside-avoid { page-break-inside: avoid; }
          @page { size: A4; margin: 10mm; }
        }
      `}} />
    </div>
  );
}
