import { Client } from 'pg';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';

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

const postsDir = path.join(process.cwd(), 'src/content/blog');

async function main() {
  const client = new Client(dbUrl);
  await client.connect();

  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
  console.log(`找到 ${files.length} 篇文章`);

  let count = 0;
  for (const file of files) {
    const filePath = path.join(postsDir, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);
    
    const slug = data.slug || file.replace(/\.mdx?$/, '');
    
    // 检查是否已存在
    const exists = await client.query('SELECT id FROM blog_posts WHERE slug = $1', [slug]);
    if (exists.rows.length > 0) {
      console.log(`  跳过: ${slug} (已存在)`);
      continue;
    }

    // 插入
    await client.query(`
      INSERT INTO blog_posts (slug, title, description, content, category, tags, pub_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      slug,
      data.title || slug,
      data.description || '',
      content.trim(),
      data.category || 'essay',
      data.tags || [],
      data.pubDate || data.date || new Date().toISOString(),
      'published'
    ]);
    
    console.log(`  ✓ 导入: ${slug}`);
    count++;
  }

  // 验证
  const res = await client.query('SELECT count(*) FROM blog_posts WHERE status = $1', ['published']);
  console.log(`\n导入完成！共导入 ${count} 篇，数据库现有 ${res.rows[0].count} 篇已发布文章`);

  await client.end();
}

main().catch(e => {
  console.error('错误:', e);
  process.exit(1);
});
