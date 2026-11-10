import { withApi, readJson, assertSameOrigin } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { createAnalysisSchema } from "@/lib/validation/schemas";
import { listAnalyses, createAnalysis } from "@/lib/db/analyses";

// GET /api/analyses?saved=1
export const GET = withApi("analyses.list", async (request) => {
  const user = await requireUser();
  const savedOnly = request.nextUrl.searchParams.get("saved") === "1";
  return { analyses: await listAnalyses(user.id, { savedOnly, take: 50 }) };
});

// POST /api/analyses — records a confirmed stock and the user's optional settings.
// The record starts as PENDING; the multi-agent debate worker (Phase 3–4) picks it up.
export const POST = withApi("analyses.create", async (request) => {
  assertSameOrigin(request);
  const user = await requireUser();
  await enforceRateLimit(user.id, "settingsWrite");
  const input = createAnalysisSchema.parse(await readJson(request));
  const analysis = await createAnalysis(user.id, input);
  return Response.json({ analysis }, { status: 201 });
});
