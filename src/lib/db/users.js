import { getPrisma } from "./prisma.js";

// Users already mirrored by this server instance; avoids an upsert per request.
const synced = new Set();

/**
 * Mirrors the authenticated identity into the application `users` table so
 * that analyses, keys and watchlists can reference it with foreign keys.
 */
export async function ensureUserRecord({ id, email }, prisma = getPrisma()) {
  if (synced.has(id)) return;
  await prisma.user.upsert({
    where: { id },
    create: { id, email: email || `${id}@users.invalid` },
    update: email ? { email } : {},
  });
  synced.add(id);
}

export async function getUserSettings(userId, prisma = getPrisma()) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { settings: true } });
  return user?.settings ?? {};
}
