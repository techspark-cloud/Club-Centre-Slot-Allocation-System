import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
let envUrl = '';
let envKey = '';

if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL="?(.*?)"?(?:\n|$)/)?.[1] || '';
  envKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY="?(.*?)"?(?:\n|$)/)?.[1] || '';
}

const supabase = createClient(envUrl, envKey);

const clubs = [
  "Artist league",
  "Fusion",
  "Helios",
  "Infinitus",
  "Innovation",
  "Mediastic Hub",
  "NSS (National Service Scheme)",
  "Nippon",
  "Podcast (PODX)",
  "Rotaract",
  "STEAM",
  "Techspark",
  "Telugu",
  "UBA (Unnat Bharat Abhiyan)",
  "Vaarithi Muthamizh Mandram",
  "WiSTEM",
  "Women Empowerment Cell (WEC)",
  "YRC (Youth Red Cross)",
  "Yuva"
].map(name => ({ name, status: 'ACTIVE' }));

const centres = [
  "Center for Apple",
  "Center for Cloud",
  "Center for Data Science",
  "Center for EV & Energy",
  "Center for Space",
  "Centre For Image Processing",
  "Centre for AI (Artificial Intelligence)",
  "Centre for ARVR (Augmented Reality / Virtual Reality)",
  "Centre for Cybersecurity",
  "Centre for IoT (Internet of Things)",
  "Centre for RADAR",
  "Centre for Semiconductor Design",
  "Centre for Smart Manufacturing",
  "Centre for ZF"
].map(name => ({ name, status: 'ACTIVE' }));

async function seedClubsAndCentres() {
  console.log('Seeding Clubs and Centres...');

  const { data: insertedClubs, error: clubError } = await supabase
    .from('clubs')
    .upsert(clubs, { onConflict: 'name' })
    .select();

  if (clubError) {
    console.error('Error inserting clubs:', clubError);
  } else {
    console.log(`✅ Inserted ${insertedClubs?.length} Clubs!`);
  }

  const { data: insertedCentres, error: centreError } = await supabase
    .from('centres')
    .upsert(centres, { onConflict: 'name' })
    .select();

  if (centreError) {
    console.error('Error inserting centres:', centreError);
  } else {
    console.log(`✅ Inserted ${insertedCentres?.length} Centres!`);
  }
}

seedClubsAndCentres();
