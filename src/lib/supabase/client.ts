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

function getSupabaseConfig() {
  if (typeof document === 'undefined') return { url: '', anonKey: '' };
  const url = document.querySelector('meta[name="x-supabase-url"]')?.getAttribute('content') || '';
  const anonKey = document.querySelector('meta[name="x-supabase-anon-key"]')?.getAttribute('content') || '';
  return { url, anonKey };
}

// 管理员鉴权
export async function isAdmin(): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  } catch {
    return false;
  }
}

// ========== 文章相关 ==========

export async function getPublishedPosts(options: { category?: string; tag?: string; search?: string; limit?: number } = {}) {
  const supabase = getSupabase();
  let query = supabase
    .from('blog_posts')
    .select('id, slug, title, description, category, tags, pub_date, view_count, like_count, cover_image')
    .eq('status', 'published')
    .order('pub_date', { ascending: false });

  if (options.category && options.category !== 'all') {
    query = query.eq('category', options.category);
  }
  if (options.search) {
    query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getPostBySlug(slug: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error) throw error;
  return data;
}

export async function incrementView(slug: string) {
  try {
    const supabase = getSupabase();
    await supabase.rpc('increment_view_count', { post_slug: slug });
  } catch (e) {
    // 静默失败，不影响阅读
    console.warn('增加浏览量失败', e);
  }
}

// ========== 分类相关 ==========

export async function getCategories() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createCategory(name: string, slug: string, description?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('categories')
    .insert({ name, slug, description })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(id: string, updates: Record<string, any>) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

// ========== 标签相关 ==========

export async function getTags() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createTag(name: string) {
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('tags')
    .insert({ name, slug })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTag(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from('tags').delete().eq('id', id);
  if (error) throw error;
}

// ========== 留言相关 ==========

export async function getApprovedComments() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('guestbook_comments')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function submitComment(comment: { author_name: string; author_email?: string; content: string; website?: string }) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('guestbook_comments')
    .insert(comment)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ========== 媒体文件 ==========

export async function uploadFile(file: File, folder: string = 'uploads'): Promise<string> {
  const supabase = getSupabase();
  const ext = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from('media')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (error) throw error;
  return getPublicUrl(fileName);
}

export function getPublicUrl(filePath: string): string {
  const supabase = getSupabase();
  const { data } = supabase.storage.from('media').getPublicUrl(filePath);
  return data.publicUrl;
}

export async function listMediaFiles(folder: string = '') {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from('media')
    .list(folder, { limit: 100, offset: 0, sortBy: { column: 'created_at', order: 'desc' } });
  if (error) throw error;
  return data || [];
}

export async function deleteMediaFile(filePath: string) {
  const supabase = getSupabase();
  const { error } = await supabase.storage.from('media').remove([filePath]);
  if (error) throw error;
}

export function getFileType(name: string): 'image' | 'video' | 'audio' | 'other' {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'webm', 'm4a', 'aac'].includes(ext)) return 'audio';
  return 'other';
}

// ========== 点赞 ==========

export async function likePost(postId: string): Promise<{ liked: boolean; count: number }> {
  const supabase = getSupabase();
  const visitorId = getVisitorId();

  // 先检查是否已经点过赞
  const { data: existing } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('visitor_id', visitorId)
    .maybeSingle();

  if (existing) {
    // 取消点赞
    await supabase.from('post_likes').delete().eq('id', existing.id);
    const { data } = await supabase.rpc('decrement_like_count', { post_id_param: postId });
    return { liked: false, count: data || 0 };
  } else {
    // 点赞
    await supabase.from('post_likes').insert({ post_id: postId, visitor_id: visitorId });
    const { data } = await supabase.rpc('increment_like_count', { post_id_param: postId });
    return { liked: true, count: data || 0 };
  }
}

export async function hasLikedPost(postId: string): Promise<boolean> {
  const supabase = getSupabase();
  const visitorId = getVisitorId();
  const { data } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('visitor_id', visitorId)
    .maybeSingle();
  return !!data;
}

function getVisitorId(): string {
  let id = localStorage.getItem('visitor_id');
  if (!id) {
    id = 'visitor_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('visitor_id', id);
  }
  return id;
}

// ========== 管理后台 ==========

export async function adminGetAllPosts() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title, category, status, pub_date, view_count, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function adminGetPost(id: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function adminCreatePost(post: Record<string, any>) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('blog_posts')
    .insert(post)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function adminUpdatePost(id: string, updates: Record<string, any>) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('blog_posts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function adminDeletePost(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from('blog_posts').delete().eq('id', id);
  if (error) throw error;
}

export async function adminGetAllComments() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('guestbook_comments')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function adminUpdateCommentStatus(id: string, status: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('guestbook_comments')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function adminDeleteComment(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from('guestbook_comments').delete().eq('id', id);
  if (error) throw error;
}
