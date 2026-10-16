'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Sparkles, AlertTriangle, ArrowRight, CheckCircle2, Building2, MapPin, 
  Users, Clock, Calendar, Download, FileSpreadsheet, X, Search, Layers,
  Printer, ArrowUpDown, ChevronRight, ShieldCheck, Zap
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
  const [slots, setSlots] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('ALL');
  const [selectedSuggestion, setSelectedSuggestion] = useState<any | null>(null);

  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  const supabase = createClient();
  const daysList = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function fetchOptimizationData() {
      setLoading(true);
      try {
        // Fetch all centre slots
        const { data: slotData, error: slotErr } = await supabase
          .from('slots')
          .select('*, centre:centres(id, name, faculty_name, faculty_mobile)')
          .not('centre_id', 'is', null)
          .order('day')
          .order('session')
          .order('start_time');

        if (slotErr) throw slotErr;
        const currentSlots = slotData || [];

        // Fetch all allocations with student courses and sections
        const { data: allocData, error: allocErr } = await supabase
          .from('allocations')
          .select(`
            id,
            slot_id,
            student:students (
              id,
              name,
              register_no,
              course,
              section,
              contact_no
            )
          `);

        if (allocErr) throw allocErr;

        if (isMounted) {
          setSlots(currentSlots);
          setAllocations(allocData || []);
        }
      } catch (err) {
        console.error('Error fetching optimization data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchOptimizationData();
    return () => { isMounted = false; };
  }, [isOpen]);

  // Compute Smart Suggestions
  const suggestions = useMemo(() => {
    if (slots.length === 0) return [];

    // Map allocations by slot_id
    const allocMap: Record<string, any[]> = {};
    allocations.forEach(a => {
      if (!allocMap[a.slot_id]) allocMap[a.slot_id] = [];
      allocMap[a.slot_id].push(a);
    });

    // Group slots by Day and Session/Timing
    const timeBuckets: Record<string, any[]> = {};
    slots.forEach(s => {
      const timingKey = `${s.day}__${s.session}__${s.start_time?.substring(0, 5)}`;
      if (!timeBuckets[timingKey]) timeBuckets[timingKey] = [];

      const enrolled = allocMap[s.id]?.length || s.allocated_count || 0;
      timeBuckets[timingKey].push({
        ...s,
        realCount: enrolled,
        allocationsList: allocMap[s.id] || [],
      });
    });

    const result: any[] = [];

    // Scan each bucket for overcrowded rooms (>= 70) and available under-utilized rooms (<= 15)
    Object.entries(timeBuckets).forEach(([bucketKey, bucketSlots]) => {
      const [day, session, startTime] = bucketKey.split('__');
      const crowdedSlots = bucketSlots
        .filter(s => s.realCount >= 70)
        .sort((a, b) => b.realCount - a.realCount);

      const availableSlots = bucketSlots
        .filter(s => s.realCount <= 20)
        .sort((a, b) => a.realCount - b.realCount);

      crowdedSlots.forEach((cSlot, idx) => {
        // Match with best available room
        const matchedSpillover = availableSlots[idx] || availableSlots[0] || null;

        // Group sections inside the crowded slot
        const secMap: Record<string, { count: number; students: any[] }> = {};
        cSlot.allocationsList.forEach((a: any) => {
          if (!a.student) return;
          const cleanCourse = a.student.course?.replace(/^B\.Tech\.\s*|^B\.E\.\s*/i, '') || 'Dept';
          const sec = a.student.section ? `Sec ${a.student.section}` : '';
          const key = sec ? `${cleanCourse} (${sec})` : cleanCourse;

          if (!secMap[key]) secMap[key] = { count: 0, students: [] };
          secMap[key].count += 1;
          secMap[key].students.push(a.student);
        });

        // Greedy 2-way section split algorithm for balanced Lab A and Lab B
        const sortedEntries = Object.entries(secMap).sort((a, b) => b[1].count - a[1].count);
        let countA = 0;
        let countB = 0;
        const sectionsA: { name: string; count: number; students: any[] }[] = [];
        const sectionsB: { name: string; count: number; students: any[] }[] = [];

        sortedEntries.forEach(([secName, data]) => {
          if (countA <= countB) {
            sectionsA.push({ name: secName, count: data.count, students: data.students });
            countA += data.count;
          } else {
            sectionsB.push({ name: secName, count: data.count, students: data.students });
            countB += data.count;
          }
        });

        result.push({
          id: `${cSlot.id}_opt`,
          day: cSlot.day,
          session: cSlot.session,
          timing: `${cSlot.start_time?.substring(0, 5)} - ${cSlot.end_time?.substring(0, 5)}`,
          centreName: cSlot.centre?.name || 'Centre',
          coordinatorName: cSlot.centre?.faculty_name || 'N/A',
          coordinatorMobile: cSlot.centre?.faculty_mobile || 'N/A',
          currentVenue: cSlot.venue || 'Venue TBA',
          totalEnrolled: cSlot.realCount,
          capacity: cSlot.capacity,
          matchedSpillover: matchedSpillover ? {
            centreName: matchedSpillover.centre?.name || 'Empty Slot',
            venue: matchedSpillover.venue || 'Available Room',
            currentCount: matchedSpillover.realCount,
            capacity: matchedSpillover.capacity,
          } : null,
          planA: {
            venue: cSlot.venue || 'Room A',
            total: countA,
            sections: sectionsA,
          },
          planB: {
            venue: matchedSpillover ? matchedSpillover.venue : 'Spillover Lab',
            spilloverCentreName: matchedSpillover ? matchedSpillover.centre?.name : '',
            total: countB,
            sections: sectionsB,
          },
        });
      });
    });

    // Sort by day order and student count
    const dayOrder: Record<string, number> = {
      MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5
    };
    return result.sort((a, b) => {
      const dDiff = (dayOrder[a.day] || 99) - (dayOrder[b.day] || 99);
      if (dDiff !== 0) return dDiff;
      return b.totalEnrolled - a.totalEnrolled;
    });
  }, [slots, allocations]);

  // Filter suggestions by selected day
  const filteredSuggestions = useMemo(() => {
    if (selectedDayFilter === 'ALL') return suggestions;
    return suggestions.filter(s => s.day === selectedDayFilter);
  }, [suggestions, selectedDayFilter]);

  // Overall Statistics
  const totalBenefittedStudents = useMemo(() => {
    return suggestions.reduce((acc, s) => acc + s.totalEnrolled, 0);
  }, [suggestions]);

  // Export Optimization Plan PDF
  const downloadOptimizationPDF = async () => {
    if (suggestions.length === 0) return;
    setDownloadingPDF(true);

    try {
      const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
      const pageWidth = doc.internal.pageSize.width;

      try {
        const response = await fetch('/rit-logo.png');
        const blob = await response.blob();
        const img = new Image();
        const imageLoadPromise = new Promise<{ width: number; height: number; dataUrl: string }>((resolve, reject) => {
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
          img.onerror = reject;
          img.src = URL.createObjectURL(blob);
        });

        const { width, height, dataUrl } = await imageLoadPromise;
        const targetHeight = 14;
        const targetWidth = (width / height) * targetHeight;
        const xPos = (pageWidth - targetWidth) / 2;
        doc.addImage(dataUrl, 'PNG', xPos, 8, targetWidth, targetHeight);
      } catch (e) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('RAJALAKSHMI INSTITUTE OF TECHNOLOGY', pageWidth / 2, 14, { align: 'center' });
      }

      // Title & Subtitle
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('SMART VENUE REBALANCING & ROOM SPILLOVER OPTIMIZATION PLAN', pageWidth / 2, 28, { align: 'center' });

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Overcrowded Slots Optimized: ${suggestions.length}   |   Benefitted Students: ${totalBenefittedStudents}   |   Academic Year: 2026-2027`,
        pageWidth / 2,
        34,
        { align: 'center' }
      );

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(14, 38, pageWidth - 14, 38);

      const tableHead = [
        ['Day & Timing', 'Overcrowded Centre', 'Current Venue & Count', 'Matched Free Venue', 'Recommended Lab A (Original Venue)', 'Recommended Lab B (Spillover Venue)']
      ];

      const tableBody = suggestions.map(s => {
        const timeInfo = `${s.day}\n${s.session === 'FORENOON' ? 'Morning' : 'Afternoon'}\n(${s.timing})`;
        const centreInfo = `${s.centreName}\nCoord: ${s.coordinatorName}`;
        const currentVenueInfo = `Venue: ${s.currentVenue}\nTotal: ${s.totalEnrolled} Students\n(Overcrowded)`;

        const matchedVenueInfo = s.matchedSpillover
          ? `Venue: ${s.matchedSpillover.venue}\n(${s.matchedSpillover.centreName})\nCurrent: ${s.matchedSpillover.currentCount} Students\n(Seats Free: ${s.matchedSpillover.capacity - s.matchedSpillover.currentCount})`
          : 'Spillover Room TBA';

        const planAText = `Venue: ${s.planA.venue}\nStrength: ${s.planA.total} Students\n\nSections:\n` +
          s.planA.sections.map((x: any) => `• ${x.name}: ${x.count}`).join('\n');

        const planBText = `Venue: ${s.planB.venue}\nStrength: ${s.planB.total} Students\n\nSections:\n` +
          s.planB.sections.map((x: any) => `• ${x.name}: ${x.count}`).join('\n');

        return [
          timeInfo,
          centreInfo,
          currentVenueInfo,
          matchedVenueInfo,
          planAText,
          planBText,
        ];
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
          3: { cellWidth: 40 },
          4: { cellWidth: 63 },
          5: { cellWidth: 63 },
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

  // Export Optimization Plan Excel
  const downloadOptimizationExcel = () => {
    if (suggestions.length === 0) return;
    setDownloadingExcel(true);

    try {
      const summaryData = suggestions.map((s, idx) => ({
        'S.No': idx + 1,
        'Day': s.day,
        'Session': s.session,
        'Timing': s.timing,
        'Overcrowded Centre': s.centreName,
        'Coordinator': `${s.coordinatorName} (${s.coordinatorMobile})`,
        'Current Venue': s.currentVenue,
        'Current Enrolled Count': s.totalEnrolled,
        'Capacity': s.capacity,
        'Matched Free Spillover Venue': s.matchedSpillover?.venue || 'TBA',
        'Spillover Current Occupancy': s.matchedSpillover ? `${s.matchedSpillover.currentCount} / ${s.matchedSpillover.capacity}` : '',
        'Recommended Lab A Venue': s.planA.venue,
        'Lab A Student Strength': s.planA.total,
        'Lab A Sections': s.planA.sections.map((x: any) => `${x.name}: ${x.count}`).join('; '),
        'Recommended Lab B Venue': s.planB.venue,
        'Lab B Student Strength': s.planB.total,
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
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
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
                  Smart Venue Optimization &amp; Room Spillover Planner
                </h2>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
                  Smart Rebalancing
                </span>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm font-medium mt-0.5">
                Automatically pairs overcrowded centre rooms (&gt; 70 students) with empty / low-occupancy rooms at the same time slot.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={downloadOptimizationPDF}
              disabled={downloadingPDF || suggestions.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Download Venue Optimization Proposal PDF for Principal/Deans"
            >
              <Printer className="w-4 h-4" />
              <span>{downloadingPDF ? 'Generating...' : 'Download Proposal PDF'}</span>
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
              <Calendar className="w-3.5 h-3.5 text-slate-500" /> Filter:
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
                Scanning All Slots &amp; Generating Smart Venue Rebalance Recommendations...
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
            <div className="space-y-4">
              {filteredSuggestions.map((item, idx) => (
                <div
                  key={item.id}
                  className="bg-white border-2 border-slate-200 hover:border-indigo-400 rounded-3xl p-5 shadow-sm transition-all relative overflow-hidden"
                >
                  {/* Top Badge Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-900 text-white text-[11px] font-black px-2.5 py-0.5 rounded-lg uppercase tracking-wider">
                        {item.day} {item.session}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-500">
                        {item.timing}
                      </span>
                      <span className="bg-red-50 text-red-700 text-[10px] font-black px-2 py-0.5 rounded-md border border-red-200 flex items-center gap-1 uppercase tracking-wider">
                        <AlertTriangle className="w-3 h-3 text-red-500" /> Room Capacity Exceeded
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-500">
                      Coordinator: <strong className="text-slate-800 font-extrabold">{item.coordinatorName}</strong>
                    </div>
                  </div>

                  {/* 3-Column Visual Flow: [Overcrowded Venue] -> [Optimization Arrow] -> [Matched Free Venue & Section Plan] */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                    
                    {/* Left: Current State */}
                    <div className="lg:col-span-4 bg-red-50/50 border border-red-200 rounded-2xl p-4">
                      <span className="text-[10px] font-black uppercase tracking-wider text-red-600 block mb-1">
                        Current Overcrowded State:
                      </span>
                      <h4 className="text-base font-black text-slate-900 leading-tight">
                        {item.centreName}
                      </h4>
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
                        Single classroom capacity (~70) is insufficient for {item.totalEnrolled} students.
                      </p>
                    </div>

                    {/* Middle: Arrow Indicator */}
                    <div className="lg:col-span-1 flex flex-col items-center justify-center">
                      <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-sm">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-black uppercase text-indigo-500 mt-1">Split Plan</span>
                    </div>

                    {/* Right: Smart Section Split Plan */}
                    <div className="lg:col-span-7 bg-indigo-50/40 border border-indigo-200 rounded-2xl p-4">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-indigo-600" /> Recommended Dual-Venue Section Split:
                        </span>
                        {item.matchedSpillover && (
                          <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                            Available Room: <strong className="text-emerald-700 font-black">{item.matchedSpillover.venue}</strong> ({item.matchedSpillover.currentCount} active)
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2.5">
                        {/* Lab A Box */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                              Lab A (Primary)
                            </span>
                            <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              {item.planA.total} Students
                            </span>
                          </div>
                          <p className="text-xs font-black text-slate-800 flex items-center gap-1 mb-2">
                            <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                            {item.planA.venue}
                          </p>
                          <div className="space-y-1">
                            {item.planA.sections.map((sec: any) => (
                              <div
                                key={sec.name}
                                className="text-[10px] font-bold bg-slate-50 text-slate-700 px-2 py-0.5 rounded border border-slate-100 flex items-center justify-between"
                              >
                                <span className="truncate">{sec.name}</span>
                                <strong className="text-slate-900 ml-1">{sec.count}</strong>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Lab B Box */}
                        <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-sm">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                              Lab B (Spillover Venue)
                            </span>
                            <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {item.planB.total} Students
                            </span>
                          </div>
                          <p className="text-xs font-black text-emerald-950 flex items-center gap-1 mb-2">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                            {item.planB.venue}
                          </p>
                          <div className="space-y-1">
                            {item.planB.sections.map((sec: any) => (
                              <div
                                key={sec.name}
                                className="text-[10px] font-bold bg-emerald-50/50 text-emerald-950 px-2 py-0.5 rounded border border-emerald-100 flex items-center justify-between"
                              >
                                <span className="truncate">{sec.name}</span>
                                <strong className="text-emerald-900 ml-1">{sec.count}</strong>
                              </div>
                            ))}
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
            💡 This optimization proposal ensures zero room overcrowding by dynamically utilizing under-occupied rooms.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
