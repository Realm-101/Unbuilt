import { db } from '../db';
import { 
  resourceCategories, 
  resources, 
  resourceTags,
  resourceTagMappings
} from '@shared/schema';
import { sql } from 'drizzle-orm';

async function verifyResourceSeed() {
  console.log('🔍 Verifying resource library seed...\n');
  
  try {
    // Check categories
    const categories = await db.select().from(resourceCategories);
    console.log(`✅ Categories: ${categories.length} total`);
    
    const mainCategories = categories.filter(c => c.parentId === null);
    const subCategories = categories.filter(c => c.parentId !== null);
    console.log(`   - Main categories: ${mainCategories.length}`);
    console.log(`   - Subcategories: ${subCategories.length}\n`);
    
    // Check resources
    const allResources = await db.select().from(resources);
    console.log(`✅ Resources: ${allResources.length} total`);
    
    // Resources by phase
    const phaseCounts: Record<string, number> = {};
    for (const resource of allResources) {
      for (const phase of resource.phaseRelevance || []) {
        phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
      }
    }
    console.log('   Resources by phase:');
    for (const [phase, count] of Object.entries(phaseCounts).sort()) {
      console.log(`   - ${phase}: ${count}`);
    }
    console.log();
    
    // Resources by type
    const typeCounts: Record<string, number> = {};
    for (const resource of allResources) {
      typeCounts[resource.resourceType] = (typeCounts[resource.resourceType] || 0) + 1;
    }
    console.log('   Resources by type:');
    for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`   - ${type}: ${count}`);
    }
    console.log();
    
    // Check tags
    const tags = await db.select().from(resourceTags);
    console.log(`✅ Tags: ${tags.length} total`);
    
    const tagMappings = await db.select().from(resourceTagMappings);
    console.log(`✅ Tag mappings: ${tagMappings.length} total\n`);
    
    // Check data integrity
    console.log('🔍 Data integrity checks:');
    
    // All resources have categories
    const resourcesWithoutCategory = allResources.filter(r => !r.categoryId);
    console.log(`   - Resources without category: ${resourcesWithoutCategory.length} ${resourcesWithoutCategory.length === 0 ? '✅' : '❌'}`);
    
    // All resources have phase relevance
    const resourcesWithoutPhase = allResources.filter(r => !r.phaseRelevance || r.phaseRelevance.length === 0);
    console.log(`   - Resources without phase: ${resourcesWithoutPhase.length} ${resourcesWithoutPhase.length === 0 ? '✅' : '❌'}`);
    
    // All resources have idea types
    const resourcesWithoutIdeaTypes = allResources.filter(r => !r.ideaTypes || r.ideaTypes.length === 0);
    console.log(`   - Resources without idea types: ${resourcesWithoutIdeaTypes.length} ${resourcesWithoutIdeaTypes.length === 0 ? '✅' : '❌'}`);
    
    // All resources are active
    const inactiveResources = allResources.filter(r => !r.isActive);
    console.log(`   - Inactive resources: ${inactiveResources.length} ${inactiveResources.length === 0 ? '✅' : '⚠️'}`);
    
    console.log('\n✅ Verification complete!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

// Run if called directly
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const currentFile = fileURLToPath(import.meta.url);
const mainFile = resolve(process.argv[1]);

if (currentFile === mainFile) {
  verifyResourceSeed()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Verification failed:', error);
      process.exit(1);
    });
}
