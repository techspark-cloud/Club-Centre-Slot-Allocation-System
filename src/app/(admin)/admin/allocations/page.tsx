'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, UserX, AlertTriangle, ShieldAlert, Zap } from 'lucide-react';
import AdminAllocationModal from '@/app/components/AdminAllocationModal';

export default function AdminAllocationsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDept, setSearchDept] = useState('');
  const [searchSec, setSearchSec] = useState('');
  const [searchMode, setSearchMode] = useState<'student' | 'class'>('student');
  
  const DEPARTMENTS = [
    "B.E. Computer Science and Engineering",
    "B.Tech. Artificial Intelligence and Data Science",
    "B.E. Computer Science and Engineering (Artificial Intelligence and Machine Learning)",
    "B.E. Computer and Communication Engineering",
    "B.E. Electronics and Communication Engineering",
    "B.E. Mechanical Engineering",
    "B.Tech. Biotechnology",
    "B.E. Electronics Engineering (VLSI Design and Technology)",
    "B.Tech. Computer Science and Business Systems"
  ];
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStudent, setModalStudent] = useState<{id: string, name: string, day: string, session: string, course: string, section: string} | null>(null);
  
  const supabase = createClient();

  const fetchStudents = async (query: string = '', dept: string = '', sec: string = '') => {
    if (!query.trim() && !dept.trim() && !sec.trim()) {
      setStudents([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      let url = `/api/admin/allocations?`;
      const params = new URLSearchParams();
      if (query) params.append('search', query);
      if (dept) params.append('course', dept);
      if (sec) params.append('section', sec);
      
      const res = await fetch(url + params.toString());
      const data = await res.json();
      
      if (res.ok && data.students) {
        setStudents(data.students);
      } else {
        console.error('Failed to fetch students:', data.error);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    // We purposefully do NOT fetch on mount anymore.
    // The table stays empty until the admin actively searches for a student.
    setLoading(false);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchMode === 'student') {
      fetchStudents(searchTerm);
    } else {
      fetchStudents('', searchDept, searchSec);
    }
  };

  const handleModeSwitch = (mode: 'student' | 'class') => {
    setSearchMode(mode);
    setSearchTerm('');
    setSearchDept('');
    setSearchSec('');
    setStudents([]);
  };

  const handleRevoke = async (allocationId: string, studentName: string, type: string) => {
    if (!window.confirm(`Are you sure you want to REVOKE the ${type} allocation for ${studentName}? This will immediately free up the seat and invalidate their QR Code.`)) {
      return;
    }

    const { error } = await supabase
      .from('allocations')
      .delete()
      .eq('id', allocationId);

    if (error) {
      alert(`Error revoking allocation: ${error.message}`);
    } else {
      alert(`Successfully revoked ${type} allocation for ${studentName}. Seat is now free.`);
      fetchStudents(); // Refresh data
    }
  };

  // Client-side filtering is no longer used for the main list since we use server-side search, 
  // but we keep the variable for backwards compatibility in the UI rendering below.
  const filteredStudents = students;

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Allocations Manager</h1>
          <p className="text-slate-500">View and revoke active student allocations.</p>
        </div>
        
        <div className="flex flex-col items-end gap-3 w-full md:w-auto">
          {/* Mode Toggle */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-fit self-start md:self-end">
            <button 
              onClick={() => handleModeSwitch('student')}
              className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-sm font-bold transition-all ${searchMode === 'student' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Find Student
            </button>
            <button 
              onClick={() => handleModeSwitch('class')}
              className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-sm font-bold transition-all ${searchMode === 'class' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Filter by Class
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-auto flex gap-2">
            {searchMode === 'student' ? (
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search by Reg No or Name..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            ) : (
              <div className="flex gap-2 w-full sm:w-auto">
                <select 
                  value={searchDept}
                  onChange={e => setSearchDept(e.target.value)}
                  className="w-full sm:w-64 p-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                >
                  <option value="">Select Department...</option>
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <select 
                  value={searchSec}
                  onChange={e => setSearchSec(e.target.value)}
                  className="w-24 p-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                >
                  <option value="">Sec</option>
                  {["A", "B", "C", "D", "E", "F", "G"].map(sec => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                </select>
              </div>
            )}
            <button type="submit" className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex gap-3 text-orange-800">
        <ShieldAlert className="w-6 h-6 shrink-0 text-orange-500" />
        <div>
          <h4 className="font-bold text-sm">Admin Revocation Warning</h4>
          <p className="text-sm">Revoking an allocation will instantly free up the slot capacity and invalidate the student's digital ticket. The student must log back in to select a new available slot.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Day & Session</th>
                <th className="px-6 py-4">Club Allocation</th>
                <th className="px-6 py-4">Centre Allocation</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Searching...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <Search className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-600 font-bold text-lg mb-1">
                      {searchMode === 'student' ? 'Ready to find a student' : 'Ready to filter by class'}
                    </p>
                    <p className="text-slate-500 text-sm max-w-md mx-auto">
                      {searchMode === 'student' 
                        ? 'Type a Register Number or Name in the search bar above to instantly locate a specific student.'
                        : 'Type a Department (like ECE) or a Section (like A) to view all students in that group.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => {
                  const clubAlloc = student.allocations.find((a: any) => a.slot.club_id !== null);
                  const centreAlloc = student.allocations.find((a: any) => a.slot.centre_id !== null);

                  return (
                    <tr key={student.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{student.name}</p>
                        <p className="text-slate-500 text-xs">{student.register_no}</p>
                        <p className="text-slate-400 text-xs">{student.course} - {student.section}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold">{student.allowed_day}</span>
                        <br />
                        <span className="text-slate-500 text-xs mt-1 inline-block">{student.activity_session}</span>
                      </td>
                      <td className="px-6 py-4">
                        {clubAlloc ? (
                          <div className="border border-blue-100 bg-blue-50/50 p-3 rounded-lg">
                            <p className="text-[10px] font-bold text-blue-800/70 uppercase tracking-widest mb-0.5">{clubAlloc.slot.day}</p>
                            <p className="font-bold text-blue-900 text-sm mb-1">{clubAlloc.slot.club.name}</p>
                            <p className="text-xs font-medium text-blue-700 mb-2">
                              🕒 {clubAlloc.slot.start_time.substring(0,5)} - {clubAlloc.slot.end_time.substring(0,5)}
                            </p>
                            <button 
                              onClick={() => handleRevoke(clubAlloc.id, student.name, 'CLUB')}
                              className="text-xs flex items-center gap-1 text-red-600 hover:text-red-700 font-bold bg-white px-2 py-1 rounded border border-red-200 hover:bg-red-50 transition-colors"
                            >
                              <UserX className="w-3 h-3" /> Revoke Club
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">No Club Assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {centreAlloc ? (
                          <div className="border border-indigo-100 bg-indigo-50/50 p-3 rounded-lg">
                            <p className="text-[10px] font-bold text-indigo-800/70 uppercase tracking-widest mb-0.5">{centreAlloc.slot.day}</p>
                            <p className="font-bold text-indigo-900 text-sm mb-1">{centreAlloc.slot.centre.name}</p>
                            <p className="text-xs font-medium text-indigo-700 mb-2">
                              🕒 {centreAlloc.slot.start_time.substring(0,5)} - {centreAlloc.slot.end_time.substring(0,5)}
                            </p>
                            <button 
                              onClick={() => handleRevoke(centreAlloc.id, student.name, 'CENTRE')}
                              className="text-xs flex items-center gap-1 text-red-600 hover:text-red-700 font-bold bg-white px-2 py-1 rounded border border-red-200 hover:bg-red-50 transition-colors"
                            >
                              <UserX className="w-3 h-3" /> Revoke Centre
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">No Centre Assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setModalStudent({ 
                                id: student.id, 
                                name: student.name, 
                                day: student.allowed_day, 
                                session: student.activity_session,
                                course: student.course,
                                section: student.section
                              });
                              setIsModalOpen(true);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 font-medium rounded-lg transition-colors border border-orange-200"
                            title="Directly allocate or change slot (bypasses capacity limits)"
                          >
                            <Zap className="w-4 h-4" />
                            Allocate / Change Slot
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalStudent && (
        <AdminAllocationModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          studentId={modalStudent.id}
          studentName={modalStudent.name}
          allowedDay={modalStudent.day}
          allowedSession={modalStudent.session}
          course={modalStudent.course}
          section={modalStudent.section}
          onSuccess={() => {
            fetchStudents('', searchDept, searchSec);
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
