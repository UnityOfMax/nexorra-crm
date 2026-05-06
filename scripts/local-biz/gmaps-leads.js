#!/usr/bin/env node
/**
 * Google Maps local business lead scraper — Data Miner approach.
 * Niches: pest control + home improvement (no website on Google page).
 * Coverage: 5 largest cities × all 50 US states = ~250 cities.
 *
 * Approach: scroll the search results feed to load all cards, then click each
 * card in the feed (SPA DOM update, ~400ms) instead of page.goto per listing
 * (~2.5s). Extracts phone + website presence from the detail pane, then goes
 * back to the feed for the next card.
 *
 * Chrome port 9223. Stores in leads table (lead_category='website').
 */

'use strict';

const puppeteer = require('puppeteer');
const https     = require('https');
const fs        = require('fs');

const PORT             = 9223;
const DAILY_TARGET     = 1000;   // total leads per day (US + Canada)
const US_TZ_TARGET     = 200;    // US leads per timezone (800 US total)
const CALLING_PER_TZ   = 100;    // first N US leads per TZ → lead_category:'calling'
const CA_TOTAL_TARGET  = 200;    // Canadian leads total → lead_category:'website'
const CITY_STATE_FILE  = '/home/max/crm/agents/state/gmaps-city-pages.json';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ── Niches ────────────────────────────────────────────────────────────────────

const BUSINESS_TYPES = [
  'pest control',
  'exterminator',
  'hvac',
  'air conditioning repair',
];

// ── Chain filter ──────────────────────────────────────────────────────────────

const CHAIN_KEYWORDS = [
  // Pest control nationals
  'terminix', 'orkin', 'rentokil', 'servicemaster', 'truly nolen', 'rollins',
  'western pest', 'aptive', 'hometeam pest', 'arrow exterminating',
  'bulwark exterminating', 'anticimex', 'ehrlich', 'presto-x',
  // Home improvement nationals
  'home depot', 'lowes', "lowe's", 'angi', 'thumbtack', 'homeadvisor',
  '1-800 hansons', 'sears home', 'dreamstyle', 'renewal by andersen',
  'window world', 'leaf guard', 'leafguard', 'bath fitter', 'bath planet',
  // HVAC nationals
  'one hour heating', 'aire serv', 'mister sparky', 'hard rock',
  'morris-jenkins', 'coolray', 'four seasons heating', 'hoffmann brothers',
  'ierna', 'bob hamilton', 'service experts', 'lennox store',
  // Generic chain signals
  'national', 'franchise', '1-800',
];

function isChain(name) {
  if (!name) return false;
  const lower = name.toLowerCase();
  return CHAIN_KEYWORDS.some(kw => lower.includes(kw));
}

// ── City list — 5 largest per state, all 50 states ───────────────────────────

