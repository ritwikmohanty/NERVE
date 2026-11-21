import { useEffect, useRef, useState, useCallback } from "react";
import { createSSE } from "@/lib/api";
import type { SSEEvent } from "@/lib/types";

const MAX_EVENTS = 500;

export function useSSE(leadId?: string) {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const connect = useCallback(
    (lid?: string) => {
      if (esRef.current) {
        esRef.current.close();
      }
      const id = lid || leadId;
      esRef.current = createSSE(
        id,
        (event) => {
          if (event.type === "connected") {
            setConnected(true);
          }
          // Cap history so long-lived pages don't grow without bound
          setEvents((prev) => {
            const next = [...prev, event];
            return next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next;
          });
        },
        () => {
          setConnected(false);
        }
      );
    },
    [leadId]
  );

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
    };
  }, [connect]);

  const clear = useCallback(() => setEvents([]), []);

  return { events, connected, connect, clear };
}
