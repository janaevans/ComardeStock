import { listProviderConfigs } from "../db/providerConfigs.js";

/**
 * Configuration status for every external provider, safe to send to the browser.
 * Reports where a key comes from (user, server or none) but never the key.
 */
export const PROVIDER_INFO = Object.freeze({
  ANTHROPIC: { label: "Anthropic Claude", kind: "ai", envVar: "ANTHROPIC_API_KEY", docs: "https://console.anthropic.com/" },
  OPENAI: { label: "OpenAI", kind: "ai", envVar: "OPENAI_API_KEY", docs: "https://platform.openai.com/api-keys" },
  TWELVE_DATA: {
    label: "Twelve Data",
    kind: "market",
    envVar: "TWELVE_DATA_API_KEY",
    docs: "https://twelvedata.com/",
    note: "Recommended. Covers NSE, BSE, US and UK listings (coverage depends on plan).",
  },
  ALPHA_VANTAGE: {
    label: "Alpha Vantage",
    kind: "market",
    envVar: "ALPHA_VANTAGE_API_KEY",
    docs: "https://www.alphavantage.co/support/#api-key",
    note: "Covers US, BSE (.BSE) and LSE listings. NSE is not supported here.",
  },
});

export function buildProviderStatus(userConfigs, env = process.env) {
  const byProvider = new Map(userConfigs.map((c) => [c.provider, c]));
  return Object.entries(PROVIDER_INFO).map(([id, info]) => {
    const user = byProvider.get(id);
    const serverKey = Boolean(env[info.envVar]);
    return {
      id,
      label: info.label,
      kind: info.kind,
      note: info.note ?? null,
      docs: info.docs,
      configured: Boolean(user) || serverKey,
      source: user ? "user" : serverKey ? "server" : "none",
      keyHint: user?.keyHint ?? null,
      selectedModel: user?.selectedModel ?? null,
      updatedAt: user?.updatedAt ?? null,
    };
  });
}

export async function getProviderStatus(userId, env = process.env) {
  const configs = await listProviderConfigs(userId);
  return buildProviderStatus(configs, env);
}
