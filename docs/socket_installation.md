# Socket.IO Installation Guide

This guide provides a step-by-step plan for integrating Socket.IO into your real-time chat application backend.

---

## Step 1: Install Dependencies

### Install Required Packages

```bash
# Server-side Socket.IO
npm install socket.io

# Type definitions for TypeScript
npm install -D @types/socket.io

# Client-side (for future frontend integration)
npm install socket.io-client
```

### Verify Installation

Check your `package.json` to confirm versions:

```json
{
  "dependencies": {
    "socket.io": "^4.7.2",
    "socket.io-client": "^4.7.2"
  },
  "devDependencies": {
    "@types/socket.io": "^3.0.0"
  }
}
```

---

## Step 2: Update Server Entry Point

### Convert Express App to HTTP Server

**Before: `src/server.ts`**
```typescript
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**After: `src/server.ts`**
```typescript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { SocketService } from './services/SocketService';

const app = express();
const httpServer = createServer(app);

// Socket.IO Configuration
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Connection settings
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Express middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);

// Initialize Socket Service
const socketService = new SocketService(io);
socketService.initialize();

// Make io available to REST routes (for emitting from REST endpoints)
app.set('io', io);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO server initialized`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
  });
});
```

### Environment Variables

Update `.env`:
```env
# Server
PORT=3000
CLIENT_URL=http://localhost:5173

# JWT
JWT_SECRET=your-secret-key-here

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/chatdb
```

---

## Step 3: Create Socket Service

### Create SocketService Class

**`src/services/SocketService.ts`**
```typescript
import { Server, Socket } from 'socket.io';
import { authenticateSocket } from '../middleware/socketAuth';
import { MessageHandler } from '../handlers/MessageHandler';
import { TypingHandler } from '../handlers/TypingHandler';
import { ReactionHandler } from '../handlers/ReactionHandler';
import { StatusHandler } from '../handlers/StatusHandler';

export class SocketService {
  private io: Server;
  private messageHandler: MessageHandler;
  private typingHandler: TypingHandler;
  private reactionHandler: ReactionHandler;
  private statusHandler: StatusHandler;

  constructor(io: Server) {
    this.io = io;
    this.messageHandler = new MessageHandler(io);
    this.typingHandler = new TypingHandler(io);
    this.reactionHandler = new ReactionHandler(io);
    this.statusHandler = new StatusHandler(io);
  }

  public initialize(): void {
    // Apply authentication middleware to all connections
    this.io.use(authenticateSocket);

    // Handle new connections
    this.io.on('connection', (socket: Socket) => {
      console.log(`User connected: ${socket.data.userId} (${socket.id})`);

      // Register event handlers
      this.registerHandlers(socket);

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`User disconnected: ${socket.data.userId} (${reason})`);
        this.handleDisconnect(socket);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`Socket error for user ${socket.data.userId}:`, error);
      });
    });

    console.log('Socket.IO service initialized');
  }

  private registerHandlers(socket: Socket): void {
    // Join conversation rooms
    socket.on('join-room', (data) => 
      this.messageHandler.handleJoinRoom(socket, data)
    );

    socket.on('leave-room', (data) => 
      this.messageHandler.handleLeaveRoom(socket, data)
    );

    // Message handlers
    socket.on('send-message', (data) => 
      this.messageHandler.handleSendMessage(socket, data)
    );

    socket.on('delivered-ack', (data) => 
      this.statusHandler.handleDeliveredAck(socket, data)
    );

    socket.on('read', (data) => 
      this.statusHandler.handleRead(socket, data)
    );

    // Typing indicators
    socket.on('typing', (data) => 
      this.typingHandler.handleTyping(socket, data)
    );

    // Reactions
    socket.on('react', (data) => 
      this.reactionHandler.handleReaction(socket, data)
    );

    // Test/Debug handler
    socket.on('echo', (data) => {
      socket.emit('echo-response', data);
    });
  }

  private handleDisconnect(socket: Socket): void {
    // Clean up user presence, typing indicators, etc.
    const userId = socket.data.userId;
    
    // You can emit user offline status here
    this.io.emit('user:status', {
      userId,
      status: 'offline',
      lastSeen: new Date(),
    });
  }

  // Public method to get io instance (for use in REST controllers)
  public getIO(): Server {
    return this.io;
  }
}
```

### Create Authentication Middleware

