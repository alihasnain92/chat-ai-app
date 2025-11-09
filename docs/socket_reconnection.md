# Socket.IO Reconnection Implementation Guide

This guide covers how to handle network interruptions, disconnections, and reconnections gracefully in your real-time chat application.

---

## 1. Socket.IO Auto-Reconnection

### Built-in Reconnection Strategy

Socket.IO automatically attempts to reconnect when a connection is lost. It uses exponential backoff to avoid overwhelming the server.

### Default Behavior

```typescript
// Default Socket.IO reconnection settings
const socket = io('http://localhost:3000', {
  reconnection: true,              // Enable auto-reconnection (default: true)
  reconnectionAttempts: Infinity,  // Number of attempts before giving up (default: Infinity)
  reconnectionDelay: 1000,         // Initial delay between attempts (default: 1000ms)
  reconnectionDelayMax: 5000,      // Maximum delay between attempts (default: 5000ms)
  randomizationFactor: 0.5,        // Randomization factor (default: 0.5)
  timeout: 20000,                  // Connection timeout (default: 20000ms)
});
```

### Reconnection Timing Example

```
Attempt 1: Delay = 1000ms (1s)
Attempt 2: Delay = 2000ms (2s)
Attempt 3: Delay = 4000ms (4s)
Attempt 4: Delay = 5000ms (5s) - hits max
Attempt 5: Delay = 5000ms (5s) - stays at max
...
```

### Recommended Production Configuration

**`src/config/socket.config.ts`**
```typescript
export const SOCKET_CONFIG = {
  // Connection settings
  reconnection: true,
  reconnectionAttempts: 10,        // Limit attempts to prevent infinite retries
  reconnectionDelay: 1000,         // Start with 1s
  reconnectionDelayMax: 10000,     // Max 10s between retries
  randomizationFactor: 0.5,        // Add jitter to prevent thundering herd
  timeout: 20000,                  // 20s connection timeout
  
  // Transport settings
  transports: ['websocket', 'polling'], // Prefer WebSocket, fallback to polling
  
  // Upgrade settings
  upgrade: true,
  rememberUpgrade: true,
  
  // Ping settings
  pingTimeout: 60000,              // 60s - server waits for ping response
  pingInterval: 25000,             // 25s - server sends ping every 25s
};
```

### Usage

```typescript
import { io } from 'socket.io-client';
import { SOCKET_CONFIG } from './config/socket.config';

const socket = io('http://localhost:3000', {
  ...SOCKET_CONFIG,
  auth: {
    token: getAuthToken(),
  },
});
```

---

## 2. Client-Side Reconnection Handling

### Complete Reconnection Manager

