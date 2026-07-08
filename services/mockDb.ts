
import { RMA, RMAStatus, DashboardStats, Team, TimelineEvent, Brand, Distributor, PettyCashTransaction, PettyCashSummary } from '../types';
import { db, auth, isConfigured, firebaseConfig } from './firebaseConfig';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  collection, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, Timestamp, limit, serverTimestamp, startAfter, QueryDocumentSnapshot,
  getCountFromServer, runTransaction, addDoc, writeBatch
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword, getAuth
} from 'firebase/auth';
import { BRAND_OPTIONS, DISTRIBUTOR_OPTIONS } from '../constants/options';
import { MAX_LOGIN_ATTEMPTS, LOGIN_LOCK_DURATION_MS, STATS_CACHE_TTL_MS, NAV_COUNTS_CACHE_TTL_MS, BATCH_SIZE, MAX_ID_RETRIES, OVERDUE_DAYS, AGING_BUCKET_1, AGING_BUCKET_2 } from '../constants/config';
import { withRetry } from './retry';
import { flattenRMAUpdates } from './flattenUpdates';

import { SEED_CLAIMS } from './seedData';

let currentUser: any = null;
let OFFLINE_STORAGE: RMA[] = SEED_CLAIMS as any;
// In-memory stats cache (30 second TTL)
let _statsCache: { key: string; data: any; ts: number } | null = null;
// Login rate limiter
let _loginAttempts = 0;
let _loginLockUntil = 0;
// Nav counts cache (30 second TTL)
let _navCountsCache: { data: { unassigned: number; overdue: number }; ts: number } | null = null;
let OFFLINE_USERS: any[] = [
  {
    uid: 'offline-admin',
    name: 'SEC Admin',
    email: 'support@sectechnology.co.th',
    role: 'admin',
    team: 'ALL'
  }
];

let OFFLINE_PETTY_CASH: PettyCashTransaction[] = [
  {
    id: 'tx-seed-1',
    date: '2026-07-01',
    type: 'INCOME',
    amount: 1850,
    description: 'ยอดคงเหลือยกมา',
    category: 'เติมเงินกองกลาง',
    paidBy: 'PETTY_CASH',
    staffName: 'ไอซ์',
    isReimbursed: false,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z'
  },
  {
    id: 'tx-seed-2',
    date: '2026-07-01',
    type: 'EXPENSE',
    amount: 780,
    description: 'ค่าส่งของเก็บปลายทาง (NTC HIP)',
    category: 'ค่าขนส่ง',
    paidBy: 'PETTY_CASH',
    staffName: 'ไอซ์',
    isReimbursed: false,
    note: 'Brand: HIP&ZK',
    createdAt: '2026-07-01T01:00:00.000Z',
    updatedAt: '2026-07-01T01:00:00.000Z'
  },
  {
    id: 'tx-seed-3',
    date: '2026-07-01',
    type: 'EXPENSE',
    amount: 200,
    description: 'ค่าส่งของเก็บปลายทาง (NTC Bennex)',
    category: 'ค่าขนส่ง',
    paidBy: 'PETTY_CASH',
    staffName: 'ไอซ์',
    isReimbursed: false,
    note: 'Brand: HIP&ZK',
    createdAt: '2026-07-01T02:00:00.000Z',
    updatedAt: '2026-07-01T02:00:00.000Z'
  },
  {
    id: 'tx-seed-4',
    date: '2026-07-01',
    type: 'EXPENSE',
    amount: 180,
    description: 'ค่าส่งของเก็บปลายทาง (NTC TCT)',
    category: 'ค่าขนส่ง',
    paidBy: 'PETTY_CASH',
    staffName: 'ไอซ์',
    isReimbursed: false,
    note: 'Brand: VISION Dahua...',
    createdAt: '2026-07-01T03:00:00.000Z',
    updatedAt: '2026-07-01T03:00:00.000Z'
  },
  {
    id: 'tx-seed-5',
    date: '2026-07-02',
    type: 'EXPENSE',
    amount: 90,
    description: 'ค่าส่งของเก็บปลายทาง (NTC HIP)',
    category: 'ค่าขนส่ง',
    paidBy: 'PETTY_CASH',
    staffName: 'ไอซ์',
    isReimbursed: false,
    note: 'Brand: HIP&ZK',
    createdAt: '2026-07-02T01:00:00.000Z',
    updatedAt: '2026-07-02T01:00:00.000Z'
  },
  {
    id: 'tx-seed-6',
    date: '2026-07-02',
    type: 'EXPENSE',
    amount: 270,
    description: 'ค่าส่งของเก็บปลายทาง (NTC HIK)',
    category: 'ค่าขนส่ง',
    paidBy: 'PETTY_CASH',
    staffName: 'ไอซ์',
    isReimbursed: false,
    note: 'Brand: HIKVISION',
    createdAt: '2026-07-02T02:00:00.000Z',
    updatedAt: '2026-07-02T02:00:00.000Z'
  },
  {
    id: 'tx-seed-7',
    date: '2026-07-02',
    type: 'EXPENSE',
    amount: 150,
    description: 'ค่าของใช้สำนักงาน (SHOPEE น้ำยาเช็ดกระจก 2 ขวด)',
    category: 'ค่าของใช้สำนักงาน',
    paidBy: 'PERSONAL_CASH',
    staffName: 'ไอซ์',
    isReimbursed: true,
    note: 'ไอซ์ออกให้ 1 บาท (151 ยอดเดิม)',
    reimbursedAt: '2026-07-02T05:00:00.000Z',
    reimbursedBy: 'SEC Admin',
    createdAt: '2026-07-02T03:00:00.000Z',
    updatedAt: '2026-07-02T05:00:00.000Z'
  },
  {
    id: 'tx-seed-8',
    date: '2026-07-02',
    type: 'EXPENSE',
    amount: 210,
    description: 'ค่าส่งของเก็บปลายทาง (NTC TCT)',
    category: 'ค่าขนส่ง',
    paidBy: 'PETTY_CASH',
    staffName: 'ไอซ์',
    isReimbursed: false,
    note: 'Brand: HIKVISION',
    createdAt: '2026-07-02T04:00:00.000Z',
    updatedAt: '2026-07-02T04:00:00.000Z'
  },
  {
    id: 'tx-seed-9',
    date: '2026-07-03',
    type: 'EXPENSE',
    amount: 500,
    description: 'ค่าป้าแม่บ้าน (Sunee)',
    category: 'ค่าบริการ',
    paidBy: 'PETTY_CASH',
    staffName: 'ไอซ์',
    isReimbursed: false,
    note: 'Brand: HIKVISION',
    createdAt: '2026-07-03T01:00:00.000Z',
    updatedAt: '2026-07-03T01:00:00.000Z'
  },
  {
    id: 'tx-seed-10',
    date: '2026-07-03',
    type: 'INCOME',
    amount: 6000,
    description: 'เบิกเงิน Advance',
    category: 'เติมเงินกองกลาง',
    paidBy: 'PETTY_CASH',
    staffName: 'ไอซ์',
    isReimbursed: false,
    createdAt: '2026-07-03T02:00:00.000Z',
    updatedAt: '2026-07-03T02:00:00.000Z'
  },
  {
    id: 'tx-seed-11',
    date: '2026-07-04',
    type: 'EXPENSE',
    amount: 90,
    description: 'ค่าส่งของเก็บปลายทาง (มาส่ง HIP)',
    category: 'ค่าขนส่ง',
    paidBy: 'PETTY_CASH',
    staffName: 'คง',
    isReimbursed: false,
    createdAt: '2026-07-04T01:00:00.000Z',
    updatedAt: '2026-07-04T01:00:00.000Z'
  },
  {
    id: 'tx-seed-12',
    date: '2026-07-05',
    type: 'EXPENSE',
    amount: 90,
    description: 'ค่าส่งของเก็บปลายทาง (NTC TCT)',
    category: 'ค่าขนส่ง',
    paidBy: 'PETTY_CASH',
    staffName: 'คง',
    isReimbursed: false,
    createdAt: '2026-07-05T01:00:00.000Z',
    updatedAt: '2026-07-05T01:00:00.000Z'
  },
  {
    id: 'tx-seed-13',
    date: '2026-07-06',
    type: 'EXPENSE',
    amount: 90,
    description: 'ค่าส่งของเก็บปลายทาง (NTC TCT)',
    category: 'ค่าขนส่ง',
    paidBy: 'PETTY_CASH',
    staffName: 'ไอซ์',
    isReimbursed: false,
    createdAt: '2026-07-06T01:00:00.000Z',
    updatedAt: '2026-07-06T01:00:00.000Z'
  },
  {
    id: 'tx-seed-14',
    date: '2026-07-06',
    type: 'EXPENSE',
    amount: 1800,
    description: 'จ่ายเบี้ยเลี้ยง (ค่าเงินน้องฝึกงาน ย้อนหลัง 3/7/26)',
    category: 'ค่าแรง/เบี้ยเลี้ยง',
    paidBy: 'PETTY_CASH',
    staffName: 'ส่วนกลาง',
    isReimbursed: false,
    createdAt: '2026-07-06T02:00:00.000Z',
    updatedAt: '2026-07-06T02:00:00.000Z'
  },
  {
    id: 'tx-seed-15',
    date: '2026-07-06',
    type: 'EXPENSE',
    amount: 500,
    description: 'ค่าป้าแม่บ้าน (Sunee)',
    category: 'ค่าบริการ',
    paidBy: 'PETTY_CASH',
    staffName: 'ไอซ์',
    isReimbursed: false,
    createdAt: '2026-07-06T03:00:00.000Z',
    updatedAt: '2026-07-06T03:00:00.000Z'
  },
  {
    id: 'tx-seed-16',
    date: '2026-07-06',
    type: 'EXPENSE',
    amount: 100,
    description: 'ค่าส่งของเก็บปลายทาง (TB Part Express / HIP)',
    category: 'ค่าขนส่ง',
    paidBy: 'PETTY_CASH',
    staffName: 'ไอซ์',
    isReimbursed: false,
    note: 'Brand: HIP&ZK',
    createdAt: '2026-07-06T04:00:00.000Z',
    updatedAt: '2026-07-06T04:00:00.000Z'
  }
];

