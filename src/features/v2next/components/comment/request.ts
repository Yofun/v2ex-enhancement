// 对应原脚本里的 $.post：同源请求，带 X-Requested-With，非 2xx 视为失败
async function post(url: string, data?: Record<string, string>): Promise<Response> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      ...(data ? { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' } : {}),
    },
    body: data ? new URLSearchParams(data).toString() : undefined,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

export async function postForText(url: string, data?: Record<string, string>): Promise<string> {
  return (await post(url, data)).text();
}

export async function postForJson<T>(url: string, data?: Record<string, string>): Promise<T> {
  return (await post(url, data)).json() as Promise<T>;
}
