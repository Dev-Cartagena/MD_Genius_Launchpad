import crypto from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Private file storage in a Supabase Storage bucket.
 *
 * Objects are stored at "<userId>/<uuid>/<fileName>". The server issues signed
 * upload URLs only under the caller's own prefix, so the first path segment is
 * a trustworthy owner id. Reads go through the API, which checks access and
 * redirects to a short-lived signed download URL.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "video/mp4",
]);

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("File storage is not configured");
  }
}

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new StorageNotConfiguredError();
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

function bucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET || "uploads";
}

export function isAllowedContentType(contentType: string): boolean {
  return ALLOWED_CONTENT_TYPES.has(contentType);
}

function safeFileName(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() || "file";
  const cleaned = base.normalize("NFKD").replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
  return (cleaned || "file").slice(0, 120);
}

/** Owner id encoded in an object path, or null for paths outside the scheme. */
export function ownerOfPath(path: string): string | null {
  const match = /^([0-9a-f-]{36})\/[0-9a-f-]{36}\/[^/]+$/i.exec(path);
  return match ? match[1] : null;
}

export async function createSignedUpload(userId: string, fileName: string) {
  const path = `${userId}/${crypto.randomUUID()}/${safeFileName(fileName)}`;
  const { data, error } = await getClient().storage.from(bucket()).createSignedUploadUrl(path);
  if (error || !data) throw error ?? new Error("Could not create upload URL");
  return { uploadUrl: data.signedUrl, path };
}

export async function createSignedDownload(path: string, expiresInSeconds = 60) {
  const { data, error } = await getClient().storage.from(bucket()).createSignedUrl(path, expiresInSeconds);
  if (error || !data) throw error ?? new Error("Could not create download URL");
  return data.signedUrl;
}
