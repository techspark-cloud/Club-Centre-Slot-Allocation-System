export function getDeptFromCourse(course: string | null | undefined): string | null {
  if (!course) return null;
  if (/Computer Science and Engineering(?!.*(Artificial Intelligence|Business))/i.test(course)) return 'CSE';
  if (/Artificial Intelligence and Machine Learning/i.test(course)) return 'AIML';
  if (/Artificial Intelligence and Data Science/i.test(course)) return 'AIDS';
  if (/Mechanical/i.test(course)) return 'MECH';
  if (/Business Systems/i.test(course)) return 'CSBS';
  if (/Electronics and Communication/i.test(course)) return 'ECE';
  if (/Computer and Communication/i.test(course)) return 'CCE';
  if (/VLSI/i.test(course)) return 'VLSI';
  return null;
}

/**
 * Returns mandatory centres for a department / section
 */
export function getMandatoryCentresForStudent(course: string | null | undefined, section: string | null | undefined): string[] {
  const dept = getDeptFromCourse(course);
  if (!dept) return [];

  switch (dept) {
    case 'CSE':
      return ['Centre For Image Processing', 'Center for Apple'];
    case 'AIML':
      return ['Centre for ZF', 'Centre for AI (Artificial Intelligence)'];
    case 'AIDS': {
      // Sec B, C, G have Mon/Tue/Fri timetable where DS & Cloud have no slots
      const sec = (section || '').toUpperCase().trim();
      if (['B', 'C', 'G'].includes(sec)) {
        return ['Centre for ZF', 'Centre for AI (Artificial Intelligence)'];
      }
      return ['Center for Data Science', 'Center for Cloud'];
    }
    case 'MECH':
      return ['Centre for Smart Manufacturing', 'Center for EV & Energy'];
    case 'CSBS':
      return ['Centre for ARVR (Augmented Reality / Virtual Reality)', 'Centre for Cybersecurity'];
    case 'ECE':
      return ['Centre for IoT (Internet of Things)', 'Centre for RADAR'];
    case 'CCE':
      return ['Center for Space'];
    case 'VLSI':
      return ['Centre for Semiconductor Design'];
    default:
      return [];
  }
}

/**
 * Check if a student can view / select Semiconductor
 * - VLSI: Mandatory Lock (Priority 1)
 * - ECE: Allowed for balance open slots (Priority 2)
 * - All other departments: Not allowed
 */
export function isSemiconductorAllowedForStudent(course: string | null | undefined): boolean {
  const dept = getDeptFromCourse(course);
  return dept === 'VLSI' || dept === 'ECE';
}

export interface LockedSlotAssignment {
  slotId: string;
  centreName: string;
  day: string;
  timing: string;
}

/**
 * Resolves which slots should be pre-locked for a student based on their schedule
 */
export function resolveLockedCentreSlots(
  student: { course: string; section: string; allowed_day: string; activity_session: string },
  centreSlots: any[],
  customRules: any[] = []
): Record<string, LockedSlotAssignment> {
  const mandatoryCentres = getMandatoryCentresForStudent(student.course, student.section);
  if (mandatoryCentres.length === 0) return {};

  const stdDays = (student.allowed_day && student.allowed_day !== 'ANY' && student.allowed_day !== 'INDEPENDENT')
    ? student.allowed_day.split(',').map(d => d.trim()).filter(Boolean)
    : [];

  const allDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  const availableCentreDays: string[] = [];

  allDays.forEach(day => {
    const r = customRules.find(rule => rule.day === day);
    if (r) {
      if (r.allowed_timings && r.allowed_timings.some((t: string) => t.includes('09:40') || t.includes('13:10'))) {
        availableCentreDays.push(day);
      }
    } else if (stdDays.includes(day)) {
      availableCentreDays.push(day);
    }
  });

  const assignments: Record<string, LockedSlotAssignment> = {}; // keyed by day (e.g. MONDAY)
  const usedDays = new Set<string>();

  for (const cName of mandatoryCentres) {
    const validSlots = centreSlots.filter(s => {
      if (s.centre?.name !== cName) return false;
      if (!availableCentreDays.includes(s.day)) return false;

      const r = customRules.find(rule => rule.day === s.day);
      if (r) {
        const f1 = `${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}`;
        const f2 = `${s.start_time}-${s.end_time}`;
        return r.allowed_timings.some((t: string) => 
          t === f1 || t === f2 || t.replace(/\s+/g, '') === f2.replace(/\s+/g, '')
        );
      }

      return s.session === student.activity_session;
    });

    const availSlot = validSlots.find(s => !usedDays.has(s.day));
    if (availSlot) {
      usedDays.add(availSlot.day);
      assignments[availSlot.day] = {
        slotId: availSlot.id,
        centreName: cName,
        day: availSlot.day,
        timing: `${availSlot.start_time.slice(0, 5)} - ${availSlot.end_time.slice(0, 5)}`
      };
    }
  }

  return assignments;
}
