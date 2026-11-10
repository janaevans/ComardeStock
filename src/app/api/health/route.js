import { withApi } from "@/lib/api/handler";
import { getPrisma } from "@/lib/db/prisma";
import { getAuthMode } from "@/lib/auth/config";

// GET /api/health — liveness + database connectivity, for uptime monitors.
// Reports configuration presence only, never values.
export const GET = withApi("health", async () => {
  let database = "ok";
  try {
    await getPrisma().$queryRaw`SELECT 1`;
  } catch {
    database = "unreachable";
  }
  const body = {
    status: database === "ok" ? "ok" : "degraded",
    time: new Date().toISOString(),
    database,
    auth: getAuthMode(),
    encryptionKeyConfigured: Boolean(process.env.ENCRYPTION_KEY),
  };
  return Response.json(body, { status: database === "ok" ? 200 : 503 });
});
