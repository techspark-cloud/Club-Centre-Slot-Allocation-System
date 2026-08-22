'use client';

import { useState, useEffect, useMemo } from 'react';
import { getCentresAllocations } from './actions';
import { Download, Search, MapPin, Filter } from 'lucide-react';

type Allocation = {
  id: string;
  created_at: string;
  students: {
    name: string;
    register_no: string;
    course: string;
    gender: string;
    section: string;
    semester: number;
    contact_no: string;
  };
  slots: {
    day: string;
    session: string;
    venue: string;
    start_time: string;
    end_time: string;
    centres: {
      name: string;
    };
  };
};

export default function OverallCentresStudents() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedSem, setSelectedSem] = useState('All');
  const [selectedSec, setSelectedSec] = useState('All');
  const [selectedDay, setSelectedDay] = useState('All');
  const [selectedVenue, setSelectedVenue] = useState('All');

  useEffect(() => {
    async function fetchData() {
      const data = await getCentresAllocations();
      setAllocations(data as unknown as Allocation[]);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Extract unique options for filters
  const filterOptions = useMemo(() => {
    const depts = new Set<string>();
    const sems = new Set<string>();
    const secs = new Set<string>();
    const days = new Set<string>();
    const venues = new Set<string>();

    allocations.forEach(a => {
      if (a.students?.course) depts.add(a.students.course);
      if (a.students?.semester) sems.add(a.students.semester.toString());
      if (a.students?.section) secs.add(a.students.section);
      if (a.slots?.day) days.add(a.slots.day);
      if (a.slots?.venue) venues.add(a.slots.venue);
    });

    return {
      depts: Array.from(depts).sort(),
      sems: Array.from(sems).sort(),
      secs: Array.from(secs).sort(),
      days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].filter(d => days.has(d)),
      venues: Array.from(venues).sort()
    };
  }, [allocations]);

  const filteredData = allocations.filter(a => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (
      a.students?.name?.toLowerCase().includes(term) ||
      a.students?.register_no?.toLowerCase().includes(term) ||
      a.slots?.centres?.name?.toLowerCase().includes(term)
    );

    const matchesDept = selectedDept === 'All' || a.students?.course === selectedDept;
    const matchesSem = selectedSem === 'All' || a.students?.semester?.toString() === selectedSem;
    const matchesSec = selectedSec === 'All' || a.students?.section === selectedSec;
    const matchesDay = selectedDay === 'All' || a.slots?.day === selectedDay;
    const matchesVenue = selectedVenue === 'All' || a.slots?.venue === selectedVenue;

    return matchesSearch && matchesDept && matchesSem && matchesSec && matchesDay && matchesVenue;
  }).sort((a, b) => {
    const regA = a.students?.register_no || '';
    const regB = b.students?.register_no || '';
    return regA.localeCompare(regB);
  });

  const downloadCSV = () => {
    if (filteredData.length === 0) return;
    const headers = ['Register Number', 'Student Name', 'Course', 'Semester', 'Section', 'Gender', 'Contact', 'Centre Name', 'Day', 'Session', 'Venue'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(a => [
        `"${a.students?.register_no || ''}"`,
        `"${a.students?.name || ''}"`,
        `"${a.students?.course || ''}"`,
        a.students?.semester || '',
        `"${a.students?.section || ''}"`,
        `"${a.students?.gender || ''}"`,
        `"${a.students?.contact_no || ''}"`,
        `"${a.slots?.centres?.name || ''}"`,
        `"${a.slots?.day || ''}"`,
        `"${a.slots?.session || ''}"`,
        `"${a.slots?.venue || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'Overall_Centres_Students_Report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Centres Student Directory</h2>
          <p className="text-slate-500 mt-1">Advanced filtering for student allocation tracking.</p>
        </div>
        <button
          onClick={downloadCSV}
          disabled={filteredData.length === 0}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-indigo-600" />
          <h3 className="font-bold text-slate-700 text-sm">Advanced Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-9 pr-3 py-2 w-full border border-slate-300 rounded-lg text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
            <option value="All">All Departments (Batches)</option>
            {filterOptions.depts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={selectedSem} onChange={e => setSelectedSem(e.target.value)}>
            <option value="All">All Semesters</option>
            {filterOptions.sems.map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>
          
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={selectedSec} onChange={e => setSelectedSec(e.target.value)}>
            <option value="All">All Sections</option>
            {filterOptions.secs.map(s => <option key={s} value={s}>Section {s}</option>)}
          </select>
          
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={selectedDay} onChange={e => setSelectedDay(e.target.value)}>
            <option value="All">All Days</option>
            {filterOptions.days.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={selectedVenue} onChange={e => setSelectedVenue(e.target.value)}>
            <option value="All">All Venues</option>
            {filterOptions.venues.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Student Details</th>
                <th className="px-6 py-4">Department & Section</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Centre Assigned</th>
                <th className="px-6 py-4">Schedule & Venue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex justify-center mb-4">
                      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                    Loading student data...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No students found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredData.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{a.students?.name}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{a.students?.register_no}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-700 font-medium line-clamp-1" title={a.students?.course}>
                        {a.students?.course}
                      </div>
                      <div className="text-slate-500 text-xs mt-0.5">
                        Sem {a.students?.semester} • Sec {a.students?.section}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {a.students?.contact_no || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {a.slots?.centres?.name || 'Unknown Centre'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-700">
                        {a.slots?.day} ({a.slots?.session})
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 text-xs mt-1">
                        <MapPin className="w-3 h-3" />
                        {a.slots?.venue}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
