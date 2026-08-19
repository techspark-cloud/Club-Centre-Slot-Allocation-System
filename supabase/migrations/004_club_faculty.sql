-- ============================================================
-- Migration 004: Add Faculty Coordinator fields to clubs & centres tables
-- ============================================================

ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS faculty_name TEXT,
  ADD COLUMN IF NOT EXISTS faculty_mobile TEXT;

ALTER TABLE centres
  ADD COLUMN IF NOT EXISTS faculty_name TEXT,
  ADD COLUMN IF NOT EXISTS faculty_mobile TEXT;

-- Update all 15 clubs with their faculty coordinators
UPDATE clubs SET faculty_name = 'Ms. Shri Janani P (AP/CSE)',       faculty_mobile = '8838487363' WHERE UPPER(name) LIKE '%ARTIST LEAGUE%';
UPDATE clubs SET faculty_name = 'Mr. Suresh J (AP/AI&DS)',           faculty_mobile = '9840486420' WHERE UPPER(name) LIKE '%HELIOS%';
UPDATE clubs SET faculty_name = 'Ms. Thilagavathy A (AP/MATH)',      faculty_mobile = '8838552068' WHERE UPPER(name) LIKE '%INFINITUS%';
UPDATE clubs SET faculty_name = 'Ms. Roobavathi R (AP/ENGLISH)',     faculty_mobile = '9600540041' WHERE UPPER(name) LIKE '%NIPPON%';
UPDATE clubs SET faculty_name = 'Ms. Pooja S (AP/CSE)',              faculty_mobile = '8668130804' WHERE UPPER(name) LIKE '%NSS%';
UPDATE clubs SET faculty_name = 'Ms. Fouzia Sulthana K (AP/AI&DS)', faculty_mobile = '8056417456' WHERE UPPER(name) LIKE '%PODX%';
UPDATE clubs SET faculty_name = 'Dr. Rajesh Kanna S K (AP/MECH)',   faculty_mobile = '9884834301' WHERE UPPER(name) LIKE '%ROTARACT%';
UPDATE clubs SET faculty_name = 'Mr. Mohan Ram R (AP/ECE)',          faculty_mobile = '7550271227' WHERE UPPER(name) LIKE '%STEAM%';
UPDATE clubs SET faculty_name = 'Ms. Avudai Selvi S (AP/CSE)',       faculty_mobile = '7358599091' WHERE UPPER(name) LIKE '%TECHSPARK%';
UPDATE clubs SET faculty_name = 'Dr. Niranjana S (AP/VLSI)',         faculty_mobile = '9047771300' WHERE UPPER(name) LIKE '%UBA%';
UPDATE clubs SET faculty_name = 'Mr. Keerthana Pandiyan (AP/BT)',    faculty_mobile = '9940481894' WHERE UPPER(name) LIKE '%VAARATHI%';
UPDATE clubs SET faculty_name = 'Ms. Suganthi N (AP/CSE)',           faculty_mobile = '9994095198' WHERE UPPER(name) LIKE '%WEC%';
UPDATE clubs SET faculty_name = 'Ms. Anitha J (AP/MATH)',            faculty_mobile = '9600110150' WHERE UPPER(name) LIKE '%WISTEM%';
UPDATE clubs SET faculty_name = 'Ms. Julin Leeya G (AP/CSE)',        faculty_mobile = '8270258310' WHERE UPPER(name) LIKE '%YRC%';
UPDATE clubs SET faculty_name = 'Mr. Aakash A (AP/CSE)',             faculty_mobile = '9025945324' WHERE UPPER(name) LIKE '%YUVA%';
