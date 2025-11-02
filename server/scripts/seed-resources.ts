import { db } from '../db';
import { 
  resources, 
  resourceCategories,
  resourceTags,
  resourceTagMappings,
  type InsertResource
} from '@shared/schema';
import { eq } from 'drizzle-orm';

// Helper to get category ID by slug
async function getCategoryId(slug: string): Promise<number> {
  const [category] = await db.select().from(resourceCategories).where(eq(resourceCategories.slug, slug)).limit(1);
  if (!category) throw new Error(`Category not found: ${slug}`);
  return category.id;
}

// Helper to get tag IDs by slugs
async function getTagIds(slugs: string[]): Promise<number[]> {
  const tags = await db.select().from(resourceTags);
  return slugs.map(slug => {
    const tag = tags.find(t => t.slug === slug);
    if (!tag) throw new Error(`Tag not found: ${slug}`);
    return tag.id;
  });
}

interface ResourceData {
  title: string;
  description: string;
  url: string;
  resourceType: 'tool' | 'template' | 'guide' | 'video' | 'article';
  categorySlug: string;
  phaseRelevance: string[];
  ideaTypes: string[];
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  estimatedTimeMinutes: number;
  isPremium: boolean;
  tags: string[];
  metadata?: Record<string, any>;
}

// Research Phase Resources (10+)
const researchPhaseResources: ResourceData[] = [
  {
    title: 'Customer Interview Script Template',
    description: 'Comprehensive template for conducting customer discovery interviews with proven question frameworks',
    url: 'https://example.com/customer-interview-template',
    resourceType: 'template',
    categorySlug: 'survey-tools',
    phaseRelevance: ['research'],
    ideaTypes: ['software', 'physical_product', 'service', 'marketplace'],
    difficultyLevel: 'beginner',
    estimatedTimeMinutes: 30,
    isPremium: false,
    tags: ['template', 'free', 'beginner-friendly', 'quick-start'],
    metadata: { format: 'docx', pages: 3 }
  },
  {
    title: 'Google Trends for Market Research',
    description: 'Free tool to analyze search trends and market interest over time',
    url: 'https://trends.google.com',
    resourceType: 'tool',
    categorySlug: 'market-analysis',
    phaseRelevance: ['research'],
    ideaTypes: ['software', 'physical_product', 'service', 'marketplace'],
    difficultyLevel: 'beginner',
    estimatedTimeMinutes: 20,
    isPremium: false,
    tags: ['tool', 'free', 'beginner-friendly', 'popular'],
  },
  {
    title: 'Typeform Survey Builder',
    description: 'Create beautiful, engaging surveys for customer validation',
    url: 'https://www.typeform.com',
    resourceType: 'tool',
    categorySlug: 'survey-tools',
    phaseRelevance: ['research', 'validation'],
    ideaTypes: ['software', 'physical_product', 'service', 'marketplace'],
    difficultyLevel: 'beginner',
    estimatedTimeMinutes: 45,
    isPremium: false,
    tags: ['tool', 'freemium', 'beginner-friendly', 'popular'],
  },
  {
    title: 'Competitive Analysis Framework',
    description: 'Step-by-step guide to analyzing competitors and identifying market gaps',
    url: 'https://example.com/competitive-analysis-guide',
    resourceType: 'guide',
    categorySlug: 'market-analysis',
    phaseRelevance: ['research'],
    ideaTypes: ['software', 'physical_product', 'service', 'marketplace'],
    difficultyLevel: 'intermediate',
    estimatedTimeMinutes: 60,
    isPremium: false,
    tags: ['guide', 'free', 'in-depth'],
  },
  {
    title: 'SurveyMonkey',
    description: 'Professional survey platform with advanced analytics',
    url: 'https://www.surveymonkey.com',
    resourceType: 'tool',
    categorySlug: 'survey-tools',
    phaseRelevance: ['research', 'validation'],
    ideaTypes: ['software', 'physical_product', 'service', 'marketplace'],
    difficultyLevel: 'beginner',
    estimatedTimeMinutes: 30,
    isPremium: false,
    tags: ['tool', 'freemium', 'popular'],
  },
  {
    title: 'UserTesting Platform',
    description: 'Get real user feedback on your ideas and prototypes',
    url: 'https://www.usertesting.com',
    resourceType: 'tool',
    categorySlug: 'user-testing',
    phaseRelevance: ['research', 'validation', 'development'],
    ideaTypes: ['software', 'physical_product', 'service'],
    difficultyLevel: 'intermediate',
    estimatedTimeMinutes: 120,
    isPremium: true,
    tags: ['tool', 'paid', 'popular', 'b2b', 'b2c'],
  },
  {
    title: 'Market Sizing Template',
    description: 'Calculate TAM, SAM, and SOM for your market opportunity',
    url: 'https://example.com/market-sizing-template',
    resourceType: 'template',
    categorySlug: 'market-analysis',
    phaseRelevance: ['research'],
    ideaTypes: ['software', 'physical_product', 'service', 'marketplace'],
    difficultyLevel: 'intermediate',
    estimatedTimeMinutes: 90,
    isPremium: false,
    tags: ['template', 'free', 'in-depth'],
    metadata: { format: 'xlsx', includes: 'formulas' }
  },
  {
    title: 'How to Conduct Customer Discovery',
    description: 'Video course on effective customer research techniques',
    url: 'https://example.com/customer-discovery-course',
    resourceType: 'video',
    categorySlug: 'market-analysis',
    phaseRelevance: ['research'],
    ideaTypes: ['software', 'physical_product', 'service', 'marketplace'],
    difficultyLevel: 'beginner',
    estimatedTimeMinutes: 45,
    isPremium: false,
    tags: ['video', 'free', 'beginner-friendly', 'quick-start'],
    metadata: { duration: '45min', instructor: 'Steve Blank' }
  },
  {
    title: 'Statista Market Data',
    description: 'Access comprehensive market statistics and industry reports',
    url: 'https://www.statista.com',
    resourceType: 'tool',
    categorySlug: 'market-analysis',
    phaseRelevance: ['research'],
    ideaTypes: ['software', 'physical_product', 'service', 'marketplace'],
    difficultyLevel: 'intermediate',
    estimatedTimeMinutes: 60,
    isPremium: true,
    tags: ['tool', 'paid', 'in-depth', 'b2b'],
  },
  {
    title: 'Problem-Solution Fit Canvas',
    description: 'Visual template to map customer problems to your solution',
    url: 'https://example.com/problem-solution-canvas',
    resourceType: 'template',
    categorySlug: 'market-analysis',
    phaseRelevance: ['research', 'validation'],
    ideaTypes: ['software', 'physical_product', 'service', 'marketplace'],
    difficultyLevel: 'beginner',
    estimatedTimeMinutes: 30,
    isPremium: false,
    tags: ['template', 'free', 'beginner-friendly', 'quick-start'],
    metadata: { format: 'pdf', printable: true }
  },
];