// US: top 10 cities per state. Canada: top 10 per province, country:'CA'.
const TZ_CITIES = {
  EST: [
    // Maine
    { city: 'Portland', state: 'ME' }, { city: 'Lewiston', state: 'ME' },
    { city: 'Bangor', state: 'ME' }, { city: 'South Portland', state: 'ME' },
    { city: 'Auburn', state: 'ME' }, { city: 'Biddeford', state: 'ME' },
    { city: 'Saco', state: 'ME' }, { city: 'Westbrook', state: 'ME' },
    { city: 'Brunswick', state: 'ME' }, { city: 'Augusta', state: 'ME' },
    // New Hampshire
    { city: 'Manchester', state: 'NH' }, { city: 'Nashua', state: 'NH' },
    { city: 'Concord', state: 'NH' }, { city: 'Dover', state: 'NH' },
    { city: 'Rochester', state: 'NH' }, { city: 'Derry', state: 'NH' },
    { city: 'Portsmouth', state: 'NH' }, { city: 'Keene', state: 'NH' },
    { city: 'Laconia', state: 'NH' }, { city: 'Hampton', state: 'NH' },
    // Vermont
    { city: 'Burlington', state: 'VT' }, { city: 'South Burlington', state: 'VT' },
    { city: 'Rutland', state: 'VT' }, { city: 'Barre', state: 'VT' },
    { city: 'Montpelier', state: 'VT' }, { city: 'Essex Junction', state: 'VT' },
    { city: 'Williston', state: 'VT' }, { city: 'Colchester', state: 'VT' },
    { city: 'Middlebury', state: 'VT' }, { city: 'St. Albans', state: 'VT' },
    // Massachusetts
    { city: 'Boston', state: 'MA' }, { city: 'Worcester', state: 'MA' },
    { city: 'Springfield', state: 'MA' }, { city: 'Cambridge', state: 'MA' },
    { city: 'Lowell', state: 'MA' }, { city: 'Brockton', state: 'MA' },
    { city: 'New Bedford', state: 'MA' }, { city: 'Quincy', state: 'MA' },
    { city: 'Lynn', state: 'MA' }, { city: 'Fall River', state: 'MA' },
    // Rhode Island
    { city: 'Providence', state: 'RI' }, { city: 'Cranston', state: 'RI' },
    { city: 'Warwick', state: 'RI' }, { city: 'Pawtucket', state: 'RI' },
    { city: 'Woonsocket', state: 'RI' }, { city: 'North Providence', state: 'RI' },
    { city: 'Cumberland', state: 'RI' }, { city: 'East Providence', state: 'RI' },
    { city: 'North Kingstown', state: 'RI' }, { city: 'Bristol', state: 'RI' },
    // Connecticut
    { city: 'Bridgeport', state: 'CT' }, { city: 'New Haven', state: 'CT' },
    { city: 'Stamford', state: 'CT' }, { city: 'Hartford', state: 'CT' },
    { city: 'Waterbury', state: 'CT' }, { city: 'Norwalk', state: 'CT' },
    { city: 'Danbury', state: 'CT' }, { city: 'New Britain', state: 'CT' },
    { city: 'Meriden', state: 'CT' }, { city: 'West Haven', state: 'CT' },
    // New York
    { city: 'New York', state: 'NY' }, { city: 'Buffalo', state: 'NY' },
    { city: 'Rochester', state: 'NY' }, { city: 'Yonkers', state: 'NY' },
    { city: 'Syracuse', state: 'NY' }, { city: 'Albany', state: 'NY' },
    { city: 'New Rochelle', state: 'NY' }, { city: 'Mount Vernon', state: 'NY' },
    { city: 'Schenectady', state: 'NY' }, { city: 'Utica', state: 'NY' },
    // New Jersey
    { city: 'Newark', state: 'NJ' }, { city: 'Jersey City', state: 'NJ' },
    { city: 'Paterson', state: 'NJ' }, { city: 'Elizabeth', state: 'NJ' },
    { city: 'Edison', state: 'NJ' }, { city: 'Toms River', state: 'NJ' },
    { city: 'Clifton', state: 'NJ' }, { city: 'Trenton', state: 'NJ' },
    { city: 'Camden', state: 'NJ' }, { city: 'Hamilton', state: 'NJ' },
    // Pennsylvania
    { city: 'Philadelphia', state: 'PA' }, { city: 'Pittsburgh', state: 'PA' },
    { city: 'Allentown', state: 'PA' }, { city: 'Erie', state: 'PA' },
    { city: 'Reading', state: 'PA' }, { city: 'Scranton', state: 'PA' },
    { city: 'Bethlehem', state: 'PA' }, { city: 'Lancaster', state: 'PA' },
    { city: 'York', state: 'PA' }, { city: 'Harrisburg', state: 'PA' },
    // Delaware
    { city: 'Wilmington', state: 'DE' }, { city: 'Dover', state: 'DE' },
    { city: 'Newark', state: 'DE' }, { city: 'Middletown', state: 'DE' },
    { city: 'Smyrna', state: 'DE' }, { city: 'Milford', state: 'DE' },
    { city: 'Georgetown', state: 'DE' }, { city: 'Seaford', state: 'DE' },
    { city: 'Elsmere', state: 'DE' }, { city: 'New Castle', state: 'DE' },
    // Maryland
    { city: 'Baltimore', state: 'MD' }, { city: 'Columbia', state: 'MD' },
    { city: 'Germantown', state: 'MD' }, { city: 'Silver Spring', state: 'MD' },
    { city: 'Waldorf', state: 'MD' }, { city: 'Frederick', state: 'MD' },
    { city: 'Bowie', state: 'MD' }, { city: 'Rockville', state: 'MD' },
    { city: 'Gaithersburg', state: 'MD' }, { city: 'Hagerstown', state: 'MD' },
    // Virginia
    { city: 'Virginia Beach', state: 'VA' }, { city: 'Norfolk', state: 'VA' },
    { city: 'Chesapeake', state: 'VA' }, { city: 'Richmond', state: 'VA' },
    { city: 'Newport News', state: 'VA' }, { city: 'Alexandria', state: 'VA' },
    { city: 'Hampton', state: 'VA' }, { city: 'Roanoke', state: 'VA' },
    { city: 'Portsmouth', state: 'VA' }, { city: 'Suffolk', state: 'VA' },
    // West Virginia
    { city: 'Charleston', state: 'WV' }, { city: 'Huntington', state: 'WV' },
    { city: 'Parkersburg', state: 'WV' }, { city: 'Morgantown', state: 'WV' },
    { city: 'Wheeling', state: 'WV' }, { city: 'Martinsburg', state: 'WV' },
    { city: 'Weirton', state: 'WV' }, { city: 'Beckley', state: 'WV' },
    { city: 'Clarksburg', state: 'WV' }, { city: 'Fairmont', state: 'WV' },
    // North Carolina
    { city: 'Charlotte', state: 'NC' }, { city: 'Raleigh', state: 'NC' },
    { city: 'Greensboro', state: 'NC' }, { city: 'Durham', state: 'NC' },
    { city: 'Winston-Salem', state: 'NC' }, { city: 'Fayetteville', state: 'NC' },
    { city: 'Cary', state: 'NC' }, { city: 'High Point', state: 'NC' },
    { city: 'Concord', state: 'NC' }, { city: 'Gastonia', state: 'NC' },
    // South Carolina
    { city: 'Columbia', state: 'SC' }, { city: 'Charleston', state: 'SC' },
    { city: 'North Charleston', state: 'SC' }, { city: 'Mount Pleasant', state: 'SC' },
    { city: 'Rock Hill', state: 'SC' }, { city: 'Greenville', state: 'SC' },
    { city: 'Myrtle Beach', state: 'SC' }, { city: 'Florence', state: 'SC' },
    { city: 'Summerville', state: 'SC' }, { city: 'Anderson', state: 'SC' },
    // Georgia
    { city: 'Atlanta', state: 'GA' }, { city: 'Columbus', state: 'GA' },
    { city: 'Augusta', state: 'GA' }, { city: 'Savannah', state: 'GA' },
    { city: 'Athens', state: 'GA' }, { city: 'Macon', state: 'GA' },
    { city: 'Roswell', state: 'GA' }, { city: 'Sandy Springs', state: 'GA' },
    { city: 'Albany', state: 'GA' }, { city: 'Warner Robins', state: 'GA' },
    // Florida
    { city: 'Jacksonville', state: 'FL' }, { city: 'Miami', state: 'FL' },
    { city: 'Tampa', state: 'FL' }, { city: 'Orlando', state: 'FL' },
    { city: 'St. Petersburg', state: 'FL' }, { city: 'Hialeah', state: 'FL' },
    { city: 'Fort Lauderdale', state: 'FL' }, { city: 'Cape Coral', state: 'FL' },
    { city: 'Tallahassee', state: 'FL' }, { city: 'Pembroke Pines', state: 'FL' },
    // Ohio
    { city: 'Columbus', state: 'OH' }, { city: 'Cleveland', state: 'OH' },
    { city: 'Cincinnati', state: 'OH' }, { city: 'Toledo', state: 'OH' },
    { city: 'Akron', state: 'OH' }, { city: 'Dayton', state: 'OH' },
    { city: 'Parma', state: 'OH' }, { city: 'Youngstown', state: 'OH' },
    { city: 'Canton', state: 'OH' }, { city: 'Lorain', state: 'OH' },
    // Michigan
    { city: 'Detroit', state: 'MI' }, { city: 'Grand Rapids', state: 'MI' },
    { city: 'Warren', state: 'MI' }, { city: 'Sterling Heights', state: 'MI' },
    { city: 'Lansing', state: 'MI' }, { city: 'Ann Arbor', state: 'MI' },
    { city: 'Dearborn', state: 'MI' }, { city: 'Flint', state: 'MI' },
    { city: 'Livonia', state: 'MI' }, { city: 'Clinton Township', state: 'MI' },
    // Indiana
    { city: 'Indianapolis', state: 'IN' }, { city: 'Fort Wayne', state: 'IN' },
    { city: 'Evansville', state: 'IN' }, { city: 'South Bend', state: 'IN' },
    { city: 'Carmel', state: 'IN' }, { city: 'Muncie', state: 'IN' },
    { city: 'Terre Haute', state: 'IN' }, { city: 'Bloomington', state: 'IN' },
    { city: 'Anderson', state: 'IN' }, { city: 'Columbus', state: 'IN' },
    // Kentucky
    { city: 'Louisville', state: 'KY' }, { city: 'Lexington', state: 'KY' },
    { city: 'Bowling Green', state: 'KY' }, { city: 'Owensboro', state: 'KY' },
    { city: 'Covington', state: 'KY' }, { city: 'Hopkinsville', state: 'KY' },
    { city: 'Frankfort', state: 'KY' }, { city: 'Elizabethtown', state: 'KY' },
    { city: 'Nicholasville', state: 'KY' }, { city: 'Florence', state: 'KY' },
    // Tennessee (east — EST)
    { city: 'Knoxville', state: 'TN' }, { city: 'Chattanooga', state: 'TN' },
    { city: 'Kingsport', state: 'TN' }, { city: 'Johnson City', state: 'TN' },
    { city: 'Oak Ridge', state: 'TN' },
    // Canada — Ontario & Quebec (EST)
    { city: 'Toronto', state: 'ON', country: 'CA' }, { city: 'Ottawa', state: 'ON', country: 'CA' },
    { city: 'Hamilton', state: 'ON', country: 'CA' }, { city: 'Mississauga', state: 'ON', country: 'CA' },
    { city: 'Brampton', state: 'ON', country: 'CA' }, { city: 'London', state: 'ON', country: 'CA' },
    { city: 'Kitchener', state: 'ON', country: 'CA' }, { city: 'Windsor', state: 'ON', country: 'CA' },
    { city: 'Markham', state: 'ON', country: 'CA' }, { city: 'Vaughan', state: 'ON', country: 'CA' },
    { city: 'Montreal', state: 'QC', country: 'CA' }, { city: 'Quebec City', state: 'QC', country: 'CA' },
    { city: 'Laval', state: 'QC', country: 'CA' }, { city: 'Gatineau', state: 'QC', country: 'CA' },
    { city: 'Longueuil', state: 'QC', country: 'CA' }, { city: 'Sherbrooke', state: 'QC', country: 'CA' },
    { city: 'Saguenay', state: 'QC', country: 'CA' }, { city: 'Levis', state: 'QC', country: 'CA' },
    { city: 'Trois-Rivieres', state: 'QC', country: 'CA' }, { city: 'Terrebonne', state: 'QC', country: 'CA' },
    { city: 'Halifax', state: 'NS', country: 'CA' }, { city: 'Dartmouth', state: 'NS', country: 'CA' },
    { city: 'Sydney', state: 'NS', country: 'CA' }, { city: 'Truro', state: 'NS', country: 'CA' },
    { city: 'New Glasgow', state: 'NS', country: 'CA' },
    { city: 'Moncton', state: 'NB', country: 'CA' }, { city: 'Saint John', state: 'NB', country: 'CA' },
    { city: 'Fredericton', state: 'NB', country: 'CA' }, { city: 'Miramichi', state: 'NB', country: 'CA' },
    { city: 'Bathurst', state: 'NB', country: 'CA' },
    { city: 'Charlottetown', state: 'PE', country: 'CA' }, { city: 'Summerside', state: 'PE', country: 'CA' },
    { city: 'Stratford', state: 'PE', country: 'CA' },
    { city: "St. John's", state: 'NL', country: 'CA' }, { city: 'Corner Brook', state: 'NL', country: 'CA' },
    { city: 'Gander', state: 'NL', country: 'CA' }, { city: 'Grand Falls-Windsor', state: 'NL', country: 'CA' },
    { city: 'Mount Pearl', state: 'NL', country: 'CA' },
  ],
  CST: [
    // Tennessee (west — CST)
    { city: 'Memphis', state: 'TN' }, { city: 'Nashville', state: 'TN' },
    { city: 'Clarksville', state: 'TN' }, { city: 'Murfreesboro', state: 'TN' },
    { city: 'Jackson', state: 'TN' }, { city: 'Franklin', state: 'TN' },
    { city: 'Hendersonville', state: 'TN' }, { city: 'Smyrna', state: 'TN' },
    { city: 'Brentwood', state: 'TN' }, { city: 'Spring Hill', state: 'TN' },
    // Alabama
    { city: 'Birmingham', state: 'AL' }, { city: 'Montgomery', state: 'AL' },
    { city: 'Huntsville', state: 'AL' }, { city: 'Mobile', state: 'AL' },
    { city: 'Tuscaloosa', state: 'AL' }, { city: 'Hoover', state: 'AL' },
    { city: 'Auburn', state: 'AL' }, { city: 'Decatur', state: 'AL' },
    { city: 'Madison', state: 'AL' }, { city: 'Florence', state: 'AL' },
    // Mississippi
    { city: 'Jackson', state: 'MS' }, { city: 'Gulfport', state: 'MS' },
    { city: 'Southaven', state: 'MS' }, { city: 'Hattiesburg', state: 'MS' },
    { city: 'Biloxi', state: 'MS' }, { city: 'Tupelo', state: 'MS' },
    { city: 'Meridian', state: 'MS' }, { city: 'Greenville', state: 'MS' },
    { city: 'Pascagoula', state: 'MS' }, { city: 'Brandon', state: 'MS' },
    // Louisiana
    { city: 'New Orleans', state: 'LA' }, { city: 'Baton Rouge', state: 'LA' },
    { city: 'Shreveport', state: 'LA' }, { city: 'Lafayette', state: 'LA' },
    { city: 'Lake Charles', state: 'LA' }, { city: 'Kenner', state: 'LA' },
    { city: 'Monroe', state: 'LA' }, { city: 'Alexandria', state: 'LA' },
    { city: 'Houma', state: 'LA' }, { city: 'Metairie', state: 'LA' },
    // Arkansas
    { city: 'Little Rock', state: 'AR' }, { city: 'Fort Smith', state: 'AR' },
    { city: 'Fayetteville', state: 'AR' }, { city: 'Springdale', state: 'AR' },
    { city: 'Jonesboro', state: 'AR' }, { city: 'Rogers', state: 'AR' },
    { city: 'Conway', state: 'AR' }, { city: 'North Little Rock', state: 'AR' },
    { city: 'Bentonville', state: 'AR' }, { city: 'Texarkana', state: 'AR' },
    // Oklahoma
    { city: 'Oklahoma City', state: 'OK' }, { city: 'Tulsa', state: 'OK' },
    { city: 'Norman', state: 'OK' }, { city: 'Broken Arrow', state: 'OK' },
    { city: 'Lawton', state: 'OK' }, { city: 'Edmond', state: 'OK' },
    { city: 'Moore', state: 'OK' }, { city: 'Midwest City', state: 'OK' },
    { city: 'Stillwater', state: 'OK' }, { city: 'Enid', state: 'OK' },
    // Texas
    { city: 'Houston', state: 'TX' }, { city: 'San Antonio', state: 'TX' },
    { city: 'Dallas', state: 'TX' }, { city: 'Austin', state: 'TX' },
    { city: 'Fort Worth', state: 'TX' }, { city: 'Arlington', state: 'TX' },
    { city: 'Corpus Christi', state: 'TX' }, { city: 'Plano', state: 'TX' },
    { city: 'Laredo', state: 'TX' }, { city: 'Lubbock', state: 'TX' },
    // Kansas
    { city: 'Wichita', state: 'KS' }, { city: 'Overland Park', state: 'KS' },
    { city: 'Olathe', state: 'KS' }, { city: 'Topeka', state: 'KS' },
    { city: 'Lawrence', state: 'KS' }, { city: 'Manhattan', state: 'KS' },
    { city: 'Salina', state: 'KS' }, { city: 'Hutchinson', state: 'KS' },
    { city: 'Lenexa', state: 'KS' }, { city: 'Shawnee', state: 'KS' },
    // Missouri
    { city: 'Kansas City', state: 'MO' }, { city: 'St. Louis', state: 'MO' },
    { city: 'Springfield', state: 'MO' }, { city: 'Columbia', state: 'MO' },
    { city: 'Independence', state: 'MO' }, { city: 'St. Joseph', state: 'MO' },
    { city: 'Joplin', state: 'MO' }, { city: 'Florissant', state: 'MO' },
    { city: 'Blue Springs', state: 'MO' }, { city: "O'Fallon", state: 'MO' },
    // Iowa
    { city: 'Des Moines', state: 'IA' }, { city: 'Cedar Rapids', state: 'IA' },
    { city: 'Davenport', state: 'IA' }, { city: 'Sioux City', state: 'IA' },
    { city: 'Iowa City', state: 'IA' }, { city: 'Ames', state: 'IA' },
    { city: 'Waterloo', state: 'IA' }, { city: 'Council Bluffs', state: 'IA' },
    { city: 'Dubuque', state: 'IA' }, { city: 'West Des Moines', state: 'IA' },
    // Minnesota
    { city: 'Minneapolis', state: 'MN' }, { city: 'Saint Paul', state: 'MN' },
    { city: 'Rochester', state: 'MN' }, { city: 'Duluth', state: 'MN' },
    { city: 'Bloomington', state: 'MN' }, { city: 'Brooklyn Park', state: 'MN' },
    { city: 'Plymouth', state: 'MN' }, { city: 'St. Cloud', state: 'MN' },
    { city: 'Eagan', state: 'MN' }, { city: 'Woodbury', state: 'MN' },
    // Wisconsin
    { city: 'Milwaukee', state: 'WI' }, { city: 'Madison', state: 'WI' },
    { city: 'Green Bay', state: 'WI' }, { city: 'Kenosha', state: 'WI' },
    { city: 'Racine', state: 'WI' }, { city: 'Appleton', state: 'WI' },
    { city: 'Waukesha', state: 'WI' }, { city: 'Oshkosh', state: 'WI' },
    { city: 'Eau Claire', state: 'WI' }, { city: 'Janesville', state: 'WI' },
    // Illinois
    { city: 'Chicago', state: 'IL' }, { city: 'Aurora', state: 'IL' },
    { city: 'Joliet', state: 'IL' }, { city: 'Naperville', state: 'IL' },
    { city: 'Rockford', state: 'IL' }, { city: 'Springfield', state: 'IL' },
    { city: 'Peoria', state: 'IL' }, { city: 'Elgin', state: 'IL' },
    { city: 'Waukegan', state: 'IL' }, { city: 'Champaign', state: 'IL' },
    // Nebraska
    { city: 'Omaha', state: 'NE' }, { city: 'Lincoln', state: 'NE' },
    { city: 'Bellevue', state: 'NE' }, { city: 'Grand Island', state: 'NE' },
    { city: 'Kearney', state: 'NE' }, { city: 'Fremont', state: 'NE' },
    { city: 'Hastings', state: 'NE' }, { city: 'Norfolk', state: 'NE' },
    { city: 'Columbus', state: 'NE' }, { city: 'North Platte', state: 'NE' },
    // South Dakota
    { city: 'Sioux Falls', state: 'SD' }, { city: 'Rapid City', state: 'SD' },
    { city: 'Aberdeen', state: 'SD' }, { city: 'Brookings', state: 'SD' },
    { city: 'Watertown', state: 'SD' }, { city: 'Mitchell', state: 'SD' },
    { city: 'Pierre', state: 'SD' }, { city: 'Yankton', state: 'SD' },
    { city: 'Huron', state: 'SD' }, { city: 'Spearfish', state: 'SD' },
    // North Dakota
    { city: 'Fargo', state: 'ND' }, { city: 'Bismarck', state: 'ND' },
    { city: 'Grand Forks', state: 'ND' }, { city: 'Minot', state: 'ND' },
    { city: 'West Fargo', state: 'ND' }, { city: 'Mandan', state: 'ND' },
    { city: 'Jamestown', state: 'ND' }, { city: 'Dickinson', state: 'ND' },
    { city: 'Williston', state: 'ND' }, { city: 'Wahpeton', state: 'ND' },
    // Canada — Manitoba & Saskatchewan (CST)
    { city: 'Winnipeg', state: 'MB', country: 'CA' }, { city: 'Brandon', state: 'MB', country: 'CA' },
    { city: 'Steinbach', state: 'MB', country: 'CA' }, { city: 'Thompson', state: 'MB', country: 'CA' },
    { city: 'Portage la Prairie', state: 'MB', country: 'CA' }, { city: 'Winkler', state: 'MB', country: 'CA' },
    { city: 'Selkirk', state: 'MB', country: 'CA' }, { city: 'Morden', state: 'MB', country: 'CA' },
    { city: 'Dauphin', state: 'MB', country: 'CA' }, { city: 'Swan River', state: 'MB', country: 'CA' },
    { city: 'Saskatoon', state: 'SK', country: 'CA' }, { city: 'Regina', state: 'SK', country: 'CA' },
    { city: 'Prince Albert', state: 'SK', country: 'CA' }, { city: 'Moose Jaw', state: 'SK', country: 'CA' },
    { city: 'Swift Current', state: 'SK', country: 'CA' }, { city: 'Yorkton', state: 'SK', country: 'CA' },
    { city: 'North Battleford', state: 'SK', country: 'CA' }, { city: 'Estevan', state: 'SK', country: 'CA' },
    { city: 'Weyburn', state: 'SK', country: 'CA' }, { city: 'Lloydminster', state: 'SK', country: 'CA' },
  ],
  MST: [
    // Colorado
    { city: 'Denver', state: 'CO' }, { city: 'Colorado Springs', state: 'CO' },
    { city: 'Aurora', state: 'CO' }, { city: 'Fort Collins', state: 'CO' },
    { city: 'Lakewood', state: 'CO' }, { city: 'Thornton', state: 'CO' },
    { city: 'Westminster', state: 'CO' }, { city: 'Pueblo', state: 'CO' },
    { city: 'Centennial', state: 'CO' }, { city: 'Boulder', state: 'CO' },
    // Utah
    { city: 'Salt Lake City', state: 'UT' }, { city: 'West Valley City', state: 'UT' },
    { city: 'Provo', state: 'UT' }, { city: 'West Jordan', state: 'UT' },
    { city: 'Orem', state: 'UT' }, { city: 'Sandy', state: 'UT' },
    { city: 'Ogden', state: 'UT' }, { city: 'St. George', state: 'UT' },
    { city: 'Layton', state: 'UT' }, { city: 'South Jordan', state: 'UT' },
    // Arizona
    { city: 'Phoenix', state: 'AZ' }, { city: 'Tucson', state: 'AZ' },
    { city: 'Mesa', state: 'AZ' }, { city: 'Chandler', state: 'AZ' },
    { city: 'Glendale', state: 'AZ' }, { city: 'Scottsdale', state: 'AZ' },
    { city: 'Gilbert', state: 'AZ' }, { city: 'Tempe', state: 'AZ' },
    { city: 'Surprise', state: 'AZ' }, { city: 'Peoria', state: 'AZ' },
    // New Mexico
    { city: 'Albuquerque', state: 'NM' }, { city: 'Las Cruces', state: 'NM' },
    { city: 'Rio Rancho', state: 'NM' }, { city: 'Santa Fe', state: 'NM' },
    { city: 'Roswell', state: 'NM' }, { city: 'Farmington', state: 'NM' },
    { city: 'Clovis', state: 'NM' }, { city: 'Hobbs', state: 'NM' },
    { city: 'Alamogordo', state: 'NM' }, { city: 'Carlsbad', state: 'NM' },
    // Idaho
    { city: 'Boise', state: 'ID' }, { city: 'Nampa', state: 'ID' },
    { city: 'Meridian', state: 'ID' }, { city: 'Idaho Falls', state: 'ID' },
    { city: 'Pocatello', state: 'ID' }, { city: 'Caldwell', state: 'ID' },
    { city: 'Coeur d\'Alene', state: 'ID' }, { city: 'Twin Falls', state: 'ID' },
    { city: 'Lewiston', state: 'ID' }, { city: 'Post Falls', state: 'ID' },
    // Montana
    { city: 'Billings', state: 'MT' }, { city: 'Missoula', state: 'MT' },
    { city: 'Great Falls', state: 'MT' }, { city: 'Bozeman', state: 'MT' },
    { city: 'Butte', state: 'MT' }, { city: 'Helena', state: 'MT' },
    { city: 'Kalispell', state: 'MT' }, { city: 'Havre', state: 'MT' },
    { city: 'Anaconda', state: 'MT' }, { city: 'Livingston', state: 'MT' },
    // Wyoming
    { city: 'Cheyenne', state: 'WY' }, { city: 'Casper', state: 'WY' },
    { city: 'Laramie', state: 'WY' }, { city: 'Gillette', state: 'WY' },
    { city: 'Rock Springs', state: 'WY' }, { city: 'Sheridan', state: 'WY' },
    { city: 'Green River', state: 'WY' }, { city: 'Evanston', state: 'WY' },
    { city: 'Riverton', state: 'WY' }, { city: 'Jackson', state: 'WY' },
    // Texas (El Paso — MST)
    { city: 'El Paso', state: 'TX' },
    // Canada — Alberta (MST)
    { city: 'Calgary', state: 'AB', country: 'CA' }, { city: 'Edmonton', state: 'AB', country: 'CA' },
    { city: 'Red Deer', state: 'AB', country: 'CA' }, { city: 'Lethbridge', state: 'AB', country: 'CA' },
    { city: 'St. Albert', state: 'AB', country: 'CA' }, { city: 'Medicine Hat', state: 'AB', country: 'CA' },
    { city: 'Grande Prairie', state: 'AB', country: 'CA' }, { city: 'Airdrie', state: 'AB', country: 'CA' },
    { city: 'Spruce Grove', state: 'AB', country: 'CA' }, { city: 'Fort McMurray', state: 'AB', country: 'CA' },
  ],
  PST: [
    // California
    { city: 'Los Angeles', state: 'CA' }, { city: 'San Diego', state: 'CA' },
    { city: 'San Jose', state: 'CA' }, { city: 'San Francisco', state: 'CA' },
    { city: 'Fresno', state: 'CA' }, { city: 'Sacramento', state: 'CA' },
    { city: 'Long Beach', state: 'CA' }, { city: 'Oakland', state: 'CA' },
    { city: 'Bakersfield', state: 'CA' }, { city: 'Anaheim', state: 'CA' },
    // Washington
    { city: 'Seattle', state: 'WA' }, { city: 'Spokane', state: 'WA' },
    { city: 'Tacoma', state: 'WA' }, { city: 'Vancouver', state: 'WA' },
    { city: 'Bellevue', state: 'WA' }, { city: 'Kennewick', state: 'WA' },
    { city: 'Kirkland', state: 'WA' }, { city: 'Bellingham', state: 'WA' },
    { city: 'Kent', state: 'WA' }, { city: 'Everett', state: 'WA' },
    // Oregon
    { city: 'Portland', state: 'OR' }, { city: 'Salem', state: 'OR' },
    { city: 'Eugene', state: 'OR' }, { city: 'Gresham', state: 'OR' },
    { city: 'Hillsboro', state: 'OR' }, { city: 'Bend', state: 'OR' },
    { city: 'Medford', state: 'OR' }, { city: 'Springfield', state: 'OR' },
    { city: 'Beaverton', state: 'OR' }, { city: 'Corvallis', state: 'OR' },
    // Nevada
    { city: 'Las Vegas', state: 'NV' }, { city: 'Henderson', state: 'NV' },
    { city: 'Reno', state: 'NV' }, { city: 'North Las Vegas', state: 'NV' },
    { city: 'Sparks', state: 'NV' }, { city: 'Carson City', state: 'NV' },
    { city: 'Elko', state: 'NV' }, { city: 'Fernley', state: 'NV' },
    { city: 'Boulder City', state: 'NV' }, { city: 'Mesquite', state: 'NV' },
    // Alaska (AKST grouped here)
    { city: 'Anchorage', state: 'AK' }, { city: 'Fairbanks', state: 'AK' },
    { city: 'Juneau', state: 'AK' }, { city: 'Sitka', state: 'AK' },
    { city: 'Ketchikan', state: 'AK' }, { city: 'Wasilla', state: 'AK' },
    { city: 'Palmer', state: 'AK' }, { city: 'Homer', state: 'AK' },
    { city: 'Kodiak', state: 'AK' }, { city: 'Kenai', state: 'AK' },
    // Hawaii (HST grouped here)
    { city: 'Honolulu', state: 'HI' }, { city: 'Pearl City', state: 'HI' },
    { city: 'Hilo', state: 'HI' }, { city: 'Kailua', state: 'HI' },
    { city: 'Waipahu', state: 'HI' }, { city: 'Kaneohe', state: 'HI' },
    { city: 'Mililani', state: 'HI' }, { city: 'Ewa Beach', state: 'HI' },
    { city: 'Kahului', state: 'HI' }, { city: 'Kihei', state: 'HI' },
    // Canada — British Columbia (PST)
    { city: 'Vancouver', state: 'BC', country: 'CA' }, { city: 'Victoria', state: 'BC', country: 'CA' },
    { city: 'Kelowna', state: 'BC', country: 'CA' }, { city: 'Abbotsford', state: 'BC', country: 'CA' },
    { city: 'Burnaby', state: 'BC', country: 'CA' }, { city: 'Richmond', state: 'BC', country: 'CA' },
    { city: 'Surrey', state: 'BC', country: 'CA' }, { city: 'Langley', state: 'BC', country: 'CA' },
    { city: 'Kamloops', state: 'BC', country: 'CA' }, { city: 'Nanaimo', state: 'BC', country: 'CA' },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function jitter(base, spread = 800) { return base + Math.floor(Math.random() * spread); }

function formatPhone(p) {
  if (!p) return null;
  const d = p.replace(/\D/g, '');
  if (d.length === 10) return '+1' + d;
  if (d.length === 11 && d[0] === '1') return '+' + d;
  return null;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── State file ────────────────────────────────────────────────────────────────

function loadCityState() {
  try { return JSON.parse(fs.readFileSync(CITY_STATE_FILE, 'utf8')); } catch { return {}; }
}
function saveCityState(state) {
  try { fs.writeFileSync(CITY_STATE_FILE, JSON.stringify(state, null, 2)); } catch {}
}

// ── Supabase ──────────────────────────────────────────────────────────────────

async function phoneExists(phone) {
  return new Promise(resolve => {
    const u = new URL(`${SUPABASE_URL}/rest/v1/leads?select=id&phone=eq.${encodeURIComponent(phone)}&limit=1`);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'GET',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => { try { resolve(JSON.parse(b).length > 0); } catch { resolve(false); } });
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

// Load all existing website lead phones into a Set once at startup.
// Used instead of per-lead Supabase checks during the scrape loop.
async function loadExistingPhones() {
  const phones = new Set();
  let offset = 0;
  const batch = 1000;
  while (true) {
    const data = await new Promise(resolve => {
      const u = new URL(
        `${SUPABASE_URL}/rest/v1/leads?select=phone&lead_category=eq.website&phone=not.is.null&limit=${batch}&offset=${offset}`
      );
      const req = https.request({
        hostname: u.hostname, path: u.pathname + u.search, method: 'GET',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      }, res => {
        let b = '';
        res.on('data', d => b += d);
        res.on('end', () => { try { resolve(JSON.parse(b)); } catch { resolve([]); } });
      });
      req.on('error', () => resolve([]));
      req.end();
    });
    if (!data || data.length === 0) break;
    data.forEach(r => { if (r.phone) phones.add(r.phone); });
    if (data.length < batch) break;
    offset += batch;
  }
  return phones;
}

async function countTodayLeads() {
  return new Promise(resolve => {
    const today = new Date().toISOString().split('T')[0];
    const u = new URL(`${SUPABASE_URL}/rest/v1/leads?select=id&lead_category=eq.website&created_at=gte.${today}T00:00:00Z`);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'GET',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: 'count=exact' },
    }, res => {
      const m = (res.headers['content-range'] || '').match(/\/(\d+)$/);
      resolve(m ? parseInt(m[1]) : 0);
    });
    req.on('error', () => resolve(0));
    req.end();
  });
}

// Count today's website leads per timezone (US + CA combined, for TZ cap check)
async function countTodayLeadsByTz() {
  const today = new Date().toISOString().split('T')[0];
  const counts = { EST: 0, CST: 0, MST: 0, PST: 0 };
  await Promise.all(Object.keys(counts).map(tz => new Promise(resolve => {
    const u = new URL(`${SUPABASE_URL}/rest/v1/leads?select=id&lead_category=eq.website&timezone=eq.${tz}&created_at=gte.${today}T00:00:00Z`);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'GET',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: 'count=exact' },
    }, res => {
      const m = (res.headers['content-range'] || '').match(/\/(\d+)$/);
      counts[tz] = m ? parseInt(m[1]) : 0;
      resolve();
    });
    req.on('error', () => resolve());
    req.end();
  })));
  return counts;
}

