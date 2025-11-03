# 🗄️ Database Schema Plan - Chat AI App

This document defines the complete PostgreSQL database schema for the chat application.

---

## 📋 Table of Contents

1. [users](#1-users)
2. [conversations](#2-conversations)
3. [participants](#3-participants)
4. [messages](#4-messages)
5. [message_reactions](#5-message_reactions)
6. [ai_cache](#6-ai_cache)
7. [Entity Relationship Diagram](#entity-relationship-diagram)

---

## 1. users

Stores user account information and authentication data.

### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `UUID` | PRIMARY KEY | Unique user identifier |
| `name` | `VARCHAR(255)` | NOT NULL | Display name |
| `email` | `VARCHAR(255)` | NOT NULL, UNIQUE | Email address for login |
| `password_hash` | `TEXT` | NOT NULL | Bcrypt hashed password |
| `avatar_url` | `TEXT` | NULLABLE | Profile picture URL |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() | Account creation timestamp |
| `updated_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() | Last update timestamp |

### Constraints

- **Primary Key:** `id`
- **Unique Constraint:** `email` (for login uniqueness)

### Indexes

| Index Name | Columns | Type | Reasoning |
|------------|---------|------|-----------|
| `idx_users_email` | `email` | UNIQUE | Fast email lookup during login |
| `idx_users_created_at` | `created_at` | BTREE | For sorting/filtering users by signup date |

### Foreign Keys

None (root entity).

### Sample Row

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Alice Johnson",
  "email": "alice@example.com",
  "password_hash": "$2b$10$abcdefghijklmnopqrstuvwxyz1234567890",
  "avatar_url": "https://cdn.example.com/avatars/alice.jpg",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-20T14:45:00Z"
}
```

---

## 2. conversations

Represents chat conversations (1-on-1 or group chats).

### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `UUID` | PRIMARY KEY | Unique conversation identifier |
| `title` | `VARCHAR(255)` | NULLABLE | Optional conversation name (mainly for groups) |
| `is_group` | `BOOLEAN` | NOT NULL, DEFAULT FALSE | True if group chat, false if 1-on-1 |
| `created_by` | `UUID` | NOT NULL, FK → users(id) | User who created the conversation |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() | Conversation creation timestamp |

### Constraints

- **Primary Key:** `id`
- **Foreign Key:** `created_by` → `users(id)` ON DELETE SET NULL

### Indexes

| Index Name | Columns | Type | Reasoning |
|------------|---------|------|-----------|
| `idx_conversations_created_by` | `created_by` | BTREE | Find all conversations created by a user |
| `idx_conversations_created_at` | `created_at` | BTREE | Sort conversations by creation time |
| `idx_conversations_is_group` | `is_group` | BTREE | Filter group vs 1-on-1 chats |

### Foreign Keys

- `created_by` → `users(id)` **ON DELETE SET NULL** (preserve conversation if creator deleted)

### Sample Row

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "title": "Project Team Discussion",
  "is_group": true,
  "created_by": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-01-15T11:00:00Z"
}
```

---

## 3. participants

Tracks which users are part of which conversations.

### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `UUID` | PRIMARY KEY | Unique participant record identifier |
| `conversation_id` | `UUID` | NOT NULL, FK → conversations(id) | The conversation |
| `user_id` | `UUID` | NOT NULL, FK → users(id) | The user participating |
| `joined_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() | When user joined the conversation |
| `role` | `TEXT` | NOT NULL, DEFAULT 'member' | User role: 'admin', 'member', 'ai' |

### Constraints

- **Primary Key:** `id`
- **Unique Constraint:** `(conversation_id, user_id)` (user can only join once per conversation)
- **Foreign Keys:**
  - `conversation_id` → `conversations(id)` ON DELETE CASCADE
  - `user_id` → `users(id)` ON DELETE CASCADE

### Indexes

| Index Name | Columns | Type | Reasoning |
|------------|---------|------|-----------|
| `idx_participants_conversation_id` | `conversation_id` | BTREE | Quickly fetch all participants of a conversation |
| `idx_participants_user_id` | `user_id` | BTREE | Find all conversations a user is part of |
| `idx_participants_unique` | `(conversation_id, user_id)` | UNIQUE | Prevent duplicate participant entries |
| `idx_participants_role` | `role` | BTREE | Filter by role (e.g., find all admins) |

### Foreign Keys

- `conversation_id` → `conversations(id)` **ON DELETE CASCADE** (remove participants if conversation deleted)
- `user_id` → `users(id)` **ON DELETE CASCADE** (remove participation if user deleted)

### Sample Row

```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "conversation_id": "660e8400-e29b-41d4-a716-446655440001",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "joined_at": "2025-01-15T11:00:00Z",
  "role": "admin"
}
```

---

## 4. messages

Stores all chat messages with metadata and delivery status.

### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `BIGSERIAL` | PRIMARY KEY | Auto-incrementing message ID |
| `conversation_id` | `UUID` | NOT NULL, FK → conversations(id) | Which conversation the message belongs to |
| `sender_id` | `UUID` | NOT NULL, FK → users(id) | Who sent the message |
| `content` | `TEXT` | NOT NULL | Message text content |
| `attachments` | `JSONB` | NULLABLE | Array of attachment metadata (URLs, types, sizes) |
| `status` | `TEXT` | NOT NULL, DEFAULT 'sent' | Message status: 'sent', 'delivered', 'read' |
| `status_timestamps` | `JSONB` | NULLABLE | Timestamps for status changes: `{"sent": ..., "delivered": ..., "read": ...}` |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() | When message was created |
| `edited_at` | `TIMESTAMP` | NULLABLE | When message was last edited |

### Constraints

- **Primary Key:** `id`
- **Foreign Keys:**
  - `conversation_id` → `conversations(id)` ON DELETE CASCADE
  - `sender_id` → `users(id)` ON DELETE SET NULL

### Indexes

| Index Name | Columns | Type | Reasoning |
|------------|---------|------|-----------|
| `idx_messages_conversation_id` | `conversation_id` | BTREE | Fetch all messages in a conversation (most common query) |
| `idx_messages_sender_id` | `sender_id` | BTREE | Find all messages sent by a specific user |
| `idx_messages_created_at` | `created_at` | BTREE | Sort messages chronologically |
| `idx_messages_conversation_created` | `(conversation_id, created_at DESC)` | BTREE | Optimized for paginated message fetching |
| `idx_messages_status` | `status` | BTREE | Filter unread messages |

### Foreign Keys

- `conversation_id` → `conversations(id)` **ON DELETE CASCADE** (delete messages if conversation deleted)
- `sender_id` → `users(id)` **ON DELETE SET NULL** (preserve messages if sender deleted)

### Sample Row

```json
{
  "id": 1001,
  "conversation_id": "660e8400-e29b-41d4-a716-446655440001",
  "sender_id": "550e8400-e29b-41d4-a716-446655440000",
  "content": "Hey team! Just finished the database design.",
  "attachments": [
    {
      "url": "https://cdn.example.com/files/schema.png",
      "type": "image/png",
      "size": 245632,
      "name": "schema.png"
    }
  ],
  "status": "delivered",
  "status_timestamps": {
    "sent": "2025-01-15T11:05:00Z",
    "delivered": "2025-01-15T11:05:02Z"
  },
  "created_at": "2025-01-15T11:05:00Z",
  "edited_at": null
}
```

---

## 5. message_reactions

Tracks emoji reactions to messages (e.g., 👍, ❤️, 😂).

### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `UUID` | PRIMARY KEY | Unique reaction identifier |
| `message_id` | `BIGINT` | NOT NULL, FK → messages(id) | Which message was reacted to |
| `user_id` | `UUID` | NOT NULL, FK → users(id) | Who reacted |
| `emoji` | `TEXT` | NOT NULL | Emoji character (e.g., '👍', '❤️') |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() | When reaction was added |

### Constraints

- **Primary Key:** `id`
- **Unique Constraint:** `(message_id, user_id, emoji)` (user can only react once with same emoji per message)
- **Foreign Keys:**
  - `message_id` → `messages(id)` ON DELETE CASCADE
  - `user_id` → `users(id)` ON DELETE CASCADE

### Indexes

| Index Name | Columns | Type | Reasoning |
|------------|---------|------|-----------|
| `idx_reactions_message_id` | `message_id` | BTREE | Fetch all reactions for a message |
| `idx_reactions_user_id` | `user_id` | BTREE | Find all reactions by a user |
| `idx_reactions_unique` | `(message_id, user_id, emoji)` | UNIQUE | Prevent duplicate reactions |

### Foreign Keys

- `message_id` → `messages(id)` **ON DELETE CASCADE** (remove reactions if message deleted)
- `user_id` → `users(id)` **ON DELETE CASCADE** (remove reactions if user deleted)

### Sample Row

```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "message_id": 1001,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "emoji": "👍",
  "created_at": "2025-01-15T11:06:00Z"
}
```

---

## 6. ai_cache

Caches AI model responses to reduce API costs and improve response times.

### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `UUID` | PRIMARY KEY | Unique cache entry identifier |
| `model` | `TEXT` | NOT NULL | AI model used (e.g., 'gpt-4', 'claude-3-opus') |
| `prompt_hash` | `TEXT` | NOT NULL | SHA-256 hash of the prompt for quick lookup |
| `prompt_summary` | `TEXT` | NOT NULL | First 200 chars of prompt (for debugging) |
| `response_text` | `TEXT` | NOT NULL | Cached AI response |
| `tokens_used` | `INTEGER` | NOT NULL | Total tokens consumed |
| `cost_estimate` | `DECIMAL(10,6)` | NOT NULL | Estimated cost in USD |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() | When response was cached |
| `ttl` | `TIMESTAMP` | NOT NULL | Time-to-live: when cache expires |

### Constraints

- **Primary Key:** `id`
- **Unique Constraint:** `(model, prompt_hash)` (one cached response per model+prompt combination)

### Indexes

| Index Name | Columns | Type | Reasoning |
|------------|---------|------|-----------|
| `idx_ai_cache_lookup` | `(model, prompt_hash)` | UNIQUE | Fast cache hit lookup |
| `idx_ai_cache_ttl` | `ttl` | BTREE | Efficiently clean up expired cache entries |
| `idx_ai_cache_created_at` | `created_at` | BTREE | Analytics on cache usage over time |

### Foreign Keys

None (independent cache table).

### Sample Row

```json
{
  "id": "990e8400-e29b-41d4-a716-446655440004",
  "model": "gpt-4",
  "prompt_hash": "a3f5d8e9c1b2a4f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0",
  "prompt_summary": "Explain the differences between REST and GraphQL in simple terms. Focus on when to use each approach and provide real-world examples.",
  "response_text": "REST and GraphQL are both ways to build APIs, but they work differently...",
  "tokens_used": 450,
  "cost_estimate": 0.009000,
  "created_at": "2025-01-15T11:10:00Z",
  "ttl": "2025-01-22T11:10:00Z"
}
```

---

## Entity Relationship Diagram

```
┌─────────────┐
│    users    │
│─────────────│
│ id (PK)     │◄─────┐
│ name        │      │
│ email       │      │
│ ...         │      │
└─────────────┘      │
       ▲             │
       │             │
       │ created_by  │ sender_id
       │             │
┌──────┴──────────┐  │
│ conversations   │  │
│─────────────────│  │
│ id (PK)         │  │
│ title           │  │
│ is_group        │  │
│ created_by (FK) │──┘
│ ...             │
└─────────────────┘
       ▲
       │
       │ conversation_id
       │
┌──────┴───────────┐         ┌─────────────────┐
│  participants    │         │    messages     │
│──────────────────│         │─────────────────│
│ id (PK)          │         │ id (PK)         │
│ conversation_id  │◄────────┤ conversation_id │
│ user_id (FK)     │         │ sender_id (FK)  │
│ role             │         │ content         │
│ ...              │         │ attachments     │
└──────────────────┘         │ status          │
                             │ ...             │
                             └─────────────────┘
                                     ▲
                                     │
                                     │ message_id
                                     │
                             ┌───────┴──────────┐
                             │message_reactions │
                             │──────────────────│
                             │ id (PK)          │
                             │ message_id (FK)  │
                             │ user_id (FK)     │
                             │ emoji            │
                             │ ...              │
                             └──────────────────┘

┌─────────────┐
│  ai_cache   │  (Independent table)
│─────────────│
│ id (PK)     │
│ model       │
│ prompt_hash │
│ ...         │
└─────────────┘
```

---

## 🔄 Cascade Behavior Summary

| Parent Table | Child Table | Relationship | ON DELETE Behavior |
|--------------|-------------|--------------|-------------------|
| `users` | `conversations` | created_by | SET NULL |
| `users` | `participants` | user_id | CASCADE |
| `users` | `messages` | sender_id | SET NULL |
| `users` | `message_reactions` | user_id | CASCADE |
| `conversations` | `participants` | conversation_id | CASCADE |
| `conversations` | `messages` | conversation_id | CASCADE |
| `messages` | `message_reactions` | message_id | CASCADE |

---

## 📝 Notes

- **UUID vs BIGSERIAL:** UUIDs are used for most tables to avoid exposing sequential IDs. Messages use `BIGSERIAL` for efficient pagination and sorting.
- **JSONB for flexibility:** `attachments` and `status_timestamps` use JSONB to store structured data without rigid schema.
- **Cache TTL:** The `ai_cache` table includes a TTL field to automatically expire old entries (implement with a cron job or trigger).
- **Soft deletes:** Not implemented in this schema. If needed, add `deleted_at` columns.

---

**Maintained by:** chat-ai-app team  
**Last updated:** November 2025