// Validation Phase Resources (10+)
const validationPhaseResources: ResourceData[] = [
  {
    title: 'Lean Canvas Template',
    description: 'One-page business model template for rapid validation',
    url: 'https://example.com/lean-canvas-template',
    resourceType: 'template',
    categorySlug: 'business-plans',
    phaseRelevance: ['validation'],
    ideaTypes: ['software', 'physical_product', 'service', 'marketplace'],
    difficultyLevel: 'beginner',
    estimatedTimeMinutes: 45,
    isPremium: false,
    tags: ['template', 'free', 'beginner-friendly', 'popular', 'quick-start'],
    metadata: { format: 'pdf', editable: true }
  },
  {
    title: 'Figma for Prototyping',
    description: 'Design and prototype your product ideas collaboratively',
    url: 'https://www.figma.com',
    resourceType: 'tool',
    categorySlug: 'development-tools',
    phaseRelevance: ['validation', 'development'],
    ideaTypes: ['software', 'marketplace'],
    difficultyLevel: 'intermediate',
    estimatedTimeMinutes: 120,
    isPremium: false,
    tags: ['tool', 'freemium', 'popular', 'saas'],
  },
  {
    title: 'Landing Page Builder - Carrd',
    description: 'Create simple, responsive landing pages to test demand',
    url: 'https://carrd.co',
    resourceType: 'tool',
    categorySlug: 'development-tools',
    phaseRelevance: ['validation'],
    ideaTypes: ['software', 'physical_product', 'service', 'marketplace'],
    difficultyLevel: 'beginner',
    estimatedTimeMinutes: 60,
    isPremium: false,
    tags: ['tool', 'freemium', 'beginner-friendly', 'quick-start'],
  },
  {
    title: 'MVP Feature Prioritization Matrix',
    description: 'Framework to identify must-have features for your MVP',
    url: 'https://example.com/mvp-prioritization',
    resourceType: 'template',
    categorySlug: 'product-requirements',
    phaseRelevance: ['validation', 'development'],
    ideaTypes: ['software', 'physical_product', 'marketplace'],
    difficultyLevel: 'intermediate',
    estimatedTimeMinutes: 45,
    isPremium: false,
    tags: ['template', 'free', 'in-depth'],
    metadata: { format: 'xlsx' }
  },
  {
    title: 'Mailchimp Email Marketing',
    description: 'Build an email list and validate interest before launch',
    url: 'https://mailchimp.com',
    resourceType: 'tool',
    categorySlug: 'content-marketing',
    phaseRelevance: ['validation', 'launch'],
    ideaTypes: ['software', 'physical_product', 'service', 'marketplace'],
    difficultyLevel: 'beginner',
    estimatedTimeMinutes: 30,
    isPremium: false,
    tags: ['tool', 'freemium', 'popular', 'beginner-friendly'],
  },
  {
    title: 'Value Proposition Canvas',
    description: 'Align your product features with customer needs',
    url: 'https://example.com/value-proposition-canvas',
    resourceType: 'template',
    categorySlug: 'business-plans',
    phaseRelevance: ['validation'],
    ideaTypes: ['software', 'physical_product', 'service', 'marketplace'],
    difficultyLevel: 'beginner',
    estimatedTimeMinutes: 30,
    isPremium: false,
    tags: ['template', 'free', 'beginner-friendly', 'popular'],
    metadata: { format: 'pdf', printable: true }
  },
  {
    title: 'Google Analytics Setup Guide',
    description: 'Track and validate user behavior on your landing page',
    url: 'https://example.com/ga-setup-guide',
    resourceType: 'guide',
    categorySlug: 'seo-analytics',
    phaseRelevance: ['validation', 'launch'],
    ideaTypes: ['software', 'marketplace'],
    difficultyLevel: 'intermediate',
    estimatedTimeMinutes: 45,
    isPremium: false,
    tags: ['guide', 'free', 'in-depth'],
  },
  {
    title: 'Hotjar User Behavior Analytics',
    description: 'Understand how users interact with your prototype',
    url: 'https://www.hotjar.com',
    resourceType: 'tool',
    categorySlug: 'seo-analytics',
    phaseRelevance: ['validation', 'development'],
    ideaTypes: ['software', 'marketplace'],
    difficultyLevel: 'intermediate',
    estimatedTimeMinutes: 30,
    isPremium: false,
    tags: ['tool', 'freemium', 'popular'],
  },
  {
    title: 'Pre-Launch Checklist',
    description: 'Comprehensive checklist before launching your MVP',
    url: 'https://example.com/pre-launch-checklist',
    resourceType: 'template',
    categorySlug: 'business-plans',
    phaseRelevance: ['validation', 'launch'],
    ideaTypes: ['software', 'physical_product', 'service', 'marketplace'],
    difficultyLevel: 'beginner',
    estimatedTimeMinutes: 20,
    isPremium: false,
    tags: ['template', 'free', 'beginner-friendly', 'quick-start'],
    metadata: { format: 'pdf' }
  },
  {
    title: 'Pricing Strategy Guide',
    description: 'Framework for determining optimal pricing for your product',
    url: 'https://example.com/pricing-strategy',
    resourceType: 'guide',
    categorySlug: 'business-plans',
    phaseRelevance: ['validation'],
    ideaTypes: ['software', 'physical_product', 'service', 'marketplace'],
    difficultyLevel: 'intermediate',
    estimatedTimeMinutes: 60,
    isPremium: false,
    tags: ['guide', 'free', 'in-depth'],
  },
];

