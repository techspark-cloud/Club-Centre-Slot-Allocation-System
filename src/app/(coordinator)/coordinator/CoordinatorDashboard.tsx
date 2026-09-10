'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Users, Calendar, MapPin, Download, BookOpen, Clock, Building2, User, 
  CheckCircle2, XCircle, AlertCircle, FileText, QrCode, Search, Filter,
  CheckCheck, UserX, Sparkles, Phone, ShieldCheck, RefreshCw, ChevronRight,
  BarChart3, Sun, Moon, Activity, Check
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRScannerModal from './QRScannerModal';
import ActivityReportModal from './ActivityReportModal';
import { getEntityLogoUrl } from '@/lib/clubLogos';

interface CoordinatorDashboardProps {
  assignedClubs: any[];
  assignedCentres: any[];
  clubSlots: any[];
  centreSlots: any[];
  clubAllocations: any[];
  centreAllocations: any[];
  holidaysList: any[];
  coordinatorName?: string;
}

export default function CoordinatorDashboard({
  assignedClubs,
  assignedCentres,
  clubSlots,
  centreSlots,
  clubAllocations,
  centreAllocations,
  holidaysList,
  coordinatorName,
}: CoordinatorDashboardProps) {
  const [activeTab, setActiveTab] = useState<'clubs' | 'centres' | 'reports'>(
    assignedClubs.length > 0 ? 'clubs' : (assignedCentres.length > 0 ? 'centres' : 'reports')
  );
  
  const currentEntities = activeTab === 'clubs' ? assignedClubs : assignedCentres;
  const currentSlots = activeTab === 'clubs' ? clubSlots : centreSlots;
  const currentAllocations = activeTab === 'clubs' ? clubAllocations : centreAllocations;
  const allAssignedEntities = [...assignedClubs, ...assignedCentres];

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [auditReports, setAuditReports] = useState<any[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState(false);

  // Advanced Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT' | 'UNMARKED'>('ALL');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  useEffect(() => {
    if (activeTab === 'reports') {
      const fetchAuditReports = async () => {
        setIsAuditLoading(true);
        try {
          const res = await fetch('/api/admin/audit-reports');
          const result = await res.json();
          if (result.success) {
            setAuditReports(result.data || []);
          }
        } catch (err) {
          console.error("Failed to fetch audit reports:", err);
        } finally {
          setIsAuditLoading(false);
        }
      };
      fetchAuditReports();
    }
  }, [activeTab]);
  
  const today = new Date().toISOString().split('T')[0];
  
  const activeSlot = currentSlots.find(s => s.id === selectedSlotId);
  const selectedDateObj = new Date(selectedDate);
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const dayOfWeek = days[selectedDateObj.getDay()];
  
  const isWrongDay = activeSlot && activeSlot.day !== dayOfWeek;
  const isFutureDate = selectedDate > today;
  const isDateLocked = isFutureDate || isWrongDay;

  // Compute holiday status based on selectedDate
  const isSunday = selectedDateObj.getDay() === 0;
  const dbHoliday = holidaysList.find(h => h.date === selectedDate);
  
  const isHoliday = isSunday || !!dbHoliday;
  const holidayReason = isSunday ? 'Sunday (Weekly Off)' : (dbHoliday?.description || '');

  // Greeting Calculation
  const currentHour = new Date().getHours();
  const timeGreeting = currentHour < 12 ? 'Good Morning' : currentHour < 17 ? 'Good Afternoon' : 'Good Evening';
  const displayName = coordinatorName || assignedClubs[0]?.faculty_name || assignedCentres[0]?.faculty_name || 'Faculty Coordinator';

  useEffect(() => {
    if (!selectedSlotId || !selectedDate) {
      setAttendanceData([]);
      return;
    }
    const fetchAttendance = async () => {
      setIsAttendanceLoading(true);
      try {
        const res = await fetch(`/api/coordinator/attendance?slot_id=${selectedSlotId}&date=${selectedDate}&t=${Date.now()}`, {
          credentials: 'include'
        });
        const { data, error } = await res.json();
        
        if (error) {
          console.error("API Error fetching attendance:", error);
          setAttendanceData([]);
        } else {
          setAttendanceData(data || []);
        }
      } catch(e) {
        console.error(e);
      } finally {
        setIsAttendanceLoading(false);
      }
    };
    fetchAttendance();
  }, [selectedSlotId, selectedDate]);

  const markAttendance = async (studentId: string, status: 'PRESENT' | 'ABSENT') => {
    if (!selectedSlotId || isDateLocked) return;
    
    // Optimistic UI Update
    setAttendanceData(prev => {
      const exists = prev.find(a => a.student_id === studentId);
      if (exists) {
        return prev.map(a => a.student_id === studentId ? { ...a, status } : a);
      }
      return [...prev, { student_id: studentId, status, date: selectedDate }];
    });

    try {
      const res = await fetch('/api/coordinator/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_id: selectedSlotId,
          date: selectedDate,
          student_id: studentId,
          status
        })
      });
      if (!res.ok) throw new Error('API Error');
      return true;
    } catch(e) {
      console.error('Failed to save attendance', e);
      return false;
    }
  };

  // Bulk Action: Mark All Present
  const markAllAsPresent = async () => {
    if (!selectedSlotId || isDateLocked || isHoliday) return;
    const enrolledStudents = allocationsForSlot(selectedSlotId);
    if (enrolledStudents.length === 0) return;

    if (!confirm(`Mark ALL ${enrolledStudents.length} enrolled students as PRESENT for ${selectedDate}?`)) {
      return;
    }

    setIsBulkProcessing(true);
    try {
      const updatedAttendance = enrolledStudents.map(m => ({
        student_id: m.student.id,
        status: 'PRESENT' as const,
        date: selectedDate
      }));
      setAttendanceData(updatedAttendance);

      const promises = enrolledStudents.map(m => 
        fetch('/api/coordinator/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slot_id: selectedSlotId,
            date: selectedDate,
            student_id: m.student.id,
            status: 'PRESENT'
          })
        })
      );
      await Promise.all(promises);
    } catch (e) {
      console.error("Bulk mark present failed:", e);
      alert("Failed to mark all as Present. Please check connection.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Bulk Action: Mark All Absent
  const markAllAsAbsent = async () => {
    if (!selectedSlotId || isDateLocked || isHoliday) return;
    const enrolledStudents = allocationsForSlot(selectedSlotId);
    if (enrolledStudents.length === 0) return;

    if (!confirm(`Mark ALL ${enrolledStudents.length} enrolled students as ABSENT for ${selectedDate}?`)) {
      return;
    }

    setIsBulkProcessing(true);
    try {
      const updatedAttendance = enrolledStudents.map(m => ({
        student_id: m.student.id,
        status: 'ABSENT' as const,
        date: selectedDate
      }));
      setAttendanceData(updatedAttendance);

      const promises = enrolledStudents.map(m => 
        fetch('/api/coordinator/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slot_id: selectedSlotId,
            date: selectedDate,
            student_id: m.student.id,
            status: 'ABSENT'
          })
        })
      );
      await Promise.all(promises);
    } catch (e) {
      console.error("Bulk mark absent failed:", e);
      alert("Failed to mark all as Absent. Please check connection.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleOpenReportModal = async () => {
    if (!selectedSlotId || isDateLocked || isHoliday) return;
    
    const enrolledStudents = allocationsForSlot(selectedSlotId);
    const unmarkedStudents = enrolledStudents.filter(m => {
      if (!m.student) return false;
      const att = attendanceData.find(a => a.student_id === m.student?.id);
      return !att;
    });

    if (unmarkedStudents.length === 0) {
      setShowReportModal(true);
      return;
    }

    if (!confirm(`You have ${unmarkedStudents.length} unmarked students. Do you want to automatically mark them as ABSENT and proceed to the report?`)) {
      return;
    }

    setIsAttendanceLoading(true);

    try {
      const promises = unmarkedStudents.map(m => {
        if (!m.student) return Promise.resolve(false);
        setAttendanceData(prev => [
          ...prev.filter(a => a.student_id !== m.student!.id),
          { student_id: m.student!.id, status: 'ABSENT', date: selectedDate }
        ]);

        return fetch('/api/coordinator/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slot_id: selectedSlotId,
            date: selectedDate,
            student_id: m.student.id,
            status: 'ABSENT'
          })
        });
      });

      await Promise.all(promises);
      setShowReportModal(true);
    } catch (e) {
      console.error('Failed to mark all as absent', e);
      alert("Some students failed to be marked. Please check your connection.");
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  const handleQRScanSuccess = async (studentId: string) => {
    if (!selectedSlotId) return false;
    const enrolledStudents = allocationsForSlot(selectedSlotId);
    const exists = enrolledStudents.find(a => a.student?.id === studentId);
    
    if (!exists) return false;

    return await markAttendance(studentId, 'PRESENT') ?? false;
  };

  // Group slots by entity ID
  const slotsByEntity = (entityId: string) => {
    return currentSlots.filter(s => (activeTab === 'clubs' ? s.club_id : s.centre_id) === entityId);
  };

  // Get allocations for a specific slot
  const allocationsForSlot = (slotId: string) => {
    return currentAllocations
      .filter(a => a.slot_id === slotId && a.student)
      .sort((a, b) => (a.student?.register_no || '').localeCompare(b.student?.register_no || ''));
  };

  const downloadPDF = async (slotId: string, entityName: string, day: string) => {
    const students = allocationsForSlot(slotId);
    if (students.length === 0) {
      alert("No students enrolled in this slot yet.");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    try {
      const response = await fetch('/rit-logo.png');
      const blob = await response.blob();
      
      const img = new window.Image();
      const imageLoadPromise = new Promise<{width: number, height: number, dataUrl: string}>((resolve, reject) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          resolve({
            width: img.width,
            height: img.height,
            dataUrl: canvas.toDataURL('image/png')
          });
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
      });

      const { width, height, dataUrl } = await imageLoadPromise;
      const targetHeight = 18;
      const targetWidth = (width / height) * targetHeight;
      const xPos = (pageWidth - targetWidth) / 2;

      doc.addImage(dataUrl, 'PNG', xPos, 10, targetWidth, targetHeight);
    } catch (error) {
      console.error("Could not load logo for PDF", error);
      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text("RAJALAKSHMI INSTITUTE OF TECHNOLOGY", pageWidth / 2, 22, { align: "center" });
    }
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Club & Centre Slot Allocation Portal", pageWidth / 2, 36, { align: "center" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text("OFFICIAL ATTENDANCE REPORT", pageWidth / 2, 45, { align: "center" });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 52, pageWidth - 14, 52);
    
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    
    doc.setFont("helvetica", "bold");
    doc.text("Entity Name :", 14, 62);
    doc.setFont("helvetica", "normal");
    doc.text(entityName, 37, 62);

    doc.setFont("helvetica", "bold");
    doc.text("Date :", 14, 69);
    doc.setFont("helvetica", "normal");
    doc.text(selectedDate, 25, 69);

    doc.setFont("helvetica", "bold");
    doc.text("Day :", 130, 69);
    doc.setFont("helvetica", "normal");
    doc.text(day, 140, 69);

    const totalRegistered = students.length;
    const totalPresent = attendanceData.filter(a => a.status === 'PRESENT').length;
    const totalAbsent = attendanceData.filter(a => a.status === 'ABSENT').length;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(51, 65, 85);
    doc.text("Total Enrolled :", 14, 76);
    doc.setFont("helvetica", "normal");
    doc.text(totalRegistered.toString(), 40, 76);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(22, 163, 74);
    doc.text("Present :", 75, 76);
    doc.setFont("helvetica", "normal");
    doc.text(totalPresent.toString(), 92, 76);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text("Absent :", 130, 76);
    doc.setFont("helvetica", "normal");
    doc.text(totalAbsent.toString(), 145, 76);

    const tableColumn = ["S.No", "Register No", "Student Name", "Course & Sec", "Status"];
    const tableRows = students.map((m, i) => {
      const studentAttendance = attendanceData.find(a => a.student_id === m.student?.id);
      const status = studentAttendance?.status === 'PRESENT' ? 'Present' : (studentAttendance?.status === 'ABSENT' ? 'Absent' : 'Unmarked');
      
      return [
        i + 1,
        m.student?.register_no || '',
        m.student?.name || '',
        `${m.student?.course || ''} - ${m.student?.section || ''}`,
        status
      ];
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 82,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        4: { fontStyle: 'bold' }
      },
      didParseCell: function (data: any) {
        if (data.section === 'body' && data.column.index === 4) {
          if (data.cell.raw === 'Present') {
            data.cell.styles.textColor = [22, 163, 74];
          } else if (data.cell.raw === 'Absent') {
            data.cell.styles.textColor = [220, 38, 38];
          } else {
            data.cell.styles.textColor = [148, 163, 184];
          }
        }
      }
    });

    doc.save(`${entityName.replace(/\s+/g, '_')}_Attendance_${selectedDate}.pdf`);
  };

  const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  const SESSIONS = ['FORENOON', 'AFTERNOON'];

  return (
    <div className="w-full max-w-full space-y-6 overflow-hidden">
      
      {/* Executive Professional Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded border border-blue-400/30 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-blue-400" /> Faculty Coordinator Portal
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded border border-emerald-400/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Verified Account
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              {timeGreeting}, {displayName}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm font-normal mt-1 max-w-2xl leading-relaxed">
              Manage your assigned extracurricular entities, record live student attendance, and submit official activity reports.
            </p>

            {/* Status Insight Bar */}
            <div className="mt-4 flex items-center gap-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700 max-w-2xl">
              <Activity className="w-4 h-4 text-blue-400 shrink-0" />
              <p className="text-xs text-slate-300 font-medium">
                {selectedSlotId ? (
                  `Active Slot Selected: ${attendanceData.length > 0 ? `${attendanceData.length} student attendance records logged.` : 'Ready to take attendance.'}`
                ) : (
                  'Select an allocated timetable slot below to open student roster and attendance controls.'
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-row md:flex-col items-center md:items-end gap-3 shrink-0">
            <div className="bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-700 text-center w-full md:w-auto">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned Entities</span>
              <span className="block text-xl font-bold text-white mt-0.5">{allAssignedEntities.length}</span>
            </div>
            <div className="bg-slate-800 px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* Holiday Alert Banner */}
      {isHoliday && (
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 shadow-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-amber-900 font-bold text-sm">Declared Holiday Selected</h2>
            <p className="text-amber-800 text-xs mt-0.5">
              Reason: {holidayReason}. Attendance taking and report submissions are disabled for holiday dates.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl w-fit gap-1 border border-slate-200">
        {assignedClubs.length > 0 && (
          <button
            onClick={() => { setActiveTab('clubs'); setSelectedSlotId(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'clubs' ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Clubs ({assignedClubs.length})
          </button>
        )}
        {assignedCentres.length > 0 && (
          <button
            onClick={() => { setActiveTab('centres'); setSelectedSlotId(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'centres' ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Centres ({assignedCentres.length})
          </button>
        )}
        <button
          onClick={() => { setActiveTab('reports'); setSelectedSlotId(null); }}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
            activeTab === 'reports' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          Reports & Audit
        </button>
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        {activeTab === 'reports' ? (
          /* REPORTS TAB */
          <div className="space-y-6">
            <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-md">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded border border-blue-400/30">
                OFFICIAL INSTITUTIONAL REPORTS
              </span>
              <h2 className="text-lg font-bold uppercase tracking-wider text-white mt-2">
                Extracurricular Activity Audit Records
              </h2>
              <p className="text-slate-300 text-xs font-normal mt-1 max-w-xl">
                Access official attendance audit reports, compliance metrics, and downloadable visual PDF documents.
              </p>
            </div>

            {allAssignedEntities.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 font-semibold text-sm">No assigned clubs or centres found.</p>
              </div>
            ) : (
              allAssignedEntities.map((entity) => {
                const entityReports = auditReports
                  .filter(r => r.entityName === entity.name)
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                const totalSessions = entityReports.length;
                const submittedCount = entityReports.filter(r => r.submitted !== false && r.status !== 'NOT_SUBMITTED').length;
                const missingCount = entityReports.filter(r => r.submitted === false || r.status === 'NOT_SUBMITTED').length;
                const complianceRate = totalSessions > 0 ? Math.round((submittedCount / totalSessions) * 100) : 0;

                return (
                  <div key={entity.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 sm:p-6 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        {getEntityLogoUrl(entity.name, entity.logo_url) ? (
                          <div className="w-12 h-12 bg-white rounded-xl p-1 border-2 border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                            <img 
                              src={getEntityLogoUrl(entity.name, entity.logo_url)} 
                              alt={entity.name} 
                              className="w-full h-full object-contain rounded-lg" 
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200 shrink-0">
                            <FileText className="w-6 h-6 text-slate-700" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                              {entity.type || 'Activity Report'}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
                              {complianceRate}% Compliance
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 tracking-tight mt-0.5">{entity.name}</h3>
                        </div>
                      </div>

                      <Link
                        href={`/admin/audit-reports/print?entity=${encodeURIComponent(entity.name)}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-xs text-xs shrink-0"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        View & Download PDF Report
                      </Link>
                    </div>

                    {/* Summary Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Timetable Slots</span>
                        <span className="block text-xl font-bold text-slate-900 mt-0.5">{totalSessions}</span>
                      </div>
                      <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">Submitted Reports</span>
                        <span className="block text-xl font-bold text-emerald-700 mt-0.5">{submittedCount}</span>
                      </div>
                      <div className="bg-red-50 p-3 rounded-xl border border-red-200 text-center">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-red-700">Not Marked</span>
                        <span className="block text-xl font-bold text-red-700 mt-0.5">{missingCount}</span>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-center">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-700">Compliance Rate</span>
                        <span className="block text-xl font-bold text-blue-900 mt-0.5">{complianceRate}%</span>
                      </div>
                    </div>

                    {/* Audit Index Table */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <BarChart3 className="w-3.5 h-3.5 text-slate-400" /> Scheduled Session Audit Records
                        </span>
                        <span className="text-slate-400 font-semibold">{entityReports.length} records</span>
                      </h4>

                      {isAuditLoading ? (
                        <div className="p-6 text-center text-slate-400 font-semibold text-xs">Loading activity audit records...</div>
                      ) : entityReports.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 font-medium text-xs bg-slate-50 rounded-xl">
                          No audit records found for this entity yet.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 max-w-full">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                              <tr>
                                <th className="p-2.5 text-center">S.No</th>
                                <th className="p-2.5">Date & Day</th>
                                <th className="p-2.5">Session & Timing</th>
                                <th className="p-2.5">Venue</th>
                                <th className="p-2.5 text-center">Expected</th>
                                <th className="p-2.5 text-center">Present</th>
                                <th className="p-2.5 text-center">Status</th>
                                <th className="p-2.5 text-center">Evidence</th>
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
                                  <tr key={i} className={isMissing ? 'bg-red-50/30' : 'hover:bg-slate-50'}>
                                    <td className="p-2.5 text-center font-bold text-slate-400">{i + 1}</td>
                                    <td className="p-2.5 font-bold text-slate-900">{dStr} ({r.day || ''})</td>
                                    <td className="p-2.5 text-slate-700 font-medium">{r.session} ({r.timing || ''})</td>
                                    <td className="p-2.5 font-semibold text-slate-600">{r.venue || 'N/A'}</td>
                                    <td className="p-2.5 text-center font-bold text-slate-700">{r.expected}</td>
                                    <td className="p-2.5 text-center font-bold">{isMissing ? <span className="text-red-600">0</span> : <span className="text-emerald-700">{r.present}</span>}</td>
                                    <td className="p-2.5 text-center">
                                      {isMissing ? (
                                        <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded font-bold text-[10px]">NOT MARKED</span>
                                      ) : (
                                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold text-[10px]">SUBMITTED</span>
                                      )}
                                    </td>
                                    <td className="p-2.5 text-center font-semibold">
                                      {r.imageUrl ? (
                                        <a href={r.imageUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">View Photo</a>
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
        ) : (
          /* CLUBS / CENTRES TAB */
          currentEntities.map((entity) => {
            const entitySlots = slotsByEntity(entity.id);
            const selectedSlot = entitySlots.find(s => s.id === selectedSlotId);
            const enrolledStudents = selectedSlot ? allocationsForSlot(selectedSlot.id) : [];

            // Filter enrolled students by search query and status filter
            const filteredStudents = enrolledStudents.filter(m => {
              if (!m.student) return false;
              const regMatch = (m.student.register_no || '').toLowerCase().includes(searchQuery.toLowerCase());
              const nameMatch = (m.student.name || '').toLowerCase().includes(searchQuery.toLowerCase());
              if (!regMatch && !nameMatch) return false;

              const att = attendanceData.find(a => a.student_id === m.student.id);
              if (statusFilter === 'PRESENT' && att?.status !== 'PRESENT') return false;
              if (statusFilter === 'ABSENT' && att?.status !== 'ABSENT') return false;
              if (statusFilter === 'UNMARKED' && att) return false;

              return true;
            });

            // Metrics for selected slot
            const presentCount = attendanceData.filter(a => a.status === 'PRESENT').length;
            const absentCount = attendanceData.filter(a => a.status === 'ABSENT').length;
            const unmarkedCount = Math.max(0, enrolledStudents.length - (presentCount + absentCount));
            const attendancePercent = enrolledStudents.length > 0 ? Math.round((presentCount / enrolledStudents.length) * 100) : 0;

            return (
              <div key={entity.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
                {/* Entity Header */}
                <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {getEntityLogoUrl(entity.name, entity.logo_url) ? (
                      <div className="w-14 h-14 bg-white rounded-2xl p-1.5 border-2 border-slate-200 shadow-md flex items-center justify-center shrink-0">
                        <img 
                          src={getEntityLogoUrl(entity.name, entity.logo_url)} 
                          alt={entity.name} 
                          className="w-full h-full object-contain rounded-lg" 
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md">
                        {activeTab === 'clubs' ? <Users className="w-6 h-6 text-blue-400" /> : <Building2 className="w-6 h-6 text-blue-400" />}
                      </div>
                    )}
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 tracking-tight">{entity.name}</h2>
                      <p className="text-slate-500 font-normal text-xs mt-0.5 max-w-xl">{entity.description || 'No description provided.'}</p>
                    </div>
                  </div>

                  <Link 
                    href={`/admin/audit-reports/print?entity=${encodeURIComponent(entity.name)}`}
                    target="_blank"
                    className="inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-xs text-xs shrink-0"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    View & Download PDF Report
                  </Link>
                </div>

                <div className="p-5 sm:p-6 space-y-6">
                  {/* Weekly Timetable Schedule */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" /> Allocated Weekly Schedule (Click slot to load roster)
                    </h3>

                    {entitySlots.length === 0 ? (
                      <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-500 font-medium text-xs">No timetable slots allocated yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Desktop Timetable Grid */}
                        <div className="hidden lg:block overflow-x-auto rounded-xl border border-slate-200 bg-white max-w-full">
                          <table className="w-full text-left table-fixed border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="w-28 px-3 py-2.5 font-bold uppercase tracking-wider text-slate-600 border-r border-slate-200">Day</th>
                                <th className="w-1/2 px-3 py-2.5 font-bold uppercase tracking-wider text-slate-600 border-r border-slate-200 text-center">Forenoon (FN)</th>
                                <th className="w-1/2 px-3 py-2.5 font-bold uppercase tracking-wider text-slate-600 text-center">Afternoon (AN)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {DAYS.map(day => (
                                <tr key={day} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-3 py-3 border-r border-slate-200 font-bold text-slate-600 uppercase tracking-wider bg-slate-50">
                                    {day}
                                  </td>
                                  {SESSIONS.map(session => {
                                    const cellSlots = entitySlots.filter(s => s.day === day && s.session === session);
                                    
                                    return (
                                      <td key={`${day}-${session}`} className="px-3 py-3 border-r border-slate-100 align-top">
                                        {cellSlots.length > 0 ? (
                                          <div className="space-y-2">
                                            {cellSlots.map(slot => {
                                              const isSelected = selectedSlotId === slot.id;
                                              const enrolledCount = allocationsForSlot(slot.id).length;
                                              
                                              return (
                                                <div 
                                                  key={slot.id}
                                                  onClick={() => setSelectedSlotId(isSelected ? null : slot.id)}
                                                  className={`p-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                                                    isSelected 
                                                      ? 'border-blue-600 bg-blue-50/90 shadow-sm ring-2 ring-blue-500/20' 
                                                      : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'
                                                  }`}
                                                >
                                                  <div className="flex items-start justify-between gap-2">
                                                    <div className="flex flex-col gap-1">
                                                      <span className="flex items-center gap-1 font-bold text-slate-800 text-xs">
                                                        <Clock className="w-3 h-3 text-blue-600" /> {slot.start_time.slice(0,5)} - {slot.end_time.slice(0,5)}
                                                      </span>
                                                      {slot.venue && (
                                                        <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                                                          <MapPin className="w-3 h-3 text-slate-400" /> {slot.venue}
                                                        </span>
                                                      )}
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                      <div className="text-xs font-bold text-slate-900">
                                                        {enrolledCount} <span className="text-[10px] font-normal text-slate-400">/ {slot.capacity}</span>
                                                      </div>
                                                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded mt-1 inline-block ${
                                                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                                                      }`}>
                                                        {isSelected ? 'Selected' : 'Select'}
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <div className="h-full min-h-[40px] flex items-center justify-center text-[10px] font-bold text-slate-300">
                                            -
                                          </div>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Stacked Timetable */}
                        <div className="block lg:hidden space-y-3">
                          {DAYS.map(day => {
                            const daySlots = entitySlots.filter(s => s.day === day);
                            if (daySlots.length === 0) return null;

                            return (
                              <div key={day} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200">
                                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{day}</h4>
                                </div>
                                <div className="p-3 space-y-3">
                                  {SESSIONS.map(session => {
                                    const sessionSlots = daySlots.filter(s => s.session === session);
                                    if (sessionSlots.length === 0) return null;

                                    return (
                                      <div key={session}>
                                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                          <Clock className="w-3 h-3 text-blue-600" /> {session}
                                        </h5>
                                        <div className="space-y-2">
                                          {sessionSlots.map(slot => {
                                            const isSelected = selectedSlotId === slot.id;
                                            const enrolledCount = allocationsForSlot(slot.id).length;
                                            
                                            return (
                                              <div 
                                                key={slot.id}
                                                onClick={() => setSelectedSlotId(isSelected ? null : slot.id)}
                                                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                                  isSelected 
                                                    ? 'border-blue-600 bg-blue-50 shadow-xs' 
                                                    : 'border-slate-200 hover:border-blue-300'
                                                }`}
                                              >
                                                <div className="flex items-start justify-between gap-3">
                                                  <div className="flex flex-col gap-1">
                                                    <span className="flex items-center gap-1 text-xs font-bold text-slate-800">
                                                      <Clock className="w-3.5 h-3.5 text-blue-600" /> {slot.start_time.slice(0,5)} - {slot.end_time.slice(0,5)}
                                                    </span>
                                                    {slot.venue && (
                                                      <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                                                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> {slot.venue}
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="text-right shrink-0">
                                                    <div className="text-sm font-bold text-slate-900">
                                                      {enrolledCount} <span className="text-xs font-normal text-slate-400">/ {slot.capacity}</span>
                                                    </div>
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mt-0.5">
                                                      {isSelected ? 'Selected' : 'Select'}
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selected Slot Student Roster & Live Attendance Panel */}
                  {selectedSlot && (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm relative pb-16">
                      
                      {/* Slot Header Control Bar */}
                      <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-400/30">
                              {selectedSlot.day} {selectedSlot.session}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                              {selectedSlot.start_time.slice(0,5)} - {selectedSlot.end_time.slice(0,5)}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-white mt-1">Student Attendance Register</h4>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-lg">
                            <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <input 
                              type="date" 
                              value={selectedDate}
                              max={today}
                              onChange={(e) => setSelectedDate(e.target.value)}
                              className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
                            />
                          </div>
                          
                          <button 
                            onClick={() => setShowQRScanner(true)}
                            disabled={isDateLocked || isHoliday}
                            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                              isDateLocked || isHoliday
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                            }`}
                          >
                            <QrCode className="w-3.5 h-3.5" /> QR Scan
                          </button>

                          <button 
                            onClick={handleOpenReportModal}
                            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                              enrolledStudents.length > 0 && attendanceData.length === enrolledStudents.length 
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-500/30' 
                                : 'bg-amber-600 hover:bg-amber-500 text-white'
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5" /> Report
                          </button>

                          <button 
                            onClick={() => downloadPDF(selectedSlot.id, entity.name, selectedSlot.day)}
                            className="flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" /> Export PDF
                          </button>
                        </div>
                      </div>

                      {/* Attendance Live Metrics Bar */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-slate-50 border-b border-slate-200 text-center">
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                          <span className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider">Enrolled</span>
                          <span className="block text-base font-bold text-slate-900 mt-0.5">{enrolledStudents.length}</span>
                        </div>
                        <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                          <span className="block text-[10px] font-bold uppercase text-emerald-700 tracking-wider">Present</span>
                          <span className="block text-base font-bold text-emerald-700 mt-0.5">{presentCount}</span>
                        </div>
                        <div className="bg-red-50 p-2.5 rounded-lg border border-red-200">
                          <span className="block text-[10px] font-bold uppercase text-red-700 tracking-wider">Absent</span>
                          <span className="block text-base font-bold text-red-700 mt-0.5">{absentCount}</span>
                        </div>
                        <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                          <span className="block text-[10px] font-bold uppercase text-amber-700 tracking-wider">Unmarked</span>
                          <span className="block text-base font-bold text-amber-700 mt-0.5">{unmarkedCount}</span>
                        </div>
                        <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200 col-span-2 sm:col-span-1">
                          <span className="block text-[10px] font-bold uppercase text-blue-700 tracking-wider">Attendance %</span>
                          <span className="block text-base font-bold text-blue-900 mt-0.5">{attendancePercent}%</span>
                        </div>
                      </div>

                      {/* Search & Bulk Action Bar */}
                      <div className="p-3 bg-white border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
                        <div className="relative w-full md:w-72">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input 
                            type="text"
                            placeholder="Search Register No or Name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                          />
                        </div>

                        {/* Status Filter Segment */}
                        <div className="flex items-center gap-1 w-full md:w-auto">
                          <span className="text-[10px] font-bold uppercase text-slate-400 mr-1 hidden sm:inline">Filter:</span>
                          {(['ALL', 'PRESENT', 'ABSENT', 'UNMARKED'] as const).map(f => (
                            <button
                              key={f}
                              onClick={() => setStatusFilter(f)}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                                statusFilter === f 
                                  ? 'bg-slate-900 text-white shadow-xs' 
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {f}
                            </button>
                          ))}
                        </div>

                        {/* Bulk Actions */}
                        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                          <button 
                            onClick={markAllAsPresent}
                            disabled={isDateLocked || isHoliday || isBulkProcessing}
                            className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                          >
                            <CheckCheck className="w-3.5 h-3.5" /> Mark All Present
                          </button>
                          <button 
                            onClick={markAllAsAbsent}
                            disabled={isDateLocked || isHoliday || isBulkProcessing}
                            className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                          >
                            <UserX className="w-3.5 h-3.5" /> Mark All Absent
                          </button>
                        </div>
                      </div>

                      {/* Roster Table */}
                      <div className="max-h-[500px] overflow-y-auto bg-white relative">
                        {(isDateLocked || isHoliday) && (
                          <div className="bg-amber-50 border-b border-amber-200 p-3 flex items-center justify-center gap-2 text-amber-800 text-xs font-medium">
                            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                            {isHoliday 
                              ? `Attendance taking is disabled because ${holidayReason} is a declared holiday.`
                              : isWrongDay 
                                ? `You cannot mark attendance on a ${dayOfWeek} for a ${activeSlot.day} slot.` 
                                : `You cannot mark attendance for future dates.`
                            }
                          </div>
                        )}

                        {(isAttendanceLoading || isBulkProcessing) && (
                          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs z-20 flex items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                            <span className="font-bold text-slate-700 text-xs">Saving attendance records...</span>
                          </div>
                        )}

                        {filteredStudents.length === 0 ? (
                          <div className="p-8 text-center text-slate-400">
                            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="font-semibold text-xs">No students match your filter criteria.</p>
                          </div>
                        ) : (
                          <>
                            {/* Desktop Table View */}
                            <div className="hidden lg:block overflow-x-auto">
                              <table className="w-full text-left whitespace-nowrap text-xs">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-400 sticky top-0 bg-slate-50 z-10">S.No</th>
                                    <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-400 sticky top-0 bg-slate-50 z-10">Register No</th>
                                    <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-400 sticky top-0 bg-slate-50 z-10">Student Details</th>
                                    <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-400 sticky top-0 bg-slate-50 z-10">Course & Section</th>
                                    <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-400 sticky top-0 bg-slate-50 z-10 text-right">Attendance Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {filteredStudents.map((m, idx) => {
                                    const studentAttendance = attendanceData.find(a => a.student_id === m.student?.id);
                                    const isPresent = studentAttendance?.status === 'PRESENT';
                                    const isAbsent = studentAttendance?.status === 'ABSENT';

                                    return (
                                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-semibold text-slate-400">{idx + 1}</td>
                                        <td className="px-4 py-3 font-bold font-mono text-slate-800">{m.student?.register_no}</td>
                                        <td className="px-4 py-3">
                                          <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                              {m.student?.name?.charAt(0) || 'S'}
                                            </div>
                                            <div>
                                              <p className="font-bold text-slate-900">{m.student?.name}</p>
                                              {m.student?.contact_no && (
                                                <a href={`tel:${m.student.contact_no}`} className="text-[10px] font-medium text-slate-500 hover:text-blue-600 flex items-center gap-1">
                                                  <Phone className="w-2.5 h-2.5 text-slate-400" /> {m.student.contact_no}
                                                </a>
                                              )}
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-slate-700">
                                          {m.student?.course} - <span className="text-blue-700 font-bold">{m.student?.section}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                          <div className="flex items-center justify-end gap-1.5">
                                            <button 
                                              onClick={() => m.student && markAttendance(m.student.id, 'PRESENT')}
                                              disabled={isDateLocked || isHoliday}
                                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                isPresent 
                                                  ? `bg-emerald-600 text-white shadow-xs ${isDateLocked || isHoliday ? 'opacity-60 cursor-not-allowed' : ''}`
                                                  : isDateLocked || isHoliday
                                                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200'
                                              }`}
                                            >
                                              <CheckCircle2 className="w-3.5 h-3.5" /> Present
                                            </button>
                                            <button 
                                              onClick={() => m.student && markAttendance(m.student.id, 'ABSENT')}
                                              disabled={isDateLocked || isHoliday}
                                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                isAbsent 
                                                  ? `bg-red-600 text-white shadow-xs ${isDateLocked || isHoliday ? 'opacity-60 cursor-not-allowed' : ''}`
                                                  : isDateLocked || isHoliday
                                                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700 border border-slate-200'
                                              }`}
                                            >
                                              <XCircle className="w-3.5 h-3.5" /> Absent
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Mobile Stacked Card View */}
                            <div className="block lg:hidden divide-y divide-slate-100">
                              {filteredStudents.map((m, idx) => {
                                const studentAttendance = attendanceData.find(a => a.student_id === m.student?.id);
                                const isPresent = studentAttendance?.status === 'PRESENT';
                                const isAbsent = studentAttendance?.status === 'ABSENT';

                                return (
                                  <div key={m.id} className="p-3 hover:bg-slate-50 transition-colors text-xs">
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                          {m.student?.name?.charAt(0) || 'S'}
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                                            <span className="text-[11px] font-bold font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{m.student?.register_no}</span>
                                          </div>
                                          <h5 className="font-bold text-slate-900 leading-tight text-xs">{m.student?.name}</h5>
                                          <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                                            {m.student?.course} - <span className="text-blue-700 font-bold">{m.student?.section}</span>
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                      <button 
                                        onClick={() => m.student && markAttendance(m.student.id, 'PRESENT')}
                                        disabled={isDateLocked || isHoliday}
                                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                          isPresent 
                                            ? `bg-emerald-600 text-white shadow-xs ${isDateLocked || isHoliday ? 'opacity-60 cursor-not-allowed' : ''}`
                                            : isDateLocked || isHoliday
                                              ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                              : 'bg-slate-100 text-slate-600 hover:bg-emerald-50'
                                        }`}
                                      >
                                        <CheckCircle2 className="w-4 h-4" /> Present
                                      </button>
                                      <button 
                                        onClick={() => m.student && markAttendance(m.student.id, 'ABSENT')}
                                        disabled={isDateLocked || isHoliday}
                                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                          isAbsent 
                                            ? `bg-red-600 text-white shadow-xs ${isDateLocked || isHoliday ? 'opacity-60 cursor-not-allowed' : ''}`
                                            : isDateLocked || isHoliday
                                              ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                              : 'bg-slate-100 text-slate-600 hover:bg-red-50'
                                        }`}
                                      >
                                        <XCircle className="w-4 h-4" /> Absent
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Floating Completion Banner */}
                      {enrolledStudents.length > 0 && attendanceData.length === enrolledStudents.length && (
                        <div className="absolute bottom-0 left-0 right-0 bg-emerald-700 text-white p-3 flex items-center justify-between gap-3 z-10 shadow-lg">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-white">Attendance 100% Logged</p>
                              <p className="text-[10px] text-emerald-100">Ready to submit today's photo report.</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setShowReportModal(true)}
                            className="px-4 py-1.5 bg-white text-emerald-900 hover:bg-slate-100 text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1"
                          >
                            Submit Report <FileText className="w-3.5 h-3.5 text-emerald-700" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showReportModal && activeSlot && (
        <ActivityReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          slot={activeSlot}
          entityName={currentEntities.find(e => e.id === (activeSlot.club_id || activeSlot.centre_id))?.name || 'Unknown'}
          coordinatorName={currentEntities.find(e => e.id === (activeSlot.club_id || activeSlot.centre_id))?.faculty_name || 'Coordinator'}
          date={selectedDate}
          expected={currentAllocations.filter(a => a.slot_id === activeSlot.id).length}
          present={attendanceData.filter(a => a.status === 'PRESENT').length}
          gasUrl="https://script.google.com/macros/s/AKfycbzCt4gzTXrlASBm-fV26GSMPLHprdA5hvNwTH4Ko6NugcxnyB1dX_GSbaz-zLk80zq6/exec"
        />
      )}

      {showQRScanner && selectedSlotId && (
        <QRScannerModal 
          onClose={() => setShowQRScanner(false)}
          onScanSuccess={handleQRScanSuccess}
          slotName={`Slot ID: ${selectedSlotId}`}
        />
      )}
    </div>
  );
}
