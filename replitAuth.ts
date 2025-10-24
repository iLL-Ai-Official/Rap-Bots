// Lightweight Replit auth helper that falls back to local .env for development.
//
// Key goals:
// - Don't crash at module load if Replit env vars are absent.
// - Let local developers run the project by using dotenv.
// - Export factory functions (no top-level async/await or network calls).

import dotenv from "dotenv";

if (process.env.NODE_ENV !== "production" && !process.env.REPLIT_DB_URL) {
  // load .env for local development
  dotenv.config();
}

/**
 * Read credentials from environment (works on Replit or locally via .env).
 * Returns an object with optional `dbUrl` and `token`.
 */
export function getReplitConfig(): { dbUrl?: string; token?: string } {
  const dbUrl = process.env.REPLIT_DB_URL || process.env.DATABASE_URL || undefined;
  const token = process.env.REPLIT_TOKEN || process.env.REPLIT_API_TOKEN || undefined;
  return { dbUrl, token };
}

/**
 * Create and return a Replit DB client if a DB URL exists.
 * - This factory defers construction to runtime and returns null if no DB url found.
 * - Keep the dependency optional for environments without @replit/database installed.
 */
export function createReplitDbClient(): any | null {
  const { dbUrl } = getReplitConfig();
  if (!dbUrl) return null;

  // Try to require @replit/database at runtime so local dev without the package
  // doesn't crash at import time. If you do have @replit/database, it will be used.
  try {
    // CommonJS require so it works with both ESM/TS setups that compile to CommonJS.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ReplitDatabase = require("@replit/database");
    // Some packages export a default class, some a factory. Try both safe patterns:
    if (typeof ReplitDatabase === "function") {
      return new ReplitDatabase(dbUrl);
    } else if (ReplitDatabase && typeof ReplitDatabase.default === "function") {
      return new ReplitDatabase.default(dbUrl);
    } else {
      // If shape is unknown, attempt to call as factory
      return ReplitDatabase(dbUrl);
    }
  } catch (err) {
    // If the package isn't installed locally, return null and let caller handle fallback.
    // Consumers should check for null and use an alternative or throw a friendly error.
    return null;
  }
}

/**
 * Example helper to ensure callers get a usable DB or a clear error.
 * Callers can import ensureDbClient and handle the missing client (e.g., use an in-memory fallback).
 */
export function ensureDbClientOrThrow(): any {
  const client = createReplitDbClient();
  if (!client) {
    throw new Error(
      "No Replit DB client available. Set REPLIT_DB_URL / DATABASE_URL in your environment or install @replit/database locally."
    );
  }
  return client;
}

export default {
  getReplitConfig,
  createReplitDbClient,
  ensureDbClientOrThrow,
};
