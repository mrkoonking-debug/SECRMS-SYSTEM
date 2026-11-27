import React, { useEffect, useState } from 'react';
import {
  Home,
  Sun,
  Moon,
  Plus,
  PanelLeftClose,
  ChevronLeft,
  Search,
  LayoutGrid,
  List,
  Bell,
  PlusCircle,
  BarChart3,
  Users,
  Tag,
  Building2,
  Settings,
  History,
  Trash2,
  Wallet,
  Globe,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MockDb } from '../services/mockDb';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { SpotlightSearch } from './SpotlightSearch';

interface NavbarProps {
  embedded?: boolean;
}

const clearAllCachesAndReload = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) await r.unregister();
    } catch (e) {
      console.error('SW unregister failed:', e);
    }
  }

  if ('caches' in window) {
    try {
      const keys = await caches.keys();
      for (const k of keys) await caches.delete(k);
    } catch (e) {
      console.error('Cache delete failed:', e);
    }
  }

  sessionStorage.clear();

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('gs_freq_') || key.startsWith('rmas_') || key.startsWith('onboarding_'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));

  if (window.indexedDB && window.indexedDB.databases) {
    try {
      const dbs = await window.indexedDB.databases();
      for (const dbInfo of dbs) {
        if (dbInfo.name) {
          window.indexedDB.deleteDatabase(dbInfo.name);
        }
      }
    } catch (e) {
      console.error('Failed to delete IndexedDB databases:', e);
    }
  }

  window.location.reload();
};

