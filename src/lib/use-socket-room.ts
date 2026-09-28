"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";

let sharedSocket: Socket | null = null;
let refCount = 0;

function getSocket(): Socket {
  if (!sharedSocket || sharedSocket.disconnected) {
    sharedSocket = io({ path: "/api/socket", autoConnect: true });
  }
  return sharedSocket;
}

/**
 * Subscribes to a per-user socket room and calls `onUpdate` whenever the server
 * emits the named event. The connection is shared across all callers on the page.
 */
export function useSocketRoom<T>(
  room: string | null,
  event: string,
  onUpdate: (data: T) => void,
) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!room) return;
    const socket = getSocket();
    refCount++;

    socket.emit("subscribe", room);

    const handler = (data: T) => onUpdateRef.current(data);
    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
      socket.emit("unsubscribe", room);
      refCount--;
      if (refCount <= 0) {
        sharedSocket?.disconnect();
        sharedSocket = null;
        refCount = 0;
      }
    };
  }, [room, event]);
}
