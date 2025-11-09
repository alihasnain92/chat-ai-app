# Socket.IO Specification

## 1. Overview

### Why Socket.IO (vs Plain WebSockets)

Socket.IO provides several advantages over plain WebSockets for our real-time messaging application:

- **Automatic Reconnection**: Built-in reconnection logic with exponential backoff
- **Fallback Support**: Automatically falls back to HTTP long-polling if WebSocket connection fails
- **Event-Based API**: Clean, event-driven architecture with named events and acknowledgments
- **Room Support**: Native support for organizing connections into rooms (conversations)
- **Binary Support**: Handles both text and binary data seamlessly
- **Namespace Support**: Logical separation of concerns (future scalability)
- **Cross-Browser Compatibility**: Handles browser quirks and older browsers

### Connection Lifecycle

```
Client                          Server
  |                               |
  |--- connect (with token) ----->|
  |                               |--- validate token
  |                               |--- store userId → socketId
  |<---- auth:success ------------|
  |                               |
  |--- conversation:join -------->|
  |                               |--- verify participation
  |                               |--- join room
  |<---- conversation:joined -----|
  |                               |
  |<==== real-time events =======>|
  |                               |
  |--- disconnect --------------->|
  |                               |--- clean up mappings
```

### Authentication Flow

1. Client initiates connection with JWT token in auth handshake
2. Server validates token against JWT secret
3. If valid:
   - Extract userId from token
   - Store userId → socketId mapping in memory
   - Emit `auth:success` event
4. If invalid:
   - Emit `auth:error` event
   - Disconnect client
5. All subsequent events require authenticated connection

---

## 2. Connection & Authentication

### Client Connection

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
});
```

### Server Authentication Middleware

```typescript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication token required'));
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.data.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});
```

### Authentication Events

#### `auth:success` (S→C)

Emitted immediately after successful authentication.

**Payload:**
```typescript
interface AuthSuccessPayload {
  userId: string;
  socketId: string;
  message: string;
}
```

**Example:**
```typescript
{
  userId: "user_123",
  socketId: "abcd1234efgh5678",
  message: "Authentication successful"
}
```

**Handler Behavior:**
- Server stores `userId → socketId` mapping
- Client can now emit other events

#### `auth:error` (S→C)

Emitted when authentication fails.

**Payload:**
```typescript
interface AuthErrorPayload {
  message: string;
  code: 'INVALID_TOKEN' | 'MISSING_TOKEN' | 'EXPIRED_TOKEN';
}
```

**Example:**
```typescript
{
  message: "Invalid authentication token",
  code: "INVALID_TOKEN"
}
```

**Handler Behavior:**
- Server disconnects socket
- Client should refresh token and reconnect

---

## 3. Room Management

### Room Naming Convention

Each conversation is a Socket.IO room with the naming pattern:

```
conversation-{conversationId}
```

**Examples:**
- `conversation-conv_a1b2c3d4`
- `conversation-conv_xyz789`

### Join Room

#### `conversation:join` (C→S)

Client requests to join a conversation room.

**Payload:**
```typescript
interface ConversationJoinPayload {
  conversationId: string;
}
```

**Handler Behavior:**
1. Verify user is a participant in the conversation (query database)
2. If authorized:
   - Add socket to room: `socket.join('conversation-{conversationId}')`
   - Emit `conversation:joined` to client
   - Emit `user:online` to other room members
3. If unauthorized:
   - Emit `conversation:join:error` to client

**Response Events:**
- `conversation:joined` (to requesting client)
- `user:online` (to other room members)

#### `conversation:joined` (S→C)

Confirms successful room join.

**Payload:**
```typescript
interface ConversationJoinedPayload {
  conversationId: string;
  participantCount: number;
}
```

**Example:**
```typescript
{
  conversationId: "conv_a1b2c3d4",
  participantCount: 3
}
```

#### `conversation:leave` (C→S)

Client requests to leave a conversation room.

**Payload:**
```typescript
interface ConversationLeavePayload {
  conversationId: string;
}
```

**Handler Behavior:**
1. Remove socket from room: `socket.leave('conversation-{conversationId}')`
2. Emit `conversation:left` to client
3. Emit `user:offline` to other room members (if user has no other active sockets in room)

**Response Events:**
- `conversation:left` (to requesting client)
- `user:offline` (to other room members)

#### `conversation:join:error` (S→C)

Emitted when room join fails.

**Payload:**
```typescript
interface ConversationJoinErrorPayload {
  conversationId: string;
  message: string;
  code: 'NOT_PARTICIPANT' | 'NOT_FOUND' | 'UNAUTHORIZED';
}
```

---

## 4. Event Categories

### Connection Events

#### `connect` (Client-side event)

Native Socket.IO event triggered when connection established.

**Handler Behavior (Client):**
```typescript
socket.on('connect', () => {
  console.log('Connected with socket ID:', socket.id);
  // Join relevant conversation rooms
});
```

#### `disconnect` (Client-side event)

Native Socket.IO event triggered when connection lost.

**Payload:**
```typescript
type DisconnectReason = 
  | 'io server disconnect'
  | 'io client disconnect'
  | 'ping timeout'
  | 'transport close'
  | 'transport error';