// Count today's calling leads per timezone (US only, for calling slot tracking)
async function countTodayCallingByTz() {
  const today = new Date().toISOString().split('T')[0];
  const counts = { EST: 0, CST: 0, MST: 0, PST: 0 };
  await Promise.all(Object.keys(counts).map(tz => new Promise(resolve => {
    const u = new URL(`${SUPABASE_URL}/rest/v1/leads?select=id&lead_category=eq.calling&timezone=eq.${tz}&created_at=gte.${today}T00:00:00Z`);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'GET',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: 'count=exact' },
    }, res => {
      const m = (res.headers['content-range'] || '').match(/\/(\d+)$/);
      counts[tz] = m ? parseInt(m[1]) : 0;
      resolve();
    });
    req.on('error', () => resolve());
    req.end();
  })));
  return counts;
}

// Count today's Canadian website leads (all TZs combined)
async function countTodayCALeads() {
  return new Promise(resolve => {
    const today = new Date().toISOString().split('T')[0];
    const u = new URL(`${SUPABASE_URL}/rest/v1/leads?select=id&lead_category=eq.website&country=eq.CA&created_at=gte.${today}T00:00:00Z`);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'GET',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: 'count=exact' },
    }, res => {
      const m = (res.headers['content-range'] || '').match(/\/(\d+)$/);
      resolve(m ? parseInt(m[1]) : 0);
    });
    req.on('error', () => resolve(0));
    req.end();
  });
}

