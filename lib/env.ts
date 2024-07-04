import z from "zod";
import { load } from "@std/dotenv";

const _env = await load();

const envSchema = z.object({
  HLINK_TOKEN: z.string(),
  HLINK_URL: z.string(),
  PCU_CODE: z.string().length(5),
  HCODE: z.string().length(5),
  JHCIS_DB_SERVER: z.string(),
  JHCIS_DB_USER: z.string(),
  JHCIS_DB_PASSWORD: z.string(),
  JHCIS_DB_PORT: z.string(),
  JHCIS_DB: z.string(),
  DRUG_SYNC_START_DATE: z.string(),
  DRUG_SYNC_SCHEDULE: z.string().optional(),
  IS_DEV: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

export const env = envSchema.parse(_env);