let OFFLINE_BRANDS: any[] = BRAND_OPTIONS.filter(b => b.value !== 'Other').map((b, i) => ({ id: `brand-${i}`, value: b.value, label: b.label }));
let OFFLINE_DISTRIBUTORS: any[] = DISTRIBUTOR_OPTIONS.filter(d => d.value !== 'Other').map((d, i) => ({ id: `dist-${i}`, value: d.value, label: d.label }));

let OFFLINE_SETTINGS = {
  nameTh: 'บริษัท เอสอีซี เทคโนโลยี จำกัด',
  nameEn: 'SEC Technology Co., Ltd.',
  address: '123 Tech Park, Silicon Avenue, Bangkok 10110',
  taxId: '012555XXXXXXX',
  tel: '02-999-8888',
  logoUrl: '/logo.png',
  website: 'www.sec-technology.com',
  performanceMode: false,
  enableOverdueEmailAlerts: false
};

// Auth ready promise — resolves once onAuthStateChanged fires for the first time
let _authReadyResolve: () => void;
const authReadyPromise = new Promise<void>((resolve) => { _authReadyResolve = resolve; });

if (isConfigured && auth) {
  // Helper: resolve role from Firestore user document
  const resolveUserRole = (email: string | null | undefined, userData: any): string => {
    // Super admins always get 'admin'
    if (email === 'support@sectechnology.co.th' || email === 'admin@sec-claim.com') return 'admin';
    // Everyone else: use Firestore role (but only 'admin' if explicitly set, default to 'staff')
    return userData?.role || 'staff';
  };

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      currentUser = {
        uid: user.uid,
        name: userData.name || user.email?.split('@')[0],
        email: user.email,
        role: resolveUserRole(user.email, userData),
        team: userData.team || 'ALL'
      };
    } else {
      currentUser = null;
    }
    _authReadyResolve();
  });
} else {
  // If Firebase is not configured, resolve immediately
  _authReadyResolve!();
}

const mapDocToRMA = (d: any): RMA => {
  const data = d.data();
  return {
    ...data,
    id: d.id,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt || new Date().toISOString(),
    history: (data.history || []).map((h: any) => ({
      ...h,
      date: h.date?.toDate ? h.date.toDate().toISOString() : h.date
    }))
  } as RMA;
};

