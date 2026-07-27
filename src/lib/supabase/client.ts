// 浏览器端 Supabase 客户端（使用 anon key）
import { createClient } from '@supabase/supabase-js';

// 硬编码兜底配置（部署时无环境变量也能正常运行）
const FALLBACK_URL = 'https://fmjdtehxewybtgokzmob.supabase.co';
const FALLBACK_ANON_KEY = 'sb_publishable_ann2PFDdRhFc570RXcbpiQ_2vIoUUiS';

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (typeof window === 'undefined') {
    throw new Error('getSupabase() 只能在浏览器端调用');
  }
  if (supabaseInstance) return supabaseInstance;

  const { url, anonKey } = getSupabaseConfig();

  if (!url || !anonKey) {
    console.warn('[Supabase] 未配置 Supabase URL 或 ANON_KEY');
  }

  supabaseInstance = createClient(url || FALLBACK_URL, anonKey || FALLBACK_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return supabaseInstance;
}

// 从 meta 标签读取配置信息，兜底用环境变量或硬编码值
export function getSupabaseConfig() {
  if (typeof document !== 'undefined') {
    const url = document.querySelector<HTMLMetaElement>('meta[name="x-supabase-url"]')?.content;
    const anonKey = document.querySelector<HTMLMetaElement>('meta[name="x-supabase-anon-key"]')?.content;
    if (url && anonKey) return { url, anonKey };
  }
  const envUrl = (import.meta as any).env?.PUBLIC_SUPABASE_URL;
  const envKey = (import.meta as any).env?.PUBLIC_SUPABASE_ANON_KEY;
  return {
    url: envUrl || FALLBACK_URL,
    anonKey: envKey || FALLBACK_ANON_KEY,
  };
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