**`src/lib/SocketReconnectionManager.ts`**
```typescript
import { Socket } from 'socket.io-client';

interface ReconnectionState {
  isReconnecting: boolean;
  attemptCount: number;
  lastDisconnectTime: Date | null;
  activeRooms: Set<string>;
  pendingMessages: Array<{
    temp_id: string;
    conversationId: string;
    content: string;
    timestamp: Date;
  }>;
}

export class SocketReconnectionManager {
  private socket: Socket;
  private state: ReconnectionState;
  private onStatusChange?: (status: string) => void;

  constructor(socket: Socket, onStatusChange?: (status: string) => void) {
    this.socket = socket;
    this.onStatusChange = onStatusChange;
    
    this.state = {
      isReconnecting: false,
      attemptCount: 0,
      lastDisconnectTime: null,
      activeRooms: new Set(),
      pendingMessages: [],
    };

    this.setupListeners();
  }

  private setupListeners(): void {
    // Initial connection
    this.socket.on('connect', () => {
      this.handleConnect();
    });

    // Connection lost
    this.socket.on('disconnect', (reason) => {
      this.handleDisconnect(reason);
    });

    // Reconnection attempt
    this.socket.io.on('reconnect_attempt', (attempt) => {
      this.handleReconnectAttempt(attempt);
    });

    // Reconnection failed
    this.socket.io.on('reconnect_error', (error) => {
      this.handleReconnectError(error);
    });

    // Reconnection failed permanently
    this.socket.io.on('reconnect_failed', () => {
      this.handleReconnectFailed();
    });

    // Successfully reconnected
    this.socket.io.on('reconnect', (attempt) => {
      this.handleReconnect(attempt);
    });

    // Connection error
    this.socket.on('connect_error', (error) => {
      this.handleConnectError(error);
    });
  }

  private handleConnect(): void {
    console.log('Socket connected:', this.socket.id);
    
    if (this.state.isReconnecting) {
      // This is a reconnection, not initial connection
      this.performReconnectionTasks();
    }
    
    this.updateStatus('connected');
    this.state.isReconnecting = false;
    this.state.attemptCount = 0;
  }

  private handleDisconnect(reason: string): void {
    console.log('Socket disconnected:', reason);
    
    this.state.lastDisconnectTime = new Date();
    this.updateStatus('disconnected');

    // Check if reconnection will happen automatically
    if (reason === 'io server disconnect') {
      // Server initiated disconnect - manual reconnection needed
      console.warn('Server disconnected socket - auth may have failed');
      this.updateStatus('disconnected-auth-failed');
      // Don't auto-reconnect if server explicitly disconnected us
      return;
    }

    if (reason === 'io client disconnect') {
      // Client initiated disconnect - don't reconnect
      console.log('Client manually disconnected');
      return;
    }

    // For all other reasons, Socket.IO will auto-reconnect
    this.state.isReconnecting = true;
    this.updateStatus('reconnecting');
  }

  private handleReconnectAttempt(attempt: number): void {
    this.state.attemptCount = attempt;
    console.log(`Reconnection attempt ${attempt}`);
    this.updateStatus(`reconnecting-attempt-${attempt}`);
  }

  private handleReconnectError(error: Error): void {
    console.error('Reconnection error:', error.message);
  }

  private handleReconnectFailed(): void {
    console.error('Reconnection failed after all attempts');
    this.state.isReconnecting = false;
    this.updateStatus('reconnect-failed');
    
    // Notify user to refresh or check connection
    this.showReconnectFailedUI();
  }

  private handleReconnect(attempt: number): void {
    console.log(`Successfully reconnected after ${attempt} attempts`);
    this.state.attemptCount = 0;
    // Note: 'connect' event will fire next and handle the rest
  }

  private handleConnectError(error: Error): void {
    console.error('Connection error:', error.message);
    
    if (error.message === 'Authentication failed') {
      this.updateStatus('auth-failed');
      // Token may have expired - refresh and retry
      this.handleAuthenticationFailure();
    }
  }

  private async performReconnectionTasks(): Promise<void> {
    console.log('Performing reconnection tasks...');

    try {
      // 1. Re-authenticate (token might have been refreshed)
      await this.reauthenticate();

      // 2. Re-join all active rooms
      await this.rejoinRooms();

      // 3. Sync missed messages
      await this.syncMissedMessages();

      // 4. Resend pending messages
      await this.resendPendingMessages();

      // 5. Update local state
      await this.syncApplicationState();

      console.log('Reconnection tasks completed successfully');
      this.updateStatus('reconnected');
    } catch (error) {
      console.error('Error during reconnection tasks:', error);
      this.updateStatus('reconnection-error');
    }
  }

  private async reauthenticate(): Promise<void> {
    // Check if token needs refresh
    const token = localStorage.getItem('authToken');
    const tokenExpiry = localStorage.getItem('tokenExpiry');

    if (tokenExpiry && new Date(tokenExpiry) < new Date()) {
      console.log('Token expired, refreshing...');
      
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });

        if (response.ok) {
          const { token: newToken } = await response.json();
          localStorage.setItem('authToken', newToken);
          
          // Update socket auth
          this.socket.auth = { token: newToken };
        } else {
          throw new Error('Token refresh failed');
        }
      } catch (error) {
        console.error('Failed to refresh token:', error);
        throw error;
      }
    }
  }

  private async rejoinRooms(): Promise<void> {
    console.log('Re-joining rooms:', Array.from(this.state.activeRooms));

    const joinPromises = Array.from(this.state.activeRooms).map(
      (conversationId) =>
        new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Timeout joining room ${conversationId}`));
          }, 5000);

          this.socket.emit('join-room', { conversationId }, (response: any) => {
            clearTimeout(timeout);
            
            if (response?.error) {
              console.error(`Failed to rejoin room ${conversationId}:`, response.error);
              // Remove from active rooms if we can't rejoin
              this.state.activeRooms.delete(conversationId);
              reject(new Error(response.error));
            } else {
              console.log(`Rejoined room: ${conversationId}`);
              resolve();
            }
          });
        })
    );

    try {
      await Promise.allSettled(joinPromises);
    } catch (error) {
      console.error('Error rejoining some rooms:', error);
    }
  }

  private async syncMissedMessages(): Promise<void> {
    if (!this.state.lastDisconnectTime) return;

    console.log('Syncing missed messages since:', this.state.lastDisconnectTime);

    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      // For each active conversation, fetch messages since disconnect
      const syncPromises = Array.from(this.state.activeRooms).map(
        async (conversationId) => {
          const response = await fetch(
            `/api/messages?conversationId=${conversationId}&since=${this.state.lastDisconnectTime?.toISOString()}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            const { messages } = await response.json();
            console.log(`Synced ${messages.length} missed messages for ${conversationId}`);
            
            // Emit to local app state (not via socket)
            window.dispatchEvent(
              new CustomEvent('messages-synced', {
                detail: { conversationId, messages },
              })
            );
          }
        }
      );

      await Promise.allSettled(syncPromises);
    } catch (error) {
      console.error('Error syncing missed messages:', error);
    }
  }

  private async resendPendingMessages(): Promise<void> {
    if (this.state.pendingMessages.length === 0) return;

    console.log(`Resending ${this.state.pendingMessages.length} pending messages`);

    for (const message of this.state.pendingMessages) {
      try {
        // Create new temp_id to avoid duplicates
        const newTempId = `temp_${Date.now()}_${Math.random()}`;
        
        this.socket.emit('send-message', {
          ...message,
          temp_id: newTempId,
        });

        // Remove from pending after successful send
        this.state.pendingMessages = this.state.pendingMessages.filter(
          (m) => m.temp_id !== message.temp_id
        );
      } catch (error) {
        console.error('Failed to resend message:', error);
      }
    }
  }

  private async syncApplicationState(): Promise<void> {
    // Sync any other application state that may have changed
    // during disconnect (e.g., conversation list, user status, etc.)
    
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      // Example: Refresh conversation list
      const response = await fetch('/api/conversations', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const { conversations } = await response.json();
        
        window.dispatchEvent(
          new CustomEvent('conversations-synced', {
            detail: { conversations },
          })
        );
      }
    } catch (error) {
      console.error('Error syncing application state:', error);
    }
  }

  private async handleAuthenticationFailure(): Promise<void> {
    console.log('Handling authentication failure...');

    try {
      // Try to refresh token
      await this.reauthenticate();
      
      // Manually reconnect with new token
      this.socket.disconnect();
      this.socket.connect();
    } catch (error) {
      console.error('Failed to reauthenticate:', error);
      
      // Redirect to login
      window.location.href = '/login?reason=session-expired';
    }
  }

  private showReconnectFailedUI(): void {
    // Show UI to user
    window.dispatchEvent(
      new CustomEvent('socket-reconnect-failed', {
        detail: {
          message: 'Unable to connect to server. Please check your connection and try again.',
        },
      })
    );
  }

  private updateStatus(status: string): void {
    console.log('Socket status:', status);
    this.onStatusChange?.(status);
    
    // Dispatch event for UI components
    window.dispatchEvent(
      new CustomEvent('socket-status-change', {
        detail: { status },
      })
    );
  }

  // Public methods for app to call

  public joinRoom(conversationId: string): void {
    this.state.activeRooms.add(conversationId);
    this.socket.emit('join-room', { conversationId });
  }

  public leaveRoom(conversationId: string): void {
    this.state.activeRooms.delete(conversationId);
    this.socket.emit('leave-room', { conversationId });
  }

  public addPendingMessage(message: {
    temp_id: string;
    conversationId: string;
    content: string;
    timestamp: Date;
  }): void {
    this.state.pendingMessages.push(message);
  }

  public removePendingMessage(temp_id: string): void {
    this.state.pendingMessages = this.state.pendingMessages.filter(
      (m) => m.temp_id !== temp_id
    );
  }

  public getState(): Readonly<ReconnectionState> {
    return { ...this.state };
  }

  public manualReconnect(): void {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  public disconnect(): void {
    this.state.activeRooms.clear();
    this.state.pendingMessages = [];
    this.socket.disconnect();
  }
}
```

### Usage in Client Application

```typescript
// Initialize socket with reconnection manager
import { io } from 'socket.io-client';
import { SocketReconnectionManager } from './lib/SocketReconnectionManager';
import { SOCKET_CONFIG } from './config/socket.config';

const token = localStorage.getItem('authToken');

const socket = io('http://localhost:3000', {
  ...SOCKET_CONFIG,
  auth: { token },
});

// Initialize reconnection manager
const reconnectionManager = new SocketReconnectionManager(
  socket,
  (status) => {
    // Update UI based on status
    updateConnectionIndicator(status);
  }
);

// Listen for sync events
window.addEventListener('messages-synced', (event: any) => {
  const { conversationId, messages } = event.detail;
  // Update UI with synced messages
  updateMessagesInUI(conversationId, messages);
});

window.addEventListener('socket-reconnect-failed', (event: any) => {
  // Show error to user
  showError(event.detail.message);
});

// When joining a conversation
reconnectionManager.joinRoom('conv_123');

// When sending a message during potential disconnect
const tempMessage = {
  temp_id: `temp_${Date.now()}`,
  conversationId: 'conv_123',
  content: 'Hello!',
  timestamp: new Date(),
};

// Add to pending queue
reconnectionManager.addPendingMessage(tempMessage);

// Try to send
socket.emit('send-message', tempMessage);

// Remove from pending when confirmed
socket.on('message:new', (message) => {
  if (message.temp_id) {
    reconnectionManager.removePendingMessage(message.temp_id);
  }
});
```

---

## 3. Server-Side Reconnection Handling

### Clean Up Old Socket Data

**`src/services/SocketService.ts`** (Updated)
```typescript
export class SocketService {
  private io: Server;
  private userSockets: Map<string, Set<string>>; // userId -> Set of socket IDs

  constructor(io: Server) {
    this.io = io;
    this.userSockets = new Map();
  }

  public initialize(): void {
    this.io.use(authenticateSocket);

    this.io.on('connection', (socket: Socket) => {
      const userId = socket.data.userId;
      console.log(`User connected: ${userId} (${socket.id})`);

      // Track user's sockets
      this.trackUserSocket(userId, socket.id);

      // Handle duplicate connections
      this.handleDuplicateConnections(userId, socket);

      // Update presence
      this.updateUserPresence(userId, 'online');

      // Register handlers
      this.registerHandlers(socket);

      socket.on('disconnect', (reason) => {
        console.log(`User disconnected: ${userId} (${reason})`);
        this.handleDisconnect(userId, socket.id, reason);
      });
    });
  }

  private trackUserSocket(userId: string, socketId: string): void {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
  }

  private handleDuplicateConnections(userId: string, newSocket: Socket): void {
    const userSocketIds = this.userSockets.get(userId);
    
    if (userSocketIds && userSocketIds.size > 1) {
      console.log(`User ${userId} has ${userSocketIds.size} connections`);
      
      // Optional: Disconnect old sockets
      // This prevents users from having multiple active connections
      const socketsToDisconnect = Array.from(userSocketIds).filter(
        (id) => id !== newSocket.id
      );

      socketsToDisconnect.forEach((socketId) => {
        const oldSocket = this.io.sockets.sockets.get(socketId);
        if (oldSocket) {
          console.log(`Disconnecting old socket for user ${userId}: ${socketId}`);
          oldSocket.emit('duplicate-connection', {
            message: 'New connection established from another device',
          });
          oldSocket.disconnect(true);
        }
      });
    }
  }

  private handleDisconnect(userId: string, socketId: string, reason: string): void {
    // Remove from tracking
    const userSocketIds = this.userSockets.get(userId);
    if (userSocketIds) {
      userSocketIds.delete(socketId);
      
      // If user has no more connections, mark as offline
      if (userSocketIds.size === 0) {
        this.userSockets.delete(userId);
        this.updateUserPresence(userId, 'offline');
      }
    }

    // Clean up any room-specific data
    this.cleanupUserRoomData(userId, socketId);

    // Log disconnect reason for monitoring
    this.logDisconnect(userId, socketId, reason);
  }

  private updateUserPresence(userId: string, status: 'online' | 'offline'): void {
    // Update database
    db.user.update({
      where: { id: userId },
      data: {
        status,
        lastSeen: new Date(),
      },
    }).catch((error) => {
      console.error('Failed to update user presence:', error);
    });

    // Broadcast to all users who share conversations with this user
    this.broadcastPresenceUpdate(userId, status);
  }

  private async broadcastPresenceUpdate(userId: string, status: 'online' | 'offline'): Promise<void> {
    try {
      // Get all conversations where user is a participant
      const conversations = await db.conversationParticipant.findMany({
        where: { userId },
        select: { conversationId: true },
      });

      const conversationIds = conversations.map((c) => c.conversationId);

      // Broadcast presence update to all those conversations
      conversationIds.forEach((conversationId) => {
        this.io.to(conversationId).emit('user:status', {
          userId,
          status,
          lastSeen: new Date(),
        });
      });
    } catch (error) {
      console.error('Failed to broadcast presence update:', error);
    }
  }

  private cleanupUserRoomData(userId: string, socketId: string): void {
    // Clean up any typing indicators
    // Clean up any temporary data associated with this socket
    console.log(`Cleaned up data for user ${userId}, socket ${socketId}`);
  }

  private logDisconnect(userId: string, socketId: string, reason: string): void {
    // Log to monitoring service (e.g., Datadog, CloudWatch)
    console.log({
      event: 'socket_disconnect',
      userId,
      socketId,
      reason,
      timestamp: new Date(),
    });
  }

  // Get all socket IDs for a user
  public getUserSockets(userId: string): Set<string> | undefined {
    return this.userSockets.get(userId);
  }

  // Check if user is connected
  public isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }
}
```

---

## 4. Edge Cases

### Message Sent During Disconnect

**Problem:** User sends message while disconnected. Message is queued locally.

**Solution:**

```typescript
// Client-side: Queue messages when disconnected
const messageQueue: Array<any> = [];

socket.on('disconnect', () => {
  // Start queuing messages
  isConnected = false;
});

function sendMessage(content: string) {
  const message = {
    temp_id: `temp_${Date.now()}`,
    conversationId: currentConversation,
    content,
    timestamp: new Date(),
  };

  if (!socket.connected) {
    // Queue for later
    messageQueue.push(message);
    reconnectionManager.addPendingMessage(message);
    
    // Show in UI as "sending..."
    displayMessageAsPending(message);
  } else {
    socket.emit('send-message', message);
  }
}

socket.on('connect', () => {
  // Send queued messages
  messageQueue.forEach((message) => {
    socket.emit('send-message', message);
  });
  messageQueue.length = 0;
});
```

### Room Membership Changed During Disconnect

**Problem:** User was removed from conversation while disconnected.

**Solution:**

```typescript
// Server-side: Verify room membership on rejoin
socket.on('join-room', async (data, callback) => {
  const { conversationId } = data;
  const userId = socket.data.userId;

  const participant = await db.conversationParticipant.findFirst({
    where: { conversationId, userId },
  });

  if (!participant) {
    // User is no longer a participant
    callback?.({
      error: 'You are no longer a participant in this conversation',
      action: 'removed',
    });
    
    // Client should handle this and remove conversation from UI
    return;
  }

  socket.join(conversationId);
  callback?.({ success: true });
});

// Client-side: Handle removal
socket.on('join-room', { conversationId }, (response) => {
  if (response.error && response.action === 'removed') {
    // Remove conversation from UI
    removeConversationFromUI(conversationId);
    showNotification('You were removed from this conversation');
  }
});
```

### Handle Stale Data

**Problem:** UI shows stale data after reconnection.

**Solution:**

```typescript
// Client-side: Version-based state sync
interface Message {
  id: string;
  content: string;
  version: number; // Add version field
  updatedAt: Date;
}

// When syncing missed messages
async function syncMissedMessages(conversationId: string) {
  const localMessages = getLocalMessages(conversationId);
  const lastVersion = Math.max(...localMessages.map((m) => m.version));

  const response = await fetch(
    `/api/messages?conversationId=${conversationId}&sinceVersion=${lastVersion}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const { messages } = await response.json();

  // Merge with local messages, preferring server version
  const merged = mergeMessages(localMessages, messages);
  updateUIWithMessages(conversationId, merged);
}

function mergeMessages(local: Message[], remote: Message[]): Message[] {
  const messageMap = new Map<string, Message>();

  // Add local messages
  local.forEach((msg) => messageMap.set(msg.id, msg));

  // Override with remote messages (server is source of truth)
  remote.forEach((msg) => {
    const existing = messageMap.get(msg.id);
    if (!existing || existing.version < msg.version) {
      messageMap.set(msg.id, msg);
    }
  });

  return Array.from(messageMap.values()).sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );
}
```

---

## 5. Implementation Checklist

### Client-Side Checklist

- [ ] **Configure Socket.IO reconnection settings**
  ```typescript
  reconnection: true
  reconnectionAttempts: 10
  reconnectionDelay: 1000
  reconnectionDelayMax: 10000
  ```

- [ ] **Implement reconnection manager**
  - [ ] Listen for `connect`, `disconnect`, `reconnect` events
  - [ ] Track active rooms
  - [ ] Queue pending messages
  - [ ] Handle authentication refresh

- [ ] **Re-authentication on reconnect**
  - [ ] Check token expiry
  - [ ] Refresh token if expired
  - [ ] Update socket auth with new token

- [ ] **Re-join all rooms**
  - [ ] Track which rooms user was in
  - [ ] Emit `join-room` for each conversation
  - [ ] Handle join failures (removed from conversation)

- [ ] **Sync missed messages**
  - [ ] Call REST API with `since` parameter
  - [ ] Merge with local messages
  - [ ] Update UI with synced messages

- [ ] **Resend pending messages**
  - [ ] Send queued messages on reconnect
  - [ ] Clear queue after successful send
  - [ ] Handle send failures

- [ ] **Update UI indicators**
  - [ ] Show "Connecting..." during reconnection
  - [ ] Show "Connected" when successful
  - [ ] Show "Offline" when disconnected
  - [ ] Show "Reconnection failed" after all attempts

- [ ] **Handle edge cases**
  - [ ] Messages sent while offline
  - [ ] Room membership changed
  - [ ] Stale data handling

### Server-Side Checklist

- [ ] **Track user connections**
  - [ ] Map userId to socket IDs
  - [ ] Support multiple connections per user
  - [ ] Clean up on disconnect

- [ ] **Handle duplicate connections**
  - [ ] Detect when user connects from multiple devices
  - [ ] Decide policy (allow both or disconnect old)
  - [ ] Notify old connection if disconnecting

- [ ] **Update user presence**
  - [ ] Mark online on connect
  - [ ] Mark offline on disconnect (if no other connections)
  - [ ] Broadcast presence to relevant users

- [ ] **Verify room membership on rejoin**
  - [ ] Check database for participation
  - [ ] Reject if removed from conversation
  - [ ] Send appropriate error message

- [ ] **Clean up on disconnect**
  - [ ] Remove from user socket map
  - [ ] Clear typing indicators
  - [ ] Clean up any temporary data

- [ ] **Logging and monitoring**
  - [ ] Log disconnect reasons
  - [ ] Track reconnection rates
  - [ ] Monitor failed reconnections
  - [ ] Alert on unusual patterns

### Optional: Message Queue (Advanced)

- [ ] **Implement server-side message queue**
  - [ ] Redis-based queue for offline messages
  - [ ] Store messages for offline users
  - [ ] Deliver on reconnection

- [ ] **Queue expiration**
  - [ ] Set TTL for queued messages
  - [ ] Clean up old messages

- [ ] **Delivery confirmation**
  - [ ] Track which messages were delivered
  - [ ] Remove from queue after delivery

**Example with Redis:**

```typescript
// Server-side: Queue message if user offline
async function queueMessageForOfflineUser(userId: string, message: any) {
  const key = `offline-messages:${userId}`;
  await redis.lpush(key, JSON.stringify(message));
  await redis.expire(key, 86400); // 24 hours TTL
}

// Deliver queued messages on reconnect
socket.on('connection', async (socket) => {
  const userId = socket.data.userId;
  const key = `offline-messages:${userId}`;
  
  const messages = await redis.lrange(key, 0, -1);
  
  if (messages.length > 0) {
    messages.forEach((msg) => {
      socket.emit('message:new', JSON.parse(msg));
    });
    
    // Clear queue after delivery
    await redis.del(key);
  }
});
```

---

## Testing Reconnection

### Manual Testing

1. **Simulate network disconnect:**
   ```javascript
   // In browser console
   socket.disconnect();
   
   // Wait a few seconds
   socket.connect();
   ```

2. **Test token expiration:**
   ```javascript
   // Manually expire token in localStorage
   localStorage.setItem('tokenExpiry', new Date(Date.now() - 1000).toISOString());
   
   // Disconnect and reconnect
   socket.disconnect();
   socket.connect();
   ```

3. **Test room rejoin:**
   ```javascript
   // Join a room
   socket.emit('join-room', { conversationId: 'conv_123' });
   
   // Disconnect
   socket.disconnect();
   
   // Reconnect - should auto-rejoin
   socket.connect();
   ```

4. **Test message queue:**
   ```javascript
   // Disconnect
   socket.disconnect();
   
   // Try to send message (should queue)
   sendMessage('This should be queued');
   
   // Reconnect (should send queued message)
   socket.connect();
   ```

5. **Test server restart:**
   - Send messages
   - Restart server
   - Client should auto-reconnect
   - Verify missed messages are synced

### Automated Testing

**Test Suite Example:**

```typescript
// tests/reconnection.test.ts
import { io, Socket } from 'socket.io-client';
import { createServer } from 'http';
import { Server } from 'socket.io';

describe('Socket Reconnection', () => {
  let ioServer: Server;
  let clientSocket: Socket;
  let serverSocket: Socket;

  beforeEach((done) => {
    const httpServer = createServer();
    ioServer = new Server(httpServer);
    
    httpServer.listen(() => {
      const port = (httpServer.address() as any).port;
      
      clientSocket = io(`http://localhost:${port}`, {
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 100,
        auth: { token: 'test-token' },
      });

      ioServer.on('connection', (socket) => {
        serverSocket = socket;
      });

      clientSocket.on('connect', done);
    });
  });

  afterEach(() => {
    ioServer.close();
    clientSocket.close();
  });

  test('should reconnect after disconnect', (done) => {
    let reconnectCount = 0;

    clientSocket.on('reconnect', () => {
      reconnectCount++;
      expect(reconnectCount).toBe(1);
      done();
    });

    // Force disconnect
    serverSocket.disconnect(true);
  });

  test('should rejoin rooms after reconnect', (done) => {
    const roomName = 'test-room';
    let joinCount = 0;

    ioServer.on('connection', (socket) => {
      socket.on('join-room', (data) => {
        joinCount++;
        socket.join(data.conversationId);
        
        if (joinCount === 2) {
          // Second join (after reconnect)
          expect(socket.rooms.has(roomName)).toBe(true);
          done();
        }
      });
    });

    // First join
    clientSocket.emit('join-room', { conversationId: roomName });

    // Wait a bit, then disconnect
    setTimeout(() => {
      serverSocket.disconnect(true);
      
      // Client should auto-reconnect and rejoin
      clientSocket.on('reconnect', () => {
        clientSocket.emit('join-room', { conversationId: roomName });
      });
    }, 100);
  });

  test('should queue and send pending messages', (done) => {
    const pendingMessages: string[] = [];
    let receivedAfterReconnect = false;

    ioServer.on('connection', (socket) => {
      socket.on('send-message', (data) => {
        if (receivedAfterReconnect) {
          expect(pendingMessages).toContain(data.content);
          done();
        }
      });
    });

    // Disconnect
    serverSocket.disconnect(true);

    // Queue message while disconnected
    const message = { content: 'Pending message', temp_id: 'temp_1' };
    pendingMessages.push(message.content);

    clientSocket.on('reconnect', () => {
      receivedAfterReconnect = true;
      // Send pending message
      clientSocket.emit('send-message', message);
    });
  });

  test('should handle authentication failure on reconnect', (done) => {
    clientSocket.on('connect_error', (error) => {
      expect(error.message).toBe('Authentication failed');
      done();
    });

    // Disconnect
    serverSocket.disconnect(true);

    // Change auth to invalid
    clientSocket.auth = { token: 'invalid-token' };

    // Server should reject reconnection
    ioServer.use((socket, next) => {
      if (socket.handshake.auth.token === 'invalid-token') {
        next(new Error('Authentication failed'));
      } else {
        next();
      }
    });
  });

  test('should stop reconnecting after max attempts', (done) => {
    clientSocket = io(`http://localhost:9999`, {
      reconnection: true,
      reconnectionAttempts: 2,
      reconnectionDelay: 100,
    });

    clientSocket.on('reconnect_failed', () => {
      expect(clientSocket.connected).toBe(false);
      done();
    });
  });
});
```

### Network Simulation Testing

```typescript
// tests/network-simulation.test.ts
describe('Network Conditions', () => {
  test('should handle slow network', async () => {
    // Simulate 3G connection
    await page.emulateNetworkConditions({
      offline: false,
      downloadThroughput: 750 * 1024 / 8,
      uploadThroughput: 250 * 1024 / 8,
      latency: 100,
    });

    // Test message sending
    await sendMessage('Test with slow network');
    await expect(page).toHaveText('.message', 'Test with slow network', {
      timeout: 5000,
    });
  });

  test('should handle offline -> online transition', async () => {
    // Go offline
    await page.emulateNetworkConditions({
      offline: true,
    });

    await expect(page).toHaveText('.connection-status', 'Offline');

    // Try to send message while offline
    await sendMessage('Offline message');
    await expect(page).toHaveText('.message-status', 'Pending');

    // Go back online
    await page.emulateNetworkConditions({
      offline: false,
    });

    await expect(page).toHaveText('.connection-status', 'Connected');
    await expect(page).toHaveText('.message-status', 'Sent');
  });

  test('should handle intermittent connection', async () => {
    for (let i = 0; i < 5; i++) {
      // Flip between offline and online
      await page.emulateNetworkConditions({
        offline: i % 2 === 0,
      });

      await page.waitForTimeout(1000);
    }

    // Should eventually reconnect
    await expect(page).toHaveText('.connection-status', 'Connected', {
      timeout: 10000,
    });
  });
});
```

---

## Monitoring and Observability

### Metrics to Track

```typescript
// Server-side: Track reconnection metrics
import { Counter, Histogram } from 'prom-client';

const reconnectionCounter = new Counter({
  name: 'socket_reconnections_total',
  help: 'Total number of socket reconnections',
  labelNames: ['reason'],
});

const disconnectionCounter = new Counter({
  name: 'socket_disconnections_total',
  help: 'Total number of socket disconnections',
  labelNames: ['reason'],
});

const connectionDuration = new Histogram({
  name: 'socket_connection_duration_seconds',
  help: 'Duration of socket connections',
  buckets: [1, 5, 15, 30, 60, 300, 600, 1800, 3600],
});

// Track in socket service
socket.on('disconnect', (reason) => {
  disconnectionCounter.inc({ reason });
  
  const duration = Date.now() - socket.data.connectedAt;
  connectionDuration.observe(duration / 1000);
});

socket.io.on('reconnect', () => {
  reconnectionCounter.inc({ reason: 'client_reconnect' });
});
```

### Logging Best Practices

```typescript
// Structured logging for reconnection events
import logger from './logger';

socket.on('disconnect', (reason) => {
  logger.info('socket_disconnected', {
    userId: socket.data.userId,
    socketId: socket.id,
    reason,
    duration: Date.now() - socket.data.connectedAt,
    rooms: Array.from(socket.rooms),
    timestamp: new Date().toISOString(),
  });
});

socket.io.on('reconnect', (attemptNumber) => {
  logger.info('socket_reconnected', {
    userId: socket.data.userId,
    socketId: socket.id,
    attemptNumber,
    timestamp: new Date().toISOString(),
  });
});

socket.io.on('reconnect_failed', () => {
  logger.error('socket_reconnect_failed', {
    userId: socket.data.userId,
    maxAttempts: socket.io.opts.reconnectionAttempts,
    timestamp: new Date().toISOString(),
  });
});
```

### Alerting

Set up alerts for:

1. **High reconnection rate** - May indicate network issues
2. **Failed reconnections** - Users can't connect
3. **Repeated disconnects** - Same user disconnecting frequently
4. **Authentication failures** - Potential security issue

```typescript
// Example alert conditions
if (reconnectionRate > 50 per minute) {
  alert('High socket reconnection rate detected');
}

if (failedReconnections > 100 per hour) {
  alert('Many users failing to reconnect');
}

if (authFailures > 20 per minute) {
  alert('Spike in socket authentication failures');
}
```

---

## UI/UX Best Practices

### Connection Status Indicator

```typescript
// React component example
function ConnectionStatus() {
  const [status, setStatus] = useState<'connected' | 'reconnecting' | 'offline'>('connected');
  const [attemptCount, setAttemptCount] = useState(0);

  useEffect(() => {
    const handleStatusChange = (event: CustomEvent) => {
      const { status } = event.detail;
      
      if (status === 'connected' || status === 'reconnected') {
        setStatus('connected');
        setAttemptCount(0);
      } else if (status.startsWith('reconnecting')) {
        setStatus('reconnecting');
        const match = status.match(/attempt-(\d+)/);
        if (match) {
          setAttemptCount(parseInt(match[1]));
        }
      } else if (status === 'disconnected' || status === 'reconnect-failed') {
        setStatus('offline');
      }
    };

    window.addEventListener('socket-status-change', handleStatusChange as EventListener);
    return () => window.removeEventListener('socket-status-change', handleStatusChange as EventListener);
  }, []);

  if (status === 'connected') {
    return null; // Don't show anything when connected
  }

  return (
    <div className={`connection-banner ${status}`}>
      {status === 'reconnecting' && (
        <>
          <Spinner />
          <span>Reconnecting... (attempt {attemptCount})</span>
        </>
      )}
      {status === 'offline' && (
        <>
          <AlertIcon />
          <span>Connection lost. Trying to reconnect...</span>
          <button onClick={() => reconnectionManager.manualReconnect()}>
            Retry Now
          </button>
        </>
      )}
    </div>
  );
}
```

### Message Status Indicators

```typescript
// Show different states for messages
function MessageStatus({ message }: { message: Message }) {
  if (message.status === 'sending') {
    return <ClockIcon className="text-gray-400" />;
  }
  
  if (message.status === 'failed') {
    return (
      <div className="flex items-center gap-2">
        <ErrorIcon className="text-red-500" />
        <button onClick={() => retryMessage(message)}>
          Retry
        </button>
      </div>
    );
  }
  
  if (message.status === 'sent') {
    return <CheckIcon className="text-gray-400" />;
  }
  
  if (message.status === 'delivered') {
    return <DoubleCheckIcon className="text-gray-400" />;
  }
  
  if (message.status === 'read') {
    return <DoubleCheckIcon className="text-blue-500" />;
  }
  
  return null;
}
```

### Toast Notifications

```typescript
// Show notifications for important events
socket.on('duplicate-connection', (data) => {
  toast.warning(
    'You connected from another device. This session will be disconnected.',
    { duration: 5000 }
  );
});

window.addEventListener('socket-reconnect-failed', () => {
  toast.error(
    'Unable to connect. Please check your internet connection.',
    {
      duration: 10000,
      action: {
        label: 'Retry',
        onClick: () => reconnectionManager.manualReconnect(),
      },
    }
  );
});

window.addEventListener('messages-synced', (event: CustomEvent) => {
  const { messages } = event.detail;
  if (messages.length > 0) {
    toast.info(`${messages.length} new messages while you were away`);
  }
});
```

---

## Production Considerations

### Redis Adapter for Multiple Servers

When scaling horizontally with multiple server instances:

```typescript
// server.ts
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
  console.log('Redis adapter connected');
});

