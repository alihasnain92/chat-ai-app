import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Clear all existing data in correct order (respecting foreign key constraints)
    console.log('🗑️  Clearing existing data...');
    
    // Delete in order: child tables first, parent tables last
    await prisma.messageReaction.deleteMany({});
    console.log('   ✅ Cleared message_reactions');
    
    await prisma.message.deleteMany({});
    console.log('   ✅ Cleared messages');
    
    await prisma.participant.deleteMany({});
    console.log('   ✅ Cleared participants');
    
    await prisma.conversation.deleteMany({});
    console.log('   ✅ Cleared conversations');
    
    await prisma.aiCache.deleteMany({});
    console.log('   ✅ Cleared ai_cache');
    
    await prisma.user.deleteMany({});
    console.log('   ✅ Cleared users');
    
    console.log('\n✅ Database cleared successfully!\n');

    // Create users
    console.log('👤 Creating users...');
    
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash('password123', saltRounds);

    const alice = await prisma.user.create({
      data: {
        name: 'Alice Johnson',
        email: 'alice@test.com',
        passwordHash: passwordHash,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
      },
    });
    console.log(`   ✅ Created user: ${alice.name} (${alice.email})`);

    const bob = await prisma.user.create({
      data: {
        name: 'Bob Smith',
        email: 'bob@test.com',
        passwordHash: passwordHash,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
      },
    });
    console.log(`   ✅ Created user: ${bob.name} (${bob.email})`);

    const carol = await prisma.user.create({
      data: {
        name: 'Carol Williams',
        email: 'carol@test.com',
        passwordHash: passwordHash,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol',
      },
    });
    console.log(`   ✅ Created user: ${carol.name} (${carol.email})`);

    // Create conversations
    console.log('\n💬 Creating conversations...');

    const projectDiscussion = await prisma.conversation.create({
      data: {
        title: 'Project Discussion',
        isGroup: false,
        createdBy: alice.id,
        participants: {
          create: [
            {
              userId: alice.id,
              role: 'admin',
            },
            {
              userId: bob.id,
              role: 'member',
            },
          ],
        },
      },
    });
    console.log(`   ✅ Created conversation: ${projectDiscussion.title} (1-on-1)`);

    const teamChat = await prisma.conversation.create({
      data: {
        title: 'Team Chat',
        isGroup: true,
        createdBy: alice.id,
        participants: {
          create: [
            {
              userId: alice.id,
              role: 'admin',
            },
            {
              userId: bob.id,
              role: 'member',
            },
            {
              userId: carol.id,
              role: 'member',
            },
          ],
        },
      },
    });
    console.log(`   ✅ Created conversation: ${teamChat.title} (group)`);

    // Create messages
    console.log('\n📨 Creating messages...');

    // Helper to get timestamp X minutes ago
    const minutesAgo = (minutes: number) => {
      const date = new Date();
      date.setMinutes(date.getMinutes() - minutes);
      return date;
    };

    // Messages for Conversation 1 (Alice & Bob)
    const aliceMessage1 = await prisma.message.create({
      data: {
        conversationId: projectDiscussion.id,
        senderId: alice.id,
        content: "Hey Bob, how's the project going?",
        status: 'sent',
        createdAt: minutesAgo(120), // 2 hours ago
      },
    });
    console.log(`   ✅ Message from Alice in "${projectDiscussion.title}"`);

    await prisma.message.create({
      data: {
        conversationId: projectDiscussion.id,
        senderId: bob.id,
        content: 'Going well! Almost done with the auth module.',
        status: 'sent',
        createdAt: minutesAgo(90), // 1.5 hours ago
      },
    });
    console.log(`   ✅ Message from Bob in "${projectDiscussion.title}"`);

    await prisma.message.create({
      data: {
        conversationId: projectDiscussion.id,
        senderId: alice.id,
        content: 'Great! Let me know if you need help.',
        status: 'sent',
        createdAt: minutesAgo(60), // 1 hour ago
      },
    });
    console.log(`   ✅ Message from Alice in "${projectDiscussion.title}"`);

    // Messages for Conversation 2 (Team Chat)
    const aliceWelcome = await prisma.message.create({
      data: {
        conversationId: teamChat.id,
        senderId: alice.id,
        content: 'Welcome to the team chat everyone!',
        status: 'sent',
        createdAt: minutesAgo(45), // 45 minutes ago
      },
    });
    console.log(`   ✅ Message from Alice in "${teamChat.title}"`);

    await prisma.message.create({
      data: {
        conversationId: teamChat.id,
        senderId: bob.id,
        content: 'Thanks! Excited to be here.',
        status: 'sent',
        createdAt: minutesAgo(30), // 30 minutes ago
      },
    });
    console.log(`   ✅ Message from Bob in "${teamChat.title}"`);

    const carolHello = await prisma.message.create({
      data: {
        conversationId: teamChat.id,
        senderId: carol.id,
        content: 'Hello team! 👋',
        status: 'sent',
        createdAt: minutesAgo(20), // 20 minutes ago
      },
    });
    console.log(`   ✅ Message from Carol in "${teamChat.title}"`);

    await prisma.message.create({
      data: {
        conversationId: teamChat.id,
        senderId: alice.id,
        content: "Let's sync up tomorrow at 10am.",
        status: 'sent',
        createdAt: minutesAgo(10), // 10 minutes ago
      },
    });
    console.log(`   ✅ Message from Alice in "${teamChat.title}"`);

    // Create reactions
    console.log('\n❤️  Creating reactions...');

    await prisma.messageReaction.create({
      data: {
        messageId: aliceMessage1.id,
        userId: bob.id,
        emoji: '👍',
      },
    });
    console.log(`   ✅ Bob reacted 👍 to Alice's message`);

    await prisma.messageReaction.create({
      data: {
        messageId: aliceWelcome.id,
        userId: carol.id,
        emoji: '❤️',
      },
    });
    console.log(`   ✅ Carol reacted ❤️ to Alice's welcome message`);

    await prisma.messageReaction.create({
      data: {
        messageId: carolHello.id,
        userId: alice.id,
        emoji: '😊',
      },
    });
    console.log(`   ✅ Alice reacted 😊 to Carol's hello message`);

    console.log('\n✅ Seed data created successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Users: 3`);
    console.log(`   - Conversations: 2`);
    console.log(`   - Participants: 5 total`);
    console.log(`   - Messages: 7`);
    console.log(`   - Reactions: 3`);
    console.log(`   - Password for all users: password123`);

  } catch (error) {
    console.error('\n❌ Error during seeding:');
    console.error(error);
    throw error;
  }
}

main()
  .then(async () => {
    console.log('\n🎉 Seed completed successfully!');
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('\n💥 Seed failed:');
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });