
import { RMA, RMAStatus, DashboardStats, Team, TimelineEvent, Brand, Distributor } from '../types';
import { db, auth, isConfigured, firebaseConfig } from './firebaseConfig';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  collection, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, Timestamp, limit, serverTimestamp, startAfter, QueryDocumentSnapshot,
  getCountFromServer, runTransaction
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword, getAuth
} from 'firebase/auth';
import { BRAND_OPTIONS, DISTRIBUTOR_OPTIONS } from '../constants/options';

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
  performanceMode: false
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
  login: async (u: string, p: string): Promise<{ success: boolean; error?: string }> => {
    if (!isConfigured || !auth) {
      return { success: false, error: "Firebase Authentication not configured" };
    }
    // Rate limit: block after 5 failed attempts for 30 seconds
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
      if (_loginAttempts >= 5) {
        _loginLockUntil = Date.now() + 30000; // Lock for 30 seconds
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
    try { await setDoc(doc(db, 'settings', 'config'), s); } catch (e) { console.error("updateSettings failed", e); throw e; }
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
    const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
    const secondaryAuth = getAuth(secondaryApp);
    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, data.email, data.password);
      const uid = userCredential.user.uid;
      await setDoc(doc(db, 'users', uid), { name: data.name, email: data.email, role: data.role, team: data.team, createdAt: serverTimestamp() });
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
          await setDoc(doc(db, 'users', uid), { name: data.name, email: data.email, role: data.role, team: data.team, createdAt: serverTimestamp() });
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
  updateStaffAccount: async (uid: string, updates: { role?: string; team?: string; name?: string }) => {
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
      return snap.docs.map(mapDocToRMA);
    } catch (e) {
      console.error("getRMAs failed:", e);
      throw e;
    }
  },

  // Paginated version — returns { rmas, lastDoc, hasMore }
   getRMAsPaginated: async (pageSize: number = 50, lastDocSnapshot?: any): Promise<{ rmas: RMA[], lastDoc: any, hasMore: boolean }> => {
    if (!isConfigured || !db) throw new Error('Firebase Not Configured');
    try {
      let q;
      if (lastDocSnapshot) {
        q = query(collection(db, 'rmas'), orderBy('createdAt', 'desc'), startAfter(lastDocSnapshot), limit(pageSize));
      } else {
        q = query(collection(db, 'rmas'), orderBy('createdAt', 'desc'), limit(pageSize));
      }
      const snap = await getDocs(q);
      const rmas = snap.docs.map(mapDocToRMA);
      const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
      return { rmas, lastDoc, hasMore: snap.docs.length === pageSize };
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
      if (snap.docs.length > 0) return snap.docs.map(mapDocToRMA);

      // Try quotationNumber
      q = query(collection(db, 'rmas'), where('quotationNumber', '==', jobId));
      snap = await getDocs(q);
      if (snap.docs.length > 0) return snap.docs.map(mapDocToRMA);

      // Fallback: single RMA by document ID
      const docSnap = await getDoc(doc(db, 'rmas', jobId));
      if (docSnap.exists()) return [mapDocToRMA(docSnap as any)];

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
      if ([RMAStatus.CLOSED].includes(c.status)) return false;
      const daysOpen = Math.floor((now - new Date(c.createdAt).getTime()) / 86400000);
      return daysOpen > 7;
    });
  },

  // Combined Navbar counts — single Firestore read for both badges (cached 30s)
  getNavCounts: async (): Promise<{ unassigned: number; overdue: number }> => {
    const cacheNow = Date.now();
    if (_navCountsCache && cacheNow - _navCountsCache.ts < 30000) {
      return _navCountsCache.data;
    }
    const all = await MockDb.getRMAs();
    const now = Date.now();
    let unassigned = 0;
    let overdue = 0;
    for (const c of all) {
      if (!c.team || (c.team as any) === 'UNASSIGNED') unassigned++;
      if (![RMAStatus.CLOSED].includes(c.status)) {
        const daysOpen = Math.floor((now - new Date(c.createdAt).getTime()) / 86400000);
        if (daysOpen > 15) overdue++;
      }
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
      if (snap.exists()) return mapDocToRMA(snap);
      const q = query(collection(db, 'rmas'), where('quotationNumber', '==', id));
      const qSnap = await getDocs(q);
      return !qSnap.empty ? mapDocToRMA(qSnap.docs[0]) : undefined;
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
        resultsMap.set(directSnap.id, mapDocToRMA(directSnap));
      }

      // 2. Try exact match on quotationNumber (e.g. "SEC073880")
      const quoteSnap = await getDocs(query(
        collection(db, 'rmas'),
        where('quotationNumber', '==', text.trim()),
        limit(5)
      ));
      quoteSnap.docs.forEach(d => resultsMap.set(d.id, mapDocToRMA(d)));

      // 3. Try exact match on groupRequestId (e.g. "SECRMA-2026-0003")
      const groupSnap = await getDocs(query(
        collection(db, 'rmas'),
        where('groupRequestId', '==', text.trim()),
        limit(5)
      ));
      groupSnap.docs.forEach(d => resultsMap.set(d.id, mapDocToRMA(d)));

      // 4. Try case-insensitive match on serialNumber (get requires auth, skip for public)
      // Serial numbers are handled: direct doc GET by ID covers RMA id searches,
      // and serial numbers must be entered exactly as text
      const snSnap = await getDocs(query(
        collection(db, 'rmas'),
        where('serialNumber', '==', text.trim()),
        limit(5)
      ));
      snSnap.docs.forEach(d => resultsMap.set(d.id, mapDocToRMA(d)));

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

    // Retry up to 5 times if ID collision occurs
    const MAX_RETRIES = 5;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const snap = await getDoc(doc(db, 'rmas', id));
        if (!snap.exists()) break; // ID is unique, proceed
        if (attempt === MAX_RETRIES - 1) {
          throw new Error(`RMA ID collision: failed to generate unique ID after ${MAX_RETRIES} attempts`);
        }
        id = generateId(); // Generate new ID and retry
      } catch (e: unknown) {
        if (e instanceof Error && e.message?.includes('RMA ID collision')) throw e;
        console.warn("ID Check fail", e);
        break; // On network error, proceed with current ID
      }
    }

    const now = new Date().toISOString();
    const newRMAData = {
      ...c,
      repairCosts: { warrantyStatus: 'IN_WARRANTY', ...(c.repairCosts || {}) },
      status: RMAStatus.PENDING,
      history: [{ id: `evt-${Date.now()}`, date: Timestamp.now(), type: 'SYSTEM', description: c.createdBy?.includes('Web') ? 'ลูกค้าลงทะเบียนล่วงหน้าผ่านหน้าเว็บ' : 'รับสินค้าเข้าเข้าระบบ', user: currentUser?.name || 'System' }],
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
    try {
      await updateDoc(doc(db, 'rmas', id), { ...updates, updatedAt: serverTimestamp() });
    } catch (e) {
      console.error("updateRMA failed", e);
      throw e;
    }
  },
  addTimelineEvent: async (id: string, evt: any) => {
    if (!isConfigured || !db) throw new Error("Firebase Disconnected");
    try {
      const snap = await getDoc(doc(db, 'rmas', id));
      if (snap.exists()) {
        const currentHistory = snap.data().history || [];
        await updateDoc(doc(db, 'rmas', id), {
          history: [...currentHistory, { id: `evt-${Date.now()}`, date: Timestamp.now(), ...evt }],
          updatedAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.error("addTimelineEvent failed", e);
      throw e;
    }
  },

  // --- Dynamic Sequential Job ID ---
  generateNextGroupRequestId: async (): Promise<string> => {
    const now = new Date();
    const year = String(now.getFullYear()); // e.g., "2026"

    if (!isConfigured || !db) {
      // Offline fallback: use timestamp to keep rough order
      const ts = Date.now().toString().slice(-4);
      return `SECRMA-${year}-${ts}`;
    }

    const counterRef = doc(db, 'counters', 'jobCounter');

    try {
      // Scan existing RMAs to find the actual highest sequence for this year
      const prefix = `SECRMA-${year}-`;
      const rmasSnap = await getDocs(collection(db, 'rmas'));
      let maxSeqFromDocs = 0;
      rmasSnap.docs.forEach(d => {
        const data = d.data();
        const gid = data.groupRequestId as string | undefined;
        if (gid && gid.startsWith(prefix)) {
          const seqPart = gid.substring(prefix.length);
          const seqNum = parseInt(seqPart, 10);
          if (!isNaN(seqNum) && seqNum > maxSeqFromDocs) {
            maxSeqFromDocs = seqNum;
          }
        }
      });

      const newSeq = await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(counterRef);
        let counterSeq = 0;

        if (snap.exists()) {
          const data = snap.data();
          if (data.currentYear === year) {
            counterSeq = data.sequence || 0;
          }
          // If different year, counterSeq stays 0 (will be reset)
        }

        // Use whichever is higher: counter or actual max from documents
        const trueMax = Math.max(counterSeq, maxSeqFromDocs);
        const nextSequence = trueMax + 1;

        // Atomic update with the corrected value
        transaction.set(counterRef, {
          currentYear: year,
          sequence: nextSequence
        }, { merge: true });

        return nextSequence;
      });

      const formattedSeq = String(newSeq).padStart(4, '0');
      return `SECRMA-${year}-${formattedSeq}`;

    } catch (e) {
      console.error("Failed to generate sequence ID, falling back:", e);
      // Fallback: timestamp-based to keep rough order
      const ts = Date.now().toString().slice(-4);
      return `SECRMA-${year}-${ts}`;
    }
  },

  // --- Delete Functions ---
  deleteRMA: async (id: string) => {
    if (!isConfigured || !db) throw new Error("Firebase Disconnected");
    try {
      // Delete the document first
      await deleteDoc(doc(db, 'rmas', id));

      // After deletion, recalculate the counter based on remaining documents
      const now = new Date();
      const year = String(now.getFullYear());
      const prefix = `SECRMA-${year}-`;

      // Scan remaining RMAs to find new highest sequence
      const rmasSnap = await getDocs(collection(db, 'rmas'));
      let maxSeq = 0;
      rmasSnap.docs.forEach(d => {
        const data = d.data();
        const gid = data.groupRequestId as string | undefined;
        if (gid && gid.startsWith(prefix)) {
          const seqPart = gid.substring(prefix.length);
          const seqNum = parseInt(seqPart, 10);
          if (!isNaN(seqNum) && seqNum > maxSeq) {
            maxSeq = seqNum;
          }
        }
      });

      // Update counter to reflect actual max
      const counterRef = doc(db, 'counters', 'jobCounter');
      await setDoc(counterRef, {
        currentYear: year,
        sequence: maxSeq
      }, { merge: true });
      console.log(`Job counter synced to ${maxSeq} after deleting ${id}`);
    }
    catch (e) {
      console.error("deleteRMA failed", e);
      throw e;
    }
  },

  scanOldRMAs: async (yearsOld: number = 5): Promise<{ id: string; brand: string; model: string; serial: string; customer: string; createdAt: string; jobId: string }[]> => {
    if (!isConfigured || !db) throw new Error("Firebase Not Configured");
    if (currentUser?.role !== 'admin') throw new Error('Unauthorized: admin access required');

    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - yearsOld);

    const snap = await getDocs(collection(db, 'rmas'));
    const oldDocs = snap.docs.filter(d => {
      const data = d.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
      return createdAt < cutoffDate;
    });

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

    const snap = await getDocs(collection(db, 'rmas'));
    const oldDocs = snap.docs.filter(d => {
      const data = d.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
      return createdAt < cutoffDate;
    });

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

  getStats: async (teamFilter?: Team | 'GROUP_C'): Promise<DashboardStats> => {
    const cacheKey = teamFilter || 'ALL';
    const cacheNow = Date.now();
    if (_statsCache && _statsCache.key === cacheKey && cacheNow - _statsCache.ts < 30000) {
      return _statsCache.data;
    }
    if (!isConfigured || !db) throw new Error('Firebase Not Configured');

    const rmasRef = collection(db, 'rmas');

    // Strategy: use single-field query (no composite index needed)
    // then count statuses client-side from loaded docs
    let teamDocs: RMA[] = [];

    try {
      if (teamFilter === 'GROUP_C') {
        const snap = await getDocs(query(rmasRef, where('team', 'in', [Team.TEAM_C, Team.TEAM_E, Team.TEAM_G])));
        teamDocs = snap.docs.map(mapDocToRMA);
        // @ts-ignore
      } else if (teamFilter && teamFilter !== 'ALL') {
        const snap = await getDocs(query(rmasRef, where('team', '==', teamFilter)));
        teamDocs = snap.docs.map(mapDocToRMA);
      } else {
        // Load all RMAs if no specific team is filtered, bypassing complex where clauses 
        // that could cause missing index errors or hang operations without composite indexes
        const snap = await getDocs(rmasRef);
        teamDocs = snap.docs.map(mapDocToRMA);
      }
    } catch (dbErr) {
      console.error("getStats query failed:", dbErr);
      throw new Error("Cannot fetch Dashboard stats. Please check your internet connection or reload the page.");
    }

    // Client-side counting from loaded docs
    const now = new Date();
    // activeDocs includes everything except CLOSED, REPAIRED, and RETURNED_FROM_VENDOR
    // if it's REPLACED_FROM_STOCK, the customer is already satisfied, so we should NOT count it as an active/overdue issue FOR THE CUSTOMER.
    // However, the admin still needs to track it. So we keep it in activeDocs but we calculate aging differently.
    const activeDocs = teamDocs.filter(c => ![RMAStatus.CLOSED, RMAStatus.REPAIRED, RMAStatus.RETURNED_FROM_VENDOR].includes(c.status));
    const aging = { bucket0_7: 0, bucket8_15: 0, bucket15plus: 0 };
    
    activeDocs.forEach(c => {
      // If it's REPLACED_FROM_STOCK, stop the clock at the time it was replaced (we approximate by using updatedAt or history)
      // Since history might not be perfectly parsed here, we can use the difference between now and createdAt unless it's replaced.
      let endTime = now.getTime();
      if (c.status === RMAStatus.REPLACED_FROM_STOCK && c.updatedAt) {
          endTime = new Date(c.updatedAt).getTime();
      }
      const diff = Math.floor((endTime - new Date(c.createdAt).getTime()) / 86400000);
      if (diff <= 7) aging.bucket0_7++; else if (diff <= 15) aging.bucket8_15++; else aging.bucket15plus++;
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

    // Filter CLOSED RMAs that were resolved THIS month only
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const resolvedThisMonth = teamDocs.filter(c => {
      if (c.status !== RMAStatus.CLOSED && c.status !== RMAStatus.RETURNED_FROM_VENDOR) return false;
      const updatedDate = new Date(c.updatedAt);
      return updatedDate >= thisMonthStart;
    }).length;

    const result: DashboardStats = {
      totalRMAs: teamDocs.length,
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
          // For REPLACED_FROM_STOCK and RETURNED_FROM_VENDOR, the turnaround ends when they got the stock unit. 
          // We use updatedAt.
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
      },
      urgentRMAs
    };
    _statsCache = { key: cacheKey, data: result, ts: cacheNow };
    return result;
  }
};
