// Creates a test landing page at test.ourlimitedoffer.com
// Uses the same template as the Charlie/Lori pages with a form and calendar

const SUPABASE_URL = 'https://nhflmisklsanfiiywrfo.supabase.co';
const KEY = '***REMOVED***';

// Use the same account_id as Charlie Kiers so the lead form / calendar routes correctly
const ACCOUNT_ID = '1b025168-ce2c-4baa-9aca-d77fc1d01f0e';

const accent = '#f59e0b';

const content = {
  styles: { fontFamily: 'Inter', primaryColor: accent },
  calendarSettings: { startHour: 9, endHour: 17 },
  blocks: [
    {
      id: 'test-hero',
      type: 're_hero',
      order: 0,
      data: {
        agentName: 'Test Agent',
        title: '',
        subtitle: 'Unlock The <u>Free</u> Custom List Of Homes<br><span style="font-size:0.85em;opacity:0.85;">Get access to exclusive properties before they hit the market</span>',
        profileImageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=500&fit=crop',
        ctaText: 'Unlock Your List \u2192',
        ctaSubtext: 'Instant Access',
        bgColor: '#0f172a',
        accentColor: accent,
      },
    },
    {
      id: 'test-about',
      type: 're_about',
      order: 1,
      data: {
        heading: 'About Test Agent',
        bio: 'This is a test page used to verify the landing page form, calendar booking, and lead capture flow. Fill out the form on this page to test the full submission process — the form will open when you click the CTA button above.\n\nCalendar booking is also enabled — after submitting the form you should see available time slots you can select.',
        agentPhotoUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=500&fit=crop',
        yearsExperience: 10,
        dealsClosed: 50,
        specialties: ['Test Form', 'Calendar Booking', 'Lead Capture'],
        accentColor: accent,
      },
    },
    {
      id: 'test-reviews',
      type: 're_reviews',
      order: 2,
      data: {
        heading: 'Test Reviews',
        ctaText: 'Find Your Dream Home',
        accentColor: accent,
        reviews: [
          { text: 'This is a test review to verify the review marquee scrolls correctly and loops seamlessly.', author: 'Test User A', location: 'Denver, CO', rating: 5 },
          { text: 'Another test review to check the layout and auto-scroll animation on both desktop and mobile.', author: 'Test User B', location: 'Greenwood Village, CO', rating: 5 },
          { text: 'A third review to ensure there are enough cards for the marquee to fill the row and loop.', author: 'Test User C', location: 'Aurora, CO', rating: 5 },
        ],
      },
    },
    {
      id: 'test-location',
      type: 're_location',
      order: 3,
      data: {
        heading: 'Find Us',
        address: '1234 Test Street, Denver, CO 80202',
        phone: '(303) 555-0100',
        email: 'test@ourlimitedoffer.com',
        accentColor: accent,
        mapEmbedUrl: 'https://www.openstreetmap.org/export/embed.html?bbox=-104.9971%2C39.7385%2C-104.9771%2C39.7485&layer=mapnik&marker=39.7435%2C-104.9871',
      },
    },
    {
      id: 'test-footer',
      type: 're_footer',
      order: 4,
      data: {
        agentName: 'Test Agent',
        brokerage: 'Test Realty',
        phone: '(303) 555-0100',
        email: 'test@ourlimitedoffer.com',
        license: 'License #TEST-0001',
        accentColor: accent,
      },
    },
  ],
};

async function upsert() {
  // Check if test page already exists
  const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/landing_pages?slug=eq.test&select=id`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  const existing = await checkRes.json();

  const payload = {
    account_id: ACCOUNT_ID,
    name: 'Test Page',
    slug: 'test',
    published: true,
    content,
    meta_title: 'Test Landing Page',
    meta_description: 'Internal test page for verifying form and calendar functionality.',
  };

  let res;
  if (existing.length > 0) {
    const id = existing[0].id;
    console.log('Updating existing test page', id);
    res = await fetch(`${SUPABASE_URL}/rest/v1/landing_pages?id=eq.${id}`, {
      method: 'PATCH',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    });
  } else {
    console.log('Creating new test page');
    res = await fetch(`${SUPABASE_URL}/rest/v1/landing_pages`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    });
  }

  console.log('Status:', res.status);
  const body = await res.json();
  console.log('Slug:', body[0]?.slug ?? body?.slug, '| Published:', body[0]?.published ?? body?.published);
}

upsert().catch(console.error);
