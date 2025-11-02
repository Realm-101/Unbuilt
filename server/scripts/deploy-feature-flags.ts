/**
 * Feature Flag Deployment Script
 * 
 * Manages feature flag deployment with gradual rollout
 */

import { featureFlagService } from '../services/featureFlagService';
import { logger } from '../config/logger';

interface DeploymentConfig {
  featureName: string;
  description: string;
  stages: {
    name: string;
    percentage: number;
    allowedTiers?: string[];
    allowedUserIds?: number[];
    duration: string; // e.g., "1 day", "3 days", "1 week"
  }[];
}

const ACTION_PLAN_DEPLOYMENT: DeploymentConfig = {
  featureName: 'action_plan_customization',
  description: 'Interactive action plan customization with task management, progress tracking, and collaboration features',
  stages: [
    {
      name: 'Internal Testing',
      percentage: 0,
      allowedUserIds: [], // Add internal tester user IDs here
      duration: '3 days'
    },
    {
      name: 'Beta Testing (10%)',
      percentage: 10,
      allowedTiers: ['pro', 'enterprise'],
      duration: '1 week'
    },
    {
      name: 'Expanded Beta (50%)',
      percentage: 50,
      allowedTiers: ['pro', 'enterprise'],
      duration: '1 week'
    },
    {
      name: 'General Availability (100%)',
      percentage: 100,
      allowedTiers: [],
      duration: 'ongoing'
    }
  ]
};

async function initializeFeatureFlag(config: DeploymentConfig): Promise<void> {
  console.log(`\n🚀 Initializing feature flag: ${config.featureName}`);
  console.log(`📝 Description: ${config.description}\n`);

  try {
    // Create feature flag in disabled state
    await featureFlagService.upsertFeatureFlag(config.featureName, {
      description: config.description,
      enabled: false,
      rolloutPercentage: 0,
      allowedTiers: [],
      allowedUserIds: []
    });

    console.log(`✅ Feature flag initialized: ${config.featureName}`);
    console.log(`   Status: Disabled`);
    console.log(`   Rollout: 0%\n`);
  } catch (error) {
    console.error(`❌ Failed to initialize feature flag:`, error);
    throw error;
  }
}

async function deployStage(
  featureName: string,
  stage: DeploymentConfig['stages'][0]
): Promise<void> {
  console.log(`\n📦 Deploying stage: ${stage.name}`);
  console.log(`   Rollout: ${stage.percentage}%`);
  if (stage.allowedTiers && stage.allowedTiers.length > 0) {
    console.log(`   Tiers: ${stage.allowedTiers.join(', ')}`);
  }
  if (stage.allowedUserIds && stage.allowedUserIds.length > 0) {
    console.log(`   Beta Users: ${stage.allowedUserIds.length} users`);
  }
  console.log(`   Duration: ${stage.duration}\n`);

  try {
    await featureFlagService.upsertFeatureFlag(featureName, {
      enabled: true,
      rolloutPercentage: stage.percentage,
      allowedTiers: stage.allowedTiers || [],
      allowedUserIds: stage.allowedUserIds || []
    });

    console.log(`✅ Stage deployed successfully`);
    console.log(`   Monitor metrics for ${stage.duration} before proceeding to next stage\n`);
  } catch (error) {
    console.error(`❌ Failed to deploy stage:`, error);
    throw error;
  }
}

async function rollback(featureName: string): Promise<void> {
  console.log(`\n⚠️  Rolling back feature: ${featureName}`);

  try {
    await featureFlagService.upsertFeatureFlag(featureName, {
      enabled: false,
      rolloutPercentage: 0
    });

    console.log(`✅ Feature rolled back successfully`);
    console.log(`   Status: Disabled`);
    console.log(`   Rollout: 0%\n`);
  } catch (error) {
    console.error(`❌ Failed to rollback feature:`, error);
    throw error;
  }
}