export const Navbar: React.FC<NavbarProps> = ({ embedded = false }) => {
  const [user, setUser] = useState<any>(() => MockDb.getCurrentUser());
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  // Global Spotlight Shortcut: Ctrl+K / Cmd+K & Escape to close mobile drawer
  useEffect(() => {
    const onGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSpotlightOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, [isMobileOpen]);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    MockDb.waitForAuth().then(() => {
      setUser(MockDb.getCurrentUser());
    });

    const checkIncoming = async () => {
      try {
        const { unassigned, overdue } = await MockDb.getNavCounts();
        setUnassignedCount(unassigned);
        setOverdueCount(overdue);
      } catch (err) {
        console.error('Failed to fetch counts', err);
      }
    };

    checkIncoming();
    const handleChanged = () => {
      checkIncoming();
    };
    window.addEventListener('sec-rma-changed', handleChanged);
    const interval = setInterval(checkIncoming, 30000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('sec-rma-changed', handleChanged);
    };
  }, [location]);

  const handleLogout = () => {
    MockDb.logout();
    setUser(null);
    setIsMobileOpen(false);
    navigate('/login');
  };

  if (location.pathname === '/login') return null;

  const isRouteActive = (to: string) =>
    location.pathname === to || (to === '/admin/rmas' && location.pathname.startsWith('/admin/job/'));

  const MainMenuRow = ({
    to,
    label,
    icon: Icon,
    gradient,
    badgeCount = 0,
  }: {
    to: string;
    label: string;
    icon: any;
    gradient: string;
    badgeCount?: number;
  }) => {
    const active = isRouteActive(to);
    return (
      <Link
        to={to}
        onClick={() => setIsMobileOpen(false)}
        className={`group flex items-center gap-3 px-2.5 py-2 rounded-[16px] transition-all duration-150 active:scale-[0.98] ${
          active
            ? 'bg-[#0071e3]/12 dark:bg-white/[0.12] text-[#0071e3] dark:text-white font-bold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.45)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]'
            : 'text-[#1d1d1f] dark:text-gray-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] font-semibold'
        }`}
      >
        <div
          className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white shrink-0 shadow-sm transition-transform duration-150 group-hover:scale-105`}
        >
          <Icon className="w-4 h-4 text-white" strokeWidth={2.2} />
        </div>
        <span className="text-[13.5px] tracking-tight truncate flex-1">{label}</span>
        {badgeCount > 0 && (
          <span className="min-w-[20px] h-5 flex items-center justify-center text-[10px] font-extrabold px-1.5 rounded-full bg-[#ff3b30] text-white shadow-sm shrink-0">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </Link>
    );
  };

  const QuickToolTile = ({
    to,
    onClick,
    label,
    icon: Icon,
    gradient,
  }: {
    to?: string;
    onClick?: () => void;
    label: string;
    icon: any;
    gradient: string;
  }) => {
    const active = to ? isRouteActive(to) : false;
    const content = (
      <>
        <div
          className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-md transition-transform duration-150 group-hover:scale-105`}
        >
          <Icon className="w-4.5 h-4.5 text-white" strokeWidth={2.2} />
        </div>
        <span
          className={`text-[11.5px] font-bold leading-tight truncate max-w-full ${
            active ? 'text-[#0071e3] dark:text-white' : 'text-[#1d1d1f] dark:text-gray-200'
          }`}
        >
          {label}
        </span>
      </>
    );

    const tileClasses = `group rounded-[18px] p-3 flex flex-col items-center justify-center gap-2 text-center border transition-all duration-150 active:scale-95 cursor-pointer ${
      active
        ? 'bg-[#0071e3]/10 dark:bg-white/[0.11] border-[#0071e3]/40 dark:border-white/20 shadow-sm'
        : 'bg-white dark:bg-[#17171f] border-gray-200/70 dark:border-white/[0.06] hover:border-[#0071e3]/40 dark:hover:border-white/[0.14]'
    }`;

    if (onClick) {
      return (
        <button type="button" onClick={onClick} className={tileClasses}>
          {content}
        </button>
      );
    }

    return (
      <Link to={to || '/admin/dashboard'} onClick={() => setIsMobileOpen(false)} className={tileClasses}>
        {content}
      </Link>
    );
  };

  const renderDrawerBody = (isMobileDrawer: boolean) => (
    <>
      {/* Top Profile Header */}
      <div className="px-4 pt-4 pb-3 shrink-0 space-y-2.5">
        {user ? (
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#38bdf8] to-[#0284c7] flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0">
                {user.name?.charAt(0)?.toUpperCase() || 'S'}
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-extrabold text-[#1d1d1f] dark:text-white truncate leading-tight">
                  {user.name}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {user.email || (user.role ? String(user.role).toUpperCase() : 'STAFF')}
                </div>
              </div>
            </div>

            {isMobileDrawer ? (
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="w-9 h-9 rounded-full bg-black/[0.05] dark:bg-white/[0.07] text-gray-500 dark:text-gray-300 flex items-center justify-center shrink-0 active:scale-90 transition-transform"
                title="ปิดเมนู"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            ) : (
              <Link
                to="/admin/dashboard"
                className="w-9 h-9 rounded-xl bg-white dark:bg-[#1a1a22] border border-gray-200/70 dark:border-white/[0.08] p-1.5 flex items-center justify-center shrink-0 hover:scale-105 transition-transform"
                title="SEC RMS"
              >
                <img src="/logo.png" alt="SEC RMS" className="w-full h-full object-contain" />
              </Link>
            )}
          </div>
        ) : (
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[11px] bg-white shadow-sm p-1 flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-black text-[17px] tracking-tight">
              <span className="text-[#0071e3] dark:text-[#38bdf8]">SEC</span>{' '}
              <span className="text-[#1d1d1f] dark:text-white">RMS</span>
            </span>
          </Link>
        )}

        {/* Desktop Spotlight Search Trigger */}
        {user && !isMobileDrawer && (
          <button
            type="button"
            onClick={() => setIsSpotlightOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-full bg-white dark:bg-[#17171f] hover:bg-gray-50 dark:hover:bg-[#1d1d27] border border-gray-200/75 dark:border-white/[0.07] text-xs text-gray-500 dark:text-gray-400 transition-all cursor-pointer group"
          >
            <Search className="w-3.5 h-3.5 text-[#0071e3] dark:text-[#38bdf8] shrink-0" />
            <span className="flex-1 text-left font-semibold truncate">ค้นหาด่วน...</span>
            <kbd className="px-1.5 py-0.5 text-[9.5px] font-bold bg-black/[0.04] dark:bg-white/[0.06] text-gray-400 rounded-md">
              Ctrl K
            </kbd>
          </button>
        )}
      </div>

      {/* Scrollable Sections */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3.5 py-1.5 space-y-4">
        {user ? (
          <>
            {/* Section 1: เมนูหลัก */}
            <div>
              <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 px-2 mb-1.5">
                เมนูหลัก
              </div>
              <div className="rounded-[22px] bg-white dark:bg-[#17171f] border border-gray-200/70 dark:border-white/[0.06] p-1.5 space-y-0.5">
                <MainMenuRow
                  to="/admin/dashboard"
                  label={t('nav.overview')}
                  icon={Home}
                  gradient="from-[#3b82f6] to-[#2563eb]"
                  badgeCount={overdueCount}
                />
                <MainMenuRow
                  to="/admin/incoming"
                  label={t('nav.incoming')}
                  icon={Bell}
                  gradient="from-[#ef4444] to-[#dc2626]"
                  badgeCount={unassignedCount}
                />
                <MainMenuRow
                  to="/admin/rmas"
                  label={t('nav.claims')}
                  icon={List}
                  gradient="from-[#06b6d4] to-[#0284c7]"
                />
                <MainMenuRow
                  to="/admin/submit"
                  label={t('nav.newRequest')}
                  icon={PlusCircle}
                  gradient="from-[#f97316] to-[#ea580c]"
                />
              </div>
            </div>

            {/* Section 2: เครื่องมือลัด (2-Column Bento Tile Grid) */}
            <div>
              <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 px-2 mb-1.5">
                เครื่องมือลัด
              </div>
              <div className="grid grid-cols-2 gap-2">
                <QuickToolTile
                  label="ค้นหาด่วน"
                  icon={Search}
                  gradient="from-[#3b82f6] to-[#1d4ed8]"
                  onClick={() => {
                    setIsMobileOpen(false);
                    setIsSpotlightOpen(true);
                  }}
                />
                <QuickToolTile
                  to="/admin/reports"
                  label="รายงานสถิติ"
                  icon={BarChart3}
                  gradient="from-[#a855f7] to-[#7c3aed]"
                />

                {user.role === 'admin' ? (
                  <>
                    <QuickToolTile
                      to="/admin/users"
                      label={t('nav.users')}
                      icon={Users}
                      gradient="from-[#f97316] to-[#ea580c]"
                    />
                    <QuickToolTile
                      to="/admin/brands"
                      label={t('nav.brands')}
                      icon={Tag}
                      gradient="from-[#ec4899] to-[#db2777]"
                    />
                    <QuickToolTile
                      to="/admin/distributors"
                      label={t('nav.distributors')}
                      icon={Building2}
                      gradient="from-[#14b8a6] to-[#0d9488]"
                    />
                    <QuickToolTile
                      to="/admin/settings"
                      label={t('nav.settings')}
                      icon={Settings}
                      gradient="from-[#0ea5e9] to-[#0284c7]"
                    />
                    <QuickToolTile
                      to="/admin/logs"
                      label="System Logs"
                      icon={History}
                      gradient="from-[#6366f1] to-[#4f46e5]"
                    />
                    <QuickToolTile
                      to="/admin/recycle-bin"
                      label="ถังขยะระบบ"
                      icon={Trash2}
                      gradient="from-[#ef4444] to-[#b91c1c]"
                    />
                  </>
                ) : (
                  <>
                    <QuickToolTile
                      to="/admin/settings"
                      label={t('nav.settings')}
                      icon={Settings}
                      gradient="from-[#0ea5e9] to-[#0284c7]"
                    />
                    <QuickToolTile
                      to="/"
                      label="หน้าเว็บลูกค้า"
                      icon={Globe}
                      gradient="from-[#10b981] to-[#059669]"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Section 3: การเงินและช่องทางอื่น */}
            <div>
              <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 px-2 mb-1.5">
                การเงินและช่องทางอื่น
              </div>
              <div className="rounded-[22px] bg-white dark:bg-[#17171f] border border-gray-200/70 dark:border-white/[0.06] p-1.5 space-y-0.5">
                {(user.role === 'admin' || (user as any).canAccessFinance) && (
                  <MainMenuRow
                    to="/admin/finance"
                    label="การเงิน / บันทึกรายจ่าย"
                    icon={Wallet}
                    gradient="from-[#10b981] to-[#059669]"
                  />
                )}
                <MainMenuRow
                  to="/"
                  label="หน้าเว็บลูกค้า (เช็กสถานะ)"
                  icon={Globe}
                  gradient="from-[#f59e0b] to-[#d97706]"
                />
              </div>
            </div>
          </>
        ) : location.pathname.startsWith('/admin') ? (
          <div className="space-y-4 animate-fade-in">
            <div>
              <div className="w-20 h-3 rounded-md skeleton-shimmer mb-3 ml-3" />
              <div className="space-y-1.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03]">
                    <div className="w-8 h-8 rounded-full skeleton-shimmer shrink-0" />
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="w-24 h-3 rounded skeleton-shimmer" />
                      <div className="w-32 h-2.5 rounded skeleton-shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-white dark:bg-[#17171f] text-center mt-4 shadow-sm border border-gray-100 dark:border-white/[0.06]">
            <p className="text-base font-bold text-[#1d1d1f] dark:text-white mb-2">Customer Portal</p>
          </div>
        )}
      </div>

      {/* Sticky Drawer Footer (Theme Switcher + 3-Button Row) */}
      <div className="p-3.5 pt-2.5 border-t border-gray-200/70 dark:border-white/[0.06] space-y-2 shrink-0">
        {/* Segmented Light / Dark Switcher */}
        <div className="rounded-full p-1 bg-gray-100 dark:bg-[#17171f] border border-gray-200/70 dark:border-white/[0.06] grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => {
              if (theme === 'dark') toggleTheme();
            }}
            className={`py-1.5 px-2.5 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-white text-[#1d1d1f] shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>โหมดสว่าง</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (theme === 'light') toggleTheme();
            }}
            className={`py-1.5 px-2.5 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-[#252530] text-white shadow-sm border border-white/[0.08]'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Moon className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>โหมดมืด</span>
          </button>
        </div>

        {/* 3-Column Bottom Action Row */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={clearAllCachesAndReload}
            className="py-2 px-2 rounded-[14px] bg-white dark:bg-[#17171f] border border-gray-200/70 dark:border-white/[0.06] text-[11px] font-bold text-[#1d1d1f] dark:text-gray-200 flex items-center justify-center gap-1 hover:border-[#0071e3]/40 active:scale-95 transition-all cursor-pointer"
            title="ล้างแคช & รีเฟรช"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
            <span>ซิงค์</span>
          </button>
          <button
            type="button"
            onClick={toggleLanguage}
            className="py-2 px-2 rounded-[14px] bg-white dark:bg-[#17171f] border border-gray-200/70 dark:border-white/[0.06] text-[11px] font-bold text-[#1d1d1f] dark:text-gray-200 flex items-center justify-center gap-1 hover:border-[#0071e3]/40 active:scale-95 transition-all cursor-pointer"
            title="สลับภาษา"
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>{language.toUpperCase()}</span>
          </button>
          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              className="py-2 px-2 rounded-[14px] bg-red-500/10 dark:bg-red-500/[0.14] border border-red-500/20 text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center justify-center gap-1 hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer"
              title="ออกจากระบบ"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ออกระบบ</span>
            </button>
          ) : (
            <Link
              to="/login"
              className="py-2 px-2 rounded-[14px] bg-[#0071e3]/10 border border-[#0071e3]/20 text-[11px] font-bold text-[#0071e3] dark:text-[#38bdf8] flex items-center justify-center gap-1 active:scale-95 transition-all"
            >
              <span>เข้าสู่ระบบ</span>
            </Link>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* ===== Mobile Top Header (King's Wealth Glass Bar) ===== */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-[55] h-14 nav-glass border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between px-3.5">
        <Link to={user ? '/admin/dashboard' : '/'} className="flex items-center gap-2.5 active:scale-95 transition-transform">
          <div className="w-9 h-9 rounded-[11px] bg-white shadow-sm p-1 flex items-center justify-center border border-black/[0.04]">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-black text-[17px] tracking-tight">
            <span className="text-[#0071e3] dark:text-[#38bdf8]">SEC</span>{' '}
            <span className="text-[#1d1d1f] dark:text-white">RMS</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {user && (
            <button
              type="button"
              onClick={() => setIsSpotlightOpen(true)}
              className="h-8 px-3 rounded-full bg-black/[0.04] dark:bg-[#181820] border border-black/[0.06] dark:border-white/[0.08] flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 active:scale-95 transition-all"
              title="ค้นหาด่วน"
            >
              <Search className="w-3.5 h-3.5 text-[#0071e3] dark:text-[#38bdf8]" />
              <span>ค้นหา</span>
            </button>
          )}

          {/* Compact Segmented Sun / Moon Toggle Pill */}
          <div className="p-0.5 rounded-full bg-black/[0.05] dark:bg-[#181820] border border-black/[0.06] dark:border-white/[0.08] flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => {
                if (theme === 'dark') toggleTheme();
              }}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                theme === 'light'
                  ? 'bg-white text-amber-500 shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              title="โหมดสว่าง"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (theme === 'light') toggleTheme();
              }}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                theme === 'dark'
                  ? 'bg-[#2a2a36] text-[#38bdf8] shadow-sm'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
              title="โหมดมืด"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ===== Mobile Floating Glass Bottom Dock (King's Wealth Center + FAB) ===== */}
      {user && (
        <div
          className="md:hidden fixed left-0 right-0 z-[55] pointer-events-none flex justify-center"
          style={{ bottom: 'calc(0.85rem + env(safe-area-inset-bottom))' }}
        >
          <div className="w-[93%] max-w-[404px] h-[62px] rounded-full nav-glass border border-gray-200/80 dark:border-white/[0.14] shadow-[0_10px_34px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.5)] dark:shadow-[0_14px_40px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.16)] grid grid-cols-5 items-center px-1.5 pointer-events-auto">
            {/* 1. ภาพรวม */}
            <Link
              to="/admin/dashboard"
              className={`flex flex-col items-center justify-center h-full relative transition-all active:scale-95 ${
                location.pathname === '/admin/dashboard'
                  ? 'text-[#0071e3] dark:text-white'
                  : 'text-[#8e8e93] dark:text-gray-400'
              }`}
            >
              <Home
                className="w-[19px] h-[19px]"
                strokeWidth={location.pathname === '/admin/dashboard' ? 2.4 : 1.9}
              />
              <span
                className={`text-[10px] mt-0.5 leading-none ${
                  location.pathname === '/admin/dashboard' ? 'font-bold' : 'font-semibold'
                }`}
              >
                ภาพรวม
              </span>
              {overdueCount > 0 && (
                <span className="absolute top-2 right-[24%] w-[6px] h-[6px] rounded-full bg-[#ff3b30] ring-2 ring-white dark:ring-[#141419]" />
              )}
            </Link>

            {/* 2. รายการ */}
            <Link
              to="/admin/rmas"
              className={`flex flex-col items-center justify-center h-full transition-all active:scale-95 ${
                isRouteActive('/admin/rmas')
                  ? 'text-[#0071e3] dark:text-white'
                  : 'text-[#8e8e93] dark:text-gray-400'
              }`}
            >
              <List
                className="w-[19px] h-[19px]"
                strokeWidth={isRouteActive('/admin/rmas') ? 2.4 : 1.9}
              />
              <span
                className={`text-[10px] mt-0.5 leading-none ${
                  isRouteActive('/admin/rmas') ? 'font-bold' : 'font-semibold'
                }`}
              >
                รายการ
              </span>
            </Link>

            {/* 3. Center Prominent Glowing Blue Circular + FAB */}
            <div className="flex items-center justify-center h-full">
              {location.pathname === '/admin/finance' ? (
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-finance-modal'))}
                  className="w-[46px] h-[46px] mx-auto rounded-full bg-gradient-to-b from-[#38bdf8] via-[#0ea5e9] to-[#0284c7] text-white shadow-[0_6px_22px_rgba(14,165,233,0.52),inset_0_1px_1px_rgba(255,255,255,0.45)] flex items-center justify-center active:scale-90 transition-transform"
                  title="เพิ่มบันทึกการเงิน"
                >
                  <Plus className="w-6 h-6" strokeWidth={2.6} />
                </button>
              ) : (
                <Link
                  to="/admin/submit"
                  className="w-[46px] h-[46px] mx-auto rounded-full bg-gradient-to-b from-[#38bdf8] via-[#0ea5e9] to-[#0284c7] text-white shadow-[0_6px_22px_rgba(14,165,233,0.52),inset_0_1px_1px_rgba(255,255,255,0.45)] flex items-center justify-center active:scale-90 transition-transform"
                  title="เพิ่มงานเคลมใหม่"
                >
                  <Plus className="w-6 h-6" strokeWidth={2.6} />
                </Link>
              )}
            </div>

            {/* 4. รับแจ้ง */}
            <Link
              to="/admin/incoming"
              className={`flex flex-col items-center justify-center h-full relative transition-all active:scale-95 ${
                location.pathname === '/admin/incoming'
                  ? 'text-[#0071e3] dark:text-white'
                  : 'text-[#8e8e93] dark:text-gray-400'
              }`}
            >
              <Bell
                className="w-[19px] h-[19px]"
                strokeWidth={location.pathname === '/admin/incoming' ? 2.4 : 1.9}
              />
              <span
                className={`text-[10px] mt-0.5 leading-none ${
                  location.pathname === '/admin/incoming' ? 'font-bold' : 'font-semibold'
                }`}
              >
                รับแจ้ง
              </span>
              {unassignedCount > 0 && (
                <span className="absolute top-1.5 right-[12%] min-w-[16px] h-[16px] px-1 rounded-full bg-[#ff3b30] text-white text-[8.5px] font-extrabold flex items-center justify-center leading-none ring-2 ring-white dark:ring-[#141419]">
                  {unassignedCount > 99 ? '99+' : unassignedCount}
                </span>
              )}
            </Link>

            {/* 5. เมนู (Opens Full-Height Left Slide-Over Drawer) */}
            <button
              type="button"
              id="mobile-more-trigger"
              onClick={() => setIsMobileOpen(true)}
              className={`flex flex-col items-center justify-center h-full transition-all active:scale-95 ${
                isMobileOpen
                  ? 'text-[#0071e3] dark:text-white'
                  : 'text-[#8e8e93] dark:text-gray-400'
              }`}
            >
              <LayoutGrid
                className="w-[19px] h-[19px]"
                strokeWidth={isMobileOpen ? 2.4 : 1.9}
              />
              <span
                className={`text-[10px] mt-0.5 leading-none ${
                  isMobileOpen ? 'font-bold' : 'font-semibold'
                }`}
              >
                เมนู
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ===== Mobile Full-Height Left Slide-Over Drawer (King's Wealth Image 3) ===== */}
      {isMobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-[56] bg-black/60 animate-fade-in"
            onClick={() => setIsMobileOpen(false)}
          />
          <aside className="md:hidden fixed top-2 bottom-2 left-2 w-[82vw] max-w-[310px] z-[57] rounded-[28px] bg-[#f4f5f9] dark:bg-[#111116] border border-gray-200/80 dark:border-white/[0.1] shadow-2xl flex flex-col overflow-hidden animate-slide-in-left">
            {renderDrawerBody(true)}
          </aside>
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden fixed top-4 left-[calc(min(82vw,310px)+16px)] z-[57] w-10 h-10 rounded-[14px] bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg flex items-center justify-center active:scale-90 transition-transform"
            title="ปิดแถบเมนู"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </>
      )}

      {/* ===== Desktop Left Sidebar (Matching King's Wealth Design) ===== */}
      <aside
        className={`hidden md:flex flex-col w-[276px] z-50 bg-[#f4f5f9] dark:bg-[#111116] shrink-0 border-r border-gray-200/70 dark:border-white/[0.07] ${
          embedded ? 'h-full' : 'fixed left-0 top-0 bottom-0'
        }`}
      >
        {renderDrawerBody(false)}
      </aside>

      <SpotlightSearch isOpen={isSpotlightOpen} onClose={() => setIsSpotlightOpen(false)} />
    </>
  );
};
