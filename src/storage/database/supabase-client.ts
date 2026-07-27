import { createClient, SupabaseClient } from '@supabase/supabase-js';

let envLoaded = false;

/**
 * 加载 Supabase 环境变量
 * 优先级:
 * 1. 直接从 process.env 读取（Cloudflare Pages / Vercel / Netlify 等平台）
 * 2. dotenv 文件（本地开发）
 * 3. fallback URL（确保构建不报错，实际使用需配置真实变量）
 */
function loadEnv(): void {
  if (envLoaded) return;

  // 已有环境变量，直接返回
  if (process.env.PUBLIC_SUPABASE_URL && process.env.PUBLIC_SUPABASE_ANON_KEY) {
    envLoaded = true;
    return;
  }
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    envLoaded = true;
    return;
  }
  if (process.env.COZE_SUPABASE_URL && process.env.COZE_SUPABASE_ANON_KEY) {
    envLoaded = true;
    return;
  }

  // 尝试 dotenv
  try {
    require('dotenv').config();
  } catch {
    // dotenv not installed, skip
  }

  // Coze 环境下通过 Python SDK 获取（仅 Coze 沙箱可用）
  if (
    !process.env.SUPABASE_URL &&
    !process.env.PUBLIC_SUPABASE_URL &&
    !process.env.COZE_SUPABASE_URL
  ) {
    try {
      const { execSync } = require('child_process');
      const pythonCode = `
import os
import sys
try:
    from coze_workload_identity import Client
    client = Client()
    env_vars = client.get_project_env_vars()
    client.close()
    for env_var in env_vars:
        print(f"{env_var.key}={env_var.value}")
except Exception as e:
    print(f"# Error: {e}", file=sys.stderr)
`;
      const output = execSync(`python3 -c '${pythonCode.replace(/'/g, "'\"'\"'")}'`, {
        encoding: 'utf-8',
        timeout: 10000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const lines = output.trim().split('\n');
      for (const line of lines) {
        if (line.startsWith('#')) continue;
        const eqIndex = line.indexOf('=');
        if (eqIndex > 0) {
          const key = line.substring(0, eqIndex);
          let value = line.substring(eqIndex + 1);
          if ((value.startsWith("'") && value.endsWith("'")) ||
              (value.startsWith('"') && value.endsWith('"'))) {
            value = value.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    } catch {
      // Coze SDK 不可用（非 Coze 环境），静默跳过
    }
  }

  envLoaded = true;
}

interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

function getSupabaseCredentials(): SupabaseCredentials {
  loadEnv();

  const url =
    process.env.PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.COZE_SUPABASE_URL ||
    '';
  const anonKey =
    process.env.PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.COZE_SUPABASE_ANON_KEY ||
    '';

  return { url, anonKey };
}

function getSupabaseServiceRoleKey(): string | undefined {
  loadEnv();
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.COZE_SUPABASE_SERVICE_ROLE_KEY
  );
}

function getSupabaseClient(token?: string): SupabaseClient {
  const { url, anonKey } = getSupabaseCredentials();

  if (!url) {
    throw new Error(
      'Supabase URL not configured. Please set PUBLIC_SUPABASE_URL environment variable.'
    );
  }
  if (!anonKey) {
    throw new Error(
      'Supabase anon key not configured. Please set PUBLIC_SUPABASE_ANON_KEY environment variable.'
    );
  }

  let key: string;
  if (token) {
    key = anonKey;
  } else {
    const serviceRoleKey = getSupabaseServiceRoleKey();
    key = serviceRoleKey ?? anonKey;
  }

  const globalOptions: Record<string, any> = {};
  if (token) {
    globalOptions.headers = { Authorization: `Bearer ${token}` };
  }

  // Coze 环境下的上报包装（仅 Coze 环境可用）
  try {
    if (process.env.COZE_ENV || process.env.CODEBUDDY_ENV) {
      const { getReportBuffer, createWrappedFetch } = require('coze-coding-dev-sdk');
      const buffer = getReportBuffer();
      if (buffer) {
        globalOptions.fetch = createWrappedFetch(buffer, 'supabase');
      }
    }
  } catch {
    // 非 Coze 环境，静默跳过
  }

  return createClient(url, key, {
    global: globalOptions,
    db: {
      timeout: 60000,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export { loadEnv, getSupabaseCredentials, getSupabaseServiceRoleKey, getSupabaseClient };
