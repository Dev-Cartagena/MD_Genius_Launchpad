import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts a human readable message from errors thrown by apiRequest,
 * which look like `400: {"message":"..."}` or `503: plain text`.
 */
export function getApiErrorMessage(error: unknown, fallback = "Please try again."): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const body = raw.replace(/^\d{3}:\s*/, "");
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed.message === "string" && parsed.message) return parsed.message;
  } catch {
    // not JSON
  }
  return body && !body.trim().startsWith("<") ? body : fallback;
}