export const MockDb = {
  isConfigured,
  login: async (u: string, p: string): Promise<{ success: boolean; error?: string }> => {
    if (!isConfigured || !auth) {
      return { success: false, error: "Firebase Authentication not configured" };
    }
    // Rate limit: block after MAX_LOGIN_ATTEMPTS failed attempts for LOGIN_LOCK_DURATION_MS
    if (_loginLockUntil > Date.now()) {
      const waitSec = Math.ceil((_loginLockUntil - Date.now()) / 1000);
      return { success: false, error: `ลองใหม่อีกครั้งในอีก ${waitSec} วินาที` };
    }
    try {
      const cred = await signInWithEmailAndPassword(auth, u, p);
      const email = cred.user.email;

      // Read role from Firestore user document (same logic as onAuthStateChanged)
      const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      const role = (email === 'support@sectechnology.co.th' || email === 'admin@sec-claim.com') ? 'admin' : (userData?.role || 'staff');

      currentUser = {
        uid: cred.user.uid,
        name: userData?.name || email?.split('@')[0],
        email: email,
        role: role,
        team: userData?.team || 'ALL'
      };
      _loginAttempts = 0; // Reset on success
      return { success: true };
    } catch (e: unknown) {
      _loginAttempts++;
      if (_loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        _loginLockUntil = Date.now() + LOGIN_LOCK_DURATION_MS;
        _loginAttempts = 0;
      }
      return { success: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
    }
  },

  // registerAdmin removed — create admin accounts via Firebase Console only


  logout: async () => {
    if (isConfigured && auth) await signOut(auth);
    currentUser = null;
  },

  isAuthenticated: () => !!currentUser,
  getCurrentUser: () => currentUser,
  waitForAuth: () => authReadyPromise,

  // --- Dynamic Brands Management ---
  getBrands: async (): Promise<Brand[]> => {
    if (!isConfigured || !db) throw new Error("Firebase Not Configured");
    try {
      const snap = await getDocs(collection(db, 'brands'));
      // Only use fallback if collection is truly empty AND we want initial seed, 
      // but for "Force Firebase", we should arguably just return empty or seed it. 
      // Let's return empty if empty.
      return snap.empty ? [] : snap.docs.map(d => ({ id: d.id, ...d.data() } as Brand));
    } catch (e) {
      console.error("Error fetching brands:", e);
      throw e;
    }
  },
  addBrand: async (brand: any) => {
    if (!isConfigured || !db) throw new Error("Firebase Not Configured");
    if (currentUser?.role !== 'admin') throw new Error('Unauthorized: admin access required');
    // Generate sequential ID: find highest existing brand-N and increment
    const snap = await getDocs(collection(db, 'brands'));
    let maxNum = -1;
    snap.docs.forEach(d => {
      const match = d.id.match(/^brand-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const id = `brand-${maxNum + 1}`;
    await setDoc(doc(db, 'brands', id), { ...brand, id });
  },
  updateBrand: async (id: string, updates: any) => {
    if (!isConfigured || !db) throw new Error("Firebase Not Configured");
    if (currentUser?.role !== 'admin') throw new Error('Unauthorized: admin access required');
    await updateDoc(doc(db, 'brands', id), updates);
  },
  deleteBrand: async (id: string) => {
    if (!isConfigured || !db) throw new Error("Firebase Not Configured");
    if (currentUser?.role !== 'admin') throw new Error('Unauthorized: admin access required');
    await deleteDoc(doc(db, 'brands', id));
  },

  // --- Dynamic Distributors Management ---
  getDistributors: async (): Promise<Distributor[]> => {
    if (!isConfigured || !db) throw new Error("Firebase Not Configured");
    try {
      const snap = await getDocs(collection(db, 'distributors'));
      return snap.empty ? [] : snap.docs.map(d => ({ id: d.id, ...d.data() } as Distributor));
    } catch (e) {
      console.error("Error fetching distributors:", e);
      throw e;
    }
  },
  addDistributor: async (dist: any) => {
    if (!isConfigured || !db) throw new Error("Firebase Not Configured");
    if (currentUser?.role !== 'admin') throw new Error('Unauthorized: admin access required');
    // Generate sequential ID: find highest existing dist-N and increment
    const snap = await getDocs(collection(db, 'distributors'));
    let maxNum = -1;
    snap.docs.forEach(d => {
      const match = d.id.match(/^dist-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const id = `dist-${maxNum + 1}`;
    await setDoc(doc(db, 'distributors', id), { ...dist, id });
  },
  updateDistributor: async (id: string, updates: any) => {
    if (!isConfigured || !db) throw new Error("Firebase Not Configured");
    if (currentUser?.role !== 'admin') throw new Error('Unauthorized: admin access required');
    await updateDoc(doc(db, 'distributors', id), updates);
  },
  deleteDistributor: async (id: string) => {
    if (!isConfigured || !db) throw new Error("Firebase Not Configured");
    if (currentUser?.role !== 'admin') throw new Error('Unauthorized: admin access required');
    await deleteDoc(doc(db, 'distributors', id));
  },

  // --- Settings ---
  getSettings: async () => {
    if (!isConfigured || !db) throw new Error("Firebase Not Configured");
    try {
      const snap = await getDoc(doc(db, 'settings', 'config'));
      return snap.exists() ? snap.data() : OFFLINE_SETTINGS; // Keep default settings if DB doc missing, but from memory/const not offline mode per se
    } catch (e) {
      console.error("getSettings failed:", e);
      throw e;
    }
  },
  updateSettings: async (s: any) => {
    if (!isConfigured || !db) throw new Error("Firebase Not Configured");
    if (currentUser?.role !== 'admin') throw new Error('Unauthorized: admin access required');
    try { await setDoc(doc(db, 'settings', 'config'), s); } catch (e) { console.error("updateSettings failed", e); throw e; }
  },
  checkAndSendOverdueEmails: async () => {
    if (!isConfigured || !db) return;
    
    // Prevent running if checked in the last 1 hour (cooldown check to avoid duplicate mail triggers)
    try {
      const lastCheck = localStorage.getItem('lastOverdueCheck');
      const now = Date.now();
      if (lastCheck && now - parseInt(lastCheck, 10) < 60 * 60 * 1000) {
        return;
      }
      localStorage.setItem('lastOverdueCheck', now.toString());
    } catch (e) {
      console.warn("Storage access failed:", e);
    }

    try {
      const settings = await MockDb.getSettings();
      if (!settings?.enableOverdueEmailAlerts) return;

      const rmasRef = collection(db, 'rmas');
      // Fetch only active status documents (where status is not closed/repaired/cancelled) to avoid full scans
      const snap = await getDocs(query(rmasRef, where('status', 'not-in', [RMAStatus.CLOSED, RMAStatus.REPAIRED, RMAStatus.CANCELLED])));
      const docs = snap.docs.map(doc => doc.data() as RMA).filter(r => !r.isDeleted);
      const now = Date.now();
      const overdueLimit = 15 * 24 * 60 * 60 * 1000; // 15 days

      for (const rma of docs) {
        // Find document reference from Firestore list to update it later
        const docSnap = snap.docs.find(d => d.id === rma.id || d.data().id === rma.id);
        if (!docSnap) continue;
        const isOverdue = now - new Date(rma.createdAt).getTime() > overdueLimit;

        if (isOverdue && rma.creatorEmail && !rma.overdueEmailSent) {
          // 1. Write to standard firebase 'mail' collection
          const mailRef = collection(db, 'mail');
          await addDoc(mailRef, {
            to: rma.creatorEmail,
            message: {
              subject: `[SEC RMS - แจ้งเตือนด่วน] งานเคลมรุ่น ${rma.productModel} เกินกำหนดเวลา 15 วัน`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eef2f6; border-radius: 12px;">
                  <h2 style="color: #ef4444; margin-top: 0;">⚠️ แจ้งเตือนงานเคลมล่าช้า (Overdue Alert)</h2>
                  <p>สวัสดีครับคุณ <strong>${rma.createdBy || 'Staff'}</strong>,</p>
                  <p>งานเคลมที่คุณเป็นผู้สร้างเข้าระระบบมีอายุงานเกิน <strong>15 วัน</strong> แล้วและยังดำเนินการไม่เสร็จสิ้น กรุณาตรวจสอบและติดตามงานโดยเร็ว:</p>
                  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold; width: 120px; border-bottom: 1px solid #f1f5f9;">รหัสงานเคลม:</td>
                      <td style="padding: 8px 0; font-family: monospace; font-size: 14px; border-bottom: 1px solid #f1f5f9;">${rma.id}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #f1f5f9;">ยี่ห้อ / รุ่น:</td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">${rma.brand} ${rma.productModel}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #f1f5f9;">Serial Number:</td>
                      <td style="padding: 8px 0; font-family: monospace; border-bottom: 1px solid #f1f5f9;">${rma.serialNumber}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #f1f5f9;">วันที่สร้าง:</td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">${new Date(rma.createdAt).toLocaleString('th-TH')}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #f1f5f9;">สถานะปัจจุบัน:</td>
                      <td style="padding: 8px 0; color: #f59e0b; font-weight: bold; border-bottom: 1px solid #f1f5f9;">${rma.status}</td>
                    </tr>
                  </table>
                  <p style="margin-bottom: 25px;">คุณสามารถคลิกเข้าไปดูรายละเอียดและบันทึกประวัติการส่งซ่อมได้ที่ปุ่มด้านล่างนี้:</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${window.location.origin}/admin/job/${encodeURIComponent(rma.groupRequestId || rma.id)}" style="display: inline-block; background-color: #0071e3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">ดูรายละเอียดและจัดการงานเคลม</a>
                  </div>
                  <hr style="border: none; border-top: 1px solid #eef2f6; margin: 30px 0;"/>
                  <p style="font-size: 11px; color: #86868b; line-height: 1.5;">อีเมลนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบ SEC Claim RMS หากงานเคลมนี้เสร็จสิ้นแล้วกรุณาเปลี่ยนสถานะในระบบเป็น 'ซ่อมเสร็จ / พร้อมคืน' หรือ 'ปิดงาน' เพื่อปิดรับการแจ้งเตือน</p>
                </div>
              `
            }
          });

          // 2. Set overdueEmailSent = true in the rmas doc to avoid repeat emails
          await updateDoc(docSnap.ref, {
            overdueEmailSent: true,
            updatedAt: serverTimestamp()
          });

          // 3. Log to timeline event
          const currentHistory = rma.history || [];
          await updateDoc(docSnap.ref, {
            history: [...currentHistory, {
              id: `evt-${Date.now()}`,
              date: Timestamp.now(),
              type: 'SYSTEM',
              description: `ระบบส่งอีเมลแจ้งเตือนงานล่าช้าไปยังผู้สร้างเรียบร้อย (${rma.creatorEmail})`,
              user: 'System'
            }]
          });
        }
      }
    } catch (err) {
      console.error("checkAndSendOverdueEmails failed:", err);
    }
  },

  sendOverdueSummaryToEveryone: async (): Promise<{ sentCount: number; status: string }> => {
    if (!isConfigured || !db) throw new Error("Firebase Not Configured");
    
    // 1. Fetch users
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    const usersList = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
    
    // 2. Fetch only active RMAs to avoid full collection scan
    const rmasRef = collection(db, 'rmas');
    const activeRmasSnap = await getDocs(query(rmasRef, where('status', 'not-in', [RMAStatus.CLOSED, RMAStatus.REPAIRED, RMAStatus.CANCELLED, RMAStatus.REJECTED, RMAStatus.RETURNED_FROM_VENDOR])));
    const activeRmas = activeRmasSnap.docs
      .map(doc => doc.data() as RMA)
      .filter(rma => !rma.isDeleted);

    if (activeRmas.length === 0) {
      return { sentCount: 0, status: 'No active RMAs found' };
    }

    let sentCount = 0;
    const unassignedRmas: RMA[] = [];
    const userRmaMap = new Map<string, RMA[]>();

    // Initialize map keys for all user emails in lowercase
    for (const user of usersList) {
      if (user.email) {
        userRmaMap.set(user.email.toLowerCase(), []);
      }
    }

    // Map active RMAs to user lists
    for (const rma of activeRmas) {
      let matched = false;
      
      // Map by creatorEmail first
      if (rma.creatorEmail) {
        const emailKey = rma.creatorEmail.toLowerCase();
        if (userRmaMap.has(emailKey)) {
          userRmaMap.get(emailKey)!.push(rma);
          matched = true;
        }
      }
      
      // If not matched, try matching createdBy name to user name
      if (!matched && rma.createdBy) {
        const creatorNameLower = rma.createdBy.toLowerCase();
        const matchedUser = usersList.find(u => u.name && u.name.toLowerCase() === creatorNameLower);
        if (matchedUser && matchedUser.email) {
          const emailKey = matchedUser.email.toLowerCase();
          userRmaMap.get(emailKey)!.push(rma);
          matched = true;
        }
      }
      
      if (!matched) {
        unassignedRmas.push(rma);
      }
    }

    // 3. For each user, send summary email
    for (const user of usersList) {
      if (!user.email) continue;
      
      const emailKey = user.email.toLowerCase();
      const userRmas = userRmaMap.get(emailKey) || [];
      
      // If user is an admin, append the unassigned RMAs list to their email
      const isAdmin = user.role === 'admin';
      const rmasToInclude = [...userRmas];
      if (isAdmin && unassignedRmas.length > 0) {
        rmasToInclude.push(...unassignedRmas);
      }

      if (rmasToInclude.length === 0) continue;

      // 4. Construct table rows
      const rmasListHtml = rmasToInclude.map(rma => {
        const isUnassigned = unassignedRmas.includes(rma);
        return `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px; font-family: monospace; font-size: 13px; font-weight: bold; color: #1d1d1f;">${rma.id}</td>
            <td style="padding: 10px; font-size: 13px; color: #434345;">${rma.brand} ${rma.productModel}</td>
            <td style="padding: 10px; font-family: monospace; font-size: 12px; color: #86868b;">${rma.serialNumber}</td>
            <td style="padding: 10px; font-size: 12px;">
              <span style="background-color: #fef3c7; color: #d97706; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 11px;">
                ${rma.status}
              </span>
              ${isUnassigned ? `<br/><span style="color: #ef4444; font-size: 9px; font-weight: bold;">(ไม่มีผู้สร้างในระบบ)</span>` : ''}
            </td>
            <td style="padding: 10px; font-size: 12px; color: #86868b;">
              ${new Date(rma.createdAt).toLocaleDateString('th-TH')}
            </td>
          </tr>
        `;
      }).join('');

      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 40px;">📋</span>
            <h2 style="color: #1d1d1f; margin-top: 10px; margin-bottom: 5px;">สรุปรายการงานเคลมค้างดำเนินการ (Pending Summary)</h2>
            <p style="color: #86868b; font-size: 14px; margin: 0;">เรียนคุณ ${user.name} - ข้อมูลสรุป ณ วันที่ ${new Date().toLocaleDateString('th-TH')}</p>
          </div>
          
          <p style="color: #434345; font-size: 14px; line-height: 1.6;">ระบบได้รวบรวมรายการใบงานเคลมที่ค้างดำเนินการในระบบจำนวนทั้งหมด <strong>${rmasToInclude.length} รายการ</strong> ดังรายละเอียดตารางด้านล่างนี้:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; text-align: left;">
            <thead>
              <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                <th style="padding: 12px 10px; font-size: 13px; font-weight: bold; color: #475569;">Job ID</th>
                <th style="padding: 12px 10px; font-size: 13px; font-weight: bold; color: #475569;">ยี่ห้อ / รุ่น</th>
                <th style="padding: 12px 10px; font-size: 13px; font-weight: bold; color: #475569;">Serial Number</th>
                <th style="padding: 12px 10px; font-size: 13px; font-weight: bold; color: #475569;">สถานะ</th>
                <th style="padding: 12px 10px; font-size: 13px; font-weight: bold; color: #475569;">วันที่รับเรื่อง</th>
              </tr>
            </thead>
            <tbody>
              ${rmasListHtml}
            </tbody>
          </table>
          
          <div style="text-align: center; margin: 32px 0 20px 0;">
            <a href="${window.location.origin}/admin/rmas" style="display: inline-block; background-color: #0071e3; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; box-shadow: 0 4px 12px rgba(0, 113, 227, 0.25);">เปิดระบบจัดการงานเคลม</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;"/>
          <p style="font-size: 11px; color: #86868b; line-height: 1.5; text-align: center;">อีเมลสรุปงานค้างนี้จัดทำขึ้นโดยความประสงค์ของผู้ดูแลระบบ SEC Claim RMS<br/>หากท่านตรวจสอบแล้วพบข้อมูลผิดพลาดประการใด กรุณาแก้ไขสถานะใบงานโดยตรงบนโปรแกรม</p>
        </div>
      `;

      const mailRef = collection(db, 'mail');
      await addDoc(mailRef, {
        to: user.email,
        message: {
          subject: `[SEC RMS] สรุปรายการงานเคลมค้างดำเนินการของคุณ ${user.name} (จำนวน ${rmasToInclude.length} รายการ)`,
          html: emailHtml
        }
      });
      
      sentCount++;
    }

    return { sentCount, status: 'Success' };
  },

  // --- Seed Data (Admin Only) ---
  seedDatabase: async () => {
    if (!isConfigured || !db) return;
    // Safety: admin-only operation
    if (currentUser?.role !== 'admin') {
      console.error('seedDatabase: requires admin role');
      throw new Error('Unauthorized: admin access required');
    }
    try {
      // Seed Settings
      await setDoc(doc(db, 'settings', 'config'), OFFLINE_SETTINGS);

      // Seed Users
      for (const u of OFFLINE_USERS) {
        await setDoc(doc(db, 'users', u.uid), { name: u.name, email: u.email, role: u.role, team: u.team, createdAt: serverTimestamp() });
      }

      // Seed RMAs
      for (const c of OFFLINE_STORAGE) {
        // Updated to use rmas collection
        await setDoc(doc(db, 'rmas', c.id), {
          ...c,
          createdAt: c.createdAt ? Timestamp.fromDate(new Date(c.createdAt)) : serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      for (const b of OFFLINE_BRANDS) {
        await setDoc(doc(db, 'brands', b.id), b);
      }
      for (const d of OFFLINE_DISTRIBUTORS) {
        await setDoc(doc(db, 'distributors', d.id), d);
      }

      console.log("Database Seeded Successfully");
    } catch (e) {
      console.error("Seeding failed", e);
      throw e;
    }
  },

  // --- Staff Management ---
  getAllUsers: async () => {
    if (!isConfigured || !db) return OFFLINE_USERS;
    try {
      const snap: any = await Promise.race([
        getDocs(collection(db, 'users')),
        new Promise((_, r) => setTimeout(() => r(new Error("Timeout")), 3000))
      ]);
      return snap.docs.map((d: any) => ({ uid: d.id, ...d.data() }));
    } catch (e) {
      console.warn("getAllUsers failed/timedout, using offline:", e);
      return OFFLINE_USERS;
    }
  },
  createStaffAccount: async (data: any) => {
    if (!isConfigured) throw new Error("Firebase Not Configured");
    if (currentUser?.role !== 'admin') throw new Error('Unauthorized: admin access required');
    const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
    const secondaryAuth = getAuth(secondaryApp);
    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, data.email, data.password);
      const uid = userCredential.user.uid;
      await setDoc(doc(db, 'users', uid), { 
        name: data.name, 
        nickname: data.nickname || '',
        email: data.email, 
        role: data.role, 
        team: data.team, 
        canAccessFinance: data.canAccessFinance || false, 
        createdAt: serverTimestamp() 
      });
      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);
      return true;
    } catch (e: any) {
      // Handle case where Auth account exists but Firestore doc was deleted
      if (e?.code === 'auth/email-already-in-use') {
        try {
          // Try to sign in with the provided password to get the UID
          const existingCred = await signInWithEmailAndPassword(secondaryAuth, data.email, data.password);
          const uid = existingCred.user.uid;
          // Re-create the Firestore user document
          await setDoc(doc(db, 'users', uid), { 
            name: data.name, 
            nickname: data.nickname || '',
            email: data.email, 
            role: data.role, 
            team: data.team, 
            canAccessFinance: data.canAccessFinance || false, 
            createdAt: serverTimestamp() 
          });
          await signOut(secondaryAuth);
          await deleteApp(secondaryApp);
          return true;
        } catch (signInError: any) {
          await deleteApp(secondaryApp);
          // If sign-in also fails (wrong password), give a helpful error
          if (signInError?.code === 'auth/wrong-password' || signInError?.code === 'auth/invalid-credential') {
            throw new Error('อีเมลนี้มีบัญชีอยู่แล้วในระบบ Auth และรหัสผ่านไม่ตรงกับรหัสเดิม กรุณาใช้รหัสผ่านเดิม หรือลบบัญชีใน Firebase Console ก่อน');
          }
          throw signInError;
        }
      }
      await deleteApp(secondaryApp);
      throw e;
    }
  },
  deleteStaffAccount: async (uid: string) => {
    if (!isConfigured || !db) throw new Error("Firebase Not Configured");
    if (currentUser?.role !== 'admin') throw new Error('Unauthorized: admin access required');

    // Step 1: Get user email from Firestore before deleting
    let userEmail = '';
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        userEmail = userDoc.data()?.email || '';
      }
    } catch (e) {
      console.warn('Could not fetch user doc before delete:', e);
    }

    // Step 2: Delete Firestore document
    await deleteDoc(doc(db, 'users', uid));

    // Step 3: Note about Firebase Auth
    // Firebase Auth accounts cannot be deleted from the client SDK (requires Admin SDK).
    // The Firestore document has been removed, so the user will lose their role/profile.
    // If the same email needs to be re-registered later, createStaffAccount will handle
    // the 'auth/email-already-in-use' case by re-signing in and re-creating the Firestore doc.
    console.info(`User ${userEmail || uid} removed from Firestore. Firebase Auth account still exists but has no profile.`);
  },
  updateStaffAccount: async (uid: string, updates: { role?: string; team?: string; name?: string; nickname?: string; canAccessFinance?: boolean }) => {
    if (!isConfigured || !db) throw new Error("Firebase Not Configured");
    if (currentUser?.role !== 'admin') throw new Error('Unauthorized: admin access required');
    await updateDoc(doc(db, 'users', uid), updates);
  },

  // --- RMA Management ---
  getRMAs: async (): Promise<RMA[]> => {
    if (!isConfigured || !db) {
      console.error("Firebase not configured!");
      throw new Error("Firebase not configured");
    }
    try {
      const q = query(collection(db, 'rmas'), orderBy('createdAt', 'desc'), limit(500));
      const snap = await getDocs(q);
      return snap.docs.map(mapDocToRMA).filter(r => !r.isDeleted);
    } catch (e) {
      console.error("getRMAs failed:", e);
      throw e;
    }
  },

  // Paginated version — returns { rmas, lastDoc, hasMore }
   getRMAsPaginated: async (pageSize: number = 50, lastDocSnapshot?: any): Promise<{ rmas: RMA[], lastDoc: any, hasMore: boolean }> => {
     if (!isConfigured || !db) throw new Error('Firebase Not Configured');
     try {
       const rmas: RMA[] = [];
       let currentLastDoc = lastDocSnapshot;
       let hasMore = true;
       
       // Loop to fetch until we have enough active documents or there are no more documents
       while (rmas.length < pageSize && hasMore) {
         const limitToFetch = pageSize - rmas.length;
         const batchLimit = limitToFetch + 10;
         
         let q = query(
           collection(db, 'rmas'),
           orderBy('createdAt', 'desc'),
           limit(batchLimit)
         );
         if (currentLastDoc) {
           q = query(
             collection(db, 'rmas'),
             orderBy('createdAt', 'desc'),
             startAfter(currentLastDoc),
             limit(batchLimit)
           );
         }
         
         const snap = await getDocs(q);
         if (snap.docs.length === 0) {
           hasMore = false;
           break;
         }
         
         const batchRmas = snap.docs.map(mapDocToRMA);
         const activeBatch = batchRmas.filter(r => !r.isDeleted);
         
         // Add active items to our results, up to the pageSize limit
         for (const rma of activeBatch) {
           if (rmas.length < pageSize) {
             rmas.push(rma);
           }
         }
         
         currentLastDoc = snap.docs[snap.docs.length - 1];
         // If we fetched fewer documents than requested, it means we reached the end
         if (snap.docs.length < batchLimit) {
           hasMore = false;
         }
       }
       
       return { rmas, lastDoc: currentLastDoc, hasMore };
     } catch (e) {
       console.error('getRMAsPaginated failed:', e);
       throw e;
     }
   },

  // Get RMAs by Job ID — queries Firestore directly instead of fetching all
  getRMAsByJobId: async (jobId: string): Promise<RMA[]> => {
    if (!isConfigured || !db) throw new Error('Firebase Not Configured');
    try {
      // Try groupRequestId first
      let q = query(collection(db, 'rmas'), where('groupRequestId', '==', jobId));
      let snap = await getDocs(q);
      if (snap.docs.length > 0) return snap.docs.map(mapDocToRMA).filter(r => !r.isDeleted);

      // Try quotationNumber
      q = query(collection(db, 'rmas'), where('quotationNumber', '==', jobId));
      snap = await getDocs(q);
      if (snap.docs.length > 0) return snap.docs.map(mapDocToRMA).filter(r => !r.isDeleted);

      // Fallback: single RMA by document ID
      const docSnap = await getDoc(doc(db, 'rmas', jobId));
      if (docSnap.exists()) {
        const rma = mapDocToRMA(docSnap as any);
        return rma.isDeleted ? [] : [rma];
      }

      return [];
    } catch (e) {
      console.error('getRMAsByJobId failed:', e);
      throw e;
    }
  },

  // Get Unassigned RMAs (Self-registered)
  getUnassignedRMAs: async (): Promise<RMA[]> => {
    const all = await MockDb.getRMAs();
    return all.filter(c => !c.team || (c.team as any) === 'UNASSIGNED');
  },

  // Get overdue RMAs (open for more than 7 days, not closed/shipped)
  getOverdueRMAs: async (): Promise<RMA[]> => {
    const all = await MockDb.getRMAs();
    const now = Date.now();
    return all.filter(c => {
      if ([RMAStatus.CLOSED, RMAStatus.CANCELLED, RMAStatus.REPAIRED, RMAStatus.REJECTED, RMAStatus.RETURNED_FROM_VENDOR].includes(c.status)) return false;
      const daysOpen = Math.floor((now - new Date(c.createdAt).getTime()) / 86400000);
      return daysOpen > AGING_BUCKET_1;
    });
  },

  // Combined Navbar counts — single Firestore read for both badges (cached 30s)
  getNavCounts: async (): Promise<{ unassigned: number; overdue: number }> => {
    const cacheNow = Date.now();
    if (_navCountsCache && cacheNow - _navCountsCache.ts < NAV_COUNTS_CACHE_TTL_MS) {
      return _navCountsCache.data;
    }

    let unassigned = 0;
    let overdue = 0;
    const now = Date.now();
    let serverQuerySucceeded = false;

    if (isConfigured && db) {
      try {
        const unassignedQuery = query(
          collection(db, 'rmas'),
          where('team', '==', 'UNASSIGNED'),
          where('isDeleted', '==', false)
        );
        const unassignedSnap = await getCountFromServer(unassignedQuery);
        unassigned = unassignedSnap.data().count;
        serverQuerySucceeded = true;
      } catch (err) {
        console.error("Failed to get unassigned count from server:", err);
      }
    }

    try {
      const all = await MockDb.getRMAs();
      
      if (!serverQuerySucceeded) {
        unassigned = all.filter(c => !c.team || (c.team as any) === 'UNASSIGNED').length;
      }

      for (const c of all) {
        if (![RMAStatus.CLOSED, RMAStatus.CANCELLED, RMAStatus.REPAIRED, RMAStatus.REJECTED, RMAStatus.RETURNED_FROM_VENDOR].includes(c.status)) {
          const daysOpen = Math.floor((now - new Date(c.createdAt).getTime()) / 86400000);
          if (daysOpen > OVERDUE_DAYS) overdue++;
        }
      }
    } catch (err) {
      console.error("getNavCounts fallback failed:", err);
    }

    const data = { unassigned, overdue };
    _navCountsCache = { data, ts: cacheNow };
    return data;
  },

  // NEW: Get All Logs from all RMAs for Admin
  getAllLogs: async (): Promise<any[]> => {
    const rmas = await MockDb.getRMAs();
    const allLogs: any[] = [];

    rmas.forEach(rma => {
      if (rma.history) {
        rma.history.forEach(evt => {
          allLogs.push({
            ...evt,
            claimId: rma.id, // Keep this key for UI consistency if needed, or rename to rmaId later
            jobId: rma.quotationNumber || rma.groupRequestId || rma.id, // Derived Job ID
            claimRef: rma.quotationNumber || rma.id,
            productModel: rma.productModel,
            serialNumber: rma.serialNumber,
            brand: rma.brand
          });
        });
      }
    });

    // Sort by date descending (Newest first)
    return allLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  getRMAById: async (id: string): Promise<RMA | undefined> => {
    if (!isConfigured || !db) return undefined;
    try {
      const snap = await getDoc(doc(db, 'rmas', id));
      if (snap.exists()) {
        const rma = mapDocToRMA(snap);
        return rma.isDeleted ? undefined : rma;
      }
      const q = query(collection(db, 'rmas'), where('quotationNumber', '==', id));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        const rma = mapDocToRMA(qSnap.docs[0]);
        return rma.isDeleted ? undefined : rma;
      }
      return undefined;
    } catch (e) {
      console.error("getRMAById failed:", e);
      throw e;
    }
  },
  searchRMAsPublic: async (text: string): Promise<RMA[]> => {
    if (!isConfigured || !db) return [];
    const searchString = text.toLowerCase().trim();
    if (!searchString) return [];

    const resultsMap = new Map<string, RMA>();

    try {
      // 1. Try direct document get by RMA ID (e.g. "RMA-261234")
      const directSnap = await getDoc(doc(db, 'rmas', text.trim()));
      if (directSnap.exists()) {
        const rma = mapDocToRMA(directSnap);
        if (!rma.isDeleted) resultsMap.set(directSnap.id, rma);
      }

      // 2. Try exact match on quotationNumber (e.g. "SEC073880")
      const quoteSnap = await getDocs(query(
        collection(db, 'rmas'),
        where('quotationNumber', '==', text.trim()),
        limit(5)
      ));
      quoteSnap.docs.forEach(d => {
        const rma = mapDocToRMA(d);
        if (!rma.isDeleted) resultsMap.set(d.id, rma);
      });

      // 3. Try exact match on groupRequestId (e.g. "SECRMA-2026-0003")
      const groupSnap = await getDocs(query(
        collection(db, 'rmas'),
        where('groupRequestId', '==', text.trim()),
        limit(5)
      ));
      groupSnap.docs.forEach(d => {
        const rma = mapDocToRMA(d);
        if (!rma.isDeleted) resultsMap.set(d.id, rma);
      });

      // 4. Try exact match on serialNumber
      const snSnap = await getDocs(query(
        collection(db, 'rmas'),
        where('serialNumber', '==', text.trim()),
        limit(5)
      ));
      snSnap.docs.forEach(d => {
        const rma = mapDocToRMA(d);
        if (!rma.isDeleted) resultsMap.set(d.id, rma);
      });

    } catch (e) {
      console.error('searchRMAsPublic error:', e);
    }

    return Array.from(resultsMap.values());
  },
  addRMA: async (c: Partial<RMA>): Promise<RMA> => {
    const year = new Date().getFullYear().toString().slice(-2);
    // [FIXED] ID Format: RMA-26XXXXXX (6 digits = 900K unique IDs/year)
    const generateId = () => `RMA-${year}${Math.floor(100000 + Math.random() * 900000)}`;
    let id = generateId();

    if (!isConfigured || !db) throw new Error("Firebase Disconnected");

    // Retry up to MAX_ID_RETRIES times if ID collision occurs
    for (let attempt = 0; attempt < MAX_ID_RETRIES; attempt++) {
      try {
        const snap = await getDoc(doc(db, 'rmas', id));
        if (!snap.exists()) break; // ID is unique, proceed
        if (attempt === MAX_ID_RETRIES - 1) {
          throw new Error(`RMA ID collision: failed to generate unique ID after ${MAX_ID_RETRIES} attempts`);
        }
        id = generateId(); // Generate new ID and retry
      } catch (e: unknown) {
        if (e instanceof Error && e.message?.includes('RMA ID collision')) throw e;
        console.warn("ID Check fail", e);
        break; // On network error, proceed with current ID
      }
    }

    const isCustomerSubmit = c.createdBy?.includes('Web');
    const now = new Date().toISOString();
    const newRMAData = {
      ...c,
      ...(isCustomerSubmit ? {} : { repairCosts: { warrantyStatus: 'IN_WARRANTY', ...(c.repairCosts || {}) } }),
      status: RMAStatus.PENDING,
      history: [{ id: `evt-${Date.now()}`, date: Timestamp.now(), type: 'SYSTEM', description: isCustomerSubmit ? 'ลูกค้าลงทะเบียนล่วงหน้าผ่านหน้าเว็บ' : 'รับสินค้าเข้าเข้าระบบ', user: currentUser?.name || 'System' }],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'rmas', id), newRMAData);
      // Return with ID but use local time for immediate UI update since serverTimestamp is async
      return { ...newRMAData, id, createdAt: now, updatedAt: now } as any;
    } catch (e) {
      console.error("Write RMA failed", e);
      throw e;
    }
  },
  updateRMA: async (id: string, updates: Partial<RMA>) => {
    if (!isConfigured || !db) throw new Error("Firebase Disconnected");
    const flattened = flattenRMAUpdates(updates);
    await withRetry(async () => {
      await updateDoc(doc(db, 'rmas', id), { ...flattened, updatedAt: serverTimestamp() });
    });
  },
  addTimelineEvent: async (id: string, evt: any) => {
    if (!isConfigured || !db) throw new Error("Firebase Disconnected");
    await withRetry(async () => {
      const snap = await getDoc(doc(db, 'rmas', id));
      if (snap.exists()) {
        const currentHistory = snap.data().history || [];
        await updateDoc(doc(db, 'rmas', id), {
          history: [...currentHistory, { id: `evt-${Date.now()}`, date: Timestamp.now(), ...evt }],
          updatedAt: serverTimestamp()
        });
      }
    });
  },

  // Bulk update status for multiple RMAs at once
  bulkUpdateStatus: async (ids: string[], newStatus: RMAStatus, userName: string, additionalUpdates?: Partial<RMA>): Promise<number> => {
    if (!isConfigured || !db) throw new Error("Firebase Disconnected");
    
    // 1. Fetch all docs in parallel
    const snapPromises = ids.map(id => getDoc(doc(db, 'rmas', id)));
    const snaps = await Promise.all(snapPromises);
    
    const batch = writeBatch(db);
    let updated = 0;
    
    snaps.forEach((snap, idx) => {
      if (!snap.exists()) return;
      const id = ids[idx];
      const data = snap.data();
      const oldStatus = data.status || '';
      const currentHistory = data.history || [];
      
      const targetStatus = newStatus === RMAStatus.RETURNED_FROM_VENDOR
        ? (oldStatus === RMAStatus.REPLACED_FROM_STOCK ? RMAStatus.RETURNED_FROM_VENDOR : RMAStatus.REPAIRED)
        : newStatus;

      const flatUpdates: any = {
        status: targetStatus,
        history: [...currentHistory, {
          id: `evt-${Date.now()}-${updated}`,
          date: Timestamp.now(),
          type: 'STATUS_CHANGE',
          description: `Bulk: ${oldStatus} → ${targetStatus}`,
          user: userName
        }],
        updatedAt: serverTimestamp()
      };

      if (additionalUpdates) {
        if (additionalUpdates.serviceType !== undefined) flatUpdates.serviceType = additionalUpdates.serviceType;
        if (additionalUpdates.resolution) {
          if (additionalUpdates.resolution.actionTaken !== undefined) {
            flatUpdates["resolution.actionTaken"] = additionalUpdates.resolution.actionTaken;
          }
          if (additionalUpdates.resolution.actionDetails !== undefined) {
            flatUpdates["resolution.actionDetails"] = additionalUpdates.resolution.actionDetails;
          }
          if (additionalUpdates.resolution.replacedSerialNumber !== undefined) {
            flatUpdates["resolution.replacedSerialNumber"] = additionalUpdates.resolution.replacedSerialNumber;
          }
          if (additionalUpdates.resolution.vendorTicketRef !== undefined) {
            flatUpdates["resolution.vendorTicketRef"] = additionalUpdates.resolution.vendorTicketRef;
          }
          if (additionalUpdates.resolution.restockCondition !== undefined) {
            flatUpdates["resolution.restockCondition"] = additionalUpdates.resolution.restockCondition;
          }
          if (additionalUpdates.resolution.rootCause !== undefined) {
            flatUpdates["resolution.rootCause"] = additionalUpdates.resolution.rootCause;
          }
        }
      }

      batch.update(doc(db, 'rmas', id), flatUpdates);
      updated++;
    });

    if (updated > 0) {
      await batch.commit();
    }
    return updated;
  },

  // Bulk update fields for multiple RMAs at once
  bulkUpdateFields: async (ids: string[], updates: Partial<RMA>, userName: string): Promise<number> => {
    if (!isConfigured || !db) throw new Error("Firebase Disconnected");
    const fieldNames = Object.keys(updates).join(', ');
    
    // 1. Fetch all docs in parallel
    const snapPromises = ids.map(id => getDoc(doc(db, 'rmas', id)));
    const snaps = await Promise.all(snapPromises);
    
    const batch = writeBatch(db);
    let updated = 0;
    
    snaps.forEach((snap, idx) => {
      if (!snap.exists()) return;
      const id = ids[idx];
      
      // Flatten the updates to dot notation to prevent overwriting nested objects
      const flatUpdates: any = {};
      if (updates.brand !== undefined) flatUpdates.brand = updates.brand;
      if (updates.productModel !== undefined) flatUpdates.productModel = updates.productModel;
      if (updates.serialNumber !== undefined) flatUpdates.serialNumber = updates.serialNumber;
      if (updates.distributor !== undefined) flatUpdates.distributor = updates.distributor;
      if (updates.issueDescription !== undefined) flatUpdates.issueDescription = updates.issueDescription;
      
      if (updates.resolution) {
        if (updates.resolution.rootCause !== undefined) {
          flatUpdates["resolution.rootCause"] = updates.resolution.rootCause;
        }
        if (updates.resolution.technicalNotes !== undefined) {
          flatUpdates["resolution.technicalNotes"] = updates.resolution.technicalNotes;
        }
        if (updates.resolution.actionTaken !== undefined) {
          flatUpdates["resolution.actionTaken"] = updates.resolution.actionTaken;
        }
        if (updates.resolution.actionDetails !== undefined) {
          flatUpdates["resolution.actionDetails"] = updates.resolution.actionDetails;
        }
        if (updates.resolution.replacedSerialNumber !== undefined) {
          flatUpdates["resolution.replacedSerialNumber"] = updates.resolution.replacedSerialNumber;
        }
        if (updates.resolution.vendorTicketRef !== undefined) {
          flatUpdates["resolution.vendorTicketRef"] = updates.resolution.vendorTicketRef;
        }
        if (updates.resolution.restockCondition !== undefined) {
          flatUpdates["resolution.restockCondition"] = updates.resolution.restockCondition;
        }
      }
      
      if (updates.repairCosts) {
        if (updates.repairCosts.warrantyStatus !== undefined) {
          flatUpdates["repairCosts.warrantyStatus"] = updates.repairCosts.warrantyStatus;
        }
      }

      const currentHistory = snap.data().history || [];
      batch.update(doc(db, 'rmas', id), {
        ...flatUpdates,
        history: [...currentHistory, {
          id: `evt-${Date.now()}-${updated}`,
          date: Timestamp.now(),
          type: 'SYSTEM',
          description: `Bulk edit: ${fieldNames}`,
          user: userName
        }],
        updatedAt: serverTimestamp()
      });
      updated++;
    });

    if (updated > 0) {
      await batch.commit();
    }
    return updated;
  },

  // Bulk update fields with individual Serial Numbers for multiple RMAs at once
  bulkUpdateFieldsIndividual: async (
    ids: string[],
    commonUpdates: Partial<RMA>,
    individualSns: Record<string, { serialNumber: string; replacedSerialNumber: string }>,
    userName: string
  ): Promise<number> => {
    if (!isConfigured || !db) throw new Error("Firebase Disconnected");
    
    const fields = new Set<string>();
    Object.keys(commonUpdates).forEach(k => fields.add(k));
    fields.add('serialNumber');
    fields.add('replacedSerialNumber');
    const fieldNames = Array.from(fields).join(', ');

    // 1. Fetch all docs in parallel
    const snapPromises = ids.map(id => getDoc(doc(db, 'rmas', id)));
    const snaps = await Promise.all(snapPromises);
    
    const batch = writeBatch(db);
    let updated = 0;
    
    snaps.forEach((snap, idx) => {
      if (!snap.exists()) return;
      const id = ids[idx];
      
      // Flatten the updates to dot notation to prevent overwriting nested objects
      const flatUpdates: any = {};
      if (commonUpdates.brand !== undefined) flatUpdates.brand = commonUpdates.brand;
      if (commonUpdates.productModel !== undefined) flatUpdates.productModel = commonUpdates.productModel;
      if (commonUpdates.distributor !== undefined) flatUpdates.distributor = commonUpdates.distributor;
      if (commonUpdates.issueDescription !== undefined) flatUpdates.issueDescription = commonUpdates.issueDescription;
      
      if (commonUpdates.resolution) {
        if (commonUpdates.resolution.rootCause !== undefined) {
          flatUpdates["resolution.rootCause"] = commonUpdates.resolution.rootCause;
        }
        if (commonUpdates.resolution.technicalNotes !== undefined) {
          flatUpdates["resolution.technicalNotes"] = commonUpdates.resolution.technicalNotes;
        }
        if (commonUpdates.resolution.actionTaken !== undefined) {
          flatUpdates["resolution.actionTaken"] = commonUpdates.resolution.actionTaken;
        }
        if (commonUpdates.resolution.actionDetails !== undefined) {
          flatUpdates["resolution.actionDetails"] = commonUpdates.resolution.actionDetails;
        }
        if (commonUpdates.resolution.vendorTicketRef !== undefined) {
          flatUpdates["resolution.vendorTicketRef"] = commonUpdates.resolution.vendorTicketRef;
        }
        if (commonUpdates.resolution.restockCondition !== undefined) {
          flatUpdates["resolution.restockCondition"] = commonUpdates.resolution.restockCondition;
        }
      }
      
      if (commonUpdates.repairCosts) {
        if (commonUpdates.repairCosts.warrantyStatus !== undefined) {
          flatUpdates["repairCosts.warrantyStatus"] = commonUpdates.repairCosts.warrantyStatus;
        }
      }

      // Apply individual serial numbers if present
      const ind = individualSns[id];
      if (ind) {
        if (ind.serialNumber !== undefined) {
          flatUpdates.serialNumber = ind.serialNumber.trim();
        }
        if (ind.replacedSerialNumber !== undefined) {
          flatUpdates["resolution.replacedSerialNumber"] = ind.replacedSerialNumber.trim();
        }
      }

      const currentHistory = snap.data().history || [];
      batch.update(doc(db, 'rmas', id), {
        ...flatUpdates,
        history: [...currentHistory, {
          id: `evt-${Date.now()}-${updated}`,
          date: Timestamp.now(),
          type: 'SYSTEM',
          description: `Bulk edit: ${fieldNames}`,
          user: userName
        }],
        updatedAt: serverTimestamp()
      });
      updated++;
    });

    if (updated > 0) {
      await batch.commit();
    }
    return updated;
  },

  // --- Dynamic Sequential Job ID ---
  generateNextGroupRequestId: async (): Promise<string> => {
    const now = new Date();
    const year = String(now.getFullYear()); // e.g., "2026"

    if (!isConfigured || !db) {
      const ts = Date.now().toString().slice(-4);
      return `SECRMA-${year}-${ts}`;
    }

    const counterRef = doc(db, 'counters', 'jobCounter');

    // Helper: read counter, increment, write back
    const incrementCounter = async (useTransaction: boolean): Promise<number> => {
      if (useTransaction) {
        return await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(counterRef);
          let counterSeq = 0;
          if (snap.exists()) {
            const data = snap.data();
            if (data.currentYear === year) counterSeq = data.sequence || 0;
          }
          const nextSequence = counterSeq + 1;
          transaction.set(counterRef, { currentYear: year, sequence: nextSequence }, { merge: true });
          return nextSequence;
        });
      } else {
        // Direct read/write fallback (not atomic, but sequential)
        const snap = await getDoc(counterRef);
        let counterSeq = 0;
        if (snap.exists()) {
          const data = snap.data();
          if (data.currentYear === year) counterSeq = data.sequence || 0;
        }
        const nextSequence = counterSeq + 1;
        await setDoc(counterRef, { currentYear: year, sequence: nextSequence }, { merge: true });
        return nextSequence;
      }
    };

    // Strategy 1: Transaction (atomic, best)
    try {
      const seq = await incrementCounter(true);
      return `SECRMA-${year}-${String(seq).padStart(4, '0')}`;
    } catch (e: any) {
      console.warn("Transaction failed, trying direct read/write:", e);
    }

    // Strategy 2: Direct read/write (not atomic but still sequential)
    try {
      const seq = await incrementCounter(false);
      return `SECRMA-${year}-${String(seq).padStart(4, '0')}`;
    } catch (e2: any) {
      console.error("Direct fallback also failed:", e2);
    }

    // Strategy 3: Last resort — timestamp (loses sequential order)
    const ts = Date.now().toString().slice(-4);
    return `SECRMA-${year}-${ts}`;
  },

  // --- One-time counter fix ---
  resetJobCounter: async (newSequence: number): Promise<string> => {
    if (!isConfigured || !db) throw new Error("Firebase Disconnected");
    if (currentUser?.role !== 'admin') throw new Error('Unauthorized: admin access required');
    const year = String(new Date().getFullYear());
    const counterRef = doc(db, 'counters', 'jobCounter');
    await setDoc(counterRef, { currentYear: year, sequence: newSequence });
    return `Counter reset to ${newSequence}. Next ID will be SECRMA-${year}-${String(newSequence + 1).padStart(4, '0')}`;
  },

  // --- One-time migration: fix all fallback groupRequestIds ---
  fixGroupRequestIds: async (): Promise<string> => {
    if (!isConfigured || !db) throw new Error("Firebase Disconnected");
    if (currentUser?.role !== 'admin') throw new Error('Unauthorized: admin access required');
    const year = String(new Date().getFullYear());
    const prefix = `SECRMA-${year}-`;

    // 1. Read ALL RMAs
    const rmasSnap = await getDocs(collection(db, 'rmas'));

    // 2. Group by groupRequestId and find valid max
    const groupMap = new Map<string, string[]>(); // groupRequestId -> [docIds]
    let validMax = 0;

    rmasSnap.docs.forEach(d => {
      const gid = d.data().groupRequestId as string;
      if (!gid || !gid.startsWith(prefix)) return;
      if (!groupMap.has(gid)) groupMap.set(gid, []);
      groupMap.get(gid)!.push(d.id);

      const seq = parseInt(gid.substring(prefix.length), 10);
      if (!isNaN(seq) && seq <= 100 && seq > validMax) validMax = seq;
    });

    // 3. Find groups that need fixing (sequence > 100 = fallback IDs)
    const badGroups: string[] = [];
    groupMap.forEach((_, gid) => {
      const seq = parseInt(gid.substring(prefix.length), 10);
      if (!isNaN(seq) && seq > 100) badGroups.push(gid);
    });

    // Sort bad groups by their creation order
    badGroups.sort();

    // 4. Remap each bad group to next sequential number
    let nextSeq = validMax;
    const changes: string[] = [];

    for (const oldGid of badGroups) {
      nextSeq++;
      const newGid = `${prefix}${String(nextSeq).padStart(4, '0')}`;
      const docIds = groupMap.get(oldGid) || [];

      for (const docId of docIds) {
        await updateDoc(doc(db, 'rmas', docId), { groupRequestId: newGid });
      }
      changes.push(`${oldGid} → ${newGid} (${docIds.length} docs)`);
    }

    // 5. Update counter
    const counterRef = doc(db, 'counters', 'jobCounter');
    await setDoc(counterRef, { currentYear: year, sequence: nextSeq });

    return `Fixed ${changes.length} groups. Counter set to ${nextSeq}.\n` + changes.join('\n');
  },

  // --- Delete Functions ---
  deleteRMA: async (id: string) => {
    if (!isConfigured || !db) throw new Error("Firebase Disconnected");
    // Admin only — ต้องเป็น admin เท่านั้นถึงยกเลิกได้
    if (currentUser?.role !== 'admin') throw new Error('Unauthorized: ต้องเป็น admin เท่านั้นถึงจะยกเลิกข้อมูลได้');
    try {
      const event = {
        id: `evt-${Date.now()}`,
        date: Timestamp.now(),
        type: 'STATUS_CHANGE',
        description: 'ยกเลิกรายการเคลม (Cancelled)',
        user: currentUser?.name || 'Admin'
      };

      const rmaSnap = await getDoc(doc(db, 'rmas', id));
      let currentHistory = [];
      if (rmaSnap.exists()) {
        currentHistory = rmaSnap.data().history || [];
      }

      await updateDoc(doc(db, 'rmas', id), {
        isDeleted: true,
        status: RMAStatus.CANCELLED,
        updatedAt: serverTimestamp(),
        history: [...currentHistory, event]
      });
      // Counter is NOT recalculated — it only goes up, never down.
      console.log(`Cancelled/Deleted RMA: ${id}`);
    }
    catch (e) {
      console.error("deleteRMA failed", e);
      throw e;
    }
  },

  getDeletedRMAs: async (): Promise<RMA[]> => {
    if (!isConfigured || !db) throw new Error("Firebase Disconnected");
    if (!currentUser) throw new Error('Unauthorized: ต้องเข้าสู่ระบบก่อน');
    try {
      const q = query(collection(db, 'rmas'), where('isDeleted', '==', true));
      const snap = await getDocs(q);
      return snap.docs.map(mapDocToRMA);
    } catch (e) {
      console.error("getDeletedRMAs failed:", e);
      throw e;
    }
  },

  restoreRMA: async (id: string) => {
    if (!isConfigured || !db) throw new Error("Firebase Disconnected");
    if (!currentUser) throw new Error('Unauthorized: ต้องเข้าสู่ระบบก่อน');
    try {
      const event = {
        id: `evt-${Date.now()}`,
        date: Timestamp.now(),
        type: 'STATUS_CHANGE',
        description: 'กู้คืนรายการจากการลบ (Restored)',
        user: currentUser?.name || 'Admin'
      };

      const rmaSnap = await getDoc(doc(db, 'rmas', id));
      let currentHistory = [];
      if (rmaSnap.exists()) {
        currentHistory = rmaSnap.data().history || [];
      }

      await updateDoc(doc(db, 'rmas', id), {
        isDeleted: false,
        status: RMAStatus.PENDING,
        updatedAt: serverTimestamp(),
        history: [...currentHistory, event]
      });
      console.log(`Restored RMA: ${id}`);
    } catch (e) {
      console.error("restoreRMA failed", e);
      throw e;
    }
  },

  permanentlyDeleteRMA: async (id: string) => {
    if (!isConfigured || !db) throw new Error("Firebase Disconnected");
    if (currentUser?.role !== 'admin') throw new Error('Unauthorized: ต้องเป็น admin เท่านั้นถึงจะลบข้อมูลถาวรได้');
    try {
      await deleteDoc(doc(db, 'rmas', id));
      console.log(`Permanently deleted RMA: ${id}`);
    } catch (e) {
      console.error("permanentlyDeleteRMA failed", e);
      throw e;
    }
  },

  scanOldRMAs: async (yearsOld: number = 5): Promise<{ id: string; brand: string; model: string; serial: string; customer: string; createdAt: string; jobId: string }[]> => {
    if (!isConfigured || !db) throw new Error("Firebase Not Configured");
    if (currentUser?.role !== 'admin') throw new Error('Unauthorized: admin access required');

    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - yearsOld);

    // Fetch only documents older than the cutoff date directly from Firestore (avoids full scan)
    const snap = await getDocs(query(collection(db, 'rmas'), where('createdAt', '<', Timestamp.fromDate(cutoffDate))));
    const oldDocs = snap.docs.filter(d => !d.data().isDeleted);

    return oldDocs.map(d => {
      const data = d.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
      return {
        id: d.id,
        brand: data.brand || '-',
        model: data.productModel || '-',
        serial: data.serialNumber || '-',
        customer: data.customerName || '-',
        createdAt: createdAt.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }),
        jobId: data.groupRequestId || data.quotationNumber || d.id
      };
    });
  },

  deleteOldRMAs: async (yearsOld: number = 5): Promise<number> => {
    if (!isConfigured || !db) throw new Error("Firebase Not Configured");
    if (currentUser?.role !== 'admin') throw new Error('Unauthorized: admin access required');

    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - yearsOld);

    // Fetch only documents older than the cutoff date directly from Firestore (avoids full scan)
    const snap = await getDocs(query(collection(db, 'rmas'), where('createdAt', '<', Timestamp.fromDate(cutoffDate))));
    const oldDocs = snap.docs.filter(d => !d.data().isDeleted);

    if (oldDocs.length === 0) return 0;

    const BATCH_SIZE = 500;
    for (let i = 0; i < oldDocs.length; i += BATCH_SIZE) {
      const batch = oldDocs.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(d => deleteDoc(d.ref)));
    }

    console.log(`Deleted ${oldDocs.length} RMAs older than ${yearsOld} years`);
    return oldDocs.length;
  },

  clearDatabase: async () => {
    if (!isConfigured || !db) return;
    // Safety: admin-only + confirmation required
    if (currentUser?.role !== 'admin') {
      console.error('clearDatabase: requires admin role');
      throw new Error('Unauthorized: admin access required');
    }
    if (!confirm('⚠️ WARNING: This will permanently delete ALL RMA data. Are you sure?')) {
      return;
    }
    try {
      const snap = await getDocs(collection(db, 'rmas'));
      // Batch delete: 500 docs per batch to avoid timeout
      const BATCH_SIZE = 500;
      for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
        const batch = snap.docs.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(d => deleteDoc(d.ref)));
      }
      console.log("Database Cleared");
    } catch (e) { console.error("Clear DB Failed", e); }
  },

  restoreDatabaseBackup: async (backup: any) => {
    if (!isConfigured || !db) throw new Error("Firebase Not Configured");
    if (currentUser?.role !== 'admin') throw new Error('Unauthorized: admin access required');
    
    const BATCH_SIZE = 500;
    const { rmas, brands, distributors, settings } = backup;
    
    if (rmas && Array.isArray(rmas)) {
      for (let i = 0; i < rmas.length; i += BATCH_SIZE) {
        const batch = rmas.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(r => {
          const { id, ...data } = r;
          return setDoc(doc(db, 'rmas', id), {
            ...data,
            createdAt: data.createdAt ? Timestamp.fromDate(new Date(data.createdAt)) : serverTimestamp(),
            updatedAt: data.updatedAt ? Timestamp.fromDate(new Date(data.updatedAt)) : serverTimestamp()
          });
        }));
      }
    }
    
    if (brands && Array.isArray(brands)) {
      await Promise.all(brands.map(b => setDoc(doc(db, 'brands', b.id), b)));
    }
    
    if (distributors && Array.isArray(distributors)) {
      await Promise.all(distributors.map(d => setDoc(doc(db, 'distributors', d.id), d)));
    }
    
    if (settings) {
      await setDoc(doc(db, 'settings', 'companySettings'), settings);
    }
  },

  getStats: async (teamFilter?: Team | 'GROUP_C'): Promise<DashboardStats> => {
    const cacheKey = teamFilter || 'ALL';
    const cacheNow = Date.now();
    if (_statsCache && _statsCache.key === cacheKey && cacheNow - _statsCache.ts < STATS_CACHE_TTL_MS) {
      return _statsCache.data;
    }
    if (!isConfigured || !db) throw new Error('Firebase Not Configured');

    const rmasRef = collection(db, 'rmas');
    let totalRMAs = 0;
    let teamDocs: RMA[] = [];

    try {
      // 1. Get total count using server-side aggregation (doesn't load full documents, saves costs)
      let countQuery: any = rmasRef;
      if (teamFilter === 'GROUP_C') {
        countQuery = query(rmasRef, where('team', 'in', [Team.TEAM_C, Team.TEAM_E, Team.TEAM_G]));
      } else if (teamFilter && (teamFilter as string) !== 'ALL') {
        countQuery = query(rmasRef, where('team', '==', teamFilter));
      }
      const countSnap = await getCountFromServer(countQuery);
      totalRMAs = countSnap.data().count;

      // 2. Fetch active documents (status NOT IN ['CLOSED', 'CANCELLED', 'REJECTED'])
      // Uses a single-field query that does not require a composite index
      const activeSnap = await getDocs(query(rmasRef, where('status', 'not-in', [RMAStatus.CLOSED, RMAStatus.CANCELLED, RMAStatus.REJECTED])));
      const activeDocs = activeSnap.docs.map(mapDocToRMA).filter(r => !r.isDeleted);

      // 3. Fetch recently updated documents (updatedAt >= start of this month) to calculate recent resolutions
      // Uses a single-field index query on updatedAt
      const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const recentSnap = await getDocs(query(rmasRef, where('updatedAt', '>=', Timestamp.fromDate(thisMonthStart))));
      const recentDocs = recentSnap.docs.map(mapDocToRMA).filter(r => !r.isDeleted);

      // 4. Merge results client-side by ID
      const mergedMap = new Map<string, RMA>();
      activeDocs.forEach(d => mergedMap.set(d.id, d));
      recentDocs.forEach(d => mergedMap.set(d.id, d));

      // 5. Filter by team client-side to avoid composite indexes requirement
      const allDocs = Array.from(mergedMap.values());
      if (teamFilter === 'GROUP_C') {
        teamDocs = allDocs.filter(r => [Team.TEAM_C, Team.TEAM_E, Team.TEAM_G].includes(r.team));
      } else if (teamFilter && (teamFilter as string) !== 'ALL') {
        teamDocs = allDocs.filter(r => r.team === teamFilter);
      } else {
        teamDocs = allDocs;
      }
    } catch (dbErr) {
      console.error("getStats query failed:", dbErr);
      throw new Error("Cannot fetch Dashboard stats. Please check your internet connection or reload the page.");
    }

    // Client-side counting from loaded docs
    const now = new Date();
    const activeDocs = teamDocs.filter(c => ![RMAStatus.CLOSED, RMAStatus.REPAIRED, RMAStatus.RETURNED_FROM_VENDOR, RMAStatus.CANCELLED, RMAStatus.REJECTED].includes(c.status));
    const aging = { bucket0_7: 0, bucket8_15: 0, bucket15plus: 0 };
    
    activeDocs.forEach(c => {
      let endTime = now.getTime();
      if (c.status === RMAStatus.REPLACED_FROM_STOCK && c.updatedAt) {
          endTime = new Date(c.updatedAt).getTime();
      }
      const diff = Math.floor((endTime - new Date(c.createdAt).getTime()) / 86400000);
      if (diff <= AGING_BUCKET_1) aging.bucket0_7++; else if (diff <= AGING_BUCKET_2) aging.bucket8_15++; else aging.bucket15plus++;
    });

    const urgentRMAs = activeDocs
      .filter(c => {
          let endTime = now.getTime();
          if (c.status === RMAStatus.REPLACED_FROM_STOCK && c.updatedAt) {
              endTime = new Date(c.updatedAt).getTime();
          }
          return Math.floor((endTime - new Date(c.createdAt).getTime()) / 86400000) > 15;
      })
      .slice(0, 10);

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const resolvedThisMonth = teamDocs.filter(c => {
      if (c.status !== RMAStatus.CLOSED && c.status !== RMAStatus.RETURNED_FROM_VENDOR) return false;
      const updatedDate = new Date(c.updatedAt);
      return updatedDate >= thisMonthStart;
    }).length;

    const result: DashboardStats = {
      totalRMAs,
      pendingRMAs: activeDocs.length,
      resolvedThisMonth,
      criticalIssues: aging.bucket15plus,
      revenuePipeline: teamDocs.filter(c => c.status === RMAStatus.WAITING_PARTS || c.status === RMAStatus.REPLACED_FROM_STOCK).length,
      avgTurnaroundHours: (() => {
        const completedDocs = teamDocs.filter(c => 
            (c.status === RMAStatus.CLOSED || c.status === RMAStatus.REPLACED_FROM_STOCK || c.status === RMAStatus.RETURNED_FROM_VENDOR) && c.createdAt && c.updatedAt
        );
        if (completedDocs.length === 0) return 0;
        const totalHours = completedDocs.reduce((sum, c) => {
          const created = new Date(c.createdAt).getTime();
          const updated = new Date(c.updatedAt).getTime();
          return sum + Math.max(0, (updated - created) / 3600000);
        }, 0);
        return Math.round(totalHours / completedDocs.length);
      })(),
      overdueCount: aging.bucket15plus,
      agingBuckets: aging,
      statusCounts: {
        pending: teamDocs.filter(c => c.status === RMAStatus.PENDING).length,
        diagnosing: teamDocs.filter(c => c.status === RMAStatus.DIAGNOSING).length,
        waitingParts: teamDocs.filter(c => c.status === RMAStatus.WAITING_PARTS).length,
        replacedFromStock: teamDocs.filter(c => c.status === RMAStatus.REPLACED_FROM_STOCK).length,
        repaired: teamDocs.filter(c => c.status === RMAStatus.REPAIRED).length,
        closed: teamDocs.filter(c => c.status === RMAStatus.CLOSED).length,
        returnedFromVendor: teamDocs.filter(c => c.status === RMAStatus.RETURNED_FROM_VENDOR).length,
        cancelled: teamDocs.filter(c => c.status === RMAStatus.CANCELLED).length
      },
      urgentRMAs
    };
    _statsCache = { key: cacheKey, data: result, ts: cacheNow };
    return result;
  },

  // ==========================================
  // FINANCE / PETTY CASH CRUD METHODS
  // ==========================================

  async getPettyCashTransactions(): Promise<PettyCashTransaction[]> {
    if (!isConfigured || !db) {
      return OFFLINE_PETTY_CASH.filter(tx => !tx.isDeleted).sort((a, b) => b.date.localeCompare(a.date));
    }
    const q = query(collection(db, 'pettycash'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const results: PettyCashTransaction[] = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      if (!data.isDeleted) {
        results.push({ id: docSnap.id, ...data } as PettyCashTransaction);
      }
    });
    return results;
  },

  async addPettyCashTransaction(tx: Omit<PettyCashTransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const nowStr = new Date().toISOString();
    // Strip undefined values — Firestore addDoc throws on undefined
    const raw: Record<string, any> = {
      ...tx,
      createdAt: nowStr,
      updatedAt: nowStr,
      isDeleted: false
    };
    const newTx: Record<string, any> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v !== undefined) newTx[k] = v;
    }

    if (!isConfigured || !db) {
      const id = 'tx-' + Math.random().toString(36).substr(2, 9);
      OFFLINE_PETTY_CASH.push({ id, ...newTx } as PettyCashTransaction);
      return id;
    }

    const docRef = await addDoc(collection(db, 'pettycash'), newTx);
    return docRef.id;
  },

  async updatePettyCashTransaction(id: string, updates: Partial<PettyCashTransaction>): Promise<void> {
    const nowStr = new Date().toISOString();
    // Strip undefined values — Firestore updateDoc throws on undefined
    const raw: Record<string, any> = { ...updates, updatedAt: nowStr };
    const cleanUpdates: Record<string, any> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v !== undefined) cleanUpdates[k] = v;
    }

    if (!isConfigured || !db) {
      const idx = OFFLINE_PETTY_CASH.findIndex(tx => tx.id === id);
      if (idx !== -1) {
        OFFLINE_PETTY_CASH[idx] = { ...OFFLINE_PETTY_CASH[idx], ...cleanUpdates };
      }
      return;
    }

    const docRef = doc(db, 'pettycash', id);
    await updateDoc(docRef, cleanUpdates);
  },

  async deletePettyCashTransaction(id: string): Promise<void> {
    await MockDb.updatePettyCashTransaction(id, { isDeleted: true });
  },

  async getPettyCashSummary(): Promise<PettyCashSummary> {
    const txs = await MockDb.getPettyCashTransactions();
    
    let pettyCashBalance = 0;
    let totalPersonalAdvance = 0;
    const personalAdvanceByStaff: Record<string, number> = {};

    txs.forEach(tx => {
      if (tx.type === 'INCOME') {
        pettyCashBalance += tx.amount;
      } else {
        // EXPENSE
        if (tx.paidBy === 'PETTY_CASH') {
          pettyCashBalance -= tx.amount;
        } else if (tx.paidBy === 'SPLIT') {
          const pettyAmt = tx.splitPettyCashAmount || 0;
          const personalAmt = tx.splitPersonalAmount || 0;
          
          // Portion from petty cash is deducted
          pettyCashBalance -= pettyAmt;
          
          if (!tx.isReimbursed) {
            totalPersonalAdvance += personalAmt;
            const staff = tx.staffName || 'Unknown';
            personalAdvanceByStaff[staff] = (personalAdvanceByStaff[staff] || 0) + personalAmt;
          } else {
            // Reimbursed portion is also deducted from the petty cash box
            pettyCashBalance -= personalAmt;
          }
        } else {
          // PERSONAL_CASH or PERSONAL_TRANSFER (advance payments)
          if (!tx.isReimbursed) {
            totalPersonalAdvance += tx.amount;
            const staff = tx.staffName || 'Unknown';
            personalAdvanceByStaff[staff] = (personalAdvanceByStaff[staff] || 0) + tx.amount;
          } else {
            // Reimbursed advance acts as a deduction from the Petty Cash fund
            pettyCashBalance -= tx.amount;
          }
        }
      }
    });

    return {
      pettyCashBalance,
      totalPersonalAdvance,
      personalAdvanceByStaff
    };
  }
};
