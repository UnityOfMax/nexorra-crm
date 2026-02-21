// Programmatically add/remove custom subdomains on the Vercel project.
// Required env vars:
//   VERCEL_TOKEN       – API token from Vercel Account Settings → Tokens
//   VERCEL_PROJECT_ID  – Project ID from Vercel project settings

const BASE_DOMAIN = 'ourlimitedoffer.com';

function domainForSlug(slug: string) {
  return `${slug}.${BASE_DOMAIN}`;
}

export async function addVercelDomain(slug: string): Promise<void> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) {
    console.warn('[vercel-domains] VERCEL_TOKEN or VERCEL_PROJECT_ID not set — skipping domain add');
    return;
  }

  const domain = domainForSlug(slug);
  const res = await fetch(
    `https://api.vercel.com/v10/projects/${projectId}/domains`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: domain }),
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // 409 means the domain is already registered — that's fine
    if (body?.error?.code !== 'domain_already_in_use') {
      console.error('[vercel-domains] Failed to add domain:', domain, body);
    }
  }
}

export async function removeVercelDomain(slug: string): Promise<void> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return;

  const domain = domainForSlug(slug);
  const res = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  // 404 = domain wasn't registered, fine to ignore
  if (!res.ok && res.status !== 404) {
    const body = await res.json().catch(() => ({}));
    console.error('[vercel-domains] Failed to remove domain:', domain, body);
  }
}

// Remove the wildcard *.ourlimitedoffer.com domain from the Vercel project (one-time cleanup)
export async function removeWildcardDomain(): Promise<void> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return;

  const wildcard = `*.${BASE_DOMAIN}`;
  const encoded = encodeURIComponent(wildcard);
  const res = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}/domains/${encoded}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok && res.status !== 404) {
    const body = await res.json().catch(() => ({}));
    console.warn('[vercel-domains] Wildcard removal responded with:', res.status, body);
  }
}
