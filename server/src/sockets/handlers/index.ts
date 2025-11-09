// /server/src/sockets/handlers/index.ts

import { SocketService } from "../../services/socket.service";
import { registerConnectionHandler } from "./connection.handler";
import { registerMessageHandler } from "./message.handler";
import { registerTypingHandler } from "./typing.handler";
import { registerReactionHandler } from "./reaction.handler";

/**
 * registerHandlers(socketService)
 * -------------------------------
 * Registers all Socket.IO event handlers.
 * @param socketService - The SocketService instance.
 */
export function registerHandlers(socketService: SocketService): void {
  // TODO: Register all socket event handlers with socketService

  // Example:
  // registerConnectionHandler(socketService);
  // registerMessageHandler(socketService);
  // registerTypingHandler(socketService);
  // registerReactionHandler(socketService);
}
