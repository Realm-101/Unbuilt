import 'dotenv/config';

// This script clears all rate limits for development
console.log('🔄 Clearing all rate limits...');

// The rate limit store is in-memory, so just restart the server
console.log('✅ To clear rate limits, simply restart the dev server:');
console.log('   1. Press Ctrl+C to stop the server');
console.log('   2. Run: npm run dev');
console.log('   3. Try registering again');
console.log('\n💡 Rate limits reset on server restart in development mode.');
