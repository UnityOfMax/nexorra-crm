import https from 'https';

const SUPABASE_URL = 'https://nhflmisklsanfiiywrfo.supabase.co';
const SUPABASE_KEY = '***REMOVED***';

function patch(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(SUPABASE_URL + path);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Prefer': 'return=minimal'
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { console.log(path.split('=').pop(), '->', res.statusCode); resolve(); });
    }).on('error', reject);
    req.write(data);
    req.end();
  });
}

const SUBTITLE_HTML = 'Unlock The <u>Free</u> Custom List Of Homes<br><span style="font-size:0.85em;opacity:0.7">Get access to exclusive properties as soon as they hit the market!</span>';

// ─── CHARLIE: top 6 most recent sold (no prices available publicly) ───────────
const charlieProps = [
  { address: '298 W 1st Ave, False Creek, Vancouver', price: 'Sold', beds: 2, baths: 2, sqft: 929, date: 'Dec 2025', status: 'Sold', imageUrl: 'https://s.realtyninja.com/static/images/listings/med/10254_262993107_1_fec5309d.jpg' },
  { address: '3636 Franklin St, Vancouver', price: 'Sold', beds: 4, baths: 3, sqft: 2565, date: 'Jan 2025', status: 'Sold', imageUrl: 'https://s.realtyninja.com/static/images/listings/med/10254_d748d762_Front_Photo.jpeg' },
  { address: '310-2357 Whyte Ave, Port Coquitlam', price: 'Sold', beds: 2, baths: 2, sqft: 1078, date: 'Jan 2025', status: 'Sold', imageUrl: 'https://s.realtyninja.com/static/images/listings/med/10254_262970771_1_5967b141.jpg' },
  { address: '22793 Reid Ave, Maple Ridge', price: 'Sold', beds: 3, baths: 2, sqft: 1990, date: 'Jan 2025', status: 'Sold', imageUrl: 'https://s.realtyninja.com/static/images/listings/med/10254_262943419_1_9f71bb2c.jpg' },
  { address: '207-3478 Wesbrook Mall, Vancouver West', price: 'Sold', beds: 2, baths: 2, sqft: 960, date: 'Dec 2024', status: 'Sold', imageUrl: 'https://s.realtyninja.com/static/images/listings/med/10254_262967241_1_f9259527.jpg' },
  { address: '2112 Prince Edward St, Vancouver East', price: 'Sold', beds: 3, baths: 4, sqft: 1720, date: 'Nov 2024', status: 'Sold', imageUrl: 'https://s.realtyninja.com/static/images/listings/med/10254_262948493_1_11052b89.jpg' },
];

// ─── LORI: 5 real deals from homes.com provided by user ──────────────────────
const loriProps = [
  { address: '9927 Aftonwood St, Highlands Ranch, CO', price: '$590,000', beds: 3, baths: 3.5, sqft: 2171, date: '', status: 'Sold', imageUrl: 'https://images.homes.com/listings/117/3656031734-195371991/9927-aftonwood-st-highlands-ranch-co-primaryphoto.jpg' },
  { address: '1035 Quartz St, Golden, CO', price: '$737,000', beds: 5, baths: 2, sqft: 2064, date: '', status: 'Sold', imageUrl: 'https://images.homes.com/listings/112/9683582334-474531891/1035-quartz-st-golden-co-primaryphoto.jpg' },
  { address: '15747 Willow Way, Brighton, CO', price: '$865,000', beds: 3, baths: 3, sqft: 2117, date: '', status: 'Sold', imageUrl: 'https://images.homes.com/listings/112/6382526324-957865491/15747-willow-way-brighton-co-primaryphoto.jpg' },
  { address: '14942 E Evans Ave, Aurora, CO', price: '$509,950', beds: 3, baths: 2, sqft: 1648, date: '', status: 'Sold', imageUrl: 'https://images.homes.com/listings/112/3543859614-833388291/14942-e-evans-ave-aurora-co-primaryphoto.jpg' },
  { address: '639 Gold Hill Dr, Erie, CO', price: '$708,000', beds: 4, baths: 3, sqft: 2916, date: '', status: 'Sold', imageUrl: 'https://images.homes.com/listings/112/7256886983-465164181/639-gold-hill-dr-erie-co-primaryphoto.jpg' },
];

const loriStats = [
  { value: '84', label: 'Closed Sales' },
  { value: '$44.1M', label: 'Total Value' },
  { value: '$335K\u2013$1.1M', label: 'Price Range' },
  { value: '$525.2K', label: 'Average Price' },
];

