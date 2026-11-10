import { getPrisma } from "./prisma.js";

/**
 * Analysis records. Every query is scoped by userId so one user can never read
 * or change another user's analysis — callers cannot omit the scope.
 */
const LIST_SELECT = {
  id: true,
  companyName: true,
  ticker: true,
  exchange: true,
  currency: true,
  status: true,
  isSaved: true,
  createdAt: true,
  completedAt: true,
};

export function listAnalyses(userId, { savedOnly = false, take = 20 } = {}, prisma = getPrisma()) {
  return prisma.analysis.findMany({
    where: { userId, ...(savedOnly ? { isSaved: true } : {}) },
    select: LIST_SELECT,
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(1, take), 100),
  });
}

/** Distinct recently analysed stocks (latest analysis per ticker+exchange). */
export async function listRecentStocks(userId, take = 8, prisma = getPrisma()) {
  const rows = await prisma.analysis.findMany({
    where: { userId },
    select: { ticker: true, exchange: true, companyName: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    distinct: ["ticker", "exchange"],
    take,
  });
  return rows;
}

export function getAnalysisForUser(userId, analysisId, prisma = getPrisma()) {
  return prisma.analysis.findFirst({ where: { id: analysisId, userId }, select: { ...LIST_SELECT, analysisSettings: true, errorMessage: true } });
}

export function createAnalysis(userId, { symbol, exchange, companyName, currency, settings }, prisma = getPrisma()) {
  return prisma.analysis.create({
    data: {
      userId,
      ticker: symbol,
      exchange,
      companyName,
      currency: currency ?? null,
      analysisSettings: settings ?? {},
      status: "PENDING",
    },
    select: LIST_SELECT,
  });
}

export async function setAnalysisSaved(userId, analysisId, isSaved, prisma = getPrisma()) {
  const res = await prisma.analysis.updateMany({ where: { id: analysisId, userId }, data: { isSaved } });
  return res.count > 0;
}
