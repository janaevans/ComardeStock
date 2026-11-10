import { z } from "zod";
import { withApi, readJson, assertSameOrigin } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { getPrisma } from "@/lib/db/prisma";
import { getUserSettings } from "@/lib/db/users";

const settingsSchema = z
  .object({
    marketDataProvider: z.enum(["TWELVE_DATA", "ALPHA_VANTAGE"]).nullable().optional(),
  })
  .strict();

export const GET = withApi("user.settings.get", async () => {
  const user = await requireUser();
  return { settings: await getUserSettings(user.id) };
});

export const PATCH = withApi("user.settings.patch", async (request) => {
  assertSameOrigin(request);
  const user = await requireUser();
  await enforceRateLimit(user.id, "settingsWrite");
  const patch = settingsSchema.parse(await readJson(request));
  const current = await getUserSettings(user.id);
  const next = { ...current, ...patch };
  for (const [k, v] of Object.entries(next)) if (v === null) delete next[k];
  await getPrisma().user.update({ where: { id: user.id }, data: { settings: next } });
  return { settings: next };
});
