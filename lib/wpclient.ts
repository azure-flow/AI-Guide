// lib/wpclient.ts
// Resolve endpoint lazily to avoid failing the build at import time on Vercel
function getWpEndpoint(): string {
  const url = process.env.WP_GRAPHQL_ENDPOINT;
  if (!url || url.trim() === '') {
    throw new Error('WP_GRAPHQL_ENDPOINT is not set');
  }
  return url;
}

type FetchOpts = {
  revalidate?: number;
  tags?: string[];
};

export async function wpFetch<T>(
  query: string,
  variables: Record<string, any> = {},
  opts: FetchOpts = {}
) {
  const { revalidate = 60, tags } = opts;

  // Dev mode: disable caching for immediate updates
  const isDev = process.env.NODE_ENV === 'development';
  
  // Clean cache policy: use one approach only
  const fetchOpts: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  };

  if (isDev) {
    // Option A: no cache (dev)
    fetchOpts.cache = "no-store";
  } else {
    // Option B: ISR (prod)
    fetchOpts.next = { revalidate, ...(tags ? { tags } : {}) };
  }

  const endpoint = getWpEndpoint();
  
  // Add timeout to prevent hanging requests (30 seconds)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
  try {
    const res = await fetch(endpoint, { ...fetchOpts, signal: controller.signal });
    clearTimeout(timeoutId);

    // Check content type before parsing
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 200)}`);
    }

    const json = await res.json();
    if (!res.ok || json.errors) {
      throw new Error(JSON.stringify(json.errors ?? res.status));
    }
    return json.data as T;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout: WordPress API did not respond within 30 seconds');
    }
    throw error;
  }
}
