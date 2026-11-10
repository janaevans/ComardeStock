import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { encryptSecret, decryptSecret, parseMasterKey } from "@/lib/security/encryption";
import { keyHint, redactUrl, redactObject } from "@/lib/security/redact";
import { createMemoryStore, enforceRateLimit } from "@/lib/security/rateLimit";
import { ErrorCodes } from "@/lib/errors";

const key = crypto.randomBytes(32);

describe("encryption", () => {
  it("round-trips a secret and never stores plaintext", () => {
    const secret = "sk-test-1234567890abcdef";
    const enc = encryptSecret(secret, key);
    expect(enc).toMatch(/^v1:/);
    expect(enc).not.toContain(secret);
    expect(decryptSecret(enc, key)).toBe(secret);
  });

  it("uses a fresh IV each time", () => {
    expect(encryptSecret("same-secret-value", key)).not.toBe(encryptSecret("same-secret-value", key));
  });

  it("detects tampering and a wrong key", () => {
    const enc = encryptSecret("secret-value-123", key);
    const parts = enc.split(":");
    const tampered = [...parts.slice(0, 3), Buffer.from("xxxx").toString("base64")].join(":");
    expect(() => decryptSecret(tampered, key)).toThrow(/could not be decrypted/);
    expect(() => decryptSecret(enc, crypto.randomBytes(32))).toThrow(/could not be decrypted/);
  });

  it("validates the master key", () => {
    expect(() => parseMasterKey("")).toThrow(/not configured/);
    expect(() => parseMasterKey(Buffer.alloc(16).toString("base64"))).toThrow(/32 bytes/);
    expect(parseMasterKey("ab".repeat(32))).toHaveLength(32);
    expect(parseMasterKey(key.toString("base64"))).toEqual(key);
  });
});

describe("redaction", () => {
  it("shows at most the last four characters of a key", () => {
    expect(keyHint("abcdefghijkl1234")).toBe("••••1234");
    expect(keyHint("short")).toBe("••••");
    expect(keyHint("")).toBe("");
  });

  it("removes keys from URLs and objects", () => {
    expect(redactUrl("https://api.x.com/quote?symbol=A&apikey=SECRET123")).toBe("https://api.x.com/quote?symbol=A&apikey=[REDACTED]");
    const out = redactObject({ apiKey: "s", nested: { authorization: "Bearer x", ok: 1 }, url: "https://a?apikey=Z" });
    expect(out).toEqual({ apiKey: "[REDACTED]", nested: { authorization: "[REDACTED]", ok: 1 }, url: "https://a?apikey=[REDACTED]" });
  });
});

describe("rate limiting", () => {
  it("allows up to the limit then rejects with retry-after", async () => {
    const store = createMemoryStore();
    const now = 1_000_000;
    for (let i = 0; i < 30; i++) await enforceRateLimit("u1", "search", { store, now });
    await expect(enforceRateLimit("u1", "search", { store, now })).rejects.toMatchObject({
      code: ErrorCodes.RATE_LIMITED,
      status: 429,
      retryAfterSeconds: 60,
    });
    // Other users are unaffected; the window resets.
    await expect(enforceRateLimit("u2", "search", { store, now })).resolves.toBeTruthy();
    await expect(enforceRateLimit("u1", "search", { store, now: now + 60_001 })).resolves.toMatchObject({ remaining: 29 });
  });
});
