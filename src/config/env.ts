import { z } from "zod";

/**
 * Configuration validée au démarrage.
 * L'application refuse de démarrer avec une configuration invalide plutôt que
 * de planter au premier accès base de données.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),

  DATABASE_URL: z.string().optional(),

  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  // Les fichiers ne vont pas dans `storage/` : ce nom de répertoire est
  // exclu des sauvegardes d'environnement sur plusieurs hébergeurs.
  STORAGE_LOCAL_DIR: z.string().default("./.data/files"),
  STORAGE_S3_BUCKET: z.string().optional(),
  STORAGE_S3_REGION: z.string().optional(),
  STORAGE_S3_ENDPOINT: z.string().url().optional(),
  STORAGE_S3_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_S3_SECRET_ACCESS_KEY: z.string().optional(),

  PAYMENT_PROVIDERS: z
    .string()
    .default("manual,cod")
    .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean)),
  PAYMENT_MANUAL_IBAN: z.string().default(""),
  PAYMENT_MANUAL_BANK: z.string().default(""),

  MAILER_DRIVER: z.enum(["console", "resend"]).default("console"),
  MAILER_FROM: z.string().default("Atelier Restauration <bonjour@atelier-restauration.tn>"),
  RESEND_API_KEY: z.string().optional(),

  APP_SECRET: z.string().min(16).default("development-secret-do-not-use-in-production"),
  CRON_SECRET: z.string().min(8).default("development-cron-secret"),

  SEED_ADMIN_EMAIL: z.string().email().default("admin@atelier-restauration.tn"),
  SEED_ADMIN_PASSWORD: z.string().min(8).default("changeme-please"),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Configuration invalide :\n${details}`);
  }
  return parsed.data;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === "production";
