import { getSupabaseClient } from '../src/storage/database/supabase-client';

async function createAdmin() {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email: 'admin@charlie.urn',
    password: 'admin123456',
    email_confirm: true,
    user_metadata: { role: 'admin', name: 'Charlie' },
  });

  if (error) {
    console.error('创建失败:', error.message);
  } else {
    console.log('创建成功:', data.user?.id, data.user?.email);
  }
}

createAdmin().catch(console.error);
