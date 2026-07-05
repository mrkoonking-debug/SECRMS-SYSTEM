
import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: env.VITE_FIREBASE_APP_ID || ""
};

const isConfigured =
  firebaseConfig.apiKey !== "YOUR_API_KEY" &&
  firebaseConfig.apiKey !== "" &&
  firebaseConfig.projectId !== "your-project-id";

let db: any = null;
let auth: any = null;

if (isConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
    auth = getAuth(app);
    console.log("🚀 SEC-CLAIM: Connected to Firebase Cloud");
  } catch (e) {
    console.error("❌ Firebase Init Error:", e);
  }
} else {
  console.error("❌ SEC-CLAIM: Firebase Config invalid or missing. App will fail to load data.");
  console.warn("Please check .env or hardcoded keys in firebaseConfig.ts");
}

export { db, auth, isConfigured };
