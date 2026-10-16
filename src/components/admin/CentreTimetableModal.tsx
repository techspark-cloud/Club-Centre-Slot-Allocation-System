'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Calendar, Clock, MapPin, Users, Download, FileSpreadsheet, X, Search, 
  Layers, Phone, User, CheckCircle2, AlertTriangle, ChevronRight, Eye,
  Building2, ArrowUpDown, Filter, Printer, CalendarDays, BookOpen, Sparkles, Zap
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface CentreTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCentreId?: string | null;
  centres: any[];
  onOpenOptimizer?: () => void;
}

export default function CentreTimetableModal({
  isOpen,
  onClose,
  initialCentreId,
  centres,
  onOpenOptimizer,
}: CentreTimetableModalProps) {
  // Navigation Mode: 'BY_CENTRE' | 'BY_DAY' | 'REBALANCED'
  const [viewMode, setViewMode] = useState<'BY_CENTRE' | 'BY_DAY' | 'REBALANCED'>('BY_CENTRE');

  // Rebalanced Plan State
  const [rebalancedSuggestions, setRebalancedSuggestions] = useState<any[]>([]);
  const [rebalancedLoading, setRebalancedLoading] = useState(false);
  const [isRebalancedPublished, setIsRebalancedPublished] = useState(false);

  // By Centre State
  const [selectedCentreId, setSelectedCentreId] = useState<string>(
    initialCentreId || (centres.length > 0 ? centres[0].id : '')
  );
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [selectedSlotForList, setSelectedSlotForList] = useState<any | null>(null);

  // By Day Master State
  const [selectedDay, setSelectedDay] = useState<'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY'>('MONDAY');
  const [dayLoading, setDayLoading] = useState(false);
  const [daySlots, setDaySlots] = useState<any[]>([]);
  const [dayAllocations, setDayAllocations] = useState<any[]>([]);
  const [dayCentreFilter, setDayCentreFilter] = useState<string>('ALL');

  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  const supabase = createClient();
  const daysList: ('MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY')[] = [
    'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'
  ];

  useEffect(() => {
    if (initialCentreId) {
      setSelectedCentreId(initialCentreId);
    }
  }, [initialCentreId]);

  const currentCentre = useMemo(() => {
    return centres.find(c => c.id === selectedCentreId) || centres[0];
  }, [centres, selectedCentreId]);

  // 1. Fetch data for "BY_CENTRE" mode
  useEffect(() => {
    if (!isOpen || viewMode !== 'BY_CENTRE' || !selectedCentreId) return;

    let isMounted = true;
    async function fetchCentreData() {
      setLoading(true);
      try {
        const { data: slotData, error: slotErr } = await supabase
          .from('slots')
          .select('*')
          .eq('centre_id', selectedCentreId)
          .order('day');

        if (slotErr) throw slotErr;
        const currentSlots = slotData || [];

        if (currentSlots.length > 0) {
          const slotIds = currentSlots.map(s => s.id);
          const { data: allocData, error: allocErr } = await supabase
            .from('allocations')
            .select(`
              id,
              slot_id,
              created_at,
              student:students (
                id,
                name,
                register_no,
                course,
                section,
                contact_no,
                hosteler,
                activity_session
              )
            `)
            .in('slot_id', slotIds);

          if (allocErr) throw allocErr;

          if (isMounted) {
            setSlots(currentSlots);
            setAllocations(allocData || []);
            setSelectedSlotForList(currentSlots[0] || null);
          }
        } else {
          if (isMounted) {
            setSlots([]);
            setAllocations([]);
            setSelectedSlotForList(null);
          }
        }
      } catch (err) {
        console.error('Error fetching centre timetable:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchCentreData();
    return () => { isMounted = false; };
  }, [isOpen, viewMode, selectedCentreId]);

  // 2. Fetch data for "BY_DAY" mode
  useEffect(() => {
    if (!isOpen || viewMode !== 'BY_DAY') return;

    let isMounted = true;
    async function fetchDayData() {
      setDayLoading(true);
      try {
        const { data: slotData, error: slotErr } = await supabase
          .from('slots')
          .select('*, centre:centres(id, name, faculty_name, faculty_mobile)')
          .eq('day', selectedDay)
          .not('centre_id', 'is', null)
          .order('session')
          .order('start_time');

        if (slotErr) throw slotErr;
        const currentSlots = slotData || [];

        if (currentSlots.length > 0) {
          const slotIds = currentSlots.map(s => s.id);
          const { data: allocData, error: allocErr } = await supabase
            .from('allocations')
            .select(`
              id,
              slot_id,
              created_at,
              student:students (
                id,
                name,
                register_no,
                course,
                section,
                contact_no,
                hosteler,
                activity_session
              )
            `)
            .in('slot_id', slotIds);

          if (allocErr) throw allocErr;

          if (isMounted) {
            setDaySlots(currentSlots);
            setDayAllocations(allocData || []);
          }
        } else {
          if (isMounted) {
            setDaySlots([]);
            setDayAllocations([]);
          }
        }
      } catch (err) {
        console.error('Error fetching day schedule:', err);
      } finally {
        if (isMounted) setDayLoading(false);
      }
    }

    fetchDayData();
    return () => { isMounted = false; };
  }, [isOpen, viewMode, selectedDay]);

  // 3. Fetch data for "REBALANCED" timetable mode
  useEffect(() => {
    if (!isOpen || viewMode !== 'REBALANCED') return;

    let isMounted = true;
    async function fetchRebalanced() {
      setRebalancedLoading(true);
      try {
        const res = await fetch('/api/admin/venue-optimization');
        const data = await res.json();
        if (data.success && isMounted) {
          setRebalancedSuggestions(data.suggestions || []);
          setIsRebalancedPublished(!!data.isPublished);
        }
      } catch (err) {
        console.error('Failed to load rebalanced plan in timetable:', err);
      } finally {
        if (isMounted) setRebalancedLoading(false);
      }
    }

    fetchRebalanced();
    return () => { isMounted = false; };
  }, [isOpen, viewMode]);

  // Group slots by Day and Timing for "BY_CENTRE" view
  const scheduleMatrix = useMemo(() => {
    const matrix: Record<string, { forenoon?: any; afternoon?: any }> = {
      MONDAY: {},
      TUESDAY: {},
      WEDNESDAY: {},
      THURSDAY: {},
      FRIDAY: {},
    };

    slots.forEach(slot => {
      const day = slot.day?.toUpperCase();
      if (!matrix[day]) matrix[day] = {};

      const isFN = slot.session === 'FORENOON' || (slot.start_time && slot.start_time.startsWith('09:40'));
      const isAN = slot.session === 'AFTERNOON' || (slot.start_time && slot.start_time.startsWith('13:10'));

      const slotAllocs = allocations.filter(a => a.slot_id === slot.id);

      const deptMap: Record<string, number> = {};
      slotAllocs.forEach(a => {
        if (!a.student) return;
        const deptName = a.student.course?.replace(/^B\.Tech\.\s*|^B\.E\.\s*/i, '') || 'Dept';
        const sec = a.student.section ? `Sec ${a.student.section}` : '';
        const key = sec ? `${deptName} (${sec})` : deptName;
        deptMap[key] = (deptMap[key] || 0) + 1;
      });

      const slotInfo = {
        ...slot,
        enrolledCount: slotAllocs.length,
        allocations: slotAllocs,
        deptBreakdown: deptMap,
      };

      if (isFN) matrix[day].forenoon = slotInfo;
      else if (isAN) matrix[day].afternoon = slotInfo;
      else {
        if (!matrix[day].forenoon) matrix[day].forenoon = slotInfo;
        else matrix[day].afternoon = slotInfo;
      }
    });

    return matrix;
  }, [slots, allocations]);

  // Filtered students for single centre slot
  const currentSlotStudents = useMemo(() => {
    if (!selectedSlotForList) return [];
    const allocs = allocations.filter(a => a.slot_id === selectedSlotForList.id);
    const q = studentSearchQuery.trim().toLowerCase();

    return allocs
      .filter(a => {
        if (!a.student) return false;
        if (!q) return true;
        return (
          a.student.name?.toLowerCase().includes(q) ||
          a.student.register_no?.toLowerCase().includes(q) ||
          a.student.course?.toLowerCase().includes(q) ||
          a.student.section?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.student?.register_no || '').localeCompare(b.student?.register_no || ''));
  }, [selectedSlotForList, allocations, studentSearchQuery]);

  // Day Master filtered students
  const filteredDayStudents = useMemo(() => {
    const slotMap = new Map(daySlots.map(s => [s.id, s]));
    const q = studentSearchQuery.trim().toLowerCase();

    return dayAllocations
      .filter(a => {
        if (!a.student) return false;
        const slot = slotMap.get(a.slot_id);
        if (dayCentreFilter !== 'ALL' && slot?.centre_id !== dayCentreFilter) return false;

        if (!q) return true;
        return (
          a.student.name?.toLowerCase().includes(q) ||
          a.student.register_no?.toLowerCase().includes(q) ||
          a.student.course?.toLowerCase().includes(q) ||
          a.student.section?.toLowerCase().includes(q) ||
          slot?.centre?.name?.toLowerCase().includes(q) ||
          slot?.venue?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const slotA = slotMap.get(a.slot_id);
        const slotB = slotMap.get(b.slot_id);
        const cDiff = (slotA?.centre?.name || '').localeCompare(slotB?.centre?.name || '');
        if (cDiff !== 0) return cDiff;
        return (a.student?.register_no || '').localeCompare(b.student?.register_no || '');
      });
  }, [dayAllocations, daySlots, dayCentreFilter, studentSearchQuery]);

  // Export Centre Timetable PDF (Single Centre)
  const downloadTimetablePDF = async () => {
    if (!currentCentre) return;
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

      const facultyInfo = currentCentre.faculty_name
        ? `Faculty Coordinator: ${currentCentre.faculty_name} (${currentCentre.faculty_mobile || 'N/A'})`
        : 'Faculty Coordinator: Not Assigned';

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`CENTRE MASTER TIMETABLE: ${currentCentre.name.toUpperCase()}`, pageWidth / 2, 28, { align: 'center' });

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`${facultyInfo}   |   Academic Year: 2026-2027`, pageWidth / 2, 34, { align: 'center' });

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(14, 38, pageWidth - 14, 38);

      const tableHead = [
        ['Day', 'Morning Slot (09:40 - 10:30 AM)', 'Afternoon Slot (01:10 - 02:00 PM)']
      ];

      const tableBody = daysList.map(day => {
        const slotData = scheduleMatrix[day];

        const formatSlotCell = (slot: any) => {
          if (!slot) return 'No Session Scheduled';
          const venue = `Venue: ${slot.venue || 'TBA'}`;
          const count = `Strength: ${slot.enrolledCount} / ${slot.capacity} Students`;
          const depts = Object.entries(slot.deptBreakdown)
            .map(([d, c]) => `• ${d}: ${c}`)
            .join('\n');
          return `${venue} | ${count}\n\nDepartments & Sections:\n${depts || 'General Allocation'}`;
        };

        return [
          day,
          formatSlotCell(slotData?.forenoon),
          formatSlotCell(slotData?.afternoon),
        ];
      });

      autoTable(doc, {
        head: tableHead,
        body: tableBody,
        startY: 42,
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 3.5, valign: 'top' },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 32, fontStyle: 'bold', halign: 'center', fillColor: [248, 250, 252] },
          1: { cellWidth: 118 },
          2: { cellWidth: 118 },
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

      doc.save(`${currentCentre.name.replace(/\s+/g, '_')}_Weekly_Timetable.pdf`);
    } catch (err) {
      console.error('PDF Generation failed:', err);
      alert('Failed to generate timetable PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  // Export Single Centre Excel
  const downloadStudentRosterExcel = () => {
    if (!currentCentre || allocations.length === 0) {
      alert('No students enrolled in this centre yet.');
      return;
    }
    setDownloadingExcel(true);

    try {
      const slotMap = new Map(slots.map(s => [s.id, s]));

      const excelData = allocations
        .filter(a => a.student)
        .sort((a, b) => {
          const slotA = slotMap.get(a.slot_id);
          const slotB = slotMap.get(b.slot_id);
          if (slotA?.day !== slotB?.day) return (slotA?.day || '').localeCompare(slotB?.day || '');
          return (a.student?.register_no || '').localeCompare(b.student?.register_no || '');
        })
        .map((a, idx) => {
          const slot = slotMap.get(a.slot_id);
          return {
            'S.No': idx + 1,
            'Register No': a.student.register_no || '',
            'Student Name': a.student.name || '',
            'Department': a.student.course || '',
            'Section': a.student.section || '',
            'Day': slot?.day || '',
            'Session': slot?.session || '',
            'Timing': slot ? `${slot.start_time?.substring(0, 5)} - ${slot.end_time?.substring(0, 5)}` : '',
            'Venue': slot?.venue || '',
            'Contact No': a.student.contact_no || '',
            'Hosteler': a.student.hosteler || 'No',
          };
        });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Enrolled Students');
      XLSX.writeFile(workbook, `${currentCentre.name.replace(/\s+/g, '_')}_Student_Roster.xlsx`);
    } catch (err) {
      console.error('Excel Export failed:', err);
      alert('Failed to export excel');
    } finally {
      setDownloadingExcel(false);
    }
  };

  // Export Day Master PDF (All Centres for Selected Day)
  const downloadDayMasterPDF = async () => {
    if (daySlots.length === 0) {
      alert(`No centre slots found for ${selectedDay}`);
      return;
    }
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

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`DAY MASTER SCHEDULE: ${selectedDay} (ALL CENTRES)`, pageWidth / 2, 28, { align: 'center' });

      const activeCentresCount = new Set(daySlots.map(s => s.centre_id)).size;
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Total Active Centres: ${activeCentresCount}   |   Total Enrolled Students: ${dayAllocations.length}   |   Academic Year: 2026-2027`,
        pageWidth / 2,
        34,
        { align: 'center' }
      );

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(14, 38, pageWidth - 14, 38);

      const tableHead = [
        ['Session', 'Timing', 'Centre Name', 'Venue', 'Faculty Coordinator', 'Strength', 'Allocated Departments & Sections']
      ];

      const sortedSlots = [...daySlots].sort((a, b) => {
        const sessOrder = (s: string) => (s === 'FORENOON' ? 1 : 2);
        const diff = sessOrder(a.session) - sessOrder(b.session);
        if (diff !== 0) return diff;
        return (a.centre?.name || '').localeCompare(b.centre?.name || '');
      });

      const tableBody = sortedSlots.map(slot => {
        const slotAllocs = dayAllocations.filter(a => a.slot_id === slot.id);
        const deptMap: Record<string, number> = {};
        slotAllocs.forEach(a => {
          if (!a.student) return;
          const deptName = a.student.course?.replace(/^B\.Tech\.\s*|^B\.E\.\s*/i, '') || 'Dept';
          const sec = a.student.section ? `Sec ${a.student.section}` : '';
          const key = sec ? `${deptName} (${sec})` : deptName;
          deptMap[key] = (deptMap[key] || 0) + 1;
        });

        const deptsText = Object.entries(deptMap)
          .map(([d, c]) => `• ${d}: ${c}`)
          .join('\n');

        const sessionLabel = slot.session === 'FORENOON' ? 'Morning' : 'Afternoon';
        const timing = `${slot.start_time?.substring(0, 5)} - ${slot.end_time?.substring(0, 5)}`;
        const coordinator = slot.centre?.faculty_name
          ? `${slot.centre.faculty_name}\n(${slot.centre.faculty_mobile || 'N/A'})`
          : 'Not Assigned';
        const strength = `${slotAllocs.length} / ${slot.capacity}`;

        return [
          sessionLabel,
          timing,
          slot.centre?.name || 'Centre',
          slot.venue || 'TBA',
          coordinator,
          strength,
          deptsText || 'General Choice',
        ];
      });

      autoTable(doc, {
        head: tableHead,
        body: tableBody,
        startY: 42,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2.5, valign: 'top' },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 20, fontStyle: 'bold', halign: 'center' },
          1: { cellWidth: 24, fontStyle: 'bold', halign: 'center' },
          2: { cellWidth: 50, fontStyle: 'bold' },
          3: { cellWidth: 22, halign: 'center' },
          4: { cellWidth: 42 },
          5: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
          6: { cellWidth: 88 },
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

      doc.save(`RIT_${selectedDay}_Centre_Master_Schedule.pdf`);
    } catch (err) {
      console.error('Day Master PDF Generation failed:', err);
      alert('Failed to generate day master timetable PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  // Export Day Master Excel (Overview Sheet + Full Student Roster Sheet)
  const downloadDayMasterExcel = () => {
    if (daySlots.length === 0 || dayAllocations.length === 0) {
      alert(`No allocations found for ${selectedDay}.`);
      return;
    }
    setDownloadingExcel(true);

    try {
      const slotMap = new Map(daySlots.map(s => [s.id, s]));

      // Sheet 1: Day Overview
      const summaryData = daySlots.map((slot, idx) => {
        const slotAllocs = dayAllocations.filter(a => a.slot_id === slot.id);
        const deptMap: Record<string, number> = {};
        slotAllocs.forEach(a => {
          if (!a.student) return;
          const deptName = a.student.course?.replace(/^B\.Tech\.\s*|^B\.E\.\s*/i, '') || 'Dept';
          const sec = a.student.section ? `Sec ${a.student.section}` : '';
          const key = sec ? `${deptName} (${sec})` : deptName;
          deptMap[key] = (deptMap[key] || 0) + 1;
        });

        const deptsSummary = Object.entries(deptMap)
          .map(([d, c]) => `${d}: ${c}`)
          .join('; ');

        return {
          'S.No': idx + 1,
          'Day': slot.day,
          'Session': slot.session,
          'Timing': `${slot.start_time?.substring(0, 5)} - ${slot.end_time?.substring(0, 5)}`,
          'Centre Name': slot.centre?.name || '',
          'Venue': slot.venue || '',
          'Faculty Coordinator': slot.centre?.faculty_name || '',
          'Contact Mobile': slot.centre?.faculty_mobile || '',
          'Enrolled Count': slotAllocs.length,
          'Capacity': slot.capacity,
          'Participating Departments': deptsSummary || 'General Choice',
        };
      });

      // Sheet 2: Day Student Attendance Roster
      const rosterData = dayAllocations
        .filter(a => a.student)
        .sort((a, b) => {
          const slotA = slotMap.get(a.slot_id);
          const slotB = slotMap.get(b.slot_id);
          const centreDiff = (slotA?.centre?.name || '').localeCompare(slotB?.centre?.name || '');
          if (centreDiff !== 0) return centreDiff;
          return (a.student?.register_no || '').localeCompare(b.student?.register_no || '');
        })
        .map((a, idx) => {
          const slot = slotMap.get(a.slot_id);
          return {
            'S.No': idx + 1,
            'Day': selectedDay,
            'Session': slot?.session || '',
            'Timing': slot ? `${slot.start_time?.substring(0, 5)} - ${slot.end_time?.substring(0, 5)}` : '',
            'Centre Name': slot?.centre?.name || '',
            'Venue': slot?.venue || '',
            'Register No': a.student.register_no || '',
            'Student Name': a.student.name || '',
            'Department': a.student.course || '',
            'Section': a.student.section || '',
            'Contact No': a.student.contact_no || '',
            'Hosteler': a.student.hosteler || 'No',
          };
        });

      const workbook = XLSX.utils.book_new();
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      const wsRoster = XLSX.utils.json_to_sheet(rosterData);

      XLSX.utils.book_append_sheet(workbook, wsSummary, `${selectedDay} Overview`);
      XLSX.utils.book_append_sheet(workbook, wsRoster, `${selectedDay} Student Roster`);

      XLSX.writeFile(workbook, `RIT_${selectedDay}_Centre_Master_Schedule_and_Roster.xlsx`);
    } catch (err) {
      console.error('Day Master Excel Export failed:', err);
      alert('Failed to export Day Master Excel');
    } finally {
      setDownloadingExcel(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-6xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  Centre Master Timetable &amp; Schedule
                </h2>
                <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-widest">
                  Live View
                </span>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm font-medium mt-0.5">
                Download and inspect complete weekly centre schedules and whole-day master rosters.
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 self-stretch md:self-auto justify-between md:justify-end">
            <div className="flex items-center bg-white/10 p-1 rounded-2xl border border-white/15">
              <button
                onClick={() => setViewMode('BY_CENTRE')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  viewMode === 'BY_CENTRE'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>By Centre</span>
              </button>
              <button
                onClick={() => setViewMode('BY_DAY')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  viewMode === 'BY_DAY'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Entire Day Master</span>
              </button>
              <button
                onClick={() => setViewMode('REBALANCED')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  viewMode === 'REBALANCED'
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 shadow-sm font-black'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>⚡ Rebalanced Schedule</span>
              </button>
            </div>

            {onOpenOptimizer && (
              <button
                onClick={onOpenOptimizer}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-300 text-slate-950 transition-all shadow-sm cursor-pointer ml-1"
                title="View Smart Venue Rebalancing & Room Spillover Suggestions"
              >
                <Zap className="w-3.5 h-3.5 fill-slate-950" />
                <span>Room Optimizer</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors ml-1 cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTROLS SUB-HEADER */}
        {viewMode === 'BY_CENTRE' ? (
          // By Centre Control Bar
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 whitespace-nowrap flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-400" />
                Select Centre:
              </label>
              <select
                value={selectedCentreId}
                onChange={e => setSelectedCentreId(e.target.value)}
                className="w-full sm:w-auto min-w-[280px] max-w-md bg-white border-2 border-indigo-200 focus:border-indigo-600 rounded-xl px-3.5 py-2 text-sm font-extrabold text-slate-900 shadow-sm outline-none cursor-pointer"
              >
                {centres.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={downloadTimetablePDF}
                disabled={downloadingPDF || slots.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Download notice board printable PDF"
              >
                <Printer className="w-4 h-4" />
                <span>{downloadingPDF ? 'Generating...' : 'Print Timetable PDF'}</span>
              </button>
              <button
                onClick={downloadStudentRosterExcel}
                disabled={downloadingExcel || allocations.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Export all students roster into Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{downloadingExcel ? 'Exporting...' : 'Export Excel'}</span>
              </button>
            </div>
          </div>
        ) : viewMode === 'BY_DAY' ? (
          // Day Master Control Bar
          <div className="p-4 bg-gradient-to-r from-amber-50 via-indigo-50/40 to-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-amber-600" />
                Choose Day:
              </span>
              {daysList.map(d => (
                <button
                  key={d}
                  onClick={() => {
                    setSelectedDay(d);
                    setDayCentreFilter('ALL');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    selectedDay === d
                      ? 'bg-slate-900 text-white shadow-md scale-105'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Day Master Download Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={downloadDayMasterPDF}
                disabled={downloadingPDF || daySlots.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                title={`Download entire ${selectedDay} schedule PDF`}
              >
                <Printer className="w-4 h-4 text-amber-300" />
                <span>{downloadingPDF ? 'Generating...' : `Download ${selectedDay} Master PDF`}</span>
              </button>
              <button
                onClick={downloadDayMasterExcel}
                disabled={downloadingExcel || dayAllocations.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                title={`Export entire ${selectedDay} master roster in Excel`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{downloadingExcel ? 'Exporting...' : `Export ${selectedDay} Excel Roster`}</span>
              </button>
            </div>
          </div>
        ) : (
          // Rebalanced Schedule Control Bar
          <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-600" />
                Rebalanced Master Timetable:
              </span>
              <span className="text-xs font-bold text-slate-600 hidden sm:inline">
                Lab A (70 Max Capacity) &amp; Lab B (Spillover Room)
              </span>
              {isRebalancedPublished ? (
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  🟢 Live in Timetables
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  ⚠️ Draft Plan
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              {onOpenOptimizer && (
                <button
                  onClick={onOpenOptimizer}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all shadow-sm cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Adjust Sections in Optimizer</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* MODAL MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {viewMode === 'BY_CENTRE' ? (
            // ================= BY CENTRE VIEW =================
            loading ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-sm font-bold text-slate-500">Loading Centre Timetable &amp; Schedule...</p>
              </div>
            ) : slots.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-extrabold text-slate-700">No Slots Configured for This Centre</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  No active slots found in the database for {currentCentre?.name}. You can add slots in Activity Slots.
                </p>
              </div>
            ) : (
              <>
                {/* Centre Quick Stats */}
                <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-600 bg-slate-50 p-3 px-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span className="font-black text-slate-900 text-sm">{currentCentre?.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-extrabold text-slate-800">
                        {currentCentre?.faculty_name || 'Coordinator Not Assigned'}
                      </span>
                    </div>
                    {currentCentre?.faculty_mobile && (
                      <div className="flex items-center gap-1 text-slate-500">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        <span>{currentCentre.faculty_mobile}</span>
                      </div>
                    )}
                    <div className="border-l border-slate-200 pl-4 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      <span>
                        Total Enrolled: <strong className="text-slate-900 font-black">{allocations.length}</strong> Students
                      </span>
                    </div>
                  </div>
                </div>

                {/* WEEKLY TIMETABLE MATRIX */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      Weekly Schedule Matrix (Monday — Friday)
                    </h3>
                    <div className="flex items-center gap-3 text-[11px] font-bold">
                      <span className="flex items-center gap-1 text-emerald-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Optimal
                      </span>
                      <span className="flex items-center gap-1 text-amber-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Low Strength (&lt;10)
                      </span>
                      <span className="flex items-center gap-1 text-indigo-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> High Strength (&gt;70)
                      </span>
                    </div>
                  </div>

                  <div className="border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left min-w-[700px]">
                        <thead>
                          <tr className="bg-slate-100/80 border-b-2 border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-600">
                            <th className="p-3.5 w-[14%] border-r border-slate-200 text-center">Day</th>
                            <th className="p-3.5 w-[43%] border-r border-slate-200">
                              Morning Slot (09:40 — 10:30 AM)
                            </th>
                            <th className="p-3.5 w-[43%]">
                              Afternoon Slot (01:10 — 02:00 PM)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-xs">
                          {daysList.map(day => {
                            const slotData = scheduleMatrix[day];

                            const renderSlotCard = (slot: any) => {
                              if (!slot) {
                                return (
                                  <div className="h-full min-h-[90px] flex items-center justify-center p-3 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                    <span className="text-[11px] font-bold text-slate-400 italic">
                                      — No Session Scheduled —
                                    </span>
                                  </div>
                                );
                              }

                              const isSelected = selectedSlotForList?.id === slot.id;
                              const isLow = slot.enrolledCount > 0 && slot.enrolledCount < 10;
                              const isHigh = slot.enrolledCount >= 70;

                              return (
                                <div
                                  onClick={() => setSelectedSlotForList(slot)}
                                  className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer relative group ${
                                    isSelected
                                      ? 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-500/20 shadow-md'
                                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-indigo-400" />
                                        {slot.venue || 'Venue TBA'}
                                      </span>
                                      <span className="text-[11px] font-mono font-bold text-slate-500">
                                        {slot.start_time?.substring(0, 5)} - {slot.end_time?.substring(0, 5)}
                                      </span>
                                    </div>

                                    <span
                                      className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                                        isLow
                                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                          : isHigh
                                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      }`}
                                    >
                                      {slot.enrolledCount} / {slot.capacity} Students
                                    </span>
                                  </div>

                                  <div className="mt-2">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                      Allocated Departments &amp; Sections:
                                    </p>
                                    {Object.keys(slot.deptBreakdown).length > 0 ? (
                                      <div className="flex flex-wrap gap-1.5">
                                        {Object.entries(slot.deptBreakdown).map(([deptSec, count]) => (
                                          <span
                                            key={deptSec}
                                            className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-slate-200 transition-colors"
                                          >
                                            <span>{deptSec}:</span>
                                            <strong className="text-indigo-700 font-extrabold">{count as number}</strong>
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-[11px] font-semibold text-slate-400 italic">
                                        No students enrolled yet
                                      </span>
                                    )}
                                  </div>

                                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-extrabold text-indigo-600 group-hover:text-indigo-700">
                                    <span>{isSelected ? '✓ Viewing Student List Below' : 'Click to View Full Student List'}</span>
                                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                                  </div>
                                </div>
                              );
                            };

                            return (
                              <tr key={day} className="hover:bg-slate-50/50">
                                <td className="p-3.5 font-black text-slate-800 bg-slate-50 border-r border-slate-200 text-center align-middle">
                                  <span className="block text-sm">{day.substring(0, 3)}</span>
                                  <span className="text-[9px] text-slate-400 font-semibold">{day.substring(3)}</span>
                                </td>
                                <td className="p-2.5 border-r border-slate-200 align-top">
                                  {renderSlotCard(slotData?.forenoon)}
                                </td>
                                <td className="p-2.5 align-top">
                                  {renderSlotCard(slotData?.afternoon)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* DETAILED STUDENT ROSTER FOR SELECTED SLOT */}
                {selectedSlotForList && (
                  <div className="border-2 border-indigo-100 rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-indigo-50/30 via-white to-slate-50 shadow-sm animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-indigo-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-lg uppercase tracking-wider">
                            {selectedSlotForList.day} {selectedSlotForList.session}
                          </span>
                          <h4 className="text-base font-black text-slate-900 tracking-tight">
                            Student Roster ({selectedSlotForList.start_time?.substring(0, 5)} -{' '}
                            {selectedSlotForList.end_time?.substring(0, 5)} @ {selectedSlotForList.venue})
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Total {currentSlotStudents.length} Students matching filter.
                        </p>
                      </div>

                      <div className="relative min-w-[240px]">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={studentSearchQuery}
                          onChange={e => setStudentSearchQuery(e.target.value)}
                          placeholder="Search student / reg no / dept..."
                          className="w-full pl-9 pr-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 focus:border-indigo-500 rounded-xl outline-none"
                        />
                      </div>
                    </div>

                    {currentSlotStudents.length === 0 ? (
                      <div className="py-8 text-center text-xs font-bold text-slate-400 border border-slate-200 rounded-xl bg-white">
                        No students found matching your search.
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-inner max-h-[360px] overflow-y-auto">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-600 z-10">
                            <tr>
                              <th className="p-2.5 text-center w-12">#</th>
                              <th className="p-2.5">Register No</th>
                              <th className="p-2.5">Student Name</th>
                              <th className="p-2.5">Department</th>
                              <th className="p-2.5 text-center">Section</th>
                              <th className="p-2.5">Contact No</th>
                              <th className="p-2.5 text-center">Hosteler</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {currentSlotStudents.map((alloc, i) => (
                              <tr key={alloc.id} className="hover:bg-indigo-50/30 transition-colors">
                                <td className="p-2.5 text-center text-slate-400 font-bold text-[11px]">{i + 1}</td>
                                <td className="p-2.5 font-mono font-black text-indigo-900">
                                  {alloc.student?.register_no}
                                </td>
                                <td className="p-2.5 font-extrabold text-slate-900">
                                  {alloc.student?.name}
                                </td>
                                <td className="p-2.5 text-slate-600 text-[11px]">
                                  {alloc.student?.course}
                                </td>
                                <td className="p-2.5 text-center">
                                  <span className="bg-slate-100 text-slate-700 font-black px-2 py-0.5 rounded text-[10px] border border-slate-200">
                                    {alloc.student?.section || '-'}
                                  </span>
                                </td>
                                <td className="p-2.5 text-slate-600 font-mono text-[11px]">
                                  {alloc.student?.contact_no || 'N/A'}
                                </td>
                                <td className="p-2.5 text-center">
                                  <span
                                    className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                      alloc.student?.hosteler === 'Yes'
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {alloc.student?.hosteler || 'No'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </>
            )
          ) : viewMode === 'BY_DAY' ? (
            // ================= ENTIRE DAY MASTER VIEW =================
            dayLoading ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-sm font-bold text-slate-600">
                  Aggregating all centre allocations for {selectedDay}...
                </p>
              </div>
            ) : daySlots.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-extrabold text-slate-700">No Centres Operating on {selectedDay}</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  There are no active centre slots scheduled for {selectedDay}.
                </p>
              </div>
            ) : (
              <>
                {/* Day Overview Banner Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-4 rounded-2xl border border-indigo-200 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-indigo-500">Day Selected</p>
                      <h4 className="text-xl font-black text-indigo-950 mt-0.5">{selectedDay}</h4>
                      <p className="text-xs text-indigo-700 font-semibold mt-0.5">Master Schedule</p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md">
                      {selectedDay.substring(0, 2)}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-4 rounded-2xl border border-purple-200 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-purple-500">Active Centres</p>
                      <h4 className="text-2xl font-black text-purple-950 mt-0.5">
                        {new Set(daySlots.map(s => s.centre_id)).size} Centres
                      </h4>
                      <p className="text-xs text-purple-700 font-semibold mt-0.5">{daySlots.length} Total Slots</p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md">
                      <Building2 className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-emerald-600">Total Enrolled</p>
                      <h4 className="text-2xl font-black text-emerald-950 mt-0.5">
                        {dayAllocations.length} Students
                      </h4>
                      <p className="text-xs text-emerald-700 font-semibold mt-0.5">Attending on {selectedDay}</p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* SESSIONS BREAKDOWN GRID (Morning & Afternoon) */}
                <div className="space-y-6">
                  {/* 1. MORNING SESSION */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-500" />
                        Morning Session (09:40 — 10:30 AM)
                      </h4>
                      <span className="text-xs font-bold text-slate-500">
                        {daySlots.filter(s => s.session === 'FORENOON' || s.start_time?.startsWith('09:40')).length} Centres Running
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {daySlots
                        .filter(s => s.session === 'FORENOON' || s.start_time?.startsWith('09:40'))
                        .map(slot => {
                          const slotAllocs = dayAllocations.filter(a => a.slot_id === slot.id);
                          const deptMap: Record<string, number> = {};
                          slotAllocs.forEach(a => {
                            if (!a.student) return;
                            const deptName = a.student.course?.replace(/^B\.Tech\.\s*|^B\.E\.\s*/i, '') || 'Dept';
                            const sec = a.student.section ? `Sec ${a.student.section}` : '';
                            const key = sec ? `${deptName} (${sec})` : deptName;
                            deptMap[key] = (deptMap[key] || 0) + 1;
                          });

                          const isLow = slotAllocs.length > 0 && slotAllocs.length < 10;
                          const isHigh = slotAllocs.length >= 70;

                          return (
                            <div
                              key={slot.id}
                              onClick={() => setDayCentreFilter(slot.centre_id)}
                              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer bg-white hover:shadow-md ${
                                dayCentreFilter === slot.centre_id
                                  ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/30'
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h5 className="font-black text-slate-900 text-sm leading-tight">
                                  {slot.centre?.name}
                                </h5>
                                <span
                                  className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                                    isLow
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : isHigh
                                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  }`}
                                >
                                  {slotAllocs.length} / {slot.capacity}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 mb-2 text-xs">
                                <span className="bg-slate-900 text-white font-black text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-amber-400" />
                                  {slot.venue || 'TBA'}
                                </span>
                                <span className="text-slate-500 font-medium text-[11px] truncate">
                                  {slot.centre?.faculty_name || 'No coordinator'}
                                </span>
                              </div>

                              <div className="mt-2.5 pt-2 border-t border-slate-100">
                                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                                  Departments:
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(deptMap).map(([dept, cnt]) => (
                                    <span
                                      key={dept}
                                      className="text-[9px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
                                    >
                                      {dept}: <strong className="text-indigo-600 font-black">{cnt}</strong>
                                    </span>
                                  ))}
                                  {Object.keys(deptMap).length === 0 && (
                                    <span className="text-[10px] text-slate-400 italic">No students enrolled</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* 2. AFTERNOON SESSION */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-600" />
                        Afternoon Session (01:10 — 02:00 PM)
                      </h4>
                      <span className="text-xs font-bold text-slate-500">
                        {daySlots.filter(s => s.session === 'AFTERNOON' || s.start_time?.startsWith('13:10')).length} Centres Running
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {daySlots
                        .filter(s => s.session === 'AFTERNOON' || s.start_time?.startsWith('13:10'))
                        .map(slot => {
                          const slotAllocs = dayAllocations.filter(a => a.slot_id === slot.id);
                          const deptMap: Record<string, number> = {};
                          slotAllocs.forEach(a => {
                            if (!a.student) return;
                            const deptName = a.student.course?.replace(/^B\.Tech\.\s*|^B\.E\.\s*/i, '') || 'Dept';
                            const sec = a.student.section ? `Sec ${a.student.section}` : '';
                            const key = sec ? `${deptName} (${sec})` : deptName;
                            deptMap[key] = (deptMap[key] || 0) + 1;
                          });

                          const isLow = slotAllocs.length > 0 && slotAllocs.length < 10;
                          const isHigh = slotAllocs.length >= 70;

                          return (
                            <div
                              key={slot.id}
                              onClick={() => setDayCentreFilter(slot.centre_id)}
                              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer bg-white hover:shadow-md ${
                                dayCentreFilter === slot.centre_id
                                  ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/30'
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h5 className="font-black text-slate-900 text-sm leading-tight">
                                  {slot.centre?.name}
                                </h5>
                                <span
                                  className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                                    isLow
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : isHigh
                                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  }`}
                                >
                                  {slotAllocs.length} / {slot.capacity}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 mb-2 text-xs">
                                <span className="bg-slate-900 text-white font-black text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-indigo-400" />
                                  {slot.venue || 'TBA'}
                                </span>
                                <span className="text-slate-500 font-medium text-[11px] truncate">
                                  {slot.centre?.faculty_name || 'No coordinator'}
                                </span>
                              </div>

                              <div className="mt-2.5 pt-2 border-t border-slate-100">
                                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                                  Departments:
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(deptMap).map(([dept, cnt]) => (
                                    <span
                                      key={dept}
                                      className="text-[9px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
                                    >
                                      {dept}: <strong className="text-indigo-600 font-black">{cnt}</strong>
                                    </span>
                                  ))}
                                  {Object.keys(deptMap).length === 0 && (
                                    <span className="text-[10px] text-slate-400 italic">No students enrolled</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* DAY FULL STUDENT ROSTER TABLE */}
                <div className="border-2 border-slate-200 rounded-2xl p-4 sm:p-5 bg-white shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-slate-900 tracking-tight">
                          Full Student Roster for {selectedDay}
                        </h4>
                        <span className="bg-slate-100 text-slate-700 text-xs font-black px-2 py-0.5 rounded-md border border-slate-200">
                          {filteredDayStudents.length} Students
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Students attending centres across all venues on {selectedDay}.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Filter by centre */}
                      <select
                        value={dayCentreFilter}
                        onChange={e => setDayCentreFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-300 text-xs font-bold rounded-xl px-2.5 py-1.5 text-slate-800 outline-none"
                      >
                        <option value="ALL">All Centres on {selectedDay}</option>
                        {Array.from(new Set(daySlots.map(s => s.centre_id))).map(cid => {
                          const c = daySlots.find(s => s.centre_id === cid)?.centre;
                          return (
                            <option key={cid} value={cid}>
                              {c?.name || 'Centre'}
                            </option>
                          );
                        })}
                      </select>

                      <div className="relative min-w-[200px]">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={studentSearchQuery}
                          onChange={e => setStudentSearchQuery(e.target.value)}
                          placeholder="Search student / reg no..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 focus:border-indigo-500 rounded-xl outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {filteredDayStudents.length === 0 ? (
                    <div className="py-8 text-center text-xs font-bold text-slate-400 border border-slate-200 rounded-xl bg-slate-50">
                      No students found matching current filters.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-inner max-h-[380px] overflow-y-auto">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-600 z-10">
                          <tr>
                            <th className="p-2.5 text-center w-12">#</th>
                            <th className="p-2.5">Centre Allocated</th>
                            <th className="p-2.5">Session / Venue</th>
                            <th className="p-2.5">Register No</th>
                            <th className="p-2.5">Student Name</th>
                            <th className="p-2.5">Department</th>
                            <th className="p-2.5 text-center">Section</th>
                            <th className="p-2.5">Contact No</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {filteredDayStudents.map((alloc, i) => {
                            const slot = daySlots.find(s => s.id === alloc.slot_id);
                            return (
                              <tr key={alloc.id} className="hover:bg-indigo-50/30 transition-colors">
                                <td className="p-2.5 text-center text-slate-400 font-bold text-[11px]">{i + 1}</td>
                                <td className="p-2.5 font-extrabold text-slate-900">
                                  {slot?.centre?.name}
                                </td>
                                <td className="p-2.5">
                                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 mr-1.5">
                                    {slot?.session === 'FORENOON' ? 'Morning' : 'Afternoon'}
                                  </span>
                                  <span className="font-mono text-slate-600 text-[11px] font-bold">
                                    {slot?.venue}
                                  </span>
                                </td>
                                <td className="p-2.5 font-mono font-black text-indigo-950">
                                  {alloc.student?.register_no}
                                </td>
                                <td className="p-2.5 font-extrabold text-slate-800">
                                  {alloc.student?.name}
                                </td>
                                <td className="p-2.5 text-slate-600 text-[11px]">
                                  {alloc.student?.course}
                                </td>
                                <td className="p-2.5 text-center">
                                  <span className="bg-slate-100 text-slate-700 font-black px-2 py-0.5 rounded text-[10px] border border-slate-200">
                                    {alloc.student?.section || '-'}
                                  </span>
                                </td>
                                <td className="p-2.5 text-slate-600 font-mono text-[11px]">
                                  {alloc.student?.contact_no || 'N/A'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )
          ) : (
            // ================= REBALANCED TIMETABLE VIEW =================
            rebalancedLoading ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-sm font-bold text-slate-600">
                  Loading Rebalanced Schedule and Section Allocations...
                </p>
              </div>
            ) : rebalancedSuggestions.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-base font-extrabold text-slate-800">All Centres Operating Within Normal Room Capacity</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  No centres currently exceed standard capacity (&gt; 70 students).
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-black flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-400" />
                        <span>Rebalanced Slot Timetable &amp; Venue Schedule (2026)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Master view of Primary Venues (Lab A: 70 seats) and Spillover Venues (Lab B: balance overflow).
                      </p>
                    </div>
                    {onOpenOptimizer && (
                      <button
                        onClick={onOpenOptimizer}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all shadow-xs cursor-pointer"
                      >
                        Adjust in Room Optimizer
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-wider border-b border-slate-200">
                          <th className="p-3">Day &amp; Session</th>
                          <th className="p-3">Centre &amp; Coordinator</th>
                          <th className="p-3 text-center">Total Strength</th>
                          <th className="p-3 bg-indigo-50/80 border-x border-indigo-100">Lab A (Primary — 70 Seats)</th>
                          <th className="p-3 bg-emerald-50/80 border-r border-emerald-100">Lab B (Spillover — Overflow)</th>
                          <th className="p-3 text-center">Timetable Sync Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {rebalancedSuggestions.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 align-top whitespace-nowrap">
                              <span className="font-black text-slate-900 text-xs block">{item.day}</span>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                {item.session === 'FORENOON' ? 'Morning' : 'Afternoon'}
                              </span>
                              <span className="text-[11px] font-mono text-indigo-700 font-extrabold mt-1 inline-block bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                {item.timing}
                              </span>
                            </td>

                            <td className="p-3 align-top min-w-[180px]">
                              <h4 className="font-black text-slate-900 text-sm leading-tight">{item.centreName}</h4>
                              <p className="text-[11px] text-slate-500 mt-1">
                                Coord: <strong className="text-slate-700">{item.coordinatorName}</strong>
                              </p>
                              <p className="text-[10px] text-slate-400">{item.coordinatorMobile}</p>
                            </td>

                            <td className="p-3 align-top text-center whitespace-nowrap">
                              <span className="text-base font-black text-slate-900 block leading-none">{item.totalEnrolled}</span>
                              <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded inline-block mt-1">
                                +{item.excessCount} Overcrowded
                              </span>
                            </td>

                            <td className="p-3 align-top bg-indigo-50/30 border-x border-indigo-100 min-w-[210px]">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-black text-indigo-950 flex items-center gap-1 text-xs">
                                  <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  {item.planA.venue}
                                </span>
                                <span className="text-[10px] font-black bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded border border-indigo-200">
                                  {item.planA.total} Students
                                </span>
                              </div>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                Full Room Capacity Retained
                              </span>
                              <div className="space-y-1 mt-1">
                                {item.planA.sections.map((sec: any) => (
                                  <div key={sec.name} className="flex items-center justify-between text-[10px] font-semibold bg-white p-1 rounded border border-indigo-100 shadow-2xs">
                                    <span className="text-slate-700 truncate max-w-[140px]" title={sec.name}>• {sec.name}</span>
                                    <strong className="text-indigo-950 bg-indigo-50 px-1.5 py-0.2 rounded font-extrabold">{sec.count}</strong>
                                  </div>
                                ))}
                              </div>
                            </td>

                            <td className="p-3 align-top bg-emerald-50/30 border-r border-emerald-100 min-w-[210px]">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-black text-emerald-950 flex items-center gap-1 text-xs">
                                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  {item.planB.venue}
                                </span>
                                <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                                  {item.planB.total} Students
                                </span>
                              </div>
                              {item.planB.spilloverCentreName && (
                                <span className="text-[9.5px] font-extrabold text-emerald-700 block mb-1">
                                  [{item.planB.spilloverCentreName}]
                                </span>
                              )}
                              <div className="space-y-1 mt-1">
                                {item.planB.sections.map((sec: any) => (
                                  <div key={sec.name} className="flex items-center justify-between text-[10px] font-semibold bg-white p-1 rounded border border-emerald-100 shadow-2xs">
                                    <span className="text-slate-700 truncate max-w-[140px]" title={sec.name}>• {sec.name}</span>
                                    <strong className="text-emerald-950 bg-emerald-50 px-1.5 py-0.2 rounded font-extrabold">{sec.count}</strong>
                                  </div>
                                ))}
                              </div>
                            </td>

                            <td className="p-3 align-top text-center whitespace-nowrap">
                              {isRebalancedPublished ? (
                                <div className="inline-flex flex-col items-center gap-1">
                                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Live in Timetable
                                  </span>
                                  <span className="text-[9px] text-slate-400">Students see {item.planB.venue}</span>
                                </div>
                              ) : (
                                <div className="inline-flex flex-col items-center gap-1">
                                  <span className="text-[10px] font-black text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" /> Draft Plan
                                  </span>
                                  <span className="text-[9px] text-slate-400">Not published</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-xs text-slate-400 font-medium">
            💡 Day Master reports aggregate all operational centres and allocated students in real-time.
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
