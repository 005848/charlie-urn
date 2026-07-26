// 管理员鉴权工具（前端用）
const TOKEN_KEY = 'charlie_admin_token';

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return !!getAdminToken();
}

export async function adminFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAdminToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  headers.set('Content-Type', 'application/json');

  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    clearAdminToken();
    if (!window.location.pathname.startsWith('/admin/login')) {
      window.location.href = '/admin/login';
    }
  }
  return response;
}

export function requireAuth(): void {
  if (typeof window === 'undefined') return;
  if (!isLoggedIn()) {
    window.location.href = '/admin/login';
  }
}
