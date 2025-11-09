/**
 * Socket.IO Event Type Definitions
 * 
 * This file contains TypeScript interfaces for all socket events
 * exchanged between client and server in the real-time messaging system.
 * 
 * Types are aligned with Prisma schema definitions.
 */

// ============================================================================
// Base Types & Entities (Aligned with Prisma Schema)
// ============================================================================

/**
 * Message entity from database
 * Matches Prisma Message model
 */
export interface Message {
  id: bigint | string; // BigInt in DB, can be string when serialized
  conversationId: string; // UUID
  senderId: string | null; // UUID, nullable if user deleted
  content: string;
  attachments: MessageAttachment[] | null; // Stored as JSONB
  status: MessageStatus;
  statusTimestamps: StatusTimestamps | null; // Stored as JSONB
  createdAt: Date;
  editedAt: Date | null;
  // Relations (populated when needed)
  sender?: MessageSender;
  reactions?: Reaction[];
}

/**
 * Message status timestamps (stored in JSONB)
 */
export interface StatusTimestamps {
  sent?: string; // ISO 8601
  delivered?: Record<string, string>; // userId -> ISO 8601 timestamp
  read?: Record<string, string>; // userId -> ISO 8601 timestamp
}

/**
 * Message sender information (populated from User relation)
 */
export interface MessageSender {
  id: string; // UUID
  name: string;
  email: string;
  avatarUrl: string | null;
}

/**
 * Message attachment (stored in attachments JSONB array)
 */
export interface MessageAttachment {
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
}

/**
 * Reaction entity (from MessageReaction model)
 */