// Now socket.io will work across multiple server instances
// Messages to rooms will be broadcast via Redis pub/sub
```

### Sticky Sessions (Load Balancer)

Configure your load balancer for sticky sessions:

```nginx
# Nginx configuration
upstream socket_nodes {
    ip_hash; # Sticky sessions based on IP
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

server {
    location /socket.io/ {
        proxy_pass http://socket_nodes;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Health Checks

```typescript
// Health check endpoint
app.get('/health', (req, res) => {
  const connectedSockets = io.engine.clientsCount;
  
  res.json({
    status: 'ok',
    connectedSockets,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Socket.IO specific health
app.get('/health/sockets', (req, res) => {
  const rooms = Array.from(io.sockets.adapter.rooms.keys());
  const sockets = Array.from(io.sockets.sockets.keys());
  
  res.json({
    totalSockets: sockets.length,
    totalRooms: rooms.length,
    rooms: rooms.filter((r) => !sockets.includes(r)), // Exclude socket IDs
  });
});
```

### Graceful Shutdown

```typescript
// Graceful shutdown handler
async function gracefulShutdown() {
  console.log('Shutting down gracefully...');
  
  // Stop accepting new connections
  io.close(() => {
    console.log('Socket.IO server closed');
  });
  
  // Notify all connected clients
  io.emit('server-shutdown', {
    message: 'Server is restarting. You will be reconnected automatically.',
  });
  
  // Wait for existing connections to close (with timeout)
  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 5000);
    
    io.sockets.sockets.forEach((socket) => {
      socket.on('disconnect', () => {
        if (io.sockets.sockets.size === 0) {
          clearTimeout(timeout);
          resolve(undefined);
        }
      });
    });
  });
  
  // Close database connections
  await db.$disconnect();
  
  // Exit
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
```

---

## Summary

### Key Takeaways

✅ **Socket.IO has built-in reconnection** with exponential backoff
✅ **Client must handle**: re-authentication, rejoining rooms, syncing missed data
✅ **Server must handle**: cleaning up old connections, verifying room membership, updating presence
✅ **Edge cases matter**: offline messages, room changes, stale data
✅ **Monitor everything**: reconnection rates, failures, connection duration
✅ **UX is critical**: show connection status, queue messages, provide retry options

### Implementation Priority

1. **High Priority** (Must have):
   - Basic reconnection handling
   - Re-authentication on reconnect
   - Rejoin rooms after reconnect
   - Connection status indicator in UI

2. **Medium Priority** (Should have):
   - Sync missed messages
   - Queue pending messages
   - Handle edge cases (room removal, etc.)
   - Server-side connection tracking

3. **Low Priority** (Nice to have):
   - Advanced metrics and monitoring
   - Redis-based message queue for offline users
   - Sophisticated merge algorithms for stale data
   - Network simulation testing

### Next Steps

1. Implement `SocketReconnectionManager` class
2. Add connection status indicator to UI
3. Test with simulated network conditions
4. Add monitoring and logging
5. Load test with multiple reconnections
6. Deploy with Redis adapter for scaling

Your application will now handle disconnections and reconnections gracefully, providing a seamless experience for users even with poor network conditions!