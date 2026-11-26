
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MockDb } from '../services/mockDb';
import { useLanguage } from '../contexts/LanguageContext';
import { ArrowRight, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  // State สำหรับเก็บค่าที่ผู้ใช้พิมพ์
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState(''); // เก็บข้อความ Error
  const [loading, setLoading] = useState(false); // สถานะกำลังโหลด (หมุนติ้วๆ)

  const navigate = useNavigate(); // ใช้สำหรับเปลี่ยนหน้า
  const { t, language } = useLanguage(); // ใช้ระบบแปลภาษา

  // Check if already logged in and load saved credentials
  React.useEffect(() => {
    if (MockDb.isAuthenticated()) {
      navigate('/admin/dashboard', { replace: true });
      return;
    }

    const savedEmail = localStorage.getItem('sec_remember_email');
    const savedPassword = localStorage.getItem('sec_remember_password');
    if (savedEmail && savedPassword) {
      setUsername(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, [navigate]);

  // ฟังก์ชัน: เมื่อกดปุ่ม Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // ป้องกันหน้าเว็บ Refresh
    setLoading(true); // เริ่มหมุน
    setError(''); // เคลียร์ Error เก่า

    const result = await MockDb.login(username, password);

    if (result.success) {
      if (rememberMe) {
        localStorage.setItem('sec_remember_email', username);
        localStorage.setItem('sec_remember_password', password);
      } else {
        localStorage.removeItem('sec_remember_email');
        localStorage.removeItem('sec_remember_password');
      }
      // ถ้าผ่าน -> ไปหน้า Dashboard
      navigate('/admin/dashboard');
    } else {
      const errorMsg = result.error || 'Login failed. Please check email/password.';
      setError(errorMsg);
    }
    setLoading(false); // หยุดหมุน
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-[#f6f7f9] dark:bg-[#0f1115] px-4 transition-colors">

      {/* ปุ่มย้อนกลับไปหน้าแรก */}
      <Link
        to="/"
        className="absolute top-6 left-6 md:top-8 md:left-8 z-20 p-2.5 rounded-xl bg-white dark:bg-[#16181d] border border-slate-200/80 dark:border-white/[0.08] text-slate-500 hover:text-[#0071e3] transition-colors shadow-xs"
        title="Back to Home"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>

      <div className="w-full max-w-[400px]">
        <div className="bg-white dark:bg-[#16181d] rounded-2xl p-6 sm:p-8 shadow-lg border border-slate-200/80 dark:border-white/[0.08]">

          {/* ส่วนหัว Logo */}
          <div className="flex flex-col items-center mb-7">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4">
              <img src="/logo.png" alt="SEC Claim Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-1">SEC RMS SYSTEM</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">{t('login.subtitle')}</p>
          </div>

          {/* ฟอร์ม Login */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="email"
                autoComplete="email"
                placeholder={t('login.emailPlaceholder')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#1a1d24] border border-slate-200 dark:border-white/[0.08] rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-[#1f232b] focus:ring-2 focus:ring-[#0071e3]/25 focus:border-[#0071e3] outline-none transition-all"
              />
            </div>

            <div>
              <input
                type="password"
                autoComplete="current-password"
                placeholder={t('login.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#1a1d24] border border-slate-200 dark:border-white/[0.08] rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-[#1f232b] focus:ring-2 focus:ring-[#0071e3]/25 focus:border-[#0071e3] outline-none transition-all"
              />
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center gap-2 px-0.5 py-0.5">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-white/20 text-[#0071e3] focus:ring-[#0071e3] cursor-pointer"
              />
              <label htmlFor="rememberMe" className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                {language === 'th' ? 'จดจำบัญชีในเครื่องนี้' : 'Remember Login on this Device'}
              </label>
            </div>

            {/* แสดงข้อความ Error ตรงนี้ */}
            {error && <div className="text-sm text-red-600 dark:text-red-400 text-center py-1 font-medium">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-1 bg-[#0071e3] hover:bg-[#0062c4] disabled:bg-slate-400 text-white rounded-xl font-bold shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{t('login.signIn')} <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </div>

        <div className="text-center mt-8">
          <Link to="/" className="text-sm text-gray-400 hover:text-[#0071e3] transition-colors">
            {t('login.customerPortal')}
          </Link>
        </div>
      </div>
    </div>
  );
};
