export const API_BASE = (globalThis as any).__API_BASE__ || '';
export const API_TOKEN = (globalThis as any).__API_TOKEN__ || '';

async function api(path: string, params?: Record<string, any>) {
  if (!API_BASE) throw new Error('API_BASE не задан. Укажи VITE_API_BASE');
  const url = new URL(path, API_BASE);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString(), {
    headers: API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : undefined
  });
  if (!res.ok) throw new Error('API error ' + res.status);
  return res.json();
}

export const CatalogAPI = {
  decodeVIN: (vin: string) => api('/vin/decode', { vin }),
  searchByTree: (opts: { make?: string; model?: string; year?: number; category?: string; subcategory?: string; q?: string }) =>
    api('/catalog/search', opts),
  partsForNode: (opts: { make: string; model: string; year?: number; category: string; subcategory: string }) =>
    api('/catalog/parts', opts),
  oemForPart: (opts: { make: string; model: string; partId?: string; name?: string }) =>
    api('/catalog/oem', opts),
};