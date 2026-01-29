/**
 * Shared notification utilities
 */

export interface NotificationResult {
  attendeeId: string;
  attendeeName: string;
  email: { success: boolean; error?: string };
  sms: { success: boolean; error?: string } | null;
}

/**
 * Simple retry wrapper with exponential backoff for transient failures
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 2)
 * @returns Result of the function if successful
 * @throws Last error if all retries fail
 */
export async function sendWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s...
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}
