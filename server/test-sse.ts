import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { streamSSE } from "hono/streaming";

const app = new Hono();
app.get("/events", async (c) => {
  return streamSSE(c, async (stream) => {
    let closed = false;
    c.req.raw.signal.addEventListener("abort", () => { closed = true; console.log("Aborted"); });
    let count = 0;
    while (!closed) {
      console.log("Writing", count);
      await stream.writeSSE({ data: JSON.stringify({ count: count++ }) });
      await stream.sleep(1000);
    }
  });
});

serve({ fetch: app.fetch, port: 3009 }, () => console.log("running 3009"));
