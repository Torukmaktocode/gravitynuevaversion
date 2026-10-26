const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://nqaiuixiryqlcszikwgb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xYWl1aXhpcnlxbGNzemlrd2diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzQ0NTcsImV4cCI6MjA4NDE1MDQ1N30.zV8cD_bmrx7mKauSljbOVRu7B25msHsMOD2qh6PSrBE';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  // Test if quiz_answers column exists
  const { data: q, error: qErr } = await supabase
    .from('daily_metrics')
    .select('quiz_answers')
    .limit(1);
  console.log('quiz_answers column exists:', !qErr, qErr?.message || '');

  // Test if closer_count column exists
  const { data: c, error: cErr } = await supabase
    .from('daily_metrics')
    .select('closer_count')
    .limit(1);
  console.log('closer_count column exists:', !cErr, cErr?.message || '');

  // Check all columns in a row
  const { data: row, error: rowErr } = await supabase
    .from('daily_metrics')
    .select('*')
    .limit(1);
  console.log('Full row sample:', JSON.stringify(row), rowErr?.message || '');
}
run();