async function getStatus(featureName: string): Promise<void> {
  console.log(`\n📊 Feature Flag Status: ${featureName}\n`);

  try {
    const flag = await featureFlagService.getFeatureFlag(featureName);

    if (!flag) {
      console.log(`❌ Feature flag not found\n`);
      return;
    }

    console.log(`   Enabled: ${flag.enabled ? '✅ Yes' : '❌ No'}`);
    console.log(`   Rollout: ${flag.rolloutPercentage}%`);
    console.log(`   Allowed Tiers: ${flag.allowedTiers.length > 0 ? flag.allowedTiers.join(', ') : 'All'}`);
    console.log(`   Beta Users: ${flag.allowedUserIds.length} users`);
    console.log(`   Created: ${flag.createdAt}`);
    console.log(`   Updated: ${flag.updatedAt}\n`);
  } catch (error) {
    console.error(`❌ Failed to get status:`, error);
    throw error;
  }
}

async function addBetaUser(featureName: string, userId: number): Promise<void> {
  console.log(`\n👤 Adding beta user to feature: ${featureName}`);
  console.log(`   User ID: ${userId}\n`);

  try {
    await featureFlagService.addUserToFeature(featureName, userId);
    console.log(`✅ User added successfully\n`);
  } catch (error) {
    console.error(`❌ Failed to add user:`, error);
    throw error;
  }
}

async function removeBetaUser(featureName: string, userId: number): Promise<void> {
  console.log(`\n👤 Removing beta user from feature: ${featureName}`);
  console.log(`   User ID: ${userId}\n`);

  try {
    await featureFlagService.removeUserFromFeature(featureName, userId);
    console.log(`✅ User removed successfully\n`);
  } catch (error) {
    console.error(`❌ Failed to remove user:`, error);
    throw error;
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2];
  const featureName = process.argv[3] || ACTION_PLAN_DEPLOYMENT.featureName;

  console.log(`\n🎯 Feature Flag Deployment Tool\n`);

  try {
    switch (command) {
      case 'init':
        await initializeFeatureFlag(ACTION_PLAN_DEPLOYMENT);
        break;

      case 'deploy':
        const stageName = process.argv[4];
        if (!stageName) {
          console.error('❌ Stage name required. Available stages:');
          ACTION_PLAN_DEPLOYMENT.stages.forEach((stage, i) => {
            console.log(`   ${i + 1}. ${stage.name}`);
          });
          process.exit(1);
        }

        const stage = ACTION_PLAN_DEPLOYMENT.stages.find(s => 
          s.name.toLowerCase().includes(stageName.toLowerCase())
        );

        if (!stage) {
          console.error(`❌ Stage not found: ${stageName}`);
          process.exit(1);
        }

        await deployStage(featureName, stage);
        break;

      case 'rollback':
        await rollback(featureName);
        break;

      case 'status':
        await getStatus(featureName);
        break;

      case 'add-user':
        const addUserId = parseInt(process.argv[4], 10);
        if (isNaN(addUserId)) {
          console.error('❌ Valid user ID required');
          process.exit(1);
        }
        await addBetaUser(featureName, addUserId);
        break;

      case 'remove-user':
        const removeUserId = parseInt(process.argv[4], 10);
        if (isNaN(removeUserId)) {
          console.error('❌ Valid user ID required');
          process.exit(1);
        }
        await removeBetaUser(featureName, removeUserId);
        break;

      case 'help':
      default:
        console.log(`Usage: npm run deploy:feature-flag <command> [options]\n`);
        console.log(`Commands:`);
        console.log(`  init                    Initialize feature flag (disabled)`);
        console.log(`  deploy <stage>          Deploy specific stage`);
        console.log(`  rollback                Rollback feature (disable)`);
        console.log(`  status                  Show current status`);
        console.log(`  add-user <userId>       Add beta user`);
        console.log(`  remove-user <userId>    Remove beta user`);
        console.log(`  help                    Show this help\n`);
        console.log(`Available stages for action_plan_customization:`);
        ACTION_PLAN_DEPLOYMENT.stages.forEach((stage, i) => {
          console.log(`  ${i + 1}. ${stage.name} (${stage.percentage}%)`);
        });
        console.log();
        break;
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export {
  initializeFeatureFlag,
  deployStage,
  rollback,
  getStatus,
  addBetaUser,
  removeBetaUser,
  ACTION_PLAN_DEPLOYMENT
};
