/**
 * One-off script: build full 5-page demo for The Mint Hair Salon, Macon GA
 * Run: set -a && source .env.local && set +a && npx tsx scripts/local-biz/build-mint-demo.ts
 */

import { buildWebsiteDemo, type LocalBizData } from '../../lib/landing-pages/website-demo-builder';
import { generateCopyFast } from '../../lib/local-biz/copy-generator';

const MINT: LocalBizData = {
  id: 'mint-hair-salon-macon-manual',
  business_name: 'The Mint Hair Salon',
  business_type: 'Hairdresser',
  phone: '+1 478-238-6101',
  email: null,
  website_url: null,
  address: '2360 Ingleside Ave, Macon, GA 31204',
  city: 'Macon',
  state_province: 'GA',
  country: 'US',
  gmb_rating: 4.9,
  gmb_reviews: 35,
  // Real Google Maps photos (high-res versions)
  gmb_photos: [
    'https://lh3.googleusercontent.com/gps-cs-s/AHVAweoNfMBeSvFW0RvkVSRUPiGTopY8JWwtuXTwCnoHDNj-cZjbIVC3_wCmoM1N2RrulLXerHHqRpWUsCAHZQfBc2fAAXRaTmAQJWoxyzeRKHuhKb3DjNp1Wr18IxFsMzV4AMrn-qGo=w1200-h800-k-no',
    'https://lh3.googleusercontent.com/gps-cs-s/AHVAweolNnzddq46Zmn_iEsCMulztaKZEh5FUZ6yjue9zysaY4HfKFDBCxTtenNaoLn7rK8mJyi8PB0j58yoHXzhw5EGFGo_qnsS4UBFESEdMbwGgrJkFpOxpXKK5QjGCEJojvaypz_7IQ=w1200-h800-k-no',
    'https://lh3.googleusercontent.com/gps-cs-s/AHVAwepNlC6whPU8xLyT6mjFn8w3c7ngRJ2rwqTMICfbVsBCbc6SMJGVjPS8b-OLWNbghqHEhu2vq0MGZoiVc_aSIslVWPA6O9jdKb1JbWIMfq_I9rC-qXQPPS1pgeu8ypLIXnSI1GccuQ=w1200-h800-k-no',
    'https://lh3.googleusercontent.com/gps-cs-s/AHVAwepRBVx99KyVYWplCbun7R6boCzTYeDrjGoT31r5ngzw7prIcAQZ7p4ym0uGnm291BmuLyhjGCSxQiwHHY0aJ507VsKickNQYMOspwlaJDJkyEdhPEIVbYPgXc1HX0hrab6KeRcpxg=w1200-h800-k-no',
    'https://lh3.googleusercontent.com/gps-cs-s/AHVAweq4pz_9X8N9iEnC-Lu3L9V7gMx6KDRI-t9KFnuC8GcLTTXbV7vfDyIjkeHOPjPTXQ64_06dgSgt_hqr3BBVp-8TZcBUu3nPsDfn11nV5ySDTDp-P6t91XXU58jBUZCurRWhqKA=w1200-h800-k-no',
    'https://lh3.googleusercontent.com/gps-cs-s/AHVAwerLUTiB-mcz_B260bzp3XCJnz5sYhvVTxBP1TqLkyNaNLg671NuQpg1svo0Qn_ZGHz5E_JGe0ddbuEdW5qLdsapgDaLko56LfvNPufgh8fVRJ03pol2aQ5PNwqKkirZyufq5_Xu=w1200-h800-k-no',
    'https://lh3.googleusercontent.com/gps-cs-s/AHVAweovq2sx3apfzQct3nd4SmIpOheUT4FUB1sQ4gv0YoGosI2W4gPIKwNK6I1gYLe5m8zVl4AvnZgWD8ikPVyUyDUz-qUFqCGHCvC4qD5rSt80ir45ssvERmKvGy151f8ZJRAEmU00uC_w_np9=w1200-h800-k-no',
    'https://lh3.googleusercontent.com/gps-cs-s/AHVAweo7C5kpwreLh2sKQ6hjGHDDzNzzIBTi1NDBs83eE6IMOMIJQRb4iFSQ9p6KmEVaTIbN6kUZngphgjkjZAR-NucSdWkKZDdUt41of3vHTQCbPONMhJ_EEBMlU6LVBR0AOcU54cSp=w1200-h800-k-no',
  ],
  hours: 'Tue–Sat 9:00 AM – 6:00 PM',
  services: [
    { name: 'Haircut & Style', desc: 'Precision cut tailored to your face shape and lifestyle', price: 'From $45' },
    { name: 'Colour & Highlights', desc: 'Balayage, foils, full colour — expert blending for a natural finish', price: 'From $85' },
    { name: 'Blowout & Styling', desc: 'Smooth, voluminous blowout or custom styling for any occasion', price: 'From $35' },
    { name: 'Deep Conditioning', desc: 'Restorative treatment to bring shine and softness back to damaged hair', price: 'From $30' },
  ],
  reviews: [
    { text: 'My stylist Brianna is a genius. The whole place is professional and talented — best salon in Macon.', author: 'Laura Moore' },
    { text: 'All the staff are super friendly. Abigayle gives the most amazing head massage, and Jamie always nails my cut. Will be back!', author: 'Ryder Herringdine' },
    { text: 'Had my first appointment with Brandi after a hair disaster. She completely saved it. The atmosphere is warm and welcoming.', author: 'Stephanie Basey' },
  ],
  color_primary: '#2D6A4F',   // deep mint green — matches salon name/brand
  color_accent: '#B7E4C7',    // soft mint accent
};

async function main() {
  console.log('Generating copy for The Mint Hair Salon...');
  const copy = await generateCopyFast(MINT);
  console.log('Copy generated:', JSON.stringify(copy, null, 2));

  console.log('\nBuilding 5-page demo...');
  const slug = await buildWebsiteDemo(MINT, copy);
  const url = `https://app.ainexorra.com/website-demo/${slug}`;
  console.log(`\n✓ Demo built: ${url}`);
  console.log('  Home:     ' + url);
  console.log('  Services: ' + url.replace('/website-demo/', '/website-demo/') + '-services');
  console.log('  Gallery:  ' + url + '-gallery');
  console.log('  About:    ' + url + '-about');
  console.log('  Booking:  ' + url + '-booking');

  process.exit(0);
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
