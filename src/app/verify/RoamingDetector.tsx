'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck, AlertTriangle } from 'lucide-react';

export default function RoamingDetector({ 
  student, 
  clubAlloc, 
  centreAlloc 
}: { 
  student: any, 
  clubAlloc: any, 
  centreAlloc: any 
}) {
  const [status, setStatus] = useState<'CHECKING' | 'AUTHORIZED' | 'ROAMING'>('CHECKING');
  const [activeVenue, setActiveVenue] = useState<string | null>(null);

  useEffect(() => {
    // 1. Get Current Day & Time
    const now = new Date();
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDay = days[now.getDay()];
    
    // Format HH:MM for comparison
    const currentHours = now.getHours().toString().padStart(2, '0');
    const currentMinutes = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}:00`;

    let isAuthorized = false;
    let foundVenue = null;

    // 2. Check if today matches their allowed day
    if (student.allowed_day === currentDay) {
      // 3. Check if current time falls within Club Slot
      if (currentTimeStr >= clubAlloc.slot.start_time && currentTimeStr <= clubAlloc.slot.end_time) {
        isAuthorized = true;
        foundVenue = `CLUB: ${clubAlloc.slot.club.name}`;
      }
      
      // 4. Check if current time falls within Centre Slot
      if (currentTimeStr >= centreAlloc.slot.start_time && currentTimeStr <= centreAlloc.slot.end_time) {
        isAuthorized = true;
        foundVenue = `CENTRE: ${centreAlloc.slot.centre.name}`;
      }
    }

    if (isAuthorized) {
      setStatus('AUTHORIZED');
      setActiveVenue(foundVenue);
    } else {
      setStatus('ROAMING');
      playWarningBeeps();
    }
  }, [student, clubAlloc, centreAlloc]);

  // Use Web Audio API for a loud, distinct beep that bypasses many mobile restrictions
  const playWarningBeeps = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playBeep = (startTime: number) => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'square'; // Harsh warning sound
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // 800Hz
        
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // Volume
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.2); // Beep duration 200ms
      };

      // Play 3 beeps with 100ms pause between them
      const now = audioCtx.currentTime;
      playBeep(now);
      playBeep(now + 0.3);
      playBeep(now + 0.6);
      
    } catch (e) {
      console.warn("Audio playback failed or blocked by browser.");
    }
  };

  if (status === 'CHECKING') {
    return (
      <div className="bg-slate-200 p-8 text-center animate-pulse">
        <h1 className="text-xl font-bold text-slate-400">Verifying Live Status...</h1>
      </div>
    );
  }

  if (status === 'AUTHORIZED') {
    return (
      <div className="bg-emerald-500 p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
        
        <BadgeCheck className="w-20 h-20 mx-auto text-white mb-3 relative z-10 drop-shadow-md animate-in zoom-in duration-500" />
        <h1 className="text-3xl font-black tracking-widest text-white uppercase relative z-10">Authorized</h1>
        <p className="text-emerald-100 font-bold text-sm tracking-widest uppercase mt-1 relative z-10 flex flex-col gap-1 items-center">
          <span>Authentic Document</span>
          <span className="bg-emerald-600/50 py-1 px-3 rounded-lg border border-emerald-400 mt-2 inline-block">
            In Session: {activeVenue}
          </span>
        </p>
      </div>
    );
  }

  // ROAMING STATE
  return (
    <div className="bg-orange-500 p-8 text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-red-500/20 animate-pulse pointer-events-none"></div>
      
      <AlertTriangle className="w-20 h-20 mx-auto text-white mb-3 relative z-10 drop-shadow-md animate-in zoom-in duration-300" />
      <h1 className="text-3xl sm:text-4xl font-black tracking-widest text-white uppercase relative z-10 drop-shadow-sm">ROAMING!</h1>
      
      <div className="bg-orange-600/80 p-3 rounded-xl border border-orange-400/50 mt-4 relative z-10 shadow-inner">
        <p className="text-white font-extrabold text-sm uppercase tracking-wide">
          Student has NO ACTIVE SESSION right now.
        </p>
        <p className="text-orange-200 font-bold text-xs mt-1">
          They should be in regular class.
        </p>
      </div>
    </div>
  );
}
