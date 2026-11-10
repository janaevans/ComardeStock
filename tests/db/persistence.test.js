import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "node:crypto";

// Requires TEST_DATABASE_URL (a disposable, migrated database). Skipped otherwise.
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const d = enabled ? describe : describe.skip;

d("database persistence and isolation", async () => {
  const { getPrisma } = await import("@/lib/db/prisma");
  const { ensureUserRecord } = await import("@/lib/db/users");
  const { saveProviderKey, listProviderConfigs, getDecryptedProviderKey, deleteProviderKey } = await import("@/lib/db/providerConfigs");
  const { createAnalysis, listAnalyses, getAnalysisForUser, setAnalysisSaved, listRecentStocks } = await import("@/lib/db/analyses");
  const { addToWatchlist, listWatchlist, removeFromWatchlist, isOnWatchlist } = await import("@/lib/db/watchlist");

  const alice = { id: crypto.randomUUID(), email: `alice-${Date.now()}@test.local` };
  const bob = { id: crypto.randomUUID(), email: `bob-${Date.now()}@test.local` };
  const prisma = getPrisma();

  beforeAll(async () => {
    await ensureUserRecord(alice);
    await ensureUserRecord(bob);
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [alice.id, bob.id] } } });
    await prisma.$disconnect();
  });

  it("stores provider keys encrypted and lists only hints", async () => {
    await saveProviderKey(alice.id, { provider: "TWELVE_DATA", apiKey: "td-secret-key-9876" });
    const raw = await prisma.providerConfiguration.findFirst({ where: { userId: alice.id } });
    expect(raw.encryptedApiKey).not.toContain("td-secret-key-9876");
    expect(raw.keyHint).toBe("••••9876");

    const listed = await listProviderConfigs(alice.id);
    expect(JSON.stringify(listed)).not.toContain("td-secret");
    expect(listed[0]).not.toHaveProperty("encryptedApiKey");

    expect((await getDecryptedProviderKey(alice.id, "TWELVE_DATA")).apiKey).toBe("td-secret-key-9876");
    expect(await getDecryptedProviderKey(bob.id, "TWELVE_DATA")).toBeNull();

    // Upsert replaces, does not duplicate.
    await saveProviderKey(alice.id, { provider: "TWELVE_DATA", apiKey: "td-secret-key-1111" });
    expect(await listProviderConfigs(alice.id)).toHaveLength(1);
    expect(await deleteProviderKey(bob.id, "TWELVE_DATA")).toBe(false);
    expect(await deleteProviderKey(alice.id, "TWELVE_DATA")).toBe(true);
  });

  it("scopes analyses to their owner", async () => {
    const a = await createAnalysis(alice.id, { symbol: "INFY", exchange: "NSE", companyName: "Infosys", currency: "INR", settings: { horizon: "long" } });
    expect(a.status).toBe("PENDING");
    expect(await getAnalysisForUser(alice.id, a.id)).toMatchObject({ ticker: "INFY", analysisSettings: { horizon: "long" } });
    expect(await getAnalysisForUser(bob.id, a.id)).toBeNull();
    expect(await listAnalyses(bob.id)).toHaveLength(0);
    expect(await setAnalysisSaved(bob.id, a.id, true)).toBe(false);
    expect(await setAnalysisSaved(alice.id, a.id, true)).toBe(true);
    expect(await listAnalyses(alice.id, { savedOnly: true })).toHaveLength(1);

    await createAnalysis(alice.id, { symbol: "INFY", exchange: "NSE", companyName: "Infosys", settings: {} });
    await createAnalysis(alice.id, { symbol: "AAPL", exchange: "NASDAQ", companyName: "Apple", settings: {} });
    const recent = await listRecentStocks(alice.id);
    expect(recent.map((r) => r.ticker).sort()).toEqual(["AAPL", "INFY"]);
  });

  it("manages a per-user watchlist without duplicates", async () => {
    await addToWatchlist(alice.id, { symbol: "TATAMOTORS", exchange: "NSE", companyName: "Tata Motors", currency: "INR" });
    await addToWatchlist(alice.id, { symbol: "TATAMOTORS", exchange: "NSE", companyName: "Tata Motors Ltd", currency: "INR" });
    const list = await listWatchlist(alice.id);
    expect(list).toHaveLength(1);
    expect(list[0].companyName).toBe("Tata Motors Ltd");
    expect(await isOnWatchlist(bob.id, "TATAMOTORS", "NSE")).toBe(false);
    expect(await removeFromWatchlist(bob.id, { symbol: "TATAMOTORS", exchange: "NSE" })).toBe(false);
    expect(await removeFromWatchlist(alice.id, { symbol: "TATAMOTORS", exchange: "NSE" })).toBe(true);
  });

  it("cascades deletes from users", async () => {
    const temp = { id: crypto.randomUUID(), email: `tmp-${Date.now()}@test.local` };
    await ensureUserRecord(temp);
    await createAnalysis(temp.id, { symbol: "X", exchange: "NSE", companyName: "X", settings: {} });
    await prisma.user.delete({ where: { id: temp.id } });
    expect(await prisma.analysis.count({ where: { userId: temp.id } })).toBe(0);
  });
});
