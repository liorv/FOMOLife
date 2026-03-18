const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const channel = supabase.channel('user-test');
channel.subscribe(async (status) => {
  if (status === 'SUBSCRIBED') {
    const res = await channel.send({ type: 'broadcast', event: 'test', payload: { ok: true } });
    console.log('sent', res);
    process.exit(0);
  }
});
