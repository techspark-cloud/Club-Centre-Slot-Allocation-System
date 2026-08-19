'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Layers, Phone, Pencil, Check, X, Plus } from 'lucide-react';

export default function CentresPage() {
  const [centres, setCentres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ faculty_name: '', faculty_mobile: '' });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchCentres();
  }, []);

  const fetchCentres = async () => {
    setLoading(true);
    const { data } = await supabase.from('centres').select('*').order('name');
    setCentres(data || []);
    setLoading(false);
  };

  const startEdit = (centre: any) => {
    setEditingId(centre.id);
    setEditForm({ faculty_name: centre.faculty_name || '', faculty_mobile: centre.faculty_mobile || '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ faculty_name: '', faculty_mobile: '' });
  };

  const saveEdit = async (centreId: string) => {
    setSaving(true);
    const { error } = await supabase
      .from('centres')
      .update({ faculty_name: editForm.faculty_name || null, faculty_mobile: editForm.faculty_mobile || null })
      .eq('id', centreId);

    if (!error) {
      setCentres(prev => prev.map(c => c.id === centreId ? { ...c, ...editForm } : c));
      setEditingId(null);
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400 font-medium">Loading centres...</div>;
  }

  return (
    <div className="p-6 sm:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
            <div className="bg-indigo-100 p-2.5 rounded-xl mr-3">
              <Layers className="text-indigo-600 w-6 h-6" />
            </div>
            Centres Directory
          </h1>
          <p className="text-slate-500 font-medium mt-2">
            Manage all available centres of excellence and their faculty coordinators.
          </p>
        </div>
        <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border-2 border-slate-200 font-bold text-slate-700">
          Total Centres: <span className="text-indigo-600 ml-1 text-lg font-black">{centres.length}</span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {centres.map((centre) => (
          <div
            key={centre.id}
            className="bg-white rounded-3xl border-2 border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all overflow-hidden flex flex-col"
          >
            {/* Card Top */}
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{centre.name}</h3>
                  <p className="text-slate-500 text-sm font-medium mt-1 line-clamp-2">
                    {centre.description || 'No description provided.'}
                  </p>
                </div>
                <span className={`shrink-0 ml-2 px-2.5 py-1 text-xs font-extrabold rounded-xl ${
                  centre.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {centre.status}
                </span>
              </div>

              {/* Faculty Section */}
              <div className="mt-4 pt-4 border-t-2 border-slate-100">
                {editingId === centre.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Faculty Name</label>
                      <input
                        value={editForm.faculty_name}
                        onChange={e => setEditForm(f => ({ ...f, faculty_name: e.target.value }))}
                        placeholder="e.g. Dr. John Doe (AP/ECE)"
                        className="w-full px-3 py-2 border-2 border-indigo-300 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Mobile Number</label>
                      <input
                        value={editForm.faculty_mobile}
                        onChange={e => setEditForm(f => ({ ...f, faculty_mobile: e.target.value }))}
                        placeholder="e.g. 9876543210"
                        className="w-full px-3 py-2 border-2 border-indigo-300 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 text-slate-800"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => saveEdit(centre.id)}
                        disabled={saving}
                        className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-colors disabled:opacity-50"
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
                ) : centre.faculty_name ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Faculty Coordinator</p>
                      <p className="text-sm font-extrabold text-slate-800 truncate">{centre.faculty_name}</p>
                      <a
                        href={`tel:${centre.faculty_mobile}`}
                        className="flex items-center gap-1.5 text-indigo-600 font-bold text-sm mt-1.5 hover:underline"
                      >
                        <Phone className="w-3.5 h-3.5" /> {centre.faculty_mobile}
                      </a>
                    </div>
                    <button
                      onClick={() => startEdit(centre)}
                      className="shrink-0 p-2 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 transition-colors"
                      title="Edit coordinator"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEdit(centre)}
                    className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-400 hover:text-indigo-600 rounded-xl py-3 text-sm font-bold transition-all"
                  >
                    <Plus className="w-4 h-4" /> Assign Faculty Coordinator
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {centres.length === 0 && (
          <div className="col-span-full bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
            <Layers className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700">No Centres Found</h3>
            <p className="mt-1 text-slate-400">Import centres using the Import Master Data section.</p>
          </div>
        )}
      </div>
    </div>
  );
}
