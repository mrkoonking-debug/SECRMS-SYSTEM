
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
    <div className="min-h-screen flex items-center justify-center relative bg-[#f5f5f7] dark:bg-black px-4 transition-colors">

      {/* ปุ่มย้อนกลับไปหน้าแรก */}
      <Link
        to="/"
        className="absolute top-6 left-6 md:top-10 md:left-10 z-20 p-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
        title="Back to Home"
      >
        <ArrowLeft className="w-6 h-6" />
      </Link>

      <div className="w-full max-w-[400px]">
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl md:rounded-3xl p-6 sm:p-8 md:p-10 shadow-lg border border-gray-100 dark:border-[#333]">

          {/* ส่วนหัว Logo */}
          <div className="flex flex-col items-center mb-6 md:mb-10">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-4 md:mb-6">
              <img src="/logo.png" alt="SEC Claim Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-[#1d1d1f] dark:text-white tracking-tight mb-1">SEC RMS SYSTEM</h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">{t('login.subtitle')}</p>
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
                className="w-full bg-[#f5f5f7] dark:bg-[#2c2c2e] border-none rounded-xl px-4 py-2.5 md:py-4 text-sm md:text-base text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3] transition-all"
              />
            </div>

            <div>
              <input
                type="password"
                placeholder={t('login.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#f5f5f7] dark:bg-[#2c2c2e] border-none rounded-xl px-4 py-2.5 md:py-4 text-sm md:text-base text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3] transition-all"
              />
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center gap-2 px-1 py-1">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded bg-[#f5f5f7] dark:bg-[#2c2c2e] border-none text-[#0071e3] focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <label htmlFor="rememberMe" className="text-xs md:text-sm text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                {language === 'th' ? 'จดจำบัญชีในเครื่องนี้ (จำเข้าสมอง)' : 'Remember Login on this Device'}
              </label>
            </div>

            {/* แสดงข้อความ Error ตรงนี้ */}
            {error && <div className="text-sm text-red-600 dark:text-red-400 text-center py-1 font-medium">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 md:py-4 mt-2 bg-[#0071e3] hover:bg-[#0077ed] disabled:bg-gray-400 text-white rounded-xl font-bold shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm md:text-base"
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
