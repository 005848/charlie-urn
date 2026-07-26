import { getSupabaseClient } from '@storage/database/supabase-client';

export const supabase = getSupabaseClient();

// 通用错误处理 - 返回格式化的错误信息
export function formatDbError(error: unknown, operation: string): string {
  if (error instanceof Error) {
    return `${operation}失败: ${error.message}`;
  }
  // Supabase PostgrestError 是普通对象
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    const msg = err.message || err.details || err.code || JSON.stringify(error);
    return `${operation}失败: ${msg}`;
  }
  return `${operation}失败: ${String(error)}`;
}

// 抛出格式化错误
export function handleDbError(error: unknown, operation: string): never {
  throw new Error(formatDbError(error, operation));
}
