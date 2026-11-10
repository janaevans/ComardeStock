import { withApi, readJson, assertSameOrigin } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { providerKeySchema, providerDeleteSchema } from "@/lib/validation/schemas";
import { saveProviderKey, deleteProviderKey } from "@/lib/db/providerConfigs";
import { getProviderStatus } from "@/lib/providers/status";
import { logger } from "@/lib/logger";

// GET /api/providers — configuration status (never returns keys)
export const GET = withApi("providers.list", async () => {
  const user = await requireUser();
  return { providers: await getProviderStatus(user.id) };
});

// PUT /api/providers  { provider, apiKey, selectedModel? }
export const PUT = withApi("providers.save", async (request) => {
  assertSameOrigin(request);
  const user = await requireUser();
  await enforceRateLimit(user.id, "settingsWrite");
  const input = providerKeySchema.parse(await readJson(request));
  await saveProviderKey(user.id, input);
  logger.info("provider.key.saved", { userId: user.id, provider: input.provider });
  return { providers: await getProviderStatus(user.id) };
});

// DELETE /api/providers  { provider }
export const DELETE = withApi("providers.delete", async (request) => {
  assertSameOrigin(request);
  const user = await requireUser();
  await enforceRateLimit(user.id, "settingsWrite");
  const { provider } = providerDeleteSchema.parse(await readJson(request));
  await deleteProviderKey(user.id, provider);
  logger.info("provider.key.deleted", { userId: user.id, provider });
  return { providers: await getProviderStatus(user.id) };
});