// Development Phase Resources (10+)
const developmentPhaseResources: ResourceData[] = [
  {
    title: 'Product Requirements Document Template',
    description: 'Detailed PRD template for technical product development',
    url: 'https://example.com/prd-template',
    resourceType: 'template',
    categorySlug: 'product-requirements',
    phaseRelevance: ['development'],
    ideaTypes: ['software', 'physical_product', 'marketplace'],
    difficultyLevel: 'intermediate',
    estimatedTimeMinutes: 90,
    isPremium: false,
    tags: ['template', 'free', 'in-depth', 'saas'],
    metadata: { format: 'docx', pages: 12 }
  },
  {
    title: 'GitHub for Version Control',
    description: 'Manage code and collaborate with your development team',
    url: 'https://github.com',
    resourceType: 'tool',
    categorySlug: 'development-tools',
    phaseRelevance: ['development'],
    ideaTypes: ['software', 'marketplace'],
    difficultyLevel: 'intermediate',
    estimatedTimeMinutes: 60,
    isPremium: false,
    tags: ['tool', 'freemium', 'popular', 'saas'],
  },
  {
    title: 'AWS Cloud Platform',
    description: 'Scalable cloud infrastructure for your application',
    url: 'https://aws.amazon.com',
    resourceType: 'tool',
    categorySlug: 'cloud-infrastructure',
    phaseRelevance: ['development', 'launch'],
    ideaTypes: ['software', 'marketplace'],
    difficultyLevel: 'advanced',
    estimatedTimeMinutes: 180,
    isPremium: false,
    tags: ['tool', 'freemium', 'popular', 'advanced', 'saas'],
  },
  {
    title: 'Stripe Payment Integration',
    description: 'Accept payments and manage subscriptions',
    url: 'https://stripe.com',
    resourceType: 'tool',
    categorySlug: 'apis-integrations',
    phaseRelevance: ['development', 'launch'],
    ideaTypes: ['software', 'marketplace'],
    difficultyLevel: 'intermediate',
    estimatedTimeMinutes: 120,
    isPremium: false,
    tags: ['tool', 'freemium', 'popular', 'saas'],
  },
  {
    title: 'Tech Stack Selection Guide',
    description: 'Choose the right technologies for your product',
    url: 'https://example.com/tech-stack-guide',
    resourceType: 'guide',
    categorySlug: 'development-tools',
    phaseRelevance: ['development'],
    ideaTypes: ['software', 'marketplace'],
    difficultyLevel: 'intermediate',
    estimatedTimeMinutes: 45,
    isPremium: false,
    tags: ['guide', 'free', 'in-depth', 'saas'],
  },
  {
    title: 'Vercel Deployment Platform',
    description: 'Deploy and host web applications with zero configuration',
    url: 'https://vercel.com',
    resourceType: 'tool',
    categorySlug: 'cloud-infrastructure',
    phaseRelevance: ['development', 'launch'],
    ideaTypes: ['software', 'marketplace'],
    difficultyLevel: 'beginner',
    estimatedTimeMinutes: 30,
    isPremium: false,
    tags: ['tool', 'freemium', 'beginner-friendly', 'saas'],
  },
  {
    title: 'API Documentation with Postman',
    description: 'Document and test your API endpoints',
    url: 'https://www.postman.com',
    resourceType: 'tool',
    categorySlug: 'apis-integrations',
    phaseRelevance: ['development'],
    ideaTypes: ['software', 'marketplace'],
    difficultyLevel: 'intermediate',
    estimatedTimeMinutes: 60,
    isPremium: false,
    tags: ['tool', 'freemium', 'popular', 'saas'],
  },
  {
    title: 'Agile Development Guide',
    description: 'Implement agile methodologies for faster iteration',
    url: 'https://example.com/agile-guide',
    resourceType: 'guide',
    categorySlug: 'product-requirements',
    phaseRelevance: ['development'],
    ideaTypes: ['software', 'physical_product', 'marketplace'],
    difficultyLevel: 'intermediate',
    estimatedTimeMinutes: 90,
    isPremium: false,
    tags: ['guide', 'free', 'in-depth'],
  },
  {
    title: 'Quality Assurance Checklist',
    description: 'Ensure your product meets quality standards before launch',
    url: 'https://example.com/qa-checklist',
    resourceType: 'template',
    categorySlug: 'product-requirements',
    phaseRelevance: ['development'],
    ideaTypes: ['software', 'physical_product', 'marketplace'],
    difficultyLevel: 'intermediate',
    estimatedTimeMinutes: 45,
    isPremium: false,
    tags: ['template', 'free', 'in-depth'],
    metadata: { format: 'xlsx' }
  },
  {
    title: 'Docker Containerization Tutorial',
    description: 'Package your application for consistent deployment',
    url: 'https://example.com/docker-tutorial',
    resourceType: 'video',
    categorySlug: 'cloud-infrastructure',
    phaseRelevance: ['development'],
    ideaTypes: ['software', 'marketplace'],
    difficultyLevel: 'advanced',
    estimatedTimeMinutes: 120,
    isPremium: false,
    tags: ['video', 'free', 'advanced', 'in-depth', 'saas'],
    metadata: { duration: '2hr', level: 'advanced' }
  },
];

