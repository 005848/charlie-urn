import type { APIRoute } from 'astro';
import { supabase, formatDbError } from '@lib/server/supabase';

function isValidAdmin(request: Request): boolean {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  // ⚠️ 简化版本：与登录页的 admin token 保持一致
  const adminToken = import.meta.env.ADMIN_TOKEN || 'charlie-admin-token-2024';
  return token === adminToken;
}

// GET /api/admin/posts - 获取所有文章（含草稿）
export const GET: APIRoute = async ({ request, url }) => {
  if (!isValidAdmin(request)) {
    return new Response(JSON.stringify({ success: false, error: '未授权' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50', 10);
    const status = url.searchParams.get('status') || 'all';

    let query = supabase
      .from('blog_posts')
      .select('id,slug,title,description,category,status,pub_date,created_at,updated_at', { count: 'exact' })
      .order('pub_date', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
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
    console.error('[API /api/admin/posts GET]', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST /api/admin/posts - 创建文章
export const POST: APIRoute = async ({ request }) => {
  if (!isValidAdmin(request)) {
    return new Response(JSON.stringify({ success: false, error: '未授权' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { slug, title, description, content, category, tags, status } = body;

    if (!slug || !title || !content) {
      return new Response(JSON.stringify({ success: false, error: '缺少必填字段' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        slug,
        title,
        description: description || '',
        content,
        category: category || 'essay',
        tags: tags || [],
        status: status || 'published',
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = formatDbError(error, '创建文章');
    console.error('[API /api/admin/posts POST]', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
