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

// ========== 媒体上传 ==========

const MEDIA_BUCKET = 'media';

export type MediaFile = {
  name: string;
  url: string;
  size: number;
  type: string;
  created_at: string;
};

export async function uploadFile(file: File, folder = ''): Promise<{ url: string; name: string }> {
  const supabase = getSupabase();
  const timestamp = Date.now();
  const safeName = `${folder ? folder + '/' : ''}${timestamp}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(safeName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw new Error('上传失败：' + error.message);

  const { data: urlData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(data.path);

  return { url: urlData.publicUrl, name: data.path };
}

export async function listMediaFiles(folder = ''): Promise<MediaFile[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).list(folder, {
    limit: 100,
    offset: 0,
    sortBy: { column: 'created_at', order: 'desc' },
  });

  if (error) throw new Error('获取文件列表失败：' + error.message);
  if (!data) return [];

  return data
    .filter(f => f.name !== '.emptyFolderPlaceholder')
    .map(f => {
      const fullPath = folder ? `${folder}/${f.name}` : f.name;
      const { data: urlData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(fullPath);
      return {
        name: f.name,
        url: urlData.publicUrl,
        size: f.metadata?.size || 0,
        type: f.metadata?.mimetype || '',
        created_at: f.created_at || '',
      };
    });
}

export async function deleteMediaFile(filePath: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([filePath]);
  if (error) throw new Error('删除失败：' + error.message);
}

export function getFileType(fileName: string): 'image' | 'video' | 'audio' | 'other' {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (!ext) return 'other';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm'].includes(ext)) return 'audio';
  return 'other';
}

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
