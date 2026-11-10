// Prisma 7 configuration. The CLI reads DATABASE_URL / DIRECT_URL from the
// environment. For Supabase, migrations should use the direct (non-pooled)
// connection, so DIRECT_URL takes precedence when present.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});
