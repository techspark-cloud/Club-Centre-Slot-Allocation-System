"use client";

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Users, Search, ChevronRight, ArrowLeft, Users2, BookOpen, Layers, FileDown, Undo2, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Hierarchy navigation state
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  
  // Section mapping state
  const [updatingDay, setUpdatingDay] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'BOOKED'>('ALL');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    // Fetch total exact count
    const { count } = await supabase.from('students').select('*', { count: 'exact', head: true });
    setTotalCount(count || 0);

    // Fetch all students data using pagination to bypass the 1000 row API limit
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    let keepFetching = true;

    while (keepFetching) {
      const { data } = await supabase
        .from('students')
        .select('*')
        .range(from, from + step - 1);
        
      if (data && data.length > 0) {
        allData = [...allData, ...data];
        from += step;
        if (data.length < step) {
          keepFetching = false;
        }
      } else {
        keepFetching = false;
      }
    }
    
    // Fetch all allocations to calculate true completion status
    const { data: allocations } = await supabase.from('allocations').select('student_id');
    const allocCounts: Record<string, number> = {};
    allocations?.forEach(a => {
      allocCounts[a.student_id] = (allocCounts[a.student_id] || 0) + 1;
    });
    const completedSet = new Set(Object.entries(allocCounts).filter(([_, c]) => c >= 2).map(([id]) => id));

    allData = allData.map(s => ({
      ...s,
      isCompleted: completedSet.has(s.id) || s.status === 'COMPLETED'
    }));
    
    setStudents(allData);
    setLoading(false);
  };

  // Grouping & Filtering Logic
  const batches = ['FORENOON', 'AFTERNOON', 'UNMAPPED'];
  
  const filteredByBatch = useMemo(() => {
    if (!selectedBatch) return [];
    return students.filter(s => 
      selectedBatch === 'UNMAPPED' ? !s.activity_session : s.activity_session === selectedBatch
    );
  }, [students, selectedBatch]);

  const courses = useMemo(() => {
    const unique = Array.from(new Set(filteredByBatch.map(s => s.course).filter(Boolean)));
    return unique.sort();
  }, [filteredByBatch]);

  const filteredByCourse = useMemo(() => {
    if (!selectedCourse) return [];
    return filteredByBatch.filter(s => s.course === selectedCourse);
  }, [filteredByBatch, selectedCourse]);

  const sections = useMemo(() => {
    const unique = Array.from(new Set(filteredByCourse.map(s => s.section).filter(Boolean)));
    return unique.sort();
  }, [filteredByCourse]);

  const finalStudents = useMemo(() => {
    if (!selectedSection) return [];
    let list = filteredByCourse.filter(s => s.section === selectedSection);
    
    if (statusFilter === 'PENDING') {
      list = list.filter(s => !s.isCompleted);
    } else if (statusFilter === 'BOOKED') {
      list = list.filter(s => s.isCompleted);
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => 
        (s.name && s.name.toLowerCase().includes(q)) || 
        (s.register_no && s.register_no.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [filteredByCourse, selectedSection, searchQuery, statusFilter]);

  const handleUpdateSession = async (section: string, newSession: string) => {
    if (!selectedCourse) return;
    setUpdatingDay(section);
    
    try {
      const updatePayload = newSession ? { activity_session: newSession } : { activity_session: null };
      
      const { error } = await supabase
        .from('students')
        .update(updatePayload)
        .eq('course', selectedCourse)
        .eq('section', section);

      if (error) throw error;
      
      // Update local state instead of refetching everything
      setStudents(prev => prev.map(s => 
        (s.course === selectedCourse && s.section === section)
          ? { ...s, ...updatePayload }
          : s
      ));
    } catch (err: any) {
      console.error('Failed to update session:', err);
      alert('Failed to update session: ' + err.message);
    } finally {
      setUpdatingDay(null);
    }
  };

  const handleRevertIDCard = async (studentId: string) => {
    if (!confirm('Are you sure you want to revert the physical ID card verification for this student? They will be forced to scan it again.')) return;
    
    setLoading(true);
    const { error } = await supabase
      .from('students')
      .update({ id_card_verified: false })
      .eq('id', studentId);
      
    if (error) {
      alert('Failed to revert verification.');
    } else {
      await fetchStudents();
    }
    setLoading(false);
  };

  const handleVerifyIDCard = async (studentId: string) => {
    setLoading(true);
    const { error } = await supabase
      .from('students')
      .update({ id_card_verified: true })
      .eq('id', studentId);
      
    if (error) {
      alert('Failed to verify.');
    } else {
      await fetchStudents();
    }
    setLoading(false);
  };

  const handleUpdateAllowedDay = async (section: string, newDay: string) => {
    if (!selectedCourse) return;
    setUpdatingDay(section);
    
    try {
      const updatePayload = newDay ? { allowed_day: newDay } : { allowed_day: null };
      
      const { error } = await supabase
        .from('students')
        .update(updatePayload)
        .eq('course', selectedCourse)
        .eq('section', section);
        
      if (error) throw error;
      
      setStudents(prev => prev.map(s => 
        (s.course === selectedCourse && s.section === section) 
          ? { ...s, allowed_day: newDay || null } 
          : s
      ));
      
    } catch (err: any) {
      console.error('Error updating allowed day:', err.message);
      alert('Failed to update allowed day.');
    } finally {
      setUpdatingDay(null);
    }
  };

  // Rendering Helpers
  const renderBreadcrumbs = () => {
    return (
      <div className="flex items-center space-x-2 text-sm font-bold text-slate-500 mb-6 bg-white p-4 rounded-2xl shadow-sm border-2 border-slate-200">
        <button onClick={() => { setSelectedBatch(null); setSelectedCourse(null); setSelectedSection(null); }} className="hover:text-blue-600 transition-colors flex items-center">
          <Users className="w-4 h-4 mr-1" /> All Batches
        </button>
        
        {selectedBatch && (
          <>
            <ChevronRight className="w-4 h-4 text-slate-300 mx-1" />
            <button onClick={() => { setSelectedCourse(null); setSelectedSection(null); }} className="hover:text-blue-600 transition-colors">
              {selectedBatch === 'FORENOON' ? '1st Batch (Morning)' : selectedBatch === 'AFTERNOON' ? '2nd Batch (Evening)' : 'Unmapped'}
            </button>
          </>
        )}
        
        {selectedCourse && (
          <>
            <ChevronRight className="w-4 h-4 text-slate-300 mx-1" />
            <button onClick={() => setSelectedSection(null)} className="hover:text-blue-600 transition-colors truncate max-w-[200px]">
              {selectedCourse}
            </button>
          </>
        )}

        {selectedSection && (
          <>
            <ChevronRight className="w-4 h-4 text-slate-300 mx-1" />
            <span className="text-slate-900 font-black">Section {selectedSection}</span>
          </>
        )}
      </div>
    );
  };

  const renderBatchSelection = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
      {batches.map(batch => {
        const count = students.filter(s => batch === 'UNMAPPED' ? !s.activity_session : s.activity_session === batch).length;
        const displayName = batch === 'FORENOON' ? '1st Batch (Morning)' : batch === 'AFTERNOON' ? '2nd Batch (Evening)' : 'Unmapped Students';
        
        const colorStyles = batch === 'FORENOON' 
          ? 'border-amber-200 hover:border-amber-400 hover:shadow-amber-100 bg-white text-slate-800'
          : batch === 'AFTERNOON' 
          ? 'border-indigo-200 hover:border-indigo-400 hover:shadow-indigo-100 bg-white text-slate-800'
          : 'border-red-200 hover:border-red-400 hover:shadow-red-100 bg-white text-slate-800';

        const iconBg = batch === 'FORENOON' ? 'bg-amber-100 text-amber-600' : batch === 'AFTERNOON' ? 'bg-indigo-100 text-indigo-600' : 'bg-red-100 text-red-600';

        return (
          <div 
            key={batch} 
            onClick={() => setSelectedBatch(batch)}
            className={`p-6 rounded-3xl border-2 cursor-pointer transition-all transform hover:-translate-y-1 shadow-sm hover:shadow-lg ${colorStyles}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${iconBg}`}>
                <Users2 className="w-6 h-6" />
              </div>
              <span className="text-4xl font-black">{count}</span>
            </div>
            <h3 className="text-xl font-extrabold tracking-tight mt-2">{displayName}</h3>
            <p className="text-sm font-semibold text-slate-400 mt-1 uppercase tracking-wider">Click to view departments</p>
          </div>
        );
      })}
    </div>
  );

  const renderCourseSelection = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center">
        <BookOpen className="mr-2 text-blue-500 w-6 h-6" /> Select Department / Course
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map(course => {
          const count = filteredByBatch.filter(s => s.course === course).length;
          return (
            <div 
              key={course}
              onClick={() => setSelectedCourse(course)}
              className="bg-white p-6 rounded-2xl border-2 border-slate-200 hover:border-blue-500 hover:shadow-lg cursor-pointer transition-all group"
            >
              <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2 min-h-[3rem]">{course}</h4>
              <div className="mt-3 text-sm font-bold text-slate-500 bg-slate-100 inline-block px-4 py-1.5 rounded-xl">
                {count} students
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderSectionSelection = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center">
        <Layers className="mr-2 text-blue-500 w-6 h-6" /> Select Section
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sections.map(section => {
          const sectionStudents = filteredByCourse.filter(s => s.section === section);
          const count = sectionStudents.length;
          // Determine currently assigned session & day
          const currentSession = sectionStudents.length > 0 ? sectionStudents[0].activity_session : '';
          const currentDay = sectionStudents.length > 0 ? sectionStudents[0].allowed_day : '';
          
          return (
            <div 
              key={section}
              className="bg-white p-6 rounded-3xl border-2 border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all flex flex-col group"
            >
              <div 
                onClick={() => setSelectedSection(section)}
                className="cursor-pointer flex flex-col items-center justify-center text-center mb-5"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-black mb-4 group-hover:scale-110 transition-transform">
                  {section}
                </div>
                <h4 className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors text-xl">Section {section}</h4>
                <span className="font-bold text-slate-500 mt-1">{count} students</span>
              </div>
              
              <div className="pt-4 border-t-2 border-slate-100 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Batch Assignment
                  </label>
                  <div className="relative">
                    <select
                      value={currentSession || ''}
                      onChange={(e) => handleUpdateSession(section, e.target.value)}
                      disabled={updatingDay === section}
                      className="block w-full pl-4 pr-8 py-2.5 text-sm font-bold border-2 border-slate-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 bg-slate-50 text-slate-800 disabled:opacity-50 appearance-none cursor-pointer"
                    >
                      <option value="">Unmapped</option>
                      <option value="FORENOON">Morning Batch (1st)</option>
                      <option value="AFTERNOON">Evening Batch (2nd)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                    Day Assignment
                    {updatingDay === section && (
                      <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map(day => {
                      const isSelected = currentDay && currentDay !== 'ANY' && currentDay !== 'INDEPENDENT' && currentDay.includes(day);
                      return (
                        <button
                          key={day}
                          disabled={updatingDay === section}
                          onClick={() => {
                            let newDays = (currentDay && currentDay !== 'ANY' && currentDay !== 'INDEPENDENT') ? currentDay.split(',') : [];
                            if (isSelected) {
                              newDays = newDays.filter((d: string) => d !== day);
                            } else {
                              newDays.push(day);
                            }
                            handleUpdateAllowedDay(section, newDays.length > 0 ? newDays.join(',') : '');
                          }}
                          className={`px-2 py-1 text-[10px] font-bold rounded border ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'}`}
                        >
                          {day.substring(0,3)}
                        </button>
                      )
                    })}
                    <button
                      disabled={updatingDay === section}
                      onClick={() => handleUpdateAllowedDay(section, currentDay === 'ANY' ? '' : 'ANY')}
                      className={`px-2 py-1 text-[10px] font-bold rounded border ${currentDay === 'ANY' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50'}`}
                      title="Open Slot (Any Day)"
                    >
                      ANY
                    </button>
                    <button
                      disabled={updatingDay === section}
                      onClick={() => handleUpdateAllowedDay(section, currentDay === 'INDEPENDENT' ? '' : 'INDEPENDENT')}
                      className={`px-2 py-1 text-[10px] font-bold rounded border ${currentDay === 'INDEPENDENT' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}
                      title="Independent (Exempt)"
                    >
                      EXEMPT
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderStudentTable = () => {
    const booked = finalStudents.filter(s => s.status === 'COMPLETED');
    const notBooked = finalStudents.filter(s => s.status !== 'COMPLETED');

    const downloadPDF = async () => {
      setIsDownloading(true);
      try {
        const studentIds = booked.map(s => s.id);
        let allocationsMap: Record<string, { entity: string, day: string }> = {};

        if (studentIds.length > 0) {
          const { data: allocations } = await supabase
            .from('allocations')
            .select(`
              student_id,
              slot:slots (
                day,
                club:clubs (name),
                centre:centres (name)
              )
            `)
            .in('student_id', studentIds);

          if (allocations) {
            allocations.forEach((a: any) => {
              const entityName = a.slot?.club?.name || a.slot?.centre?.name || 'Unknown';
              allocationsMap[a.student_id] = {
                entity: entityName,
                day: a.slot?.day || 'Unknown'
              };
            });
          }
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        try {
          const response = await fetch('/rit-logo.png');
          const blob = await response.blob();
          
          const img = new Image();
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
        doc.text("SECTION SLOT BOOKING REPORT", pageWidth / 2, 45, { align: "center" });

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(14, 52, pageWidth - 14, 52);

        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        
        doc.setFont("helvetica", "bold");
        doc.text("Course & Sec :", 14, 62);
        doc.setFont("helvetica", "normal");
        doc.text(`${selectedCourse} - ${selectedSection}`, 42, 62);

        doc.setFont("helvetica", "bold");
        doc.text("Date :", 14, 69);
        doc.setFont("helvetica", "normal");
        doc.text(new Date().toISOString().split('T')[0], 25, 69);

        // Stats Box equivalent
        doc.setFont("helvetica", "bold");
        doc.text(`Total: ${finalStudents.length}    Booked: ${booked.length}    Not Booked: ${notBooked.length}`, 115, 62);

        let currentY = 76;

        if (booked.length > 0) {
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(21, 128, 61); // green-700
          doc.text(`Booked Students (${booked.length})`, 14, currentY);

          const bookedColumn = ["S.No", "Register No", "Name", "Allocated Entity", "Day"];
          const bookedRows = booked.map((s, i) => [
            i + 1,
            s.register_no || '-',
            s.name || '-',
            allocationsMap[s.id]?.entity || '-',
            allocationsMap[s.id]?.day || '-'
          ]);

          autoTable(doc, {
            head: [bookedColumn],
            body: bookedRows,
            startY: currentY + 4,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [21, 128, 61], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [240, 253, 244] }, // green-50
          });
          
          // @ts-ignore
          currentY = doc.lastAutoTable.finalY + 12;
        }

        if (notBooked.length > 0) {
          // Check if we need a new page
          if (currentY > doc.internal.pageSize.height - 40) {
            doc.addPage();
            currentY = 20;
          }

          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(185, 28, 28); // red-700
          doc.text(`Not Booked Students (${notBooked.length})`, 14, currentY);

          const notBookedColumn = ["S.No", "Register No", "Name", "Gender", "Contact"];
          const notBookedRows = notBooked.map((s, i) => [
            i + 1,
            s.register_no || '-',
            s.name || '-',
            s.gender || '-',
            s.contact_no || '-'
          ]);

          autoTable(doc, {
            head: [notBookedColumn],
            body: notBookedRows,
            startY: currentY + 4,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [185, 28, 28], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [254, 242, 242] }, // red-50
          });
        }

        doc.save(`${selectedCourse}_Sec_${selectedSection}_Booking_Report.pdf`);
      } catch (err) {
        console.error("PDF generation failed:", err);
        alert("Failed to generate PDF.");
      } finally {
        setIsDownloading(false);
      }
    };



    return (
      <div className="rounded-3xl overflow-hidden border-2 border-slate-200 bg-white shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="p-5 border-b-2 border-slate-100 flex flex-wrap gap-3 items-center justify-between">
          <h3 className="font-black text-xl text-slate-900">
            Section {selectedSection} Students ({finalStudents.length})
          </h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search by name or register number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block pl-10 pr-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 text-sm font-medium text-slate-800"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="block pl-4 pr-10 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm font-bold text-slate-700 cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending Only</option>
              <option value="BOOKED">Booked Only</option>
            </select>
            
            <button
              onClick={downloadPDF}
              disabled={isDownloading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm whitespace-nowrap disabled:opacity-50"
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              Download PDF
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Gender / Hosteler</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status & Verification</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {finalStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-black">
                        {(student.name || '?').charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-bold text-slate-900">{student.name}</div>
                        <div className="text-sm text-slate-500">{student.register_no}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-slate-800">{student.gender || '-'}</div>
                    <div className="text-sm text-slate-500">{student.hosteler === 'Yes' ? 'Hosteler' : student.hosteler === 'No' ? 'Day Scholar' : '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                    {student.contact_no || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-2 items-start">
                      <span className={`px-3 py-1 inline-flex text-xs font-extrabold rounded-xl ${
                        student.isCompleted
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {student.isCompleted ? 'Booked' : 'Pending'}
                      </span>
                      
                      {student.id_card_verified ? (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            ID Verified
                          </span>
                          <button
                            onClick={() => handleRevertIDCard(student.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Revert Verification"
                          >
                            <Undo2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Not Verified
                          </span>
                          <button
                            onClick={() => handleVerifyIDCard(student.id)}
                            className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-2 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-colors"
                          >
                            Verify Now
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {finalStudents.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No students found in this section.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading student directory...</div>;
  }

  const downloadGlobalDefaultersPDF = async () => {
    setIsDownloading(true);
    try {
      const defaulters = students.filter(s => !s.isCompleted);
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      try {
        const response = await fetch('/rit-logo.png');
        const blob = await response.blob();
        
        const img = new Image();
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
      doc.setTextColor(185, 28, 28);
      doc.text("GLOBAL DEFAULTERS REPORT", pageWidth / 2, 45, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      doc.text(`Total Defaulters (Unallocated): ${defaulters.length}`, pageWidth / 2, 52, { align: "center" });

      const notBookedColumn = ["S.No", "Register No", "Name", "Course", "Sec", "Contact"];
      const notBookedRows = defaulters.map((s, i) => [
        i + 1,
        s.register_no || '-',
        s.name || '-',
        s.course || '-',
        s.section || '-',
        s.contact_no || '-'
      ]);

      autoTable(doc, {
        head: [notBookedColumn],
        body: notBookedRows,
        startY: 60,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [185, 28, 28], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [254, 242, 242] },
      });

      doc.save(`Global_Defaulters_Report.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
            <div className="bg-blue-100 p-2.5 rounded-xl mr-3">
              <Users className="text-blue-600 w-6 h-6" />
            </div>
            Students Directory
          </h1>
          <p className="text-slate-500 font-medium mt-2">
            Browse and manage all registered students hierarchically.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <button
            onClick={downloadGlobalDefaultersPDF}
            disabled={isDownloading || loading}
            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 border-2 border-red-200 text-red-700 px-5 py-3 rounded-2xl shadow-sm transition-colors font-bold disabled:opacity-50"
            title="Download list of all students who have not completed slot booking"
          >
            {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
            Export Unallocated
          </button>
          <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border-2 border-slate-200 font-bold text-slate-700 whitespace-nowrap">
            Total Valid Students: <span className="text-blue-600 ml-1 text-lg font-black">{totalCount}</span>
          </div>
        </div>
      </div>

      {renderBreadcrumbs()}

      {!selectedBatch && renderBatchSelection()}
      {selectedBatch && !selectedCourse && renderCourseSelection()}
      {selectedBatch && selectedCourse && !selectedSection && renderSectionSelection()}
      {selectedBatch && selectedCourse && selectedSection && renderStudentTable()}
      
    </div>
  );
}
