
import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { MockDb } from '../services/mockDb';
import { WifiOff, RefreshCw } from 'lucide-react';
import { AdminPageSkeleton } from './AdminPageSkeleton';

interface Props {
  children: React.ReactNode;
}

const AUTH_TIMEOUT_MS = 10000; // 10 seconds

export const ProtectedRoute: React.FC<Props> = ({ children }) => {
  // If user is already cached in memory/localStorage, initialize as authenticated immediately
  const [isAuthenticated, setIsAuthenticated] = useState(() => MockDb.isAuthenticated());
  const [authReady, setAuthReady] = useState(() => MockDb.isAuthenticated());
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Timeout fallback — if auth takes > 10s and not ready, show error
    const timer = setTimeout(() => {
      if (!cancelled && !authReady) {
        setTimedOut(true);
      }
    }, AUTH_TIMEOUT_MS);

    MockDb.waitForAuth().then(() => {
      if (!cancelled) {
        const authed = MockDb.isAuthenticated();
        setIsAuthenticated(authed);
        setAuthReady(true);
      }
    }).catch(() => {
      if (!cancelled) {
        setTimedOut(true);
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [authReady]);

  // Timeout / Error fallback
  if (timedOut && !authReady) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="text-center max-w-sm bg-white dark:bg-[#16161a] border border-gray-200/80 dark:border-white/[0.08] p-6 sm:p-8 rounded-3xl apple-card shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto mb-6">
            <WifiOff className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-white mb-2">
            เชื่อมต่อไม่สำเร็จ
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            ไม่สามารถเชื่อมต่อกับ Firebase ได้ — อาจเป็นเพราะเน็ตช้าหรือ Server มีปัญหา
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/30"
            >
              <RefreshCw className="w-4 h-4" /> ลองใหม่
            </button>
            <Link
              to="/login"
              className="w-full py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-xl font-medium text-center hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            >
              กลับหน้า Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Smooth Apple Skeleton while waiting for Firebase Auth verification
  if (!authReady) {
    return <AdminPageSkeleton title="กำลังตรวจสอบสิทธิ์..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