**`src/middleware/socketAuth.ts`**
```typescript
import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

interface AuthToken {
  userId: string;
  iat: number;
  exp: number;
}

export const authenticateSocket = async (
  socket: Socket,
  next: (err?: Error) => void
) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as AuthToken;

    // Attach userId to socket data
    socket.data.userId = decoded.userId;

    // Allow connection
    next();
  } catch (error) {
    console.error('Socket authentication failed:', error);
    next(new Error('Authentication failed'));
  }
};
```

---

## Step 4: Register Event Handlers

### Create Message Handler

**`src/handlers/MessageHandler.ts`**
```typescript
import { Server, Socket } from 'socket.io';
import { db } from '../db';

interface JoinRoomData {
  conversationId: string;
}

interface SendMessageData {
  temp_id: string;
  conversationId: string;
  content: string;
}

export class MessageHandler {
  constructor(private io: Server) {}

  async handleJoinRoom(socket: Socket, data: JoinRoomData) {
    try {
      const { conversationId } = data;
      const userId = socket.data.userId;

      // Verify user is a participant
      const participant = await db.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId,
        },
      });

      if (!participant) {
        socket.emit('error', {
          message: 'You are not a participant in this conversation',
        });
        return;
      }

      // Join the room
      socket.join(conversationId);
      socket.emit('room-joined', { conversationId });

      console.log(`User ${userId} joined room ${conversationId}`);
    } catch (error) {
      console.error('Join room error:', error);
      socket.emit('error', { message: 'Failed to join conversation' });
    }
  }

  async handleLeaveRoom(socket: Socket, data: JoinRoomData) {
    const { conversationId } = data;
    socket.leave(conversationId);
    socket.emit('room-left', { conversationId });
  }

  async handleSendMessage(socket: Socket, data: SendMessageData) {
    try {
      const { temp_id, conversationId, content } = data;
      const userId = socket.data.userId;

      // Verify user is participant
      const participant = await db.conversationParticipant.findFirst({
        where: { conversationId, userId },
      });

      if (!participant) {
        socket.emit('error', {
          temp_id,
          error: 'Unauthorized',
          message: 'You are not a participant in this conversation',
        });
        return;
      }

      // Save message to database
      const message = await db.message.create({
        data: {
          content,
          conversationId,
          senderId: userId,
          status: 'sent',
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      });

      // Emit to all users in the room (including sender)
      this.io.to(conversationId).emit('message:new', {
        id: message.id,
        temp_id, // Include temp_id for sender to replace optimistic message
        content: message.content,
        senderId: message.senderId,
        sender: message.sender,
        conversationId: message.conversationId,
        status: 'sent',
        sentAt: message.createdAt,
        createdAt: message.createdAt,
      });

      console.log(`Message sent: ${message.id} in ${conversationId}`);
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', {
        temp_id: data.temp_id,
        error: 'Failed to send',
        message: 'Failed to send message',
      });
    }
  }
}
```

### Create Typing Handler

**`src/handlers/TypingHandler.ts`**
```typescript
import { Server, Socket } from 'socket.io';

interface TypingData {
  conversationId: string;
  isTyping: boolean;
}

export class TypingHandler {
  constructor(private io: Server) {}

  async handleTyping(socket: Socket, data: TypingData) {
    try {
      const { conversationId, isTyping } = data;
      const userId = socket.data.userId;

      // Get user info for display
      // In production, cache this or include in socket.data
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true },
      });

      if (!user) return;

      // Broadcast to room (excluding sender)
      socket.to(conversationId).emit('typing:update', {
        userId: user.id,
        userName: user.username,
        isTyping,
        conversationId,
      });
    } catch (error) {
      console.error('Typing handler error:', error);
    }
  }
}
```

### Create Reaction Handler

