# Optimistic UI Implementation Guide

## 1. What is Optimistic UI?

**Optimistic UI** is a pattern where the user interface immediately reflects the result of an action before waiting for server confirmation. This creates a snappy, responsive experience by assuming the action will succeed.

### Traditional Flow (Slow)
```
User types message → Click send → Wait for server → Show message
                                    ⏱️ 200-500ms delay
```

### Optimistic UI Flow (Fast)
```
User types message → Click send → Show immediately → Server confirms in background
                                    ✨ Instant feedback
```

### Benefits

1. **Improved Perceived Performance**: Users see immediate results, making the app feel faster
2. **Better User Experience**: No waiting for network round-trips
3. **Reduced Friction**: Users can continue their workflow without interruption
4. **Modern Chat Experience**: Matches expectations set by WhatsApp, Slack, Discord

### Trade-offs

- **Complexity**: Need to handle rollback if server rejects
- **State Management**: Temporary and real messages coexist
- **Error Handling**: Must gracefully handle failures

---

## 2. temp_id System

The `temp_id` system is the backbone of optimistic UI for messages. It allows the client to track optimistic messages and replace them with server-confirmed versions.

### How It Works

```
┌─────────┐                                    ┌─────────┐
│ Client  │                                    │ Server  │
└────┬────┘                                    └────┬────┘
     │                                              │
     │ 1. Generate temp_id                         │
     │    "temp-1699564800123-a1b2c3"              │
     │                                              │
     │ 2. Add to UI immediately                    │
     │    (optimistic message)                     │
     │                                              │
     │ 3. Emit: send-message                       │
     │    { tempId, conversationId, content }      │
     ├─────────────────────────────────────────────>│
     │                                              │
     │                                              │ 4. Validate & persist
     │                                              │    Get real ID: 12345
     │                                              │
     │ 5. Receive: message:new                     │
     │    { message: {..., id: "12345"}, tempId }  │
     │<─────────────────────────────────────────────┤
     │                                              │
     │ 6. Replace optimistic with real             │
     │    Find by tempId → Update with real ID     │
     │                                              │
```

### temp_id Format

```typescript
const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
```

**Components:**
- `temp-`: Prefix to identify temporary IDs
- `${Date.now()}`: Timestamp for ordering and uniqueness
- `${Math.random()}`: Random suffix for additional uniqueness

**Examples:**
- `temp-1699564800123-a1b2c3d4e`
- `temp-1699564801456-x9y8z7w6v`

### State Transitions

```
[Optimistic]  → [Sending]  → [Sent]     → [Delivered] → [Read]
temp_id only    temp_id      real_id      real_id       real_id
               + sending     + confirmed

                         ↓ (on error)
                    [Failed]
                    temp_id
                   + error state
```

---

## 3. Edge Cases

### Case 1: Message Fails to Send

**Scenario**: Server rejects message (validation error, user banned, network error)

**Handling:**
1. Keep message in UI with error state
2. Show retry button or error indicator
3. Allow user to retry or delete
4. Don't remove optimistic message automatically

```typescript
// Message state after failure
{
  tempId: "temp-1699564800123-a1b2c3",
  status: "failed",
  error: "Failed to send message",
  content: "Hello world",
  canRetry: true
}
```

**User Actions:**
- **Retry**: Re-emit `send-message` with same `tempId`
- **Delete**: Remove from local state
- **Edit**: Modify content and retry

### Case 2: Duplicate Messages Prevention

**Scenario**: User clicks send multiple times, or network sends duplicate packets

**Prevention Strategy:**

1. **Client-side**: Disable send button while sending
2. **temp_id tracking**: Server/client track processed temp_ids
3. **Idempotency**: Server deduplicates by temp_id within time window

```typescript
// Client: Track sending state
const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());

const sendMessage = async (content: string) => {
  const tempId = generateTempId();
  
  // Prevent duplicate sends
  if (sendingIds.has(tempId)) return;
  
  setSendingIds(prev => new Set(prev).add(tempId));
  
  try {
    await socket.emit('send-message', { tempId, content });
  } finally {
    setSendingIds(prev => {
      const next = new Set(prev);
      next.delete(tempId);
      return next;
    });
  }
};
```