// Launch Phase Resources (10+)
const launchPhaseResources: ResourceData[] = [
  {
    title: 'Product Hunt Launch Guide',
    description: 'Step-by-step guide to launching on Product Hunt',
    url: 'https://example.com/product-hunt-guide',
    resourceType: 'guide',
    categorySlug: 'content-marketing',
    phaseRelevance: ['launch'],
    ideaTypes: ['software', 'marketplace'],
    difficultyLevel: 'intermediate',
    estimatedTimeMinutes: 60,
    isPremium: false,
    tags: ['guide', 'free', 'popular', 'saas'],
  },
  {
    title: 'Press Release Template',
    description: 'Professional press release template for product launches',
    url: 'https://example.com/press-release-template',
    resourceType: 'template',
    categorySlug: 'content-marketing',
    phaseRelevance: ['launch'],
    ideaTypes: ['software', 'physical_product', 'service', 'marketplace'],
    difficultyLevel: 'beginner',
    estimatedTimeMinutes: 30,
    isPremium: false,
    tags: ['template', 'free', 'beginner-friendly'],
    metadata: { format: 'docx', pages: 2 }
  },
  {
    title: 'Buffer Social Media Scheduler',
    description: 'Schedule and manage social media posts across platforms',
    url: 'https://buffer.com',
    resourceType: 'tool',
    categorySlug: 'social-media',
    phaseRelevance: ['launch'],
    ideaTypes: ['software', 'physical_product', 'service', 'marketplace'],
    difficultyLevel: 'beginner',
    estimatedTimeMinutes: 30,
    isPremium: false,
    tags: ['tool', 'freemium', 'popular', 'beginner-friendly'],
  },
  {
    title: 'Launch Day Checklist',
    description: 'Complete checklist for a successful product launch',
    url: 'https://example.com/launch-checklist',
    resourceType: 'template',
    categorySlug: 'content-marketing',
    phaseRelevance: ['launch'],
    ideaTypes: ['software', 'physical_product', 'service', 'marketplace'],
    difficultyLevel: 'beginner',
    estimatedTimeMinutes: 20,
    isPremium: false,
    tags: ['template', 'free', 'beginner-friendly', 'quick-start'],
    metadata: { format: 'pdf' }
  },
  {
    title: 'Google Ads for Startups',
    description: 'Drive initial traffic with targeted advertising',
    url: 'https://ads.google.com',
    resourceType: 'tool',
    categorySlug: 'seo-analytics',
    phaseRelevance: ['launch'],
    ideaTypes: ['software', 'physical_product', 'service', 'marketplace'],
    difficultyLevel: 'intermediate',
    estimatedTimeMinutes: 90,
    isPremium: false,
    tags: ['tool', 'paid', 'popular'],
  },
  {
    title: 'Content Marketing Strategy Template',
    description: 'Plan your content marketing for post-launch growth',
    url: 'https://example.com/content-strategy-template',
    resourceType: 'template',
    categorySlug: 'content-marketing',
    phaseRelevance: ['launch'],
    ideaTypes: ['software', 'physical_product', 'service', 'marketplace'],
    difficultyLevel: 'intermediate',
    estimatedTimeMinutes: 60,
    isPremium: false,
    tags: ['template', 'free', 'in-depth'],
    metadata: { format: 'xlsx' }
  },
  {
    title: 'Customer Onboarding Flow Template',
    description: 'Design an effective onboarding experience for new users',
    url: 'https://example.com/onboarding-template',
    resourceType: 'template',
    categorySlug: 'product-requirements',
    phaseRelevance: ['launch'],
    ideaTypes: ['software', 'marketplace'],
    difficultyLevel: 'intermediate',
    estimatedTimeMinutes: 45,
    isPremium: false,
    tags: ['template', 'free', 'saas'],
    metadata: { format: 'pdf' }
  },
  {
    title: 'Intercom Customer Messaging',
    description: 'Engage with customers through in-app messaging',
    url: 'https://www.intercom.com',
    resourceType: 'tool',
    categorySlug: 'apis-integrations',
    phaseRelevance: ['launch'],
    ideaTypes: ['software', 'marketplace'],
    difficultyLevel: 'intermediate',
    estimatedTimeMinutes: 60,
    isPremium: true,
    tags: ['tool', 'paid', 'popular', 'saas'],
  },
  {
    title: 'Growth Hacking Tactics Guide',
    description: 'Proven strategies for rapid user acquisition',
    url: 'https://example.com/growth-hacking-guide',
    resourceType: 'guide',
    categorySlug: 'content-marketing',
    phaseRelevance: ['launch'],
    ideaTypes: ['software', 'marketplace'],
    difficultyLevel: 'advanced',
    estimatedTimeMinutes: 90,
    isPremium: false,
    tags: ['guide', 'free', 'advanced', 'in-depth', 'saas'],
  },
  {
    title: 'Mixpanel Product Analytics',
    description: 'Track user behavior and product metrics',
    url: 'https://mixpanel.com',
    resourceType: 'tool',
    categorySlug: 'seo-analytics',
    phaseRelevance: ['launch'],
    ideaTypes: ['software', 'marketplace'],
    difficultyLevel: 'intermediate',
    estimatedTimeMinutes: 60,
    isPremium: false,
    tags: ['tool', 'freemium', 'popular', 'saas'],
  },
];

