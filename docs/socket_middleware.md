# Socket.IO Middleware

This document explains the middleware architecture for Socket.IO in our real-time messaging system. Middleware functions allow us to validate, authorize, and control socket connections and events.

## Overview

Socket.IO middleware intercepts connections and events before they reach event handlers. Our middleware stack includes:

1. **Authentication Middleware** - Validates user identity on connection
2. **Conversation Verification Middleware** - Ensures users can only join authorized rooms
3. **Rate Limiting Middleware** - Prevents abuse and spam (future implementation)

---

## 1. Authentication Middleware

### Purpose
Runs on every socket connection attempt to verify the user's identity before allowing the connection to be established.

### Flow
1. Extract JWT token from handshake authentication
2. Verify and decode the token
3. Attach `userId` to `socket.data` for use throughout the socket lifecycle
4. Reject connection if token is invalid or missing

### Implementation Structure

```typescript
// middleware/socketAuth.ts
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
    // Extract token from handshake auth
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as AuthToken;

    // Attach userId to socket data for future use
    socket.data.userId = decoded.userId;
    
    // Allow connection
    next();
  } catch (error) {
    // Reject connection on any error
    next(new Error('Authentication failed'));
  }
};
```

### Usage

```typescript
// server.ts
import { Server } from 'socket.io';
import { authenticateSocket } from './middleware/socketAuth';

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL }
});

// Apply authentication middleware to all connections
io.use(authenticateSocket);

io.on('connection', (socket) => {
  // socket.data.userId is now available
  console.log(`User ${socket.data.userId} connected`);
});
```

### Client-Side Connection

```typescript
// client/socket.ts
import { io } from 'socket.io-client';

const token = localStorage.getItem('authToken');

const socket = io('http://localhost:3000', {
  auth: {
    token // Token is sent in handshake
  }
});

socket.on('connect_error', (error) => {
  console.error('Connection failed:', error.message);
});
```

---

## 2. Conversation Verification Middleware

### Purpose
Validates that users can only join conversation rooms they're authorized to access. Runs on `join-room` events to prevent unauthorized access.

### Flow
1. Extract `conversationId` from event data
2. Query database to check if user is a participant
3. Allow room join if authorized
4. Deny and emit error if unauthorized

### Implementation Structure

```typescript
// middleware/conversationVerification.ts
import { Socket } from 'socket.io';
import { db } from '../db';

interface JoinRoomData {
  conversationId: string;
}

export const verifyConversationAccess = (socket: Socket) => {
  socket.on('join-room', async (data: JoinRoomData, callback) => {
    try {
      const { conversationId } = data;
      const userId = socket.data.userId;

      // Check if user is a participant in this conversation
      const participant = await db.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId,
        },
      });

      if (!participant) {
        // User is not authorized
        socket.emit('error', {
          message: 'You are not a participant in this conversation',
        });
        
        if (callback) callback({ error: 'Unauthorized' });
        return;
      }

      // User is authorized - join the room
      socket.join(conversationId);
      
      socket.emit('room-joined', { conversationId });
      if (callback) callback({ success: true });
      
    } catch (error) {
      console.error('Conversation verification error:', error);
      socket.emit('error', { message: 'Failed to join conversation' });
      if (callback) callback({ error: 'Server error' });
    }
  });
};
```

### Usage

```typescript
// server.ts
import { verifyConversationAccess } from './middleware/conversationVerification';

io.on('connection', (socket) => {
  console.log(`User ${socket.data.userId} connected`);
  
  // Apply conversation verification middleware
  verifyConversationAccess(socket);
  
  // Other event handlers...
});
```

### Alternative: Socket.IO Middleware Approach

For more granular control, you can create a middleware wrapper:

```typescript
// middleware/conversationVerification.ts
export const createConversationMiddleware = () => {
  return async (
    [event, ...args]: [string, any],
    next: (err?: Error) => void,
    socket: Socket
  ) => {
    // Only verify for conversation-related events
    const eventsToVerify = ['join-room', 'send-message', 'typing'];
    
    if (!eventsToVerify.includes(event)) {
      return next();
    }

    const { conversationId } = args[0] || {};
    const userId = socket.data.userId;

    if (!conversationId) {
      return next(new Error('Conversation ID required'));
    }

    try {
      const participant = await db.conversationParticipant.findFirst({
        where: { conversationId, userId },
      });

      if (!participant) {
        return next(new Error('Not a participant'));
      }

      next();
    } catch (error) {
      next(new Error('Verification failed'));
    }
  };
};

// Usage
socket.use(createConversationMiddleware());
```

---

## 3. Rate Limiting Middleware (Future Implementation)

### Purpose
Prevents abuse by limiting the number of events a user can emit within a time window. Protects against spam and DoS attacks.

### Flow
1. Track event counts per user in memory or Redis
2. Check if user has exceeded rate limit
3. Block event if limit exceeded
4. Allow event and increment counter if within limits
5. Reset counter after time window expires

### Implementation Structure

