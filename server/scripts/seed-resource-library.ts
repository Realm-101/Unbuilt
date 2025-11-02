import { db } from '../db';
import { 
  resourceCategories, 
  resources, 
  resourceTags, 
  resourceTagMappings,
  type InsertResourceCategory,
  type InsertResource,
  type InsertResourceTag
} from '@shared/schema';

// Resource Categories with hierarchical structure
const categoriesData: Omit<InsertResourceCategory, 'id' | 'createdAt'>[] = [
  // Main Categories
  {
    name: 'Funding',
    slug: 'funding',
    description: 'Resources for raising capital, grants, and financial planning',
    icon: 'DollarSign',
    displayOrder: 1,
    parentId: null,
  },
  {
    name: 'Documentation',
    slug: 'documentation',
    description: 'Templates, guides, and documentation tools',
    icon: 'FileText',
    displayOrder: 2,
    parentId: null,
  },
  {
    name: 'Marketing',
    slug: 'marketing',
    description: 'Marketing tools, strategies, and growth resources',
    icon: 'Megaphone',
    displayOrder: 3,
    parentId: null,
  },
  {
    name: 'Legal',
    slug: 'legal',
    description: 'Legal templates, compliance guides, and regulatory resources',
    icon: 'Scale',
    displayOrder: 4,
    parentId: null,
  },
  {
    name: 'Technical',
    slug: 'technical',
    description: 'Development tools, tech stacks, and technical resources',
    icon: 'Code',
    displayOrder: 5,
    parentId: null,
  },
  {
    name: 'Research',
    slug: 'research',
    description: 'Market research tools, survey templates, and analysis frameworks',
    icon: 'Search',
    displayOrder: 6,
    parentId: null,
  },
];

// Subcategories will be added after main categories are inserted
const subcategoriesData: Omit<InsertResourceCategory, 'id' | 'createdAt' | 'parentId'>[] = [
  // Funding subcategories
  { name: 'Venture Capital', slug: 'venture-capital', description: 'VC resources and pitch materials', icon: 'TrendingUp', displayOrder: 1 },
  { name: 'Angel Investors', slug: 'angel-investors', description: 'Angel investor networks and resources', icon: 'Users', displayOrder: 2 },
  { name: 'Grants & Competitions', slug: 'grants-competitions', description: 'Grant applications and startup competitions', icon: 'Award', displayOrder: 3 },
  { name: 'Crowdfunding', slug: 'crowdfunding', description: 'Crowdfunding platforms and strategies', icon: 'Heart', displayOrder: 4 },
  
  // Documentation subcategories
  { name: 'Business Plans', slug: 'business-plans', description: 'Business plan templates and guides', icon: 'Briefcase', displayOrder: 1 },
  { name: 'Pitch Decks', slug: 'pitch-decks', description: 'Pitch deck templates and examples', icon: 'Presentation', displayOrder: 2 },
  { name: 'Product Requirements', slug: 'product-requirements', description: 'PRD templates and specifications', icon: 'ClipboardList', displayOrder: 3 },
  
  // Marketing subcategories
  { name: 'Content Marketing', slug: 'content-marketing', description: 'Content strategy and creation tools', icon: 'PenTool', displayOrder: 1 },
  { name: 'Social Media', slug: 'social-media', description: 'Social media management and analytics', icon: 'Share2', displayOrder: 2 },
  { name: 'SEO & Analytics', slug: 'seo-analytics', description: 'SEO tools and analytics platforms', icon: 'BarChart', displayOrder: 3 },
  
  // Legal subcategories
  { name: 'Incorporation', slug: 'incorporation', description: 'Company formation and registration', icon: 'Building', displayOrder: 1 },
  { name: 'Contracts & Agreements', slug: 'contracts-agreements', description: 'Legal templates and contracts', icon: 'FileSignature', displayOrder: 2 },
  { name: 'Intellectual Property', slug: 'intellectual-property', description: 'Patents, trademarks, and IP protection', icon: 'Shield', displayOrder: 3 },
  
  // Technical subcategories
  { name: 'Development Tools', slug: 'development-tools', description: 'IDEs, frameworks, and dev tools', icon: 'Terminal', displayOrder: 1 },
  { name: 'Cloud & Infrastructure', slug: 'cloud-infrastructure', description: 'Cloud platforms and hosting', icon: 'Cloud', displayOrder: 2 },
  { name: 'APIs & Integrations', slug: 'apis-integrations', description: 'API services and integration tools', icon: 'Plug', displayOrder: 3 },
  
  // Research subcategories
  { name: 'Survey Tools', slug: 'survey-tools', description: 'Survey platforms and questionnaire tools', icon: 'CheckSquare', displayOrder: 1 },
  { name: 'Market Analysis', slug: 'market-analysis', description: 'Market research and competitive analysis', icon: 'PieChart', displayOrder: 2 },
  { name: 'User Testing', slug: 'user-testing', description: 'User research and testing platforms', icon: 'Users', displayOrder: 3 },
];

