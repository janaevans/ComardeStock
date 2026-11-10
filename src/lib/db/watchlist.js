import { getPrisma } from "./prisma.js";

const SELECT = { symbol: true, exchange: true, companyName: true, currency: true, createdAt: true };

export function listWatchlist(userId, prisma = getPrisma()) {
  return prisma.watchlistItem.findMany({ where: { userId }, select: SELECT, orderBy: { createdAt: "desc" }, take: 200 });
}

export function addToWatchlist(userId, { symbol, exchange, companyName, currency }, prisma = getPrisma()) {
  return prisma.watchlistItem.upsert({
    where: { userId_symbol_exchange: { userId, symbol, exchange } },
    create: { userId, symbol, exchange, companyName, currency: currency ?? null },
    update: { companyName, currency: currency ?? null },
    select: SELECT,
  });
}

export async function removeFromWatchlist(userId, { symbol, exchange }, prisma = getPrisma()) {
  const res = await prisma.watchlistItem.deleteMany({ where: { userId, symbol, exchange } });
  return res.count > 0;
}

export async function isOnWatchlist(userId, symbol, exchange, prisma = getPrisma()) {
  const row = await prisma.watchlistItem.findUnique({
    where: { userId_symbol_exchange: { userId, symbol, exchange } },
    select: { id: true },
  });
  return Boolean(row);
}
