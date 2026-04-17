import { config } from "dotenv";
import { z } from "zod";

config({ path: "../../.env" });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.string().default("info"),
  API_PORT: z.coerce.number().default(4000),
  WEB_PLATFORM_ORIGIN: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1).default("postgresql://postgres:postgres@localhost:5432/vc_platform"),
  BETTER_AUTH_SECRET: z.string().min(1).default("dev-local-secret-please-change-32chars-min"),
  BETTER_AUTH_BASE_URL: z.string().url().default("http://localhost:4000"),
  OPENBAO_ADDR: z.string().url().default("http://localhost:8200"),
  OPENBAO_TOKEN: z.string().min(1).default("root"),
  CRYPTO_ENGINE_URL: z.string().url().default("http://localhost:50051"),
});

export type AppEnv = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