async function insertLead(lead, category = 'website') {
  return new Promise(resolve => {
    const body = JSON.stringify({
      full_name:        lead.business_name,
      first_name:       lead.business_name.split(' ')[0],
      last_name:        lead.business_name.split(' ').slice(1).join(' ') || '',
      phone:            lead.phone,
      city:             lead.city,
      state_province:   lead.state,
      country:          lead.country || 'US',
      timezone:         lead.tz,
      profile_url:      lead.maps_url,
      lead_category:    category,
      source_brokerage: lead.business_type,
      reviewer_name:    lead.reviewer_name || null,
    });
    const u = new URL(`${SUPABASE_URL}/rest/v1/leads`);
    const req = https.request({
      hostname: u.hostname, path: u.pathname, method: 'POST',
      headers: {
        apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body),
        Prefer: 'return=minimal',
      },
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        if (res.statusCode >= 300) log(`  INSERT ERROR ${res.statusCode}: ${b.slice(0, 200)}`);
        resolve(res.statusCode < 300);
      });
    });
    req.on('error', e => { log(`  INSERT NETWORK ERROR: ${e.message}`); resolve(false); });
    req.write(body);
    req.end();
  });
}

// ── Scraping ──────────────────────────────────────────────────────────────────

// Scroll the left-panel feed until all results are loaded.
async function scrollFeedToEnd(page) {
  let prevCount = 0, stale = 0;
  for (let i = 0; i < 25 && stale < 5; i++) {
    const { count, atEnd } = await page.evaluate(() => ({
      count: document.querySelectorAll('[role="feed"] a[href*="/maps/place/"]').length,
      atEnd: (document.body.innerText || '').includes("You've reached the end of the list"),
    }));
    if (count === prevCount) stale++;
    else stale = 0;
    prevCount = count;
    if (atEnd) break;
    await page.evaluate(() => {
      const feed = document.querySelector('[role="feed"]');
      if (feed) feed.scrollTop = feed.scrollHeight;
    });
    await sleep(800); // reduced from 1300ms
  }
  log(`  Feed scrolled: ${prevCount} cards`);
}

