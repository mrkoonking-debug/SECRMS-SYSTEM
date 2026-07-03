
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { MockDb } from '../services/mockDb';
import { RMA, RMAStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { ArrowLeft, Search, RefreshCw, Package, CheckCircle2, Settings, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageToggle } from '../components/LanguageToggle';

export const CustomerStatus: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');
  const [rmas, setRMAs] = useState<RMA[]>([]);
  const [loading, setLoading] = useState(!!query); // Start as true if query exists
  const [searched, setSearched] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (query) {
      setLoading(true);
      setSearched(false);
      const search = async () => {
        try {
          const results = await MockDb.searchRMAsPublic(query);
          setRMAs(results);
        } catch (err) {
          console.error('Search error:', err);
          setRMAs([]);
        } finally {
          setLoading(false);
          setSearched(true);
        }
      };
      search();
    }
  }, [query]);

  const getStepStatus = (status: RMAStatus) => {
    switch (status) {
      case RMAStatus.PENDING: return 0;
      case RMAStatus.DIAGNOSING: return 1;
      case RMAStatus.WAITING_PARTS: return 2;
      case RMAStatus.REPLACED_FROM_STOCK: return 3; // For customer, getting replacement means it's done/ready
      case RMAStatus.REPAIRED: return 3;
      case RMAStatus.RETURNED_FROM_VENDOR: return 3; // Completed state
      case RMAStatus.CLOSED: return 4;
      case RMAStatus.REJECTED: return 4;
      default: return 0;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] dark:bg-black">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Filter out any undefined/null items that mapDocToRMA might return
  const validRmas = rmas.filter((r): r is RMA => r != null);

  if (!query || (searched && validRmas.length === 0)) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-black pt-20 px-4 flex flex-col items-center">
        <h2 className="text-4xl font-bold mb-4">{t('public.notFound')}</h2>
        <p className="text-[#86868b] mb-8">{t('public.notFoundDesc')}</p>
        <Link to="/" className="px-8 py-3 bg-[#0071e3] text-white rounded-full font-bold shadow-lg shadow-blue-500/20">
          {t('public.tryAgain')}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-black pb-20 px-4 md:px-6">
      <div className="max-w-2xl mx-auto py-8 flex items-center justify-between">
        <Link to="/" className="flex items-center text-sm font-semibold text-[#0071e3]">
          <ArrowLeft className="h-4 w-4 mr-2" /> {t('public.searchBtn')}
        </Link>
        <div className="flex gap-2">
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="mb-6 md:mb-12 animate-slide-up">
          <div className="text-[11px] font-bold text-[#0071e3] uppercase tracking-wider mb-1">{t('track.reference')}</div>
          <h1 className="text-xl md:text-4xl font-bold text-[#1d1d1f] dark:text-white tracking-tight flex flex-wrap gap-2 items-center">
            {validRmas[0].groupRequestId || validRmas[0].id}
            {validRmas[0].quotationNumber && (
              <span className="bg-gray-100 dark:bg-[#2c2c2e] text-gray-600 dark:text-gray-300 text-xs md:text-sm px-2 py-0.5 md:px-3 md:py-1 rounded-lg border border-gray-200 dark:border-[#424245]">
                Ref: {validRmas[0].quotationNumber}
              </span>
            )}
          </h1>
          <p className="text-[#86868b] text-sm md:text-lg mt-1.5">{validRmas[0].customerName}</p>
        </div>

        <div className="space-y-4 md:space-y-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {validRmas.map((rma) => {
            const currentStep = getStepStatus(rma.status);
            const steps = [
              { label: t('statusSteps.received'), icon: Package },
              { label: t('statusSteps.checking'), icon: Search },
              { label: t('statusSteps.processing'), icon: Settings },
              { label: t('statusSteps.ready'), icon: CheckCircle2 }
            ];

            return (
              <div key={rma.id} className="glass-panel p-4 sm:p-6 md:p-8">
                <div className="flex justify-between items-start mb-6 md:mb-10">
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-[#1d1d1f] dark:text-white mb-1">{rma.productModel}</h3>
                    <div className="text-xs font-mono text-[#86868b]">S/N: {rma.serialNumber}</div>
                  </div>
                  <StatusBadge status={rma.status} />
                </div>

                {/* Visual Colored Stepper */}
                <div className="relative flex justify-between items-center w-full px-2">
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gray-100 dark:bg-[#2c2c2e] z-0 rounded-full"></div>
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#0071e3] transition-all duration-1000 ease-out z-0 rounded-full"
                    style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                  ></div>

                  {steps.map((step, idx) => {
                    const isCompleted = idx <= currentStep;
                    const isActive = idx === currentStep;

                    return (
                      <div key={idx} className="relative z-10 flex flex-col items-center">
                        <div className={`
                                            w-6 h-6 rounded-full border-4 transition-all duration-500 flex items-center justify-center
                                            ${isCompleted ? 'bg-[#0071e3] border-white dark:border-[#1c1c1e] text-white' : 'bg-gray-100 dark:bg-[#2c2c2e] border-white dark:border-[#1c1c1e] text-gray-400'}
                                            ${isActive ? 'ring-4 ring-blue-500/20 scale-125' : ''}
                                         `}>
                          {isCompleted && <CheckCircle2 className="w-3 h-3" />}
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider mt-4 ${isActive ? 'text-[#1d1d1f] dark:text-white' : 'text-[#86868b]'}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