**`src/handlers/ReactionHandler.ts`**
```typescript
import { Server, Socket } from 'socket.io';
import { db } from '../db';

interface ReactionData {
  messageId: string;
  emoji: string;
}

export class ReactionHandler {
  constructor(private io: Server) {}

  async handleReaction(socket: Socket, data: ReactionData) {
    try {
      const { messageId, emoji } = data;
      const userId = socket.data.userId;

      // Check if user already reacted with this emoji
      const existingReaction = await db.messageReaction.findFirst({
        where: {
          messageId,
          userId,
          emoji,
        },
      });

      if (existingReaction) {
        // Remove reaction (toggle off)
        await db.messageReaction.delete({
          where: { id: existingReaction.id },
        });
      } else {
        // Add new reaction
        await db.messageReaction.create({
          data: {
            messageId,
            userId,
            emoji,
          },
        });
      }

      // Fetch all reactions for this message
      const reactions = await db.messageReaction.findMany({
        where: { messageId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      // Aggregate reactions by emoji
      const aggregated = reactions.reduce((acc, reaction) => {
        if (!acc[reaction.emoji]) {
          acc[reaction.emoji] = {
            count: 0,
            users: [],
            userNames: [],
          };
        }
        acc[reaction.emoji].count++;
        acc[reaction.emoji].users.push(reaction.userId);
        acc[reaction.emoji].userNames.push(reaction.user.username);
        return acc;
      }, {} as Record<string, { count: number; users: string[]; userNames: string[] }>);

      // Get conversation ID for the message
      const message = await db.message.findUnique({
        where: { id: messageId },
        select: { conversationId: true },
      });

      if (!message) return;

      // Emit to all users in the conversation
      this.io.to(message.conversationId).emit('reaction:update', {
        messageId,
        reactions: aggregated,
      });
    } catch (error) {
      console.error('Reaction handler error:', error);
      socket.emit('error', { message: 'Failed to react to message' });
    }
  }
}
```

### Create Status Handler

**`src/handlers/StatusHandler.ts`**
```typescript
import { Server, Socket } from 'socket.io';
import { db } from '../db';

interface DeliveredAckData {
  messageId: string;
}

interface ReadData {
  messageIds: string[];
}

export class StatusHandler {
  constructor(private io: Server) {}

  async handleDeliveredAck(socket: Socket, data: DeliveredAckData) {
    try {
      const { messageId } = data;

      // Update message status
      const message = await db.message.update({
        where: { id: messageId },
        data: {
          status: 'delivered',
          deliveredAt: new Date(),
        },
        select: {
          id: true,
          conversationId: true,
          deliveredAt: true,
        },
      });

      // Emit status update to conversation
      this.io.to(message.conversationId).emit('message:status', {
        messageId: message.id,
        status: 'delivered',
        deliveredAt: message.deliveredAt,
      });
    } catch (error) {
      console.error('Delivered ack error:', error);
    }
  }

  async handleRead(socket: Socket, data: ReadData) {
    try {
      const { messageIds } = data;

      // Batch update messages
      await db.message.updateMany({
        where: {
          id: { in: messageIds },
        },
        data: {
          status: 'read',
          readAt: new Date(),
        },
      });

      // Get conversation ID from first message
      const message = await db.message.findUnique({
        where: { id: messageIds[0] },
        select: { conversationId: true },
      });

      if (!message) return;

      // Emit status updates for each message
      for (const messageId of messageIds) {
        this.io.to(message.conversationId).emit('message:status', {
          messageId,
          status: 'read',
          readAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Read handler error:', error);
    }
  }
}
```

---

## Step 5: Test Socket Connection

### Create Test Client

**`test/socket-test.html`**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Socket.IO Test Client</title>
  <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
    }
    .status {
      padding: 10px;
      margin: 10px 0;
      border-radius: 5px;
    }
    .connected {
      background-color: #d4edda;
      color: #155724;
    }
    .disconnected {
      background-color: #f8d7da;
      color: #721c24;
    }
    input, button {
      padding: 10px;
      margin: 5px;
      font-size: 16px;
    }
    #messages {
      border: 1px solid #ddd;
      padding: 10px;
      min-height: 200px;
      margin-top: 20px;
      background-color: #f9f9f9;
    }
    .message {
      padding: 5px;
      margin: 5px 0;
      background-color: white;
      border-left: 3px solid #007bff;
      padding-left: 10px;
    }
  </style>
