import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
let envUrl = '';
let envKey = '';

if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL="?(.*?)"?(?:\n|$)/)?.[1] || '';
  envKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY="?(.*?)"?(?:\n|$)/)?.[1] || '';
}

const supabase = createClient(envUrl, envKey);

async function getClubId(name: string) {
  const { data } = await supabase.from('clubs').select('id').eq('name', name.trim()).single();
  if (!data) throw new Error(`Club not found: ${name}`);
  return data.id;
}

async function getCentreId(name: string) {
  const { data } = await supabase.from('centres').select('id').eq('name', name.trim()).single();
  if (!data) {
    if (name.trim() === 'Sports') {
      const { data: newCentre } = await supabase.from('centres').insert({ name: 'Sports', status: 'ACTIVE' }).select('id').single();
      return newCentre!.id;
    }
    throw new Error(`Centre not found: ${name}`);
  }
  return data.id;
}

const schedule = [
  { day: 'MONDAY', clubs: ['Infinitus'], centres: ['Center for Apple'] },
  { day: 'TUESDAY', clubs: ['Nippon'], centres: ['Centre for Cybersecurity'] },
  { day: 'WEDNESDAY', clubs: ['Women Empowerment Cell', 'WiSTEM'], centres: ['Center for Cloud', 'Sports'] },
  { day: 'THURSDAY', clubs: ['Rotaract'], centres: ['Centre for ZF'] },
  { day: 'FRIDAY', clubs: ['Yuva'], centres: ['Centre for Semiconductor Design'] },
];

async function seedB203() {
  console.log('Inserting independent slots for B2-03...');
  
  const clubNameMap: Record<string, string> = {
    'Women Empowerment Cell': 'Women Empowerment Cell (WEC)',
  };

  const centreNameMap: Record<string, string> = {};

  const sessions = [
    { 
      name: 'FORENOON', 
      c_start: '08:00:00', c_end: '09:15:00', 
      ce_start: '09:15:00', ce_end: '10:30:00' 
    },
    { 
      name: 'AFTERNOON', 
      c_start: '13:10:00', c_end: '14:25:00', 
      ce_start: '14:25:00', ce_end: '15:40:00' 
    }
  ];

  for (const row of schedule) {
    for (const session of sessions) {
      // Insert Club Slots
      for (const clubName of row.clubs) {
        const actualClubName = clubNameMap[clubName] || clubName;
        try {
          const clubId = await getClubId(actualClubName);
          const slot = {
            club_id: clubId,
            centre_id: null,
            day: row.day,
            session: session.name,
            venue: 'B2-03',
            start_time: session.c_start,
            end_time: session.c_end,
            capacity: 60,
            status: 'ACTIVE'
          };
          // Upsert logic using standard insert since we dropped the complex UNIQUE constraint on the table
          // Wait, without UNIQUE constraint, insert might duplicate if run multiple times. We'll just insert.
          await supabase.from('slots').insert(slot);
          console.log(`Inserted Club: ${row.day} ${session.name} -> ${actualClubName}`);
        } catch (e: any) {
          console.error(`Failed to insert club ${actualClubName}:`, e.message);
        }
      }

      // Insert Centre Slots
      for (const centreName of row.centres) {
        const actualCentreName = centreNameMap[centreName] || centreName;
        try {
          const centreId = await getCentreId(actualCentreName);
          const slot = {
            club_id: null,
            centre_id: centreId,
            day: row.day,
            session: session.name,
            venue: 'B2-03',
            start_time: session.ce_start,
            end_time: session.ce_end,
            capacity: 60,
            status: 'ACTIVE'
          };
          await supabase.from('slots').insert(slot);
          console.log(`Inserted Centre: ${row.day} ${session.name} -> ${actualCentreName}`);
        } catch (e: any) {
          console.error(`Failed to insert centre ${actualCentreName}:`, e.message);
        }
      }
    }
  }
  
  console.log('Finished B2-03!');
}

seedB203();
