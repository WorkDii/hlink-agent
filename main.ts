import { Hono } from "@hono/hono";
import { triggerDataSync } from "./visitdrug/sync.ts";

const app = new Hono({});
app.get("/", (c) => {
  return c.json({ message: "Hello World 10" });
});

Deno.serve({ port: 8989 }, app.fetch);

triggerDataSync();
// triggerDataReSync();
