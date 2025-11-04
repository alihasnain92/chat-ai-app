import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDatabaseConnection() {
  console.log('🔍 Testing Prisma Database Connection...\n');
  console.log('=' .repeat(50));

  try {
    // Test connection
    console.log('📡 Connecting to database...');
    await prisma.$connect();
    console.log('✅ Successfully connected to database\n');

    // Query all tables
    console.log('📊 Querying all tables:\n');

    // 1. Users table
    const userCount = await prisma.user.count();
    console.log(`👤 users: ${userCount} record(s)`);

    // 2. Conversations table
    const conversationCount = await prisma.conversation.count();
    console.log(`💬 conversations: ${conversationCount} record(s)`);

    // 3. Participants table
    const participantCount = await prisma.participant.count();
    console.log(`👥 participants: ${participantCount} record(s)`);

    // 4. Messages table
    const messageCount = await prisma.message.count();
    console.log(`📨 messages: ${messageCount} record(s)`);

    // 5. Message Reactions table
    const reactionCount = await prisma.messageReaction.count();
    console.log(`❤️  message_reactions: ${reactionCount} record(s)`);

    // 6. AI Cache table
    const cacheCount = await prisma.aiCache.count();
    console.log(`🤖 ai_cache: ${cacheCount} record(s)`);

    console.log('\n' + '=' .repeat(50));
    console.log('✅ All tables verified successfully!');
    console.log('=' .repeat(50));

    // Summary
    const totalRecords = userCount + conversationCount + participantCount + 
                        messageCount + reactionCount + cacheCount;
    console.log(`\n📈 Total records across all tables: ${totalRecords}`);

  } catch (error) {
    console.error('\n❌ Error testing database connection:');
    console.error(error);
    process.exit(1);
  } finally {
    // Disconnect from database
    console.log('\n🔌 Disconnecting from database...');
    await prisma.$disconnect();
    console.log('✅ Disconnected successfully');
  }
}

// Run the test
testDatabaseConnection()
  .then(() => {
    console.log('\n🎉 Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed with error:');
    console.error(error);
    process.exit(1);
  });