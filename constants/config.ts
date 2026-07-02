
// ==========================================
// ค่าคงที่ของระบบ (System Configuration)
// รวมตัวเลข "magic numbers" ไว้ที่เดียว
// แก้ไขง่าย ไม่ต้องไล่หาทั่วโค้ด
// ==========================================

// --- เวลา (Days) ---
/** จำนวนวันที่ถือว่างานเกินกำหนด (สำหรับ badge "ต้องดูด่วน") */
export const OVERDUE_DAYS = 15;

/** จำนวนวันที่ถือว่างานเก่า (สำหรับ Dashboard aging bucket) */
export const AGING_BUCKET_1 = 7;   // 0-7 วัน = ปกติ
export const AGING_BUCKET_2 = 15;  // 8-15 วัน = เริ่มช้า

// --- Cache ---
/** Cache TTL สำหรับ Dashboard stats (มิลลิวินาที) */
export const STATS_CACHE_TTL_MS = 30_000; // 30 วินาที

/** Cache TTL สำหรับ Nav counts (มิลลิวินาที) */
export const NAV_COUNTS_CACHE_TTL_MS = 30_000; // 30 วินาที

// --- Pagination ---
/** จำนวนรายการต่อหน้า (ClaimsList) */
export const PAGE_SIZE = 50;

// --- Rate Limiting ---
/** จำนวนครั้งที่ login ผิดก่อนถูก lock */
export const MAX_LOGIN_ATTEMPTS = 5;

/** เวลาที่ถูก lock หลัง login ผิดครบ (มิลลิวินาที) */
export const LOGIN_LOCK_DURATION_MS = 30_000; // 30 วินาที

// --- Batch Processing ---
/** จำนวน documents ต่อ batch สำหรับ bulk operations */
export const BATCH_SIZE = 500;

// --- Auth ---
/** Timeout สำหรับ auth check (มิลลิวินาที) */
export const AUTH_TIMEOUT_MS = 10_000; // 10 วินาที

// --- Retry ---
/** จำนวนครั้งที่ retry เมื่อ Firestore query ล้มเหลว */
export const MAX_RETRIES = 3;

/** เวลาเริ่มต้นของ retry delay (มิลลิวินาที) — exponential backoff */
export const RETRY_BASE_DELAY_MS = 1_000; // 1 วินาที

// --- ID Generation ---
/** จำนวนครั้งที่ retry หาก RMA ID ซ้ำ */
export const MAX_ID_RETRIES = 5;