```typescript
// Server: Idempotency check (optional, for extra safety)
const recentTempIds = new Set<string>(); // Or use Redis for distributed systems

socket.on('send-message', async (data) => {
  if (recentTempIds.has(data.tempId)) {
    // Duplicate detected, ignore
    return;
  }
  
  recentTempIds.add(data.tempId);
  
  // Clean up after 5 minutes
  setTimeout(() => recentTempIds.delete(data.tempId), 5 * 60 * 1000);
  
  // Process message...
});
```

### Case 3: Reconnection During Send

**Scenario**: User loses connection while message is being sent

**Handling Strategy:**

```
Message sent → Connection lost → Reconnect → Check message status
```

**Implementation:**

1. **Queue Pending Messages**: Store unsent messages in local storage
2. **On Reconnect**: Retrieve queue and retry
3. **Server Validation**: Check if message already exists (by temp_id or content hash)

```typescript
// Client: Persistent queue
class MessageQueue {
  private queue: SendMessagePayload[] = [];
  
  constructor() {
    // Load from localStorage on init
    this.loadQueue();
  }
  
  add(message: SendMessagePayload) {
    this.queue.push(message);
    this.saveQueue();
  }
  
  remove(tempId: string) {
    this.queue = this.queue.filter(m => m.tempId !== tempId);
    this.saveQueue();
  }
  
  async retryAll(socket: Socket) {
    for (const message of this.queue) {
      try {
        await socket.emit('send-message', message);
        this.remove(message.tempId);
      } catch (error) {
        console.error('Retry failed:', error);
      }
    }
  }
  
  private saveQueue() {
    localStorage.setItem('messageQueue', JSON.stringify(this.queue));
  }
  
  private loadQueue() {
    const stored = localStorage.getItem('messageQueue');
    if (stored) {
      this.queue = JSON.parse(stored);
    }
  }
}

// Usage on reconnect
socket.on('connect', () => {
  messageQueue.retryAll(socket);
});
```

### Case 4: Multiple Clients (Same User)

**Scenario**: User has app open on phone and desktop

**Handling:**
1. When device A sends message, device B receives `message:new`
2. Device B should NOT show as optimistic (no temp_id on device B)
3. Only the sending device has optimistic state

```typescript
// Client: Check if message is from this device
socket.on('message:new', (payload) => {
  const isOwnMessage = payload.message.senderId === currentUserId;
  const isOptimisticUpdate = !!payload.tempId;
  
  if (isOptimisticUpdate && isOwnMessage) {
    // Replace optimistic message
    replaceOptimisticMessage(payload.tempId, payload.message);
  } else {
    // Add as new message
    addMessage(payload.message);
  }
});
```

---

## 4. Implementation Steps

### Phase 1: Client-Side Setup

#### Step 1: Define Message Types

```typescript
// types/message.types.ts
export type MessageState = 'optimistic' | 'sending' | 'sent' | 'failed';

export interface OptimisticMessage {
  tempId: string;
  conversationId: string;
  content: string;
  attachments?: MessageAttachment[];
  senderId: string;
  sender: MessageSender;
  createdAt: Date;
  state: MessageState;
  error?: string;
}

export interface RealMessage {
  id: string; // Real BigInt ID as string
  conversationId: string;
  content: string;
  attachments?: MessageAttachment[];
  senderId: string;
  sender: MessageSender;
  createdAt: Date;
  state: 'sent' | 'delivered' | 'read';
}

export type DisplayMessage = OptimisticMessage | RealMessage;

// Type guard
export function isOptimistic(msg: DisplayMessage): msg is OptimisticMessage {
  return 'tempId' in msg && !('id' in msg);
}
```

#### Step 2: Create temp_id Generator

