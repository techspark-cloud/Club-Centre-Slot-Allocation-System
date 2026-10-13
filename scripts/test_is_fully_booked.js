require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testFullyBooked() {
  const reg = '2117250070135'; // A.JEEVITHA who has Mon Centre, Wed Club, Thu Club, Fri Club
  const { data: student } = await supabase.from('students').select('*').eq('register_no', reg).single();
  const { data: allocations } = await supabase.from('allocations').select('*, slot:slots(*)').eq('student_id', student.id);
  const { data: customRules } = await supabase.from('section_booking_rules').select('*').eq('course', student.course).eq('section', student.section);
  const { data: allSlots } = await supabase.from('slots').select('*, club:clubs(*), centre:centres(*)').eq('status', 'ACTIVE');
  
  const allowedDaysArray = (student.allowed_day && student.allowed_day !== 'ANY' && student.allowed_day !== 'INDEPENDENT') 
    ? student.allowed_day.split(',').map((d) => d.trim()).filter(Boolean) 
    : [];

  let clubSlots = allSlots.filter((slot) => {
    if (!slot.club_id) return false;
    if (slot.session !== student.activity_session) return false;
    const rule = customRules?.find((r) => r.day === slot.day);
    if (rule) {
      const slotTiming = `${slot.start_time}-${slot.end_time}`;
      return rule.allowed_timings?.includes(slotTiming);
    }
    return allowedDaysArray.includes(slot.day);
  });

  let centreSlots = allSlots.filter((slot) => {
    if (!slot.centre_id) return false;
    if (slot.session !== student.activity_session) return false;
    const rule = customRules?.find((r) => r.day === slot.day);
    if (rule) {
      const slotTiming = `${slot.start_time}-${slot.end_time}`;
      return rule.allowed_timings?.includes(slotTiming);
    }
    return allowedDaysArray.includes(slot.day);
  });

  console.log('Filtered Club Slots days:', Array.from(new Set(clubSlots.map(s => s.day))));
  console.log('Filtered Centre Slots days:', Array.from(new Set(centreSlots.map(s => s.day))));

  const existingClubBookings = allocations.filter(a => a.slot.club_id !== null);
  const existingCentreBookings = allocations.filter(a => a.slot.centre_id !== null);

  const standardDays = student.allowed_day.split(',').map(d => d.trim());
  const customDays = (customRules || []).map(r => r.day.trim());
  const requiredDays = Array.from(new Set([...standardDays, ...customDays]));

  console.log('\nrequiredDays:', requiredDays);

  const daysCheck = requiredDays.map(day => {
    const dayHasClub = clubSlots.some(s => s.day === day);
    const dayHasCentre = centreSlots.some(s => s.day === day);
    const hasBookedClub = !dayHasClub || existingClubBookings.some(b => b.slot.day === day);
    const hasBookedCentre = !dayHasCentre || existingCentreBookings.some(b => b.slot.day === day);
    return {
      day,
      dayHasClub,
      dayHasCentre,
      hasBookedClub,
      hasBookedCentre,
      dayComplete: hasBookedClub && hasBookedCentre
    };
  });

  console.log('\nDays Check:');
  console.table(daysCheck);

  const isFullyBooked = requiredDays.length > 0 && daysCheck.every(d => d.dayComplete);
  console.log('isFullyBooked RESULT:', isFullyBooked);
}
testFullyBooked();
