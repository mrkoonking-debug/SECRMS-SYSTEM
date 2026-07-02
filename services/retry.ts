
import { MAX_RETRIES, RETRY_BASE_DELAY_MS } from '../constants/config';

/**
 * Retry wrapper สำหรับ Firestore calls ที่อาจ fail เพราะเน็ตหลุด
 * ใช้ exponential backoff: 1s → 2s → 4s
 * 
 * ป้องกันข้อมูลไม่ถูกบันทึกเพราะเน็ตหลุดชั่วคราว
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    baseDelayMs?: number;
    onRetry?: (attempt: number, error: unknown) => void;
  }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? MAX_RETRIES;
  const baseDelay = options?.baseDelayMs ?? RETRY_BASE_DELAY_MS;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      // Don't retry auth/permission errors — they won't succeed on retry
      if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        if (
          msg.includes('unauthorized') ||
          msg.includes('permission') ||
          msg.includes('not configured') ||
          msg.includes('unauthenticated')
        ) {
          throw error;
        }
      }

      // Don't retry if we've exhausted all attempts
      if (attempt === maxRetries) break;

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      options?.onRetry?.(attempt + 1, error);
      console.warn(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
