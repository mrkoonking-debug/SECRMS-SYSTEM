
import React, { useEffect, useState, useRef } from 'react';
import { ShieldCheck, LogOut, Globe, LayoutGrid, List, PlusCircle, Plus, User, Users, Menu, X, Truck, Settings, BarChart3, Tag, Building2, Bell, History, RefreshCw, Wallet, Trash2, ChevronRight } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MockDb } from '../services/mockDb';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageToggle } from './LanguageToggle';
import { ThemeToggle } from './ThemeToggle';

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
  const [user, setUser] = useState<any>(null);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const isScrollingDownRef = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

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
    const interval = setInterval(checkIncoming, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
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
    const isActive = location.pathname === to;
    
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
              ? 'bg-blue-500/10 dark:bg-white/[0.08] text-[#0071e3] dark:text-white font-bold border border-blue-500/30' 
              : 'text-[#1d1d1f] dark:text-gray-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
          }`}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white shadow-sm ${getIconStyle()}`}>
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
        className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-[18px] transition-all duration-200 active:scale-[0.98] ${
          isActive 
            ? 'bg-blue-500/[0.08] dark:bg-white/[0.05] border border-blue-500/40 dark:border-amber-400/35 shadow-sm' 
            : 'border border-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.035] hover:border-black/[0.04] dark:hover:border-white/[0.04]'
        }`}
      >
        {/* Large Circular Icon (Image 2 style) */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white shadow-md ${getIconStyle()} transition-transform duration-200 group-hover:scale-105`}>
          <Icon className="w-5 h-5 text-white" strokeWidth={2.2} />
        </div>

        {/* 2-line Text Column (Title + Subtitle) */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={`text-[13px] md:text-[13.5px] font-bold tracking-tight truncate ${
              isActive ? 'text-[#0071e3] dark:text-white' : 'text-[#1d1d1f] dark:text-gray-200 group-hover:text-[#0071e3] dark:group-hover:text-white'
            }`}>
              {label}
            </span>
            {badgeCount > 0 && (
              <span className="min-w-[18px] h-4.5 flex items-center justify-center text-[10px] font-bold px-1.5 rounded-full bg-red-500 text-white shadow-sm">
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}
          </div>
          {subLabel && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate leading-tight mt-0.5 group-hover:text-gray-500 dark:group-hover:text-gray-400">
              {subLabel}
            </span>
          )}
        </div>

        {/* Right Indicator: Active Dot vs Subtle Chevron */}
        <div className="shrink-0 flex items-center pl-1">
          {isActive ? (
            <span className="w-2 h-2 rounded-full bg-[#0071e3] dark:bg-[#38bdf8] shadow-[0_0_8px_rgba(0,113,227,0.8)] dark:shadow-[0_0_8px_rgba(56,189,248,0.8)] animate-pulse" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-400" />
          )}
        </div>
      </Link>
    );
  };

  const navContent = (
    <>
      {user ? (
        <div className="space-y-4">
          {/* Section 1: การนำทางหลัก · NAVIGATION */}
          <div>
            <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-2 flex items-center gap-1.5">
              <span>การนำทางหลัก</span>
              <span className="text-gray-300 dark:text-gray-600 font-mono">·</span>
              <span className="text-[9px] text-gray-400/80 dark:text-gray-500 tracking-widest font-sans">NAVIGATION</span>
            </div>
            <div className="space-y-1">
              <NavLink 
                to="/admin/dashboard" 
                label={t('nav.overview')} 
                subLabel="ภาพรวมระบบ & สถิติสำคัญ"
                icon={LayoutGrid} 
                badgeCount={overdueCount} 
              />
              <NavLink 
                to="/admin/incoming" 
                label={t('nav.incoming')} 
                subLabel="งานรอดำเนินการจากลูกค้า"
                icon={Bell} 
                badgeCount={unassignedCount} 
              />
              <NavLink 
                to="/admin/rmas" 
                label={t('nav.claims')} 
                subLabel="ติดตามสถานะ & ค้นหางาน"
                icon={List} 
              />
              <NavLink 
                to="/admin/submit" 
                label={t('nav.newRequest')} 
                subLabel="ลงทะเบียนรับเคลมสินค้า"
                icon={PlusCircle} 
              />
              <NavLink 
                to="/admin/reports" 
                label={t('nav.reports')} 
                subLabel="วิเคราะห์ข้อมูล & ออกรายงาน"
                icon={BarChart3} 
              />
            </div>
          </div>

          {/* Section 2: การเงินและบัญชี · FINANCE */}
          {(user.role === 'admin' || (user as any).canAccessFinance) && (
            <div>
              <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-2 flex items-center gap-1.5">
                <span>การเงินและบัญชี</span>
                <span className="text-gray-300 dark:text-gray-600 font-mono">·</span>
                <span className="text-[9px] text-gray-400/80 dark:text-gray-500 tracking-widest font-sans">FINANCE</span>
              </div>
              <div className="space-y-1">
                <NavLink 
                  to="/admin/finance" 
                  label="การเงิน / บันทึกรายจ่าย" 
                  subLabel="เงินสดย่อย & รายรับรายจ่าย"
                  icon={Wallet} 
                />
              </div>
            </div>
          )}

          {/* Section 3: การจัดการระบบ · SYSTEM */}
          {user.role === 'admin' && (
            <div>
              <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-2 flex items-center gap-1.5">
                <span>การจัดการระบบ</span>
                <span className="text-gray-300 dark:text-gray-600 font-mono">·</span>
                <span className="text-[9px] text-gray-400/80 dark:text-gray-500 tracking-widest font-sans">SYSTEM</span>
              </div>
              <div className="space-y-1">
                <NavLink 
                  to="/admin/users" 
                  label={t('nav.users')} 
                  subLabel="ผู้ใช้งาน & สิทธิ์การเข้าถึง"
                  icon={Users} 
                />
                <NavLink 
                  to="/admin/logs" 
                  label="System Logs" 
                  subLabel="ประวัติการทำงานในระบบ"
                  icon={History} 
                />
                <NavLink 
                  to="/admin/brands" 
                  label={t('nav.brands')} 
                  subLabel="ข้อมูลยี่ห้อ & การรับประกัน"
                  icon={Tag} 
                />
                <NavLink 
                  to="/admin/distributors" 
                  label={t('nav.distributors')} 
                  subLabel="ศูนย์เคลม & ผู้นำเข้าสินค้า"
                  icon={Building2} 
                />
                <NavLink 
                  to="/admin/settings" 
                  label={t('nav.settings')} 
                  subLabel="ตั้งค่าการทำงานของระบบ"
                  icon={Settings} 
                />
                <NavLink 
                  to="/admin/recycle-bin" 
                  label="ถังขยะระบบ" 
                  subLabel="กู้คืน & ลบข้อมูลถาวร"
                  icon={Trash2} 
                />
              </div>
            </div>
          )}
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
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-white dark:bg-[#1e1e24] border-b border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between px-4 nav-glass">
        <Link to={user ? "/admin/dashboard" : "/"} className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
          <span className="font-bold text-[15px] text-[#1d1d1f] dark:text-white tracking-tight">SEC RMS</span>
        </Link>
        <button
          onClick={clearAllCachesAndReload}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-[#0071e3] hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all active:scale-90"
          title="ล้างแคช & รีเฟรช"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

       {/* ===== Mobile Bottom Tab Bar (Premium Floating Capsule Style) ===== */}
       {user && (
         <>
           <div
             className="md:hidden fixed left-0 right-0 z-40 pointer-events-none flex justify-center items-end transition-all duration-300"
             style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
           >
             {/* Glass capsule bar */}
             <div 
               className={`
                  apple-fluid-transition relative bg-white dark:bg-[#121214] border border-white/20 dark:border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.4)] grid grid-cols-5 items-center pointer-events-auto px-1 rounded-full nav-glass
                   ${isScrollingDown ? 'h-[40px] px-2 w-[50%] max-w-[200px]' : 'h-[56px] w-[90%] max-w-[380px]'}
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
               className="md:hidden fixed right-3 w-[250px] bg-white dark:bg-[#16161a] border border-gray-200/50 dark:border-white/[0.08] rounded-2xl shadow-xl z-50 pointer-events-auto flex flex-col overflow-hidden animate-slide-up transition-all duration-300"
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



      <aside className={`hidden md:flex flex-col w-80 z-50 bg-white dark:bg-[#1c1c1e] shrink-0 border-r border-gray-200/50 dark:border-white/[0.08] ${embedded ? 'h-full' : 'fixed left-0 top-0 bottom-0'}`}>
        <div className="p-6 pb-3">
          <Link to={user ? "/admin/dashboard" : "/"} className="flex items-center gap-3 group">
            <div className="h-9 w-9 flex items-center justify-center transition-transform group-hover:scale-105">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-lg text-[#1d1d1f] dark:text-white tracking-tighter text-nowrap">SEC RMS SYSTEM</span>
          </Link>
        </div>

        <div className="flex-1 flex flex-col gap-1 px-3.5 py-3 overflow-y-auto custom-scrollbar">
          {navContent}
        </div>

        <div className="p-4 mt-auto">
          <div className="flex items-center justify-between mb-6 bg-white/50 dark:bg-white/[0.03] p-2 rounded-full shadow-sm border border-gray-200/30 dark:border-white/[0.06]">
            <div className="flex gap-1"><ThemeToggle /><LanguageToggle /></div>
            <div className="flex gap-1">
              <button
                onClick={clearAllCachesAndReload}
                className="p-2 rounded-full text-[#86868b] hover:text-[#0071e3] transition-colors"
                title="ล้างแคช & รีเฟรช"
              ><RefreshCw className="h-4 w-4" /></button>
              {user && <Link to="/" title="Go to Website" className="p-2 rounded-full text-[#86868b] hover:text-[#0071e3] transition-colors"><Globe className="h-4 w-4" /></Link>}
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-gray-200/30 dark:border-white/[0.06] shadow-sm">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#3a3a3c] flex items-center justify-center font-bold text-gray-400">{user.name.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-[#1d1d1f] dark:text-white truncate">{user.name}</div>
                <div className="text-[10px] text-[#86868b] truncate uppercase tracking-wider">{user.role}</div>
              </div>
              <button onClick={handleLogout} className="p-2 text-[#86868b] hover:text-red-500 transition-colors" title="Logout"><LogOut className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
