import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(8000),
  LOG_LEVEL: z.string().default("info"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  REDIS_URL: z.string().default("redis://localhost:6379"),

  SERVICE_API_KEY: z.string().optional(),
  SESSION_SECRET: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),

  FLUTTERWAVE_SECRET_KEY: z.string().optional(),
  FLUTTERWAVE_PUBLIC_KEY: z.string().optional(),
  FLUTTERWAVE_ENCRYPTION_KEY: z.string().optional(),

  ESCROW_AUTO_RELEASE_DAYS: z.coerce.number().default(7),
  ESCROW_DISPUTE_WINDOW_HOURS: z.coerce.number().default(48),

  COMMISSION_RATE: z.coerce.number().min(0).max(1).default(0.15),

  SERVICE_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const errors = parsed.error.flatten().fieldErrors;
  const messages = Object.entries(errors)
    .map(([field, msgs]) => `  ${field}: ${msgs?.join(", ")}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${messages}`);
}

export const env = parsed.data;
export type Env = typeof env;
