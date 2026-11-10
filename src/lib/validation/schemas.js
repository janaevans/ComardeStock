import { z } from "zod";
import { EXCHANGE_CODES } from "../market-data/exchanges.js";

/**
 * Zod schemas for every external input. Route handlers parse with these
 * before touching providers or the database.
 */

// Tickers: letters, digits and . - & (e.g. BRK.B, M&M, BAJAJ-AUTO). 1–20 chars.
export const tickerSchema = z
  .string()
  .trim()
  .min(1, "Ticker is required.")
  .max(20, "Ticker is too long.")
  .regex(/^[A-Za-z0-9][A-Za-z0-9.&-]*$/, "Ticker may contain only letters, digits, '.', '-' and '&'.")
  .transform((s) => s.toUpperCase());

export const exchangeSchema = z
  .string()
  .trim()
  .transform((s) => s.toUpperCase())
  .pipe(z.enum(EXCHANGE_CODES, { message: `Exchange must be one of: ${EXCHANGE_CODES.join(", ")}.` }));

export const searchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, "Enter a company name or ticker.")
    .max(80, "Search text is too long.")
    .regex(/^[\p{L}\p{N} .,&'()-]+$/u, "Search text contains unsupported characters."),
  exchange: z
    .union([exchangeSchema, z.literal("ALL"), z.literal("all"), z.literal("")])
    .optional()
    .transform((v) => (!v || v.toUpperCase() === "ALL" ? null : v)),
});

export const symbolQuerySchema = z.object({
  symbol: tickerSchema,
  exchange: exchangeSchema,
});

export const HISTORY_RANGES = ["1M", "3M", "6M", "1Y", "3Y", "5Y"];

export const historyQuerySchema = symbolQuerySchema.extend({
  range: z.enum(HISTORY_RANGES).default("1Y"),
});

export const PROVIDER_IDS = ["ANTHROPIC", "OPENAI", "TWELVE_DATA", "ALPHA_VANTAGE"];

export const providerKeySchema = z.object({
  provider: z.enum(PROVIDER_IDS),
  apiKey: z
    .string()
    .trim()
    .min(8, "API key looks too short.")
    .max(300, "API key looks too long.")
    .regex(/^[\x21-\x7E]+$/, "API key must not contain spaces or non-printable characters."),
  selectedModel: z
    .string()
    .trim()
    .max(100)
    .regex(/^[A-Za-z0-9._:-]+$/, "Model name contains unsupported characters.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const providerDeleteSchema = z.object({ provider: z.enum(PROVIDER_IDS) });

export const watchlistAddSchema = z.object({
  symbol: tickerSchema,
  exchange: exchangeSchema,
  companyName: z.string().trim().min(1).max(200),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/)
    .optional()
    .nullable(),
});

export const watchlistRemoveSchema = z.object({ symbol: tickerSchema, exchange: exchangeSchema });

/**
 * Optional analysis settings. Every field is optional; nothing is assumed.
 * Used when the user clicks "Analyze Stock" (the debate itself arrives in Phase 3–4).
 */
export const analysisSettingsSchema = z
  .object({
    horizon: z.enum(["short", "medium", "long"]).optional(),
    riskTolerance: z.enum(["low", "moderate", "high"]).optional(),
    investmentAmount: z.number().positive().max(1e12).optional(),
    maxAcceptableLoss: z.number().positive().max(1e12).optional(),
    analysisType: z.enum(["fundamental", "technical", "combined"]).optional(),
  })
  .refine((s) => !(s.investmentAmount && s.maxAcceptableLoss) || s.maxAcceptableLoss <= s.investmentAmount, {
    message: "Maximum acceptable loss cannot exceed the investment amount.",
    path: ["maxAcceptableLoss"],
  });

export const createAnalysisSchema = z.object({
  symbol: tickerSchema,
  exchange: exchangeSchema,
  companyName: z.string().trim().min(1).max(200),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/)
    .optional()
    .nullable(),
  settings: analysisSettingsSchema.default({}),
});

/** Converts URLSearchParams to a plain object for zod parsing. */
export function paramsToObject(searchParams) {
  const out = {};
  for (const [k, v] of searchParams.entries()) out[k] = v;
  return out;
}
