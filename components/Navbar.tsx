
import React, { useEffect, useState } from 'react';
import { ShieldCheck, LogOut, Globe, LayoutGrid, List, PlusCircle, Plus, User, Users, Menu, X, Truck, Settings, BarChart3, Tag, Building2, Bell, History, RefreshCw } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MockDb } from '../services/mockDb';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageToggle } from './LanguageToggle';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
  embedded?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ embedded = false }) => {
  const [user, setUser] = useState<any>(null);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

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

  const handleLogout = () => {
    MockDb.logout();
    setUser(null);
    navigate('/login');
  };

  if (location.pathname === '/login') return null;

  const NavLink = ({ to, label, icon: Icon, badgeCount = 0 }: { to: string, label: string, icon: any, badgeCount?: number }) => {
    const isActive = location.pathname === to;
    
    // Get macOS style icon background color
    const getIconBgColor = () => {
      switch (to) {
        case '/admin/dashboard': return 'bg-[#007aff]'; // Blue
        case '/admin/incoming': return 'bg-[#ff3b30]'; // Red
        case '/admin/rmas': return 'bg-[#5856d6]'; // Purple
        case '/admin/submit': return 'bg-[#34c759]'; // Green
        case '/admin/reports': return 'bg-[#af52de]'; // Pink/Purple
        case '/admin/users': return 'bg-[#ff9500]'; // Orange
        case '/admin/logs': return 'bg-[#8e8e93]'; // Gray
        case '/admin/brands': return 'bg-[#ff2d55]'; // Rose
        case '/admin/distributors': return 'bg-[#30b0c7]'; // Teal
        case '/admin/settings': return 'bg-[#555]'; // Gear Gray
        default: return 'bg-[#007aff]';
      }
    };

    return (
      <Link to={to} className={`group relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-all duration-150 ${isActive ? 'bg-[#007aff] text-white' : 'text-[#1d1d1f] dark:text-gray-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:scale-[0.98]'}`}>
        <div className={`w-[26px] h-[26px] rounded-[6px] flex items-center justify-center flex-shrink-0 ${getIconBgColor()} shadow-sm`}>
          <Icon className="w-3.5 h-3.5 text-white" strokeWidth={2.2} />
        </div>
        <span className="text-[13px] font-medium tracking-tight flex-1">{label}</span>

        {/* Badge count */}
        {badgeCount > 0 && (
          <div className={`min-w-[18px] h-4.5 flex items-center justify-center text-[10px] font-bold px-1.5 rounded-full ${isActive ? 'bg-white text-[#007aff]' : 'bg-red-500 text-white'}`}>
            {badgeCount > 99 ? '99+' : badgeCount}
          </div>
        )}
      </Link>
    );
  };

  const navContent = (
    <>
      {user ? (
        <>
          <div className="text-[9.5px] font-bold text-[#86868b]/75 uppercase tracking-widest mb-1.5 mt-3 pl-3">Management</div>
          <NavLink to="/admin/dashboard" label={t('nav.overview')} icon={LayoutGrid} badgeCount={overdueCount} />
          <NavLink to="/admin/incoming" label={t('nav.incoming')} icon={Bell} badgeCount={unassignedCount} />
          <NavLink to="/admin/rmas" label={t('nav.claims')} icon={List} />
          <NavLink to="/admin/submit" label={t('nav.newRequest')} icon={PlusCircle} />
          <NavLink to="/admin/reports" label={t('nav.reports')} icon={BarChart3} />

          {user.role === 'admin' && (
            <>
              <div className="text-[9.5px] font-bold text-[#86868b]/75 uppercase tracking-widest mt-6 mb-1.5 pl-3">System</div>
              <NavLink to="/admin/users" label={t('nav.users')} icon={Users} />
              <NavLink to="/admin/logs" label="System Logs" icon={History} />
              <NavLink to="/admin/brands" label={t('nav.brands')} icon={Tag} />
              <NavLink to="/admin/distributors" label={t('nav.distributors')} icon={Building2} />
              <NavLink to="/admin/settings" label={t('nav.settings')} icon={Settings} />
            </>
          )}
        </>
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
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-white/70 dark:bg-[#1e1e24]/85 backdrop-blur-xl border-b border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between px-4">
        <Link to={user ? "/admin/dashboard" : "/"} className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
          <span className="font-bold text-[15px] text-[#1d1d1f] dark:text-white tracking-tight">SEC RMS</span>
        </Link>
        <button
          onClick={async () => {
            if ('serviceWorker' in navigator) {
              const regs = await navigator.serviceWorker.getRegistrations();
              for (const r of regs) await r.unregister();
            }
            if ('caches' in window) {
              const keys = await caches.keys();
              for (const k of keys) await caches.delete(k);
            }
            window.location.reload();
          }}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-[#0071e3] hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all active:scale-90"
          title="ล้างแคช & รีเฟรช"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ===== Mobile Bottom Tab Bar (Premium) ===== */}
      {user && (
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pointer-events-none"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          {/* Floating '+' button */}
          <Link to="/admin/submit" className="absolute left-1/2 -translate-x-1/2 w-[44px] h-[44px] bg-gradient-to-br from-[#007aff] via-[#0066e0] to-[#0050b5] text-white rounded-full shadow-[0_4px_16px_rgba(0,122,255,0.4)] flex items-center justify-center active:scale-90 transition-all z-50 pointer-events-auto" style={{ bottom: 'calc(100% - 1.5rem)' }}>
            <Plus className="w-5 h-5" strokeWidth={2.5} />
          </Link>

          {/* Glass capsule bar */}
          <div className="relative bg-white/80 dark:bg-[#22222a]/88 backdrop-blur-2xl border border-black/[0.05] dark:border-white/[0.08] rounded-[20px] shadow-[0_-1px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-1px_30px_rgba(0,0,0,0.4)] grid grid-cols-5 items-center h-[50px] pointer-events-auto">

            {/* Dashboard */}
            <Link to="/admin/dashboard" className={`flex flex-col items-center justify-center h-full relative transition-all duration-200 ${location.pathname === '/admin/dashboard' ? 'text-[#007aff]' : 'text-[#8e8e93] active:text-[#007aff]'}`}>
              <div className={`transition-all duration-200 ${location.pathname === '/admin/dashboard' ? 'scale-110' : ''}`}><LayoutGrid className="w-[19px] h-[19px]" strokeWidth={location.pathname === '/admin/dashboard' ? 2.2 : 1.8} /></div>
              <span className={`text-[9px] font-semibold mt-0.5 leading-none transition-all ${location.pathname === '/admin/dashboard' ? 'font-bold' : ''}`}>ภาพรวม</span>
              {overdueCount > 0 && (
                <span className="absolute top-1.5 right-[18%] w-[6px] h-[6px] rounded-full bg-red-500 ring-2 ring-white dark:ring-[#22222a]"></span>
              )}
            </Link>

            {/* Claims List */}
            <Link to="/admin/rmas" className={`flex flex-col items-center justify-center h-full transition-all duration-200 ${location.pathname === '/admin/rmas' ? 'text-[#007aff]' : 'text-[#8e8e93] active:text-[#007aff]'}`}>
              <div className={`transition-all duration-200 ${location.pathname === '/admin/rmas' ? 'scale-110' : ''}`}><List className="w-[19px] h-[19px]" strokeWidth={location.pathname === '/admin/rmas' ? 2.2 : 1.8} /></div>
              <span className={`text-[9px] font-semibold mt-0.5 leading-none ${location.pathname === '/admin/rmas' ? 'font-bold' : ''}`}>รายการ</span>
            </Link>

            {/* Center spacer for '+' button */}
            <div className="flex flex-col items-center justify-end h-full pb-1.5">
              <span className="text-[9px] font-semibold text-[#8e8e93] leading-none">เพิ่มเคลม</span>
            </div>

            {/* Notifications */}
            <Link to="/admin/incoming" className={`flex flex-col items-center justify-center h-full relative transition-all duration-200 ${location.pathname === '/admin/incoming' ? 'text-[#007aff]' : 'text-[#8e8e93] active:text-[#007aff]'}`}>
              <div className={`transition-all duration-200 ${location.pathname === '/admin/incoming' ? 'scale-110' : ''}`}><Bell className="w-[19px] h-[19px]" strokeWidth={location.pathname === '/admin/incoming' ? 2.2 : 1.8} /></div>
              <span className={`text-[9px] font-semibold mt-0.5 leading-none ${location.pathname === '/admin/incoming' ? 'font-bold' : ''}`}>แจ้งเตือน</span>
              {unassignedCount > 0 && (
                <span className="absolute top-1 right-[10%] min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[8px] font-bold rounded-full px-1 leading-none ring-2 ring-white dark:ring-[#22222a]">
                  {unassignedCount > 99 ? '99+' : unassignedCount}
                </span>
              )}
            </Link>

            {/* More Menu */}
            <button onClick={() => setIsMobileOpen(true)} className={`flex flex-col items-center justify-center h-full transition-all duration-200 ${isMobileOpen ? 'text-[#007aff]' : 'text-[#8e8e93] active:text-[#007aff]'}`}>
              <div className={`transition-all duration-200 ${isMobileOpen ? 'scale-110' : ''}`}><Menu className="w-[19px] h-[19px]" strokeWidth={isMobileOpen ? 2.2 : 1.8} /></div>
              <span className={`text-[9px] font-semibold mt-0.5 leading-none ${isMobileOpen ? 'font-bold' : ''}`}>อื่นๆ</span>
            </button>
          </div>
        </div>
      )}

      {/* ===== Mobile Slide-Out Overlay ===== */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 animate-fade-in">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsMobileOpen(false)} />

          {/* Panel */}
          <div className="absolute top-14 right-0 bottom-0 w-[280px] bg-[#f5f5f7] dark:bg-[#1c1c22] border-l border-gray-200/50 dark:border-white/[0.06] flex flex-col overflow-hidden animate-slide-up">
            <div className="flex-1 min-h-0 flex flex-col gap-1 px-4 py-4 pb-6 overflow-y-auto custom-scrollbar">
              {navContent}
            </div>

            {/* Bottom section */}
            <div
              className="p-4 mt-auto border-t border-gray-200/50 dark:border-white/[0.06] shrink-0 bg-[#f5f5f7] dark:bg-[#1c1c22]"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
              <div className="flex items-center justify-between mb-4 bg-white dark:bg-[#26262e] p-2 rounded-full shadow-sm border border-gray-100 dark:border-white/[0.06]">
                <div className="flex gap-1"><ThemeToggle /><LanguageToggle /></div>
                {user && <Link to="/" title="Go to Website" className="p-2 rounded-full text-[#86868b] hover:text-[#0071e3] transition-colors"><Globe className="h-4 w-4" /></Link>}
              </div>

              {user && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-[#26262e] border border-gray-100 dark:border-white/[0.06] shadow-sm mb-1">
                  <div className="w-10 h-10 rounded-full bg-[#f5f5f7] dark:bg-[#3a3a3c] flex items-center justify-center font-bold text-gray-400 shrink-0">{user.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="text-sm font-bold text-[#1d1d1f] dark:text-white truncate">{user.name}</div>
                    <div className="text-[10px] text-[#86868b] truncate uppercase tracking-wider">{user.role}</div>
                  </div>
                  <button onClick={handleLogout} className="p-2 text-[#86868b] hover:text-red-500 transition-colors shrink-0" title="Logout"><LogOut className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <aside className={`hidden md:flex flex-col w-72 z-50 bg-white/60 dark:bg-[#1c1c22]/60 backdrop-blur-xl ${embedded ? 'h-full rounded-2xl border border-gray-200/30 dark:border-white/[0.06] shadow-sm' : 'fixed left-0 top-0 bottom-0 border-r border-gray-200/30 dark:border-white/[0.06]'
        }`}>
        <div className="p-6 pb-2">
          <Link to={user ? "/admin/dashboard" : "/"} className="flex items-center gap-3 group">
            <div className="h-9 w-9 flex items-center justify-center transition-transform group-hover:scale-105">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-lg text-[#1d1d1f] dark:text-white tracking-tighter text-nowrap">SEC RMS SYSTEM</span>
          </Link>
        </div>

        <div className="flex-1 flex flex-col gap-1 px-4 py-4 overflow-y-auto custom-scrollbar">
          {navContent}
        </div>

        <div className="p-4 mt-auto">
          <div className="flex items-center justify-between mb-6 bg-white/50 dark:bg-white/[0.03] p-2 rounded-full shadow-sm border border-gray-200/30 dark:border-white/[0.06]">
            <div className="flex gap-1"><ThemeToggle /><LanguageToggle /></div>
            <div className="flex gap-1">
              <button
                onClick={async () => {
                  if ('serviceWorker' in navigator) { const regs = await navigator.serviceWorker.getRegistrations(); for (const r of regs) await r.unregister(); }
                  if ('caches' in window) { const keys = await caches.keys(); for (const k of keys) await caches.delete(k); }
                  window.location.reload();
                }}
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
