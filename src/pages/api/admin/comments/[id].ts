import type { APIRoute } from 'astro';
import { supabase, formatDbError } from '@lib/server/supabase';

function isValidAdmin(request: Request): boolean {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  const adminToken = import.meta.env.ADMIN_TOKEN || 'charlie-admin-token-2024';
  return token === adminToken;
}

// PUT /api/admin/comments/[id] - 更新留言状态（审核/隐藏）
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
    const { status } = body;

    if (!['approved', 'pending', 'hidden'].includes(status)) {
      return new Response(JSON.stringify({ success: false, error: '无效的状态' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await supabase
      .from('guestbook_comments')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = formatDbError(error, '更新留言');
    console.error('[API /api/admin/comments/[id] PUT]', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE /api/admin/comments/[id] - 删除留言
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
      .from('guestbook_comments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = formatDbError(error, '删除留言');
    console.error('[API /api/admin/comments/[id] DELETE]', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
