'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Calendar as CalendarIcon, Trash2, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { addHoliday, deleteHoliday } from '@/app/actions/holidays';

interface Holiday {
  id: string;
  date: string;
  description: string;
  created_at: string;
}

export default function AdminHolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newDescription, setNewDescription] = useState('');
  
  const supabase = createClient();

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .order('date', { ascending: false });
      
    if (error) {
      alert('Failed to load holidays. Have you created the table?');
      console.error(error);
    } else {
      setHolidays(data || []);
    }
    setIsLoading(false);
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newDescription) {
      alert('Please provide both a date and description');
      return;
    }

    setIsSubmitting(true);
    const result = await addHoliday(newDate, newDescription);

    if (!result.success) {
      alert(result.error);
    } else {
      alert('Holiday declared successfully!');
      setNewDate('');
      setNewDescription('');
      if (result.data) {
        setHolidays([result.data, ...holidays].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      }
    }
    setIsSubmitting(false);
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Are you sure you want to remove this holiday?')) return;

    const result = await deleteHoliday(id);

    if (!result.success) {
      alert(result.error);
    } else {
      setHolidays(holidays.filter(h => h.id !== id));
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Holiday Management</h1>
        <p className="text-slate-500 mt-2">
          Declare government or institutional holidays. Students with slots on these dates will automatically be excused from attendance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Declare Holiday Form */}
        <div className="md:col-span-1">
          <form onSubmit={handleAddHoliday} className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Plus className="w-5 h-5 text-indigo-500" />
              Declare New Holiday
            </h2>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 focus:border-indigo-500 focus:ring-0 outline-none transition-colors font-medium text-slate-700"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Reason / Occasion</label>
              <input
                type="text"
                required
                placeholder="e.g. Deepavali, Rain Holiday"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 focus:border-indigo-500 focus:ring-0 outline-none transition-colors font-medium text-slate-700"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm shadow-indigo-200 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Declare Holiday'}
            </button>
          </form>
        </div>

        {/* Holidays List */}
        <div className="md:col-span-2">
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm min-h-[400px]">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
              <CalendarIcon className="w-5 h-5 text-indigo-500" />
              Declared Holidays
            </h2>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-400" />
                <p className="font-medium">Loading holidays...</p>
              </div>
            ) : holidays.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <CalendarIcon className="w-12 h-12 mb-4 text-slate-300" />
                <p className="font-medium">No holidays declared yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {holidays.map((holiday) => (
                  <div key={holiday.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-indigo-50 transition-colors">
                    <div>
                      <h3 className="font-bold text-slate-800">{holiday.description}</h3>
                      <p className="text-sm font-medium text-slate-500 mt-0.5">
                        {new Date(holiday.date).toLocaleDateString('en-GB', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteHoliday(holiday.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove Holiday"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