// Extract business details from the right-pane detail view.
// Called after clicking a card in the feed (SPA update) or after page.goto.
async function extractDetailsFromPane(page) {
  return page.evaluate(() => {
    // Phone — prefer data-item-id attribute, fall back to tel: link
    let phone = null;
    document.querySelectorAll('[data-item-id]').forEach(el => {
      const id = el.getAttribute('data-item-id') || '';
      if (id.startsWith('phone:tel:')) phone = id.replace('phone:tel:', '').trim();
    });
    if (!phone) {
      const tel = document.querySelector('a[href^="tel:"]');
      if (tel) phone = tel.href.replace('tel:', '').trim();
    }

    // Website — any website link = has website (even social). Skip these leads.
    const hasWebsite = !!document.querySelector('a[data-item-id="authority"]');

    // Business name
    let name = null;
    document.querySelectorAll('h1').forEach(el => {
      const t = (el.innerText || '').trim();
      if (t && t !== 'Results' && t.length > 1) name = t;
    });
    if (!name) {
      try {
        const seg = window.location.href.split('/maps/place/')[1]?.split('/')[0];
        if (seg) name = decodeURIComponent(seg.replace(/\+/g, ' '));
      } catch {}
    }

    // Reviewer name from first review (for CSV role column)
    let reviewer_name = null;
    const reviewEl = document.querySelector('[data-review-id]');
    if (reviewEl) {
      const photoBtn = reviewEl.querySelector('button[aria-label^="Photo of "]');
      if (photoBtn) {
        const t = (photoBtn.getAttribute('aria-label') || '').replace('Photo of ', '').trim();
        const bizLower = (name || '').toLowerCase();
        if (t && t.toLowerCase() !== bizLower && t.length > 1 && t.length < 60) {
          reviewer_name = t;
        }
      }
    }

    return { name, phone, hasWebsite, reviewer_name };
  });
}

