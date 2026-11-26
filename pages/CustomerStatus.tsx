
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { MockDb } from '../services/mockDb';
import { RMA, RMAStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { ArrowLeft, Search, Package, CheckCircle2, Settings, Printer, Download, Truck, ExternalLink, AlertCircle, Wrench, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageToggle } from '../components/LanguageToggle';
import { getCustomerInboundLabelHTML, printHtmlDocument } from '../services/printService';
import { renderHtmlToBlob } from '../services/renderToImage';
import { showToast } from '../services/toast';

export const CustomerStatus: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');
  const [rmas, setRMAs] = useState<RMA[]>([]);
  const [loading, setLoading] = useState(!!query);
  const [searched, setSearched] = useState(false);
  const [isPrintingLabel, setIsPrintingLabel] = useState(false);
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);
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
      case RMAStatus.REPLACED_FROM_STOCK: return 3;
      case RMAStatus.REPAIRED: return 3;
      case RMAStatus.RETURNED_FROM_VENDOR: return 3;
      case RMAStatus.CLOSED: return 3;
      case RMAStatus.REJECTED: return 3;
      default: return 0;
    }
  };

  const formatResolutionAction = (action?: string) => {
    if (!action) return '';
    const key = `actions.${action.toLowerCase().replace(/ /g, '_')}`;
    const trans = t(key);
    return trans === key ? action : trans;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] dark:bg-[#131314] px-4">
        <div className="w-full max-w-md bg-white dark:bg-[#16161a] border border-gray-200/80 dark:border-white/[0.08] p-6 rounded-3xl apple-card shadow-xl space-y-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full skeleton-shimmer shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="w-32 h-4 rounded skeleton-shimmer" />
              <div className="w-20 h-3 rounded skeleton-shimmer" />
            </div>
          </div>
          <div className="h-16 rounded-2xl skeleton-shimmer w-full" />
          <div className="h-10 rounded-xl skeleton-shimmer w-full" />
        </div>
      </div>
    );
  }

  const validRmas = rmas.filter((r): r is RMA => r != null);

  if (!query || (searched && validRmas.length === 0)) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#131314] pt-20 px-4 flex flex-col items-center text-center">
        <h2 className="text-4xl font-bold mb-4 text-[#1d1d1f] dark:text-white">{t('public.notFound')}</h2>
        <p className="text-[#86868b] mb-8 max-w-md">{t('public.notFoundDesc')}</p>
        <Link to="/" className="px-8 py-3 bg-[#0071e3] text-white rounded-full font-bold shadow-lg shadow-blue-500/20">
          {t('public.tryAgain')}
        </Link>
      </div>
    );
  }

  const activeItems = validRmas.filter(r => r.status !== RMAStatus.CANCELLED);

  const handlePrintInboundLabel = async () => {
    const target = activeItems.length > 0 ? activeItems : validRmas;
    if (target.length === 0 || isPrintingLabel) return;
    setIsPrintingLabel(true);
    try {
      const html = await getCustomerInboundLabelHTML(target);
      const refId = validRmas[0].groupRequestId || validRmas[0].id;
      await printHtmlDocument(html, `Inbound_Label_${refId}`);
    } catch (err) {
      console.error('Print inbound label failed:', err);
      showToast('ไม่สามารถพิมพ์ใบปะหน้าได้ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setIsPrintingLabel(false);
    }
  };

  const handleDownloadInboundPng = async () => {
    const target = activeItems.length > 0 ? activeItems : validRmas;
    if (target.length === 0 || isDownloadingPng) return;
    setIsDownloadingPng(true);
    try {
      const html = await getCustomerInboundLabelHTML(target);
      const blob = await renderHtmlToBlob(html);
      const refId = validRmas[0].groupRequestId || validRmas[0].id;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SECRMA-Label-${refId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('บันทึกรูปภาพใบปะหน้าเรียบร้อยแล้ว', 'success');
    } catch (err) {
      console.error('Download PNG label failed:', err);
      showToast('ไม่สามารถบันทึกรูปภาพได้ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setIsDownloadingPng(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#131314] pb-20 px-4 md:px-6">
      <div className="max-w-3xl mx-auto py-8 flex items-center justify-between">
        <Link to="/" className="flex items-center text-sm font-semibold text-[#0071e3]">
          <ArrowLeft className="h-4 w-4 mr-2" /> {t('public.searchBtn')}
        </Link>
        <div className="flex gap-2">
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="glass-panel rounded-3xl p-5 sm:p-6 mb-6 animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold text-[#0071e3] uppercase tracking-wider mb-1">{t('track.reference')}</div>
              <h1 className="text-xl md:text-3xl font-bold text-[#1d1d1f] dark:text-white tracking-tight flex flex-wrap gap-2 items-center">
                {validRmas[0].groupRequestId || validRmas[0].id}
                {validRmas[0].quotationNumber && (
                  <span className="bg-gray-100 dark:bg-[#2c2c2e] text-gray-600 dark:text-gray-300 text-xs md:text-sm px-2.5 py-0.5 rounded-lg border border-gray-200 dark:border-[#424245]">
                    Ref: {validRmas[0].quotationNumber}
                  </span>
                )}
              </h1>
              <p className="text-[#86868b] text-sm md:text-base mt-1">{validRmas[0].customerName}</p>
            </div>

            {activeItems.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handlePrintInboundLabel}
                  disabled={isPrintingLabel}
                  className="px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isPrintingLabel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                  <span>พิมพ์ใบปะหน้าส่งของ</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadInboundPng}
                  disabled={isDownloadingPng}
                  className="px-4 py-2 rounded-full bg-gray-100 dark:bg-[#2c2c2e] hover:bg-gray-200 dark:hover:bg-[#3a3a3c] text-[#1d1d1f] dark:text-white border border-gray-200 dark:border-white/10 text-xs font-bold inline-flex items-center gap-1.5 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isDownloadingPng ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  <span>บันทึก PNG</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {validRmas.map((rma) => {
            const currentStep = getStepStatus(rma.status);
            const isCancelled = rma.status === RMAStatus.CANCELLED;
            const steps = [
              { label: t('statusSteps.received'), icon: Package },
              { label: t('statusSteps.checking'), icon: Search },
              { label: t('statusSteps.processing'), icon: Settings },
              { label: t('statusSteps.ready'), icon: CheckCircle2 }
            ];

            const returnTrackingList = (rma.customerTrackingIds || []).filter(Boolean);

            return (
              <div key={rma.id} className={`glass-panel rounded-3xl p-5 sm:p-6 md:p-8 ${isCancelled ? 'opacity-50 grayscale bg-gray-50/20' : ''}`}>
                <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
                  <div>
                    <div className="text-[11px] font-bold text-[#0071e3] uppercase">{rma.brand}</div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">{rma.productModel}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                      <span className="font-mono bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-md border border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-slate-300">S/N: {rma.serialNumber || '-'}</span>
                      <span>แจ้งเมื่อ {new Date(rma.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                  <StatusBadge status={rma.status} isPublic={true} />
                </div>

                {/* Visual Colored Stepper */}
                {!isCancelled && (
                  <div className="relative flex justify-between items-center w-full px-2 mb-6">
                    <div className="absolute left-4 right-4 top-3 h-1 bg-slate-100 dark:bg-white/[0.08] z-0 rounded-full"></div>
                    <div
                      className="absolute left-4 top-3 h-1 bg-[#0071e3] transition-all duration-700 ease-out z-0 rounded-full"
                      style={{ width: `calc(${Math.min(100, Math.max(0, (currentStep / (steps.length - 1)) * 100))}% - 2rem)` }}
                    ></div>

                    {steps.map((step, idx) => {
                      const isCompleted = idx <= currentStep;
                      const isActive = idx === currentStep;

                      return (
                        <div key={idx} className="relative z-10 flex flex-col items-center">
                          <div className={`
                            w-7 h-7 rounded-full border-2 transition-all duration-300 flex items-center justify-center
                            ${isCompleted ? 'bg-[#0071e3] border-white dark:border-[#16181d] text-white' : 'bg-slate-100 dark:bg-[#232730] border-white dark:border-[#16181d] text-slate-400'}
                            ${isActive ? 'ring-4 ring-blue-500/20 scale-110' : ''}
                          `}>
                            {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <step.icon className="w-3.5 h-3.5" />}
                          </div>
                          <span className={`text-[10px] sm:text-[11px] font-semibold mt-2 text-center ${isActive ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-400'}`}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Issue, Resolution & Tracking Info */}
                <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-white/[0.06] text-xs sm:text-sm">
                  {rma.issueDescription && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 dark:bg-[#1a1d24] border border-slate-200/60 dark:border-white/[0.06]">
                      <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase block mb-0.5">อาการที่แจ้ง</span>
                        <span className="text-slate-700 dark:text-slate-200 whitespace-pre-line">{rma.issueDescription}</span>
                      </div>
                    </div>
                  )}

                  {(rma.resolution?.actionTaken || rma.resolution?.replacedSerialNumber || rma.resolution?.actionDetails) && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200/70 dark:border-emerald-500/20">
                      <Wrench className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase block">ผลการดำเนินการ</span>
                        {rma.resolution?.actionTaken && (
                          <div className="font-semibold text-slate-900 dark:text-white">{formatResolutionAction(rma.resolution.actionTaken)}</div>
                        )}
                        {rma.resolution?.actionDetails && (
                          <div className="text-xs text-slate-600 dark:text-slate-300">{rma.resolution.actionDetails}</div>
                        )}
                        {rma.resolution?.replacedSerialNumber && (
                          <div className="text-xs font-mono text-emerald-700 dark:text-emerald-300 font-semibold">
                            S/N ตัวใหม่: {rma.resolution.replacedSerialNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {returnTrackingList.length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-500/10 border border-blue-200/70 dark:border-blue-500/20">
                      <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-semibold">
                        <Truck className="w-4 h-4 text-[#0071e3] shrink-0" />
                        <span>เลขพัสดุจัดส่งคืน:</span>
                        <span className="font-mono text-xs">{returnTrackingList.join(', ')}</span>
                      </div>
                      <a
                        href={`https://track.thailandpost.co.th/?trackNumber=${encodeURIComponent(returnTrackingList.join(','))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#0071e3] dark:text-blue-400 hover:underline shrink-0"
                      >
                        ติดตามพัสดุ <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
