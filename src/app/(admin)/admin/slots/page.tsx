'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Calendar, Plus, Users, Save, Download, MapPin } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StudentAlloc {
  id: string;
  student_id: string;
  student: {
    name: string;
    register_no: string;
    course: string;
    semester: number;
    academic_year: string;
    section: string;
    contact_no: string;
  };
}

interface SlotData {
  id: string;
  day: string;
  session: string;
  capacity: number;
  allocated_count: number;
  venue: string;
  club?: { id: string, name: string, faculty_name?: string, faculty_mobile?: string };
  centre?: { id: string, name: string, faculty_name?: string, faculty_mobile?: string };
  allocations: StudentAlloc[];
}

export default function SlotsPage() {
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{ venue: string, day: string, session: string, type: 'CLUB' | 'CENTRE' } | null>(null);
  const [updatingCapacity, setUpdatingCapacity] = useState<string | null>(null);
  const [capacityValues, setCapacityValues] = useState<Record<string, number>>({});
  const [venues, setVenues] = useState<string[]>([]);
  const [activeVenue, setActiveVenue] = useState<string>('ALL');
  const [allClubs, setAllClubs] = useState<{id: string, name: string}[]>([]);
  const [allCentres, setAllCentres] = useState<{id: string, name: string}[]>([]);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [updatingEntity, setUpdatingEntity] = useState<boolean>(false);
  
  const supabase = createClient();

  useEffect(() => {
    const fetchEntities = async () => {
      const { data: clubs } = await supabase.from('clubs').select('id, name').order('name');
      if (clubs) setAllClubs(clubs);
      const { data: centres } = await supabase.from('centres').select('id, name').order('name');
      if (centres) setAllCentres(centres);
    };
    fetchEntities();
  }, []);

  const fetchSlots = async () => {
    const { data, error } = await supabase
      .from('slots')
      .select(`
        id, day, session, capacity, allocated_count, venue,
        club:clubs(id, name, faculty_name, faculty_mobile), 
        centre:centres(id, name, faculty_name, faculty_mobile),
        allocations(
          id,
          student_id,
          student:students(name, register_no, course, semester, academic_year, section, contact_no)
        )
      `);
      
    if (error) {
      console.error(error);
      return;
    }
    
    if (data) {
      setSlots(data as any[]);
      
      const caps: Record<string, number> = {};
      data.forEach((s: any) => caps[s.id] = s.capacity);
      setCapacityValues(caps);

      const uniqueVenues = Array.from(new Set((data as any[]).map(s => s.venue).filter(Boolean)));
      setVenues(uniqueVenues.sort());
      if (uniqueVenues.length > 0 && activeVenue !== 'ALL' && !uniqueVenues.includes(activeVenue)) {
        setActiveVenue('ALL');
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSlots();

    let timeoutId: NodeJS.Timeout;
    
    const channel = supabase.channel('admin_realtime_slots')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'slots' }, () => {
        // Debounce the heavy fetch to protect database read limits
        // If 100 bookings happen in 1 second, this ensures we only query the DB once after the rush settles
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          fetchSlots();
        }, 3000); 
      })
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  const sessions = ['FORENOON', 'AFTERNOON'];

  const getCellData = (venue: string, day: string, session: string, type: 'CLUB' | 'CENTRE') => {
    const cellSlots = slots.filter(s => s.venue === venue && s.day === day && s.session === session && (type === 'CLUB' ? s.club : s.centre));
    if (cellSlots.length === 0) return <span className="text-gray-400">-</span>;
    
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-1 leading-tight w-full">
        {cellSlots.map((s, i) => {
          const name = type === 'CLUB' ? s.club?.name : s.centre?.name;
          if (!name) return null;
          
          const parenMatch = name.match(/^(.*?)\s*(\(.*?\))$/);
          const isLast = i === cellSlots.length - 1;
          
          if (parenMatch) {
            return (
              <div key={s.id || i} className="inline-flex flex-col items-center">
                <span>{parenMatch[1]}{!isLast && ','}</span>
                <span className="text-[10px] opacity-75 mt-0.5 whitespace-normal text-center leading-3">{parenMatch[2]}</span>
              </div>
            );
          }
          
          return (
            <span key={s.id || i} className="whitespace-normal text-center">
              {name}{!isLast && ','}
            </span>
          );
        })}
      </div>
    );
  };

  const handleUpdateCapacity = async (id: string) => {
    setUpdatingCapacity(id);
    try {
      await fetch('/api/admin/update-capacity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, capacity: capacityValues[id] })
      });
    } catch (e) {
      console.error(e);
      alert('Failed to update capacity');
    } finally {
      setUpdatingCapacity(null);
    }
  };

  const handleUpdateEntity = async (slotId: string, type: 'CLUB' | 'CENTRE') => {
    if (!selectedEntityId) return;
    setUpdatingEntity(true);
    
    const updateData = type === 'CLUB' ? { club_id: selectedEntityId } : { centre_id: selectedEntityId };
    
    try {
      const { error } = await supabase
        .from('slots')
        .update(updateData)
        .eq('id', slotId);
        
      if (error) throw error;
      
      setEditingSlotId(null);
      await fetchSlots();
    } catch (err) {
      console.error('Error updating slot entity:', err);
      alert('Failed to update. Students might already be booked in this slot.');
    } finally {
      setUpdatingEntity(false);
    }
  };

  const handleRemoveStudent = async (allocationId: string, studentId: string, slotId: string) => {
    if (!confirm('Are you sure you want to remove this student from the slot?')) return;
    
    try {
      // 1. Delete the allocation
      const { error: allocError } = await supabase.from('allocations').delete().eq('id', allocationId);
      if (allocError) throw allocError;
      
      // 2. Fetch the current slot to decrement count
      const { data: slotData } = await supabase.from('slots').select('allocated_count').eq('id', slotId).single();
      if (slotData) {
        await supabase.from('slots').update({ allocated_count: Math.max(0, slotData.allocated_count - 1) }).eq('id', slotId);
      }
      
      // 3. Update student status to PENDING
      await supabase.from('students').update({ status: 'PENDING' }).eq('id', studentId);
      
      // Refresh
      await fetchSlots();
    } catch (error) {
      console.error('Error removing student:', error);
      alert('Failed to remove student.');
    }
  };

  const generatePDF = (slot: SlotData) => {
    const isClub = !!slot.club;
    const entity = isClub ? slot.club : slot.centre;
    const entityName = entity?.name || 'Unknown';
    const facultyName = entity?.faculty_name || 'Not Assigned';
    const facultyMobile = entity?.faculty_mobile || '-';
    const typeLabel = isClub ? 'CLUB' : 'CENTRE';
    const sessionLabel = slot.session === 'FORENOON' ? 'Morning (8.00am - 10.30am)' : 'Evening (1.10pm - 3.40pm)';
    const dayLabel = slot.day.charAt(0) + slot.day.slice(1).toLowerCase();
    const origin = window.location.origin;
    const now = new Date().toLocaleString('en-IN');

    const pw = window.open('', '_blank');
    if (!pw) return;

    const buildRows = (list: StudentAlloc[]) =>
      list.map((alloc, i) =>
        `<tr style="background:${i % 2 === 0 ? '#f8fafc' : '#fff'}">
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0">${i + 1}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;font-weight:700">${alloc.student.name}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0">${alloc.student.register_no}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0">${alloc.student.course}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:center">${alloc.student.semester}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:center">${alloc.student.section}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0">${alloc.student.contact_no || '-'}</td>
        </tr>`
      ).join('');

    const th = `padding:9px 10px;text-align:left;background:#1e3a5f;color:#fff;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.05em;`;
    const thC = `padding:9px 10px;text-align:center;background:#1e3a5f;color:#fff;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.05em;`;

    pw.document.write(`<!DOCTYPE html><html><head><title>${entityName} - Allocation Report</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}@page{margin:0}body{font-family:Arial,sans-serif;color:#1e293b;padding:28px 32px}</style>
    </head><body>
      <!-- HEADER -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;border-bottom:3px solid #1e3a5f;margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:16px">
          <img src="${origin}/rit-logo.png" style="height:52px;object-fit:contain" />
          <div style="width:1px;height:40px;background:#cbd5e1"></div>
          <img src="${origin}/techspark-logo.png" style="height:52px;object-fit:contain" />
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:#94a3b8">Generated: ${now}</div>
        </div>
      </div>

      <!-- CLUB / CENTRE INFO -->
      <div style="margin-bottom:20px">
        <div style="display:inline-block;background:${isClub ? '#eff6ff' : '#eef2ff'};border:2px solid ${isClub ? '#bfdbfe' : '#c7d2fe'};border-radius:8px;padding:3px 12px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:${isClub ? '#1d4ed8' : '#4338ca'};margin-bottom:10px">${typeLabel}</div>
        <div style="font-size:26px;font-weight:900;color:#0f172a;margin-bottom:6px">${entityName}</div>
        <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">
          <div>
            <span style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">Faculty Coordinator</span><br/>
            <span style="font-size:14px;font-weight:800;color:#1e293b">${facultyName}</span>
          </div>
          <div>
            <span style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">Mobile</span><br/>
            <span style="font-size:14px;font-weight:800;color:#1e293b">${facultyMobile}</span>
          </div>
        </div>
      </div>

      <!-- SLOT SUMMARY CARDS -->
      <div style="display:flex;gap:12px;margin-bottom:24px">
        <div style="flex:1;background:#f0fdf4;border:2px solid #bbf7d0;border-radius:10px;padding:10px 14px">
          <div style="font-size:10px;font-weight:700;color:#16a34a;text-transform:uppercase">Allocated</div>
          <div style="font-size:28px;font-weight:900;color:#15803d">${slot.allocated_count}</div>
        </div>
        <div style="flex:1;background:#fef2f2;border:2px solid #fecaca;border-radius:10px;padding:10px 14px">
          <div style="font-size:10px;font-weight:700;color:#dc2626;text-transform:uppercase">Remaining</div>
          <div style="font-size:28px;font-weight:900;color:#b91c1c">${slot.capacity - slot.allocated_count}</div>
        </div>
        <div style="flex:1;background:#eff6ff;border:2px solid #bfdbfe;border-radius:10px;padding:10px 14px">
          <div style="font-size:10px;font-weight:700;color:#2563eb;text-transform:uppercase">Capacity</div>
          <div style="font-size:28px;font-weight:900;color:#1d4ed8">${slot.capacity}</div>
        </div>
        <div style="flex:1;background:#f5f3ff;border:2px solid #ddd6fe;border-radius:10px;padding:10px 14px">
          <div style="font-size:10px;font-weight:700;color:#7c3aed;text-transform:uppercase">Venue</div>
          <div style="font-size:20px;font-weight:900;color:#5b21b6">${slot.venue}</div>
        </div>
        <div style="flex:1.5;background:#fff7ed;border:2px solid #fed7aa;border-radius:10px;padding:10px 14px">
          <div style="font-size:10px;font-weight:700;color:#ea580c;text-transform:uppercase">Session</div>
          <div style="font-size:13px;font-weight:800;color:#9a3412">${dayLabel} — ${sessionLabel}</div>
        </div>
      </div>

      <!-- STUDENTS TABLE -->
      <div style="font-size:14px;font-weight:800;color:#1e293b;margin-bottom:10px">Allocated Students (${slot.allocated_count})</div>
      ${slot.allocations.length > 0 ? `
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr>
          <th style="${thC}">#</th>
          <th style="${th}">Name</th>
          <th style="${th}">Register No</th>
          <th style="${th}">Course</th>
          <th style="${thC}">Sem</th>
          <th style="${thC}">Sec</th>
          <th style="${th}">Contact</th>
        </tr></thead>
        <tbody>${buildRows(slot.allocations)}</tbody>
      </table>` : '<p style="color:#64748b;font-style:italic;padding:12px 0">No students have been allocated to this slot yet.</p>'}
    </body></html>`);
    pw.document.close();
    setTimeout(() => pw.print(), 600);
  };

  const activeCellSlots = selectedCell 
    ? slots.filter(s => s.venue === selectedCell.venue && s.day === selectedCell.day && s.session === selectedCell.session && (selectedCell.type === 'CLUB' ? s.club : s.centre))
    : [];

  const getDayColor = (day: string) => {
    switch (day) {
      case 'MONDAY': return 'bg-blue-50 dark:bg-blue-900/20';
      case 'TUESDAY': return 'bg-emerald-50 dark:bg-emerald-900/20';
      case 'WEDNESDAY': return 'bg-purple-50 dark:bg-purple-900/20';
      case 'THURSDAY': return 'bg-amber-50 dark:bg-amber-900/20';
      case 'FRIDAY': return 'bg-rose-50';
      default: return 'bg-slate-50';
    }
  };

  const renderVenueTable = (venueName: string) => (
    <div key={venueName} className="bg-white rounded-3xl shadow-sm border-2 border-slate-200 overflow-hidden mb-6">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th colSpan={5} className="bg-slate-50 text-left px-4 py-2 text-sm font-bold text-slate-700 border border-slate-200">
                Venue: <span className="font-black text-blue-600">{venueName}</span>
              </th>
            </tr>
            <tr className="bg-[#003399] text-white">
              <th className="px-4 py-3 text-center border border-gray-400 dark:border-gray-600 font-bold w-1/5">Period</th>
              <th colSpan={2} className="px-4 py-3 text-center border border-gray-400 dark:border-gray-600 font-bold w-2/5 border-r-2 border-r-[#002266]">Morning (8.00am to 10.30am)</th>
              <th colSpan={2} className="px-4 py-3 text-center border border-gray-400 dark:border-gray-600 font-bold w-2/5">Evening (1.10pm to 3.40 pm)</th>
            </tr>
            <tr className="bg-[#003399] text-white">
              <th className="px-4 py-2 text-center border border-gray-400 dark:border-gray-600 font-bold text-sm">Day</th>
              <th className="px-4 py-2 text-center border border-gray-400 dark:border-gray-600 font-bold text-sm">Club (8.00am to 9.15am)</th>
              <th className="px-4 py-2 text-center border border-gray-400 dark:border-gray-600 font-bold text-sm border-r-2 border-r-[#002266]">Center (9.15am to 10.30am)</th>
              <th className="px-4 py-2 text-center border border-gray-400 dark:border-gray-600 font-bold text-sm">Club (1.10pm to 2.25pm)</th>
              <th className="px-4 py-2 text-center border border-gray-400 dark:border-gray-600 font-bold text-sm">Center (2.25pm to 3.40pm)</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => {
              const dayBg = getDayColor(day);
              return (
                <tr key={day} className={`transition-colors hover:brightness-95 dark:hover:brightness-110 ${dayBg}`}>
                  <td className="px-4 py-4 border border-slate-300 font-black text-center text-slate-900 bg-slate-50 shadow-inner">
                    {day.charAt(0) + day.slice(1).toLowerCase()}
                  </td>
                  
                  <td className="px-3 py-4 border border-slate-300 text-center text-sm text-slate-800 cursor-pointer hover:bg-blue-50"
                    onClick={() => setSelectedCell({ venue: venueName, day, session: 'FORENOON', type: 'CLUB' })}>
                    {getCellData(venueName, day, 'FORENOON', 'CLUB')}
                  </td>
                  <td className="px-3 py-4 border border-slate-300 text-center text-sm text-slate-800 cursor-pointer hover:bg-blue-50 border-r-2 border-r-slate-400"
                    onClick={() => setSelectedCell({ venue: venueName, day, session: 'FORENOON', type: 'CENTRE' })}>
                    {getCellData(venueName, day, 'FORENOON', 'CENTRE')}
                  </td>
                  <td className="px-3 py-4 border border-slate-300 text-center text-sm text-slate-800 cursor-pointer hover:bg-blue-50"
                    onClick={() => setSelectedCell({ venue: venueName, day, session: 'AFTERNOON', type: 'CLUB' })}>
                    {getCellData(venueName, day, 'AFTERNOON', 'CLUB')}
                  </td>
                  <td className="px-3 py-4 border border-slate-300 text-center text-sm text-slate-800 cursor-pointer hover:bg-blue-50"
                    onClick={() => setSelectedCell({ venue: venueName, day, session: 'AFTERNOON', type: 'CENTRE' })}>
                    {getCellData(venueName, day, 'AFTERNOON', 'CENTRE')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderOverallTable = () => (
    <div className="bg-white rounded-3xl shadow-sm border-2 border-slate-200 overflow-hidden mb-6">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th colSpan={6} className="bg-[#002266] text-white text-center px-4 py-3 text-lg font-bold border border-gray-600">
                II YEAR STUDENTS - CLUB & CENTRE ALLOCATION TIMETABLE
              </th>
            </tr>
            <tr className="bg-[#003399] text-white">
              <th rowSpan={2} className="px-4 py-3 text-center border border-gray-400 dark:border-gray-600 font-bold w-[10%]">Day</th>
              <th rowSpan={2} className="px-4 py-3 text-center border border-gray-400 dark:border-gray-600 font-bold w-[10%]">Venue</th>
              <th colSpan={2} className="px-4 py-2 text-center border border-gray-400 dark:border-gray-600 font-bold w-[40%] border-r-2 border-r-[#002266]">Morning (8.00am to 10.30am)</th>
              <th colSpan={2} className="px-4 py-2 text-center border border-gray-400 dark:border-gray-600 font-bold w-[40%]">Evening (1.10pm to 3.40 pm)</th>
            </tr>
            <tr className="bg-[#0044cc] text-white">
              <th className="px-2 py-2 text-center border border-gray-400 dark:border-gray-600 font-semibold text-sm w-[20%]">Club<br/><span className="text-xs font-normal opacity-80">(8.00am to 9.15am)</span></th>
              <th className="px-2 py-2 text-center border border-gray-400 dark:border-gray-600 font-semibold text-sm w-[20%] border-r-2 border-r-[#002266]">Center<br/><span className="text-xs font-normal opacity-80">(9.15am to 10.30am)</span></th>
              <th className="px-2 py-2 text-center border border-gray-400 dark:border-gray-600 font-semibold text-sm w-[20%]">Club<br/><span className="text-xs font-normal opacity-80">(1.10pm to 2.25pm)</span></th>
              <th className="px-2 py-2 text-center border border-gray-400 dark:border-gray-600 font-semibold text-sm w-[20%]">Center<br/><span className="text-xs font-normal opacity-80">(2.25pm to 3.40pm)</span></th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => {
              const dayBg = getDayColor(day);
              return venues.map((venue, index) => (
                <tr key={`${day}-${venue}`} className={`transition-colors hover:brightness-95 dark:hover:brightness-110 ${dayBg}`}>
                  {index === 0 && (
                    <td rowSpan={venues.length} className={`px-4 py-4 border border-gray-300 dark:border-gray-600 font-black text-center text-gray-900 dark:text-white align-middle shadow-inner bg-white/40 dark:bg-black/20`}>
                      {day.charAt(0) + day.slice(1).toLowerCase()}
                    </td>
                  )}
                  <td className="px-3 py-2 border border-slate-300 text-center text-sm font-bold text-slate-800 bg-slate-50">
                    {venue}
                  </td>
                  <td className="px-3 py-2 border border-slate-300 text-sm text-slate-800 cursor-pointer hover:bg-blue-50"
                    onClick={() => setSelectedCell({ venue, day, session: 'FORENOON', type: 'CLUB' })}>
                    {getCellData(venue, day, 'FORENOON', 'CLUB')}
                  </td>
                  <td className="px-3 py-2 border border-slate-300 text-sm text-slate-800 cursor-pointer hover:bg-blue-50 border-r-2 border-r-slate-400"
                    onClick={() => setSelectedCell({ venue, day, session: 'FORENOON', type: 'CENTRE' })}>
                    {getCellData(venue, day, 'FORENOON', 'CENTRE')}
                  </td>
                  <td className="px-3 py-2 border border-slate-300 text-sm text-slate-800 cursor-pointer hover:bg-blue-50"
                    onClick={() => setSelectedCell({ venue, day, session: 'AFTERNOON', type: 'CLUB' })}>
                    {getCellData(venue, day, 'AFTERNOON', 'CLUB')}
                  </td>
                  <td className="px-3 py-2 border border-slate-300 text-sm text-slate-800 cursor-pointer hover:bg-blue-50"
                    onClick={() => setSelectedCell({ venue, day, session: 'AFTERNOON', type: 'CENTRE' })}>
                    {getCellData(venue, day, 'AFTERNOON', 'CENTRE')}
                  </td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
            <div className="bg-blue-100 p-2.5 rounded-xl mr-3">
              <Calendar className="text-blue-600 w-6 h-6" />
            </div>
            Activity Slots
          </h1>
          <p className="text-slate-500 font-medium mt-2">
            Activity slots allocation overview. Click any slot to view booked students and set capacity.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
              <MapPin className="w-4 h-4" />
            </div>
            <select
              value={activeVenue}
              onChange={(e) => setActiveVenue(e.target.value)}
              className="pl-10 pr-8 py-2.5 bg-white border-2 border-slate-200 text-slate-800 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 font-bold"
            >
              <option value="ALL">All Venues (Overall)</option>
              {venues.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Add Slot
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500">Loading timetable...</div>
      ) : (
        <div>
          {activeVenue === 'ALL' 
            ? renderOverallTable()
            : renderVenueTable(activeVenue)}
        </div>
      )}
      
      {/* Detail Modal */}
      {selectedCell && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full p-6 border-2 border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4 mb-6">
              <h3 className="text-2xl font-black text-slate-900">
                {selectedCell.day.charAt(0) + selectedCell.day.slice(1).toLowerCase()}{' '}
                {selectedCell.session === 'FORENOON' ? 'Morning' : 'Evening'}{' '}
                {selectedCell.type === 'CLUB' ? 'Club' : 'Centre'} Allocations
              </h3>
              <button
                onClick={() => setSelectedCell(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-bold"
              >
                Close
              </button>
            </div>

            {activeCellSlots.length === 0 ? (
              <p className="text-slate-400 font-medium py-8 text-center">No slots scheduled for this period.</p>
            ) : (
              <div className="space-y-6">
                {activeCellSlots.map((slot) => (
                  <div key={slot.id} className="border-2 border-slate-200 rounded-2xl p-5 bg-slate-50/50">
                    {/* Slot Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4">
                      <div className="flex-1">
                        {editingSlotId === slot.id ? (
                          <div className="flex items-center gap-3">
                            <select
                              value={selectedEntityId}
                              onChange={(e) => setSelectedEntityId(e.target.value)}
                              className="px-3 py-2 border-2 border-blue-300 rounded-xl bg-white text-slate-900 flex-1 max-w-sm font-medium focus:outline-none focus:border-blue-500"
                            >
                              <option value="">Select a {selectedCell?.type === 'CLUB' ? 'Club' : 'Centre'}...</option>
                              {(selectedCell?.type === 'CLUB' ? allClubs : allCentres).map(entity => (
                                <option key={entity.id} value={entity.id}>{entity.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleUpdateEntity(slot.id, selectedCell?.type as 'CLUB' | 'CENTRE')}
                              disabled={updatingEntity}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-colors"
                            >
                              {updatingEntity ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingSlotId(null)}
                              disabled={updatingEntity}
                              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-sm font-bold transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <h4 className="text-xl font-black text-blue-600">
                              {slot.club ? slot.club.name : slot.centre?.name}
                            </h4>
                            <button
                              onClick={() => {
                                setEditingSlotId(slot.id);
                                setSelectedEntityId(slot.club ? slot.club.id : (slot.centre ? slot.centre.id : ''));
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit assigned Club/Centre"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                          </div>
                        )}
                        <p className="text-sm font-semibold text-slate-500 mt-2 flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          Booked: <span className="font-extrabold text-slate-700">{slot.allocated_count}</span> / {slot.capacity}
                        </p>

                        {/* Faculty Coordinator Info */}
                        {(() => {
                          const entity = slot.club || slot.centre;
                          return entity?.faculty_name ? (
                            <div className="mt-3 flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
                              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Faculty Coordinator</p>
                                <p className="text-sm font-extrabold text-slate-800 truncate">{entity.faculty_name}</p>
                              </div>
                              <a href={`tel:${entity.faculty_mobile}`} className="text-sm font-bold text-blue-600 hover:underline shrink-0">
                                {entity.faculty_mobile}
                              </a>
                            </div>
                          ) : (
                            <p className="mt-2 text-xs font-medium text-slate-400 italic">No faculty coordinator assigned.</p>
                          );
                        })()}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border-2 border-slate-200 shadow-sm">
                          <label className="text-sm font-bold text-slate-600">Capacity:</label>
                          <input
                            type="number"
                            min="1"
                            value={capacityValues[slot.id] || 0}
                            onChange={(e) => setCapacityValues({...capacityValues, [slot.id]: parseInt(e.target.value)})}
                            className="w-20 px-2 py-1 border-2 border-slate-200 rounded-lg bg-white text-slate-900 font-bold focus:outline-none focus:border-blue-400"
                          />
                          <button
                            onClick={() => handleUpdateCapacity(slot.id)}
                            disabled={updatingCapacity === slot.id}
                            className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors disabled:opacity-50"
                            title="Save Capacity"
                          >
                            {updatingCapacity === slot.id ? <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                          </button>
                        </div>

                        <button
                          onClick={() => generatePDF(slot)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors font-bold shadow-sm"
                        >
                          <Download className="w-4 h-4" />
                          Export PDF
                        </button>
                      </div>
                    </div>

                    {/* Students Table */}
                    <div className="overflow-x-auto rounded-2xl border-2 border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Register No</th>
                            <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Course</th>
                            <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Sem</th>
                            <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Year</th>
                            <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Sec</th>
                            <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Contact</th>
                            <th className="px-4 py-3 text-right text-xs font-black text-slate-500 uppercase tracking-wider">Action</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                          {slot.allocations.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400 font-medium">No students booked yet.</td>
                            </tr>
                          ) : (
                            slot.allocations.map((alloc) => (
                              <tr key={alloc.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 text-sm font-extrabold text-slate-900">{alloc.student.name}</td>
                                <td className="px-4 py-3 text-sm font-medium text-slate-600">{alloc.student.register_no}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{alloc.student.course}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{alloc.student.semester}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{alloc.student.academic_year}</td>
                                <td className="px-4 py-3 text-sm font-bold text-slate-700">{alloc.student.section}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{alloc.student.contact_no}</td>
                                <td className="px-4 py-3 text-right text-sm">
                                  <button
                                    onClick={() => handleRemoveStudent(alloc.id, alloc.student_id, slot.id)}
                                    className="text-red-600 hover:text-red-800 px-3 py-1 rounded-xl bg-red-50 hover:bg-red-100 font-bold transition-colors text-xs"
                                    title="Remove Student"
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
