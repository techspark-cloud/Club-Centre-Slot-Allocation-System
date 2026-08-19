'use client';

import React, { useState, useEffect } from 'react';
import { Users, Calendar, MapPin, Download, BookOpen, Clock, Building2, User, CheckCircle2, XCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CoordinatorDashboardProps {
  assignedClubs: any[];
  assignedCentres: any[];
  clubSlots: any[];
  centreSlots: any[];
  clubAllocations: any[];
  centreAllocations: any[];
}

export default function CoordinatorDashboard({
  assignedClubs,
  assignedCentres,
  clubSlots,
  centreSlots,
  clubAllocations,
  centreAllocations,
}: CoordinatorDashboardProps) {
  const [activeTab, setActiveTab] = useState<'clubs' | 'centres'>(assignedClubs.length > 0 ? 'clubs' : 'centres');
  
  const currentEntities = activeTab === 'clubs' ? assignedClubs : assignedCentres;
  const currentSlots = activeTab === 'clubs' ? clubSlots : centreSlots;
  const currentAllocations = activeTab === 'clubs' ? clubAllocations : centreAllocations;

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);

  useEffect(() => {
    if (!selectedSlotId || !selectedDate) {
      setAttendanceData([]);
      return;
    }
    const fetchAttendance = async () => {
      setIsAttendanceLoading(true);
      try {
        const res = await fetch(`/api/coordinator/attendance?slot_id=${selectedSlotId}&date=${selectedDate}`);
        const { data } = await res.json();
        setAttendanceData(data || []);
      } catch(e) {
        console.error(e);
      } finally {
        setIsAttendanceLoading(false);
      }
    };
    fetchAttendance();
  }, [selectedSlotId, selectedDate]);

  const markAttendance = async (studentId: string, status: 'PRESENT' | 'ABSENT') => {
    if (!selectedSlotId) return;
    
    // Optimistic UI Update
    setAttendanceData(prev => {
      const exists = prev.find(a => a.student_id === studentId);
      if (exists) {
        return prev.map(a => a.student_id === studentId ? { ...a, status } : a);
      }
      return [...prev, { student_id: studentId, status, date: selectedDate }];
    });

    try {
      await fetch('/api/coordinator/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_id: selectedSlotId,
          date: selectedDate,
          student_id: studentId,
          status
        })
      });
    } catch(e) {
      console.error('Failed to save attendance', e);
    }
  };

  // Group slots by entity ID
  const slotsByEntity = (entityId: string) => {
    return currentSlots.filter(s => (activeTab === 'clubs' ? s.club_id : s.centre_id) === entityId);
  };

  // Get allocations for a specific slot
  const allocationsForSlot = (slotId: string) => {
    return currentAllocations
      .filter(a => a.slot_id === slotId && a.student) // safety check
      .sort((a, b) => (a.student?.register_no || '').localeCompare(b.student?.register_no || ''));
  };

  const downloadPDF = (slotId: string, entityName: string, day: string) => {
    const students = allocationsForSlot(slotId);
    if (students.length === 0) {
      alert("No students enrolled in this slot yet.");
      return;
    }

    const doc = new jsPDF();
    
    // Official Header
    const pageWidth = doc.internal.pageSize.width;
    
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text("RAJALAKSHMI INSTITUTE OF TECHNOLOGY", pageWidth / 2, 22, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Club & Centre Slot Allocation Portal", pageWidth / 2, 29, { align: "center" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text("OFFICIAL ATTENDANCE REPORT", pageWidth / 2, 40, { align: "center" });

    // Line separator
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 46, pageWidth - 14, 46);
    
    // Entity & Date Details
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    
    doc.setFont("helvetica", "bold");
    doc.text("Entity Name :", 14, 56);
    doc.setFont("helvetica", "normal");
    doc.text(entityName, 42, 56);

    doc.setFont("helvetica", "bold");
    doc.text("Date :", 14, 63);
    doc.setFont("helvetica", "normal");
    doc.text(selectedDate, 28, 63);

    doc.setFont("helvetica", "bold");
    doc.text("Day :", 120, 63);
    doc.setFont("helvetica", "normal");
    doc.text(day, 132, 63);

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
      startY: 70,
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
            data.cell.styles.textColor = [22, 163, 74]; // Green
          } else if (data.cell.raw === 'Absent') {
            data.cell.styles.textColor = [220, 38, 38]; // Red
          } else {
            data.cell.styles.textColor = [148, 163, 184]; // Slate
          }
        }
      }
    });

    doc.save(`${entityName.replace(/\s+/g, '_')}_Attendance_${selectedDate}.pdf`);
  };

  const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  const SESSIONS = ['FORENOON', 'AFTERNOON'];

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-60 pointer-events-none"></div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-black uppercase tracking-widest mb-3">
            <User className="w-4 h-4" /> Faculty Portal
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Coordinator Dashboard</h1>
          <p className="text-slate-500 mt-2 font-medium max-w-xl text-sm sm:text-base">
            Manage your assigned extracurricular activities, view allocated timetable slots, and access your student roster in real-time.
          </p>
        </div>
      </div>

      {/* Tabs */}
      {(assignedClubs.length > 0 && assignedCentres.length > 0) && (
        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit">
          <button
            onClick={() => { setActiveTab('clubs'); setSelectedSlotId(null); }}
            className={`px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
              activeTab === 'clubs' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            My Clubs
          </button>
          <button
            onClick={() => { setActiveTab('centres'); setSelectedSlotId(null); }}
            className={`px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
              activeTab === 'centres' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            My Centres
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-6">
        {currentEntities.map((entity) => {
          const entitySlots = slotsByEntity(entity.id);
          const selectedSlot = entitySlots.find(s => s.id === selectedSlotId);
          const enrolledStudents = selectedSlot ? allocationsForSlot(selectedSlot.id) : [];

          return (
            <div key={entity.id} className="bg-white rounded-3xl border-2 border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 sm:p-8 border-b-2 border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0">
                    {activeTab === 'clubs' ? <Users className="w-7 h-7 text-blue-600" /> : <Building2 className="w-7 h-7 text-blue-600" />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{entity.name}</h2>
                    <p className="text-slate-500 font-medium text-sm mt-1 max-w-2xl">{entity.description || 'No description provided.'}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Allocated Weekly Timetable
                </h3>

                {entitySlots.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-bold">No timetable slots have been allocated yet.</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Desktop Visual Timetable Grid (Hidden on Mobile) */}
                    <div className="hidden lg:block overflow-x-auto pb-4">
                      <div className="min-w-[700px] border-2 border-slate-200 rounded-2xl overflow-hidden bg-white">
                        <table className="w-full text-left table-fixed border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b-2 border-slate-200">
                              <th className="w-32 px-4 py-4 text-xs font-black uppercase tracking-widest text-slate-500 border-r-2 border-slate-200 bg-slate-100">Day</th>
                              <th className="w-1/2 px-4 py-4 text-xs font-black uppercase tracking-widest text-slate-500 border-r-2 border-slate-200 text-center">Forenoon</th>
                              <th className="w-1/2 px-4 py-4 text-xs font-black uppercase tracking-widest text-slate-500 text-center">Afternoon</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y-2 divide-slate-100">
                            {DAYS.map(day => (
                              <tr key={day} className="hover:bg-slate-50/30 transition-colors">
                                <td className="px-4 py-4 border-r-2 border-slate-100 font-black text-xs text-slate-400 uppercase tracking-widest bg-slate-50/50">
                                  {day}
                                </td>
                                {SESSIONS.map(session => {
                                  // Find slots for this day and session
                                  const cellSlots = entitySlots.filter(s => s.day === day && s.session === session);
                                  
                                  return (
                                    <td key={`${day}-${session}`} className="px-4 py-4 border-r-2 border-slate-100 align-top">
                                      {cellSlots.length > 0 ? (
                                        <div className="space-y-3">
                                          {cellSlots.map(slot => {
                                            const isSelected = selectedSlotId === slot.id;
                                            const enrolledCount = allocationsForSlot(slot.id).length;
                                            
                                            return (
                                              <div 
                                                key={slot.id}
                                                onClick={() => setSelectedSlotId(isSelected ? null : slot.id)}
                                                className={`p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                                                  isSelected 
                                                    ? 'border-blue-500 bg-blue-50 shadow-sm ring-4 ring-blue-50/50' 
                                                    : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                                                }`}
                                              >
                                                <div className="flex items-start justify-between gap-2">
                                                  <div className="flex flex-col gap-1.5">
                                                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                                                      <Clock className="w-3.5 h-3.5 text-slate-400" /> {slot.start_time.slice(0,5)} - {slot.end_time.slice(0,5)}
                                                    </span>
                                                    {slot.venue && (
                                                      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                                                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> {slot.venue}
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="text-right">
                                                    <div className="text-sm font-black text-slate-800">
                                                      {enrolledCount} <span className="text-xs font-bold text-slate-400">/ {slot.capacity}</span>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <div className="h-full min-h-[60px] flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-slate-300">
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
                    </div>

                    {/* Mobile Stacked Timetable (Hidden on Desktop) */}
                    <div className="block lg:hidden space-y-4">
                      {DAYS.map(day => {
                        const daySlots = entitySlots.filter(s => s.day === day);
                        if (daySlots.length === 0) return null; // Don't show empty days on mobile

                        return (
                          <div key={day} className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden">
                            <div className="bg-slate-100 px-4 py-2 border-b-2 border-slate-200">
                              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">{day}</h4>
                            </div>
                            <div className="p-4 space-y-4">
                              {SESSIONS.map(session => {
                                const sessionSlots = daySlots.filter(s => s.session === session);
                                if (sessionSlots.length === 0) return null;

                                return (
                                  <div key={session}>
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> {session}
                                    </h5>
                                    <div className="space-y-3">
                                      {sessionSlots.map(slot => {
                                        const isSelected = selectedSlotId === slot.id;
                                        const enrolledCount = allocationsForSlot(slot.id).length;
                                        
                                        return (
                                          <div 
                                            key={slot.id}
                                            onClick={() => setSelectedSlotId(isSelected ? null : slot.id)}
                                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                                              isSelected 
                                                ? 'border-blue-500 bg-blue-50 shadow-sm ring-4 ring-blue-50/50' 
                                                : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                                            }`}
                                          >
                                            <div className="flex items-start justify-between gap-4">
                                              <div className="flex flex-col gap-2">
                                                <span className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                                                  <Clock className="w-4 h-4 text-blue-500" /> {slot.start_time.slice(0,5)} - {slot.end_time.slice(0,5)}
                                                </span>
                                                {slot.venue && (
                                                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                                    <MapPin className="w-4 h-4 text-slate-400" /> {slot.venue}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-right shrink-0">
                                                <div className="text-lg font-black text-slate-800">
                                                  {enrolledCount} <span className="text-sm font-bold text-slate-400">/ {slot.capacity}</span>
                                                </div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Enrolled</div>
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

                    {/* Selected Slot Roster Section */}
                    {selectedSlot && (
                      <div className="border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-in slide-in-from-bottom-4 duration-300">
                        <div className="p-5 sm:p-6 bg-slate-50 border-b-2 border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h4 className="text-lg font-black text-slate-900 tracking-tight">Student Roster & Attendance</h4>
                            <p className="text-sm font-bold text-slate-500 mt-1 flex items-center gap-2">
                              {selectedSlot.day} {selectedSlot.session} ({selectedSlot.start_time.slice(0,5)} - {selectedSlot.end_time.slice(0,5)})
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <input 
                              type="date" 
                              value={selectedDate}
                              onChange={(e) => setSelectedDate(e.target.value)}
                              className="px-4 py-2 rounded-xl border-2 border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
                            />
                            <button 
                              onClick={() => downloadPDF(selectedSlot.id, entity.name, selectedSlot.day)}
                              className="flex items-center justify-center gap-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl transition-colors shadow-sm"
                            >
                              <Download className="w-4 h-4" /> Download PDF
                            </button>
                          </div>
                        </div>
                        
                        <div className="max-h-[600px] overflow-y-auto bg-white relative">
                          {isAttendanceLoading && (
                            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                          )}

                          {enrolledStudents.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                              <p className="font-bold">No students are currently enrolled in this specific slot.</p>
                            </div>
                          ) : (
                            <>
                              {/* Desktop Table View */}
                              <div className="hidden lg:block">
                                <table className="w-full text-left whitespace-nowrap">
                                  <thead>
                                    <tr className="bg-slate-50 border-b-2 border-slate-200">
                                      <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 sticky top-0 bg-slate-50 z-10">S.No</th>
                                      <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 sticky top-0 bg-slate-50 z-10">Register No</th>
                                      <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 sticky top-0 bg-slate-50 z-10">Student Name</th>
                                      <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 sticky top-0 bg-slate-50 z-10">Course & Section</th>
                                      <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 sticky top-0 bg-slate-50 z-10 text-right">Attendance</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {enrolledStudents.map((m, idx) => {
                                      const studentAttendance = attendanceData.find(a => a.student_id === m.student?.id);
                                      const isPresent = studentAttendance?.status === 'PRESENT';
                                      const isAbsent = studentAttendance?.status === 'ABSENT';

                                      return (
                                        <tr key={m.id} className="hover:bg-blue-50/40 transition-colors">
                                          <td className="px-5 py-4 text-xs font-bold text-slate-400">{idx + 1}</td>
                                          <td className="px-5 py-4 text-sm font-bold font-mono text-slate-700">{m.student?.register_no}</td>
                                          <td className="px-5 py-4">
                                            <p className="text-sm font-extrabold text-slate-900">{m.student?.name}</p>
                                            {m.student?.academic_year && <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">{m.student.academic_year}</p>}
                                          </td>
                                          <td className="px-5 py-4 text-sm font-bold text-slate-600">
                                            {m.student?.course} - <span className="text-blue-600">{m.student?.section}</span>
                                          </td>
                                          <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                              <button 
                                                onClick={() => m.student && markAttendance(m.student.id, 'PRESENT')}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                  isPresent 
                                                    ? 'bg-green-100 text-green-700 ring-2 ring-green-500 ring-offset-1' 
                                                    : 'bg-slate-100 text-slate-400 hover:bg-green-50 hover:text-green-600'
                                                }`}
                                              >
                                                <CheckCircle2 className="w-4 h-4" /> Present
                                              </button>
                                              <button 
                                                onClick={() => m.student && markAttendance(m.student.id, 'ABSENT')}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                  isAbsent 
                                                    ? 'bg-red-100 text-red-700 ring-2 ring-red-500 ring-offset-1' 
                                                    : 'bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-600'
                                                }`}
                                              >
                                                <XCircle className="w-4 h-4" /> Absent
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
                                {enrolledStudents.map((m, idx) => {
                                  const studentAttendance = attendanceData.find(a => a.student_id === m.student?.id);
                                  const isPresent = studentAttendance?.status === 'PRESENT';
                                  const isAbsent = studentAttendance?.status === 'ABSENT';

                                  return (
                                    <div key={m.id} className="p-4 hover:bg-slate-50 transition-colors">
                                      <div className="flex items-start justify-between mb-3">
                                        <div>
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black text-slate-400">#{idx + 1}</span>
                                            <span className="text-xs font-bold font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{m.student?.register_no}</span>
                                          </div>
                                          <h5 className="text-base font-black text-slate-900 leading-tight">{m.student?.name}</h5>
                                          <p className="text-xs font-bold text-slate-500 mt-1">
                                            {m.student?.course} - <span className="text-blue-600">{m.student?.section}</span>
                                          </p>
                                        </div>
                                      </div>
                                      
                                      {/* Full Width Mobile Buttons */}
                                      <div className="grid grid-cols-2 gap-2 mt-2">
                                        <button 
                                          onClick={() => m.student && markAttendance(m.student.id, 'PRESENT')}
                                          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                            isPresent 
                                              ? 'bg-green-100 text-green-700 ring-2 ring-green-500 ring-offset-1 shadow-sm' 
                                              : 'bg-slate-100 text-slate-500 hover:bg-green-50'
                                          }`}
                                        >
                                          <CheckCircle2 className="w-5 h-5" /> Present
                                        </button>
                                        <button 
                                          onClick={() => m.student && markAttendance(m.student.id, 'ABSENT')}
                                          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                            isAbsent 
                                              ? 'bg-red-100 text-red-700 ring-2 ring-red-500 ring-offset-1 shadow-sm' 
                                              : 'bg-slate-100 text-slate-500 hover:bg-red-50'
                                          }`}
                                        >
                                          <XCircle className="w-5 h-5" /> Absent
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
