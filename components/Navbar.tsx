
import React, { useEffect, useState, useRef } from 'react';
import { LogOut, Globe, LayoutGrid, List, PlusCircle, Users, Menu, Settings, BarChart3, Tag, Building2, Bell, History, RefreshCw, Wallet, Trash2, ChevronRight, Search } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MockDb } from '../services/mockDb';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageToggle } from './LanguageToggle';
import { ThemeToggle } from './ThemeToggle';
import { SpotlightSearch } from './SpotlightSearch';

interface NavbarProps {
  embedded?: boolean;
}

const clearAllCachesAndReload = async () => {
  // Clear Service Worker registrations
  if ('serviceWorker' in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) await r.unregister();
    } catch (e) {
      console.error("SW unregister failed:", e);
    }
  }
  
  // Clear Cache Storage
  if ('caches' in window) {
    try {
      const keys = await caches.keys();
      for (const k of keys) await caches.delete(k);
    } catch (e) {
      console.error("Cache delete failed:", e);
    }
  }

  // Clear sessionStorage (temp search terms, filters, and expanded states)
  sessionStorage.clear();

  // Clear dropdown histories and tour progress from localStorage
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('gs_freq_') || key.startsWith('rmas_') || key.startsWith('onboarding_'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));

  // Clear IndexedDB databases (e.g. offline Firestore cache)
  if (window.indexedDB && window.indexedDB.databases) {
    try {
      const dbs = await window.indexedDB.databases();
      for (const dbInfo of dbs) {
        if (dbInfo.name) {
          window.indexedDB.deleteDatabase(dbInfo.name);
        }
      }
    } catch (e) {
      console.error("Failed to delete IndexedDB databases:", e);
    }
  }

  // Reload the page hard
  window.location.reload();
};

