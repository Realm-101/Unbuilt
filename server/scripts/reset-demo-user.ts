// Load environment variables FIRST before any other imports
import { config } from 'dotenv';
config();

import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function resetDemoUser() {
  const demoEmail = process.env.DEMO_USER_EMAIL || 'Admin@unbuilt.one';
  const demoPassword = process.env.DEMO_USER_PASSWORD || 'Admin@123';

  console.log(`🔄 Resetting password for: ${demoEmail}`);

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(demoPassword, 10);

    // Update the user
    const result = await db
      .update(users)
      .set({ 
        password: hashedPassword,
        accountLocked: false,
        failedLoginAttempts: 0
      })
      .where(eq(users.email, demoEmail))
      .returning();

    if (result.length > 0) {
      console.log('✅ Demo user password reset successfully!');
      console.log(`   Email: ${demoEmail}`);
      console.log(`   Password: ${demoPassword}`);
    } else {
      console.log('❌ Demo user not found. Creating new user...');
      
      // Create the user
      const newUser = await db.insert(users).values({
        email: demoEmail,
        password: hashedPassword,
        name: 'Demo User',
        provider: 'local',
        plan: 'free',
        isActive: true,
        accountLocked: false,
        failedLoginAttempts: 0
      }).returning();

      console.log('✅ Demo user created successfully!');
      console.log(`   Email: ${demoEmail}`);
      console.log(`   Password: ${demoPassword}`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

resetDemoUser();
