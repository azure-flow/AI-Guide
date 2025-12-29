// lib/wpclient.ts
// Resolve endpoint lazily to avoid failing the build at import time on Vercel
function getWpEndpoint(): string {
  const url = process.env.WP_GRAPHQL_ENDPOINT || 'https://cms.ai-plaza.io/graphql';
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
  const { revalidate = 0, tags } = opts; // Default to 0 for always fresh data

  // Always fetch fresh data from WordPress (no caching)
  // This ensures pages always get latest data and show errors when WordPress is down
  const fetchOpts: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store", // Always fetch fresh - no caching
  };

  const endpoint = getWpEndpoint();
  
  // Add timeout to prevent hanging requests (30 seconds)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
  try {
    const res = await fetch(endpoint, { ...fetchOpts, signal: controller.signal });
    clearTimeout(timeoutId);

    // Check if WordPress is down
    if (!res.ok) {
      const statusText = res.statusText || 'Unknown error';
      throw new Error(`WordPress API error: ${res.status} ${statusText}. The WordPress server may be down.`);
    }

    // Check content type before parsing
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 200)}`);
    }

    const json = await res.json();
    if (json.errors) {
      throw new Error(`WordPress GraphQL errors: ${JSON.stringify(json.errors)}`);
    }
    
    if (!json.data) {
      throw new Error('WordPress API returned no data. The server may be down or misconfigured.');
    }
    
    return json.data as T;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('WordPress API timeout: Server did not respond within 30 seconds. The server may be down.');
    }
    // Re-throw with more context
    if (error.message) {
      throw error;
    }
    throw new Error(`WordPress API error: ${error.message || 'Unknown error'}`);
  }
}