```typescript
// utils/tempId.ts
export function generateTempId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `temp-${timestamp}-${random}`;
}

export function isTempId(id: string): boolean {
  return id.startsWith('temp-');
}

export function extractTimestamp(tempId: string): number | null {
  const match = tempId.match(/^temp-(\d+)-/);
  return match ? parseInt(match[1], 10) : null;
}
```

#### Step 3: Set Up State Management

```typescript
// stores/messageStore.ts (using Zustand example)
import create from 'zustand';

interface MessageStore {
  messages: DisplayMessage[];
  addOptimistic: (message: OptimisticMessage) => void;
  replaceOptimistic: (tempId: string, realMessage: RealMessage) => void;
  updateState: (tempId: string, state: MessageState, error?: string) => void;
  addMessage: (message: RealMessage) => void;
}

export const useMessageStore = create<MessageStore>((set) => ({
  messages: [],
  
  addOptimistic: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  
  replaceOptimistic: (tempId, realMessage) => set((state) => ({
    messages: state.messages.map(msg => 
      isOptimistic(msg) && msg.tempId === tempId 
        ? realMessage 
        : msg
    )
  })),
  
  updateState: (tempId, newState, error) => set((state) => ({
    messages: state.messages.map(msg =>
      isOptimistic(msg) && msg.tempId === tempId
        ? { ...msg, state: newState, error }
        : msg
    )
  })),
  
  addMessage: (message) => set((state) => {
    // Check for duplicates
    const exists = state.messages.some(m => 
      !isOptimistic(m) && m.id === message.id
    );
    if (exists) return state;
    
    return { messages: [...state.messages, message] };
  }),
}));
```

### Phase 2: Client-Side Message Sending

```typescript
// hooks/useSendMessage.ts
import { useMessageStore } from '@/stores/messageStore';
import { useSocket } from '@/contexts/SocketContext';
import { generateTempId } from '@/utils/tempId';

export function useSendMessage(conversationId: string) {
  const socket = useSocket();
  const { addOptimistic, replaceOptimistic, updateState } = useMessageStore();
  const currentUser = useCurrentUser();
  
  const sendMessage = async (content: string, attachments?: MessageAttachment[]) => {
    const tempId = generateTempId();
    
    // 1. Create optimistic message
    const optimisticMessage: OptimisticMessage = {
      tempId,
      conversationId,
      content,
      attachments,
      senderId: currentUser.id,
      sender: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        avatarUrl: currentUser.avatarUrl,
      },
      createdAt: new Date(),
      state: 'optimistic',
    };
    
    // 2. Add to UI immediately
    addOptimistic(optimisticMessage);
    
    // 3. Update to sending state
    updateState(tempId, 'sending');
    
    // 4. Emit to server with acknowledgment
    try {
      await new Promise((resolve, reject) => {
        socket.emit('send-message', {
          tempId,
          conversationId,
          content,
          attachments,
        }, (response) => {
          if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.error || 'Failed to send'));
          }
        });
        
        // Timeout after 10 seconds
        setTimeout(() => reject(new Error('Request timeout')), 10000);
      });
    } catch (error) {
      // 5. Handle error
      updateState(tempId, 'failed', error.message);
      throw error;
    }
  };
  
  const retryMessage = async (tempId: string) => {
    const message = useMessageStore.getState().messages.find(
      m => isOptimistic(m) && m.tempId === tempId
    );
    
    if (!message || !isOptimistic(message)) return;
    
    // Retry with same tempId
    updateState(tempId, 'sending');
    
    try {
      await sendMessage(message.content, message.attachments);
    } catch (error) {
      updateState(tempId, 'failed', error.message);
    }
  };
  
  return { sendMessage, retryMessage };
}
```

### Phase 3: Server-Side Handling

