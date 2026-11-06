/**
 * Aplica as migrações do banco (pasta ./drizzle).
 * Roda automaticamente no build (npm run build). Se não houver DATABASE_URL, apenas pula.
 */
import "dotenv/config";
import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) {
    console.log("[migrate] DATABASE_URL não definida — migrações ignoradas.");
    return;
  }
  if (process.env.NEON_FETCH_ENDPOINT) neonConfig.fetchEndpoint = process.env.NEON_FETCH_ENDPOINT;
  await migrate(drizzle(neon(url)), { migrationsFolder: "./drizzle" });
  console.log("[migrate] Banco atualizado.");
}

main().catch((err) => {
  console.error("[migrate] Falha:", err);
  process.exit(1);
});
