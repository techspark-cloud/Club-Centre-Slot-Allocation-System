'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Building2, User, Phone, MapPin, Loader2 } from 'lucide-react';

export default function OverallClubsList() {
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    try {
      setLoading(true);
      
      const { data: clubsData, error: clubsError } = await supabase.from('clubs').select('*').order('name');
      if (clubsError) console.error('Error fetching clubs:', clubsError);

      const { data: slotsData, error: slotsError } = await supabase
        .from('slots')
        .select('club_id, venue')
        .not('club_id', 'is', null)
        .eq('status', 'ACTIVE');
      if (slotsError) console.error('Error fetching slots:', slotsError);
        
      if (clubsData) {
        const enrichedClubs = clubsData.map(club => {
          // Find venues for this club
          const clubSlots = slotsData?.filter(s => s.club_id === club.id) || [];
          const venues = Array.from(new Set(clubSlots.map(s => s.venue).filter(Boolean)));
          
          return {
            ...club,
            venues: venues.length > 0 ? venues.join(', ') : 'Not Assigned'
          };
        });
        setClubs(enrichedClubs);
      }
    } catch (error) {
      console.error('Unexpected error in fetchClubs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Clubs</h1>
          <p className="text-slate-500 mt-1">Directory of all clubs, their venues, and coordinators.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {clubs.map((club) => (
          <Link href={`/overall-clubs/clubs/${club.id}`} key={club.id} className="block group">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group-hover:border-blue-300">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{club.name}</h3>
                  <span className={`inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    club.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {club.status}
                  </span>
                </div>
              </div>
              
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">Venue</p>
                    <p className="text-slate-900 font-medium">{club.venues}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">Coordinator</p>
                    <p className="text-slate-900 font-medium">{club.faculty_name || 'Not Assigned'}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">Contact</p>
                    {club.faculty_mobile ? (
                      <span className="text-blue-600 font-medium">
                        {club.faculty_mobile}
                      </span>
                    ) : (
                      <p className="text-slate-900 font-medium">Not Available</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
        
        {clubs.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-900">No clubs found</h3>
            <p className="text-slate-500 mt-1">There are currently no clubs in the system.</p>
          </div>
        )}
      </div>
    </div>
  );
}