// Additional Cross-Phase Resources (10+)
const crossPhaseResources: ResourceData[] = [
  {
    title: 'Y Combinator Startup School',
    description: 'Free online course covering all aspects of building a startup',
    url: 'https://www.startupschool.org',
    resourceType: 'video',
    categorySlug: 'business-plans',
    phaseRelevance: ['research', 'validation', 'development', 'launch'],
    ideaTypes: ['software', 'physical_product', 'service', 'marketplace'],
    difficultyLevel: 'beginner',
    estimatedTimeMinutes: 300,
    isPremium: false,
    tags: ['video', 'free', 'popular', 'in-depth'],
    metadata: { duration: '5hr', format: 'course' }
  },
  {
    title: 'Pitch Deck Template (Series A)',
    description: 'Investor-ready pitch deck template with examples',
    url: 'https://example.com/pitch-deck-template',
    resourceType: 'template',
    categorySlug: 'pitch-decks',
    phaseRelevance: ['validation', 'launch'],
    ideaTypes: ['software', 'physical_product', 'service', 'marketplace'],
    difficultyLevel: 'intermediate',
    estimatedTimeMinutes: 120,
    isPremium: false,
    tags: ['template', 'free', 'popular', 'in-depth'],
    metadata: { format: 'pptx', slides: 15 }
  },
  {
    title: 'Notion Workspace Templates',
    description: 'Organize your startup operations with pre-built templates',
    url: 'https://www.notion.so/templates',
    resourceType: 'tool',
    categorySlug: 'business-plans',
    phaseRelevance: ['research', 'validation', 'development', 'launch'],
    ideaTypes: ['software', 'physical_product', 'service', 'marketplace'],
    difficultyLevel: 'beginner',
    estimatedTimeMinutes: 30,
    isPremium: false,
    tags: ['tool', 'freemium', 'popular', 'beginner-friendly'],
  },
  {
    title: 'Founder Agreement Template',
    description: 'Legal template for co-founder equity and responsibilities',
    url: 'https://example.com/founder-agreement',
    resourceType: 'template',
    categorySlug: 'contracts-agreements',
    phaseRelevance: ['research', 'validation'],
    ideaTypes: ['software', 'physical_product', 'service', 'marketplace'],
    difficultyLevel: 'intermediate',
    estimatedTimeMinutes: 60,
    isPremium: false,
    tags: ['template', 'free', 'in-depth'],
    metadata: { format: 'docx', pages: 8, disclaimer: 'Consult legal professional' }
  },
  {
    title: 'Stripe Atlas for Incorporation',
    description: 'Incorporate your startup and set up banking',
    url: 'https://stripe.com/atlas',
    resourceType: 'tool',
    categorySlug: 'incorporation',
    phaseRelevance: ['validation', 'development'],
    ideaTypes: ['software', 'marketplace'],
    difficultyLevel: 'intermediate',
    estimatedTimeMinutes: 180,
    isPremium: true,
    tags: ['tool', 'paid', 'popular', 'saas'],
  },
  {
    title: 'NDA Template (Mutual)',
    description: 'Non-disclosure agreement for protecting confidential information',
    url: 'https://example.com/nda-template',
    resourceType: 'template',
    categorySlug: 'contracts-agreements',
    phaseRelevance: ['research', 'validation', 'development'],
    ideaTypes: ['software', 'physical_product', 'service', 'marketplace'],
    difficultyLevel: 'beginner',
    estimatedTimeMinutes: 30,
    isPremium: false,
    tags: ['template', 'free', 'beginner-friendly'],
    metadata: { format: 'docx', pages: 4, disclaimer: 'Consult legal professional' }
  },
  {
    title: 'AngelList for Fundraising',
    description: 'Connect with investors and raise capital',
    url: 'https://www.angellist.com',
    resourceType: 'tool',
    categorySlug: 'angel-investors',
    phaseRelevance: ['validation', 'launch'],
    ideaTypes: ['software', 'marketplace'],
    difficultyLevel: 'intermediate',
    estimatedTimeMinutes: 120,
    isPremium: false,
    tags: ['tool', 'free', 'popular', 'saas'],
  },
  {
    title: 'Financial Model Template',
    description: '3-year financial projection template for startups',
    url: 'https://example.com/financial-model',
    resourceType: 'template',
    categorySlug: 'business-plans',
    phaseRelevance: ['validation', 'launch'],
    ideaTypes: ['software', 'physical_product', 'service', 'marketplace'],
    difficultyLevel: 'advanced',
    estimatedTimeMinutes: 180,
    isPremium: false,
    tags: ['template', 'free', 'advanced', 'in-depth'],
    metadata: { format: 'xlsx', includes: 'formulas' }
  },
  {
    title: 'Trademark Search Tool (USPTO)',
    description: 'Search existing trademarks before filing',
    url: 'https://www.uspto.gov/trademarks',
    resourceType: 'tool',
    categorySlug: 'intellectual-property',
    phaseRelevance: ['validation', 'development'],
    ideaTypes: ['software', 'physical_product', 'service', 'marketplace'],
    difficultyLevel: 'beginner',
    estimatedTimeMinutes: 30,
    isPremium: false,
    tags: ['tool', 'free', 'beginner-friendly'],
  },
  {
    title: 'Kickstarter Campaign Guide',
    description: 'Complete guide to running a successful crowdfunding campaign',
    url: 'https://example.com/kickstarter-guide',
    resourceType: 'guide',
    categorySlug: 'crowdfunding',
    phaseRelevance: ['validation', 'launch'],
    ideaTypes: ['physical_product', 'service'],
    difficultyLevel: 'intermediate',
    estimatedTimeMinutes: 90,
    isPremium: false,
    tags: ['guide', 'free', 'in-depth', 'physical-product'],
  },
];

