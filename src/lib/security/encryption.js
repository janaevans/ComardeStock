import crypto from "node:crypto";
import { AppError, ErrorCodes } from "../errors.js";

/**
 * AES-256-GCM encryption for user-supplied API keys stored in the database.
 *
 * Format: v1:<iv base64>:<auth tag base64>:<ciphertext base64>
 * The master key comes from ENCRYPTION_KEY (32 bytes, base64 or hex encoded).
 * Generate one with:  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */
const VERSION = "v1";
const IV_BYTES = 12;

export function parseMasterKey(raw) {
  if (!raw) {
    throw new AppError(
      ErrorCodes.CONFIG_MISSING,
      "ENCRYPTION_KEY is not configured on the server, so API keys cannot be stored securely.",
      { status: 503 }
    );
  }
  let buf;
  if (/^[0-9a-f]{64}$/i.test(raw)) buf = Buffer.from(raw, "hex");
  else buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new AppError(
      ErrorCodes.CONFIG_MISSING,
      "ENCRYPTION_KEY must decode to exactly 32 bytes (base64 or 64 hex characters).",
      { status: 503 }
    );
  }
  return buf;
}

export function encryptSecret(plaintext, masterKey = parseMasterKey(process.env.ENCRYPTION_KEY)) {
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new AppError(ErrorCodes.VALIDATION, "Secret must be a non-empty string.", { status: 400 });
  }
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptSecret(payload, masterKey = parseMasterKey(process.env.ENCRYPTION_KEY)) {
  const parts = typeof payload === "string" ? payload.split(":") : [];
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new AppError(ErrorCodes.INTERNAL, "Stored credential has an unrecognized format.", { status: 500 });
  }
  const [, ivB64, tagB64, dataB64] = parts;
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
  } catch (cause) {
    throw new AppError(
      ErrorCodes.INTERNAL,
      "Stored credential could not be decrypted. ENCRYPTION_KEY may have changed; re-enter the key in Settings.",
      { status: 500, cause }
    );
  }
}
