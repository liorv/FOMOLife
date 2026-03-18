const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL=')).split('=')[1].replace(/"/g, '');
const key = env.split('\n').find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY=') || l.startsWith('SUPABASE_ANON_KEY='))?.split('=')[1].replace(/"/g, '');
const supabase = createClient(url, key);
async function main() {
  const { data, error } = await supabase.from('user_data').select('data').eq('id', 'sys_trace_logs').single();
  if (error) { console.error('Error', error); return; }
  fs.writeFileSync('trace2.json', JSON.stringify(data.data, null, 2));
  console.log('Trace downloaded to trace2.json');
}
main();
