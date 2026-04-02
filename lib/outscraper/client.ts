/**
 * Outscraper API client — Google Maps / GMB scraping.
 * Async REST: POST job → poll GET /requests/{id} until status='Success'.
 * Pricing: ~$0.003/record.
 * Docs: https://outscraper.com/google-maps-api/
 */

const BASE_URL = 'https://api.app.outscraper.com';
const POLL_INTERVAL_MS = 5000;
const MAX_WAIT_MS = 5 * 60 * 1000; // 5 min timeout per job

export interface OutscraperPlace {
  place_id: string;
  name: string;
  phone: string | null;
  site: string | null;       // website URL (null if none)
  full_address: string | null;
  city: string | null;
  state: string | null;
  country_code: string | null;
  rating: number | null;
  reviews: number | null;
  photos_count: number | null;
  photo: string | null;       // main photo URL
  photos: string[] | null;    // additional photos
  type: string | null;        // primary category
  subtypes: string | null;    // comma-separated subtypes
  working_hours: Record<string, string> | null;
}

export class OutscraperClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OUTSCRAPER_API_KEY || '';
    if (!this.apiKey) throw new Error('OUTSCRAPER_API_KEY is not set');
  }

  private async request<T>(method: string, path: string, body?: Record<string, any>): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const opts: RequestInit = {
      method,
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Outscraper ${method} ${path}: ${res.status} ${text}`);
    }
    return res.json();
  }

  /**
   * Search Google Maps for businesses.
   * @param query e.g. "hairdressers in Austin, TX"
   * @param limit max results (default 20)
   */
  async searchPlaces(query: string, limit = 20): Promise<OutscraperPlace[]> {
    // Submit async job
    const params = new URLSearchParams({
      query,
      limit: String(limit),
      async: 'true',
      fields: 'place_id,name,phone,site,full_address,city,state,country_code,rating,reviews,photos_count,photo,photos,type,subtypes,working_hours',
    });

    const submitRes = await this.request<{ id: string; status: string; data?: any[] }>(
      'GET',
      `/maps/search-v3?${params}`,
    );

    // If synchronous response (small query)
    if (submitRes.status === 'Success' && submitRes.data) {
      return this.flattenResults(submitRes.data);
    }

    // Poll for async job completion
    const jobId = submitRes.id;
    if (!jobId) throw new Error(`Outscraper: no job ID returned for query "${query}"`);

    return this.pollJob(jobId);
  }

  private async pollJob(jobId: string): Promise<OutscraperPlace[]> {
    const deadline = Date.now() + MAX_WAIT_MS;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

      const status = await this.request<{ id: string; status: string; data?: any[] }>(
        'GET',
        `/requests/${jobId}`,
      );

      if (status.status === 'Success') {
        return this.flattenResults(status.data || []);
      }
      if (status.status === 'Error' || status.status === 'Cancelled') {
        throw new Error(`Outscraper job ${jobId} failed: ${status.status}`);
      }
      // Still running — keep polling
    }
    throw new Error(`Outscraper job ${jobId} timed out after 5 minutes`);
  }

  private flattenResults(data: any[]): OutscraperPlace[] {
    // Outscraper returns array of arrays (one per query)
    const flat: OutscraperPlace[] = [];
    for (const batch of data) {
      if (Array.isArray(batch)) {
        for (const item of batch) flat.push(item as OutscraperPlace);
      } else if (batch && typeof batch === 'object') {
        flat.push(batch as OutscraperPlace);
      }
    }
    return flat;
  }
}
