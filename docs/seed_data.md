# 🌱 Seed Data Reference Guide

Quick reference for testing the Chat AI App with seeded data.

---

## 👤 Test Users

All users share the same password for easy testing.

| Name | Email | Password | Role |
|------|-------|----------|------|
| Alice Johnson | `alice@test.com` | `password123` | Admin (creator) |
| Bob Smith | `bob@test.com` | `password123` | Member |
| Carol Williams | `carol@test.com` | `password123` | Member |

**Avatar URLs:**
- Alice: `https://api.dicebear.com/7.x/avataaars/svg?seed=Alice`
- Bob: `https://api.dicebear.com/7.x/avataaars/svg?seed=Bob`
- Carol: `https://api.dicebear.com/7.x/avataaars/svg?seed=Carol`

---

## 💬 Conversation Structure

### Conversation 1: "Project Discussion"
- **Type:** 1-on-1 chat
- **Created by:** Alice Johnson
- **Participants:** 
  - Alice (admin)
  - Bob (member)
- **Messages:** 3 messages
- **Reactions:** 1 reaction

### Conversation 2: "Team Chat"
- **Type:** Group chat
- **Created by:** Alice Johnson
- **Participants:**
  - Alice (admin)
  - Bob (member)
  - Carol (member)
- **Messages:** 4 messages
- **Reactions:** 2 reactions

---

## 📨 Sample Messages

### Project Discussion (Alice ↔ Bob)

| Time | Sender | Message |
|------|--------|---------|
| 2 hours ago | Alice | "Hey Bob, how's the project going?" |
| 1.5 hours ago | Bob | "Going well! Almost done with the auth module." |
| 1 hour ago | Alice | "Great! Let me know if you need help." |

**Reactions:**
- 👍 Bob reacted to Alice's first message

---

### Team Chat (Alice, Bob, Carol)

| Time | Sender | Message |
|------|--------|---------|
| 45 min ago | Alice | "Welcome to the team chat everyone!" |
| 30 min ago | Bob | "Thanks! Excited to be here." |
| 20 min ago | Carol | "Hello team! 👋" |
| 10 min ago | Alice | "Let's sync up tomorrow at 10am." |

**Reactions:**
- ❤️ Carol reacted to Alice's welcome message
- 😊 Alice reacted to Carol's hello message

---

## 🔄 Database Reset Commands

### Option 1: Reset with migrations (Recommended)
```bash
cd server
npx prisma migrate reset
```
This will:
1. Drop the database
2. Re-run all migrations
3. Automatically run the seed script

### Option 2: Manual seed only
```bash
cd server
npm run seed
# or
npx prisma db seed
```
This will clear all data and re-seed without touching migrations.

### Option 3: Direct execution (development)
```bash
cd server
npm run seed:dev
# or
npx ts-node prisma/seed.ts
```

---

## 🧪 Testing Login Scenarios

### Test Case 1: Login as Alice
```json
POST /api/auth/login
{
  "email": "alice@test.com",
  "password": "password123"
}
```
**Expected:** Access to both conversations (creator/admin)

---

### Test Case 2: Login as Bob
```json
POST /api/auth/login
{
  "email": "bob@test.com",
  "password": "password123"
}
```
**Expected:** Access to both conversations (member)

---

### Test Case 3: Login as Carol
```json
POST /api/auth/login
{
  "email": "carol@test.com",
  "password": "password123"
}
```
**Expected:** Access to Team Chat only (not in Project Discussion)

---

## 📊 Data Summary

```
Database Contents:
├── 👥 Users: 3
├── 💬 Conversations: 2
│   ├── 1-on-1: 1
│   └── Group: 1
├── 👤 Participants: 5 total
├── 📨 Messages: 7 total
│   ├── Project Discussion: 3
│   └── Team Chat: 4
└── ❤️ Reactions: 3 total
```

---

## 🔍 Quick Database Queries

### View all users
```bash
npx prisma studio
# Navigate to: users table
```

### Check conversation participants
```sql
SELECT 
  c.title, 
  u.name, 
  p.role 
FROM participants p
JOIN conversations c ON p.conversation_id = c.id
JOIN users u ON p.user_id = u.id
ORDER BY c.title, p.role DESC;
```

### View messages with sender names
```sql
SELECT 
  c.title AS conversation,
  u.name AS sender,
  m.content,
  m.created_at
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
JOIN users u ON m.sender_id = u.id
ORDER BY m.created_at ASC;
```

---

## 🚀 Testing Workflow

1. **Reset database:**
   ```bash
   npx prisma migrate reset
   ```

2. **Start server:**
   ```bash
   npm run dev
   ```

3. **Login as Alice:**
   - Use email: `alice@test.com`
   - Use password: `password123`
   - Verify: Can see both conversations

4. **Login as Carol:**
   - Use email: `carol@test.com`
   - Use password: `password123`
   - Verify: Can only see Team Chat

5. **Test message creation:**
   - Send new messages to existing conversations
   - Verify timestamps and status

6. **Test reactions:**
   - Add reactions to existing messages
   - Verify emoji display and count

---

## 📝 Notes

- All timestamps are relative (spread over last 2 hours from seed time)
- Message status is set to `'sent'` by default
- No attachments are included in seed data
- Passwords are hashed with bcrypt (10 salt rounds)
- UUIDs are auto-generated for all entities except messages (which use BIGSERIAL)

---

**Last Updated:** November 2025  
**Maintained by:** Chat AI App Team