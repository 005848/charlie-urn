// 导入示例文章到数据库
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabaseClient } from '../src/storage/database/supabase-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const blogDir = path.join(__dirname, '../src/content/blog');

async function importPosts() {
  const supabase = getSupabaseClient();
  const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

  for (const file of files) {
    const filePath = path.join(blogDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // 解析 frontmatter
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) {
      console.log(`跳过 ${file}：无 frontmatter`);
      continue;
    }

    const fmStr = match[1];
    const body = match[2].trim();

    const frontmatter = {};
    for (const line of fmStr.split('\n')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim();
      let value = line.slice(colonIdx + 1).trim();
      // 去掉引号
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      // 解析数组
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          value = JSON.parse(value.replace(/'/g, '"'));
        } catch {
          value = value.slice(1, -1).split(',').map(s => s.trim().replace(/['"]/g, ''));
        }
      }
      frontmatter[key] = value;
    }

    const slug = file.replace(/\.(md|mdx)$/, '');

    // 检查是否已存在
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existing) {
      console.log(`跳过 ${slug}：已存在`);
      continue;
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        slug,
        title: frontmatter.title || slug,
        description: frontmatter.description || '',
        content: body,
        category: frontmatter.category || 'essay',
        tags: frontmatter.tags || [],
        pub_date: frontmatter.pubDate || new Date().toISOString(),
        status: 'published',
      })
      .select()
      .single();

    if (error) {
      console.error(`导入 ${slug} 失败:`, error.message);
    } else {
      console.log(`✓ 导入成功: ${frontmatter.title}`);
    }
  }

  console.log('\n导入完成');
}

importPosts();
