import type { APIRoute } from 'astro';
import { supabase, formatDbError } from '@lib/server/supabase';

// GET /api/posts/[slug] - 根据 slug 获取单篇文章
export const GET: APIRoute = async ({ params }) => {
  try {
    const slug = params.slug as string;

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return new Response(JSON.stringify({ success: false, error: '文章不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 增加浏览量（异步，不阻塞响应）
    (async () => {
      try {
        await supabase.rpc('increment_views', { post_slug: slug });
      } catch {}
    })();

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = formatDbError(error, '获取文章');
    console.error('[API /api/posts/[slug]]', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
