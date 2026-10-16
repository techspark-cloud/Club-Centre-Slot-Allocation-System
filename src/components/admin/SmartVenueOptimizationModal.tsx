'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, AlertTriangle, ArrowRight, CheckCircle2, Building2, MapPin, 
  Users, Clock, Calendar, Download, FileSpreadsheet, X, Search, Layers,
  Printer, ArrowLeftRight, ChevronRight, ShieldCheck, Zap, RefreshCw, FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface SmartVenueOptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SmartVenueOptimizationModal({
  isOpen,
  onClose,
}: SmartVenueOptimizationModalProps) {
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('ALL');
  const [selectedSlotForRoster, setSelectedSlotForRoster] = useState<any | null>(null);
  const [activeRosterTab, setActiveRosterTab] = useState<'A' | 'B'>('A');
  const [rosterSearch, setRosterSearch] = useState('');

  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  const daysList = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

  // Fetch real-time venue optimization suggestions from backend API
  const fetchOptimizationData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/venue-optimization');
      const data = await res.json();
      if (data.success && data.suggestions) {
        setSuggestions(data.suggestions);
      } else {
        console.error('Failed to load venue optimization:', data.error);
      }
    } catch (err) {
      console.error('Error fetching optimization data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOptimizationData();
    }
  }, [isOpen]);

  // Handle changing spillover venue
  const handleSpilloverVenueChange = (slotId: string, newVenue: string) => {
    setSuggestions(prev => prev.map(s => {
      if (s.id !== slotId) return s;
      const matchedCand = s.candidateVenues.find((c: any) => c.venue === newVenue);
      return {
        ...s,
        selectedSpilloverVenue: newVenue,
        planB: {
          ...s.planB,
          venue: newVenue,
          spilloverCentreName: matchedCand ? matchedCand.centreName : '',
        }
      };
    }));
  };

  // Move section between Lab A and Lab B
  const handleMoveSection = (slotId: string, sectionName: string, fromLab: 'A' | 'B') => {
    setSuggestions(prev => prev.map(s => {
      if (s.id !== slotId) return s;

      let newSectionsA = [...s.planA.sections];
      let newSectionsB = [...s.planB.sections];

      if (fromLab === 'A') {
        const item = newSectionsA.find(x => x.name === sectionName);
        if (!item) return s;
        newSectionsA = newSectionsA.filter(x => x.name !== sectionName);
        newSectionsB.push(item);
      } else {
        const item = newSectionsB.find(x => x.name === sectionName);
        if (!item) return s;
        newSectionsB = newSectionsB.filter(x => x.name !== sectionName);
        newSectionsA.push(item);
      }

      const totalA = newSectionsA.reduce((sum, x) => sum + x.count, 0);
      const totalB = newSectionsB.reduce((sum, x) => sum + x.count, 0);

      const updated = {
        ...s,
        planA: { ...s.planA, total: totalA, sections: newSectionsA },
        planB: { ...s.planB, total: totalB, sections: newSectionsB },
      };

      if (selectedSlotForRoster?.id === slotId) {
        setSelectedSlotForRoster(updated);
      }

      return updated;
    }));
  };

  // Filter suggestions by selected day
  const filteredSuggestions = useMemo(() => {
    if (selectedDayFilter === 'ALL') return suggestions;
    return suggestions.filter(s => s.day === selectedDayFilter);
  }, [suggestions, selectedDayFilter]);

  // Overall Statistics
  const totalBenefittedStudents = useMemo(() => {
    return suggestions.reduce((acc, s) => acc + (s.totalEnrolled || 0), 0);
  }, [suggestions]);

  // Helper to load RIT logo for PDFs
  const loadLogoData = async (): Promise<{ width: number; height: number; dataUrl: string } | null> => {
    try {
      const response = await fetch('/rit-logo.png');
      const blob = await response.blob();
      const img = new Image();
      return new Promise((resolve) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          resolve({
            width: img.width,
            height: img.height,
            dataUrl: canvas.toDataURL('image/png'),
          });
        };
        img.onerror = () => resolve(null);
        img.src = URL.createObjectURL(blob);
      });
    } catch {
      return null;
    }
  };

  // 1. Download Master Proposal PDF
  const downloadOptimizationPDF = async () => {
    if (suggestions.length === 0) return;
    setDownloadingPDF(true);

    try {
      const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
      const pageWidth = doc.internal.pageSize.width;

      const logo = await loadLogoData();
      if (logo) {
        const targetHeight = 14;
        const targetWidth = (logo.width / logo.height) * targetHeight;
        const xPos = (pageWidth - targetWidth) / 2;
        doc.addImage(logo.dataUrl, 'PNG', xPos, 8, targetWidth, targetHeight);
      } else {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('RAJALAKSHMI INSTITUTE OF TECHNOLOGY', pageWidth / 2, 14, { align: 'center' });
      }

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('SMART VENUE REBALANCING & ROOM SPILLOVER OPTIMIZATION PLAN', pageWidth / 2, 28, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Overcrowded Slots Balanced: ${suggestions.length}   |   Total Benefitted Students: ${totalBenefittedStudents}   |   Academic Year: 2026-2027`,
        pageWidth / 2,
        34,
        { align: 'center' }
      );

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(14, 38, pageWidth - 14, 38);

      const tableHead = [
        ['Day & Timing', 'Overcrowded Centre', 'Current Venue & Total', 'Assigned Spillover Room', 'Lab A (Primary Venue)', 'Lab B (Spillover Venue)']
      ];

      const tableBody = suggestions.map(s => {
        const timeInfo = `${s.day}\n${s.session === 'FORENOON' ? 'Morning' : 'Afternoon'}\n(${s.timing})`;
        const centreInfo = `${s.centreName}\nCoord: ${s.coordinatorName}`;
        const currentVenueInfo = `Venue: ${s.currentVenue}\nTotal: ${s.totalEnrolled} Students\n(Overcrowded)`;

        const spilloverInfo = `Venue: ${s.planB.venue}\n${s.planB.spilloverCentreName ? `(${s.planB.spilloverCentreName})` : ''}`;

        const planAText = `Venue: ${s.planA.venue}\nStrength: ${s.planA.total} Students\n\nSections:\n` +
          s.planA.sections.map((x: any) => `• ${x.name}: ${x.count}`).join('\n');

        const planBText = `Venue: ${s.planB.venue}\nStrength: ${s.planB.total} Students\n\nSections:\n` +
          s.planB.sections.map((x: any) => `• ${x.name}: ${x.count}`).join('\n');

        return [timeInfo, centreInfo, currentVenueInfo, spilloverInfo, planAText, planBText];
      });

      autoTable(doc, {
        head: tableHead,
        body: tableBody,
        startY: 42,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2.5, valign: 'top' },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 26, fontStyle: 'bold', halign: 'center' },
          1: { cellWidth: 42, fontStyle: 'bold' },
          2: { cellWidth: 34, halign: 'center' },
          3: { cellWidth: 38 },
          4: { cellWidth: 65 },
          5: { cellWidth: 65 },
        },
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 160;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST | RIT Club & Centre Allocation Portal`,
        14,
        Math.min(finalY + 8, 202)
      );

      doc.save('RIT_Smart_Venue_Optimization_Plan.pdf');
    } catch (err) {
      console.error('PDF Generation failed:', err);
      alert('Failed to generate optimization plan PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  // 2. Download Door Notice PDF for a Specific Slot
  const downloadDoorNoticePDF = async (item: any) => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', format: 'a4' });
      const pageWidth = doc.internal.pageSize.width;

      const logo = await loadLogoData();
      if (logo) {
        const targetHeight = 16;
        const targetWidth = (logo.width / logo.height) * targetHeight;
        doc.addImage(logo.dataUrl, 'PNG', (pageWidth - targetWidth) / 2, 12, targetWidth, targetHeight);
      }

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('RAJALAKSHMI INSTITUTE OF TECHNOLOGY', pageWidth / 2, 36, { align: 'center' });

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 38);
      doc.text('VENUE REBALANCING & ROOM ALLOCATION NOTICE', pageWidth / 2, 46, { align: 'center' });

      // Notice Box
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(16, 52, pageWidth - 32, 28, 3, 3, 'FD');

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`Centre: ${item.centreName}`, 22, 60);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Day & Timing: ${item.day} (${item.session === 'FORENOON' ? 'Morning' : 'Afternoon'}) | ${item.timing}`, 22, 67);
      doc.text(`Total Enrolled: ${item.totalEnrolled} Students   |   Coordinator: ${item.coordinatorName} (${item.coordinatorMobile})`, 22, 74);

      // Lab A Banner
      doc.setFillColor(238, 242, 255);
      doc.setDrawColor(199, 210, 254);
      doc.roundedRect(16, 86, pageWidth - 32, 60, 4, 4, 'FD');

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(67, 56, 202);
      doc.text(`📍 LAB A (PRIMARY ROOM):  ${item.planA.venue}`, 24, 98);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`Student Capacity: ${item.planA.total} Students`, 24, 106);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      let curY = 114;
      doc.text('The following sections are assigned to attend here:', 24, curY);
      curY += 7;
      item.planA.sections.forEach((sec: any) => {
        doc.text(`• ${sec.name}  —  [ ${sec.count} Students ]`, 28, curY);
        curY += 6;
      });

      // Lab B Banner
      const labBY = 154;
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(167, 243, 208);
      doc.roundedRect(16, labBY, pageWidth - 32, 60, 4, 4, 'FD');

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text(`📍 LAB B (SPILLOVER ROOM):  ${item.planB.venue}`, 24, labBY + 12);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`Student Capacity: ${item.planB.total} Students`, 24, labBY + 20);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      let curYB = labBY + 28;
      doc.text('The following sections are assigned to attend here:', 24, curYB);
      curYB += 7;
      item.planB.sections.forEach((sec: any) => {
        doc.text(`• ${sec.name}  —  [ ${sec.count} Students ]`, 28, curYB);
        curYB += 6;
      });

      // Footer Instructions
      doc.setDrawColor(203, 213, 225);
      doc.line(16, 226, pageWidth - 16, 226);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      doc.text('Note: Students are strictly requested to report to their designated lab based on their section.', pageWidth / 2, 233, { align: 'center' });
      doc.text('Attendance will be marked separately in both venues.', pageWidth / 2, 239, { align: 'center' });

      doc.save(`Notice_${item.centreName.replace(/\s+/g, '_')}_${item.day}_Venue_Split.pdf`);
    } catch (err) {
      console.error('Notice generation error:', err);
      alert('Failed to generate Door Notice PDF');
    }
  };

  // 3. Download Attendance Sheet for Lab A or Lab B
  const downloadLabAttendanceSheet = (item: any, labType: 'A' | 'B') => {
    try {
      const plan = labType === 'A' ? item.planA : item.planB;
      const allStudents: any[] = [];
      plan.sections.forEach((sec: any) => {
        (sec.students || []).forEach((st: any) => {
          allStudents.push({ ...st, sectionName: sec.name });
        });
      });

      allStudents.sort((a, b) => (a.register_no || '').localeCompare(b.register_no || ''));

      const doc = new jsPDF({ orientation: 'portrait', format: 'a4' });
      const pageWidth = doc.internal.pageSize.width;

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('RAJALAKSHMI INSTITUTE OF TECHNOLOGY', pageWidth / 2, 14, { align: 'center' });

      doc.setFontSize(10.5);
      doc.text(`CENTRE ATTENDANCE SHEET — LAB ${labType} (${plan.venue})`, pageWidth / 2, 21, { align: 'center' });

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Centre: ${item.centreName}  |  Day & Time: ${item.day} (${item.timing})  |  Venue: ${plan.venue}  |  Students: ${allStudents.length}`,
        pageWidth / 2,
        27,
        { align: 'center' }
      );

      const tableData = allStudents.map((st, idx) => [
        idx + 1,
        st.register_no || 'N/A',
        st.name || 'N/A',
        st.sectionName,
        '', // Signature space
      ]);

      autoTable(doc, {
        head: [['S.No', 'Register No', 'Student Name', 'Section', 'Signature / Attendance']],
        body: tableData,
        startY: 32,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: labType === 'A' ? [67, 56, 202] : [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 32 },
          2: { cellWidth: 62 },
          3: { cellWidth: 42 },
          4: { cellWidth: 36 },
        },
      });

      doc.save(`Attendance_${item.centreName.replace(/\s+/g, '_')}_Lab_${labType}_${item.day}.pdf`);
    } catch (err) {
      console.error('Attendance sheet generation error:', err);
      alert('Failed to generate Attendance Sheet PDF');
    }
  };

  // 4. Download Master Proposal Excel
  const downloadOptimizationExcel = () => {
    if (suggestions.length === 0) return;
    setDownloadingExcel(true);

    try {
      const summaryData = suggestions.map((s, idx) => ({
        'S.No': idx + 1,
        'Day': s.day,
        'Session': s.session,
        'Timing': s.timing,
        'Centre Name': s.centreName,
        'Coordinator': `${s.coordinatorName} (${s.coordinatorMobile})`,
        'Original Room': s.currentVenue,
        'Total Enrolled': s.totalEnrolled,
        'Recommended Lab A Venue': s.planA.venue,
        'Lab A Strength': s.planA.total,
        'Lab A Sections': s.planA.sections.map((x: any) => `${x.name}: ${x.count}`).join('; '),
        'Recommended Lab B Venue': s.planB.venue,
        'Lab B Strength': s.planB.total,
        'Lab B Sections': s.planB.sections.map((x: any) => `${x.name}: ${x.count}`).join('; '),
      }));

      const workbook = XLSX.utils.book_new();
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, wsSummary, 'Venue Optimization Plan');
      XLSX.writeFile(workbook, 'RIT_Smart_Venue_Optimization_Plan.xlsx');
    } catch (err) {
      console.error('Excel Export failed:', err);
      alert('Failed to export optimization plan Excel');
    } finally {
      setDownloadingExcel(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-6xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shrink-0 shadow-lg font-black">
              <Zap className="w-6 h-6 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  Smart Venue Optimizer &amp; Room Spillover Planner
                </h2>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
                  Smart Rebalancing
                </span>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm font-medium mt-0.5">
                Automatically maps overcrowded rooms (&gt; 70 students) with empty labs, splits sections cleanly, and generates door notices.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={fetchOptimizationData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Refresh venue calculations"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={downloadOptimizationPDF}
              disabled={downloadingPDF || suggestions.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Download Venue Optimization Proposal PDF for Principal/Deans"
            >
              <Printer className="w-4 h-4" />
              <span>{downloadingPDF ? 'Generating...' : 'Proposal PDF'}</span>
            </button>
            <button
              onClick={downloadOptimizationExcel}
              disabled={downloadingExcel || suggestions.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Export complete plan into Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{downloadingExcel ? 'Exporting...' : 'Export Excel'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors ml-1 cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* STATS & FILTER BAR */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Day Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 mr-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" /> Day:
            </span>
            <button
              onClick={() => setSelectedDayFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedDayFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              All Days ({suggestions.length})
            </button>
            {daysList.map(d => {
              const countForDay = suggestions.filter(s => s.day === d).length;
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDayFilter(d)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    selectedDayFilter === d
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {d} {countForDay > 0 && <span className="opacity-75">({countForDay})</span>}
                </button>
              );
            })}
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 text-xs font-semibold">
            <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>
                <strong>{suggestions.length}</strong> Overcrowded Slots Detected
              </span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-emerald-800">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                <strong>{totalBenefittedStudents}</strong> Students Balanced
              </span>
            </div>
          </div>
        </div>

        {/* MODAL MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm font-bold text-slate-500">
                Scanning All Slots &amp; Mapping Available Empty Venues...
              </p>
            </div>
          ) : filteredSuggestions.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-extrabold text-slate-800">No Overcrowded Venues on {selectedDayFilter}</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                All scheduled centre slots on this day are operating within normal room capacity.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {filteredSuggestions.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border-2 border-slate-200 hover:border-indigo-400 rounded-3xl p-5 shadow-sm transition-all relative overflow-hidden"
                >
                  {/* Top Badge Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-slate-900 text-white text-[11px] font-black px-2.5 py-0.5 rounded-lg uppercase tracking-wider">
                        {item.day} {item.session}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-500">
                        {item.timing}
                      </span>
                      <span className="bg-red-50 text-red-700 text-[10px] font-black px-2 py-0.5 rounded-md border border-red-200 flex items-center gap-1 uppercase tracking-wider">
                        <AlertTriangle className="w-3 h-3 text-red-500" /> Capacity Exceeded ({item.totalEnrolled} / {item.capacity})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadDoorNoticePDF(item)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-300 cursor-pointer"
                        title="Print Ready-to-Paste Door Notice for Lab Entrance"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Print Door Notice</span>
                      </button>
                      <button
                        onClick={() => setSelectedSlotForRoster(item)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all border border-indigo-200 cursor-pointer"
                        title="View & Search Enrolled Student Roster"
                      >
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        <span>View Students</span>
                      </button>
                    </div>
                  </div>

                  {/* 3-Column Layout: Left (Current) -> Middle (Spillover Mapping Selector) -> Right (Dual Plan) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    
                    {/* Left: Current State */}
                    <div className="lg:col-span-3 bg-red-50/50 border border-red-200 rounded-2xl p-4">
                      <span className="text-[10px] font-black uppercase tracking-wider text-red-600 block mb-1">
                        Current Overcrowded State:
                      </span>
                      <h4 className="text-base font-black text-slate-900 leading-tight">
                        {item.centreName}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                        Coord: {item.coordinatorName}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                          <MapPin className="w-3.5 h-3.5" />
                          {item.currentVenue}
                        </span>
                        <span className="text-xs font-extrabold text-red-800 bg-red-100 px-2 py-1 rounded-lg border border-red-200">
                          🔥 {item.totalEnrolled} Students
                        </span>
                      </div>
                      <p className="text-[11px] text-red-600 font-medium mt-2 leading-relaxed">
                        Classroom capacity (~70) cannot fit all {item.totalEnrolled} students comfortably.
                      </p>
                    </div>

                    {/* Middle: Spillover Venue Mapping Dropdown */}
                    <div className="lg:col-span-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between h-full">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                          Mapped Spillover Lab:
                        </span>
                        
                        {item.candidateVenues && item.candidateVenues.length > 0 ? (
                          <div className="space-y-2 mt-2">
                            <label className="text-[11px] font-bold text-slate-700 block">
                              Select Available Room at {item.timing}:
                            </label>
                            <select
                              value={item.planB.venue}
                              onChange={(e) => handleSpilloverVenueChange(item.id, e.target.value)}
                              className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer"
                            >
                              {item.candidateVenues.map((c: any) => (
                                <option key={c.venue} value={c.venue}>
                                  {c.venue} ({c.centreName} — {c.currentCount} active / {c.freeSeats} free)
                                </option>
                              ))}
                            </select>
                            <p className="text-[10px] text-slate-500">
                              💡 You can switch to any other free venue at this hour.
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs font-bold text-slate-600 mt-2">
                            No other empty rooms found. Defaulting to Spillover Lab.
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-200 mt-3 text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Zero collision with other classes</span>
                      </div>
                    </div>

                    {/* Right: Smart Section Split Plan with Interactive Rebalancer */}
                    <div className="lg:col-span-6 bg-indigo-50/40 border border-indigo-200 rounded-2xl p-4">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-indigo-600" /> Section Distribution (Click arrow to move section):
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2.5">
                        
                        {/* Lab A Box */}
                        <div className="bg-white p-3 rounded-xl border border-indigo-200 shadow-sm">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                              Lab A (Primary)
                            </span>
                            <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              {item.planA.total} Students
                            </span>
                          </div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-black text-slate-800 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                              {item.planA.venue}
                            </p>
                            <button
                              onClick={() => downloadLabAttendanceSheet(item, 'A')}
                              className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                            >
                              Sign Sheet
                            </button>
                          </div>

                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {item.planA.sections.length === 0 ? (
                              <p className="text-[10px] text-slate-400 italic">No sections assigned</p>
                            ) : (
                              item.planA.sections.map((sec: any) => (
                                <div
                                  key={sec.name}
                                  className="text-[10px] font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 px-2 py-1 rounded-lg border border-slate-200 flex items-center justify-between group transition-all"
                                >
                                  <span className="truncate max-w-[130px]" title={sec.name}>{sec.name}</span>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <strong className="text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
                                      {sec.count}
                                    </strong>
                                    <button
                                      onClick={() => handleMoveSection(item.id, sec.name, 'A')}
                                      className="w-5 h-5 rounded bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 flex items-center justify-center transition-colors cursor-pointer"
                                      title="Move this section to Lab B"
                                    >
                                      <ArrowRight className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Lab B Box */}
                        <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-sm">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                              Lab B (Spillover)
                            </span>
                            <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {item.planB.total} Students
                            </span>
                          </div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-black text-emerald-950 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                              {item.planB.venue}
                            </p>
                            <button
                              onClick={() => downloadLabAttendanceSheet(item, 'B')}
                              className="text-[9px] font-bold text-emerald-600 hover:text-emerald-800 underline cursor-pointer"
                            >
                              Sign Sheet
                            </button>
                          </div>

                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {item.planB.sections.length === 0 ? (
                              <p className="text-[10px] text-slate-400 italic">No sections assigned</p>
                            ) : (
                              item.planB.sections.map((sec: any) => (
                                <div
                                  key={sec.name}
                                  className="text-[10px] font-bold bg-emerald-50/50 hover:bg-emerald-100 text-emerald-950 px-2 py-1 rounded-lg border border-emerald-200 flex items-center justify-between group transition-all"
                                >
                                  <button
                                    onClick={() => handleMoveSection(item.id, sec.name, 'B')}
                                    className="w-5 h-5 rounded bg-emerald-100 hover:bg-emerald-700 hover:text-white text-emerald-800 flex items-center justify-center transition-colors cursor-pointer mr-1 shrink-0"
                                    title="Move this section back to Lab A"
                                  >
                                    <ArrowRight className="w-3 h-3 rotate-180" />
                                  </button>
                                  <span className="truncate max-w-[125px]" title={sec.name}>{sec.name}</span>
                                  <strong className="text-emerald-900 bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-[10px] shrink-0">
                                    {sec.count}
                                  </strong>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">
            💡 Real-time dynamic venue optimizer: Section splits are preserved intact, preventing student fragmentation.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* STUDENT ROSTER MODAL */}
      {selectedSlotForRoster && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-60 flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-300 animate-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black">
                  {selectedSlotForRoster.centreName} — Student Roster
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedSlotForRoster.day} ({selectedSlotForRoster.timing})  •  Total: {selectedSlotForRoster.totalEnrolled} Students
                </p>
              </div>
              <button
                onClick={() => setSelectedSlotForRoster(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-header with Tab Selector & Search */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveRosterTab('A')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    activeRosterTab === 'A'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  Lab A ({selectedSlotForRoster.planA.venue}): {selectedSlotForRoster.planA.total} Students
                </button>
                <button
                  onClick={() => setActiveRosterTab('B')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    activeRosterTab === 'B'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  Lab B ({selectedSlotForRoster.planB.venue}): {selectedSlotForRoster.planB.total} Students
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student or reg no..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Student Table */}
            <div className="flex-1 overflow-y-auto p-4">
              {(() => {
                const currentPlan = activeRosterTab === 'A' ? selectedSlotForRoster.planA : selectedSlotForRoster.planB;
                let studentsList: any[] = [];
                currentPlan.sections.forEach((sec: any) => {
                  (sec.students || []).forEach((st: any) => {
                    studentsList.push({ ...st, sectionLabel: sec.name });
                  });
                });

                if (rosterSearch.trim()) {
                  const query = rosterSearch.toLowerCase();
                  studentsList = studentsList.filter(
                    st => (st.name || '').toLowerCase().includes(query) ||
                          (st.register_no || '').toLowerCase().includes(query) ||
                          (st.sectionLabel || '').toLowerCase().includes(query)
                  );
                }

                if (studentsList.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400 text-xs font-bold">
                      No students found in Lab {activeRosterTab}
                    </div>
                  );
                }

                return (
                  <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">S.No</th>
                        <th className="py-2.5 px-3">Register No</th>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">Department &amp; Section</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentsList.map((st, idx) => (
                        <tr key={st.id || idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">{st.register_no}</td>
                          <td className="py-2 px-3 font-bold text-slate-800">{st.name}</td>
                          <td className="py-2 px-3 font-semibold text-slate-600">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                              {st.sectionLabel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">
                Venue: <strong className="text-slate-800">{activeRosterTab === 'A' ? selectedSlotForRoster.planA.venue : selectedSlotForRoster.planB.venue}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadLabAttendanceSheet(selectedSlotForRoster, activeRosterTab)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-sm"
                >
                  Download Lab {activeRosterTab} Attendance PDF
                </button>
                <button
                  onClick={() => setSelectedSlotForRoster(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
