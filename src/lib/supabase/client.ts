// 浏览器端 Supabase 客户端（使用 anon key）
import { createClient } from '@supabase/supabase-js';

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (typeof window === 'undefined') {
    throw new Error('getSupabase() 只能在浏览器端调用');
  }
  if (supabaseInstance) return supabaseInstance;

  const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

  if (!url || !anonKey) {
    console.warn('[Supabase] 未配置 PUBLIC_SUPABASE_URL 或 PUBLIC_SUPABASE_ANON_KEY');
  }

  supabaseInstance = createClient(url || '', anonKey || '', {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return supabaseInstance;
}

// 从 meta 标签读取配置信息
export function getSupabaseConfig() {
  if (typeof document ) {
    const url = document.querySelector<HTMLMetaElement>('meta[name="x-supabase-url"]')?.content;
    const anonKey = document.querySelector<HTMLMetaElement>('meta[name="x-supabase-anon-key"]')?.content;
    if (url && anonKey) return { url, anonKey };
  }
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  return { url, anonKey };
}

export type Post = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  content: string;
  category: 'memory' | 'letter' | 'essay' | 'photo' | 'poem';
  tags: string[] | null;
  pub_date: string;
  status: 'published' | 'draft' | 'archived';
  view_count: number;
  created_at: string;
  updated_at: string;
};

export type Comment = {
  id: number;
  post_id: number | null;
  author_name: string;
  author_email: string | null;
  content: string;
  website: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};
