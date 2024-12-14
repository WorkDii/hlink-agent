import { Hono } from "@hono/hono";
import { triggerSyncDuringTheDay } from "./visitdrug/syncDuringTheDay.ts";
import { env } from "./lib/env.ts";
import { triggerDataReSync } from "./visitdrug/resync.ts";
import { triggerCDrugReSync } from "./cdrug/sync.ts";
const app = new Hono({});
app.get("/", (c) => {
  return c.json({ message: "Hello World 10" });
});

Deno.serve({ port: 8989 }, app.fetch);

if (!env.IS_DEV) {
  triggerSyncDuringTheDay();
  triggerDataReSync();
  triggerCDrugReSync();
}
