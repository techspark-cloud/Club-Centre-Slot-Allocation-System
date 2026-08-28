'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getClubOrCentreDetails } from '@/app/actions/dashboard';
import { User, Phone, Loader2, ArrowLeft, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function CentreDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (id) {
      fetchCentreDetails();
    }
  }, [id]);

  const fetchCentreDetails = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch centre details
      const { data: centre, error: centreError } = await supabase.from('centres').select('*').eq('id', id).single();
      if (centreError) console.error('Error fetching centre:', centreError);
      
      // 2. Fetch slots for this centre
      const { data: slots, error: slotsError } = await supabase.from('slots').select('*').eq('centre_id', id).eq('status', 'ACTIVE');
      if (slotsError) console.error('Error fetching slots:', slotsError);
      const totalCapacity = slots?.reduce((acc, curr) => acc + (curr.capacity || 0), 0) || 0;
      
      // 3 & 4. Fetch allocations and attendance via server action to bypass RLS
      let allocationsData: any[] = [];
      let attendanceMap = new Map();
      
      if (slots && slots.length > 0) {
        const slotIds = slots.map(s => s.id);
        const { allocations, attendance } = await getClubOrCentreDetails(slotIds);
        
        allocationsData = allocations;
        
        attendance.forEach(record => {
          attendanceMap.set(record.student_id, record.status); // 'PRESENT' or 'ABSENT'
        });
      }
      
      // Unique enrolled students
      const uniqueStudentsMap = new Map();
      allocationsData.forEach(a => {
        if (a.students && !uniqueStudentsMap.has(a.student_id)) {
          uniqueStudentsMap.set(a.student_id, a.students);
        }
      });
      const studentsList = Array.from(uniqueStudentsMap.values());
      const totalEnrolled = studentsList.length;
      
      const enrichedStudents = studentsList.map(student => ({
        ...student,
        attendance: attendanceMap.get(student.id) || 'UNMARKED'
      }));
      
      setData({
        centre,
        slots,
        totalCapacity,
        totalEnrolled,
        students: enrichedStudents
      });
    } catch (error) {
      console.error('Unexpected error in fetchCentreDetails:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!data?.centre) {
    return <div>Centre not found</div>;
  }

  const { centre, totalCapacity, totalEnrolled, students } = data;
  
  const pieData = [
    { name: 'Enrolled', value: totalEnrolled, color: '#4f46e5' }, // indigo-600
    { name: 'Available Slots', value: Math.max(0, totalCapacity - totalEnrolled), color: '#e2e8f0' } // slate-200
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/overall-centres/centres" className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-full transition-colors shadow-sm">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{centre.name}</h1>
          <p className="text-slate-500 mt-1">Centre Details & Current Status</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Centre Info & Pie Chart */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-lg text-slate-900 mb-4">Coordinator Info</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">Name</p>
                  <p className="text-slate-900 font-medium">{centre.faculty_name || 'Not Assigned'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">Contact</p>
                  {centre.faculty_mobile ? (
                    <a href={`tel:${centre.faculty_mobile}`} className="text-indigo-600 font-medium hover:underline">
                      {centre.faculty_mobile}
                    </a>
                  ) : (
                    <p className="text-slate-900 font-medium">Not Available</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-lg text-slate-900 mb-4">Enrollment Status</h3>
            <div className="h-64 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} Students`, 'Count']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
              {/* Inner text for Pie */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
                <span className="text-3xl font-black text-slate-900">{totalEnrolled}</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Enrolled</span>
              </div>
            </div>
            <div className="text-center mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-sm font-medium text-slate-600">
                <span className="text-indigo-600 font-bold">{totalEnrolled}</span> enrolled out of <span className="font-bold">{totalCapacity}</span> capacity
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Students List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col h-full">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Enrolled Students ({students.length})</h3>
                <p className="text-sm text-slate-500">Today's Attendance Status</p>
              </div>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-6 py-4">Student Name</th>
                    <th className="px-6 py-4">Reg No</th>
                    <th className="px-6 py-4">Course/Sec</th>
                    <th className="px-6 py-4 text-right">Today's Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student: any) => (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {student.name}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {student.register_no}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {student.course} - {student.section}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {student.attendance === 'PRESENT' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Present
                          </span>
                        )}
                        {student.attendance === 'ABSENT' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                            <XCircle className="w-3.5 h-3.5" /> Absent
                          </span>
                        )}
                        {student.attendance === 'UNMARKED' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <HelpCircle className="w-3.5 h-3.5" /> Unmarked
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <User className="w-12 h-12 text-slate-300 mb-3" />
                          <p className="text-slate-500 font-medium">No students are currently enrolled in this centre.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
