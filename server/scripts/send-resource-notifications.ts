import { processNotifications } from '../services/resourceNotificationService';

/**
 * Batch job to send resource notifications
 * This script should be run via cron job:
 * - Daily: Every day at 9 AM
 * - Weekly: Every Monday at 9 AM
 */

async function main() {
  const args = process.argv.slice(2);
  const frequency = args[0] as 'daily' | 'weekly';

  if (!frequency || !['daily', 'weekly'].includes(frequency)) {
    console.error('Usage: npm run notifications:send [daily|weekly]');
    process.exit(1);
  }

  console.log(`\n🚀 Starting ${frequency} resource notification job...`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  try {
    const result = await processNotifications(frequency);
    
    console.log('\n📊 Notification Job Summary:');
    console.log(`   Total notifications: ${result.total}`);
    console.log(`   Successfully sent: ${result.sent}`);
    console.log(`   Failed: ${result.failed}`);
    console.log(`   Success rate: ${result.total > 0 ? ((result.sent / result.total) * 100).toFixed(1) : 0}%`);
    
    if (result.failed > 0) {
      console.warn(`\n⚠️  ${result.failed} notifications failed to send`);
      process.exit(1);
    }
    
    console.log('\n✅ Notification job completed successfully\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Notification job failed:', error);
    process.exit(1);
  }
}

main();
