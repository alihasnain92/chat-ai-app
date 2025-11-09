// /server/src/sockets/handlers/reaction.handler.ts

import { SocketService } from "../../services/socket.service";

/**
 * registerReactionHandler(socketService)
 * --------------------------------------
 * Handles message reaction events (like emojis or likes).
 * @param socketService - The SocketService instance.
 */
export function registerReactionHandler(socketService: SocketService): void {
  // TODO: Listen for "reaction" event
  // Use socketService.handleReaction() to process and broadcast reactions
}
