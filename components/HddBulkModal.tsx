import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { HardDrive, Minus, Plus, Check, X, ScanBarcode } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { ScannerModal } from './ScannerModal';
import { showConfirmDialog } from '../services/toast';

interface HddBulkModalProps {
    initialSerials?: string[];
    onClose: () => void;
    onConfirm: (serials: string[]) => void;
}

/**
 * Shared HDD entry modal — used by ProductEntryForm and EditRMADrawer.
 * Allows entering serial numbers for one or more HDDs.
 */
export const HddBulkModal: React.FC<HddBulkModalProps> = ({
    initialSerials = [],
    onClose,
    onConfirm,
}) => {
    const { t } = useLanguage();
    const [quantity, setQuantity] = useState(Math.max(1, initialSerials.length));
    const [serials, setSerials] = useState<string[]>(
        initialSerials.length > 0 ? initialSerials : ['']
    );
    const [scanningIndex, setScanningIndex] = useState<number | null>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const updateQty = (newQ: number) => {
        const q = Math.max(1, Math.min(50, newQ));
        setQuantity(q);
        setSerials(prev => {
            const next = [...prev];
            while (next.length < q) next.push('');
            while (next.length > q) next.pop();
            return next;
        });
        if (newQ > quantity) {
            setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 100);
        }
    };

    const handleConfirm = async () => {
        const valid = serials.map(s => s.trim()).filter(Boolean);
        if (valid.length) {
            onConfirm(valid);
        } else {
            const confirmed = await showConfirmDialog({
                title: 'ล้างรายการฮาร์ดดิสก์',
                message: t('modals.clearHddConfirm'),
                confirmText: 'ล้างรายการ',
                variant: 'warning'
            });
            if (confirmed) {
                onConfirm([]);
            }
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-lg min-h-[400px] h-[80vh] max-h-[600px] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#333] flex flex-col overflow-hidden">
                {/* Header (Fixed) */}
                <div className="p-5 border-b border-gray-100 dark:border-[#333] flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <HardDrive className="w-6 h-6 text-[#0071e3]" />
                        <div>
                            <h3 className="text-lg font-bold text-[#1d1d1f] dark:text-white leading-tight">{t('modals.hddTitle')}</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{t('modals.hddInstruction')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2c2c2e] transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Quantity selector (Fixed top) */}
                <div className="px-6 py-4 flex items-center justify-between bg-gray-50/50 dark:bg-black/10 border-b border-gray-100 dark:border-[#333] flex-shrink-0 z-10 shadow-sm">
                    <p className="text-sm text-[#1d1d1f] dark:text-gray-300 font-bold">จำนวนฮาร์ดดิสก์</p>
                    <div className="flex items-center gap-4">
                        <button onClick={() => updateQty(quantity - 1)} className="w-10 h-10 rounded-full bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] flex items-center justify-center hover:bg-gray-50 dark:hover:bg-[#3a3a3c] transition-all shadow-sm group active:scale-95">
                            <Minus className="w-4 h-4 text-gray-500 group-hover:text-red-500 transition-colors" />
                        </button>

                        <div className="w-10 flex justify-center">
                            <span className="text-2xl font-black text-[#1d1d1f] dark:text-white tabular-nums tracking-tight">{quantity}</span>
                        </div>

                        <button onClick={() => updateQty(quantity + 1)} className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all shadow-sm group active:scale-95">
                            <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Serial number inputs (Scrollable middle section) */}
                <div ref={listRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-2 scrollbar-hide relative bg-white dark:bg-[#1c1c1e]">
                    {serials.map((sn, idx) => (
                        <div key={idx} className="flex items-center gap-3 animate-fade-in group">
                            <span className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold bg-gray-50 dark:bg-[#2c2c2e] text-gray-400 border border-gray-100 dark:border-[#333] flex-shrink-0 group-focus-within:bg-[#0071e3] transition-colors group-focus-within:text-white group-focus-within:border-transparent">
                                {idx + 1}
                            </span>
                            <div className="relative flex-1">
                                <input
                                    value={sn}
                                    onChange={e => { const n = [...serials]; n[idx] = e.target.value; setSerials(n); }}
                                    className="w-full px-4 py-3 pl-4 pr-12 text-sm rounded-xl outline-none bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-[#424245] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] transition-all shadow-sm"
                                    placeholder={t('placeholders.hddSerial').replace('#', (idx + 1).toString())}
                                />
                                <button
                                    onClick={() => setScanningIndex(idx)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-[#0071e3] transition-colors rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                                    title="สแกนบาร์โค้ด"
                                >
                                    <ScanBarcode className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer (Fixed bottom) */}
                <div className="p-4 border-t border-gray-100 dark:border-[#333] flex gap-3 flex-shrink-0 bg-white dark:bg-[#1c1c1e] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.2)] z-10">
                    <button onClick={onClose} className="px-5 py-3 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2c2c2e] transition-colors focus:ring-2 focus:ring-gray-200">
                        {t('modals.cancel')}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 py-3 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.99] focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-[#1c1c1e]"
                    >
                        <Check className="w-4 h-4" />
                        {t('modals.confirmHdd').replace('{{count}}', quantity.toString())}
                    </button>
                </div>
            </div>

            {scanningIndex !== null && (
                <ScannerModal
                    onClose={() => setScanningIndex(null)}
                    onScan={(val) => {
                        const n = [...serials];
                        n[scanningIndex] = val;
                        setSerials(n);
                        setScanningIndex(null);
                    }}
                />
            )}
        </div>,
        document.body
    );
};
