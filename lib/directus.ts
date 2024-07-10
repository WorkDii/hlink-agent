import { createDirectus, rest, staticToken } from "@directus/sdk";
import { env } from "./env.ts";

export const directusClient = createDirectus(env.HLINK_URL)
  .with(staticToken(env.HLINK_TOKEN))
  .with(rest());
