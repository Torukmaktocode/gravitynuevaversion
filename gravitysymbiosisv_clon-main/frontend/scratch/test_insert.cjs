const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://nqaiuixiryqlcszikwgb.supabase.co';
// Use anon key - same as what the frontend uses
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xYWl1aXhpcnlxbGNzemlrd2diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzQ0NTcsImV4cCI6MjA4NDE1MDQ1N30.zV8cD_bmrx7mKauSljbOVRu7B25msHsMOD2qh6PSrBE';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  // Check if we're authenticated (we won't be - anon)
  const { data: { session } } = await supabase.auth.getSession();
  console.log('Session:', session ? `Authenticated as ${session.user.email}` : 'NOT authenticated (anon)');

  // Try inserting as anon - should fail due to RLS
  const todayStr = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('daily_metrics')
    .insert({
      user_id: '00000000-0000-0000-0000-000000000000', // fake uuid
      day: todayStr,
      training_minutes: 1,
      sessions: 1,
      avg_score: 0,
    });
  console.log('Insert as anon result:', data, 'error:', error?.message);
}
run();
