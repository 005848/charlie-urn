import { getSupabaseClient } from '../src/storage/database/supabase-client';

async function checkTables() {
  const supabase = getSupabaseClient();

  // 检查信息模式
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');

  console.log('Tables in public schema:', data);
  console.log('Error:', error?.message);
}

checkTables();