const loriBio = `Lori Jackson is the founder of The Action Jackson Group, serving the Denver, Colorado area. A local banker for 18 years, Lori started the Mortgage Department for the largest locally owned banking organization in Colorado before entering real estate — where she knew her skills would be best used enhancing relationships through something she loves.

Having lived in the local area for over 40 years, Lori brings a wealth of knowledge and deep-rooted commitment to Colorado. She believes that real estate is truly about long-term trust and deepening loyalty for a lifetime. When you trust her with your referrals, you know your friends and family will be treated with the same respect and reverence you have come to expect.

As a REALTOR\u00ae who provides Hero Rebates, Lori combines her passion for real estate with giving back to those who serve the community. Her late husband, Troy, served on a local fire protection district for 30 years — inspiring her to give up to $2,500 back at closing to teachers, first responders, healthcare workers, and military (including retired, voluntary and reserves). For heroes selling their home, she also reduces her commission by 25% so more cash stays in your pocket.`;

const charlieContent = {
  blocks: [
    { id: 'block-auto-1', type: 're_hero', order: 0, data: { agentName: 'Charlie Kiers', title: '', subtitle: SUBTITLE_HTML, bgColor: '#0f172a', accentColor: '#94c8ff', ctaText: 'Unlock Your List \u2192', ctaSubtext: 'Instant Access', profileImageUrl: 'https://s.realtyninja.com/static/media/med/10254_d9f9e0fc_CK_get_to_know_me.png' } },
    { id: 'block-auto-2', type: 're_about', order: 1, data: {
      heading: 'About Charlie Kiers',
      bio: 'Charlie Kiers is a full-time REALTOR\u00ae with Keller Williams Ocean Realty Vancentral in Vancouver, BC. Licensed since 2004 and a proud Vancouver resident after relocating from Ontario in 1995, Charlie has earned recognition as a top 1% producer in both the Greater Vancouver Real Estate Board and Keller Williams Canada. He is a Master member of the Medallion Club \u2014 representing over 10 consecutive years in the top 10% of GVREB realtors. Charlie specializes in helping buyers and sellers across Greater Vancouver and the Fraser Valley, bringing sharp negotiation skills, deep local knowledge, and genuine commitment to every client.',
      agentPhotoUrl: 'https://s.realtyninja.com/static/media/med/10254_d9f9e0fc_CK_get_to_know_me.png',
      yearsExperience: 20, dealsClosed: 500,
      specialties: ['Buyers', 'Sellers', 'Residential', 'Greater Vancouver', 'Fraser Valley'],
      accentColor: '#94c8ff'
    } },
    { id: 'block-auto-3', type: 're_reviews', order: 2, data: { heading: 'What My Clients Say', ctaText: 'Unlock Your List \u2192', accentColor: '#94c8ff', reviews: [
      { author: 'Talia V.', text: "There really aren't words to describe how fantastic Charlie's service was. His attention to detail, networking, and negotiation skills are unmatched.", rating: 5, location: 'Vancouver, BC' },
      { author: 'Victor N.', text: "He's the BEST realtor I could have imagined. A true role-model of professionalism \u2014 he took me on 15+ private property tours and even followed up after the purchase.", rating: 5, location: 'Vancouver, BC' },
      { author: 'Sean Landers', text: 'Charlie is the most professional realtor you will find. As an exceptional negotiator, he consistently exceeded our expectations.', rating: 5, location: 'Vancouver, BC' },
      { author: 'Miranda Connal', text: 'Cool, funny, honest \u2014 Charlie is not just a realtor, he is a true friend. After a year-long search, he found us exactly what we wanted in Hastings-Sunrise.', rating: 5, location: 'Hastings-Sunrise, Vancouver' },
      { author: 'Tom Marchewka', text: 'Charlie is a total pro who exceeded our expectations. He sold our Sunshine Coast vacation property while we were in Ontario \u2014 seamless from start to finish.', rating: 5, location: 'Sunshine Coast, BC' },
      { author: 'Lorna H.', text: 'Charlie is the best! I sold and bought with his expertise. Could not have asked for a better experience.', rating: 5, location: 'Vancouver, BC' },
    ]} },
    { id: 'block-auto-prop', type: 're_properties', order: 3, data: { heading: 'Recent Sales', subheading: 'A snapshot of recently sold properties across Metro Vancouver and the Fraser Valley', accentColor: '#94c8ff', properties: charlieProps } },
    { id: 'block-auto-4', type: 're_location', order: 4, data: { heading: 'Find Me', email: 'charliekiers@gmail.com', phone: '(604) 897-3559', address: '3995 Fraser Street, Vancouver, BC V5V 4E5', mapEmbedUrl: 'https://www.openstreetmap.org/export/embed.html?bbox=-123.1000,49.2290,-123.0900,49.2360&layer=mapnik&marker=49.2325,-123.0947', accentColor: '#94c8ff' } },
    { id: 'block-auto-5', type: 're_footer', order: 5, data: { agentName: 'Charlie Kiers', brokerage: 'Keller Williams Ocean Realty VanCentral', email: 'charliekiers@gmail.com', phone: '(604) 897-3559', license: 'MLS\u00ae Licensed REALTOR\u00ae \u2014 Personal Real Estate Corporation', accentColor: '#94c8ff' } },
  ],
  styles: { fontFamily: 'Inter', primaryColor: '#94c8ff', backgroundColor: '#ffffff' }
};

