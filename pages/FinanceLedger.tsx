import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Landmark, Plus, FileSpreadsheet, Search, RefreshCw, Trash2, Edit2, Check, 
  ArrowUpRight, ArrowDownLeft, AlertCircle, Coins, Clock, ChevronRight, Image as ImageIcon, X
} from 'lucide-react';
import { PettyCashTransaction, PettyCashSummary } from '../types';
import { MockDb } from '../services/mockDb';
import { useLanguage } from '../contexts/LanguageContext';
import { showToast } from '../services/toast';
import { TransactionModal } from '../components/TransactionModal';
import { GlassSelect } from '../components/GlassSelect';

export const FinanceLedger: React.FC = () => {
  const [transactions, setTransactions] = useState<PettyCashTransaction[]>([]);
  const [summary, setSummary] = useState<PettyCashSummary>({
    pettyCashBalance: 0,
    totalPersonalAdvance: 0,
    personalAdvanceByStaff: {}
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<PettyCashTransaction | undefined>(undefined);
  const [activeReceiptUrl, setActiveReceiptUrl] = useState<string | null>(null);

  const navigate = useNavigate();
  const { t } = useLanguage();
  const currentUser = MockDb.getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';

  const fetchData = async () => {
    setLoading(true);
    try {
      const txList = await MockDb.getPettyCashTransactions();
      const summ = await MockDb.getPettyCashSummary();
      setTransactions(txList);
      setSummary(summ);
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการโหลดข้อมูลการเงิน', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { replace: true });
      return;
    }
    // Guard: only admin or users with canAccessFinance can access
    if (currentUser.role !== 'admin' && !(currentUser as any).canAccessFinance) {
      showToast('คุณไม่มีสิทธิ์เข้าถึงหน้าการเงิน กรุณาติดต่อผู้ดูแลระบบ', 'error');
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    fetchData();
  }, [currentUser, navigate]);

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    // Search filter
    const matchesSearch = 
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.note && tx.note.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.refRmaId && tx.refRmaId.toLowerCase().includes(searchTerm.toLowerCase()));

    // Type filter
    const matchesType = typeFilter === 'ALL' || tx.type === typeFilter;

    // Source filter
    const matchesSource = sourceFilter === 'ALL' || 
      (sourceFilter === 'PERSONAL_CASH' && (tx.paidBy === 'PERSONAL_CASH' || tx.paidBy === 'PERSONAL_TRANSFER')) ||
      tx.paidBy === sourceFilter;

    // Date range filter
    const matchesStartDate = !startDate || tx.date >= startDate;
    const matchesEndDate = !endDate || tx.date <= endDate;

    return matchesSearch && matchesType && matchesSource && matchesStartDate && matchesEndDate;
  });

  const handleReimburse = async (txId: string) => {
    if (!confirm('ยืนยันว่าทำการคืนเงินสด/เงินโอนส่วนตัวคืนให้กับพนักงานเรียบร้อยแล้วใช่หรือไม่?')) return;
    try {
      await MockDb.updatePettyCashTransaction(txId, {
        isReimbursed: true,
        reimbursedAt: new Date().toISOString(),
        reimbursedBy: currentUser?.name || 'Admin'
      });
      showToast('บันทึกคืนเงินพนักงานสำเร็จ', 'success');
      fetchData();
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    }
  };

  const handleReimburseAllForStaff = async (staffName: string) => {
    if (!confirm(`ยืนยันคืนเงินสำรองจ่ายทั้งหมดให้กับคุณ ${staffName} หรือไม่?`)) return;
    try {
      // Find all unpaid advance transactions for this staff
      const unpaid = transactions.filter(
        tx => tx.staffName === staffName && 
        tx.type === 'EXPENSE' && 
        (tx.paidBy === 'PERSONAL_CASH' || tx.paidBy === 'PERSONAL_TRANSFER') && 
        !tx.isReimbursed
      );

      for (const tx of unpaid) {
        await MockDb.updatePettyCashTransaction(tx.id, {
          isReimbursed: true,
          reimbursedAt: new Date().toISOString(),
          reimbursedBy: currentUser?.name || 'Admin'
        });
      }
      showToast(`คืนเงินสำรองจ่ายของ ${staffName} เรียบร้อยแล้ว`, 'success');
      fetchData();
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการคืนเงินสะสม', 'error');
    }
  };

  const handleDelete = async (txId: string) => {
    if (!isAdmin) {
      showToast('เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถลบรายการการเงินได้', 'error');
      return;
    }
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการการเงินนี้? การกระทำนี้ไม่สามารถกู้คืนได้')) return;
    try {
      await MockDb.deletePettyCashTransaction(txId);
      showToast('ลบรายการการเงินสำเร็จ', 'success');
      fetchData();
    } catch (err) {
      showToast('ลบรายการไม่สำเร็จ', 'error');
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = ['วันที่', 'ประเภท', 'จำนวนเงิน', 'รายละเอียด', 'หมวดหมู่', 'จ่ายโดย', 'ผู้ทำรายการ', 'คืนเงินแล้ว', 'ใบงานเคลมที่อ้างอิง', 'หมายเหตุ'];
      const rows = filteredTransactions.map(t => [
        t.date,
        t.type === 'INCOME' ? 'รายรับ' : 'รายจ่าย',
        t.amount.toFixed(2),
        t.description,
        t.category || '',
        t.paidBy === 'PETTY_CASH' ? 'เงินกองกลาง' : t.paidBy === 'PERSONAL_CASH' ? 'เงินสดส่วนตัวช่าง' : 'เงินโอนส่วนตัวช่าง',
        t.staffName,
        t.type === 'INCOME' ? 'N/A' : t.paidBy === 'PETTY_CASH' ? 'N/A' : t.isReimbursed ? 'คืนแล้ว' : 'ยังไม่คืน',
        t.refRmaId || '',
        t.note || ''
      ]);

      const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sec-finance-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('ส่งออก CSV รายการเงินสำเร็จ', 'success');
    } catch (e) {
      showToast('ส่งออกล้มเหลว', 'error');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(val);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-in px-4 pb-20 md:pb-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/40 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/[0.06] rounded-3xl p-6 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-[#1d1d1f] dark:text-white leading-tight">ระบบบันทึกค่าใช้จ่าย & กองกลาง</h1>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">จัดการกระแสเงินสดกองกลาง บันทึกการสำรองจ่าย และอนุมัติการเบิกคืนเงินสำหรับทีมช่าง</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-[#2c2c2e] dark:hover:bg-[#3a3a3c] border border-gray-200/50 dark:border-white/5 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold flex items-center gap-1.5 active:scale-95 transition-all outline-none"
          >
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            ส่งออกรายงาน (CSV)
          </button>
          <button
            onClick={() => { setSelectedTx(undefined); setShowModal(true); }}
            className="px-4 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-sm font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-md shadow-blue-500/10 outline-none"
          >
            <Plus className="w-4 h-4" />
            เพิ่มบันทึกรายรับ/จ่าย
          </button>
        </div>
      </div>

      {/* Summary Widgets Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Petty Cash Balance */}
        <div className="bg-white/40 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/[0.06] rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-between min-h-[140px] relative overflow-hidden">
          <div className="absolute right-4 top-4 text-emerald-500 bg-emerald-500/10 w-10 h-10 rounded-full flex items-center justify-center">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block">ยอดเงินสดกองกลางคงเหลือ</span>
            <span className={`text-2xl md:text-3xl font-black mt-2 block tabular-nums ${summary.pettyCashBalance >= 0 ? 'text-[#34c759]' : 'text-[#ff3b30]'}`}>
              {formatCurrency(summary.pettyCashBalance)}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 block">
            *เฉพาะเงินกองกลางที่พร้อมหยิบจ่ายได้ทันที
          </span>
        </div>

        {/* Unpaid Advance Payments */}
        <div className="bg-white/40 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/[0.06] rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-between min-h-[140px] relative overflow-hidden">
          <div className="absolute right-4 top-4 text-orange-500 bg-orange-500/10 w-10 h-10 rounded-full flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block">ยอดสำรองจ่ายค้างคืนพนักงาน</span>
            <span className="text-2xl md:text-3xl font-black text-[#ff9500] mt-2 block tabular-nums">
              {formatCurrency(summary.totalPersonalAdvance)}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 block">
            *พนักงานออกเงินสด/โอนส่วนตัวสำรองจ่ายไปก่อน
          </span>
        </div>

        {/* Staff Breakdown settlement card */}
        <div className="bg-white/40 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/[0.06] rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-between min-h-[140px]">
          <span className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block mb-2">ยอดค้างคืนจำแนกตามพนักงาน</span>
          <div className="flex-1 overflow-y-auto max-h-[80px] space-y-1.5 custom-scrollbar pr-1">
            {Object.keys(summary.personalAdvanceByStaff).length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-2">ไม่มีพนักงานค้างเบิกคืนเงินสด</p>
            ) : (
              Object.entries(summary.personalAdvanceByStaff).map(([name, amount]) => (
                <div key={name} className="flex items-center justify-between text-xs py-1 border-b border-gray-100/50 dark:border-white/5 last:border-0">
                  <span className="font-semibold text-[#1d1d1f] dark:text-gray-300">{name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#ff9500] tabular-nums">{formatCurrency(amount)}</span>
                    <button
                      onClick={() => handleReimburseAllForStaff(name)}
                      className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-[#0071e3] font-bold rounded hover:bg-[#0071e3] hover:text-white transition-colors"
                    >
                      คืนเงินทั้งหมด
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Filter and Table Section */}
      <div className="bg-white/40 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/[0.06] rounded-3xl p-4 md:p-6 backdrop-blur-xl space-y-6">
        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-[#0071e3] text-[#1d1d1f] dark:text-white"
              placeholder="ค้นหาข้อความ..."
            />
          </div>

          {/* Type Filter */}
          <GlassSelect
            value={typeFilter}
            onChange={val => setTypeFilter(val as 'ALL' | 'INCOME' | 'EXPENSE')}
            options={[
              { value: 'ALL', label: 'ทุกประเภท' },
              { value: 'INCOME', label: 'เบิกเงินพี่เกษม' },
              { value: 'EXPENSE', label: 'รายจ่าย' },
            ]}
          />

          {/* Source Filter */}
          <GlassSelect
            value={sourceFilter}
            onChange={val => setSourceFilter(val)}
            options={[
              { value: 'ALL', label: 'ทุกแหล่งเงิน' },
              { value: 'PETTY_CASH', label: 'เงินกองกลาง' },
              { value: 'PERSONAL_CASH', label: 'พนักงานสำรองจ่าย' },
            ]}
          />

          {/* Date range pickers */}
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-2 py-2 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 rounded-xl text-xs outline-none focus:border-[#0071e3] text-[#1d1d1f] dark:text-white"
            />
            <span className="text-gray-400 text-xs">ถึง</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-2 py-2 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 rounded-xl text-xs outline-none focus:border-[#0071e3] text-[#1d1d1f] dark:text-white"
            />
          </div>
        </div>

        {/* Clear Filters Helper */}
        {(searchTerm || typeFilter !== 'ALL' || sourceFilter !== 'ALL' || startDate || endDate) && (
          <button
            onClick={() => { setSearchTerm(''); setTypeFilter('ALL'); setSourceFilter('ALL'); setStartDate(''); setEndDate(''); }}
            className="text-xs text-blue-500 hover:text-blue-600 font-bold flex items-center gap-1 mt-1 pl-1"
          >
            <RefreshCw className="w-3 h-3" /> ล้างตัวกรองทั้งหมด
          </button>
        )}

        {/* Transactions list */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#0071e3]" />
            <p className="text-sm font-medium">กำลังประมวลผลข้อมูลการเงิน...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-gray-400 italic">
            ไม่พบข้อมูลบันทึกรายการการเงินที่ตรงกับตัวกรอง
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/5 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-left">
                    <th className="pb-3 pl-2">วันที่</th>
                    <th className="pb-3">ประเภท</th>
                    <th className="pb-3">รายละเอียดรายการ</th>
                    <th className="pb-3">วิธีจ่ายเงิน / สถานะ</th>
                    <th className="pb-3">ผู้ทำรายการ</th>
                    <th className="pb-3 text-right">จำนวนเงิน</th>
                    <th className="pb-3 text-right pr-2">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/50 dark:divide-white/5">
                  {filteredTransactions.map(tx => {
                    const isExpense = tx.type === 'EXPENSE';
                    const isPersonal = tx.paidBy !== 'PETTY_CASH';
                    const showReimburseBtn = isExpense && isPersonal && !tx.isReimbursed;

                    return (
                      <tr key={tx.id} className="text-xs text-[#1d1d1f] dark:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-all">
                        {/* Date */}
                        <td className="py-3.5 pl-2 font-mono whitespace-nowrap">{tx.date}</td>
                        
                        {/* Type Icon */}
                        <td className="py-3.5 whitespace-nowrap">
                          {tx.type === 'INCOME' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full font-bold text-[10px]">
                              <ArrowUpRight className="w-3 h-3" /> เบิกเงินพี่เกษม
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-orange-500/10 text-[#ff9500] rounded-full font-bold text-[10px]">
                              <ArrowDownLeft className="w-3 h-3" /> รายจ่าย
                            </span>
                          )}
                        </td>

                        {/* Description & linked RMA */}
                        <td className="py-3.5 max-w-[200px] md:max-w-[300px]">
                          <div className="flex items-center gap-3">
                            {tx.receiptUrl && (
                              <button
                                onClick={() => setActiveReceiptUrl(tx.receiptUrl!)}
                                className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 shrink-0 hover:scale-105 active:scale-95 transition-transform"
                                title="ดูใบเสร็จ"
                              >
                                <img src={tx.receiptUrl} className="w-full h-full object-cover" alt="Receipt" />
                              </button>
                            )}
                            <div className="truncate">
                              <span className="font-semibold block truncate" title={tx.description}>{tx.description}</span>
                              <span className="text-[10px] text-gray-400 mt-0.5 block">{tx.category}</span>
                            </div>
                          </div>
                        </td>

                        {/* Payment Method / Reimbursement */}
                        <td className="py-3.5">
                          <div>
                            {tx.type === 'INCOME' ? (
                              <span className="text-gray-400">เบิกเงินพี่เกษม</span>
                            ) : tx.paidBy === 'PETTY_CASH' ? (
                              <span className="text-blue-500 font-medium">เงินกองกลาง</span>
                            ) : (
                              <div className="space-y-1">
                                <span className="text-amber-500 font-semibold block">
                                  พนักงานสำรองจ่าย
                                </span>
                                {tx.isReimbursed ? (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.2 rounded-md">
                                    <Check className="w-2.5 h-2.5" /> คืนพนักงานแล้ว
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.2 rounded-md animate-pulse">
                                    <AlertCircle className="w-2.5 h-2.5" /> ยังไม่เบิกคืน
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Staff Name */}
                        <td className="py-3.5 whitespace-nowrap text-gray-500 dark:text-gray-400">{tx.staffName}</td>

                        {/* Amount */}
                        <td className="py-3.5 text-right font-bold text-sm tabular-nums whitespace-nowrap">
                          {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 text-right pr-2 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {showReimburseBtn && (
                              <button
                                onClick={() => handleReimburse(tx.id)}
                                className="px-2 py-1 bg-[#34c759] hover:bg-[#30b34f] text-white font-bold rounded-lg text-[10px] shadow-sm transition-colors active:scale-95"
                                title="กดบันทึกคืนเงินพนักงาน"
                              >
                                คืนเงินพนักงาน
                              </button>
                            )}
                            <button
                              onClick={() => { setSelectedTx(tx); setShowModal(true); }}
                              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                              title="แก้ไขรายการ"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDelete(tx.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                                title="ลบรายการ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards List View */}
            <div className="sm:hidden space-y-3.5">
              {filteredTransactions.map(tx => {
                const isExpense = tx.type === 'EXPENSE';
                const isPersonal = tx.paidBy !== 'PETTY_CASH';
                const showReimburseBtn = isExpense && isPersonal && !tx.isReimbursed;

                return (
                  <div 
                    key={tx.id} 
                    className={`bg-white dark:bg-[#1c1c1e] p-4 rounded-2xl border ${tx.type === 'INCOME' ? 'border-l-4 border-l-emerald-500' : tx.paidBy === 'PETTY_CASH' ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-orange-500'} border-gray-200/50 dark:border-white/[0.05] space-y-3 shadow-sm`}
                  >
                    {/* Top Row: Date & Amount */}
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-gray-400 font-mono">{tx.date}</span>
                      <span className="text-sm font-bold tabular-nums">
                        {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </div>

                    {/* Middle Row: Description */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-[#1d1d1f] dark:text-white leading-tight">{tx.description}</h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">{tx.category} · ทำโดย {tx.staffName}</p>
                      </div>
                      {tx.receiptUrl && (
                        <button
                          onClick={() => setActiveReceiptUrl(tx.receiptUrl!)}
                          className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 shrink-0 hover:scale-105 active:scale-95 transition-transform"
                          title="ดูใบเสร็จ"
                        >
                          <img src={tx.receiptUrl} className="w-full h-full object-cover" alt="Receipt" />
                        </button>
                      )}
                    </div>

                    {/* Bottom Status Block */}
                    <div className="pt-2 border-t border-gray-100/50 dark:border-white/5 flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        {tx.type === 'INCOME' ? (
                          <span className="text-[10px] text-gray-400">เบิกเงินพี่เกษม</span>
                        ) : tx.paidBy === 'PETTY_CASH' ? (
                          <span className="text-[10px] text-blue-500 font-semibold">จ่ายจากกองกลาง</span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] text-amber-500 font-semibold">
                              สำรองจ่าย
                            </span>
                            {tx.isReimbursed ? (
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.2 rounded-md">
                                คืนเงินแล้ว
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.2 rounded-md animate-pulse">
                                ยังไม่คืน
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-1.5 ml-auto">
                        {showReimburseBtn && (
                          <button
                            onClick={() => handleReimburse(tx.id)}
                            className="px-2 py-1 bg-[#34c759] hover:bg-[#30b34f] text-white font-bold rounded-lg text-[9px] transition-colors active:scale-95"
                          >
                            คืนเงินช่าง
                          </button>
                        )}
                        <button
                          onClick={() => { setSelectedTx(tx); setShowModal(true); }}
                          className="p-1.5 bg-gray-50 dark:bg-white/5 rounded-lg text-gray-400 hover:text-blue-500"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="p-1.5 bg-gray-50 dark:bg-white/5 rounded-lg text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Transaction Entry/Edit Modal popup */}
      {showModal && (
        <TransactionModal
          onClose={() => { setShowModal(false); setSelectedTx(undefined); }}
          onSave={() => { setShowModal(false); setSelectedTx(undefined); fetchData(); }}
          transaction={selectedTx}
        />
      )}

      {/* Lightbox for viewing Receipt */}
      {activeReceiptUrl && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setActiveReceiptUrl(null)}
        >
          <div 
            className="relative max-w-3xl w-full max-h-[90vh] bg-white dark:bg-[#1c1c1e] rounded-3xl overflow-hidden shadow-2xl p-2 flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveReceiptUrl(null)}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-full overflow-auto flex justify-center p-4 mt-8">
              <img src={activeReceiptUrl} alt="Receipt Full size" className="max-w-full max-h-[70vh] object-contain rounded-xl" />
            </div>
            <div className="pb-4 pt-2 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">รูปภาพหลักฐานการทำรายการการเงิน</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
