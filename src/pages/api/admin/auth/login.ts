import type { APIRoute } from 'astro';
import { supabase, handleDbError } from '@lib/server/supabase';

function isValidAdmin(request: Request): boolean {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  const adminToken = import.meta.env.ADMIN_TOKEN || 'charlie-admin-token-2024';
  return token === adminToken;
}

// POST /api/admin/auth/login - 验证管理员密码
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { password } = body;

    const adminPassword = import.meta.env.ADMIN_PASSWORD || 'charlie2024';
    const adminToken = import.meta.env.ADMIN_TOKEN || 'charlie-admin-token-2024';

    if (password === adminPassword) {
      return new Response(
        JSON.stringify({
          success: true,
          token: adminToken,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ success: false, error: '密码错误' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ success: false, error: '登录失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
