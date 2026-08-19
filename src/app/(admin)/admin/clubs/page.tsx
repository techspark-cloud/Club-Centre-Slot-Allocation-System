'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Building2, Phone, User, Pencil, Check, X, Plus, Users, Download, Loader2, Copy } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function ClubsPage() {
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ faculty_name: '', faculty_mobile: '' });
  const [saving, setSaving] = useState(false);
  
  // Members Modal State
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    setLoading(true);
    const { data } = await supabase.from('clubs').select('*').order('name');
    setClubs(data || []);
    setLoading(false);
  };

  const startEdit = (club: any) => {
    setEditingId(club.id);
    setEditForm({ faculty_name: club.faculty_name || '', faculty_mobile: club.faculty_mobile || '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ faculty_name: '', faculty_mobile: '' });
  };

  const saveEdit = async (clubId: string) => {
    setSaving(true);
    const { error } = await supabase
      .from('clubs')
      .update({ faculty_name: editForm.faculty_name || null, faculty_mobile: editForm.faculty_mobile || null })
      .eq('id', clubId);

    if (!error) {
      setClubs(prev => prev.map(c => c.id === clubId ? { ...c, ...editForm } : c));
      setEditingId(null);
    }
    setSaving(false);
  };

  const viewMembers = async (club: any) => {
    setSelectedClub(club);
    setMembersModalOpen(true);
    setLoadingMembers(true);
    
    const { data } = await supabase
      .from('allocations')
      .select(`
        id,
        student:students (
          id, name, register_no, course, section, academic_year, hosteler
        ),
        slot:slots!inner (
          id, day, club_id
        )
      `)
      .eq('slot.club_id', club.id);
      
    if (data) {
      const sorted = data
        .filter(a => a.student) // safety check
        .sort((a, b) => (a.student?.register_no || '').localeCompare(b.student?.register_no || ''));
      setMembers(sorted);
    } else {
      setMembers([]);
    }
    setLoadingMembers(false);
  };

  const downloadPDF = async () => {
    if (!members.length) return;
    
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
    doc.text("OFFICIAL ENROLLMENT REPORT", pageWidth / 2, 45, { align: "center" });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 52, pageWidth - 14, 52);
    
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    
    doc.setFont("helvetica", "bold");
    doc.text("Entity Name :", 14, 62);
    doc.setFont("helvetica", "normal");
    doc.text(selectedClub?.name || '', 37, 62);

    doc.setFont("helvetica", "bold");
    doc.text("Date :", 14, 69);
    doc.setFont("helvetica", "normal");
    doc.text(new Date().toISOString().split('T')[0], 25, 69);

    doc.setFont("helvetica", "bold");
    doc.text("Total Enrolled :", 130, 69);
    doc.setFont("helvetica", "normal");
    doc.text(members.length.toString(), 155, 69);

    const tableColumn = ["S.No", "Register No", "Student Name", "Course & Sec", "Year", "Day"];
    const tableRows = members.map((m, i) => [
      i + 1,
      m.student?.register_no || '',
      m.student?.name || '',
      `${m.student?.course || ''} - ${m.student?.section || ''}`,
      m.student?.academic_year || '',
      m.slot?.day || ''
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 76,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    doc.save(`${selectedClub?.name.replace(/\s+/g, '_')}_Enrollment_Report.pdf`);
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400 font-medium">Loading clubs...</div>;
  }

  return (
    <div className="p-6 sm:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
            <div className="bg-blue-100 p-2.5 rounded-xl mr-3">
              <Building2 className="text-blue-600 w-6 h-6" />
            </div>
            Clubs Directory
          </h1>
          <p className="text-slate-500 font-medium mt-2">
            Manage all available clubs and their faculty coordinators.
          </p>
        </div>
        <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border-2 border-slate-200 font-bold text-slate-700">
          Total Clubs: <span className="text-blue-600 ml-1 text-lg font-black">{clubs.length}</span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {clubs.map((club) => (
          <div
            key={club.id}
            className="bg-white rounded-3xl border-2 border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all overflow-hidden flex flex-col"
          >
            {/* Card Top */}
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{club.name}</h3>
                  <p className="text-slate-500 text-sm font-medium mt-1 line-clamp-2">
                    {club.description || 'No description provided.'}
                  </p>
                </div>
                <span className={`shrink-0 ml-2 px-2.5 py-1 text-xs font-extrabold rounded-xl ${
                  club.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {club.status}
                </span>
              </div>

              {/* Faculty Section */}
              <div className="mt-4 pt-4 border-t-2 border-slate-100">
                {editingId === club.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Faculty Name</label>
                      <input
                        value={editForm.faculty_name}
                        onChange={e => setEditForm(f => ({ ...f, faculty_name: e.target.value }))}
                        placeholder="e.g. Ms. Jane Doe (AP/CSE)"
                        className="w-full px-3 py-2 border-2 border-blue-300 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Mobile Number</label>
                      <input
                        value={editForm.faculty_mobile}
                        onChange={e => setEditForm(f => ({ ...f, faculty_mobile: e.target.value }))}
                        placeholder="e.g. 9876543210"
                        className="w-full px-3 py-2 border-2 border-blue-300 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 text-slate-800"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => saveEdit(club.id)}
                        disabled={saving}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-colors disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" /> Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold text-xs transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : club.faculty_name ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Faculty Coordinator</p>
                      <p className="text-sm font-extrabold text-slate-800 truncate">{club.faculty_name}</p>
                      <a
                        href={`tel:${club.faculty_mobile}`}
                        className="flex items-center gap-1.5 text-blue-600 font-bold text-sm mt-1.5 hover:underline"
                      >
                        <Phone className="w-3.5 h-3.5" /> {club.faculty_mobile}
                      </a>
                      
                      {/* Login Credentials Box */}
                      <div className="mt-4 bg-slate-50 p-3 rounded-xl border-2 border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                          <span>Login Credentials</span>
                          <button 
                            onClick={() => {
                              const creds = `Login ID: ${club.faculty_mobile}@rit.faculty\nPassword: ${club.faculty_mobile}`;
                              navigator.clipboard.writeText(creds);
                              alert("Credentials Copied to Clipboard!");
                            }}
                            className="text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-100 px-2 py-1 rounded-md transition-colors"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        </p>
                        <div className="space-y-1 text-xs font-mono font-bold text-slate-700">
                          <p><span className="text-slate-400 mr-2">ID:</span> {club.faculty_mobile}@rit.faculty</p>
                          <p><span className="text-slate-400 mr-2">PW:</span> {club.faculty_mobile}</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => startEdit(club)}
                      className="shrink-0 p-2 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-500 transition-colors"
                      title="Edit coordinator"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEdit(club)}
                    className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-slate-400 hover:text-blue-600 rounded-xl py-3 text-sm font-bold transition-all"
                  >
                    <Plus className="w-4 h-4" /> Assign Faculty Coordinator
                  </button>
                )}
                
                {/* View Members Button */}
                <div className="mt-4 pt-4 border-t-2 border-slate-100 flex">
                  <button 
                    onClick={() => viewMembers(club)}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold text-sm transition-colors active:scale-95"
                  >
                    <Users className="w-4 h-4" />
                    View Enrolled Members 
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {clubs.length === 0 && (
          <div className="col-span-full bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
            <Building2 className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700">No Clubs Found</h3>
            <p className="mt-1 text-slate-400">Import clubs using the Import Master Data section.</p>
          </div>
        )}
      </div>

      {/* Members Modal */}
      {membersModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{selectedClub?.name}</h2>
                  <p className="text-slate-500 font-medium text-sm mt-0.5">Enrolled Student Roster</p>
                </div>
              </div>
              <button 
                onClick={() => setMembersModalOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6 sm:p-8 bg-slate-50/30">
              {loadingMembers ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-600" />
                  <p className="font-bold">Fetching members list...</p>
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-bold">No students have enrolled in this club yet.</p>
                </div>
              ) : (
                <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                      <thead>
                        <tr className="bg-slate-50 border-b-2 border-slate-200">
                          <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Register No</th>
                          <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Student Name</th>
                          <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Course & Sec</th>
                          <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Hosteller</th>
                          <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Slot Day</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {members.map((m, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                            <td className="px-5 py-4 font-mono font-bold text-slate-700 text-sm">{m.student?.register_no}</td>
                            <td className="px-5 py-4 font-extrabold text-slate-900 text-sm">{m.student?.name}</td>
                            <td className="px-5 py-4 font-bold text-slate-600 text-sm">{m.student?.course} - {m.student?.section}</td>
                            <td className="px-5 py-4">
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${m.student?.hosteler ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                                {m.student?.hosteler ? 'Yes' : 'No'}
                              </span>
                            </td>
                            <td className="px-5 py-4 font-bold text-blue-600 text-sm text-right">{m.slot?.day}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-between">
              <p className="text-sm font-bold text-slate-500">
                Total Members: <span className="text-slate-900 font-black">{members.length}</span>
              </p>
              <div className="flex gap-3">
                {members.length > 0 && (
                  <button 
                    onClick={downloadCSV}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 border-2 border-green-200 rounded-xl font-bold text-sm transition-colors"
                  >
                    <Download className="w-4 h-4" /> Download CSV
                  </button>
                )}
                <button 
                  onClick={() => setMembersModalOpen(false)}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
