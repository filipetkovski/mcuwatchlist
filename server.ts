import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "localhost";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    path: "/api/socket",
    cors: { origin: "*" },
  });

  // Store on global so API route handlers can emit without an extra network hop.
  (globalThis as Record<string, unknown>).__socketIo = io;

  io.on("connection", (socket) => {
    socket.on("subscribe", (room: string) => {
      socket.join(room);
    });
    socket.on("unsubscribe", (room: string) => {
      socket.leave(room);
    });
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