```

**Handler Behavior (Client):**
```typescript
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  if (reason === 'io server disconnect') {
    // Server forcibly disconnected, may need to re-authenticate
    socket.connect();
  }
  // Otherwise Socket.IO will auto-reconnect
});
```

**Handler Behavior (Server):**
```typescript
socket.on('disconnect', () => {
  // Clean up userId → socketId mapping
  // Emit user:offline to relevant rooms
  // Remove from all rooms
});
```

---

### Message Events

#### `message:send` (C→S)

Client sends a new message.

**Payload:**
```typescript
interface MessageSendPayload {
  conversationId: string;
  content: string;
  tempId?: string; // Client-generated ID for optimistic updates
}
```

**Handler Behavior:**
1. Validate user is participant in conversation
2. Save message to database
3. Emit `message:new` to all room members (including sender)
4. Update conversation's `lastMessageAt` timestamp

**Response Events:**
- `message:new` (to all room members)

#### `message:new` (S→C)

New message created in conversation.

**Payload:**
```typescript
interface MessageNewPayload {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string; // ISO 8601
  tempId?: string; // Echo back for optimistic update matching
  sender: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}
```

**Example:**
```typescript
{
  id: "msg_xyz789",
  conversationId: "conv_a1b2c3d4",
  senderId: "user_123",
  content: "Hello everyone!",
  createdAt: "2025-11-09T10:30:00.000Z",
  tempId: "temp_client_123",
  sender: {
    id: "user_123",
    name: "John Doe",
    avatarUrl: "https://example.com/avatar.jpg"
  }
}
```

#### `message:update` (C→S)

Client updates (edits) an existing message.

**Payload:**
```typescript
interface MessageUpdatePayload {
  messageId: string;
  conversationId: string;
  content: string;
}
```

**Handler Behavior:**
1. Validate user is message author
2. Update message in database
3. Set `editedAt` timestamp
4. Emit `message:updated` to all room members

**Response Events:**
- `message:updated` (to all room members)

#### `message:updated` (S→C)

Message was edited.

**Payload:**
```typescript
interface MessageUpdatedPayload {
  id: string;
  conversationId: string;
  content: string;
  editedAt: string; // ISO 8601
}
```

#### `message:delete` (C→S)

Client deletes a message.

**Payload:**
```typescript
interface MessageDeletePayload {
  messageId: string;
  conversationId: string;
}
```

**Handler Behavior:**
1. Validate user is message author or conversation admin
2. Soft delete message in database (set `deletedAt`)
3. Emit `message:deleted` to all room members

**Response Events:**
- `message:deleted` (to all room members)

#### `message:deleted` (S→C)

Message was deleted.

**Payload:**
```typescript
interface MessageDeletedPayload {
  id: string;
  conversationId: string;
  deletedAt: string; // ISO 8601
}
```

---

### Status Events

#### `message:delivered` (S→C)

Message was delivered to recipient(s).

**Payload:**
```typescript
interface MessageDeliveredPayload {
  messageId: string;
  conversationId: string;
  deliveredTo: string[]; // Array of user IDs
  deliveredAt: string; // ISO 8601
}
```

**Handler Behavior:**
- Emitted when recipient's socket joins conversation room
- Updates message delivery status in database

#### `message:read` (C→S)

Client marks message(s) as read.

**Payload:**
```typescript
interface MessageReadPayload {
  conversationId: string;
  messageIds: string[]; // Can mark multiple messages as read
}
```

**Handler Behavior:**
1. Update read status in database for requesting user
2. Emit `message:read:receipt` to message sender(s)

**Response Events:**
- `message:read:receipt` (to message senders)

#### `message:read:receipt` (S→C)

Confirmation that message(s) were read.

**Payload:**
```typescript
interface MessageReadReceiptPayload {
  conversationId: string;
  messageIds: string[];
  readBy: string; // User ID who read the messages
  readAt: string; // ISO 8601
}
```

---

### Typing Events

#### `typing:start` (C→S)

User starts typing.

**Payload:**
```typescript
interface TypingStartPayload {
  conversationId: string;
}
```

**Handler Behavior:**
1. Emit `typing:user:start` to other room members
2. No database persistence

**Response Events:**
- `typing:user:start` (to other room members)

#### `typing:user:start` (S→C)

Another user started typing.

**Payload:**
```typescript
interface TypingUserStartPayload {
  conversationId: string;
  userId: string;
  user: {
    id: string;
    name: string;
  };
}
```

#### `typing:stop` (C→S)

User stops typing.

**Payload:**
```typescript
interface TypingStopPayload {
  conversationId: string;
}
```

**Handler Behavior:**
1. Emit `typing:user:stop` to other room members

**Response Events:**
- `typing:user:stop` (to other room members)

#### `typing:user:stop` (S→C)

Another user stopped typing.

**Payload:**
```typescript
interface TypingUserStopPayload {
  conversationId: string;
  userId: string;
}
```

---

### Reaction Events

#### `reaction:add` (C→S)

Add reaction to a message.

**Payload:**
```typescript
interface ReactionAddPayload {
  messageId: string;
  conversationId: string;
  emoji: string; // Unicode emoji
}
```

**Handler Behavior:**
1. Validate message exists
2. Save reaction to database
3. Emit `reaction:added` to all room members

**Response Events:**
- `reaction:added` (to all room members)

#### `reaction:added` (S→C)

Reaction was added to message.

**Payload:**
```typescript
interface ReactionAddedPayload {
  id: string;
  messageId: string;
  conversationId: string;
  emoji: string;
  userId: string;
  createdAt: string; // ISO 8601
  user: {
    id: string;
    name: string;
  };
}
```

#### `reaction:remove` (C→S)

Remove reaction from a message.

**Payload:**
```typescript
interface ReactionRemovePayload {
  reactionId: string;
  messageId: string;
  conversationId: string;
}
```

**Handler Behavior:**
1. Validate user owns reaction
2. Delete reaction from database
3. Emit `reaction:removed` to all room members

**Response Events:**
- `reaction:removed` (to all room members)

#### `reaction:removed` (S→C)

Reaction was removed from message.

**Payload:**
```typescript
interface ReactionRemovedPayload {
  id: string;
  messageId: string;
  conversationId: string;
  userId: string;
}
```

---

### Presence Events

#### `user:online` (S→C)

User came online in conversation.

**Payload:**
```typescript
interface UserOnlinePayload {
  conversationId: string;
  userId: string;
  user: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  timestamp: string; // ISO 8601
}
```

**Handler Behavior:**
- Emitted when user joins conversation room
- Can be used to show "online" indicators

#### `user:offline` (S→C)

User went offline in conversation.

**Payload:**
```typescript
interface UserOfflinePayload {
  conversationId: string;
  userId: string;
  timestamp: string; // ISO 8601
  lastSeenAt: string; // ISO 8601
}
```

**Handler Behavior:**
- Emitted when user leaves conversation room or disconnects
- Only emit if user has no other active sockets in the room

#### `presence:request` (C→S)

Request current online users in conversation.

**Payload:**
```typescript
interface PresenceRequestPayload {
  conversationId: string;
}
```

**Handler Behavior:**
1. Query all sockets in room
2. Return list of unique user IDs
3. Emit `presence:response` to requesting client

**Response Events:**
- `presence:response` (to requesting client)

#### `presence:response` (S→C)

Response with current online users.

**Payload:**
```typescript
interface PresenceResponsePayload {
  conversationId: string;
  onlineUsers: Array<{
    id: string;
    name: string;
    avatarUrl?: string;
  }>;
  timestamp: string; // ISO 8601
}
```

---

## 5. Error Handling

### Reconnection Strategy

**Client-Side Configuration:**
```typescript
const socket = io(SERVER_URL, {
  reconnection: true,
  reconnectionDelay: 1000,        // Initial delay: 1 second
  reconnectionDelayMax: 5000,     // Max delay: 5 seconds
  reconnectionAttempts: 5,        // Try 5 times before giving up
  timeout: 20000,                 // Connection timeout: 20 seconds
});
```

**Reconnection Flow:**
1. Connection lost
2. Socket.IO attempts reconnection with exponential backoff
3. On reconnect:
   - Re-authenticate with token
   - Rejoin all conversation rooms
   - Sync missed messages via REST API
4. If all attempts fail:
   - Show offline indicator
   - Queue messages locally
   - Fall back to REST API

**Handling Reconnection:**
```typescript
socket.on('connect', () => {
  // Re-authenticate if needed
  if (socket.recovered) {
    console.log('Connection recovered');
  } else {
    console.log('New connection established');
    // Rejoin rooms
    conversationIds.forEach(id => {
      socket.emit('conversation:join', { conversationId: id });
    });
  }
});
```

### Event Acknowledgments

Use acknowledgments for critical operations to ensure delivery:

**Client Side:**
```typescript
socket.emit('message:send', messageData, (response) => {
  if (response.success) {
    console.log('Message sent:', response.messageId);
  } else {
    console.error('Send failed:', response.error);
    // Fall back to REST API
  }
});
```

**Server Side:**
```typescript
socket.on('message:send', async (data, callback) => {
  try {
    const message = await saveMessage(data);
    callback({ success: true, messageId: message.id });
    
    // Broadcast to room
    io.to(`conversation-${data.conversationId}`).emit('message:new', message);
  } catch (error) {
    callback({ success: false, error: error.message });
  }
});
```

### Error Events

#### `error` (S→C)

Generic error event for various failures.

**Payload:**
```typescript
interface ErrorPayload {
  message: string;
  code: string;
  context?: {
    conversationId?: string;
    messageId?: string;
    [key: string]: any;
  };
}
```

**Example:**
```typescript
{
  message: "Failed to send message",
  code: "MESSAGE_SEND_FAILED",
  context: {
    conversationId: "conv_a1b2c3d4",
    reason: "User not participant"
  }
}
```

### Fallback to REST API

When Socket.IO connection fails or is unavailable:

1. **Queue messages locally** using IndexedDB or localStorage
2. **Use REST API** for message operations:
   - POST `/api/messages` - Send message
   - GET `/api/messages?conversationId={id}` - Fetch messages
   - PATCH `/api/messages/:id` - Update message
   - DELETE `/api/messages/:id` - Delete message
3. **Poll for updates** at regular intervals (5-10 seconds)
4. **Attempt Socket.IO reconnection** in background
5. **Sync queued messages** once connection restored

**Implementation Example:**
```typescript
class MessageService {
  private socket: Socket;
  private isConnected: boolean = false;
  private messageQueue: Message[] = [];
  
