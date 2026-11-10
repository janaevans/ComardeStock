import { getPrisma } from "./prisma.js";
import { encryptSecret, decryptSecret } from "../security/encryption.js";
import { keyHint } from "../security/redact.js";

/**
 * Per-user provider credentials. Keys are encrypted with AES-256-GCM before
 * they reach the database and are decrypted only inside server code that is
 * about to call the provider. Listing functions never return key material.
 */

export async function listProviderConfigs(userId, prisma = getPrisma()) {
  const rows = await prisma.providerConfiguration.findMany({
    where: { userId },
    select: { provider: true, keyHint: true, selectedModel: true, updatedAt: true },
    orderBy: { provider: "asc" },
  });
  return rows;
}

export async function saveProviderKey(userId, { provider, apiKey, selectedModel }, prisma = getPrisma()) {
  const encryptedApiKey = encryptSecret(apiKey);
  const hint = keyHint(apiKey);
  const row = await prisma.providerConfiguration.upsert({
    where: { userId_provider: { userId, provider } },
    create: { userId, provider, encryptedApiKey, keyHint: hint, selectedModel: selectedModel ?? null },
    update: { encryptedApiKey, keyHint: hint, selectedModel: selectedModel ?? null },
    select: { provider: true, keyHint: true, selectedModel: true, updatedAt: true },
  });
  return row;
}

export async function deleteProviderKey(userId, provider, prisma = getPrisma()) {
  const res = await prisma.providerConfiguration.deleteMany({ where: { userId, provider } });
  return res.count > 0;
}

/** Server-only: returns the decrypted key, or null when the user has not configured one. */
export async function getDecryptedProviderKey(userId, provider, prisma = getPrisma()) {
  const row = await prisma.providerConfiguration.findUnique({
    where: { userId_provider: { userId, provider } },
    select: { encryptedApiKey: true, selectedModel: true },
  });
  if (!row) return null;
  return { apiKey: decryptSecret(row.encryptedApiKey), selectedModel: row.selectedModel };
}
