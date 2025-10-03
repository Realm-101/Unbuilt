import 'dotenv/config';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function testRegistration() {
  try {
    console.log('🧪 Testing database registration...');
    
    // Try to insert a test user
    const testEmail = `test_${Date.now()}@example.com`;
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
    
    const [newUser] = await db.insert(users).values({
      email: testEmail,
      password: hashedPassword,
      name: 'Test User',
      plan: 'free',
    }).returning();
    
    console.log('✅ User created successfully!');
    console.log('   ID:', newUser.id);
    console.log('   Email:', newUser.email);
    
    // Clean up - delete test user
    await db.delete(users).where(eq(users.id, newUser.id));
    console.log('✅ Test user cleaned up');
    
    console.log('\n✅ Database is working correctly!');
    console.log('   Registration should work in the app.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\nThis is why registration is failing in the app.');
    process.exit(1);
  }
}

testRegistration();
