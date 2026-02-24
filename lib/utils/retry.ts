/**
 * Executes a fetch with a timeout and retries on failure using exponential backoff.
 *
 * @param url - The URL to fetch
 * @param options - Standard RequestInit options (body, headers, method, etc.)
 * @param retries - Maximum number of attempts (default: 3)
 * @param timeoutMs - Per-attempt timeout in milliseconds (default: 15000)
 * @returns The successful Response
 * @throws The last error if all attempts are exhausted
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  timeoutMs = 15000
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);

      // Treat 5xx as transient errors worth retrying; 4xx are client errors — don't retry
      if (response.status >= 500 && attempt < retries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await sleep(delay);
        continue;
      }

      return response;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;

      if (attempt < retries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