// existingPhones is a Set passed in from main — avoids per-card Supabase roundtrips.
async function scrapeSearch(page, bizType, city, state, tz, country, existingPhones) {
  const query = `${bizType} ${city} ${state}`;
  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}/`;

  log(`  Searching: "${query}"`);
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

  try {
    await page.waitForSelector('[role="feed"]', { timeout: 8000 });
  } catch {
    log(`  No results feed — skipping`);
    return [];
  }

  // Wait for first card to appear (cards load async after feed structure, ~2-4s)
  await page.waitForFunction(
    () => document.querySelectorAll('[role="feed"] a[href*="/maps/place/"]').length > 0,
    { timeout: 8000 }
  ).catch(() => {});

  // Scroll to load all cards
  await scrollFeedToEnd(page);

  // Extract all data from feed cards in ONE evaluate() call — zero clicks.
  //
  // Confirmed card structure (DOM inspection):
  //   div.Nv2PK  ← card container (link.parentElement)
  //     a.hfpxzc[aria-label="Business Name"][href*="/maps/place/"]  ← empty overlay link
  //     [sibling divs with card content: rating, address, phone, review snippet]
  //     [sibling div: action buttons]
  //       a[aria-label="Visit X's website"]  ← Website button
  //       a[aria-label="Get directions to X"] ← Directions button
  //
  // Name: link.getAttribute('aria-label') — the place link itself carries the business name
  // Website: any aria-label in parent container containing "website" (place link only has name — no false positive)
  // Phone: parent.innerText contains the phone number as visible text
  const rawCards = await page.evaluate(() => {
    const results = [];
    const seenNames = new Set();
    const phoneRe = /\+?1?\s*[\(]?\d{3}[\)]?[\s.\-]?\d{3}[\s.\-]?\d{4}/;

    for (const link of document.querySelectorAll('[role="feed"] a[href*="/maps/place/"]')) {
      const parent = link.parentElement;
      if (!parent) continue;

      // Business name is in the link's aria-label (the <a> is an empty visual overlay)
      const name = (link.getAttribute('aria-label') || '').trim();
      if (!name || name.length < 2) continue;
      if (seenNames.has(name)) continue;
      seenNames.add(name);

      // Website detection: if the card shows "Website" as visible text, skip.
      // Google Maps feed cards show "Website" and "Phone" as plain text labels.
      // Also catch aria-label="Visit X's website" as a belt-and-suspenders check.
      const cardText = parent.innerText || '';
      const hasWebsiteText = /\bWebsite\b/i.test(cardText);
      const hasWebsiteAria = Array.from(parent.querySelectorAll('[aria-label]')).some(el =>
        /website/i.test(el.getAttribute('aria-label') || '')
      );
      if (hasWebsiteText || hasWebsiteAria) continue;

      // Phone from parent innerText (phone visible in card without clicking)
      const m = (parent.innerText || '').match(phoneRe);
      results.push({ name, rawPhone: m ? m[0] : null });
    }
    return results;
  });

  log(`  Cards: ${rawCards.length} no-website entries`);
  const leads = [];

  for (const { name, rawPhone } of rawCards) {
    if (isChain(name)) { log(`  Skip: "${name}" — chain`); continue; }
    if (!rawPhone) { log(`  Skip: "${name}" — no phone in card`); continue; }
    const phone = formatPhone(rawPhone);
    if (!phone) continue;
    if (existingPhones.has(phone)) { log(`  Dupe: "${name}"`); continue; }
    // Don't add to existingPhones here — main loop does it after successful insert
    log(`  + "${name}" — ${phone}`);
    leads.push({ business_name: name, phone, city, state, tz, country, maps_url: searchUrl, business_type: bizType, reviewer_name: null });
  }

  return leads;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) { log('ERROR: Missing Supabase env vars'); process.exit(1); }

  // --limit=N for testing (caps total leads saved)
  const limitArg = parseInt((process.argv.find(a => a.startsWith('--limit=')) || '').replace('--limit=', '') || '0') || null;
  // --tz-first=MST  — put this TZ at the front of the city list
  const tzFirst = (process.argv.find(a => a.startsWith('--tz-first=')) || '').replace('--tz-first=', '') || null;

  log('=== Google Maps lead scraper — pest control + home improvement ===');
  log(`Niches: ${BUSINESS_TYPES.join(', ')}`);
  log(`Daily target: ${DAILY_TARGET} | US: ${US_TZ_TARGET}/TZ (${CALLING_PER_TZ} calling + ${US_TZ_TARGET - CALLING_PER_TZ} website) | CA: ${CA_TOTAL_TARGET} total${limitArg ? ` | test limit: ${limitArg}` : ''}`);

  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: `http://localhost:${PORT}`, defaultViewport: null });
  } catch (err) {
    log(`ERROR: Cannot connect to Chrome on port ${PORT}: ${err.message}`);
    process.exit(1);
  }

  const todayStart = await countTodayLeads();
  log(`Website leads already today: ${todayStart}`);
  if (todayStart >= DAILY_TARGET && !limitArg) {
    log('Daily target reached — exiting');
    browser.disconnect();
    return;
  }

  const [tzCounts, callingCounts, existingPhones, caTotal] = await Promise.all([
    countTodayLeadsByTz(),
    countTodayCallingByTz(),
    loadExistingPhones(),
    countTodayCALeads(),
  ]);
  let caToday = caTotal;
  log(`TZ website — EST:${tzCounts.EST} CST:${tzCounts.CST} MST:${tzCounts.MST} PST:${tzCounts.PST} (cap: ${US_TZ_TARGET})`);
  log(`TZ calling — EST:${callingCounts.EST} CST:${callingCounts.CST} MST:${callingCounts.MST} PST:${callingCounts.PST} (cap: ${CALLING_PER_TZ})`);
  log(`Canada today: ${caToday}/${CA_TOTAL_TARGET} | Existing phones: ${existingPhones.size}`);

  // Close any stale maps pages
  const existingPages = await browser.pages();
  for (const p of existingPages) {
    const url = p.url();
    if (url.includes('google.com/maps') || url.includes('maps/place') || url.includes('maps/search')) {
      await p.close().catch(() => {});
    }
  }

  const cityState = loadCityState();
  const today = new Date().toISOString().split('T')[0];
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  let totalSaved = 0;

  try {
    // Build a flat city list shuffled, grouped by TZ for cap enforcement
    // If --tz-first=X is set, that TZ's cities go first
    const tzEntries = Object.entries(TZ_CITIES);
    if (tzFirst) {
      const idx = tzEntries.findIndex(([tz]) => tz === tzFirst);
      if (idx > 0) tzEntries.unshift(...tzEntries.splice(idx, 1));
    }
    const allCities = [];
    for (const [tz, cities] of tzEntries) {
      for (const c of shuffle([...cities])) {
        allCities.push({ ...c, tz });
      }
    }

    outer: for (const cityObj of allCities) {
      const { city, state, tz } = cityObj;
      const isCA = cityObj.country === 'CA';

      // Skip if this TZ/CA bucket is full
      if (isCA && caToday >= CA_TOTAL_TARGET) continue;
      if (!isCA && (tzCounts[tz] || 0) >= US_TZ_TARGET) continue;
      if (limitArg && totalSaved >= limitArg) break;
      if (todayStart + totalSaved >= DAILY_TARGET && !limitArg) { log('Daily target reached — stopping'); break; }

      const cityKey = `${city}_${state}`;
      const doneTypes = (cityState[cityKey]?.date === today) ? (cityState[cityKey].types || []) : [];
      const pending = BUSINESS_TYPES.filter(t => !doneTypes.includes(t));

      for (const bizType of pending) {
        if (isCA && caToday >= CA_TOTAL_TARGET) break;
        if (!isCA && (tzCounts[tz] || 0) >= US_TZ_TARGET) break;
        if (limitArg && totalSaved >= limitArg) break outer;
        if (todayStart + totalSaved >= DAILY_TARGET && !limitArg) break outer;

        const tzLabel = isCA ? `CA:${caToday}/${CA_TOTAL_TARGET}` : `${tz}:${tzCounts[tz] || 0}/${US_TZ_TARGET}`;
        log(`\n=== ${city}, ${state} (${tzLabel}) — "${bizType}" ===`);

        try {
          const leads = await scrapeSearch(page, bizType, city, state, tz, cityObj.country || 'US', existingPhones);
          for (const lead of leads) {
            if (limitArg && totalSaved >= limitArg) break;
            if (existingPhones.has(lead.phone)) continue;

            const leadIsCA = lead.country === 'CA';
            if (leadIsCA && caToday >= CA_TOTAL_TARGET) continue;
            if (!leadIsCA && (tzCounts[lead.tz] || 0) >= US_TZ_TARGET) continue;

            // Assign category:
            // US leads: first CALLING_PER_TZ per TZ → 'calling', rest → 'website'
            // CA leads: always 'website'
            const category = (!leadIsCA && (callingCounts[lead.tz] || 0) < CALLING_PER_TZ)
              ? 'calling' : 'website';

            if (await insertLead(lead, category)) {
              existingPhones.add(lead.phone);
              totalSaved++;
              if (leadIsCA) {
                caToday++;
              } else {
                tzCounts[lead.tz] = (tzCounts[lead.tz] || 0) + 1;
                if (category === 'calling') callingCounts[lead.tz] = (callingCounts[lead.tz] || 0) + 1;
              }
            }
          }
        } catch (err) {
          log(`ERROR in scrapeSearch: ${err.message}`);
        }

        if (!cityState[cityKey] || cityState[cityKey].date !== today) {
          cityState[cityKey] = { date: today, types: [] };
        }
        cityState[cityKey].types.push(bizType);
        saveCityState(cityState);

        await sleep(500); // reduced from jitter(1500,1000)
      }
    }
  } finally {
    await page.close().catch(() => {});
    browser.disconnect();
    log(`\n=== Done: ${totalSaved} leads saved (total today: ${todayStart + totalSaved}/${DAILY_TARGET}) ===`);
  }
}

main().catch(err => { log(`FATAL: ${err.message}`); process.exit(1); });
