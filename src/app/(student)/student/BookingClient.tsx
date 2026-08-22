'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, MapPin, CheckCircle, AlertCircle, Loader2, Download, Check, CalendarClock, QrCode } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import html2canvas from 'html2canvas';
import QRCode from 'react-qr-code';
import CampusMapModal from '@/components/3d/CampusMapModal';

export default function BookingClient({ 
  student,
  studentId, 
  clubSlots, 
  centreSlots, 
  existingClubBookings, 
  existingCentreBookings,
  customRules = []
}: { 
  student: any,
  studentId: string, 
  clubSlots: any[], 
  centreSlots: any[],
  existingClubBookings: any[],
  existingCentreBookings: any[],
  customRules?: any[]
}) {
  const [selectedClubIds, setSelectedClubIds] = useState<Record<string, string>>({});
  const [selectedCentreIds, setSelectedCentreIds] = useState<Record<string, string>>({});
  
  const [showPreview, setShowPreview] = useState(false);
  const [isQueueing, setIsQueueing] = useState(false);
  const [queueProgress, setQueueProgress] = useState(0);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  // 3D Navigator State
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [targetVenueName, setTargetVenueName] = useState('');
  const [targetNodeId, setTargetNodeId] = useState('');
  
  const router = useRouter();
  const supabase = createClient();
  const timetableRef = useRef<HTMLDivElement>(null);

  const [liveClubSlots, setLiveClubSlots] = useState(clubSlots);
  const [liveCentreSlots, setLiveCentreSlots] = useState(centreSlots);

  useEffect(() => {
    const channel = supabase.channel('realtime_slots_booking')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'slots' }, (payload) => {
        const updatedSlot = payload.new;
        
        if (updatedSlot.type === 'CLUB') {
          setLiveClubSlots(prev => prev.map(slot => slot.id === updatedSlot.id ? { ...slot, allocated_count: updatedSlot.allocated_count } : slot));
        } else if (updatedSlot.type === 'CENTRE') {
          setLiveCentreSlots(prev => prev.map(slot => slot.id === updatedSlot.id ? { ...slot, allocated_count: updatedSlot.allocated_count } : slot));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const dayOrder: Record<string, number> = {
    'MONDAY': 1,
    'TUESDAY': 2,
    'WEDNESDAY': 3,
    'THURSDAY': 4,
    'FRIDAY': 5,
    'SATURDAY': 6,
    'SUNDAY': 7
  };

  const sortedClubSlots = [...liveClubSlots].sort((a, b) => (dayOrder[a.day] || 99) - (dayOrder[b.day] || 99));
  const sortedCentreSlots = [...liveCentreSlots].sort((a, b) => (dayOrder[a.day] || 99) - (dayOrder[b.day] || 99));

  const standardDays = student.allowed_day === 'ANY' ? ['ANY'] : (student.allowed_day && student.allowed_day !== 'EXEMPT' && student.allowed_day !== 'INDEPENDENT' ? student.allowed_day.split(',').map((d: string) => d.trim()).filter(Boolean) : []);
  const customDays = (customRules || []).map((r: any) => r.day.trim());
  const requiredDays = Array.from(new Set([...standardDays, ...customDays]));
  
  const isFullyBooked = requiredDays.length > 0 && requiredDays.every(day => {
    if (day === 'ANY') {
      return existingClubBookings.length > 0 && existingCentreBookings.length > 0;
    }
    return existingClubBookings.some(b => b.slot.day === day) && existingCentreBookings.some(b => b.slot.day === day);
  });

  const hasNewSelections = Object.keys(selectedClubIds).length > 0 || Object.keys(selectedCentreIds).length > 0;

  const isReadyToProceed = (requiredDays.length > 0 && requiredDays.every(day => {
    if (day === 'ANY') {
      const hasClub = Object.keys(selectedClubIds).length > 0 || existingClubBookings.length > 0;
      const hasCentre = Object.keys(selectedCentreIds).length > 0 || existingCentreBookings.length > 0;
      return hasClub && hasCentre;
    }
    const hasClub = selectedClubIds[day] || existingClubBookings.some(b => b.slot.day === day);
    const hasCentre = selectedCentreIds[day] || existingCentreBookings.some(b => b.slot.day === day);
    return hasClub && hasCentre;
  })) || (requiredDays.length === 0 && hasNewSelections);

  const allBookingDays = Array.from(new Set([
    ...requiredDays,
    ...Object.keys(selectedClubIds),
    ...Object.keys(selectedCentreIds),
    ...existingClubBookings.map(b => b.slot.day),
    ...existingCentreBookings.map(b => b.slot.day)
  ]));

  const handleSelectSlot = (slot: any, type: 'CLUB' | 'CENTRE') => {
    const isAny = student.allowed_day === 'ANY';
    const dayKey = isAny ? 'ANY' : slot.day;
    
    if (type === 'CLUB') {
      setSelectedClubIds(prev => {
        const newObj = { ...prev };
        if (newObj[dayKey] === slot.id) delete newObj[dayKey];
        else newObj[dayKey] = slot.id;
        return newObj;
      });
    } else {
      setSelectedCentreIds(prev => {
        const newObj = { ...prev };
        if (newObj[dayKey] === slot.id) delete newObj[dayKey];
        else newObj[dayKey] = slot.id;
        return newObj;
      });
    }
  };

  const handleConfirmBooking = async () => {
    if (!isReadyToProceed) return;
    
    setIsQueueing(true);
    setError(null);
    setLoading(true);
    
    // Start progress animation
    const queueInterval = setInterval(() => {
      setQueueProgress(prev => (prev >= 95 ? 95 : prev + 2));
    }, 100);

    try {
      // 1. Minimum visual queue time (4 seconds)
      const timerPromise = new Promise(resolve => setTimeout(resolve, 4000));
      
      // 2. TRUE FCFS DB REQUEST: Fire immediately to secure lock position in Postgres!
      const dbPromise = (async () => {
        for (const slotId of Object.values(selectedClubIds)) {
          const res = await supabase.rpc('book_slot', { p_student_id: studentId, p_slot_id: slotId });
          if (res.error) throw res.error;
          if (!res.data?.success) throw new Error(res.data?.message || 'Club booking failed');
        }
        for (const slotId of Object.values(selectedCentreIds)) {
          const res = await supabase.rpc('book_slot', { p_student_id: studentId, p_slot_id: slotId });
          if (res.error) throw res.error;
          if (!res.data?.success) throw new Error(res.data?.message || 'Centre booking failed');
        }
      })();

      // Wait for both to finish (DB might take 500ms or 8s depending on traffic)
      await Promise.all([dbPromise, timerPromise]);

      // Success
      setQueueProgress(100);
      clearInterval(queueInterval);
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause at 100%
      router.refresh();
      setShowPreview(false);
    } catch (err: any) {
      clearInterval(queueInterval);
      const msg = err.message || 'Someone grabbed the seat before you! Please select another slot.';
      setError(msg);
      alert("Error: " + msg);
      setShowPreview(false);
    } finally {
      clearInterval(queueInterval);
      setIsQueueing(false);
      setLoading(false);
      setQueueProgress(0);
    }
  };

  const downloadTimetable = async () => {
    if (timetableRef.current) {
      try {
        const canvas = await html2canvas(timetableRef.current, { scale: 2 });
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'RIT_Club_Centre_Timetable.png';
        link.href = url;
        link.click();
      } catch (err) {
        console.error("Failed to download timetable", err);
      }
    }
  };

  const mapVenueToNodeId = (venue: string): string => {
    if (!venue) return '';
    const v = venue.toUpperCase();
    
    // Match standard classrooms like "B0-07" -> "B0_07"
    const classMatch = v.match(/B\d-\d{2}/);
    if (classMatch) return classMatch[0].replace('-', '_');
    
    // Special rooms
    if (v.includes('MECH')) return 'B0_MECH';
    if (v.includes('SEMINAR')) return 'B2_SEMINAR';
    if (v.includes('EMPTY')) return 'B1_EMPTY';
    
    return '';
  };

  const handleNavigateClick = (venue: string) => {
    const nodeId = mapVenueToNodeId(venue);
    if (nodeId) {
      setTargetVenueName(venue);
      setTargetNodeId(nodeId);
      setIsMapModalOpen(true);
    } else {
      alert("Sorry, 3D navigation is not mapped for this venue yet.");
    }
  };

  const renderSlotCard = (slot: any, type: 'CLUB' | 'CENTRE', isBooked: boolean) => {
    const isFull = slot.allocated_count >= slot.capacity;
    const name = type === 'CLUB' ? slot.club.name : slot.centre.name;
    const description = type === 'CLUB' ? slot.club.description : slot.centre.description;
    const availableSeats = slot.capacity - slot.allocated_count;
    
    const isAny = student.allowed_day === 'ANY';
    const dayKey = isAny ? 'ANY' : slot.day;
    const isSelected = type === 'CLUB' ? selectedClubIds[dayKey] === slot.id : selectedCentreIds[dayKey] === slot.id;
    
    return (
      <div 
        key={slot.id} 
        onClick={() => !isBooked && !isFull && handleSelectSlot(slot, type)}
        className={`border rounded-xl sm:rounded-2xl p-3 sm:px-6 sm:py-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden cursor-pointer touch-manipulation active:scale-[0.98] ${
          isBooked ? 'bg-green-50/50 border-green-200 cursor-default active:scale-100' :
          isFull ? 'bg-slate-50 border-slate-200 opacity-75 cursor-not-allowed active:scale-100' :
          isSelected ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 shadow-blue-100' :
          'bg-white border-slate-200 hover:border-blue-300'
        }`}
      >
        {isBooked && <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>}
        {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>}
        
        {/* Left Side: Name and Status */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 items-start">
            <h3 className={`font-extrabold text-base sm:text-lg truncate w-full sm:w-auto ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
              {name}
            </h3>
            
            <div className="flex flex-wrap items-center gap-1.5">
              {!isBooked && !isFull && !isSelected && (
                <span className="flex items-center gap-1 bg-red-50 text-red-600 text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-widest border border-red-100 shrink-0">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping absolute opacity-75"></span>
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full relative"></span>
                  LIVE
                </span>
              )}
              {isSelected && (
                <span className="flex items-center text-blue-700 font-extrabold text-[9px] sm:text-[10px] uppercase tracking-widest bg-blue-100 px-1.5 py-0.5 rounded-full border border-blue-200 shrink-0">
                  <Check className="w-3 h-3 mr-1" /> SELECTED
                </span>
              )}
              {isBooked && (
                <span className="flex items-center text-green-700 font-extrabold text-[9px] sm:text-[10px] uppercase tracking-widest bg-green-100 px-1.5 py-0.5 rounded-full border border-green-200 shrink-0">
                  <CheckCircle className="w-3 h-3 mr-1" /> BOOKED
                </span>
              )}
              {isFull && !isBooked && (
                <span className="text-red-600 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest bg-red-50 px-1.5 py-0.5 rounded-full border border-red-100 shrink-0">FULL</span>
              )}
            </div>
          </div>
          
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
            <span>Every {slot.day.charAt(0) + slot.day.slice(1).toLowerCase()}</span>
            {slot.start_time && slot.end_time && (
              <>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <span className="text-slate-700 font-bold tracking-tight">
                  {slot.start_time.substring(0,5)} - {slot.end_time.substring(0,5)}
                </span>
              </>
            )}
            {slot.session && (
              <>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <span className={`${slot.session === 'FORENOON' || slot.session === 'MORNING' ? 'text-orange-600' : 'text-indigo-600'} font-black tracking-wide uppercase`}>
                  {slot.session === 'FORENOON' || slot.session === 'MORNING' ? 'Morning' : 'Evening'}
                </span>
              </>
            )}
          </span>
          {description && (
            <div className="mt-1.5">
              <p className={`text-[11px] sm:text-xs text-slate-600 leading-snug transition-all ${expandedDescriptions[slot.id] ? '' : 'line-clamp-2'}`}>
                {description}
              </p>
              {description.length > 80 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setExpandedDescriptions(prev => ({ ...prev, [slot.id]: !prev[slot.id] })) }}
                  className="text-[10px] sm:text-xs font-bold text-blue-600 hover:text-blue-800 mt-1 inline-block"
                >
                  {expandedDescriptions[slot.id] ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}
          <div className="mt-1.5">
            {type === 'CLUB' && slot.start_time.startsWith('08:00') && (
              <span className="text-[9px] sm:text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-emerald-200 inline-block leading-tight mt-0.5">
                💡 Attend Club first (8:00 to 9:40), then proceed to your Lab.
              </span>
            )}
            {type === 'CENTRE' && slot.start_time.startsWith('09:40') && (
              <span className="text-[9px] sm:text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-emerald-200 inline-block leading-tight mt-0.5">
                💡 Attend your Lab first, then come to Centre (9:40 to 10:30).
              </span>
            )}
            {type === 'CENTRE' && slot.start_time.startsWith('13:10') && (
              <span className="text-[9px] sm:text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-emerald-200 inline-block leading-tight mt-0.5">
                💡 Attend Centre first (1:10 to 2:00), then proceed to your Lab.
              </span>
            )}
            {type === 'CLUB' && slot.start_time.startsWith('14:00') && (
              <span className="text-[9px] sm:text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-emerald-200 inline-block leading-tight mt-0.5">
                💡 Attend your Lab first, then come to Club (2:00 to 3:40).
              </span>
            )}
          </div>
        </div>
        
        {/* Right Side: Stats */}
        <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 shrink-0 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t border-slate-100 sm:border-0">
          {!isBooked && !isFull && (
            <div className="flex flex-col items-start sm:items-end">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available</span>
              <span className={`text-lg sm:text-xl leading-none font-black ${availableSeats <= 10 ? 'text-red-600' : isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                {availableSeats}
              </span>
            </div>
          )}
          
          {/* Custom Radio Button Visual */}
          {!isBooked && !isFull && (
            <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
            }`}>
              {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
            </div>
          )}
        </div>
      </div>
    );
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="space-y-12 relative pb-24">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-2xl flex items-start shadow-sm animate-in slide-in-from-top-4">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-red-800">Booking Alert</h3>
            <p className="text-sm font-medium text-red-700 mt-1">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      {/* FULL-SCREEN QUEUE ANIMATION (PORTAL) */}
      {mounted && isQueueing && createPortal(
        <div className="fixed inset-0 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300" style={{ zIndex: 99999 }}>
          <div className="max-w-md w-full px-6 flex flex-col items-center text-center">
            <div className="relative w-32 h-32 mb-8">
              <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
              <div 
                className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"
                style={{ animationDuration: '1s' }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center text-3xl font-black text-blue-600">
                {queueProgress}%
              </div>
            </div>
            
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">Processing Request</h2>
            <p className="text-slate-500 font-medium leading-relaxed">
              We are placing you in the allocation queue. Please do not close this page. First come, first served...
            </p>
          </div>
        </div>,
        document.body
      )}

      {/* SUCCESS TIMETABLE */}
      {mounted && isFullyBooked && (
        <div className="animate-in zoom-in duration-500">
          
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center mb-8 shadow-sm">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
            <h3 className="text-2xl font-extrabold text-emerald-900 tracking-tight">Booking Confirmed!</h3>
            <p className="text-emerald-700 font-medium mt-1">Your Club and Centre allocations are finalized.</p>
          </div>

          <div ref={timetableRef} className="bg-white rounded-xl border-2 border-slate-900 shadow-sm overflow-hidden text-slate-900 mx-auto max-w-4xl relative" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            
            {/* Watermark Overlay (Anti-Forgery) */}
            <div className="absolute inset-0 z-50 flex items-center justify-center opacity-[0.06] pointer-events-none overflow-hidden select-none mix-blend-multiply">
              <div className="transform -rotate-45 text-5xl md:text-7xl font-black whitespace-nowrap text-slate-900 flex flex-col items-center gap-4">
                <span>RIT TECHSPARK</span>
                <span className="font-mono">{student.register_no}</span>
                <span>SYSTEM GENERATED</span>
              </div>
            </div>

            {/* Timetable Header */}
            <div className="p-6 sm:p-8 border-b-2 border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10 bg-white/80">
              <img src="/rit-logo.png" alt="RIT Logo" className="h-12 w-auto object-contain" />
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-widest text-slate-900">Official Timetable</h2>
                <p className="text-sm font-bold text-slate-600 mt-1 uppercase tracking-wider">Activity Slot Allocation - 2026</p>
              </div>
              <img src="/techspark-logo.png" alt="TechSpark Logo" className="h-12 w-auto object-contain" />
            </div>

            {/* Student Details */}
            <div className="bg-slate-50 border-b-2 border-slate-900 p-6 sm:p-8 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 relative z-10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Student Name</p>
                <p className="text-sm sm:text-base font-extrabold">{student.name}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Register No</p>
                <p className="text-sm sm:text-base font-extrabold">{student.register_no}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Course & Sec</p>
                <p className="text-sm sm:text-base font-extrabold">{student.course} - {student.section}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Session</p>
                <p className="text-sm sm:text-base font-extrabold">{student.activity_session} ({student.allowed_day?.replace(/,/g, ', ')})</p>
              </div>
            </div>

            {/* The Grid */}
            <div className="p-6 sm:p-8 relative z-10 bg-white/50 space-y-8">
              {allBookingDays.map(day => {
                const dayBookings = [...existingClubBookings, ...existingCentreBookings]
                  .filter(b => b.slot.day === day || day === 'ANY')
                  .sort((a, b) => a.slot.start_time.localeCompare(b.slot.start_time));
                
                if (dayBookings.length === 0) return null;

                return (
                  <div key={day} className="overflow-hidden rounded-xl">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-2 flex items-center gap-2">
                      <CalendarClock className="w-4 h-4 text-blue-600" />
                      {day === 'ANY' ? 'Your Schedule' : `${day} Schedule`}
                    </h3>
                    <table className="w-full border-collapse border-2 border-slate-900 text-center shadow-sm">
                      <thead>
                        <tr>
                          <th className="border-2 border-slate-900 p-3 bg-slate-100 font-black tracking-widest uppercase text-xs w-[30%]">Time</th>
                          <th className="border-2 border-slate-900 p-3 bg-slate-100 font-black tracking-widest uppercase text-xs w-[70%]">Activity & Venue</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {dayBookings.map((b, index) => {
                          const slot = b.slot;
                          const isClub = slot.club_id !== null;
                          const name = isClub ? slot.club.name : slot.centre.name;
                          const typeLabel = isClub ? 'CLUB' : 'CENTRE';
                          
                          return (
                            <tr key={index}>
                              <td className="border-2 border-slate-900 p-3 font-bold text-slate-700 bg-slate-50 text-sm whitespace-nowrap">
                                {slot.start_time.substring(0,5)} - {slot.end_time.substring(0,5)}
                              </td>
                              <td className="border-2 border-slate-900 p-4 relative overflow-hidden">
                                {isClub ? (
                                  <div className="absolute top-0 right-0 w-12 h-12 bg-blue-500/5 rounded-bl-full border-b border-l border-blue-500/10 pointer-events-none"></div>
                                ) : (
                                  <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-500/5 rounded-bl-full border-b border-l border-indigo-500/10 pointer-events-none"></div>
                                )}
                                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest mb-1 relative z-10 ${isClub ? 'bg-blue-100 text-blue-800' : 'bg-indigo-100 text-indigo-800'}`}>
                                  {typeLabel}
                                </span>
                                <h4 className="text-base sm:text-lg font-extrabold mb-0.5 relative z-10">{name}</h4>
                                <div className="text-xs font-semibold text-slate-600 relative z-10 flex flex-wrap items-center justify-center gap-1.5 mt-2">
                                  <span>Venue: {slot.venue}</span>
                                  {slot.session && (
                                    <>
                                      <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                                      <span className="text-slate-800 font-bold">{slot.session === 'FORENOON' || slot.session === 'MORNING' ? 'Morning' : 'Evening'}</span>
                                    </>
                                  )}
                                </div>
                                <div className="mt-3 flex justify-center relative z-10">
                                  <button
                                    onClick={() => handleNavigateClick(slot.venue)}
                                    className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-extrabold px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
                                  >
                                    <MapPin className="w-3 h-3 text-blue-600" /> NAVIGATE TO VENUE
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
              
              {/* Faculty Coordinator Card */}
              {existingClubBookings.length > 0 && existingClubBookings.map((booking, idx) => {
                if (!booking.slot.club?.faculty_name) return null;
                return (
                <div key={idx} className="mt-5 border-2 border-blue-100 bg-blue-50/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-0.5">Club Faculty Coordinator ({booking.slot.day})</p>
                    <p className="font-extrabold text-slate-900 text-base">{booking.slot.club.faculty_name}</p>
                  </div>
                  <a
                    href={`tel:${booking.slot.club.faculty_mobile}`}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm shrink-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                    </svg>
                    {booking.slot.club.faculty_mobile}
                  </a>
                </div>
                )
              })}
              {/* Centre Faculty Coordinator Card */}
              {existingCentreBookings.length > 0 && existingCentreBookings.map((booking, idx) => {
                if (!booking.slot.centre?.faculty_name) return null;
                return (
                <div key={`centre-${idx}`} className="mt-4 border-2 border-indigo-100 bg-indigo-50/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-0.5">Centre Faculty Coordinator ({booking.slot.day})</p>
                    <p className="font-extrabold text-slate-900 text-base">{booking.slot.centre.faculty_name}</p>
                  </div>
                  <a
                    href={`tel:${booking.slot.centre.faculty_mobile}`}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm shrink-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                    </svg>
                    {booking.slot.centre.faculty_mobile}
                  </a>
                </div>
                )
              })}
            </div>

            {/* Footer Signature & Verification */}
            <div className="px-6 sm:px-8 pb-6 sm:pb-8 flex justify-between items-end mt-4 relative z-10">
              <div className="text-left flex items-end gap-4">
                <a 
                  href={`https://techspark-slots.vercel.app/verify?reg=${student.register_no}&hash=${existingClubBookings[0]?.id?.split('-')[0].toUpperCase()}-${existingCentreBookings[0]?.id?.split('-')[0].toUpperCase()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 bg-white border-2 border-slate-900 rounded-lg shadow-sm hover:scale-105 transition-transform block cursor-pointer"
                  title="Click to test Verification Page"
                >
                  <QRCode 
                    value={`https://techspark-slots.vercel.app/verify?reg=${student.register_no}&hash=${existingClubBookings[0]?.id?.split('-')[0].toUpperCase()}-${existingCentreBookings[0]?.id?.split('-')[0].toUpperCase()}`}
                    size={72} 
                    level="Q" 
                  />
                </a>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Digital Hash ID</p>
                  <p className="text-xs font-mono font-bold text-slate-800 mb-2">
                    {existingClubBookings[0]?.id?.split('-')[0].toUpperCase()}-{existingCentreBookings[0]?.id?.split('-')[0].toUpperCase()}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Generated On</p>
                  <p className="text-xs font-semibold text-slate-600">{new Date().toLocaleString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 text-right">Verification Status</p>
                <p className="text-xs font-extrabold text-emerald-600 flex items-center gap-1 justify-end">
                  <CheckCircle className="w-3 h-3" /> System Generated Document
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center mt-8">
            <button 
              onClick={downloadTimetable}
              className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white font-extrabold rounded-xl shadow-lg hover:bg-slate-800 transition-all active:scale-95"
            >
              <Download className="w-5 h-5" />
              Download Official Timetable
            </button>
          </div>
        </div>
      )}

      {/* SELECTION UI (Only if not fully booked) */}
      {!isFullyBooked && (
        <>
          {/* DYNAMIC INSTRUCTION BOX */}
          <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-5 mb-8 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-blue-900 font-extrabold text-base mb-1">Booking Instructions</h3>
                {student.allowed_day === 'ANY' ? (
                  <p className="text-blue-700 font-medium text-sm leading-relaxed">
                    You have an <strong>Open Slot</strong>! You only need to pick <strong>1 Club</strong> and <strong>1 Centre</strong> from <strong>ANY</strong> of the days available below.
                  </p>
                ) : student.allowed_day.includes(',') ? (
                  <p className="text-blue-700 font-medium text-sm leading-relaxed">
                    You have <strong>Multiple Days</strong> assigned to you. You MUST pick <strong>1 Club</strong> and <strong>1 Centre</strong> for <strong>EACH</strong> of your assigned days. The &quot;Confirm Booking&quot; button will appear once you have selected all required slots.
                  </p>
                ) : (
                  <p className="text-blue-700 font-medium text-sm leading-relaxed">
                    You have been assigned to <strong>{student.allowed_day.charAt(0) + student.allowed_day.slice(1).toLowerCase()}s</strong>. Please pick <strong>1 Club</strong> and <strong>1 Centre</strong> from the list below.
                  </p>
                )}
                
                {customRules && customRules.length > 0 && (
                  <div className="mt-3 p-3 bg-white/60 rounded-xl border border-blue-200/60 shadow-sm">
                    <p className="text-blue-800 font-bold text-sm mb-1.5 flex items-center gap-1.5">
                      <span className="bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-widest">Notice</span> 
                      Special Lab-Day Access
                    </p>
                    <ul className="text-blue-700 text-sm space-y-1 font-medium pl-1">
                      {customRules.map((rule: any, idx: number) => (
                        <li key={idx} className="flex flex-col gap-1.5 mb-2 last:mb-0">
                          <div className="flex items-start gap-2">
                            <span className="text-blue-400 mt-0.5">•</span>
                            <span>You also have access to specific slots on <strong>{rule.day}</strong> because of your lab schedule. Please make sure to select a slot for this day as well!</span>
                          </div>
                          {rule.allowed_timings && rule.allowed_timings.map((timeStr: string, tIdx: number) => {
                            let message = '';
                            if (timeStr.startsWith('08:00')) message = 'Attend Club first (8:00 to 9:40), then proceed to your Lab.';
                            else if (timeStr.startsWith('09:40')) message = 'Attend your Lab first, then come to Centre (9:40 to 10:30).';
                            else if (timeStr.startsWith('13:10')) message = 'Attend Centre first (1:10 to 2:00), then proceed to your Lab.';
                            else if (timeStr.startsWith('14:00')) message = 'Attend your Lab first, then come to Club (2:00 to 3:40).';
                            
                            if (!message) return null;
                            return (
                              <div key={tIdx} className="ml-4 pl-1">
                                <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 inline-block leading-tight shadow-sm">
                                  💡 {message}
                                </span>
                              </div>
                            );
                          })}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* CLUB SECTION */}
          <section>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight">
                <span className="bg-blue-100 text-blue-700 w-7 h-7 rounded-lg flex items-center justify-center text-xs">1</span>
                {existingClubBookings.length > 0 && student.allowed_day === 'ANY' ? 'Your Assigned Club' : 'Select Your Clubs'}
              </h2>
            </div>
            
            {student.allowed_day === 'ANY' && existingClubBookings.length > 0 ? (
              <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-slate-500 font-bold text-xs mb-1 uppercase tracking-widest">Already Booked</p>
                  <h3 className="text-xl font-black text-slate-800">{existingClubBookings[0].slot.club.name}</h3>
                </div>
                <div className="bg-slate-200 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold uppercase w-fit">Locked</div>
              </div>
            ) : (
              <div>
                {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map(day => {
                  const daySlots = sortedClubSlots.filter(s => s.day === day);
                  if (daySlots.length === 0) return null;
                  const bookedClub = student.allowed_day !== 'ANY' ? existingClubBookings.find(b => b.slot.day === day) : null;
                  
                  return (
                    <div key={day} className="mb-6 last:mb-0">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="w-full border-t border-slate-200"></span>
                        <span className="shrink-0">{day} SLOTS</span>
                        <span className="w-full border-t border-slate-200"></span>
                      </h3>
                      
                      {bookedClub ? (
                        <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <p className="text-slate-500 font-bold text-xs mb-1 uppercase tracking-widest">Already Booked for {day}</p>
                            <h3 className="text-xl font-black text-slate-800">{bookedClub.slot.club.name}</h3>
                          </div>
                          <div className="bg-slate-200 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold uppercase w-fit">Locked</div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          {daySlots.map(slot => renderSlotCard(slot, 'CLUB', false))}
                        </div>
                      )}
                    </div>
                  )
                })}
                {sortedClubSlots.length === 0 && <p className="text-slate-500 font-medium py-4">No clubs available for your session.</p>}
              </div>
            )}
          </section>

          {/* CENTRE SECTION */}
          <section>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight">
                <span className="bg-indigo-100 text-indigo-700 w-7 h-7 rounded-lg flex items-center justify-center text-xs">2</span>
                {existingCentreBookings.length > 0 && student.allowed_day === 'ANY' ? 'Your Assigned Centre' : 'Select Your Centres'}
              </h2>
            </div>
            
            {student.allowed_day === 'ANY' && existingCentreBookings.length > 0 ? (
              <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-slate-500 font-bold text-xs mb-1 uppercase tracking-widest">Already Booked</p>
                  <h3 className="text-xl font-black text-slate-800">{existingCentreBookings[0].slot.centre.name}</h3>
                </div>
                <div className="bg-slate-200 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold uppercase w-fit">Locked</div>
              </div>
            ) : (
              <div>
                {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map(day => {
                  const daySlots = sortedCentreSlots.filter(s => s.day === day);
                  if (daySlots.length === 0) return null;
                  const bookedCentre = student.allowed_day !== 'ANY' ? existingCentreBookings.find(b => b.slot.day === day) : null;
                  
                  return (
                    <div key={day} className="mb-6 last:mb-0">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="w-full border-t border-slate-200"></span>
                        <span className="shrink-0">{day} SLOTS</span>
                        <span className="w-full border-t border-slate-200"></span>
                      </h3>
                      
                      {bookedCentre ? (
                        <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <p className="text-slate-500 font-bold text-xs mb-1 uppercase tracking-widest">Already Booked for {day}</p>
                            <h3 className="text-xl font-black text-slate-800">{bookedCentre.slot.centre.name}</h3>
                          </div>
                          <div className="bg-slate-200 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold uppercase w-fit">Locked</div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          {daySlots.map(slot => renderSlotCard(slot, 'CENTRE', false))}
                        </div>
                      )}
                    </div>
                  )
                })}
                {sortedCentreSlots.length === 0 && <p className="text-slate-500 font-medium py-4">No centres available for your session.</p>}
              </div>
            )}
          </section>
        </>
      )}

      {/* FLOATING ACTION BAR FOR REVIEW (PORTAL) */}
      {mounted && isReadyToProceed && !isFullyBooked && !showPreview && !isQueueing && createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-xl animate-in slide-in-from-bottom-10 fade-in duration-300" style={{ zIndex: 99999 }}>
          <div className="bg-slate-900 rounded-2xl p-4 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] border border-slate-700 flex items-center justify-between">
            <div className="px-2">
              <p className="text-slate-300 text-xs font-bold uppercase tracking-widest mb-0.5">Ready to proceed</p>
              <p className="text-white font-extrabold">Club and Centre Selected</p>
            </div>
            <button
              onClick={() => setShowPreview(true)}
              className="bg-blue-500 hover:bg-blue-400 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all active:scale-95 touch-manipulation"
            >
              Review Selections
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* PREVIEW MODAL (PORTAL) */}
      {mounted && showPreview && createPortal(
        <div className="fixed inset-0 flex flex-col justify-center items-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" style={{ zIndex: 99999 }}>
          <div className="bg-white w-full max-w-3xl flex flex-col rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 pb-3 sm:pb-4 border-b border-slate-100">
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Review Your Choices</h3>
              <p className="text-slate-500 text-sm font-medium mt-1">Please confirm the venues and timings.</p>
            </div>
                        {/* Modal Content */}
            <div className="p-5 sm:p-6 bg-slate-50/80 grid grid-cols-1 gap-6 max-h-[60vh] overflow-y-auto">
              {allBookingDays.map(day => {
                const dayKey = day === 'ANY' ? 'ANY' : day;
                const clubId = selectedClubIds[dayKey];
                const centreId = selectedCentreIds[dayKey];
                
                // If it's ANY, they might have booked it on some random day, so we just take the first booking
                const bookedClub = day === 'ANY' ? existingClubBookings[0]?.slot : existingClubBookings.find(b => b.slot.day === day)?.slot;
                const bookedCentre = day === 'ANY' ? existingCentreBookings[0]?.slot : existingCentreBookings.find(b => b.slot.day === day)?.slot;
                
                const c = bookedClub || liveClubSlots.find(s => s.id === clubId);
                const cen = bookedCentre || liveCentreSlots.find(s => s.id === centreId);
                if (!c || !cen) return null;

                return (
                  <div key={dayKey}>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <span className="w-full border-t border-slate-200"></span>
                      <span className="shrink-0">{day === 'ANY' ? 'SELECTED SLOTS' : `${day} SLOTS`}</span>
                      <span className="w-full border-t border-slate-200"></span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-bl-full border-b border-l border-blue-500/10 pointer-events-none"></div>
                        <div className="flex items-center gap-2 mb-1.5 relative z-10">
                          <span className="bg-blue-100 text-blue-700 text-[10px] font-black uppercase px-2 py-0.5 rounded">CLUB</span>
                          {bookedClub && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Booked</span>}
                        </div>
                        <h4 className="text-lg font-extrabold text-slate-900 mb-3 relative z-10">{c.club.name}</h4>
                        <div className="space-y-2 relative z-10">
                          <div className="flex items-start gap-2.5 text-xs font-semibold text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" /> 
                            <span className="leading-tight">{c.venue}</span>
                          </div>
                          <div className="flex items-start gap-2.5 text-xs font-semibold text-slate-600">
                            <Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" /> 
                            <span className="leading-tight">{c.start_time.substring(0,5)} - {c.end_time.substring(0,5)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-bl-full border-b border-l border-indigo-500/10 pointer-events-none"></div>
                        <div className="flex items-center gap-2 mb-1.5 relative z-10">
                          <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase px-2 py-0.5 rounded">CENTRE</span>
                          {bookedCentre && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Booked</span>}
                        </div>
                        <h4 className="text-lg font-extrabold text-slate-900 mb-3 relative z-10">{cen.centre.name}</h4>
                        <div className="space-y-2 relative z-10">
                          <div className="flex items-start gap-2.5 text-xs font-semibold text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" /> 
                            <span className="leading-tight">{cen.venue}</span>
                          </div>
                          <div className="flex items-start gap-2.5 text-xs font-semibold text-slate-600">
                            <Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" /> 
                            <span className="leading-tight">{cen.start_time.substring(0,5)} - {cen.end_time.substring(0,5)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Modal Footer */}
            <div className="p-5 sm:p-6 bg-white flex flex-col sm:flex-row items-center gap-3 border-t border-slate-100">
              <button 
                onClick={() => setShowPreview(false)}
                className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95 touch-manipulation"
              >
                Change Selection
              </button>
              <button 
                onClick={handleConfirmBooking}
                disabled={loading}
                className="w-full px-5 py-3 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* 3D MAP MODAL */}
      <CampusMapModal 
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        destinationNodeId={targetNodeId}
        venueName={targetVenueName}
      />
    </div>
  );
}
