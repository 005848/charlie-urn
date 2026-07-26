import type { APIRoute } from 'astro';
import { supabase, formatDbError } from '@lib/server/supabase';

// GET /api/comments - 获取留言列表
export const GET: APIRoute = async ({ url }) => {
  try {
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50', 10);

    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    const { data, error, count } = await supabase
      .from('guestbook_comments')
      .select('*', { count: 'exact' })
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .range(start, end);

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
    const msg = formatDbError(error, '获取留言');
    console.error('[API /api/comments GET]', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST /api/comments - 提交留言
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { author_name, author_email, content, website } = body;

    if (!author_name || !content) {
      return new Response(JSON.stringify({ success: false, error: '姓名和内容不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 简单的内容长度限制
    if (content.length > 500) {
      return new Response(JSON.stringify({ success: false, error: '留言内容不能超过500字' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await supabase
      .from('guestbook_comments')
      .insert({
        author_name: author_name.trim().slice(0, 50),
        author_email: author_email?.trim().slice(0, 100) || null,
        content: content.trim(),
        website: website?.trim().slice(0, 200) || null,
        status: 'approved', // 默认直接通过，也可设为 pending 需要审核
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = formatDbError(error, '提交留言');
    console.error('[API /api/comments POST]', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
