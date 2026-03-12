let API_BASE = '';
try {
  // 允许通过 localStorage 的 api_base 快速切换（优先级最高）
  const saved = typeof localStorage !== 'undefined' && localStorage.getItem('api_base');
  if (saved && typeof saved === 'string' && saved.startsWith('http')) {
    API_BASE = saved.replace(/\/$/, '');
  } else {
    // 允许在 index.html 里通过 window.__API_BASE__ 直接指定
    const override = typeof window !== 'undefined' && window.__API_BASE__;
    if (override && typeof override === 'string' && override.startsWith('http')) {
      API_BASE = override.replace(/\/$/, '');
    } else {
      // 默认根据当前域名推导 API 基址（将 admin/web/mobile.* 映射为 api.*）。
      if (typeof location !== 'undefined' && location.protocol && location.hostname) {
        const proto = location.protocol || 'http:';
        const host = location.hostname || '127.0.0.1';
        const apiHost = host.replace(/^(admin|web|mobile)\./, 'api.');
        const port = location.port || '';
        const isDefaultPort = !port || port === '80' || port === '443';
        // 若当前页面是 dev server 端口（如 8080/8082/5173），后端通常在 8000
        const apiPort = isDefaultPort ? '' : ':8000';
        API_BASE = `${proto}//${apiHost}${apiPort}`.replace(/\/$/, '');
      } else {
        API_BASE = 'http://127.0.0.1:8000';
      }
    }
  }
} catch (e) {
  API_BASE = 'http://127.0.0.1:8000';
}

function getTokens() {
  return {
    access: localStorage.getItem('access') || '',
    refresh: localStorage.getItem('refresh') || '',
  };
}

function setTokens(access, refresh) {
  if (access) localStorage.setItem('access', access);
  if (refresh) localStorage.setItem('refresh', refresh);
}

function clearTokens() {
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');
}

async function doFetch(url, options) {
  const res = await fetch(url, options);
  const ctype = res.headers.get('content-type') || '';
  const data = ctype.includes('application/json') ? await res.json().catch(() => ({})) : await res.text();
  if (!res.ok) {
    const err = new Error((data && data.detail) || res.statusText || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function request(path, { method = 'GET', headers = {}, body, query } = {}) {
  const url = new URL(API_BASE + path);
  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).length) url.searchParams.set(k, v);
    });
  }
  const tokens = getTokens();
  const h = { 'Accept': 'application/json', ...headers };
  if (!(body instanceof FormData)) h['Content-Type'] = 'application/json';
  if (tokens.access) h['Authorization'] = `Bearer ${tokens.access}`;
  const opts = { method, headers: h };
  if (body !== undefined) opts.body = body instanceof FormData ? body : JSON.stringify(body);

  try {
    return await doFetch(url.toString(), opts);
  } catch (e) {
    if (e && e.status === 401 && tokens.refresh) {
      try {
        const r = await doFetch(`${API_BASE}/api/token/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ refresh: tokens.refresh }),
        });
        setTokens(r.access, tokens.refresh);
        const h2 = { ...h, Authorization: `Bearer ${r.access}` };
        const opts2 = { method, headers: h2 };
        if (body !== undefined) opts2.body = body instanceof FormData ? body : JSON.stringify(body);
        return await doFetch(url.toString(), opts2);
      } catch (_) {
        clearTokens();
        throw e;
      }
    }
    throw e;
  }
}

export const http = { request, getTokens, setTokens, clearTokens, API_BASE };
// 同时导出具名方法，便于按需动态导入（router.beforeEach 中使用）
export { getTokens, setTokens, clearTokens, request, API_BASE };
