const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://nqaiuixiryqlcszikwgb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xYWl1aXhpcnlxbGNzemlrd2diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzQ0NTcsImV4cCI6MjA4NDE1MDQ1N30.zV8cD_bmrx7mKauSljbOVRu7B25msHsMOD2qh6PSrBE';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const USER_ID = 'dbaecc81-194d-4131-9b25-873640e08f6e'; // from the JWT in errors

  const { data: kp, error: kpErr } = await supabase
    .from('knowledge_progress')
    .select('*')
    .eq('user_id', USER_ID);
  console.log('knowledge_progress rows:', JSON.stringify(kp, null, 2), kpErr?.message);

  const { data: dm, error: dmErr } = await supabase
    .from('daily_metrics')
    .select('*')
    .eq('user_id', USER_ID);
  console.log('daily_metrics rows:', JSON.stringify(dm, null, 2), dmErr?.message);
}
run();
