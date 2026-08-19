'use client';

import React, { useState } from 'react';
import { Users, Calendar, MapPin, Download, BookOpen, Clock, Building2, User } from 'lucide-react';

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

  const downloadCSV = (slotId: string, entityName: string, day: string) => {
    const students = allocationsForSlot(slotId);
    if (students.length === 0) {
      alert("No students enrolled in this slot yet.");
      return;
    }

    const headers = ['S.No', 'Register Number', 'Student Name', 'Course & Section', 'Academic Year', 'Hosteller'];
    const csvData = [
      headers.join(','),
      ...students.map((m, i) => [
        i + 1,
        m.student?.register_no,
        `"${m.student?.name}"`,
        `${m.student?.course} - ${m.student?.section}`,
        m.student?.academic_year,
        m.student?.hosteler ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${entityName}_${day}_Enrolled_Students.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        {currentEntities.map((entity) => (
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
                <Calendar className="w-4 h-4" /> Allocated Slots
              </h3>

              {slotsByEntity(entity.id).length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-bold">No timetable slots have been allocated yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {slotsByEntity(entity.id).map(slot => {
                    const enrolledStudents = allocationsForSlot(slot.id);
                    const isSelected = selectedSlotId === slot.id;

                    return (
                      <div key={slot.id} className={`border-2 rounded-2xl transition-all duration-300 ${isSelected ? 'border-blue-500 shadow-md ring-4 ring-blue-50' : 'border-slate-100 hover:border-slate-300'}`}>
                        
                        {/* Slot Header */}
                        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer" onClick={() => setSelectedSlotId(isSelected ? null : slot.id)}>
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-widest border border-indigo-100">
                                {slot.day}
                              </span>
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                {slot.session}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm font-bold text-slate-600 mt-2">
                              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-400" /> {slot.start_time} - {slot.end_time}</span>
                              {slot.venue && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400" /> {slot.venue}</span>}
                            </div>
                          </div>
                          
                          <div className="text-center sm:text-right flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                             <div className="text-2xl font-black text-slate-800">{enrolledStudents.length} <span className="text-sm font-bold text-slate-400">/ {slot.capacity}</span></div>
                             <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Enrolled</div>
                          </div>
                        </div>

                        {/* Expandable Student Roster */}
                        {isSelected && (
                          <div className="border-t-2 border-slate-100 bg-slate-50/50 rounded-b-2xl overflow-hidden animate-in slide-in-from-top-2 duration-300">
                            <div className="p-4 flex items-center justify-between bg-white border-b border-slate-100">
                              <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Student Roster</h4>
                              <button 
                                onClick={(e) => { e.stopPropagation(); downloadCSV(slot.id, entity.name, slot.day); }}
                                className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" /> Export CSV
                              </button>
                            </div>
                            
                            <div className="max-h-96 overflow-y-auto">
                              {enrolledStudents.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 font-bold text-sm">
                                  No students are enrolled in this slot.
                                </div>
                              ) : (
                                <table className="w-full text-left whitespace-nowrap">
                                  <thead>
                                    <tr className="bg-slate-50 border-b-2 border-slate-200">
                                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 sticky top-0 bg-slate-50">S.No</th>
                                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 sticky top-0 bg-slate-50">Reg No</th>
                                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 sticky top-0 bg-slate-50">Name</th>
                                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 sticky top-0 bg-slate-50">Course & Sec</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 bg-white">
                                    {enrolledStudents.map((m, idx) => (
                                      <tr key={m.id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-4 py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                                        <td className="px-4 py-3 text-xs font-bold font-mono text-slate-700">{m.student?.register_no}</td>
                                        <td className="px-4 py-3">
                                          <p className="text-xs font-extrabold text-slate-900">{m.student?.name}</p>
                                          {m.student?.academic_year && <p className="text-[10px] font-bold text-slate-400 mt-0.5">{m.student.academic_year}</p>}
                                        </td>
                                        <td className="px-4 py-3 text-xs font-bold text-slate-600">
                                          {m.student?.course} - <span className="text-blue-600">{m.student?.section}</span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
