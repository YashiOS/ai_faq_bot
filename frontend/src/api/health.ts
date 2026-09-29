import { request } from "./client";
import { ENDPOINTS, TIMEOUTS } from "./config";

/** GET /health — resolves true if the backend responds. */
export async function checkHealth(signal?: AbortSignal): Promise<boolean> {
  try {
    await request(ENDPOINTS.health, {
      signal,
      timeoutMs: TIMEOUTS.health,
      fallbackError: "Health check failed.",
    });
    return true;
  } catch {
    return false;
  }
}
