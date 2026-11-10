import { describe, it, expect } from "vitest";
import { ZodError, z } from "zod";
import { resolveMarketDataCredentials, createMarketDataService } from "@/lib/market-data/service";
import { createTtlCache } from "@/lib/market-data/cache";
import { getAuthMode } from "@/lib/auth/config";
import { safeNextPath } from "@/lib/auth/redirects";
import { errorResponse, assertSameOrigin } from "@/lib/api/handler";
import { buildProviderStatus } from "@/lib/providers/status";
import { AppError, ErrorCodes } from "@/lib/errors";

describe("market-data credential resolution", () => {
  const userKeys = (map) => async (id) => (map[id] ? { apiKey: map[id] } : null);

  it("prefers the user's own key, honouring their preferred provider", async () => {
    const r = await resolveMarketDataCredentials({ getUserKey: userKeys({ TWELVE_DATA: "u-td", ALPHA_VANTAGE: "u-av" }), preferred: "ALPHA_VANTAGE", env: {} });
    expect(r).toEqual({ providerId: "ALPHA_VANTAGE", apiKey: "u-av", keySource: "user" });
  });

  it("falls back to server keys, honouring MARKET_DATA_PROVIDER", async () => {
    const r = await resolveMarketDataCredentials({
      getUserKey: userKeys({}),
      env: { TWELVE_DATA_API_KEY: "s-td", ALPHA_VANTAGE_API_KEY: "s-av", MARKET_DATA_PROVIDER: "alpha_vantage" },
    });
    expect(r).toEqual({ providerId: "ALPHA_VANTAGE", apiKey: "s-av", keySource: "server" });
  });

  it("raises a setup error when nothing is configured", async () => {
    await expect(resolveMarketDataCredentials({ getUserKey: userKeys({}), env: {} })).rejects.toMatchObject({
      code: ErrorCodes.PROVIDER_NOT_CONFIGURED,
      status: 503,
      details: { setupPath: "/settings/providers" },
    });
  });
});

describe("market-data service", () => {
  const fakeProvider = (results) => {
    let calls = 0;
    return {
      id: "FAKE",
      name: "Fake Data",
      get calls() {
        return calls;
      },
      async searchSymbols() {
        calls++;
        return results;
      },
      async getQuote(s, e) {
        calls++;
        return { symbol: s, exchange: e, price: 1 };
      },
    };
  };

  it("requires confirmation unless there is exactly one unambiguous match", async () => {
    const one = createMarketDataService({ provider: fakeProvider([{ symbol: "A", exchange: "NSE" }]), cache: createTtlCache() });
    expect((await one.searchSymbols("a")).requiresConfirmation).toBe(false);
    const many = createMarketDataService({ provider: fakeProvider([{ symbol: "A", exchange: "NSE" }, { symbol: "A", exchange: "BSE" }]), cache: createTtlCache() });
    expect((await many.searchSymbols("a")).requiresConfirmation).toBe(true);
    const unclear = createMarketDataService({ provider: fakeProvider([{ symbol: "A", exchange: null, exchangeOptions: ["NASDAQ", "NYSE"] }]), cache: createTtlCache() });
    expect((await unclear.searchSymbols("a")).requiresConfirmation).toBe(true);
  });

  it("caches per provider and marks cached responses", async () => {
    const p = fakeProvider([]);
    const s = createMarketDataService({ provider: p, cache: createTtlCache() });
    expect((await s.getQuote("INFY", "NSE")).cached).toBe(false);
    expect((await s.getQuote("INFY", "NSE")).cached).toBe(true);
    expect(p.calls).toBe(1);
  });

  it("rejects unsupported exchanges", async () => {
    const s = createMarketDataService({ provider: fakeProvider([]), cache: createTtlCache() });
    await expect(s.getQuote("X", "MOON")).rejects.toMatchObject({ code: ErrorCodes.UNSUPPORTED_EXCHANGE });
  });
});

describe("auth mode", () => {
  it("uses Supabase when configured", () => {
    expect(getAuthMode({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "k" })).toBe("supabase");
  });
  it("allows dev-local only off Vercel and not in production builds without opt-in", () => {
    expect(getAuthMode({ AUTH_MODE: "dev-local", NODE_ENV: "development" })).toBe("dev-local");
    expect(getAuthMode({ AUTH_MODE: "dev-local", NODE_ENV: "development", VERCEL: "1" })).toBe("unconfigured");
    expect(getAuthMode({ AUTH_MODE: "dev-local", NODE_ENV: "production" })).toBe("unconfigured");
    expect(getAuthMode({ AUTH_MODE: "dev-local", NODE_ENV: "production", ALLOW_DEV_AUTH_IN_PRODUCTION_BUILD: "local-only" })).toBe("dev-local");
    expect(getAuthMode({ AUTH_MODE: "dev-local", NODE_ENV: "production", VERCEL_ENV: "preview", ALLOW_DEV_AUTH_IN_PRODUCTION_BUILD: "local-only" })).toBe("unconfigured");
  });
  it("is unconfigured with nothing set", () => expect(getAuthMode({})).toBe("unconfigured"));
});

describe("post-login redirects", () => {
  it.each([
    ["/stocks/NSE/INFY", "/stocks/NSE/INFY"],
    ["https://evil.example", "/dashboard"],
    ["//evil.example", "/dashboard"],
    ["/\\evil.example", "/dashboard"],
    ["/ok\r\nSet-Cookie: x", "/dashboard"],
    [undefined, "/dashboard"],
  ])("%j → %s", (input, expected) => expect(safeNextPath(input)).toBe(expected));
});

describe("API error responses", () => {
  it("turns ZodError into a 400 with field details", async () => {
    let zerr;
    try {
      z.object({ a: z.string() }).parse({});
    } catch (e) {
      zerr = e;
    }
    expect(zerr).toBeInstanceOf(ZodError);
    const res = errorResponse(zerr);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details[0].path).toBe("a");
  });

  it("hides internal error details", async () => {
    const res = errorResponse(new Error("password=hunter2 at db.internal"));
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain("hunter2");
    expect(JSON.parse(text).error.code).toBe("INTERNAL_ERROR");
  });

  it("sets Retry-After for rate limits", () => {
    const res = errorResponse(new AppError(ErrorCodes.RATE_LIMITED, "slow down", { status: 429, retryAfterSeconds: 12 }));
    expect(res.headers.get("retry-after")).toBe("12");
  });

  it("rejects cross-origin state-changing requests", () => {
    const req = (origin, host = "app.example.com") => new Request("https://app.example.com/api/x", { method: "POST", headers: { origin, host } });
    expect(() => assertSameOrigin(req("https://evil.example"))).toThrow(/Cross-origin/);
    expect(() => assertSameOrigin(req("https://app.example.com"))).not.toThrow();
  });
});

describe("provider status", () => {
  it("reports sources without exposing keys", () => {
    const status = buildProviderStatus(
      [{ provider: "OPENAI", keyHint: "••••abcd", selectedModel: null, updatedAt: new Date(0) }],
      { TWELVE_DATA_API_KEY: "server-secret-value" }
    );
    const by = Object.fromEntries(status.map((s) => [s.id, s]));
    expect(by.OPENAI).toMatchObject({ configured: true, source: "user", keyHint: "••••abcd" });
    expect(by.TWELVE_DATA).toMatchObject({ configured: true, source: "server", keyHint: null });
    expect(by.ANTHROPIC).toMatchObject({ configured: false, source: "none" });
    expect(JSON.stringify(status)).not.toContain("server-secret-value");
  });
});
