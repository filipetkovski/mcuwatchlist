import type { Server } from "socket.io";

/** Returns the Socket.io server instance if the custom server has started it. */
export function getIo(): Server | null {
  return ((globalThis as Record<string, unknown>).__socketIo as Server) ?? null;
}

/** Emit a game-state update to both players' private rooms. */
export function emitGameUpdate(gameId: string, playerXId: string, playerOId: string, xState: unknown, oState: unknown) {
  const io = getIo();
  if (!io) { console.warn("[socket-server] io is null — run `npm run dev` (tsx server.ts), not `next dev`"); return; }
  console.log(`[socket-server] emitting game:update for game ${gameId}`);
  io.to(`game:${gameId}:${playerXId}`).emit("game:update", xState);
  io.to(`game:${gameId}:${playerOId}`).emit("game:update", oState);
}

export function emitDraftUpdate(gameId: string, playerXId: string, playerOId: string, xState: unknown, oState: unknown) {
  const io = getIo();
  if (!io) { console.warn("[socket-server] io is null — run `npm run dev` (tsx server.ts), not `next dev`"); return; }
  console.log(`[socket-server] emitting draft:update for game ${gameId}`);
  io.to(`draft:${gameId}:${playerXId}`).emit("draft:update", xState);
  io.to(`draft:${gameId}:${playerOId}`).emit("draft:update", oState);
}
