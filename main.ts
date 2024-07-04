import { Hono } from "@hono/hono";
import { triggerDataSync } from "./visitdrug/sync.ts";
import { env } from "./lib/env.ts";
import { triggerDataReSync } from "./visitdrug/resync.ts";

const app = new Hono({});
app.get("/", (c) => {
  return c.json({ message: "Hello World 10" });
});

Deno.serve({ port: 8989 }, app.fetch);

triggerDataSync();
if (!env.IS_DEV) {
  triggerDataReSync();
}
