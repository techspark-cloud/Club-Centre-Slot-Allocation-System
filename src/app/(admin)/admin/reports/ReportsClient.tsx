'use client';

import { useState, useEffect } from 'react';
import { Download, Loader2, Filter, FileText, FileSpreadsheet, Search } from 'lucide-react';
import { getUniqueDepartments, getUniqueSections, getAllActivities, getAdvancedReportData } from '@/app/actions/attendance';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import MonthlyReportGenerator from '@/app/components/MonthlyReportGenerator';

export default function ReportsClient() {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [activities, setActivities] = useState<{id: string, name: string, type: string}[]>([]);
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [section, setSection] = useState('ALL');
  const [activityId, setActivityId] = useState('ALL');
  const [deficitOnly, setDeficitOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Results
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Setup defaults
  useEffect(() => {
    const fetchMetadata = async () => {
      const depts = await getUniqueDepartments();
      setDepartments(depts);
      const acts = await getAllActivities();
      setActivities(acts);
    };
    fetchMetadata();
    
    // Default dates (current month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  // Fetch sections when department changes
  useEffect(() => {
    if (department !== 'ALL') {
      getUniqueSections(department).then(setSections);
      setSection('ALL');
    } else {
      setSections([]);
      setSection('ALL');
    }
  }, [department]);

  const handleSearch = async () => {
    if (!startDate || !endDate) return alert("Please select start and end dates.");
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await getAdvancedReportData({
        startDate,
        endDate,
        department,
        section,
        activityId,
        deficitOnly,
        searchQuery
      });
      setResults(data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch report data.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (results.length === 0) return alert("No data to download.");
    
    const doc = new jsPDF('p', 'pt', 'a4');

    try {
      const img = new Image();
      img.src = '/rit-logo.png';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      const imgData = canvas.toDataURL('image/png');

      const logoHeight = 45;
      const logoWidth = logoHeight * (img.width / img.height);
      const pageWidth = doc.internal.pageSize.getWidth();
      const logoX = (pageWidth - logoWidth) / 2;

      // Add logo (x, y, width, height)
      doc.addImage(imgData, 'PNG', logoX, 25, logoWidth, logoHeight);
    } catch (e) {
      console.warn("Failed to load logo", e);
    }

    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); 
    doc.text(`Advanced Attendance Report`, 40, 95); 
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); 
    doc.text(`Period: ${startDate} to ${endDate}`, 40, 110);
    doc.text(`Filter: ${department === 'ALL' ? 'All Departments' : department} ${section !== 'ALL' ? `(Sec ${section})` : ''}`, 40, 125);
    if (deficitOnly) doc.text(`Showing: Only Deficits (< 75%)`, 40, 140);

    const tableData = results.map((s, index) => {
      const clubPct = s.clubTotal > 0 ? Math.round((s.clubPresent / s.clubTotal) * 100) + '%' : 'N/A';
      const centrePct = s.centreTotal > 0 ? Math.round((s.centrePresent / s.centreTotal) * 100) + '%' : 'N/A';
      const overallPct = s.overallTotal > 0 ? Math.round((s.overallPresent / s.overallTotal) * 100) + '%' : 'N/A';
      return [index + 1, s.register_no, s.name, s.course, s.section || '-', clubPct, centrePct, overallPct];
    });

    autoTable(doc, {
      startY: deficitOnly ? 155 : 140,
      head: [['S.No', 'Register No', 'Name', 'Department', 'Sec', 'Club %', 'Centre %', 'Overall %']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' }, 
      styles: { fontSize: 8, cellPadding: 3 },
      didDrawPage: function (data: any) {
        let str = "Page " + doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); 
        doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 20);
      }
    });

    doc.save(`Attendance_Report_${startDate}.pdf`);
  };

  const downloadExcel = () => {
    if (results.length === 0) return alert("No data to download.");
    
    const wsData = results.map(s => ({
      'Register Number': s.register_no,
      'Name': s.name,
      'Department': s.course,
      'Section': s.section || '-',
      'Club Total Classes': s.clubTotal,
      'Club Present': s.clubPresent,
      'Club %': s.clubTotal > 0 ? Math.round((s.clubPresent / s.clubTotal) * 100) : 'N/A',
      'Centre Total Classes': s.centreTotal,
      'Centre Present': s.centrePresent,
      'Centre %': s.centreTotal > 0 ? Math.round((s.centrePresent / s.centreTotal) * 100) : 'N/A',
      'Overall %': s.overallTotal > 0 ? Math.round((s.overallPresent / s.overallTotal) * 100) : 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
    XLSX.writeFile(wb, `Attendance_Report_${startDate}.xlsx`);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Reports Hub</h1>
        <p className="text-slate-500 font-medium">Generate highly customized attendance reports in PDF or Excel.</p>
      </div>

      <div className="mb-8">
        <MonthlyReportGenerator />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
        <div className="flex items-center gap-2 mb-6 text-slate-800 font-bold text-lg border-b border-slate-100 pb-4">
          <Filter className="w-5 h-5 text-blue-600" />
          Report Filters
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Specific Student Search */}
          <div className="space-y-2 lg:col-span-3">
            <label className="text-sm font-bold text-slate-700">Specific Student (Optional)</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by Register Number (e.g. 953621104001)" 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" 
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
          </div>

          {/* Department */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Department</label>
            <select value={department} onChange={e => setDepartment(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all">
              <option value="ALL">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Section */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Section</label>
            <select disabled={department === 'ALL'} value={section} onChange={e => setSection(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:opacity-50">
              <option value="ALL">All Sections</option>
              {sections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Activity Type */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Specific Club/Centre</label>
            <select value={activityId} onChange={e => setActivityId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all">
              <option value="ALL">All Clubs & Centres</option>
              {activities.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
            </select>
          </div>

          {/* Deficit Filter */}
          <div className="space-y-2 flex flex-col justify-end">
            <label className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-xl cursor-pointer hover:bg-red-100 transition-colors">
              <input type="checkbox" checked={deficitOnly} onChange={e => setDeficitOnly(e.target.checked)} className="w-5 h-5 rounded text-red-600 focus:ring-red-500 border-red-200" />
              <span className="font-bold text-red-800 text-sm">Only show students &lt; 75% Attendance</span>
            </label>
          </div>
        </div>

        <button 
          onClick={handleSearch}
          disabled={loading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-8 py-3.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          Generate Report Preview
        </button>
      </div>

      {hasSearched && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Report Preview</h2>
              <p className="text-slate-500 font-medium text-sm mt-1">Found {results.length} students matching your filters.</p>
            </div>
            
            <div className="flex gap-3 w-full sm:w-auto">
              <button 
                onClick={downloadPDF}
                disabled={results.length === 0}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-50 text-red-700 hover:bg-red-100 font-bold px-5 py-2.5 rounded-lg transition-colors border border-red-200 disabled:opacity-50"
              >
                <FileText className="w-4 h-4" /> PDF
              </button>
              <button 
                onClick={downloadExcel}
                disabled={results.length === 0}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 font-bold px-5 py-2.5 rounded-lg transition-colors border border-green-200 disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-4">Reg No</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Overall %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {results.slice(0, 10).map((r, i) => {
                   const overallPct = r.overallTotal > 0 ? Math.round((r.overallPresent / r.overallTotal) * 100) : null;
                   return (
                     <tr key={r.register_no} className="hover:bg-slate-50/50">
                       <td className="p-4">{r.register_no}</td>
                       <td className="p-4">{r.name}</td>
                       <td className="p-4">{r.course}</td>
                       <td className="p-4">
                         {overallPct === null ? 'N/A' : (
                           <span className={overallPct < 75 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                             {overallPct}%
                           </span>
                         )}
                       </td>
                     </tr>
                   );
                })}
              </tbody>
            </table>
          </div>
          {results.length > 10 && (
            <div className="text-center p-4 text-slate-500 text-sm font-medium border-t border-slate-100">
              Showing top 10 rows. Download PDF or Excel to view all {results.length} records.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
