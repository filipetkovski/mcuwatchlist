import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "localhost";
const port = parseInt(process.env.PORT ?? "3000", 10);

// Create the HTTP server with NO request listener yet — Socket.io must be
// attached first so its listener runs before Next.js's handler.
const httpServer = createServer();
const app = next({ dev, hostname, port, httpServer });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const io = new Server(httpServer, {
    path: "/api/socket",
    cors: { origin: "*" },
  });

  (globalThis as Record<string, unknown>).__socketIo = io;

  io.on("connection", (socket) => {
    socket.on("subscribe", (room: string) => { socket.join(room); });
    socket.on("unsubscribe", (room: string) => { socket.leave(room); });
  });

  // Add Next.js AFTER Socket.io. For socket paths, skip Next.js entirely so
  // we don't try to write headers onto a response engine.io already owns.
  httpServer.on("request", (req, res) => {
    const url = req.url ?? "/";
    if (url.startsWith("/api/socket")) return;
    const parsedUrl = parse(url, true);
    handle(req, res, parsedUrl);
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