```typescript
// server/src/socket/handlers/messageHandler.ts
import { TypedSocket } from '@/types/socket.types';
import { prisma } from '@/lib/prisma';

export function registerMessageHandlers(socket: TypedSocket) {
  socket.on('send-message', async (data, callback) => {
    const userId = socket.data.userId;
    const { tempId, conversationId, content, attachments } = data;
    
    try {
      // 1. Validate user is participant
      const participant = await prisma.participant.findFirst({
        where: {
          conversationId,
          userId,
        },
      });
      
      if (!participant) {
        callback?.({ 
          success: false, 
          error: 'Not a participant in this conversation' 
        });
        return;
      }
      
      // 2. Validate content
      if (!content || content.trim().length === 0) {
        callback?.({ success: false, error: 'Message content is required' });
        return;
      }
      
      if (content.length > 10000) {
        callback?.({ success: false, error: 'Message too long' });
        return;
      }
      
      // 3. Save message to database
      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId: userId,
          content: content.trim(),
          attachments: attachments ? JSON.stringify(attachments) : null,
          status: 'sent',
          statusTimestamps: JSON.stringify({
            sent: new Date().toISOString(),
          }),
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });
      
      // 4. Acknowledge to sender
      callback?.({ 
        success: true, 
        messageId: message.id.toString() 
      });
      
      // 5. Broadcast to all room members (including sender)
      const roomName = `conversation-${conversationId}`;
      socket.to(roomName).emit('message:new', {
        message: {
          ...message,
          id: message.id.toString(), // Serialize BigInt
          attachments: message.attachments ? JSON.parse(message.attachments) : null,
        },
        tempId, // Include tempId for sender to match
      });
      
      // 6. Also emit to sender (for multi-device sync)
      socket.emit('message:new', {
        message: {
          ...message,
          id: message.id.toString(),
          attachments: message.attachments ? JSON.parse(message.attachments) : null,
        },
        tempId,
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      callback?.({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  });
}
```

### Phase 4: Client-Side Message Reception

```typescript
// hooks/useMessageSocket.ts
import { useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { useMessageStore } from '@/stores/messageStore';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function useMessageSocket(conversationId: string) {
  const socket = useSocket();
  const { replaceOptimistic, addMessage } = useMessageStore();
  const currentUser = useCurrentUser();
  
  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = (payload: MessageNewPayload) => {
      // Only process messages for this conversation
      if (payload.message.conversationId !== conversationId) return;
      
      const isOwnMessage = payload.message.senderId === currentUser.id;
      const hasOptimisticVersion = !!payload.tempId;
      
      if (isOwnMessage && hasOptimisticVersion) {
        // This is confirmation of our optimistic message
        replaceOptimistic(payload.tempId!, payload.message);
      } else {
        // This is a new message from someone else (or from another device)
        addMessage(payload.message);
      }
    };
    
    socket.on('message:new', handleNewMessage);
    
    return () => {
      socket.off('message:new', handleNewMessage);
    };
  }, [socket, conversationId, currentUser.id, replaceOptimistic, addMessage]);
}
```

---

## 5. Code Examples

### Example 1: Complete Client Component

```typescript
// components/MessageInput.tsx
import { useState } from 'react';
import { useSendMessage } from '@/hooks/useSendMessage';

interface MessageInputProps {
  conversationId: string;
}

export function MessageInput({ conversationId }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { sendMessage } = useSendMessage(conversationId);
  
  const handleSend = async () => {
    if (!content.trim() || isSending) return;
    
    const messageContent = content;
    setContent(''); // Clear input immediately
    setIsSending(true);
    
    try {
      await sendMessage(messageContent);
    } catch (error) {
      console.error('Failed to send:', error);
      // Optionally restore content to input
      setContent(messageContent);
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <div className="message-input">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        placeholder="Type a message..."
        disabled={isSending}
      />
      <button onClick={handleSend} disabled={isSending || !content.trim()}>
        Send
      </button>
    </div>
  );
}
```

### Example 2: Message List with Optimistic States

