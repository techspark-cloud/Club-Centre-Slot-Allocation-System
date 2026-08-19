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

const mapping: Record<string, { FORENOON: string[], AFTERNOON: string[] }> = {
  "B.E. Mechanical Engineering": {
    "FORENOON": ["B"],
    "AFTERNOON": ["A"]
  },
  "B.E. Electronics and Communication Engineering": {
    "FORENOON": ["D", "E"],
    "AFTERNOON": ["A", "B", "C"]
  },
  "B.E. Electronics Engineering (VLSI Design and Technology)": {
    "FORENOON": ["B"],
    "AFTERNOON": ["A"]
  },
  "B.Tech. Biotechnology": {
    "FORENOON": [],
    "AFTERNOON": ["A"]
  },
  "B.E. Computer Science and Engineering": {
    "FORENOON": ["A", "B", "C", "D", "E"],
    "AFTERNOON": ["F", "G", "H", "I"]
  },
  "B.Tech. Computer Science and Business Systems": {
    "FORENOON": ["B"],
    "AFTERNOON": ["A"]
  },
  "B.E. Computer and Communication Engineering": {
    "FORENOON": ["B"],
    "AFTERNOON": ["A"]
  },
  "B.Tech. Artificial Intelligence and Data Science": {
    "FORENOON": ["D", "E", "F", "G"],
    "AFTERNOON": ["A", "B", "C"]
  },
  "B.E. Computer Science and Engineering (Artificial Intelligence and Machine Learning)": {
    "FORENOON": [],
    "AFTERNOON": ["A", "B"]
  }
};

async function run() {
  console.log("Starting batch mapping...");
  
  for (const [course, sessions] of Object.entries(mapping)) {
    console.log(`Processing ${course}...`);
    
    if (sessions.FORENOON.length > 0) {
      const { data, error } = await supabase
        .from('students')
        .update({ activity_session: 'FORENOON' })
        .eq('course', course)
        .in('section', sessions.FORENOON);
        
      if (error) {
        console.error(`Error updating FORENOON for ${course}:`, error);
      } else {
        console.log(`Updated FORENOON for ${course} - Sections: ${sessions.FORENOON.join(', ')}`);
      }
    }
    
    if (sessions.AFTERNOON.length > 0) {
      const { data, error } = await supabase
        .from('students')
        .update({ activity_session: 'AFTERNOON' })
        .eq('course', course)
        .in('section', sessions.AFTERNOON);
        
      if (error) {
        console.error(`Error updating AFTERNOON for ${course}:`, error);
      } else {
        console.log(`Updated AFTERNOON for ${course} - Sections: ${sessions.AFTERNOON.join(', ')}`);
      }
    }
  }
  
  console.log("Batch mapping complete!");
}

run();