export interface Reaction {
  id: string; // UUID
  messageId: bigint | string; // BigInt, can be string when serialized
  userId: string; // UUID
  emoji: string;
  createdAt: Date;
  // Populated relation
  user?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

/**
 * Message delivery/read status
 */
export type MessageStatus = 'sent' | 'delivered' | 'read';

/**
 * User entity (from User model)
 */
export interface User {
  id: string; // UUID
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Conversation entity (from Conversation model)
 */
export interface Conversation {
  id: string; // UUID
  title: string | null;
  isGroup: boolean;
  createdBy: string | null; // UUID
  createdAt: Date;
}

/**
 * Participant entity (from Participant model)
 */
export interface Participant {
  id: string; // UUID
  conversationId: string; // UUID
  userId: string; // UUID
  joinedAt: Date;
  role: string; // 'member' | 'admin' etc.
}

// ============================================================================
// Client → Server Event Payloads
// ============================================================================

/**
 * Client authentication request
 * Event: 'authenticate'
 */
export interface AuthenticatePayload {
  token: string;
}

/**
 * Join a conversation room
 * Event: 'join-room'
 */
export interface JoinRoomPayload {
  conversationId: string; // UUID
}

/**
 * Leave a conversation room
 * Event: 'leave-room'
 */
export interface LeaveRoomPayload {
  conversationId: string; // UUID
}

/**
 * Send a new message
 * Event: 'send-message'
 */
export interface SendMessagePayload {
  tempId: string; // Client-generated temporary ID for optimistic updates
  conversationId: string; // UUID
  content: string;
  attachments?: MessageAttachment[];
}

/**
 * Typing indicator
 * Event: 'typing'
 */
export interface TypingPayload {
  conversationId: string; // UUID
  isTyping: boolean;
}

/**
 * Acknowledge message delivery
 * Event: 'delivered-ack'
 */
export interface DeliveredAckPayload {
  messageId: string; // BigInt as string
  conversationId: string; // UUID
}

/**
 * Mark messages as read
 * Event: 'read'
 */
export interface ReadPayload {
  messageIds: string[]; // BigInt[] as string[]
  conversationId: string; // UUID
}

/**
 * Add reaction to message
 * Event: 'react'
 */
export interface ReactPayload {
  messageId: string; // BigInt as string
  conversationId: string; // UUID
  emoji: string;
}

/**
 * Remove reaction from message
 * Event: 'unreact'
 */
export interface UnreactPayload {
  messageId: string; // BigInt as string
  conversationId: string; // UUID
  emoji: string;
}

// ============================================================================
// Server → Client Event Payloads
// ============================================================================

/**
 * Authentication success response
 * Event: 'auth:success'
 */
export interface AuthSuccessPayload {
  userId: string; // UUID
  socketId: string;
}

/**
 * Authentication error response
 * Event: 'auth:error'
 */
export interface AuthErrorPayload {
  message: string;
  code: 'INVALID_TOKEN' | 'MISSING_TOKEN' | 'EXPIRED_TOKEN' | 'USER_NOT_FOUND';
}

/**
 * New message created
 * Event: 'message:new'
 * 
 * Message is serialized with BigInt id as string
 */
export interface MessageNewPayload {
  message: Omit<Message, 'id'> & { id: string }; // BigInt serialized to string
  tempId?: string; // Echo back for client to match optimistic update
}

/**
 * Message status update (delivered/read)
 * Event: 'message:status'
 */
export interface MessageStatusPayload {
  messageId: string; // BigInt as string
  conversationId: string; // UUID
  status: MessageStatus;
  userId: string; // UUID - User who updated the status
  timestamp: string; // ISO 8601
}

/**
 * Typing indicator update
 * Event: 'typing:update'
 */
export interface TypingUpdatePayload {
  userId: string; // UUID
  conversationId: string; // UUID
  isTyping: boolean;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

/**
 * User presence update (online/offline)
 * Event: 'presence:update'
 */
export interface PresenceUpdatePayload {
  userId: string; // UUID
  conversationId: string; // UUID
  online: boolean;
  lastSeen?: string; // ISO 8601, only when going offline
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

/**
 * Reaction update (added/removed)
 * Event: 'reaction:update'
 */
export interface ReactionUpdatePayload {
  messageId: string; // BigInt as string
  conversationId: string; // UUID
  reactions: Array<Omit<Reaction, 'messageId'> & { messageId: string }>;
}

/**
 * Generic error event
 * Event: 'error'
 */
export interface SocketErrorPayload {
  event: string; // The event that caused the error
  message: string;
  code?: string;
  details?: Record<string, any>;
}

/**
 * Room joined successfully
 * Event: 'room:joined'
 */
export interface RoomJoinedPayload {
  conversationId: string; // UUID
  participantCount: number;
  onlineUsers: string[]; // Array of online user UUIDs
}

/**
 * Room left successfully
 * Event: 'room:left'
 */
export interface RoomLeftPayload {
  conversationId: string; // UUID
}

/**
 * Error joining room
 * Event: 'room:error'
 */
export interface RoomErrorPayload {
  conversationId: string; // UUID
  message: string;
  code: 'NOT_PARTICIPANT' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'ALREADY_JOINED';
}

// ============================================================================
// Socket Data Extensions
// ============================================================================

/**
 * Custom data attached to socket instance
 * Accessible via socket.data
 */
export interface SocketData {
  userId: string; // UUID from JWT
  user: {
    id: string; // UUID
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  joinedRooms: Set<string>; // Track which conversation rooms user has joined
}

// ============================================================================
// Event Maps (for type-safe event emission)
// ============================================================================

/**
 * Map of all Client → Server events
 * Used for type-safe socket.on() handlers
 */
export interface ClientToServerEvents {
  authenticate: (payload: AuthenticatePayload) => void;
  'join-room': (payload: JoinRoomPayload, callback?: (response: { success: boolean; error?: string }) => void) => void;
  'leave-room': (payload: LeaveRoomPayload, callback?: (response: { success: boolean }) => void) => void;
  'send-message': (payload: SendMessagePayload, callback?: (response: { success: boolean; messageId?: string; error?: string }) => void) => void;
  typing: (payload: TypingPayload) => void;
  'delivered-ack': (payload: DeliveredAckPayload) => void;
  read: (payload: ReadPayload) => void;
  react: (payload: ReactPayload, callback?: (response: { success: boolean; error?: string }) => void) => void;
  unreact: (payload: UnreactPayload, callback?: (response: { success: boolean; error?: string }) => void) => void;
}

/**
 * Map of all Server → Client events
 * Used for type-safe socket.emit() calls
 */
export interface ServerToClientEvents {
  'auth:success': (payload: AuthSuccessPayload) => void;
  'auth:error': (payload: AuthErrorPayload) => void;
  'message:new': (payload: MessageNewPayload) => void;
  'message:status': (payload: MessageStatusPayload) => void;
  'typing:update': (payload: TypingUpdatePayload) => void;
  'presence:update': (payload: PresenceUpdatePayload) => void;
  'reaction:update': (payload: ReactionUpdatePayload) => void;
  'room:joined': (payload: RoomJoinedPayload) => void;
  'room:left': (payload: RoomLeftPayload) => void;
  'room:error': (payload: RoomErrorPayload) => void;
  error: (payload: SocketErrorPayload) => void;
}

/**
 * Inter-server events (for scaling with multiple servers)
 * Currently unused but reserved for future Redis adapter
 */
export interface InterServerEvents {
  ping: () => void;
}

// ============================================================================
// Type-safe Socket.IO Server Type
// ============================================================================

import type { Server as SocketIOServer, Socket as SocketIOSocket } from 'socket.io';

/**
 * Type-safe Socket.IO Server instance
 */
export type TypedServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Type-safe Socket.IO Socket instance
 */
export type TypedSocket = SocketIOSocket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Callback response for acknowledgments
 */
export interface AckResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Generic success callback
 */
export type SuccessCallback = (response: AckResponse) => void;

/**
 * Message send callback with specific response type
 */
export interface MessageSendResponse {
  success: boolean;
  messageId?: string; // BigInt as string
  tempId?: string;
  error?: string;
}

/**
 * Room join callback response
 */
export interface RoomJoinResponse {
  success: boolean;
  conversationId?: string; // UUID
  participantCount?: number;
  error?: string;
}

// ============================================================================
// Event Name Constants
// ============================================================================

/**
 * Client → Server event names
 */
export const CLIENT_EVENTS = {
  AUTHENTICATE: 'authenticate',
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  SEND_MESSAGE: 'send-message',
  TYPING: 'typing',
  DELIVERED_ACK: 'delivered-ack',
  READ: 'read',
  REACT: 'react',
  UNREACT: 'unreact',
} as const;

/**
 * Server → Client event names
 */
export const SERVER_EVENTS = {
  AUTH_SUCCESS: 'auth:success',
  AUTH_ERROR: 'auth:error',
  MESSAGE_NEW: 'message:new',
  MESSAGE_STATUS: 'message:status',
  TYPING_UPDATE: 'typing:update',
  PRESENCE_UPDATE: 'presence:update',
  REACTION_UPDATE: 'reaction:update',
  ROOM_JOINED: 'room:joined',
  ROOM_LEFT: 'room:left',
  ROOM_ERROR: 'room:error',
  ERROR: 'error',
} as const;

/**
 * Native Socket.IO events
 */
export const NATIVE_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  RECONNECT: 'reconnect',
  RECONNECT_ATTEMPT: 'reconnect_attempt',
  RECONNECT_ERROR: 'reconnect_error',
  RECONNECT_FAILED: 'reconnect_failed',
} as const;

// ============================================================================
// Room Naming Utilities
// ============================================================================

/**
 * Generate room name for a conversation
 */
export const getRoomName = (conversationId: string): string => {
  return `conversation-${conversationId}`;
};

/**
 * Extract conversation ID from room name
 */
export const getConversationIdFromRoom = (roomName: string): string | null => {
  const match = roomName.match(/^conversation-(.+)$/);
  return match ? match[1] : null;
};

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate emoji string (basic check)
 */
export const isValidEmoji = (emoji: string): boolean => {
  // Basic emoji validation - single character or emoji sequence
  return emoji.length > 0 && emoji.length <= 10;
};

/**
 * Validate message content
 */
export const isValidMessageContent = (content: string): boolean => {
  return content.trim().length > 0 && content.length <= 10000;
};

/**
 * Validate UUID format
 */
export const isValidUUID = (id: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

/**
 * Validate BigInt message ID (as string)
 */
export const isValidMessageId = (id: string): boolean => {
  return /^\d+$/.test(id);
};

/**
 * Serialize BigInt to string for JSON transmission
 */
export const serializeBigInt = (value: bigint): string => {
  return value.toString();
};

/**
 * Parse string back to BigInt
 */
export const parseBigInt = (value: string): bigint => {
  return BigInt(value);
};

/**
 * Serialize Message for socket transmission (converts BigInt to string)
 */
export const serializeMessage = (message: Message): MessageNewPayload['message'] => {
  return {
    ...message,
    id: typeof message.id === 'bigint' ? serializeBigInt(message.id) : message.id,
  };
};

/**
 * Serialize Reaction for socket transmission
 */
export const serializeReaction = (reaction: Reaction): Omit<Reaction, 'messageId'> & { messageId: string } => {
  return {
    ...reaction,
    messageId: typeof reaction.messageId === 'bigint' ? serializeBigInt(reaction.messageId) : reaction.messageId,
  };
};