```typescript
// components/MessageList.tsx
import { useMessageStore } from '@/stores/messageStore';
import { isOptimistic } from '@/types/message.types';

interface MessageListProps {
  conversationId: string;
}

export function MessageList({ conversationId }: MessageListProps) {
  const messages = useMessageStore(state => 
    state.messages.filter(m => m.conversationId === conversationId)
  );
  const { retryMessage } = useSendMessage(conversationId);
  
  return (
    <div className="message-list">
      {messages.map((message) => {
        if (isOptimistic(message)) {
          return (
            <OptimisticMessage
              key={message.tempId}
              message={message}
              onRetry={() => retryMessage(message.tempId)}
            />
          );
        }
        
        return <RealMessage key={message.id} message={message} />;
      })}
    </div>
  );
}

function OptimisticMessage({ message, onRetry }: { 
  message: OptimisticMessage; 
  onRetry: () => void;
}) {
  return (
    <div className={`message optimistic ${message.state}`}>
      <div className="message-content">{message.content}</div>
      
      {message.state === 'sending' && (
        <div className="status">Sending...</div>
      )}
      
      {message.state === 'failed' && (
        <div className="status error">
          <span>{message.error || 'Failed to send'}</span>
          <button onClick={onRetry}>Retry</button>
        </div>
      )}
    </div>
  );
}

function RealMessage({ message }: { message: RealMessage }) {
  return (
    <div className="message real">
      <div className="message-content">{message.content}</div>
      <div className="status">{message.state}</div>
    </div>
  );
}
```

### Example 3: Testing Optimistic UI

```typescript
// __tests__/optimisticUI.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useSendMessage } from '@/hooks/useSendMessage';
import { useMessageStore } from '@/stores/messageStore';

describe('Optimistic UI', () => {
  beforeEach(() => {
    useMessageStore.getState().messages = [];
  });
  
  it('should add message optimistically', async () => {
    const { result } = renderHook(() => useSendMessage('conv-123'));
    
    act(() => {
      result.current.sendMessage('Hello world');
    });
    
    // Message should appear immediately
    const messages = useMessageStore.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('Hello world');
    expect(messages[0].state).toBe('optimistic');
  });
  
  it('should replace optimistic with real message', async () => {
    const { result } = renderHook(() => useSendMessage('conv-123'));
    
    // Send message
    await act(async () => {
      await result.current.sendMessage('Hello world');
    });
    
    const messages = useMessageStore.getState().messages;
    const tempId = messages[0].tempId;
    
    // Simulate server response
    act(() => {
      useMessageStore.getState().replaceOptimistic(tempId, {
        id: '12345',
        content: 'Hello world',
        conversationId: 'conv-123',
        senderId: 'user-1',
        state: 'sent',
        createdAt: new Date(),
      });
    });
    
    // Should be replaced
    const updatedMessages = useMessageStore.getState().messages;
    expect(updatedMessages).toHaveLength(1);
    expect(updatedMessages[0].id).toBe('12345');
    expect('tempId' in updatedMessages[0]).toBe(false);
  });
  
  it('should handle send failure', async () => {
    const { result } = renderHook(() => useSendMessage('conv-123'));
    
    // Mock socket to fail
    mockSocket.emit.mockImplementation((event, data, callback) => {
      callback({ success: false, error: 'Network error' });
    });
    
    await act(async () => {
      try {
        await result.current.sendMessage('Hello world');
      } catch (error) {
        // Expected to throw
      }
    });
    
    const messages = useMessageStore.getState().messages;
    expect(messages[0].state).toBe('failed');
    expect(messages[0].error).toBe('Network error');
  });
});
```

---

## Summary

Optimistic UI with the `temp_id` system provides:

✅ **Instant feedback** - Messages appear immediately  
✅ **Reliable tracking** - temp_id links optimistic to real messages  
✅ **Error handling** - Failed messages show retry options  
✅ **Multi-device support** - Proper handling across devices  
✅ **Idempotency** - Prevents duplicate messages  
✅ **Offline support** - Queue messages for retry on reconnect  

**Key Takeaways:**
1. Always generate unique temp_id for each message
2. Show optimistic message immediately, update to 'sending'
3. Replace with real message when server confirms
4. Handle failures gracefully with retry options
5. Test edge cases thoroughly (reconnection, duplicates, errors)