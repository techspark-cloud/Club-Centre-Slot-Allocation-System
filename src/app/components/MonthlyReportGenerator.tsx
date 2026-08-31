'use client';

import { useState, useEffect } from 'react';
import { Download, Loader2, CalendarDays, Building2, FileText } from 'lucide-react';
import { getMonthlyDepartmentReportData, getUniqueDepartments } from '@/app/actions/attendance';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function MonthlyReportGenerator() {
  const [loading, setLoading] = useState(false);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [month, setMonth] = useState('2026-08');
  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [sendingAll, setSendingAll] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);

  // Hardcoded for simplicity based on the current academic year
  const availableMonths = [
    { value: '2026-08', label: 'August 2026' },
    { value: '2026-09', label: 'September 2026' },
    { value: '2026-10', label: 'October 2026' },
    { value: '2026-11', label: 'November 2026' },
    { value: '2026-12', label: 'December 2026' },
  ];

  useEffect(() => {
    async function loadDepts() {
      const depts = await getUniqueDepartments();
      setDepartments(depts);
      if (depts.length > 0) setDepartment(depts[0]);
      setDepartmentsLoading(false);
    }
    loadDepts();
  }, []);

  const generatePDF = async () => {
    setLoading(true);
    try {
      const data = await getMonthlyDepartmentReportData(month, department);
      
      if (!data || data.length === 0) {
        alert("No students found for this department.");
        setLoading(false);
        return;
      }

      const doc = new jsPDF('p', 'pt', 'a4');
      const selectedMonthLabel = availableMonths.find(m => m.value === month)?.label || month;
      const sections = [...new Set(data.map((s: any) => s.section))].sort();

      try {
        const img = new Image();
        img.src = '/rit-logo.png';
        await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        canvas.getContext('2d')?.drawImage(img, 0, 0);
        
        const logoHeight = 45;
        const logoWidth = logoHeight * (img.width / img.height);
        const pageWidth = doc.internal.pageSize.getWidth();
        const logoX = (pageWidth - logoWidth) / 2;
        
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', logoX, 25, logoWidth, logoHeight);
      } catch (e) { console.warn(e); }
      
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(`Monthly Attendance Report`, 40, 95);
      
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`Department: ${department}  |  Month: ${selectedMonthLabel}`, 40, 115);

      let currentY = 145;

      sections.forEach((section: string, idx: number) => {
        const sectionStudents = data.filter((s: any) => s.section === section);
        
        if (sectionStudents.length > 0) {
          doc.setFontSize(14);
          doc.setTextColor(30, 64, 175); // blue-800
          doc.text(`Section: ${section}`, 40, currentY);
          currentY += 15;

          const tableData = sectionStudents.map((s: any, index: number) => {
            const clubPct = s.clubTotal > 0 ? Math.round((s.clubPresent / s.clubTotal) * 100) + '%' : 'N/A';
            const centrePct = s.centreTotal > 0 ? Math.round((s.centrePresent / s.centreTotal) * 100) + '%' : 'N/A';
            const overallPct = s.overallTotal > 0 ? Math.round((s.overallPresent / s.overallTotal) * 100) + '%' : 'N/A';

            return [
              index + 1,
              s.register_no,
              s.name,
              clubPct,
              centrePct,
              overallPct
            ];
          });

          autoTable(doc, {
            startY: currentY,
            head: [['S.No', 'Register No', 'Name', 'Club (%)', 'Centre (%)', 'Overall (%)']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' }, // slate-100
            styles: { fontSize: 9, cellPadding: 4 },
            didDrawPage: function (data: any) {
              // Footer
              let str = "Page " + doc.internal.getNumberOfPages();
              doc.setFontSize(8);
              doc.setTextColor(148, 163, 184); // slate-400
              doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 20);
            }
          });

          currentY = (doc as any).lastAutoTable.finalY + 30;
          
          // Add new page if not the last section and running out of space
          if (idx < sections.length - 1 && currentY > doc.internal.pageSize.height - 100) {
            doc.addPage();
            currentY = 40;
          }
        }
      });

      doc.save(`Attendance_Report_${department}_${selectedMonthLabel.replace(/ /g, '_')}.pdf`);

    } catch (err) {
      console.error(err);
      alert("An error occurred while generating the report.");
    } finally {
      setLoading(false);
    }
  };

  const sendAllReports = async () => {
    const selectedMonthLabel = availableMonths.find(m => m.value === month)?.label || month;
    if (!confirm(`Are you sure you want to generate and email reports to ALL HODs for ${selectedMonthLabel}? This may take a minute.`)) return;
    
    setSendingAll(true);
    setSendProgress(0);

    try {
      for (let i = 0; i < departments.length; i++) {
        const dept = departments[i];
        
        // 1. Fetch Data
        const data = await getMonthlyDepartmentReportData(month, dept);
        if (!data || data.length === 0) {
          setSendProgress(Math.round(((i + 1) / departments.length) * 100));
          continue;
        }

        // 2. Generate PDF
        const doc = new jsPDF('p', 'pt', 'a4');
        const sections = [...new Set(data.map((s: any) => s.section))].sort();

        try {
          const img = new Image();
          img.src = '/rit-logo.png';
          await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
          const canvas = document.createElement('canvas');
          canvas.width = img.width; canvas.height = img.height;
          canvas.getContext('2d')?.drawImage(img, 0, 0);
          
          const logoHeight = 45;
          const logoWidth = logoHeight * (img.width / img.height);
          const pageWidth = doc.internal.pageSize.getWidth();
          const logoX = (pageWidth - logoWidth) / 2;
          
          doc.addImage(canvas.toDataURL('image/png'), 'PNG', logoX, 25, logoWidth, logoHeight);
        } catch (e) { console.warn(e); }

        doc.setFontSize(18);
        doc.setTextColor(15, 23, 42); 
        doc.text(`Monthly Attendance Report`, 40, 95);
        
        doc.setFontSize(12);
        doc.setTextColor(100, 116, 139); 
        doc.text(`Department: ${dept}  |  Month: ${selectedMonthLabel}`, 40, 115);

        let currentY = 145;

        sections.forEach((section: string, idx: number) => {
          const sectionStudents = data.filter((s: any) => s.section === section);
          if (sectionStudents.length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(30, 64, 175); 
            doc.text(`Section: ${section}`, 40, currentY);
            currentY += 15;

            const tableData = sectionStudents.map((s: any, index: number) => {
              const clubPct = s.clubTotal > 0 ? Math.round((s.clubPresent / s.clubTotal) * 100) + '%' : 'N/A';
              const centrePct = s.centreTotal > 0 ? Math.round((s.centrePresent / s.centreTotal) * 100) + '%' : 'N/A';
              const overallPct = s.overallTotal > 0 ? Math.round((s.overallPresent / s.overallTotal) * 100) + '%' : 'N/A';
              return [index + 1, s.register_no, s.name, clubPct, centrePct, overallPct];
            });

            autoTable(doc, {
              startY: currentY,
              head: [['S.No', 'Register No', 'Name', 'Club (%)', 'Centre (%)', 'Overall (%)']],
              body: tableData,
              theme: 'grid',
              headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' }, 
              styles: { fontSize: 9, cellPadding: 4 },
              didDrawPage: function (data: any) {
                let str = "Page " + doc.internal.getNumberOfPages();
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184); 
                doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 20);
              }
            });

            currentY = (doc as any).lastAutoTable.finalY + 30;
            if (idx < sections.length - 1 && currentY > doc.internal.pageSize.height - 100) {
              doc.addPage();
              currentY = 40;
            }
          }
        });

        // 3. Get Base64
        const pdfBase64 = doc.output('datauristring');

        // 4. Send to API
        const res = await fetch('/api/admin/send-monthly-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ department: dept, month: selectedMonthLabel, pdfBase64 })
        });
        
        if (!res.ok) {
          console.warn(`Failed to send email for ${dept}`);
        }

        setSendProgress(Math.round(((i + 1) / departments.length) * 100));
      }
      
      alert("All available reports have been successfully generated and sent to the HODs!");
    } catch (err) {
      console.error(err);
      alert("An error occurred while sending the reports.");
    } finally {
      setSendingAll(false);
      setSendProgress(0);
    }
  };

  return (
    <div className="bg-white border-2 border-slate-900 rounded-xl shadow-sm p-6 mb-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-100 p-2 rounded-lg border border-blue-200">
          <FileText className="w-5 h-5 text-blue-700" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Monthly PDF Reports</h2>
          <p className="text-sm font-semibold text-slate-500">Download department-wise monthly attendance reports.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5 flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" /> Select Month
          </label>
          <select 
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full p-3 border-2 border-slate-200 rounded-lg text-sm font-bold text-slate-700 bg-slate-50 focus:border-blue-500 focus:ring-0 outline-none"
          >
            {availableMonths.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Department
          </label>
          <select 
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            disabled={departmentsLoading}
            className="w-full p-3 border-2 border-slate-200 rounded-lg text-sm font-bold text-slate-700 bg-slate-50 focus:border-blue-500 focus:ring-0 outline-none"
          >
            {departmentsLoading ? (
              <option>Loading departments...</option>
            ) : (
              departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button 
          onClick={generatePDF}
          disabled={loading || sendingAll}
          className="flex-1 flex justify-center items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3.5 rounded-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Generating...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" /> Download PDF Report
            </>
          )}
        </button>

        <button 
          onClick={sendAllReports}
          disabled={loading || sendingAll}
          className="flex-1 flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 rounded-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
        >
          {sendingAll ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Sending... {sendProgress}%
            </>
          ) : (
            <>
              Email All HODs
            </>
          )}
        </button>
      </div>
    </div>
  );
}
