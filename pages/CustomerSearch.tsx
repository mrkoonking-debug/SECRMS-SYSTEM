
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, ArrowRight, PlusCircle, ShieldCheck, ChevronRight } from 'lucide-react';
import { MockDb } from '../services/mockDb';
import { useLanguage } from '../contexts/LanguageContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageToggle } from '../components/LanguageToggle';

export const CustomerSearch: React.FC = () => {
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const navigate = useNavigate();
    const { t } = useLanguage();
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Wait for Firebase Auth to initialize before checking login state
    useEffect(() => {
        MockDb.waitForAuth().then(() => {
            setIsLoggedIn(MockDb.isAuthenticated());
        });
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) navigate(`/status?q=${encodeURIComponent(query)}`);
    };



    return (
        <div className="min-h-screen bg-[#f5f5f7] dark:bg-black font-sans transition-colors duration-500 flex flex-col overflow-hidden relative">

            {/* Background Ambient Elements - Kept for subtle depth */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none"></div>

            {/* Minimal Header */}
            <header className="px-6 py-5 flex justify-between items-center z-10">
                {/* SEC Claim System - Title only, non-clickable */}
                <div className="flex items-center gap-2 select-none">
                    <img src="/logo.png?v=2" alt="Logo" className="w-8 h-8 object-contain" />
                    <span className="font-semibold text-lg tracking-tight text-[#1d1d1f] dark:text-white">SEC RMS SYSTEM</span>
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <LanguageToggle />
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col justify-center items-center px-4 w-full max-w-5xl mx-auto relative z-10">

                <div className="w-full text-center mb-12">
                    <div className="w-16 h-16 md:w-32 md:h-32 mx-auto mb-4 md:mb-6 flex items-center justify-center animate-slide-up">
                        <img src="/logo.png?v=2" alt="SEC Claim Logo" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-2xl md:text-4xl lg:text-6xl font-bold text-[#1d1d1f] dark:text-white tracking-tight leading-[1.1] mb-4 md:mb-6 animate-slide-up">
                        {t('public.heroTitle')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0071e3] to-[#a855f7]">{t('public.heroTitleSuffix')}</span>
                    </h1>
                    <p className="text-sm md:text-lg lg:text-xl text-[#86868b] font-medium max-w-xl mx-auto mb-6 md:mb-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        {t('public.heroSubtitle')}
                    </p>

                    {/* Clean Search Bar - Removed Color Gradient and Animation */}
                    <div className="relative w-full max-w-3xl mx-auto group z-20 animate-slide-up px-2 md:px-0" style={{ animationDelay: '0.2s' }}>
                        <form
                            onSubmit={handleSearch}
                            className={`
                            relative bg-white dark:bg-[#1c1c1e] rounded-full p-1 md:p-2 pl-4 md:pl-6 flex items-center shadow-lg transition-all duration-300 border
                            ${isFocused ? 'border-gray-400 dark:border-white/40 ring-4 ring-black/5 dark:ring-white/5' : 'border-gray-200 dark:border-white/10'}
                        `}
                        >
                            <Search className={`w-5 h-5 mr-2 md:mr-3 flex-shrink-0 transition-colors ${isFocused ? 'text-black dark:text-white' : 'text-gray-400'}`} />
                            <input
                                ref={searchInputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder={t('public.inputHint')}
                                className="flex-1 bg-transparent border-none py-2 md:py-3 text-sm md:text-base text-[#1d1d1f] dark:text-gray-100 placeholder-gray-400 focus:ring-0 outline-none w-full min-w-0"
                            />
                            <button
                                type="submit"
                                disabled={!query}
                                className={`
                                p-2 md:p-3 rounded-full transition-all flex items-center justify-center flex-shrink-0
                                ${query ? 'bg-black dark:bg-white text-white dark:text-black shadow-md' : 'bg-gray-100 dark:bg-white/5 text-gray-300'}
                            `}
                            >
                                <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                        </form>
                    </div>
                </div>

                {/* Gradient Register Button - Kept as requested to only remove color from search */}
                <div className="mb-8 md:mb-16 animate-slide-up" style={{ animationDelay: '0.25s' }}>
                    <Link to="/register" className="group relative inline-flex items-center gap-2 md:gap-3 px-5 py-3 md:px-8 md:py-4 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 text-[#1d1d1f] dark:text-white rounded-full text-sm md:text-lg font-bold shadow-sm hover:shadow-xl hover:border-[#0071e3] transition-all transform hover:scale-105 active:scale-95">
                        <PlusCircle className="w-5 h-5 md:w-6 md:h-6 text-[#0071e3]" />
                        <span>{t('public.registerTitle')}</span>
                        <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-gray-400 group-hover:translate-x-1 group-hover:text-[#0071e3] transition-all" />
                    </Link>
                </div>

                {/* Feature Grid with Tinted Colors */}

                {/* Feature Grid REMOVED */}


            </main>

            {/* Footer */}
            <footer className="text-center py-10 text-[11px] text-[#86868b] mt-auto z-10">
                <div className="flex items-center justify-center gap-6">
                    <span>{t('public.copyright')}</span>
                    {isLoggedIn ? (
                        <Link to="/admin/dashboard" className="text-[#0071e3] hover:underline font-bold transition-colors flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> BACK TO DASHBOARD
                        </Link>
                    ) : (
                        <Link to="/login" className="hover:text-[#0071e3] transition-colors font-medium underline underline-offset-4 decoration-gray-300">
                            STAFF ACCESS
                        </Link>
                    )}
                </div>
            </footer>
        </div>
    );
};
