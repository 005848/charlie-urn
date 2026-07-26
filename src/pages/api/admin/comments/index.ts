import type { APIRoute } from 'astro';
import { supabase, formatDbError } from '@lib/server/supabase';

function isValidAdmin(request: Request): boolean {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  const adminToken = import.meta.env.ADMIN_TOKEN || 'charlie-admin-token-2024';
  return token === adminToken;
}

// GET /api/admin/comments - 获取所有留言（含待审核）
export const GET: APIRoute = async ({ request, url }) => {
  if (!isValidAdmin(request)) {
    return new Response(JSON.stringify({ success: false, error: '未授权' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const status = url.searchParams.get('status') || 'all';

    let query = supabase
      .from('guestbook_comments')
      .select('*')
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query.limit(200);
    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = formatDbError(error, '获取留言列表');
    console.error('[API /api/admin/comments GET]', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
