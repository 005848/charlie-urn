import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || process.env.COZE_SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.COZE_SUPABASE_ANON_KEY || '';

console.log('URL:', url.substring(0, 30) + '...');
console.log('AnonKey set:', !!anonKey);

if (!url || !anonKey) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(url, anonKey);

async function main() {
  console.log('\n=== 测试 anon key 访问 categories ===');
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .limit(5);

  if (error) {
    console.error('❌ 失败:', error.message);
    console.error('  code:', error.code);
    console.error('  details:', error.details);
    console.error('  hint:', error.hint);
  } else {
    console.log('✅ 成功，获取到', data?.length, '条');
    console.log(data);
  }

  console.log('\n=== 测试 anon key 访问 blog_posts ===');
  const { data: posts, error: err2 } = await supabase
    .from('blog_posts')
    .select('id, slug, title')
    .eq('status', 'published')
    .limit(3);

  if (err2) {
    console.error('❌ 失败:', err2.message);
  } else {
    console.log('✅ 成功，获取到', posts?.length, '条');
    posts?.forEach(p => console.log('  -', p.title));
  }

  console.log('\n=== 测试 anon key 访问 memorial_dates ===');
  const { data: md, error: err3 } = await supabase
    .from('memorial_dates')
    .select('*')
    .limit(3);

  if (err3) {
    console.error('❌ 失败:', err3.message);
    console.error('  code:', err3.code);
  } else {
    console.log('✅ 成功，获取到', md?.length, '条');
    console.log(md);
  }
}

main();