</head>
<body>
  <h1>Socket.IO Test Client</h1>
  
  <div>
    <label>JWT Token:</label>
    <input type="text" id="token" placeholder="Enter your JWT token" style="width: 400px;">
    <button onclick="connect()">Connect</button>
    <button onclick="disconnect()">Disconnect</button>
  </div>

  <div id="status" class="status disconnected">
    Status: Disconnected
  </div>

  <div>
    <h3>Test Echo Event</h3>
    <input type="text" id="echoMessage" placeholder="Enter message">
    <button onclick="sendEcho()">Send Echo</button>
  </div>

  <div>
    <h3>Test Join Room</h3>
    <input type="text" id="conversationId" placeholder="Conversation ID">
    <button onclick="joinRoom()">Join Room</button>
  </div>

  <div>
    <h3>Test Send Message</h3>
    <input type="text" id="messageContent" placeholder="Message content">
    <button onclick="sendMessage()">Send Message</button>
  </div>

  <div id="messages">
    <strong>Messages:</strong>
  </div>

  <script>
    let socket = null;
    let currentConversationId = null;

    function connect() {
      const token = document.getElementById('token').value;
      
      if (!token) {
        alert('Please enter a JWT token');
        return;
      }

      socket = io('http://localhost:3000', {
        auth: {
          token: token
        }
      });

      socket.on('connect', () => {
        updateStatus('Connected', true);
        addMessage('System', 'Connected to server');
      });

      socket.on('disconnect', (reason) => {
        updateStatus('Disconnected: ' + reason, false);
        addMessage('System', 'Disconnected: ' + reason);
      });

      socket.on('connect_error', (error) => {
        updateStatus('Connection Error: ' + error.message, false);
        addMessage('Error', error.message);
      });

      socket.on('echo-response', (data) => {
        addMessage('Echo Response', JSON.stringify(data));
      });

      socket.on('room-joined', (data) => {
        currentConversationId = data.conversationId;
        addMessage('Room', 'Joined room: ' + data.conversationId);
      });

      socket.on('message:new', (data) => {
        addMessage('New Message', JSON.stringify(data, null, 2));
      });

      socket.on('message:status', (data) => {
        addMessage('Status Update', JSON.stringify(data, null, 2));
      });

      socket.on('typing:update', (data) => {
        addMessage('Typing', `${data.userName} is ${data.isTyping ? 'typing' : 'not typing'}`);
      });

      socket.on('reaction:update', (data) => {
        addMessage('Reaction', JSON.stringify(data, null, 2));
      });

      socket.on('error', (data) => {
        addMessage('Error', JSON.stringify(data, null, 2));
      });
    }

    function disconnect() {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    }

    function sendEcho() {
      if (!socket) {
        alert('Not connected');
        return;
      }

      const message = document.getElementById('echoMessage').value;
      socket.emit('echo', { message, timestamp: new Date().toISOString() });
    }

    function joinRoom() {
      if (!socket) {
        alert('Not connected');
        return;
      }

      const conversationId = document.getElementById('conversationId').value;
      if (!conversationId) {
        alert('Enter conversation ID');
        return;
      }

      socket.emit('join-room', { conversationId });
    }

    function sendMessage() {
      if (!socket) {
        alert('Not connected');
        return;
      }

      if (!currentConversationId) {
        alert('Join a room first');
        return;
      }

      const content = document.getElementById('messageContent').value;
      if (!content) {
        alert('Enter message content');
        return;
      }

      const temp_id = 'temp_' + Date.now();
      socket.emit('send-message', {
        temp_id,
        conversationId: currentConversationId,
        content
      });

      addMessage('Sent', `temp_id: ${temp_id}, content: ${content}`);
    }

    function updateStatus(text, isConnected) {
      const statusDiv = document.getElementById('status');
      statusDiv.textContent = 'Status: ' + text;
      statusDiv.className = 'status ' + (isConnected ? 'connected' : 'disconnected');
    }

    function addMessage(type, content) {
      const messagesDiv = document.getElementById('messages');
      const messageDiv = document.createElement('div');
      messageDiv.className = 'message';
      messageDiv.innerHTML = `<strong>${type}:</strong> ${content}`;
      messagesDiv.appendChild(messageDiv);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  </script>
</body>
</html>
```

### Testing Steps

1. **Start your server:**
   ```bash
   npm run dev
   ```

2. **Get a JWT token:**
   - Login via your REST API to get a token
   - Or generate one manually for testing

3. **Open test client:**
   - Open `test/socket-test.html` in a browser
   - Paste your JWT token
   - Click "Connect"

4. **Test scenarios:**
   - ✅ Connection with valid token
   - ✅ Connection rejection with invalid token
   - ✅ Echo event
   - ✅ Join room
   - ✅ Send message
   - ✅ View received messages

---

## Step 6: Integration Points

### When to Emit from REST Endpoints

Some events should trigger Socket.IO emissions from REST API endpoints:

**Example: User joins conversation via REST API**

**`src/controllers/conversationController.ts`**
```typescript
import { Request, Response } from 'express';
import { Server } from 'socket.io';

export const addUserToConversation = async (req: Request, res: Response) => {
  try {
    const { conversationId, userId } = req.body;

    // Add user to conversation in database
    const participant = await db.conversationParticipant.create({
      data: {
        conversationId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    // Get Socket.IO instance
    const io: Server = req.app.get('io');

    // Emit to conversation room
    io.to(conversationId).emit('conversation:participant-added', {
      conversationId,
      participant: participant.user,
    });

    res.json({ success: true, participant });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add participant' });
  }
};
```

### REST + Socket.IO Integration Patterns

| Action | REST API | Socket.IO | Why? |
|--------|----------|-----------|------|
| **Create conversation** | ✅ POST /conversations | ✅ Emit to participants | Need persistence + real-time notification |
| **Send message** | ❌ No REST needed | ✅ Socket only | Real-time by nature, socket handles DB |
| **Edit message** | ✅ PUT /messages/:id | ✅ Emit update | Need auth check + broadcast change |
| **Delete message** | ✅ DELETE /messages/:id | ✅ Emit deletion | Need auth check + broadcast change |
| **Add reaction** | ❌ No REST needed | ✅ Socket only | Real-time, temporary, socket handles DB |
| **Typing indicator** | ❌ No REST needed | ✅ Socket only | Ephemeral, no persistence needed |
| **Mark as read** | ❌ No REST needed | ✅ Socket only | Real-time status update |
| **Get message history** | ✅ GET /messages | ❌ No socket | Pagination, not real-time |
| **Upload file** | ✅ POST /upload | ✅ Emit when done | Need file processing + notification |

### Socket-Only Flow Example

```typescript
// Message sending is socket-only
// Client doesn't call REST API at all

// 1. Client emits
socket.emit('send-message', {
  temp_id: 'temp_123',
  conversationId: 'conv_456',
  content: 'Hello!'
});

// 2. Server handles (saves to DB + broadcasts)
// No REST endpoint needed

// 3. All clients receive via socket
socket.on('message:new', (message) => {
  // Display message
});
```

### REST-First Flow Example

```typescript
// Message editing uses REST + Socket

// 1. Client calls REST API
const response = await fetch('/api/messages/msg_123', {
  method: 'PUT',
  body: JSON.stringify({ content: 'Updated content' })
});

// 2. Server REST controller updates DB AND emits
app.put('/api/messages/:id', async (req, res) => {
  const message = await db.message.update({
    where: { id: req.params.id },
    data: { content: req.body.content }
  });

  // Emit via socket
  const io: Server = req.app.get('io');
  io.to(message.conversationId).emit('message:updated', message);

  res.json(message);
});

// 3. All clients receive via socket
socket.on('message:updated', (message) => {
  // Update message in UI
});
```

---

## Troubleshooting

### Common Issues

**1. CORS Errors**
```typescript
// Make sure CORS origins match between Express and Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});
```

**2. Authentication Fails**
- Check token is being sent in `auth` object
- Verify JWT_SECRET is correct
- Check token hasn't expired

**3. Events Not Received**
- Verify user has joined the room
- Check event names match exactly (case-sensitive)
- Use `socket.to(room)` vs `socket.emit()` correctly

**4. Multiple Connections**
- Client may reconnect automatically
- Implement proper disconnect cleanup
- Use `socket.data.userId` to track unique users

### Debug Logging

Add debug logging:

```typescript
// Enable Socket.IO debug logs
import debug from 'debug';
debug.enable('socket.io:*');

// Or in package.json
"scripts": {
  "dev": "DEBUG=socket.io:* nodemon src/server.ts"
}
```

---

## Next Steps

1. ✅ Complete basic Socket.IO setup
2. ✅ Test authentication and basic events
3. 🔄 Implement rate limiting middleware
4. 🔄 Add presence tracking (online/offline status)
5. 🔄 Implement file upload with progress
6. 🔄 Add Redis adapter for horizontal scaling
7. 🔄 Create comprehensive error handling
8. 🔄 Write unit and integration tests

---

## Summary

You now have:
- ✅ Socket.IO installed and configured
- ✅ HTTP server setup with Socket.IO
- ✅ Authentication middleware
- ✅ Event handlers for messages, typing, reactions, and status
- ✅ Test client for verification
- ✅ Clear patterns for REST + Socket.IO integration

Your real-time chat backend is ready for production!