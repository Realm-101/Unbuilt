import { db } from '../db';
import { planTemplates, type InsertPlanTemplate } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Seed data for default plan templates
 * These templates provide pre-configured structures for different project types
 */

const defaultTemplates: InsertPlanTemplate[] = [
  {
    name: 'Software Startup',
    description: 'Optimized for SaaS and software products with focus on MVP development and user validation',
    category: 'software',
    icon: 'code',
    isDefault: true,
    isActive: true,
    phases: [
      {
        name: 'Research & Validation',
        description: 'Validate market need and technical feasibility',
        order: 1,
        estimatedDuration: '3-4 weeks',
        tasks: [
          {
            title: 'Conduct user interviews',
            description: 'Interview 20-30 potential users to validate problem and solution fit',
            estimatedTime: '2 weeks',
            resources: [],
            order: 1,
          },
          {
            title: 'Analyze competitor landscape',
            description: 'Research existing solutions and identify differentiation opportunities',
            estimatedTime: '1 week',
            resources: [],
            order: 2,
          },
          {
            title: 'Create technical architecture',
            description: 'Design system architecture and select tech stack',
            estimatedTime: '1 week',
            resources: [],
            order: 3,
          },
          {
            title: 'Define MVP feature set',
            description: 'Prioritize features for minimum viable product',
            estimatedTime: '3 days',
            resources: [],
            order: 4,
          },
        ],
      },
      {
        name: 'MVP Development',
        description: 'Build minimum viable product',
        order: 2,
        estimatedDuration: '8-12 weeks',
        tasks: [
          {
            title: 'Set up development environment',
            description: 'Configure CI/CD, hosting, databases, and development tools',
            estimatedTime: '3 days',
            resources: [],
            order: 1,
          },
          {
            title: 'Implement authentication system',
            description: 'Build secure user authentication and authorization',
            estimatedTime: '1 week',
            resources: [],
            order: 2,
          },
          {
            title: 'Build core features',
            description: 'Implement essential functionality defined in MVP scope',
            estimatedTime: '6 weeks',
            resources: [],
            order: 3,
          },
          {
            title: 'Create landing page',
            description: 'Design and build marketing website with clear value proposition',
            estimatedTime: '1 week',
            resources: [],
            order: 4,
          },
          {
            title: 'Implement analytics',
            description: 'Set up user analytics and tracking',
            estimatedTime: '3 days',
            resources: [],
            order: 5,
          },
        ],
      },
      {
        name: 'Beta Testing & Iteration',
        description: 'Test with early users and refine product',
        order: 3,
        estimatedDuration: '4-6 weeks',
        tasks: [
          {
            title: 'Recruit beta testers',
            description: 'Find 50-100 early adopters willing to test the product',
            estimatedTime: '1 week',
            resources: [],
            order: 1,
          },
          {
            title: 'Conduct beta testing',
            description: 'Run structured beta program with feedback collection',
            estimatedTime: '3 weeks',
            resources: [],
            order: 2,
          },
          {
            title: 'Analyze feedback and metrics',
            description: 'Review user feedback, usage data, and identify improvements',
            estimatedTime: '1 week',
            resources: [],
            order: 3,
          },
          {
            title: 'Implement critical fixes',
            description: 'Address major bugs and usability issues',
            estimatedTime: '2 weeks',
            resources: [],
            order: 4,
          },
        ],
      },
      {
        name: 'Launch & Growth',
        description: 'Public launch and initial growth strategies',
        order: 4,
        estimatedDuration: '8+ weeks',
        tasks: [
          {
            title: 'Prepare launch materials',
            description: 'Create press kit, demo videos, and launch content',
            estimatedTime: '1 week',
            resources: [],
            order: 1,
          },
          {
            title: 'Execute launch campaign',
            description: 'Launch on Product Hunt, social media, and relevant communities',
            estimatedTime: '1 week',
            resources: [],
            order: 2,
          },
          {
            title: 'Set up customer support',
            description: 'Implement support system and documentation',
            estimatedTime: '1 week',
            resources: [],
            order: 3,
          },
          {
            title: 'Implement growth experiments',
            description: 'Run A/B tests and growth experiments to improve conversion',
            estimatedTime: 'Ongoing',
            resources: [],
            order: 4,
          },
          {
            title: 'Build content marketing strategy',
            description: 'Create blog, SEO strategy, and content calendar',
            estimatedTime: '2 weeks',
            resources: [],
            order: 5,
          },
        ],
      },
    ],
  },
  {
    name: 'Physical Product',
    description: 'Structured approach for hardware and physical product development',
    category: 'physical',
    icon: 'package',
    isDefault: false,
    isActive: true,
    phases: [
      {
        name: 'Concept & Design',
        description: 'Define product concept and create initial designs',
        order: 1,
        estimatedDuration: '4-6 weeks',
        tasks: [
          {
            title: 'Research market and user needs',
            description: 'Conduct market research and identify target customer pain points',
            estimatedTime: '2 weeks',
            resources: [],
            order: 1,
          },
          {
            title: 'Create product sketches',
            description: 'Develop initial concept sketches and design variations',
            estimatedTime: '1 week',
            resources: [],
            order: 2,
          },
          {
            title: 'Build 3D CAD models',
            description: 'Create detailed 3D models for prototyping',
            estimatedTime: '2 weeks',
            resources: [],
            order: 3,
          },
          {
            title: 'Select materials and suppliers',
            description: 'Research and identify potential manufacturing partners',
            estimatedTime: '1 week',
            resources: [],
            order: 4,
          },
        ],
      },
      {
        name: 'Prototyping',
        description: 'Build and test physical prototypes',
        order: 2,
        estimatedDuration: '6-8 weeks',
        tasks: [
          {
            title: 'Create first prototype',
            description: 'Build initial prototype using 3D printing or basic manufacturing',
            estimatedTime: '2 weeks',
            resources: [],
            order: 1,
          },
          {
            title: 'Conduct user testing',
            description: 'Test prototype with target users and gather feedback',
            estimatedTime: '2 weeks',
            resources: [],
            order: 2,
          },
          {
            title: 'Refine design based on feedback',
            description: 'Iterate on design to address issues and improve usability',
            estimatedTime: '2 weeks',
            resources: [],
            order: 3,
          },
          {
            title: 'Build final prototype',
            description: 'Create production-ready prototype with final materials',
            estimatedTime: '2 weeks',
            resources: [],
            order: 4,
          },
        ],
      },
      {
        name: 'Manufacturing Setup',
        description: 'Establish manufacturing and supply chain',
        order: 3,
        estimatedDuration: '8-12 weeks',
        tasks: [
          {
            title: 'Finalize manufacturer selection',
            description: 'Choose manufacturing partner and negotiate terms',
            estimatedTime: '2 weeks',
            resources: [],
            order: 1,
          },
          {
            title: 'Create production tooling',
            description: 'Develop molds, dies, and manufacturing tools',
            estimatedTime: '4 weeks',
            resources: [],
            order: 2,
          },
          {
            title: 'Run pilot production',
            description: 'Produce small batch to test manufacturing process',
            estimatedTime: '3 weeks',
            resources: [],
            order: 3,
          },
          {
            title: 'Set up quality control',
            description: 'Establish QC processes and testing procedures',
            estimatedTime: '1 week',
            resources: [],
            order: 4,
          },
          {
            title: 'Arrange logistics and fulfillment',
            description: 'Set up warehousing, shipping, and fulfillment partners',
            estimatedTime: '2 weeks',
            resources: [],
            order: 5,
          },
        ],
      },
      {
        name: 'Launch & Distribution',
        description: 'Bring product to market',
        order: 4,
        estimatedDuration: '6+ weeks',
        tasks: [
          {
            title: 'Create marketing materials',
            description: 'Develop product photography, videos, and marketing content',
            estimatedTime: '2 weeks',
            resources: [],
            order: 1,
          },
          {
            title: 'Set up e-commerce store',
            description: 'Build online store with payment and shipping integration',
            estimatedTime: '2 weeks',
            resources: [],
            order: 2,
          },
          {
            title: 'Launch crowdfunding campaign',
            description: 'Run Kickstarter or Indiegogo campaign (if applicable)',
            estimatedTime: '4 weeks',
            resources: [],
            order: 3,
          },
          {
            title: 'Establish retail partnerships',
            description: 'Approach retailers and distributors for partnerships',
            estimatedTime: 'Ongoing',
            resources: [],
            order: 4,
          },
        ],
      },
    ],
  },
  {
    name: 'Service Business',
    description: 'Framework for launching service-based businesses and consulting',
    category: 'service',
    icon: 'briefcase',
    isDefault: false,
    isActive: true,
    phases: [
      {
        name: 'Service Definition',
        description: 'Define service offering and target market',
        order: 1,
        estimatedDuration: '2-3 weeks',
        tasks: [
          {
            title: 'Identify target market',
            description: 'Define ideal customer profile and market segment',
            estimatedTime: '1 week',
            resources: [],
            order: 1,
          },
          {
            title: 'Define service packages',
            description: 'Create tiered service offerings with clear deliverables',
            estimatedTime: '1 week',
            resources: [],
            order: 2,
          },
          {
            title: 'Set pricing strategy',
            description: 'Research market rates and establish competitive pricing',
            estimatedTime: '3 days',
            resources: [],
            order: 3,
          },
          {
            title: 'Create service agreements',
            description: 'Draft contracts and terms of service',
            estimatedTime: '3 days',
            resources: [],
            order: 4,
          },
        ],
      },
      {
        name: 'Business Setup',
        description: 'Establish business operations and infrastructure',
        order: 2,
        estimatedDuration: '3-4 weeks',
        tasks: [
          {
            title: 'Register business entity',
            description: 'Complete legal registration and obtain necessary licenses',
            estimatedTime: '1 week',
            resources: [],
            order: 1,
          },
          {
            title: 'Set up business systems',
            description: 'Implement CRM, invoicing, and project management tools',
            estimatedTime: '1 week',
            resources: [],
            order: 2,
          },
          {
            title: 'Create brand identity',
            description: 'Design logo, brand guidelines, and marketing materials',
            estimatedTime: '2 weeks',
            resources: [],
            order: 3,
          },
          {
            title: 'Build professional website',
            description: 'Create website showcasing services and portfolio',
            estimatedTime: '2 weeks',
            resources: [],
            order: 4,
          },
        ],
      },
      {
        name: 'Client Acquisition',
        description: 'Build client base and establish reputation',
        order: 3,
        estimatedDuration: '8+ weeks',
        tasks: [
          {
            title: 'Develop marketing strategy',
            description: 'Create content marketing and lead generation plan',
            estimatedTime: '1 week',
            resources: [],
            order: 1,
          },
          {
            title: 'Network and build relationships',
            description: 'Attend events, join communities, and connect with potential clients',
            estimatedTime: 'Ongoing',
            resources: [],
            order: 2,
          },
          {
            title: 'Offer pilot projects',
            description: 'Provide discounted services to first clients for testimonials',
            estimatedTime: '4 weeks',
            resources: [],
            order: 3,
          },
          {
            title: 'Collect case studies',
            description: 'Document successful projects and create portfolio pieces',
            estimatedTime: 'Ongoing',
            resources: [],
            order: 4,
          },
          {
            title: 'Implement referral program',
            description: 'Create incentives for client referrals',
            estimatedTime: '1 week',
            resources: [],
            order: 5,
          },
        ],
      },
      {
        name: 'Scale & Optimize',
        description: 'Grow business and improve operations',
        order: 4,
        estimatedDuration: 'Ongoing',
        tasks: [
          {
            title: 'Hire team members',
            description: 'Recruit contractors or employees to handle increased demand',
            estimatedTime: 'As needed',
            resources: [],
            order: 1,
          },
          {
            title: 'Standardize processes',
            description: 'Create SOPs and workflows for consistent service delivery',
            estimatedTime: '2 weeks',
            resources: [],
            order: 2,
          },
          {
            title: 'Develop passive income streams',
            description: 'Create digital products, courses, or templates',
            estimatedTime: '4+ weeks',
            resources: [],
            order: 3,
          },
          {
            title: 'Optimize pricing and packages',
            description: 'Refine offerings based on profitability and demand',
            estimatedTime: 'Ongoing',
            resources: [],
            order: 4,
          },
        ],
      },
    ],
  },
  {
    name: 'Content Platform',
    description: 'Build and grow content-driven platforms and communities',
    category: 'content',
    icon: 'newspaper',
    isDefault: false,
    isActive: true,
    phases: [
      {
        name: 'Platform Strategy',
        description: 'Define content strategy and platform vision',
        order: 1,
        estimatedDuration: '2-3 weeks',
        tasks: [
          {
            title: 'Define content niche',
            description: 'Identify specific topic area and target audience',
            estimatedTime: '1 week',
            resources: [],
            order: 1,
          },
          {
            title: 'Research content gaps',
            description: 'Analyze existing content and identify opportunities',
            estimatedTime: '1 week',
            resources: [],
            order: 2,
          },
          {
            title: 'Create content calendar',
            description: 'Plan first 3 months of content topics and schedule',
            estimatedTime: '3 days',
            resources: [],
            order: 3,
          },
          {
            title: 'Define monetization strategy',
            description: 'Plan revenue streams (ads, subscriptions, sponsorships)',
            estimatedTime: '3 days',
            resources: [],
            order: 4,
          },
        ],
      },
      {
        name: 'Platform Development',
        description: 'Build technical infrastructure',
        order: 2,
        estimatedDuration: '4-6 weeks',
        tasks: [
          {
            title: 'Choose platform technology',
            description: 'Select CMS or build custom platform',
            estimatedTime: '1 week',
            resources: [],
            order: 1,
          },
          {
            title: 'Design user experience',
            description: 'Create wireframes and design system',
            estimatedTime: '2 weeks',
            resources: [],
            order: 2,
          },
          {
            title: 'Build core platform',
            description: 'Develop website with content management capabilities',
            estimatedTime: '3 weeks',
            resources: [],
            order: 3,
          },
          {
            title: 'Implement SEO optimization',
            description: 'Set up technical SEO and analytics',
            estimatedTime: '1 week',
            resources: [],
            order: 4,
          },
        ],
      },
      {
        name: 'Content Creation',
        description: 'Produce and publish initial content',
        order: 3,
        estimatedDuration: '6-8 weeks',
        tasks: [
          {
            title: 'Create foundational content',
            description: 'Produce 20-30 high-quality cornerstone articles',
            estimatedTime: '6 weeks',
            resources: [],
            order: 1,
          },
          {
            title: 'Build email list',
            description: 'Create lead magnets and email capture strategy',
            estimatedTime: '1 week',
            resources: [],
            order: 2,
          },
          {
            title: 'Establish social presence',
            description: 'Set up and grow social media channels',
            estimatedTime: 'Ongoing',
            resources: [],
            order: 3,
          },
          {
            title: 'Recruit contributors',
            description: 'Find guest writers and content partners',
            estimatedTime: '2 weeks',
            resources: [],
            order: 4,
          },
        ],
      },
      {
        name: 'Growth & Monetization',
        description: 'Scale audience and revenue',
        order: 4,
        estimatedDuration: 'Ongoing',
        tasks: [
          {
            title: 'Implement SEO strategy',
            description: 'Optimize content for search and build backlinks',
            estimatedTime: 'Ongoing',
            resources: [],
            order: 1,
          },
          {
            title: 'Launch monetization',
            description: 'Activate ads, subscriptions, or sponsorships',
            estimatedTime: '2 weeks',
            resources: [],
            order: 2,
          },
          {
            title: 'Build community features',
            description: 'Add forums, comments, or membership features',
            estimatedTime: '4 weeks',
            resources: [],
            order: 3,
          },
          {
            title: 'Create premium content',
            description: 'Develop paid courses, ebooks, or exclusive content',
            estimatedTime: '4+ weeks',
            resources: [],
            order: 4,
          },
        ],
      },
    ],
  },
  {
    name: 'Marketplace',
    description: 'Launch two-sided marketplace connecting buyers and sellers',
    category: 'marketplace',
    icon: 'store',
    isDefault: false,
    isActive: true,
    phases: [
      {
        name: 'Market Research',
        description: 'Validate marketplace concept and define strategy',
        order: 1,
        estimatedDuration: '3-4 weeks',
        tasks: [
          {
            title: 'Identify supply and demand',
            description: 'Research both sides of the marketplace and validate need',
            estimatedTime: '2 weeks',
            resources: [],
            order: 1,
          },
          {
            title: 'Analyze competitor marketplaces',
            description: 'Study existing platforms and identify differentiation',
            estimatedTime: '1 week',
            resources: [],
            order: 2,
          },
          {
            title: 'Define value proposition',
            description: 'Clarify unique value for both buyers and sellers',
            estimatedTime: '3 days',
            resources: [],
            order: 3,
          },
          {
            title: 'Plan monetization model',
            description: 'Decide on commission structure, fees, or subscription model',
            estimatedTime: '3 days',
            resources: [],
            order: 4,
          },
        ],
      },
      {
        name: 'Platform Development',
        description: 'Build marketplace infrastructure',
        order: 2,
        estimatedDuration: '12-16 weeks',
        tasks: [
          {
            title: 'Design user flows',
            description: 'Create wireframes for buyer and seller experiences',
            estimatedTime: '2 weeks',
            resources: [],
            order: 1,
          },
          {
            title: 'Build core marketplace',
            description: 'Develop listing, search, and transaction features',
            estimatedTime: '8 weeks',
            resources: [],
            order: 2,
          },
          {
            title: 'Implement payment system',
            description: 'Integrate payment processing and escrow if needed',
            estimatedTime: '2 weeks',
            resources: [],
            order: 3,
          },
          {
            title: 'Create review system',
            description: 'Build ratings and reviews for trust and quality',
            estimatedTime: '2 weeks',
            resources: [],
            order: 4,
          },
          {
            title: 'Add messaging system',
            description: 'Enable communication between buyers and sellers',
            estimatedTime: '2 weeks',
            resources: [],
            order: 5,
          },
        ],
      },
      {
        name: 'Supply Acquisition',
        description: 'Recruit initial sellers and listings',
        order: 3,
        estimatedDuration: '4-6 weeks',
        tasks: [
          {
            title: 'Recruit seed sellers',
            description: 'Manually onboard first 20-50 quality sellers',
            estimatedTime: '3 weeks',
            resources: [],
            order: 1,
          },
          {
            title: 'Curate initial inventory',
            description: 'Ensure quality and variety of initial listings',
            estimatedTime: '2 weeks',
            resources: [],
            order: 2,
          },
          {
            title: 'Create seller resources',
            description: 'Develop guides and tools for seller success',
            estimatedTime: '1 week',
            resources: [],
            order: 3,
          },
          {
            title: 'Implement seller incentives',
            description: 'Offer promotions or reduced fees for early sellers',
            estimatedTime: '1 week',
            resources: [],
            order: 4,
          },
        ],
      },
      {
        name: 'Demand Generation',
        description: 'Attract buyers and drive transactions',
        order: 4,
        estimatedDuration: 'Ongoing',
        tasks: [
          {
            title: 'Launch marketing campaigns',
            description: 'Run targeted ads to attract buyers',
            estimatedTime: 'Ongoing',
            resources: [],
            order: 1,
          },
          {
            title: 'Optimize for SEO',
            description: 'Ensure listings are discoverable via search engines',
            estimatedTime: '2 weeks',
            resources: [],
            order: 2,
          },
          {
            title: 'Build trust signals',
            description: 'Add guarantees, verification, and security features',
            estimatedTime: '2 weeks',
            resources: [],
            order: 3,
          },
          {
            title: 'Facilitate first transactions',
            description: 'Manually support early transactions to ensure success',
            estimatedTime: '4 weeks',
            resources: [],
            order: 4,
          },
          {
            title: 'Implement growth loops',
            description: 'Create referral programs and viral features',
            estimatedTime: '3 weeks',
            resources: [],
            order: 5,
          },
        ],
      },
    ],
  },
];

/**
 * Seed templates into the database
 * This function can be run as a script or called from migrations
 */
export async function seedTemplates(): Promise<void> {
  console.log('Seeding plan templates...');

  for (const template of defaultTemplates) {
    try {
      // Check if template already exists
      const existing = await db
        .select()
        .from(planTemplates)
        .where(eq(planTemplates.name, template.name))
        .limit(1);

      if (existing.length > 0) {
        console.log(`Template "${template.name}" already exists, skipping...`);
        continue;
      }

      // Insert template
      await db.insert(planTemplates).values({
        ...template,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      console.log(`✓ Created template: ${template.name}`);
    } catch (error) {
      console.error(`Error creating template "${template.name}":`, error);
    }
  }

  console.log('Template seeding complete!');
}

// Run the seed function when script is executed directly
seedTemplates()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error seeding templates:', error);
    process.exit(1);
  });
