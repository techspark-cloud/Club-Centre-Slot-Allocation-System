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
  if (!data) throw new Error(`Centre not found: ${name}`);
  return data.id;
}

const schedule = [
  { day: 'FRIDAY', clubs: ['Helios'], centres: ['Centre for RADAR'] },
];

async function seedB205Friday() {
  console.log('Inserting Friday independent slots for B2-05...');

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
        try {
          const clubId = await getClubId(clubName);
          const slot = {
            club_id: clubId,
            centre_id: null,
            day: row.day,
            session: session.name,
            venue: 'B2-05',
            start_time: session.c_start,
            end_time: session.c_end,
            capacity: 60,
            status: 'ACTIVE'
          };
          await supabase.from('slots').insert(slot);
          console.log(`Inserted Club: ${row.day} ${session.name} -> ${clubName}`);
        } catch (e: any) {
          console.error(`Failed to insert club ${clubName}:`, e.message);
        }
      }

      // Insert Centre Slots
      for (const centreName of row.centres) {
        try {
          const centreId = await getCentreId(centreName);
          const slot = {
            club_id: null,
            centre_id: centreId,
            day: row.day,
            session: session.name,
            venue: 'B2-05',
            start_time: session.ce_start,
            end_time: session.ce_end,
            capacity: 60,
            status: 'ACTIVE'
          };
          await supabase.from('slots').insert(slot);
          console.log(`Inserted Centre: ${row.day} ${session.name} -> ${centreName}`);
        } catch (e: any) {
          console.error(`Failed to insert centre ${centreName}:`, e.message);
        }
      }
    }
  }
  
  console.log('Finished Friday B2-05!');
}

seedB205Friday();
