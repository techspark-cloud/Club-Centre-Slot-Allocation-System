const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Setting up holidays table...");
  
  // SQL to create holidays table
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS public.holidays (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      date DATE NOT NULL UNIQUE,
      description TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

    -- Anyone can read holidays
    CREATE POLICY "Allow public read access on holidays"
      ON public.holidays FOR SELECT
      TO public, authenticated, anon
      USING (true);
      
    -- Only service role (or admins) can insert/update/delete
    CREATE POLICY "Allow service role full access on holidays"
      ON public.holidays FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  `;
  
  // Since we can't run raw SQL directly through the JS client easily without a stored procedure,
  // we can use a temporary workaround if no stored procedure exists, or just use the REST API.
  // We'll create a stored procedure if we need to, but often we can just use the supabase UI.
  // Actually, let's see if we can create it via an HTTP request or just let the user know to run it in SQL editor.
  // Let's try calling rpc if there's a generic one, or we can just try inserting a row and see if the table auto-creates? No, Supabase doesn't auto-create tables.
  
  console.log("Please run this SQL in your Supabase SQL Editor:");
  console.log(createTableSQL);
}

run();
