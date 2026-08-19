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

const schedules = {
  'B2-06': [
    { day: 'MONDAY', clubs: ['Yuva'], centres: ['Centre for Semiconductor Design'] },
    { day: 'TUESDAY', clubs: ['Infinitus'], centres: ['Center for Apple'] },
    { day: 'WEDNESDAY', clubs: ['Innovation'], centres: ['Centre for Cybersecurity', 'Sports'] },
    { day: 'THURSDAY', clubs: ['Women Empowerment Cell (WEC)', 'WiSTEM'], centres: ['Center for Cloud'] },
    { day: 'FRIDAY', clubs: ['Innovation'], centres: ['Centre for ZF'] },
  ],
  'B2-07': [
    { day: 'MONDAY', clubs: ['UBA (Unnat Bharat Abhiyan)'], centres: ['Centre for RADAR'] },
    { day: 'TUESDAY', clubs: ['Podcast (PODX)'], centres: ['Centre for Smart Manufacturing'] },
    { day: 'WEDNESDAY', clubs: ['STEAM'], centres: ['Center for EV & Energy', 'Sports'] },
    { day: 'THURSDAY', clubs: ['Fusion'], centres: ['Centre For Image Processing'] },
    { day: 'FRIDAY', clubs: ['Mediastic Hub'], centres: ['Center for Space'] },
  ],
  'B3-01': [
    { day: 'MONDAY', clubs: ['Helios', 'Mediastic Hub'], centres: ['Centre for RADAR'] },
    { day: 'TUESDAY', clubs: ['NSS (National Service Scheme)', 'YRC (Youth Red Cross)'], centres: ['Centre for ARVR (Augmented Reality / Virtual Reality)'] },
    { day: 'WEDNESDAY', clubs: ['Artist league'], centres: ['Centre for AI (Artificial Intelligence)', 'Sports'] },
    { day: 'THURSDAY', clubs: ['Vaarithi Muthamizh Mandram', 'Telugu'], centres: ['Centre for IoT (Internet of Things)'] },
    { day: 'FRIDAY', clubs: ['Techspark'], centres: ['Center for Data Science'] },
  ]
};

async function seedBatch() {
  console.log('Inserting independent slots for Batch 3 (B2-06, B2-07, B3-01)...');
  
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

  for (const [venue, schedule] of Object.entries(schedules)) {
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
              venue: venue,
              start_time: session.c_start,
              end_time: session.c_end,
              capacity: 60,
              status: 'ACTIVE'
            };
            await supabase.from('slots').insert(slot);
            console.log(`Inserted Club [${venue}]: ${row.day} ${session.name} -> ${clubName}`);
          } catch (e: any) {
            console.error(`Failed to insert club [${venue}] ${clubName}:`, e.message);
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
              venue: venue,
              start_time: session.ce_start,
              end_time: session.ce_end,
              capacity: 60,
              status: 'ACTIVE'
            };
            await supabase.from('slots').insert(slot);
            console.log(`Inserted Centre [${venue}]: ${row.day} ${session.name} -> ${centreName}`);
          } catch (e: any) {
            console.error(`Failed to insert centre [${venue}] ${centreName}:`, e.message);
          }
        }
      }
    }
  }
  
  console.log('Finished Batch 3!');
}

seedBatch();
