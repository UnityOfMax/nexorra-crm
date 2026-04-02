/**
 * Apollo.io email enrichment client.
 * Free tier: 10,000 enrichments/month.
 * Used to find business owner email when not listed on GMB.
 * Docs: https://apolloio.github.io/apollo-api-docs/
 */

const BASE_URL = 'https://api.apollo.io/v1';

export interface ApolloEnrichResult {
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  linkedin_url: string | null;
}

export class ApolloClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.APOLLO_API_KEY || '';
    if (!this.apiKey) throw new Error('APOLLO_API_KEY is not set');
  }

  private async request<T>(method: string, path: string, body?: Record<string, any>): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const opts: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': this.apiKey,
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (res.status === 429) {
      // Rate limited — wait 60s and retry
      console.log('[apollo] Rate limited, waiting 60s...');
      await new Promise(r => setTimeout(r, 60_000));
      const retry = await fetch(url, opts);
      if (!retry.ok) throw new Error(`Apollo ${method} ${path}: ${retry.status}`);
      return retry.json();
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Apollo ${method} ${path}: ${res.status} ${text}`);
    }
    return res.json();
  }

  /**
   * Enrich a business by domain to find owner/manager email.
   * @param domain e.g. "smithplumbing.com" (no https/www)
   * @param businessName Used as context hint
   */
  async enrichByDomain(domain: string, businessName?: string): Promise<ApolloEnrichResult> {
    try {
      // Search for people at this domain (prefer owner/manager roles)
      const res = await this.request<{
        people?: Array<{
          email?: string;
          first_name?: string;
          last_name?: string;
          title?: string;
          linkedin_url?: string;
        }>;
        contacts?: Array<{
          email?: string;
          first_name?: string;
          last_name?: string;
          title?: string;
          linkedin_url?: string;
        }>;
      }>('POST', '/mixed_people/search', {
        q_organization_domains: [domain],
        person_titles: ['owner', 'manager', 'founder', 'president', 'director', 'co-owner', 'proprietor'],
        per_page: 5,
        page: 1,
      });

      const people = res.people || res.contacts || [];
      if (people.length === 0) return this.emptyResult();

      // Prefer first result with a verified email
      const withEmail = people.find(p => p.email && !p.email.includes('catch-all'));
      const best = withEmail || people[0];

      return {
        email: best.email || null,
        first_name: best.first_name || null,
        last_name: best.last_name || null,
        title: best.title || null,
        linkedin_url: best.linkedin_url || null,
      };
    } catch (err) {
      console.log(`[apollo] enrichByDomain failed for ${domain}: ${(err as Error).message}`);
      return this.emptyResult();
    }
  }

  /**
   * Enrich by organization name + city (for businesses without a domain).
   */
  async enrichByName(businessName: string, city: string, state: string): Promise<ApolloEnrichResult> {
    try {
      const res = await this.request<{
        organizations?: Array<{
          primary_domain?: string;
          name?: string;
        }>;
      }>('POST', '/organizations/search', {
        q_organization_name: businessName,
        organization_locations: [`${city}, ${state}`],
        per_page: 3,
        page: 1,
      });

      const orgs = res.organizations || [];
      if (orgs.length === 0) return this.emptyResult();

      // Use the first matching org's domain for email enrichment
      const domain = orgs[0].primary_domain;
      if (!domain) return this.emptyResult();

      return this.enrichByDomain(domain, businessName);
    } catch (err) {
      console.log(`[apollo] enrichByName failed for ${businessName}: ${(err as Error).message}`);
      return this.emptyResult();
    }
  }

  private emptyResult(): ApolloEnrichResult {
    return { email: null, first_name: null, last_name: null, title: null, linkedin_url: null };
  }
}
