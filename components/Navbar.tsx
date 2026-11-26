
import React, { useEffect, useState, useRef } from 'react';
import { Globe, LayoutGrid, List, PlusCircle, Users, Menu, Settings, BarChart3, Tag, Building2, Bell, History, RefreshCw, Wallet, Trash2, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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
  const [user, setUser] = useState<any>(() => MockDb.getCurrentUser());
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sec_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const isScrollingDownRef = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('sec_sidebar_collapsed', String(next));
      } catch { }
      return next;
    });
  };

  // Track scroll direction on the main scroll container to collapse mobile bottom bar smoothly
  useEffect(() => {
    let lastScrollTop = 0;
    let ticking = false;
    const scrollEl = document.getElementById('app-main-scroll');

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollTop = scrollEl
            ? scrollEl.scrollTop
            : (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0);
          const diff = scrollTop - lastScrollTop;

          if (scrollTop < 12) {
            if (isScrollingDownRef.current) {
              isScrollingDownRef.current = false;
              setIsScrollingDown(false);
            }
            lastScrollTop = scrollTop;
          } else if (diff > 30) {
            if (!isScrollingDownRef.current) {
              isScrollingDownRef.current = true;
              setIsScrollingDown(true);
            }
            lastScrollTop = scrollTop;
          } else if (diff < -30) {
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

    const target: EventTarget = scrollEl || window;
    target.addEventListener('scroll', handleScroll, { passive: true } as AddEventListenerOptions);
    return () => target.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

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

    if (compact) {
      return (
        <Link
          to={to}
          className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-150 ${
            isActive
              ? 'bg-[#0071e3]/10 text-[#0071e3] dark:bg-blue-500/15 dark:text-blue-400 font-semibold'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
          <span className="text-[13px] tracking-tight flex-1 truncate">{label}</span>
          {badgeCount > 0 && (
            <span className="min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold px-1.5 rounded-full bg-red-500 text-white">
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}
        </Link>
      );
    }

    return (
      <Link
        to={to}
        title={isCollapsed ? label : undefined}
        className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-2.5 px-3'} py-2.5 rounded-xl transition-all duration-150 ${
          isActive
            ? 'bg-[#0071e3]/10 text-[#0071e3] dark:bg-blue-500/15 dark:text-blue-400 font-semibold'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white font-medium'
        }`}
      >
        <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-[#0071e3] dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200'}`} strokeWidth={isActive ? 2.2 : 1.8} />

        {!isCollapsed && (
          <>
            <span className="text-[13px] tracking-tight truncate flex-1">{label}</span>
            {badgeCount > 0 && (
              <span className="min-w-[20px] h-5 flex items-center justify-center text-[10px] font-bold px-1.5 rounded-full bg-red-500 text-white shrink-0">
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}
          </>
        )}

        {isCollapsed && badgeCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#16181d]" />
        )}
      </Link>
    );
  };

  const navContent = (
    <>
      {user ? (
        <div className="space-y-5">
          {/* Section 1: หลัก */}
          <div>
            {!isCollapsed && (
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-1.5">
                หลัก
              </div>
            )}
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
              {!isCollapsed && (
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-1.5">
                  การเงิน
                </div>
              )}
              <div className="space-y-0.5">
                <NavLink
                  to="/admin/finance"
                  label="การเงิน / บันทึกรายจ่าย"
                  icon={Wallet}
                />
              </div>
            </div>
          )}

          {/* Section 3: จัดการระบบ */}
          {user.role === 'admin' && (
            <div>
              {!isCollapsed && (
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-1.5">
                  จัดการระบบ
                </div>
              )}
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
        <div className="space-y-3 animate-fade-in">
          <div className="w-16 h-2.5 rounded skeleton-shimmer ml-3" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-100/60 dark:bg-white/[0.03]">
              <div className="w-4 h-4 rounded skeleton-shimmer shrink-0" />
              <div className="w-28 h-3 rounded skeleton-shimmer" />
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a1d24] text-center mt-4 border border-slate-200/80 dark:border-white/[0.08]">
          <p className="text-sm font-bold text-slate-900 dark:text-white">Customer Portal</p>
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



      <aside className={`hidden md:flex flex-col ${isCollapsed ? 'w-[72px]' : 'w-64'} transition-[width] duration-200 z-50 bg-white dark:bg-[#16181d] shrink-0 border-r border-slate-200/80 dark:border-white/[0.08] ${embedded ? 'h-full' : 'fixed left-0 top-0 bottom-0'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center px-2 py-4' : 'justify-between px-4 py-4'} border-b border-slate-100 dark:border-white/[0.06]`}>
          <Link to={user ? "/admin/dashboard" : "/"} className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            {!isCollapsed && (
              <span className="font-extrabold text-[15px] text-slate-900 dark:text-white tracking-tight truncate">SEC RMS</span>
            )}
          </Link>
          {!isCollapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="ย่อแถบเมนู"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {isCollapsed && (
          <div className="px-2 pt-2.5 flex justify-center">
            <button
              type="button"
              onClick={toggleCollapsed}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="ขยายแถบเมนู"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className={`flex-1 flex flex-col gap-1 ${isCollapsed ? 'px-2' : 'px-3'} py-3 overflow-y-auto custom-scrollbar`}>
          {navContent}
        </div>

        <div className={`${isCollapsed ? 'p-2' : 'p-3'} mt-auto border-t border-slate-100 dark:border-white/[0.06] space-y-2.5`}>
          {!isCollapsed ? (
            <div className="flex items-center justify-between bg-slate-50 dark:bg-white/[0.03] px-2 py-1.5 rounded-xl border border-slate-200/70 dark:border-white/[0.06]">
              <div className="flex gap-1"><ThemeToggle /><LanguageToggle /></div>
              <div className="flex gap-0.5">
                <button
                  onClick={clearAllCachesAndReload}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#0071e3] hover:bg-white dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                  title="ล้างแคช & รีเฟรช"
                ><RefreshCw className="h-4 w-4" /></button>
                {user && (
                  <Link to="/" title="หน้าเว็บลูกค้า" className="p-1.5 rounded-lg text-slate-400 hover:text-[#0071e3] hover:bg-white dark:hover:bg-white/[0.06] transition-colors">
                    <Globe className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <ThemeToggle />
              <button
                onClick={clearAllCachesAndReload}
                className="p-2 rounded-lg text-slate-400 hover:text-[#0071e3] hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                title="ล้างแคช & รีเฟรช"
              ><RefreshCw className="h-4 w-4" /></button>
            </div>
          )}

          {user && (
            <div className={`flex items-center ${isCollapsed ? 'justify-center p-1.5' : 'gap-2.5 p-2.5'} rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]`}>
              <div className="w-8 h-8 rounded-lg bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                {user.name.charAt(0)}
              </div>
              {!isCollapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.name}</div>
                    <div className="text-[10px] text-slate-400 truncate uppercase tracking-wider">{user.role}</div>
                  </div>
                  <button onClick={handleLogout} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer" title="ออกจากระบบ">
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
