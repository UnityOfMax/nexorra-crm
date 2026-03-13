export interface LandingPageBlock {
  id: string;
  type:
    | 'hero'
    | 'text'
    | 'image'
    | 'cta'
    | 'form'
    | 'video'
    | 'testimonial'
    | 'spacer'
    | 'features'
    | 're_hero'
    | 're_about'
    | 're_reviews'
    | 're_location'
    | 're_footer'
    | 're_properties'
    | 're_team';
  data: Record<string, any>;
  order: number;
}

export interface LandingPageContent {
  blocks: LandingPageBlock[];
  styles: {
    fontFamily: string;
    primaryColor: string;
    backgroundColor?: string;
    faviconUrl?: string;
  };
  calendarSettings?: {
    startHour?: number;    // 0–23, default 9
    endHour?: number;      // 0–23, default 17
    timezone?: string;     // e.g. "America/New_York"
    availableDays?: number[]; // 0=Sun … 6=Sat, default [1,2,3,4,5]
  };
}

export interface CustomFormField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  placeholder?: string;
  required?: boolean;
  options?: string[]; // for 'select' type
}

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  content: LandingPageContent;
}

let blockIdCounter = 0;
function genId() {
  blockIdCounter++;
  return `block-${blockIdCounter}-${Date.now()}`;
}

export const templates: PageTemplate[] = [
  {
    id: 'real-estate-agent',
    name: 'Real Estate Agent',
    description: 'Agent profile with home search CTA, reviews, map, and contact info',
    thumbnail: '🏡',
    content: {
      blocks: [
        {
          id: genId(), type: 're_hero', order: 0,
          data: {
            agentName: 'Jane Smith',
            title: 'Licensed Real Estate Agent',
            subtitle: "Helping families find their dream home in Greater Miami for over 15 years. Let's find yours.",
            profileImageUrl: '',
            bgColor: '#0f172a',
            accentColor: '#f59e0b',
            ctaText: 'View Available Homes',
          }
        },
        {
          id: genId(), type: 're_about', order: 1,
          data: {
            heading: 'About Jane',
            bio: "With over 15 years of experience in the Greater Miami real estate market, I specialize in helping first-time buyers, investors, and growing families find the perfect property. My deep market knowledge and client-first approach means you'll never feel lost in the process.",
            agentPhotoUrl: '',
            yearsExperience: 15,
            dealsClosed: 400,
            specialties: ['Luxury Homes', 'First-Time Buyers', 'Investment Properties', 'Waterfront Estates'],
            accentColor: '#f59e0b',
          }
        },
        {
          id: genId(), type: 're_reviews', order: 2,
          data: {
            heading: 'What My Clients Say',
            reviews: [
              {
                text: "Jane made buying our first home so easy. She was patient, knowledgeable, and always available. We couldn't have done it without her!",
                author: 'Michael & Sarah T.',
                location: 'Coral Gables, FL',
                rating: 5,
              },
              {
                text: 'Sold my condo in 12 days over asking price. Jane\'s marketing strategy is simply unmatched. Highly recommend!',
                author: 'David R.',
                location: 'Brickell, FL',
                rating: 5,
              },
              {
                text: 'As an investor, I rely on market expertise. Jane consistently delivers that and more. My go-to agent for every deal.',
                author: 'Lisa M.',
                location: 'Miami Beach, FL',
                rating: 5,
              },
            ],
            ctaText: 'Find Your Dream Home',
            accentColor: '#f59e0b',
          }
        },
        {
          id: genId(), type: 're_location', order: 3,
          data: {
            heading: 'Find Me',
            address: '123 Brickell Ave, Miami, FL 33131',
            phone: '(305) 555-0123',
            email: 'jane@janesmith.realtor',
            mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d57379.80390789073!2d-80.23906339999999!3d25.7616798!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88d9b0a20ec8c111%3A0xff96f271ddad4f65!2sMiami%2C+FL!5e0!3m2!1sen!2sus!4v1&output=embed',
            accentColor: '#f59e0b',
          }
        },
        {
          id: genId(), type: 're_footer', order: 4,
          data: {
            agentName: 'Jane Smith',
            brokerage: 'Sunshine Realty Group',
            phone: '(305) 555-0123',
            email: 'jane@janesmith.realtor',
            license: 'License #FL-3456789',
            accentColor: '#f59e0b',
          }
        },
      ],
      styles: { fontFamily: 'Inter', primaryColor: '#f59e0b', backgroundColor: '#ffffff' }
    }
  },
];

export function getEmptyContent(): LandingPageContent {
  return {
    blocks: [],
    styles: {
      fontFamily: 'Inter',
      primaryColor: '#0ea5e9',
    }
  };
}
