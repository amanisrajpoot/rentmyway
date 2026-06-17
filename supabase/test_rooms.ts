import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data, error } = await supabase.from('pg_rooms').select('*');
  console.log('Rooms count:', data?.length);
  console.log('Rooms:', data);
  if (error) console.error('Error:', error);
}

main();
