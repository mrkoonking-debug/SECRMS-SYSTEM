import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Landmark, Plus, FileSpreadsheet, Search, RefreshCw, Trash2, Edit2, Check, 
  ArrowUpRight, ArrowDownLeft, AlertCircle, Coins, Clock, ChevronRight, Image as ImageIcon, X, Wallet, Calendar
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-white/70 dark:bg-[#1e1e24]/40 border border-gray-200/50 dark:border-white/[0.08] rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.02)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg md:text-xl font-bold text-[#1d1d1f] dark:text-white leading-tight">ระบบบันทึกค่าใช้จ่าย & กองกลาง</h1>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">จัดการเงินสดกองกลาง บันทึกสำรองจ่าย และคืนเงินพนักงาน</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto shrink-0">
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#2c2c2e] dark:hover:bg-[#3a3a3c] border border-gray-200/50 dark:border-white/5 text-gray-700 dark:text-gray-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-all outline-none"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
            <span>ส่งออก CSV</span>
          </button>
          <button
            onClick={() => { setSelectedTx(undefined); setShowModal(true); }}
            className="flex-1 sm:flex-none px-3 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-all shadow-md shadow-blue-500/10 outline-none"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มบันทึก</span>
          </button>
        </div>
      </div>

      {/* Summary Widgets Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {/* Petty Cash Balance */}
        <div className="bg-white/70 dark:bg-[#1e1e24]/45 border border-gray-200/50 dark:border-white/[0.08] rounded-2xl p-3.5 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.02)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-2xl flex flex-col justify-between min-h-[110px] sm:min-h-[135px] relative overflow-hidden">
          <div className="absolute right-3 top-3 text-emerald-500 bg-emerald-500/10 w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center">
            <Coins className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block pr-6">เงินสดกองกลางคงเหลือ</span>
            <span className={`text-base sm:text-xl md:text-2xl font-black mt-1 sm:mt-2 block tabular-nums ${summary.pettyCashBalance >= 0 ? 'text-[#34c759]' : 'text-[#ff3b30]'}`}>
              {formatCurrency(summary.pettyCashBalance)}
            </span>
          </div>
          <span className="text-[8px] sm:text-[10px] text-gray-400 dark:text-gray-500 mt-1 sm:mt-2 block leading-tight">
            *เงินสดพร้อมหยิบจ่ายได้ทันที
          </span>
        </div>

        {/* Net Remaining Balance */}
        {(() => {
          const netBalance = summary.pettyCashBalance - summary.totalPersonalAdvance;
          return (
            <div className="bg-white/70 dark:bg-[#1e1e24]/45 border border-gray-200/50 dark:border-white/[0.08] rounded-2xl p-3.5 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.02)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-2xl flex flex-col justify-between min-h-[110px] sm:min-h-[135px] relative overflow-hidden">
              <div className="absolute right-3 top-3 text-blue-500 bg-blue-500/10 w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block pr-6">คงเหลือสุทธิ (หลังคืนช่าง)</span>
                <span className={`text-base sm:text-xl md:text-2xl font-black mt-1 sm:mt-2 block tabular-nums ${netBalance >= 0 ? 'text-[#0071e3] dark:text-blue-400' : 'text-[#ff3b30]'}`}>
                  {formatCurrency(netBalance)}
                </span>
              </div>
              <span className="text-[8px] sm:text-[10px] text-gray-400 dark:text-gray-500 mt-1 sm:mt-2 block leading-tight">
                *หักยอดที่ต้องคืนพนักงานแล้ว
              </span>
            </div>
          );
        })()}

        {/* Unpaid Advance Payments */}
        <div className="bg-white/70 dark:bg-[#1e1e24]/45 border border-gray-200/50 dark:border-white/[0.08] rounded-2xl p-3.5 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.02)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-2xl flex flex-col justify-between min-h-[110px] sm:min-h-[135px] relative overflow-hidden">
          <div className="absolute right-3 top-3 text-orange-500 bg-orange-500/10 w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block pr-6">สำรองจ่ายค้างคืนพนักงาน</span>
            <span className="text-base sm:text-xl md:text-2xl font-black text-[#ff9500] mt-1 sm:mt-2 block tabular-nums">
              {formatCurrency(summary.totalPersonalAdvance)}
            </span>
          </div>
          <span className="text-[8px] sm:text-[10px] text-gray-400 dark:text-gray-500 mt-1 sm:mt-2 block leading-tight">
            *พนักงานสำรองจ่ายเงินตัวเองไปก่อน
          </span>
        </div>

        {/* Staff Breakdown settlement card */}
        <div className="bg-white/70 dark:bg-[#1e1e24]/45 border border-gray-200/50 dark:border-white/[0.08] rounded-2xl p-3.5 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.02)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-2xl flex flex-col justify-between min-h-[110px] sm:min-h-[135px]">
          <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block mb-1">ยอดค้างคืนแยกรายคน</span>
          <div className="flex-1 overflow-y-auto max-h-[60px] sm:max-h-[85px] space-y-1 custom-scrollbar pr-0.5">
            {Object.keys(summary.personalAdvanceByStaff).length === 0 ? (
              <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 italic mt-1 sm:mt-2">ไม่มีค้างจ่ายพนักงาน</p>
            ) : (
              Object.entries(summary.personalAdvanceByStaff).map(([name, amount]) => (
                <div key={name} className="flex items-center justify-between text-[10px] sm:text-xs py-0.5 border-b border-gray-100/50 dark:border-white/5 last:border-0">
                  <span className="font-semibold text-[#1d1d1f] dark:text-gray-300 truncate max-w-[50px] sm:max-w-none">{name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#ff9500] tabular-nums">{formatCurrency(amount)}</span>
                    <button
                      onClick={() => handleReimburseAllForStaff(name)}
                      className="text-[8px] sm:text-[9px] px-1.5 py-0.5 bg-blue-500/10 hover:bg-[#0071e3] hover:text-white text-[#0071e3] font-bold rounded transition-colors"
                    >
                      คืนเงิน
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Filter and Table Section */}
      <div className="bg-white/70 dark:bg-[#1e1e24]/40 border border-gray-200/50 dark:border-white/[0.08] rounded-3xl p-4 md:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.02)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-2xl space-y-6">
        {/* Filters Row */}
        <div className="flex flex-col xl:flex-row xl:items-center gap-4">
          {/* Search bar */}
          <div className="relative w-full xl:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-[#0071e3] text-[#1d1d1f] dark:text-white"
              placeholder="ค้นหาข้อความ..."
            />
          </div>

          {/* Filter Chips Container */}
          <div className="flex flex-col md:flex-row md:items-center gap-3.5 flex-grow w-full">
            {/* Type Filter Chips */}
            <div className="grid grid-cols-3 bg-gray-100/80 dark:bg-white/[0.04] p-1 rounded-xl w-full md:w-auto shrink-0 select-none">
              <button
                onClick={() => setTypeFilter('ALL')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center ${
                  typeFilter === 'ALL'
                    ? 'bg-white dark:bg-white/10 text-gray-800 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                ทุกประเภท
              </button>
              <button
                onClick={() => setTypeFilter('INCOME')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center ${
                  typeFilter === 'INCOME'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                เบิกเงินพี่เกษม
              </button>
              <button
                onClick={() => setTypeFilter('EXPENSE')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center ${
                  typeFilter === 'EXPENSE'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                รายจ่าย
              </button>
            </div>

            {/* Source Filter Chips */}
            <div className="grid grid-cols-3 bg-gray-100/80 dark:bg-white/[0.04] p-1 rounded-xl w-full md:w-auto shrink-0 select-none">
              <button
                onClick={() => setSourceFilter('ALL')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center ${
                  sourceFilter === 'ALL'
                    ? 'bg-white dark:bg-white/10 text-gray-800 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                ทุกแหล่งเงิน
              </button>
              <button
                onClick={() => setSourceFilter('PETTY_CASH')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center ${
                  sourceFilter === 'PETTY_CASH'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                เงินกองกลาง
              </button>
              <button
                onClick={() => setSourceFilter('PERSONAL_CASH')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center ${
                  sourceFilter === 'PERSONAL_CASH'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                สำรองจ่าย
              </button>
            </div>
          </div>

          {/* Date range pickers */}
          <div className="flex gap-2 items-center w-full xl:w-auto flex-shrink-0">
            <div className="flex-1 sm:flex-initial sm:w-32">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 rounded-xl text-xs outline-none focus:border-[#0071e3] text-[#1d1d1f] dark:text-white shadow-sm"
              />
            </div>
            <span className="text-gray-400 text-xs font-semibold shrink-0">ถึง</span>
            <div className="flex-1 sm:flex-initial sm:w-32">
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 rounded-xl text-xs outline-none focus:border-[#0071e3] text-[#1d1d1f] dark:text-white shadow-sm"
              />
            </div>
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
                        <td className="py-3.5 pl-2 font-mono whitespace-nowrap">
                          <div>{tx.date}</div>
                          {tx.time && (
                            <div className="text-[10px] text-gray-400 flex items-center gap-0.5 mt-0.5">
                              <Clock className="w-3 h-3 text-gray-400/80" />
                              {tx.time}
                            </div>
                          )}
                        </td>
                        
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
                      <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-gray-400/85" />
                        <span>{tx.date}</span>
                        {tx.time && (
                          <>
                            <span className="text-gray-300 dark:text-gray-700">|</span>
                            <Clock className="w-3 h-3 text-gray-400/85" />
                            <span>{tx.time}</span>
                          </>
                        )}
                      </span>
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
