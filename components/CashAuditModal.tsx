import React, { useState, useEffect } from 'react';
import { X, ClipboardCheck, AlertTriangle, CheckCircle, Save, Loader2 } from 'lucide-react';
import { MockDb } from '../services/mockDb';
import { showToast } from '../services/toast';

interface CashAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onSave: () => void;
}

export const CashAuditModal: React.FC<CashAuditModalProps> = ({
  isOpen,
  onClose,
  currentBalance,
  onSave
}) => {
  const [physicalBalance, setPhysicalBalance] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Reset inputs when opened
  useEffect(() => {
    if (isOpen) {
      setPhysicalBalance('');
      setNote('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const physicalVal = parseFloat(physicalBalance) || 0;
  const discrepancy = physicalVal - currentBalance;
  const isMatched = Math.abs(discrepancy) < 0.01;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (physicalBalance === '') {
      showToast('กรุณากรอกยอดเงินสดนับจริง', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const currentUser = MockDb.getCurrentUser();
      const auditor = currentUser?.nickname || currentUser?.name || 'Admin';

      await MockDb.addCashAudit({
        date: new Date().toISOString().split('T')[0],
        auditedBy: auditor,
        systemBalance: currentBalance,
        physicalBalance: physicalVal,
        discrepancy: parseFloat(discrepancy.toFixed(2)),
        status: isMatched ? 'MATCHED' : 'DISCREPANCY',
        note: note.trim() || undefined
      });

      showToast('บันทึกการตรวจสอบเงินสดสำเร็จ', 'success');
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลได้', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#1c1c1e] border border-gray-200/80 dark:border-white/[0.08] rounded-3xl p-6 shadow-2xl animate-fade-in text-[#1d1d1f] dark:text-white">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-white/5 mb-5">
          <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-blue-500" />
            <span>ตรวจนับเงินสดในกล่อง</span>
          </h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="space-y-4">
          
          {/* System Balance Display */}
          <div className="bg-gray-50 dark:bg-[#2c2c2e] border border-gray-150/50 dark:border-white/5 rounded-2xl p-4 flex justify-between items-center">
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">ยอดในระบบบัญชี</span>
              <span className="text-xl font-black text-gray-800 dark:text-gray-100 tabular-nums">
                {formatCurrency(currentBalance)}
              </span>
            </div>
            <div className="text-[10px] px-2.5 py-1 bg-blue-500/10 text-blue-500 font-bold rounded-lg uppercase tracking-wider">
              System Cash
            </div>
          </div>

          {/* Physical Cash Input */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">ยอดเงินสดที่นับได้จริง (บาท)</label>
            <input
              type="number"
              step="any"
              required
              value={physicalBalance}
              onChange={e => setPhysicalBalance(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-255 dark:border-[#424245] focus:border-[#0071e3] rounded-2xl px-4 py-3.5 text-base font-bold tabular-nums outline-none transition-colors"
              placeholder="0.00"
              autoFocus
            />
          </div>

          {/* Real-time Discrepancy Alert */}
          {physicalBalance !== '' && (
            <div className={`p-4 rounded-2xl border text-xs space-y-1.5 transition-all ${
              isMatched 
                ? 'bg-emerald-500/5 dark:bg-emerald-500/[0.02] border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/5 dark:bg-amber-500/[0.02] border-amber-500/20 text-amber-600 dark:text-amber-400'
            }`}>
              <div className="flex items-center gap-1.5 font-bold">
                {isMatched ? (
                  <>
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span>ยอดเงินตรวจนับตรงกันพอดี</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>ตรวจพบส่วนต่าง (ยอดไม่ตรงกัน)</span>
                  </>
                )}
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-current/10">
                <span>ส่วนต่าง (นับได้จริง - ยอดในระบบ):</span>
                <span className="font-extrabold tabular-nums text-sm">
                  {discrepancy > 0 ? '+' : ''}{formatCurrency(discrepancy)}
                </span>
              </div>
            </div>
          )}

          {/* Note Input */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">หมายเหตุ / คำชี้แจง (ถ้ามี)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-255 dark:border-[#424245] focus:border-[#0071e3] rounded-2xl px-4 py-3 text-sm outline-none transition-colors resize-none"
              placeholder="ระบุคำชี้แจงสาเหตุของส่วนต่าง หรืออื่นๆ..."
            />
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 bg-gray-100 dark:bg-[#2c2c2e] hover:bg-gray-200 dark:hover:bg-white/5 rounded-2xl text-sm font-bold transition-colors text-gray-600 dark:text-gray-300"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving || physicalBalance === ''}
              className="flex-1 py-3.5 bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/10 active:scale-95 outline-none"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>บันทึกผลตรวจสอบ</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
