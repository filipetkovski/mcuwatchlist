import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "localhost";
const port = parseInt(process.env.PORT ?? "3000", 10);

// Don't pass httpServer to next() — Next.js would attach its own listeners
// immediately, which would intercept socket handshakes before Socket.io runs.
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server inside .then() so all listeners are added AFTER prepare.
  const httpServer = createServer();

  // Attach Socket.io FIRST so its "upgrade" and "request" listeners are first.
  const io = new Server(httpServer, {
    path: "/api/socket",
    cors: { origin: "*" },
  });

  (globalThis as Record<string, unknown>).__socketIo = io;
  console.log("[socket] io instance stored on globalThis");

  io.on("connection", (socket) => {
    console.log("[socket] client connected:", socket.id);
    socket.on("subscribe", (room: string) => {
      console.log("[socket] subscribe:", room);
      socket.join(room);
    });
    socket.on("unsubscribe", (room: string) => {
      socket.leave(room);
    });
    socket.on("disconnect", () => {
      console.log("[socket] client disconnected:", socket.id);
    });
  });

  // Add Next.js AFTER Socket.io. Skip /api/socket paths so we never touch
  // a response that engine.io already owns.
  httpServer.on("request", (req, res) => {
    const url = req.url ?? "/";
    if (url.startsWith("/api/socket")) return;
    handle(req, res, parse(url, true));
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
