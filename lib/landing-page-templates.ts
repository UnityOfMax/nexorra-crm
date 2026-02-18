export interface LandingPageBlock {
  id: string;
  type: 'hero' | 'text' | 'image' | 'cta' | 'form' | 'video' | 'testimonial' | 'spacer' | 'features';
  data: Record<string, any>;
  order: number;
}

export interface LandingPageContent {
  blocks: LandingPageBlock[];
  styles: {
    fontFamily: string;
    primaryColor: string;
    backgroundColor?: string;
  };
}

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string; // emoji for now
  content: LandingPageContent;
}

let blockIdCounter = 0;
function genId() {
  blockIdCounter++;
  return `block-${blockIdCounter}-${Date.now()}`;
}

export const templates: PageTemplate[] = [
  {
    id: 'lead-capture',
    name: 'Lead Capture',
    description: 'Hero section with a lead capture form and testimonials',
    thumbnail: '📋',
    content: {
      blocks: [
        {
          id: genId(), type: 'hero', order: 0,
          data: {
            heading: 'Get Your Free Consultation Today',
            subheading: 'Fill out the form below and one of our experts will get in touch within 24 hours.',
            ctaText: '',
            ctaLink: '',
            bgColor: '#1a1a2e',
            textColor: '#ffffff',
          }
        },
        {
          id: genId(), type: 'form', order: 1,
          data: {
            heading: 'Request a Free Quote',
            fields: ['name', 'email', 'phone'],
            buttonText: 'Get Started',
            buttonColor: '#0ea5e9',
          }
        },
        {
          id: genId(), type: 'spacer', order: 2,
          data: { height: 40 }
        },
        {
          id: genId(), type: 'testimonial', order: 3,
          data: {
            quote: 'This service completely transformed our business. Highly recommended!',
            author: 'Sarah Johnson',
            role: 'CEO, TechStart Inc.',
          }
        },
        {
          id: genId(), type: 'testimonial', order: 4,
          data: {
            quote: 'Professional, reliable, and delivered exactly what we needed.',
            author: 'Mike Chen',
            role: 'Founder, GrowthLabs',
          }
        },
      ],
      styles: { fontFamily: 'Inter', primaryColor: '#0ea5e9' }
    }
  },
  {
    id: 'webinar',
    name: 'Webinar Registration',
    description: 'Video embed with registration form and countdown feel',
    thumbnail: '🎥',
    content: {
      blocks: [
        {
          id: genId(), type: 'hero', order: 0,
          data: {
            heading: 'Free Live Webinar',
            subheading: 'Learn the secrets to scaling your business in 2025. Reserve your spot now.',
            ctaText: 'Register Now',
            ctaLink: '#register',
            bgColor: '#0f172a',
            textColor: '#ffffff',
          }
        },
        {
          id: genId(), type: 'video', order: 1,
          data: {
            url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            caption: 'Watch the preview',
          }
        },
        {
          id: genId(), type: 'features', order: 2,
          data: {
            heading: 'What You\'ll Learn',
            items: [
              { title: 'Growth Strategies', description: 'Proven methods to scale your revenue' },
              { title: 'Lead Generation', description: 'How to attract high-quality leads on autopilot' },
              { title: 'Automation', description: 'Save 20+ hours per week with smart workflows' },
            ]
          }
        },
        {
          id: genId(), type: 'form', order: 3,
          data: {
            heading: 'Register for the Webinar',
            fields: ['name', 'email'],
            buttonText: 'Reserve My Spot',
            buttonColor: '#22c55e',
          }
        },
      ],
      styles: { fontFamily: 'Inter', primaryColor: '#22c55e' }
    }
  },
  {
    id: 'product-launch',
    name: 'Product Launch',
    description: 'Showcase your product with features and a strong CTA',
    thumbnail: '🚀',
    content: {
      blocks: [
        {
          id: genId(), type: 'hero', order: 0,
          data: {
            heading: 'Introducing the Future of [Your Product]',
            subheading: 'The all-in-one solution that saves you time, money, and headaches.',
            ctaText: 'Learn More',
            ctaLink: '#features',
            bgColor: '#7c3aed',
            textColor: '#ffffff',
          }
        },
        {
          id: genId(), type: 'features', order: 1,
          data: {
            heading: 'Why Choose Us',
            items: [
              { title: 'Lightning Fast', description: 'Get results in minutes, not hours' },
              { title: 'Easy to Use', description: 'No technical skills required' },
              { title: 'Affordable', description: 'Plans starting at just $29/month' },
            ]
          }
        },
        {
          id: genId(), type: 'testimonial', order: 2,
          data: {
            quote: 'This product paid for itself in the first week. An absolute game-changer.',
            author: 'Alex Rivera',
            role: 'Marketing Director',
          }
        },
        {
          id: genId(), type: 'cta', order: 3,
          data: {
            text: 'Start Your Free Trial',
            link: '#signup',
            color: '#7c3aed',
            size: 'large',
          }
        },
      ],
      styles: { fontFamily: 'Inter', primaryColor: '#7c3aed' }
    }
  },
  {
    id: 'simple-optin',
    name: 'Simple Opt-in',
    description: 'Minimal page with hero and email capture form',
    thumbnail: '✉️',
    content: {
      blocks: [
        {
          id: genId(), type: 'hero', order: 0,
          data: {
            heading: 'Join Our Exclusive List',
            subheading: 'Get insider tips and early access to new features. No spam, ever.',
            ctaText: '',
            ctaLink: '',
            bgColor: '#0ea5e9',
            textColor: '#ffffff',
          }
        },
        {
          id: genId(), type: 'form', order: 1,
          data: {
            heading: 'Sign Up Now',
            fields: ['name', 'email'],
            buttonText: 'Subscribe',
            buttonColor: '#0ea5e9',
          }
        },
      ],
      styles: { fontFamily: 'Inter', primaryColor: '#0ea5e9' }
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
