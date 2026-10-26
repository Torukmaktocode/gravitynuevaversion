const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://nqaiuixiryqlcszikwgb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xYWl1aXhpcnlxbGNzemlrd2diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzQ0NTcsImV4cCI6MjA4NDE1MDQ1N30.zV8cD_bmrx7mKauSljbOVRu7B25msHsMOD2qh6PSrBE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('knowledge_progress').select('*');
  console.log("knowledge_progress:", data);
}
run();
