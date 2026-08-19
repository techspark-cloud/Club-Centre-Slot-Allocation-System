'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, UserX, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function AdminAllocationsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const supabase = createClient();

  const fetchStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('students')
      .select(`
        id, name, register_no, course, section, allowed_day, activity_session,
        allocations(
          id,
          slot:slots(
            id, type, start_time, end_time, venue, day,
            club:clubs(name),
            centre:centres(name)
          )
        )
      `)
      .order('register_no');

    if (!error && data) {
      setStudents(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

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

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.register_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Allocations Manager</h1>
          <p className="text-slate-500">View and revoke active student allocations.</p>
        </div>
        
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by Name or Reg No..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">Loading students...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No students found.</td></tr>
              ) : (
                filteredStudents.map(student => {
                  const clubAlloc = student.allocations.find((a: any) => a.slot.type === 'CLUB');
                  const centreAlloc = student.allocations.find((a: any) => a.slot.type === 'CENTRE');

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
                            <p className="font-bold text-blue-900 text-sm mb-2">{clubAlloc.slot.club.name}</p>
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
                            <p className="font-bold text-indigo-900 text-sm mb-2">{centreAlloc.slot.centre.name}</p>
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
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