export const Navbar: React.FC<NavbarProps> = ({ embedded = false }) => {
  const [user, setUser] = useState<any>(() => MockDb.getCurrentUser());
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const isScrollingDownRef = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Global Spotlight Shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const onGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSpotlightOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, []);

  // Track scroll direction to collapse bottom tab bar on mobile (High Performance requestAnimationFrame throttling)
  useEffect(() => {
    let lastScrollTop = 0;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
          const diff = scrollTop - lastScrollTop;
          
          if (scrollTop < 10) {
            if (isScrollingDownRef.current) {
              isScrollingDownRef.current = false;
              setIsScrollingDown(false);
            }
            lastScrollTop = scrollTop;
          } else if (diff > 35) { // Scrolled down significantly
            if (!isScrollingDownRef.current) {
              isScrollingDownRef.current = true;
              setIsScrollingDown(true);
            }
            lastScrollTop = scrollTop;
          } else if (diff < -35) { // Scrolled up significantly
            if (isScrollingDownRef.current) {
              isScrollingDownRef.current = false;
              setIsScrollingDown(false);
            }
            lastScrollTop = scrollTop;
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu and expand bottom navigation on route change
  useEffect(() => {
    setIsMobileOpen(false);
    isScrollingDownRef.current = false;
    setIsScrollingDown(false);
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
        console.error("Failed to fetch counts", err);
      }
    };

    checkIncoming();
    const handleChanged = () => { checkIncoming(); };
    window.addEventListener('sec-rma-changed', handleChanged);
    const interval = setInterval(checkIncoming, 30000); // Check every 30 seconds
    return () => {
      clearInterval(interval);
      window.removeEventListener('sec-rma-changed', handleChanged);
    };
  }, [location]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Close popover menu on clicking outside
  useEffect(() => {
    if (!isMobileOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const popup = document.getElementById('mobile-more-popup');
      const trigger = document.getElementById('mobile-more-trigger');
      if (popup && !popup.contains(e.target as Node) && trigger && !trigger.contains(e.target as Node)) {
        setIsMobileOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isMobileOpen]);

  const handleLogout = () => {
    MockDb.logout();
    setUser(null);
    navigate('/login');
  };

  if (location.pathname === '/login') return null;

  const NavLink = ({ 
    to, 
    label, 
    subLabel,
    icon: Icon, 
    badgeCount = 0,
    compact = false
  }: { 
    to: string; 
    label: string; 
    subLabel?: string;
    icon: any; 
    badgeCount?: number;
    compact?: boolean;
  }) => {
    const isActive = location.pathname === to || (to === '/admin/rmas' && location.pathname.startsWith('/admin/job/'));
    
    // Vibrant solid/gradient circular icon background (Image 2 style)
    const getIconStyle = () => {
      switch (to) {
        case '/admin/dashboard': 
          return 'bg-gradient-to-br from-[#007aff] to-[#005bb5] shadow-blue-500/25';
        case '/admin/incoming': 
          return 'bg-gradient-to-br from-[#ff3b30] to-[#d62217] shadow-red-500/25';
        case '/admin/rmas': 
          return 'bg-gradient-to-br from-[#5856d6] to-[#4338ca] shadow-indigo-500/25';
        case '/admin/submit': 
          return 'bg-gradient-to-br from-[#34c759] to-[#248a3d] shadow-emerald-500/25';
        case '/admin/reports': 
          return 'bg-gradient-to-br from-[#af52de] to-[#8b2fc9] shadow-purple-500/25';
        case '/admin/finance': 
          return 'bg-gradient-to-br from-[#0284c7] to-[#0369a1] shadow-sky-500/25';
        case '/admin/users': 
          return 'bg-gradient-to-br from-[#ff9500] to-[#d97706] shadow-amber-500/25';
        case '/admin/logs': 
          return 'bg-gradient-to-br from-[#64748b] to-[#475569] shadow-slate-500/25';
        case '/admin/brands': 
          return 'bg-gradient-to-br from-[#ff2d55] to-[#e11d48] shadow-rose-500/25';
        case '/admin/distributors': 
          return 'bg-gradient-to-br from-[#0d9488] to-[#0f766e] shadow-teal-500/25';
        case '/admin/settings': 
          return 'bg-gradient-to-br from-[#52525b] to-[#3f3f46] shadow-zinc-500/25';
        case '/admin/recycle-bin': 
          return 'bg-gradient-to-br from-[#dc2626] to-[#b91c1c] shadow-red-500/25';
        default: 
          return 'bg-gradient-to-br from-[#007aff] to-[#005bb5] shadow-blue-500/25';
      }
    };

    if (compact) {
      return (
        <Link 
          to={to} 
          className={`group relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all duration-150 active:scale-[0.98] ${
            isActive 
              ? 'bg-[#0071e3]/10 dark:bg-white/[0.1] text-[#0071e3] dark:text-white font-bold' 
              : 'text-[#1d1d1f] dark:text-gray-200 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
          }`}
        >
          <div className={`w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0 text-white shadow-sm ${getIconStyle()}`}>
            <Icon className="w-4 h-4 text-white" strokeWidth={2.2} />
          </div>
          <span className="text-xs font-semibold tracking-tight flex-1 truncate">{label}</span>
          {badgeCount > 0 && (
            <div className="min-w-[18px] h-4.5 flex items-center justify-center text-[10px] font-bold px-1.5 rounded-full bg-red-500 text-white">
              {badgeCount > 99 ? '99+' : badgeCount}
            </div>
          )}
        </Link>
      );
    }

    return (
      <Link 
        to={to} 
        className={`group relative flex items-center gap-2.5 px-2.5 py-2 rounded-[13px] transition-all duration-150 active:scale-[0.98] ${
          isActive 
            ? 'bg-[#0071e3]/10 dark:bg-white/[0.11] text-[#0071e3] dark:text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.45)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]' 
            : 'text-[#1d1d1f] dark:text-gray-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
        }`}
      >
        {/* macOS Settings-style Vibrant Squircle Icon Badge */}
        <div className={`w-8 h-8 rounded-[9px] flex items-center justify-center text-white shrink-0 transition-transform duration-150 ${getIconStyle()} ${
          isActive 
            ? 'shadow-md ring-1 ring-white/25 scale-[1.03]' 
            : 'shadow-sm group-hover:scale-105'
        }`}>
          <Icon className="w-4 h-4 text-white" strokeWidth={2.2} />
        </div>

        {/* Clean Single-Line Title so ALL menus fit effortlessly without scrolling */}
        <span className={`text-[13.5px] tracking-tight truncate flex-1 transition-colors ${
          isActive ? 'font-bold text-[#0071e3] dark:text-white' : 'font-semibold text-[#1d1d1f] dark:text-gray-200 group-hover:text-[#0071e3] dark:group-hover:text-white'
        }`}>
          {label}
        </span>

        {badgeCount > 0 && (
          <span className="min-w-[20px] h-5 flex items-center justify-center text-[10px] font-extrabold px-1.5 rounded-full bg-[#ff3b30] text-white shadow-sm shrink-0">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}

        {badgeCount === 0 && (
          <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-all duration-150 ${
            isActive 
              ? 'text-[#0071e3] dark:text-white/80 opacity-100' 
              : 'text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'
          }`} />
        )}
      </Link>
    );
  };

  const navContent = (
    <>
      {user ? (
        <div className="space-y-3.5">
          {/* Section 1: งานประจำวัน */}
          <div>
            <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2.5 mb-1.5">
              งานหลัก
            </div>
            <div className="space-y-0.5">
              <NavLink 
                to="/admin/dashboard" 
                label={t('nav.overview')} 
                icon={LayoutGrid} 
                badgeCount={overdueCount} 
              />
              <NavLink 
                to="/admin/incoming" 
                label={t('nav.incoming')} 
                icon={Bell} 
                badgeCount={unassignedCount} 
              />
              <NavLink 
                to="/admin/rmas" 
                label={t('nav.claims')} 
                icon={List} 
              />
              <NavLink 
                to="/admin/submit" 
                label={t('nav.newRequest')} 
                icon={PlusCircle} 
              />
              <NavLink 
                to="/admin/reports" 
                label={t('nav.reports')} 
                icon={BarChart3} 
              />
            </div>
          </div>

          {/* Section 2: การเงิน */}
          {(user.role === 'admin' || (user as any).canAccessFinance) && (
            <div>
              <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2.5 mb-1.5">
                การเงินและบัญชี
              </div>
              <div className="space-y-0.5">
                <NavLink 
                  to="/admin/finance" 
                  label="การเงิน / รายจ่าย" 
                  icon={Wallet} 
                />
              </div>
            </div>
          )}

          {/* Section 3: จัดการระบบ */}
          {user.role === 'admin' && (
            <div>
              <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2.5 mb-1.5">
                จัดการระบบ
              </div>
              <div className="space-y-0.5">
                <NavLink 
                  to="/admin/users" 
                  label={t('nav.users')} 
                  icon={Users} 
                />
                <NavLink 
                  to="/admin/logs" 
                  label="System Logs" 
                  icon={History} 
                />
                <NavLink 
                  to="/admin/brands" 
                  label={t('nav.brands')} 
                  icon={Tag} 
                />
                <NavLink 
                  to="/admin/distributors" 
                  label={t('nav.distributors')} 
                  icon={Building2} 
                />
                <NavLink 
                  to="/admin/settings" 
                  label={t('nav.settings')} 
                  icon={Settings} 
                />
                <NavLink 
                  to="/admin/recycle-bin" 
                  label="ถังขยะระบบ" 
                  icon={Trash2} 
                />
              </div>
            </div>
          )}
        </div>
      ) : location.pathname.startsWith('/admin') ? (
        <div className="space-y-4 animate-fade-in">
          <div>
            <div className="w-20 h-3 rounded-md skeleton-shimmer mb-3 ml-3" />
            <div className="space-y-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03]">
                  <div className="w-8 h-8 rounded-xl skeleton-shimmer shrink-0" />
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
        <div className="p-6 rounded-3xl bg-white dark:bg-[#1c1c1e] text-center mt-4 shadow-sm border border-gray-100 dark:border-[#333]">
          <p className="text-base font-bold text-[#1d1d1f] dark:text-white mb-2">Customer Portal</p>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* ===== Mobile Top Bar — Glassmorphism ===== */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-[55] h-14 bg-white dark:bg-[#1e1e24] border-b border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between px-4 nav-glass">
        <Link to={user ? "/admin/dashboard" : "/"} className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
          <span className="font-bold text-[15px] text-[#1d1d1f] dark:text-white tracking-tight">SEC RMS</span>
        </Link>
        <div className="flex items-center gap-1">
          {user && (
            <button
              type="button"
              onClick={() => setIsSpotlightOpen(true)}
              className="h-8 px-2.5 rounded-full bg-black/[0.04] dark:bg-white/[0.07] flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-300 active:scale-95 transition-all"
              title="ค้นหาด่วน"
            >
              <Search className="w-3.5 h-3.5 text-[#0071e3]" />
              <span>ค้นหา</span>
            </button>
          )}
          <button
            onClick={clearAllCachesAndReload}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-[#0071e3] hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all active:scale-90"
            title="ล้างแคช & รีเฟรช"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

       {/* ===== Mobile Bottom Tab Bar (Premium Floating Capsule Style) ===== */}
       {user && (
         <>
           <div
             className="md:hidden fixed left-0 right-0 z-[55] pointer-events-none flex justify-center items-end transition-all duration-300"
             style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
           >
             {/* Glass capsule bar */}
             <div 
               className={`
                  apple-fluid-transition relative bg-white dark:bg-[#121214] border border-gray-200/70 dark:border-white/[0.12] shadow-[0_8px_30px_rgba(0,0,0,0.14)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.55)] grid grid-cols-5 items-center pointer-events-auto px-1 rounded-full nav-glass
                   ${isScrollingDown ? 'h-[40px] px-2 w-[50%] max-w-[200px]' : 'h-[56px] w-[92%] max-w-[390px]'}
               `}
             >
  
               {/* Dashboard */}
               <Link to="/admin/dashboard" onClick={() => { isScrollingDownRef.current = false; setIsScrollingDown(false); }} className={`flex flex-col items-center justify-center h-full relative transition-all duration-200 ${location.pathname === '/admin/dashboard' ? 'text-[#007aff]' : 'text-[#8e8e93] active:text-[#007aff]'}`}>
                 <div className={`transition-all duration-300 ${isScrollingDown ? 'scale-90' : 'scale-100'}`}>
                   <div className={`transition-all duration-200 ${location.pathname === '/admin/dashboard' ? 'scale-110' : ''}`}><LayoutGrid className="w-[19px] h-[19px]" strokeWidth={location.pathname === '/admin/dashboard' ? 2.2 : 1.8} /></div>
                 </div>
                 <span className={`text-[9px] font-semibold apple-fluid-item ${isScrollingDown ? 'opacity-0 scale-50 max-h-0 mt-0 overflow-hidden' : 'opacity-100 scale-100 max-h-4 mt-0.5 leading-none'} ${location.pathname === '/admin/dashboard' ? 'font-bold' : ''}`}>ภาพรวม</span>
                 {!isScrollingDown && overdueCount > 0 && (
                   <span className="absolute rounded-full bg-red-500 ring-2 ring-white dark:ring-[#22222a] top-1.5 right-[18%] w-[6px] h-[6px]"></span>
                 )}
               </Link>
  
               {/* Claims List */}
               <Link to="/admin/rmas" onClick={() => { isScrollingDownRef.current = false; setIsScrollingDown(false); }} className={`flex flex-col items-center justify-center h-full transition-all duration-200 ${location.pathname === '/admin/rmas' ? 'text-[#007aff]' : 'text-[#8e8e93] active:text-[#007aff]'}`}>
                 <div className={`transition-all duration-300 ${isScrollingDown ? 'scale-90' : 'scale-100'}`}>
                   <div className={`transition-all duration-200 ${location.pathname === '/admin/rmas' ? 'scale-110' : ''}`}><List className="w-[19px] h-[19px]" strokeWidth={location.pathname === '/admin/rmas' ? 2.2 : 1.8} /></div>
                 </div>
                 <span className={`text-[9px] font-semibold apple-fluid-item ${isScrollingDown ? 'opacity-0 scale-50 max-h-0 mt-0 overflow-hidden' : 'opacity-100 scale-100 max-h-4 mt-0.5 leading-none'} ${location.pathname === '/admin/rmas' ? 'font-bold' : ''}`}>รายการ</span>
               </Link>
  
               {/* Submit Claim or Add Finance dynamic tab */}
               {location.pathname === '/admin/finance' ? (
                 <button 
                   onClick={() => { 
                     isScrollingDownRef.current = false; 
                     setIsScrollingDown(false); 
                     window.dispatchEvent(new CustomEvent('open-finance-modal'));
                   }} 
                   className="flex flex-col items-center justify-center h-full transition-all duration-200 text-[#007aff] active:scale-90"
                 >
                   <div className={`transition-all duration-300 ${isScrollingDown ? 'scale-90' : 'scale-100'}`}>
                     <div className="scale-110">
                       <PlusCircle className="w-[19px] h-[19px] text-[#007aff]" strokeWidth={2.2} />
                     </div>
                   </div>
                   <span className={`text-[9px] font-bold apple-fluid-item ${isScrollingDown ? 'opacity-0 scale-50 max-h-0 mt-0 overflow-hidden' : 'opacity-100 scale-100 max-h-4 mt-0.5 leading-none'}`}>เพิ่มบันทึก</span>
                 </button>
               ) : (
                 <Link to="/admin/submit" onClick={() => { isScrollingDownRef.current = false; setIsScrollingDown(false); }} className={`flex flex-col items-center justify-center h-full transition-all duration-200 ${location.pathname === '/admin/submit' ? 'text-[#007aff]' : 'text-[#8e8e93] active:text-[#007aff]'}`}>
                   <div className={`transition-all duration-300 ${isScrollingDown ? 'scale-90' : 'scale-100'}`}>
                     <div className={`transition-all duration-200 ${location.pathname === '/admin/submit' ? 'scale-110' : ''}`}><PlusCircle className="w-[19px] h-[19px]" strokeWidth={location.pathname === '/admin/submit' ? 2.2 : 1.8} /></div>
                   </div>
                   <span className={`text-[9px] font-semibold apple-fluid-item ${isScrollingDown ? 'opacity-0 scale-50 max-h-0 mt-0 overflow-hidden' : 'opacity-100 scale-100 max-h-4 mt-0.5 leading-none'} ${location.pathname === '/admin/submit' ? 'font-bold' : ''}`}>เพิ่มเคลม</span>
                 </Link>
               )}
  
               {/* Notifications */}
               <Link to="/admin/incoming" onClick={() => { isScrollingDownRef.current = false; setIsScrollingDown(false); }} className={`flex flex-col items-center justify-center h-full relative transition-all duration-200 ${location.pathname === '/admin/incoming' ? 'text-[#007aff]' : 'text-[#8e8e93] active:text-[#007aff]'}`}>
                 <div className={`transition-all duration-300 ${isScrollingDown ? 'scale-90' : 'scale-100'}`}>
                   <div className={`transition-all duration-200 ${location.pathname === '/admin/incoming' ? 'scale-110' : ''}`}><Bell className="w-[19px] h-[19px]" strokeWidth={location.pathname === '/admin/incoming' ? 2.2 : 1.8} /></div>
                 </div>
                 <span className={`text-[9px] font-semibold apple-fluid-item ${isScrollingDown ? 'opacity-0 scale-50 max-h-0 mt-0 overflow-hidden' : 'opacity-100 scale-100 max-h-4 mt-0.5 leading-none'} ${location.pathname === '/admin/incoming' ? 'font-bold' : ''}`}>แจ้งเตือน</span>
                 {!isScrollingDown && unassignedCount > 0 && (
                   <span className="absolute flex items-center justify-center bg-red-500 text-white font-bold rounded-full px-1 leading-none ring-2 ring-white dark:ring-[#22222a] top-1 right-[10%] min-w-[16px] h-[16px] text-[8px]">
                     {unassignedCount > 99 ? '99+' : unassignedCount}
                   </span>
                 )}
               </Link>
  
               {/* More Menu */}
               <button id="mobile-more-trigger" onClick={() => { setIsMobileOpen(!isMobileOpen); isScrollingDownRef.current = false; setIsScrollingDown(false); }} className={`flex flex-col items-center justify-center h-full transition-all duration-200 ${isMobileOpen ? 'text-[#007aff]' : 'text-[#8e8e93] active:text-[#007aff]'}`}>
                 <div className={`transition-all duration-300 ${isScrollingDown ? 'scale-90' : 'scale-100'}`}>
                   <div className={`transition-all duration-200 ${isMobileOpen ? 'scale-110' : ''}`}><Menu className="w-[19px] h-[19px]" strokeWidth={isMobileOpen ? 2.2 : 1.8} /></div>
                 </div>
                 <span className={`text-[9px] font-semibold apple-fluid-item ${isScrollingDown ? 'opacity-0 scale-50 max-h-0 mt-0 overflow-hidden' : 'opacity-100 scale-100 max-h-4 mt-0.5 leading-none'} ${isMobileOpen ? 'font-bold' : ''}`}>อื่นๆ</span>
               </button>
             </div>
           </div>
  
           {/* ===== Mobile Popover Menu (Premium Non-blocking macOS Style) ===== */}
           {isMobileOpen && (
             <div 
               id="mobile-more-popup" 
               className="md:hidden fixed right-3 w-[250px] max-h-[70dvh] overflow-y-auto custom-scrollbar bg-white dark:bg-[#16161a] border border-gray-200/70 dark:border-white/[0.1] rounded-2xl shadow-2xl z-[56] pointer-events-auto flex flex-col animate-slide-up transition-all duration-300"
               style={{ bottom: isScrollingDown ? 'calc(62px + env(safe-area-inset-bottom))' : 'calc(78px + env(safe-area-inset-bottom))' }}
             >
              {/* Quick Settings */}
              <div className="p-2 border-b border-gray-100/50 dark:border-white/[0.04]">
                <div className="flex items-center justify-between bg-gray-50 dark:bg-white/[0.03] p-1 rounded-xl border border-gray-100 dark:border-white/[0.04]">
                  <div className="flex gap-1.5"><ThemeToggle /><LanguageToggle /></div>
                  {user && (
                    <Link to="/" title="Go to Website" className="p-1.5 rounded-lg text-gray-400 hover:text-[#0071e3] hover:bg-white dark:hover:bg-white/[0.06] transition-all">
                      <Globe className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Navigation Options */}
              <div className="p-2 space-y-1">
                {user?.role === 'admin' ? (
                  <>
                    <div className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-2 mb-1.5">การจัดการระบบ</div>
                    <NavLink to="/admin/users" label={t('nav.users')} icon={Users} compact={true} />
                    <NavLink to="/admin/logs" label="System Logs" icon={History} compact={true} />
                    <NavLink to="/admin/brands" label={t('nav.brands')} icon={Tag} compact={true} />
                    <NavLink to="/admin/distributors" label={t('nav.distributors')} icon={Building2} compact={true} />
                    <NavLink to="/admin/settings" label={t('nav.settings')} icon={Settings} compact={true} />
                    <NavLink to="/admin/recycle-bin" label="ถังขยะระบบ" icon={Trash2} compact={true} />
                    <NavLink to="/admin/reports" label={t('nav.reports')} icon={BarChart3} compact={true} />
                    <NavLink to="/admin/finance" label="การเงิน / บันทึกรายจ่าย" icon={Wallet} compact={true} />
                  </>
                ) : (
                  <>
                    <div className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-2 mb-1.5">การจัดการ</div>
                    <NavLink to="/admin/reports" label={t('nav.reports')} icon={BarChart3} compact={true} />
                    <NavLink to="/admin/settings" label={t('nav.settings')} icon={Settings} compact={true} />
                    <NavLink to="/admin/finance" label="การเงิน / บันทึกรายจ่าย" icon={Wallet} compact={true} />
                  </>
                )}
              </div>

              {/* User Profile & Logout */}
              {user && (
                <div className="p-3 border-t border-gray-100/50 dark:border-white/[0.04] bg-gray-50/50 dark:bg-white/[0.01] flex items-center gap-2.5 shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#3a3a3c] flex items-center justify-center font-bold text-gray-500 dark:text-gray-400 text-xs shrink-0">
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-[#1d1d1f] dark:text-white truncate">{user.name}</div>
                    <div className="text-[9px] text-gray-450 dark:text-gray-500 truncate uppercase tracking-wider mt-0.5">{user.role}</div>
                  </div>
                  <button onClick={handleLogout} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all shrink-0" title="Logout">
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}



      <aside className={`hidden md:flex flex-col w-64 z-50 bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-xl shrink-0 border-r border-gray-200/60 dark:border-white/[0.08] ${embedded ? 'h-full' : 'fixed left-0 top-0 bottom-0'}`}>
        <div className="px-4 pt-4 pb-2.5 space-y-3">
          <Link to={user ? "/admin/dashboard" : "/"} className="flex items-center gap-2.5 group px-1">
            <div className="h-8 w-8 flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-extrabold text-[16px] text-[#1d1d1f] dark:text-white tracking-tight text-nowrap">SEC RMS</span>
          </Link>

          {/* Apple Spotlight Search Trigger */}
          {user && (
            <button
              type="button"
              onClick={() => setIsSpotlightOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-[12px] bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] border border-black/[0.04] dark:border-white/[0.07] text-xs text-gray-500 dark:text-gray-400 transition-all cursor-pointer group"
            >
              <Search className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#0071e3] transition-colors shrink-0" />
              <span className="flex-1 text-left font-medium truncate">ค้นหาด่วน...</span>
              <kbd className="px-1.5 py-0.5 text-[9.5px] font-bold bg-white/80 dark:bg-black/40 text-gray-400 rounded-md border border-black/5 dark:border-white/10">
                Ctrl K
              </kbd>
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-1 px-2.5 py-2 overflow-y-auto custom-scrollbar">
          {navContent}
        </div>

        <div className="p-3 mt-auto border-t border-gray-100 dark:border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between bg-black/[0.03] dark:bg-white/[0.04] px-2 py-1.5 rounded-full border border-gray-200/40 dark:border-white/[0.06]">
            <div className="flex gap-1"><ThemeToggle /><LanguageToggle /></div>
            <div className="flex gap-0.5">
              <button
                onClick={clearAllCachesAndReload}
                className="p-1.5 rounded-full text-[#86868b] hover:text-[#0071e3] hover:bg-white dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="ล้างแคช & รีเฟรช"
              ><RefreshCw className="h-3.5 w-3.5" /></button>
              {user && <Link to="/" title="หน้าเว็บลูกค้า" className="p-1.5 rounded-full text-[#86868b] hover:text-[#0071e3] hover:bg-white dark:hover:bg-white/10 transition-colors"><Globe className="h-3.5 w-3.5" /></Link>}
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-2.5 p-2 rounded-[16px] bg-black/[0.02] dark:bg-white/[0.04] border border-gray-200/40 dark:border-white/[0.06]">
              <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#007aff] to-[#005bb5] flex items-center justify-center font-bold text-white text-xs shadow-xs shrink-0">{user.name.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-[#1d1d1f] dark:text-white truncate">{user.name}</div>
                <div className="text-[9.5px] text-[#86868b] truncate uppercase tracking-wider">{user.role}</div>
              </div>
              <button onClick={handleLogout} className="p-1.5 rounded-lg text-[#86868b] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer" title="ออกจากระบบ"><LogOut className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </div>
      </aside>

      <SpotlightSearch isOpen={isSpotlightOpen} onClose={() => setIsSpotlightOpen(false)} />
    </>
  );
};