// Main seeding function
export async function seedResources() {
  console.log('🌱 Seeding resources...');
  
  try {
    // Check if resources already exist
    const existingResources = await db.select().from(resources).limit(1);
    
    if (existingResources.length > 0) {
      console.log('ℹ️  Resources already exist, skipping seed');
      return;
    }
    
    // Combine all resources
    const allResources = [
      ...researchPhaseResources,
      ...validationPhaseResources,
      ...developmentPhaseResources,
      ...launchPhaseResources,
      ...crossPhaseResources,
    ];
    
    console.log(`📚 Inserting ${allResources.length} resources...`);
    
    let insertedCount = 0;
    
    for (const resourceData of allResources) {
      try {
        // Get category ID
        const categoryId = await getCategoryId(resourceData.categorySlug);
        
        // Get tag IDs
        const tagIds = await getTagIds(resourceData.tags);
        
        // Insert resource
        const [insertedResource] = await db.insert(resources).values({
          title: resourceData.title,
          description: resourceData.description,
          url: resourceData.url,
          resourceType: resourceData.resourceType,
          categoryId,
          phaseRelevance: resourceData.phaseRelevance,
          ideaTypes: resourceData.ideaTypes,
          difficultyLevel: resourceData.difficultyLevel,
          estimatedTimeMinutes: resourceData.estimatedTimeMinutes,
          isPremium: resourceData.isPremium,
          isActive: true,
          metadata: resourceData.metadata || {},
          createdBy: null, // System-created
        }).returning();
        
        // Insert tag mappings
        for (const tagId of tagIds) {
          await db.insert(resourceTagMappings).values({
            resourceId: insertedResource.id,
            tagId,
          });
        }
        
        insertedCount++;
        
        if (insertedCount % 10 === 0) {
          console.log(`  ✓ ${insertedCount} resources inserted...`);
        }
      } catch (error) {
        console.error(`  ✗ Failed to insert: ${resourceData.title}`, error);
      }
    }
    
    console.log(`✅ Successfully seeded ${insertedCount} resources`);
    
    // Update tag usage counts
    console.log('🔄 Updating tag usage counts...');
    const tagMappings = await db.select().from(resourceTagMappings);
    const tagCounts = tagMappings.reduce((acc, mapping) => {
      acc[mapping.tagId] = (acc[mapping.tagId] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    for (const [tagId, count] of Object.entries(tagCounts)) {
      await db.update(resourceTags)
        .set({ usageCount: count })
        .where(eq(resourceTags.id, parseInt(tagId)));
    }
    
    console.log('✅ Tag usage counts updated');
    
  } catch (error) {
    console.error('❌ Error seeding resources:', error);
    throw error;
  }
}

// Run if called directly
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const currentFile = fileURLToPath(import.meta.url);
const mainFile = resolve(process.argv[1]);

if (currentFile === mainFile) {
  seedResources()
    .then(() => {
      console.log('✅ Seed completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}
