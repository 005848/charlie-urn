import { loadEnv } from '../src/storage/database/supabase-client';

async function main() {
  await loadEnv();
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL?.substring(0, 30));
  console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY?.substring(0, 20));
  console.log('COZE_SUPABASE_URL:', process.env.COZE_SUPABASE_URL?.substring(0, 30));
  console.log('COZE_SUPABASE_ANON_KEY:', process.env.COZE_SUPABASE_ANON_KEY?.substring(0, 20));
}
main();
