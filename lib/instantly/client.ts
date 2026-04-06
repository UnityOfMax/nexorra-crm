const BASE_URL = 'https://api.instantly.ai/api/v2';
const MIN_INTERVAL = 5000; // 5s between calls

export class InstantlyClient {
  private apiKey: string;
  private lastCall = 0;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.INSTANTLY_API_KEY || '';
  }

  private async request<T>(method: string, path: string, body?: any): Promise<T> {
    // Rate limit
    const now = Date.now();
    const wait = this.lastCall + MIN_INTERVAL - now;
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    this.lastCall = Date.now();

    const url = `${BASE_URL}${path}`;
    const opts: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    if (res.status === 429) {
      // Wait 60s and retry once
      await new Promise(r => setTimeout(r, 60000));
      this.lastCall = Date.now();
      const retry = await fetch(url, opts);
      if (!retry.ok) throw new Error(`Instantly ${method} ${path}: ${retry.status}`);
      return retry.json();
    }
    if (!res.ok) throw new Error(`Instantly ${method} ${path}: ${res.status} ${await res.text()}`);
    return res.json();
  }

  // ── Campaigns ──

  async listCampaigns() {
    const res = await this.request<{ items: any[] }>('GET', '/campaigns');
    return res.items || [];
  }

  async getCampaign(campaignId: string) {
    return this.request<any>('GET', `/campaigns/${campaignId}`);
  }

  async createCampaign(data: {
    name: string;
    sequences?: any[];
    campaign_schedule?: any;
  }) {
    return this.request<any>('POST', '/campaigns', data);
  }

  async updateCampaign(campaignId: string, updates: Record<string, any>) {
    return this.request<any>('PATCH', `/campaigns/${campaignId}`, updates);
  }

  async deleteCampaign(campaignId: string) {
    return this.request<any>('DELETE', `/campaigns/${campaignId}`);
  }

  async pauseCampaign(campaignId: string) {
    return this.request<any>('POST', `/campaigns/${campaignId}/pause`, {});
  }

  async activateCampaign(campaignId: string) {
    return this.request<any>('POST', `/campaigns/${campaignId}/activate`, {});
  }

  async getCampaignAnalytics(campaignId: string) {
    return this.request<{
      sent: number; opened: number; replied: number;
      bounced: number; unsubscribed: number;
    }>('GET', `/campaigns/${campaignId}/analytics`);
  }

  async getCampaignsAnalytics(ids: string[], startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    ids.forEach(id => params.append('ids', id));
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    return this.request<any>('GET', `/campaigns/analytics?${params}`);
  }

  async getCampaignStepAnalytics(campaignId: string) {
    const params = new URLSearchParams({ ids: campaignId });
    return this.request<any>('GET', `/campaigns/analytics/steps?${params}`);
  }

  // ── Leads ──

  async addLeads(campaignId: string, leads: Array<{
    email: string; first_name: string; last_name: string;
    custom_variables?: Record<string, string>;
  }>) {
    return this.request<any>('POST', '/leads/add', {
      campaign_id: campaignId,
      skip_if_in_workspace: false,
      skip_if_in_campaign: false,
      leads,
    });
  }

  async getLead(email: string) {
    const params = new URLSearchParams({ email });
    return this.request<any>('GET', `/leads?${params}`);
  }

  async listLeads(campaignId: string, opts?: { status?: string; limit?: number; offset?: number }) {
    return this.request<any>('POST', '/leads/list', {
      campaign_id: campaignId,
      ...(opts?.status ? { status: opts.status } : {}),
      ...(opts?.limit ? { limit: opts.limit } : {}),
    });
  }

  async updateLead(email: string, updates: { status?: string; tags?: string[] }) {
    return this.request<any>('PATCH', '/leads', { email, ...updates });
  }

  async deleteLeads(campaignId: string, opts?: { status?: string; limit?: number }) {
    return this.request<any>('DELETE', '/leads', {
      campaign_id: campaignId,
      ...(opts?.status ? { status: opts.status } : {}),
      ...(opts?.limit ? { limit: opts.limit } : {}),
    });
  }

  // ── Emails ──

  async replyToEmail(params: {
    reply_to_uuid: string;
    email_account: string;
    body: string;
  }) {
    return this.request<any>('POST', '/emails/reply', params);
  }

  async listEmails(campaignId: string, opts?: { limit?: number }) {
    const params = new URLSearchParams({ campaign_id: campaignId });
    if (opts?.limit) params.set('limit', String(opts.limit));
    return this.request<any[]>('GET', `/emails?${params}`);
  }

  // ── Accounts ──

  async listAccounts() {
    const res = await this.request<any>('GET', '/accounts');
    return res.items || res || [];
  }

  async getAccount(email: string) {
    return this.request<any>('GET', `/accounts/${encodeURIComponent(email)}`);
  }

  async warmupAnalytics(emails: string[]) {
    return this.request<any>('POST', '/accounts/warmup-analytics', { emails });
  }

  async testAccountVitals(email: string) {
    return this.request<any>('POST', '/accounts/test/vitals', { email });
  }
}