// Resource Tags
const tagsData: Omit<InsertResourceTag, 'id' | 'usageCount'>[] = [
  { name: 'Free', slug: 'free' },
  { name: 'Freemium', slug: 'freemium' },
  { name: 'Paid', slug: 'paid' },
  { name: 'Template', slug: 'template' },
  { name: 'Tool', slug: 'tool' },
  { name: 'Guide', slug: 'guide' },
  { name: 'Video', slug: 'video' },
  { name: 'Beginner-Friendly', slug: 'beginner-friendly' },
  { name: 'Advanced', slug: 'advanced' },
  { name: 'Popular', slug: 'popular' },
  { name: 'SaaS', slug: 'saas' },
  { name: 'Physical Product', slug: 'physical-product' },
  { name: 'Service', slug: 'service' },
  { name: 'Marketplace', slug: 'marketplace' },
  { name: 'B2B', slug: 'b2b' },
  { name: 'B2C', slug: 'b2c' },
  { name: 'Quick Start', slug: 'quick-start' },
  { name: 'In-Depth', slug: 'in-depth' },
];

export async function seedResourceLibrary() {
  console.log('🌱 Seeding resource library...');
  console.log('Database URL:', process.env.DATABASE_URL ? 'Found' : 'Not found');
  
  try {
    // Check if categories already exist
    const existingCategories = await db.select().from(resourceCategories).limit(1);
    
    if (existingCategories.length > 0) {
      console.log('ℹ️  Resource library already seeded, skipping');
      return;
    }
    
    // Insert main categories
    console.log('📁 Inserting main categories...');
    const insertedCategories: Record<string, number> = {};
    
    for (const category of categoriesData) {
      const [inserted] = await db.insert(resourceCategories).values(category).returning();
      insertedCategories[category.slug] = inserted.id;
      console.log(`  ✓ ${category.name}`);
    }
    
    // Insert subcategories
    console.log('📂 Inserting subcategories...');
    const subcategoryMap: Record<string, string> = {
      'venture-capital': 'funding',
      'angel-investors': 'funding',
      'grants-competitions': 'funding',
      'crowdfunding': 'funding',
      'business-plans': 'documentation',
      'pitch-decks': 'documentation',
      'product-requirements': 'documentation',
      'content-marketing': 'marketing',
      'social-media': 'marketing',
      'seo-analytics': 'marketing',
      'incorporation': 'legal',
      'contracts-agreements': 'legal',
      'intellectual-property': 'legal',
      'development-tools': 'technical',
      'cloud-infrastructure': 'technical',
      'apis-integrations': 'technical',
      'survey-tools': 'research',
      'market-analysis': 'research',
      'user-testing': 'research',
    };
    
    for (const subcategory of subcategoriesData) {
      const parentSlug = subcategoryMap[subcategory.slug];
      const parentId = insertedCategories[parentSlug];
      
      await db.insert(resourceCategories).values({
        ...subcategory,
        parentId,
      });
      console.log(`  ✓ ${subcategory.name} (under ${parentSlug})`);
    }
    
    // Insert tags
    console.log('🏷️  Inserting tags...');
    const insertedTags: Record<string, number> = {};
    
    for (const tag of tagsData) {
      const [inserted] = await db.insert(resourceTags).values(tag).returning();
      insertedTags[tag.slug] = inserted.id;
    }
    console.log(`  ✓ ${tagsData.length} tags inserted`);
    
    console.log('✅ Resource library structure seeded successfully');
    console.log('📝 Next: Run seed-resources.ts to populate actual resources');
    
  } catch (error) {
    console.error('❌ Error seeding resource library:', error);
    throw error;
  }
}

// Run if called directly
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const currentFile = fileURLToPath(import.meta.url);
const mainFile = resolve(process.argv[1]);

if (currentFile === mainFile) {
  seedResourceLibrary()
    .then(() => {
      console.log('✅ Seed completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}
