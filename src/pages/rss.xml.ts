import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from '../consts';
import { getSupabaseClient, loadEnv } from '../storage/database/supabase-client';

export async function GET() {
  await loadEnv();
  const supabase = getSupabaseClient();
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .order('pub_date', { ascending: false })
    .limit(20);

  const items = posts.map(post => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${SITE_URL}/blog/${post.slug}/</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${post.slug}/</guid>
      <description><![CDATA[${post.description || ''}]]></description>
      <pubDate>${new Date(post.pub_date || post.created_at).toUTCString()}</pubDate>
      <category>${post.category || ''}</category>
    </item>
  `).join('');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[${SITE_TITLE}]]></title>
    <link>${SITE_URL}</link>
    <description><![CDATA[${SITE_DESCRIPTION}]]></description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`,
    {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    }
  );
}
