import { Client } from 'pg';
import { execSync } from 'child_process';

// 获取 PGDATABASE_URL
const pythonCode = `
import os
import sys
try:
    from coze_workload_identity import Client
    client = Client()
    env_vars = client.get_project_env_vars()
    client.close()
    for env_var in env_vars:
        if env_var.key == 'PGDATABASE_URL':
            print(env_var.value)
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
`;

const dbUrl = execSync(`python3 -c '${pythonCode.replace(/'/g, "'\"'\"'")}'`, {
  encoding: 'utf-8',
  timeout: 10000,
}).trim();

async function main() {
  const client = new Client(dbUrl);
  await client.connect();

  console.log('开始创建数据库表...');

  // 创建枚举类型
  try {
    await client.query(`CREATE TYPE post_status AS ENUM ('published', 'draft')`);
    console.log('✓ post_status 枚举类型创建成功');
  } catch (e: any) {
    if (e.code === '42710') {
      console.log('  post_status 枚举已存在');
    } else throw e;
  }

  try {
    await client.query(`CREATE TYPE comment_status AS ENUM ('approved', 'pending', 'hidden')`);
    console.log('✓ comment_status 枚举类型创建成功');
  } catch (e: any) {
    if (e.code === '42710') {
      console.log('  comment_status 枚举已存在');
    } else throw e;
  }

  try {
    await client.query(`CREATE TYPE post_category AS ENUM ('memory', 'letter', 'essay', 'photo', 'poem')`);
    console.log('✓ post_category 枚举类型创建成功');
  } catch (e: any) {
    if (e.code === '42710') {
      console.log('  post_category 枚举已存在');
    } else throw e;
  }

  // 创建 blog_posts 表
  await client.query(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id SERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      content TEXT NOT NULL,
      category post_category DEFAULT 'essay',
      tags TEXT[] DEFAULT '{}',
      status post_status DEFAULT 'published',
      view_count INTEGER DEFAULT 0,
      pub_date TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ blog_posts 表创建成功');

  // 创建索引
  await client.query(`
    CREATE INDEX IF NOT EXISTS blog_posts_status_idx ON blog_posts (status)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS blog_posts_category_idx ON blog_posts (category)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS blog_posts_pub_date_idx ON blog_posts (pub_date DESC)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON blog_posts (slug)
  `);
  console.log('✓ blog_posts 索引创建成功');

  // 创建 guestbook_comments 表
  await client.query(`
    CREATE TABLE IF NOT EXISTS guestbook_comments (
      id SERIAL PRIMARY KEY,
      author_name TEXT NOT NULL,
      author_email TEXT,
      content TEXT NOT NULL,
      website TEXT,
      status comment_status DEFAULT 'approved',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ guestbook_comments 表创建成功');

  await client.query(`
    CREATE INDEX IF NOT EXISTS guestbook_comments_status_idx ON guestbook_comments (status)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS guestbook_comments_created_at_idx ON guestbook_comments (created_at DESC)
  `);

  // 创建 visit_stats 表
  await client.query(`
    CREATE TABLE IF NOT EXISTS visit_stats (
      id SERIAL PRIMARY KEY,
      page TEXT NOT NULL,
      visit_date TIMESTAMPTZ DEFAULT NOW(),
      count INTEGER DEFAULT 0
    )
  `);
  console.log('✓ visit_stats 表创建成功');

  // 创建 increment_views 函数
  await client.query(`
    CREATE OR REPLACE FUNCTION increment_views(post_slug TEXT)
    RETURNS VOID AS $$
    BEGIN
      UPDATE blog_posts
      SET view_count = view_count + 1
      WHERE slug = post_slug AND status = 'published';
    END;
    $$ LANGUAGE plpgsql;
  `);
  console.log('✓ increment_views 函数创建成功');

  // 启用 RLS
  await client.query(`ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY`);
  await client.query(`ALTER TABLE guestbook_comments ENABLE ROW LEVEL SECURITY`);
  await client.query(`ALTER TABLE visit_stats ENABLE ROW LEVEL SECURITY`);
  console.log('✓ RLS 已启用');

  // 创建公开读策略（anon 用户可读已发布文章和已审核评论）
  await client.query(`
    DROP POLICY IF EXISTS "Public can read published posts" ON blog_posts
  `);
  await client.query(`
    CREATE POLICY "Public can read published posts" ON blog_posts
      FOR SELECT
      USING (status = 'published')
  `);

  await client.query(`
    DROP POLICY IF EXISTS "Public can read approved comments" ON guestbook_comments
  `);
  await client.query(`
    CREATE POLICY "Public can read approved comments" ON guestbook_comments
      FOR SELECT
      USING (status = 'approved')
  `);

  // 允许匿名用户提交评论
  await client.query(`
    DROP POLICY IF EXISTS "Public can insert comments" ON guestbook_comments
  `);
  await client.query(`
    CREATE POLICY "Public can insert comments" ON guestbook_comments
      FOR INSERT
      WITH CHECK (true)
  `);

  console.log('✓ RLS 策略创建成功');

  // 验证表
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name LIKE 'blog_%' OR table_name LIKE 'guestbook_%' OR table_name = 'visit_stats'
    ORDER BY table_name
  `);
  console.log('\n创建的表:');
  res.rows.forEach((row: any) => console.log('  -', row.table_name));

  await client.end();
  console.log('\n数据库初始化完成！');
}

main().catch(e => {
  console.error('错误:', e);
  process.exit(1);
});
