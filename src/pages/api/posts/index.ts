import type { APIRoute } from 'astro';
import { supabase, formatDbError } from '@lib/server/supabase';

// GET /api/posts - 获取文章列表（支持分页、分类、搜索）
export const GET: APIRoute = async ({ url }) => {
  try {
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    const includeContent = url.searchParams.get('includeContent') === 'true';

    let query = supabase
      .from('blog_posts')
      .select(
        includeContent
          ? 'id,slug,title,description,content,category,tags,pub_date,status,created_at,updated_at'
          : 'id,slug,title,description,category,tags,pub_date,status,created_at',
        { count: 'exact' }
      )
      .eq('status', 'published')
      .order('pub_date', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    query = query.range(start, end);

    const { data, error, count } = await query;
    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        data,
        total: count,
        page,
        pageSize,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const msg = formatDbError(error, '获取文章列表');
    console.error('[API /api/posts]', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