```typescript
// middleware/rateLimiting.ts
import { Socket } from 'socket.io';

interface RateLimitConfig {
  maxEvents: number;
  windowMs: number;
}

interface UserRateLimit {
  count: number;
  resetTime: number;
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, UserRateLimit>();

export const createRateLimiter = (config: RateLimitConfig) => {
  const { maxEvents, windowMs } = config;

  return (socket: Socket) => {
    socket.use(([event, ...args], next) => {
      const userId = socket.data.userId;
      const now = Date.now();
      
      // Get or initialize user's rate limit data
      let userLimit = rateLimitStore.get(userId);
      
      if (!userLimit || now > userLimit.resetTime) {
        // Initialize or reset window
        userLimit = {
          count: 0,
          resetTime: now + windowMs,
        };
        rateLimitStore.set(userId, userLimit);
      }

      // Check rate limit
      if (userLimit.count >= maxEvents) {
        const waitTime = Math.ceil((userLimit.resetTime - now) / 1000);
        socket.emit('rate-limit-exceeded', {
          message: `Too many requests. Try again in ${waitTime} seconds.`,
          retryAfter: waitTime,
        });
        return next(new Error('Rate limit exceeded'));
      }

      // Increment counter and allow event
      userLimit.count++;
      next();
    });
  };
};
```

### Usage

```typescript
// server.ts
import { createRateLimiter } from './middleware/rateLimiting';

io.on('connection', (socket) => {
  console.log(`User ${socket.data.userId} connected`);
  
  // Apply rate limiting: 30 events per minute
  const rateLimiter = createRateLimiter({
    maxEvents: 30,
    windowMs: 60 * 1000, // 1 minute
  });
  
  rateLimiter(socket);
  
  // Other middleware and handlers...
});
```

### Redis-Based Rate Limiting (Production)

For production environments with multiple server instances, use Redis:

```typescript
// middleware/rateLimiting.ts
import { Socket } from 'socket.io';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const createRedisRateLimiter = (config: RateLimitConfig) => {
  const { maxEvents, windowMs } = config;

  return (socket: Socket) => {
    socket.use(async ([event, ...args], next) => {
      const userId = socket.data.userId;
      const key = `rate-limit:${userId}`;
      
      try {
        const current = await redis.incr(key);
        
        if (current === 1) {
          // First request in window, set expiry
          await redis.pexpire(key, windowMs);
        }
        
        if (current > maxEvents) {
          const ttl = await redis.pttl(key);
          socket.emit('rate-limit-exceeded', {
            message: 'Too many requests',
            retryAfter: Math.ceil(ttl / 1000),
          });
          return next(new Error('Rate limit exceeded'));
        }
        
        next();
      } catch (error) {
        console.error('Rate limit error:', error);
        // Fail open in case of Redis issues
        next();
      }
    });
  };
};
```

---

## Middleware Execution Order

Middleware executes in the order it's registered:

```typescript
// server.ts
import { Server } from 'socket.io';
import { authenticateSocket } from './middleware/socketAuth';
import { createRateLimiter } from './middleware/rateLimiting';
import { verifyConversationAccess } from './middleware/conversationVerification';

const io = new Server(server);

// 1. Authentication runs first (connection-level)
io.use(authenticateSocket);

io.on('connection', (socket) => {
  // 2. Rate limiting (per-event)
  const rateLimiter = createRateLimiter({
    maxEvents: 30,
    windowMs: 60000,
  });
  rateLimiter(socket);
  
  // 3. Conversation verification (event-specific)
  verifyConversationAccess(socket);
  
  // 4. Application event handlers
  socket.on('send-message', handleSendMessage);
  socket.on('typing', handleTyping);
});
```

---

## Best Practices

1. **Fail Securely** - Always reject connections/events by default if verification fails
2. **Log Failures** - Track authentication and authorization failures for security monitoring
3. **Use Callbacks** - Provide feedback to clients about why operations failed
4. **Handle Errors Gracefully** - Don't expose internal error details to clients
5. **Keep Middleware Focused** - Each middleware should have a single responsibility
6. **Consider Performance** - Cache authorization checks when appropriate
7. **Use Redis for Scale** - Move from in-memory to Redis when scaling horizontally

---

## Error Handling

### Client-Side Error Handling

```typescript
// client/socket.ts
socket.on('connect_error', (error) => {
  if (error.message === 'Authentication failed') {
    // Redirect to login
    window.location.href = '/login';
  }
});

socket.on('error', (data) => {
  console.error('Socket error:', data.message);
  // Show user-friendly error message
});

socket.on('rate-limit-exceeded', (data) => {
  console.warn(`Rate limited. Retry in ${data.retryAfter}s`);
  // Disable send button temporarily
});
```

---

## Testing Middleware

```typescript
// tests/socketMiddleware.test.ts
import { createServer } from 'http';
import { Server } from 'socket.io';
import Client from 'socket.io-client';
import { authenticateSocket } from '../middleware/socketAuth';

describe('Socket Middleware', () => {
  let io: Server, clientSocket: any;

  beforeEach((done) => {
    const httpServer = createServer();
    io = new Server(httpServer);
    io.use(authenticateSocket);
    
    httpServer.listen(() => {
      const port = httpServer.address().port;
      done();
    });
  });

  afterEach(() => {
    io.close();
    clientSocket?.close();
  });

  it('should reject connection without token', (done) => {
    clientSocket = Client(`http://localhost:${port}`);
    
    clientSocket.on('connect_error', (error) => {
      expect(error.message).toBe('Authentication token required');
      done();
    });
  });

  it('should accept connection with valid token', (done) => {
    const validToken = generateTestToken();
    clientSocket = Client(`http://localhost:${port}`, {
      auth: { token: validToken }
    });
    
    clientSocket.on('connect', () => {
      expect(clientSocket.connected).toBe(true);
      done();
    });
  });
});
```

---

## Summary

Our Socket.IO middleware architecture provides:
- **Security** through authentication and authorization
- **Reliability** through rate limiting and error handling
- **Scalability** through Redis-based solutions
- **Maintainability** through separation of concerns

Each middleware layer adds a specific protection or verification step, ensuring that only authorized users can perform authorized actions within our real-time messaging system.