  async sendMessage(message: Message) {
    if (this.isConnected) {
      return this.sendViaSocket(message);
    } else {
      return this.sendViaREST(message);
    }
  }
  
  private async sendViaREST(message: Message) {
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
      return await response.json();
    } catch (error) {
      // Queue for later retry
      this.messageQueue.push(message);
      throw error;
    }
  }
}
```

---

## 6. Security

### Token Validation on Connect

**Server Middleware:**
```typescript
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication required'));
  }
  
  try {
    // Verify JWT token
    const payload = jwt.verify(token, JWT_SECRET);
    
    // Check token expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return next(new Error('Token expired'));
    }
    
    // Check if user exists and is active
    const user = await db.users.findById(payload.userId);
    if (!user || user.status === 'suspended') {
      return next(new Error('User not authorized'));
    }
    
    // Attach user data to socket
    socket.data.userId = payload.userId;
    socket.data.user = user;
    
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});
```

### Verify User Participation Before Room Join

**Room Join Handler:**
```typescript
socket.on('conversation:join', async ({ conversationId }, callback) => {
  const userId = socket.data.userId;
  
  try {
    // Verify user is a participant
    const participant = await db.participants.findOne({
      conversationId,
      userId,
      status: 'active' // Not left or removed
    });
    
    if (!participant) {
      const error = {
        message: 'Not authorized to join conversation',
        code: 'NOT_PARTICIPANT'
      };
      
      if (callback) callback({ success: false, error });
      return socket.emit('conversation:join:error', {
        conversationId,
        ...error
      });
    }
    
    // Join room
    await socket.join(`conversation-${conversationId}`);
    
    // Get room info
    const participantCount = (await io.in(`conversation-${conversationId}`).fetchSockets()).length;
    
    // Acknowledge
    if (callback) callback({ success: true });
    
    // Emit joined event
    socket.emit('conversation:joined', {
      conversationId,
      participantCount
    });
    
    // Notify others
    socket.to(`conversation-${conversationId}`).emit('user:online', {
      conversationId,
      userId,
      user: {
        id: socket.data.user.id,
        name: socket.data.user.name,
        avatarUrl: socket.data.user.avatarUrl
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    const errorPayload = {
      message: 'Failed to join conversation',
      code: 'JOIN_FAILED'
    };
    
    if (callback) callback({ success: false, error: errorPayload });
    socket.emit('conversation:join:error', {
      conversationId,
      ...errorPayload
    });
  }
});
```

### Additional Security Measures

#### Authorization Checks

Every event handler must verify:
1. User is authenticated (has valid socket.data.userId)
2. User has permission for the operation
3. Resource exists and belongs to accessible conversation

**Example Pattern:**
```typescript
socket.on('message:update', async ({ messageId, content }) => {
  const userId = socket.data.userId;
  
  // Fetch message with author check
  const message = await db.messages.findOne({
    id: messageId,
    senderId: userId // Only author can edit
  });
  
  if (!message) {
    return socket.emit('error', {
      message: 'Message not found or not authorized',
      code: 'UNAUTHORIZED'
    });
  }
  
  // Proceed with update...
});
```

#### Input Validation

Validate all incoming data:
```typescript
const Joi = require('joi');

const messageSchema = Joi.object({
  conversationId: Joi.string().required(),
  content: Joi.string().min(1).max(10000).required(),
  tempId: Joi.string().optional()
});

socket.on('message:send', async (data, callback) => {
  const { error, value } = messageSchema.validate(data);
  
  if (error) {
    return callback({
      success: false,
      error: { message: error.message, code: 'INVALID_INPUT' }
    });
  }
  
  // Proceed with validated data...
});
```

#### Rate Limiting (Future Implementation)

Implement rate limiting using Redis:
```typescript
const rateLimit = require('socket.io-rate-limiter');

io.use(rateLimit({
  redis: redisClient,
  interval: 60000, // 1 minute
  tokensPerInterval: 100, // 100 events per minute
  message: 'Rate limit exceeded'
}));
```

Or per-event rate limiting:
```typescript
const rateLimiter = new Map();

socket.on('message:send', async (data) => {
  const userId = socket.data.userId;
  const now = Date.now();
  const userLimit = rateLimiter.get(userId) || { count: 0, reset: now + 60000 };
  
  if (now > userLimit.reset) {
    userLimit.count = 0;
    userLimit.reset = now + 60000;
  }
  
  if (userLimit.count >= 30) { // 30 messages per minute
    return socket.emit('error', {
      message: 'Rate limit exceeded',
      code: 'RATE_LIMIT'
    });
  }
  
  userLimit.count++;
  rateLimiter.set(userId, userLimit);
  
  // Proceed with message send...
});
```

#### CORS Configuration

Restrict Socket.IO connections to authorized origins:
```typescript
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST']
  }
});
```

#### Disconnect Suspicious Connections

```typescript
socket.on('suspicious:activity', () => {
  logger.warn(`Suspicious activity from user ${socket.data.userId}`);
  socket.disconnect(true); // Force disconnect, no reconnection allowed
});
```

---

## Summary

This Socket.IO specification provides a comprehensive real-time messaging system with:

- **Authentication**: JWT-based auth on connection
- **Room Management**: Conversation-based rooms with access control
- **Rich Events**: Messages, typing, reactions, presence, status
- **Reliability**: Reconnection, acknowledgments, REST fallback
- **Security**: Token validation, authorization checks, rate limiting

All events follow consistent patterns with typed payloads, clear direction indicators, and defined handler behaviors.