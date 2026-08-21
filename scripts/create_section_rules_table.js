const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const query = `
    CREATE TABLE IF NOT EXISTS public.section_booking_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      course TEXT NOT NULL,
      section TEXT NOT NULL,
      day TEXT NOT NULL,
      allowed_timings JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(course, section, day)
    );

    ALTER TABLE public.section_booking_rules ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Enable read access for all users" ON public.section_booking_rules;
    CREATE POLICY "Enable read access for all users" ON public.section_booking_rules
      FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Enable write access for service role" ON public.section_booking_rules;
    CREATE POLICY "Enable write access for service role" ON public.section_booking_rules
      FOR ALL USING (true);
  `;

  const { error } = await supabase.rpc('execute_sql', { sql: query });
  if (error) {
    console.log("RPC execution failed, trying direct REST for create table if we have a way. Supabase JS doesn't support DDL directly without RPC.");
    console.error(error);
  } else {
    console.log("Table created successfully!");
  }
}
run();
