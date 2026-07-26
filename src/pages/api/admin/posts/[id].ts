import type { APIRoute } from 'astro';
import { supabase, formatDbError } from '@lib/server/supabase';

function isValidAdmin(request: Request): boolean {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  const adminToken = import.meta.env.ADMIN_TOKEN || 'charlie-admin-token-2024';
  return token === adminToken;
}

// GET /api/admin/posts/[id] - 获取单篇文章详情
export const GET: APIRoute = async ({ request, params }) => {
  if (!isValidAdmin(request)) {
    return new Response(JSON.stringify({ success: false, error: '未授权' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const id = params.id as string;

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return new Response(JSON.stringify({ success: false, error: '文章不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = formatDbError(error, '获取文章');
    console.error('[API /api/admin/posts/[id] GET]', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PUT /api/admin/posts/[id] - 更新文章
export const PUT: APIRoute = async ({ request, params }) => {
  if (!isValidAdmin(request)) {
    return new Response(JSON.stringify({ success: false, error: '未授权' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const id = params.id as string;
    const body = await request.json();
    const { title, slug, description, content, category, tags, status, pub_date } = body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (content !== undefined) updateData.content = content;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags;
    if (status !== undefined) updateData.status = status;
    if (pub_date !== undefined) updateData.pub_date = pub_date;

    const { data, error } = await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = formatDbError(error, '更新文章');
    console.error('[API /api/admin/posts/[id] PUT]', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE /api/admin/posts/[id] - 删除文章
export const DELETE: APIRoute = async ({ request, params }) => {
  if (!isValidAdmin(request)) {
    return new Response(JSON.stringify({ success: false, error: '未授权' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const id = params.id as string;

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = formatDbError(error, '删除文章');
    console.error('[API /api/admin/posts/[id] DELETE]', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