const loriContent = {
  blocks: [
    { id: 'block-auto-1', type: 're_hero', order: 0, data: { agentName: 'Lori Jackson', title: '', subtitle: SUBTITLE_HTML, bgColor: '#0f172a', accentColor: '#f59e0b', ctaText: 'Unlock Your List \u2192', ctaSubtext: 'Instant Access', profileImageUrl: 'https://actionjacksonrealestate.com/wp-content/uploads/bb-plugin/cache/5Z2A1296-Edit-scaled-portrait-0eb52d7a5c2044c194bf397626c9d179-r0bj4wp695n2.jpg' } },
    { id: 'block-auto-2', type: 're_about', order: 1, data: {
      heading: 'About Lori Jackson',
      bio: loriBio,
      agentPhotoUrl: 'https://actionjacksonrealestate.com/wp-content/uploads/bb-plugin/cache/5Z2A1296-Edit-scaled-portrait-0eb52d7a5c2044c194bf397626c9d179-r0bj4wp695n2.jpg',
      stats: loriStats,
      yearsExperience: 36, dealsClosed: 84,
      specialties: ['Buyers', 'Sellers', 'Hero Rebates up to $2,500', 'Denver Metro', 'Condo / House / Townhouse'],
      accentColor: '#f59e0b'
    } },
    { id: 'block-auto-3', type: 're_reviews', order: 2, data: { heading: 'What My Clients Say', ctaText: 'Unlock Your List \u2192', accentColor: '#f59e0b', reviews: [
      { author: 'Verified Client', text: "Lori and her excellent team are extremely experienced, very communicative, and can move quickly. She advocated for our interests and won us multiple concessions with the Seller. We bought our ideal home within our budget. I cannot recommend Lori enough!", rating: 5, location: 'Denver, CO' },
      { author: 'Verified Client', text: "Lori and her team priced our house right, set us up with an excellent stager, and got us $65,000 over asking price on multiple offers. Her market knowledge was spot on.", rating: 5, location: 'Denver, CO' },
      { author: 'First-Time Buyers', text: "Lori Jackson and Mikey Osei were phenomenal throughout our home purchasing process. Lori provided us with multiple tools and resources to help us find exactly what we needed.", rating: 5, location: 'Denver, CO' },
      { author: 'Verified Client', text: "I can\u2019t say enough about Lori and her professional skills as a realtor. From the initial call to the closing deal, the team is there for you. Everything went so smooth and without a hitch.", rating: 5, location: 'Denver, CO' },
      { author: 'Condo Seller', text: "Lori Jackson is a consummate professional. She is just the best realtor \u2014 knows what she is doing and is a delight to work with. You are doing yourself a huge favor choosing Lori.", rating: 5, location: 'Denver, CO' },
      { author: 'Boulder County Seller', text: "Lori did a great job helping us determine the right price, negotiating with buyers, and helping the process along. She was a pleasure to work with!", rating: 5, location: 'Boulder County, CO' },
      { author: '1031 Exchange Client', text: "Lori helped us navigate a 1031 Exchange. She was prompt and available for every question, patient, helpful, and attentive to every detail. I would 100% recommend Lori for any real estate needs.", rating: 5, location: 'Denver, CO' },
    ]} },
    { id: 'block-auto-prop', type: 're_properties', order: 3, data: { heading: 'Recent Sales', subheading: 'Helping Denver-area buyers and sellers achieve exceptional results', accentColor: '#f59e0b', properties: loriProps } },
    { id: 'block-auto-4', type: 're_location', order: 4, data: { heading: 'Find Me', email: 'lorijacksonrealtor@gmail.com', phone: '', address: 'Greenwood Village, CO', mapEmbedUrl: 'https://www.openstreetmap.org/export/embed.html?bbox=-104.9600,39.6050,-104.9350,39.6250&layer=mapnik&marker=39.6147,-104.9481', accentColor: '#f59e0b' } },
    { id: 'block-auto-5', type: 're_footer', order: 5, data: { agentName: 'Lori Jackson', brokerage: 'The Action Jackson Group', email: 'lorijacksonrealtor@gmail.com', phone: '', license: '', accentColor: '#f59e0b' } },
  ],
  styles: { fontFamily: 'Inter', primaryColor: '#f59e0b', backgroundColor: '#ffffff' }
};

await patch('/rest/v1/landing_pages?id=eq.53e6ae3c-883a-4b7e-818e-9f3926853f18', { content: charlieContent });
await patch('/rest/v1/landing_pages?id=eq.90a784e2-647c-4ac7-b1cb-626f045dccc3', { content: loriContent });
console.log('Done.');
