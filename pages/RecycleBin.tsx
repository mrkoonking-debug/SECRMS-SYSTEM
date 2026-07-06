import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MockDb } from '../services/mockDb';
import { Trash2, RotateCcw, AlertTriangle, Search, Loader2, ArrowLeft, ShieldAlert } from 'lucide-react';
import { RMA } from '../types';
import { showToast } from '../services/toast';

export const RecycleBin: React.FC = () => {
  const [deletedRmas, setDeletedRmas] = useState<RMA[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchDeletedRMAs = async () => {
    setLoading(true);
    try {
      const data = await MockDb.getDeletedRMAs();
      setDeletedRmas(data);
    } catch (err) {
      console.error("Failed to fetch deleted RMAs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = MockDb.getCurrentUser();
    if (!user || user.role !== 'admin') {
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    fetchDeletedRMAs();
  }, [navigate]);

  const handleRestore = async (id: string) => {
    if (!confirm('คุณต้องการกู้คืนรายการเคลมนี้กลับสู่รายการปกติใช่หรือไม่?')) return;
    setActionLoading(id);
    try {
      await MockDb.restoreRMA(id);
      showToast('กู้คืนรายการเคลมสำเร็จ', 'success');
      fetchDeletedRMAs();
    } catch (err: any) {
      showToast(err.message || 'กู้คืนไม่สำเร็จ', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm('🚨 คำเตือน: คุณต้องการลบรายการนี้ออกจากฐานข้อมูลอย่างถาวรใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้!')) return;
    setActionLoading(id);
    try {
      await MockDb.permanentlyDeleteRMA(id);
      showToast('ลบรายการถาวรสำเร็จ', 'success');
      fetchDeletedRMAs();
    } catch (err: any) {
      showToast(err.message || 'ลบไม่สำเร็จ', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredRmas = deletedRmas.filter(rma => {
    if (!search.trim()) return true;
    const term = search.toLowerCase().trim();
    return (
      rma.id.toLowerCase().includes(term) ||
      (rma.customerName && rma.customerName.toLowerCase().includes(term)) ||
      (rma.serialNumber && rma.serialNumber.toLowerCase().includes(term)) ||
      (rma.productModel && rma.productModel.toLowerCase().includes(term)) ||
      (rma.brand && rma.brand.toLowerCase().includes(term))
    );
  });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-[#0071e3] animate-spin" />
        <p className="text-gray-500 font-medium tracking-tight">กำลังโหลดรายการขยะที่ลบแล้ว...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-[#1d1d1f] dark:text-white mb-2 flex items-center gap-2">
            <Trash2 className="w-8 h-8 text-red-500" /> ถังขยะระบบ (Recycle Bin)
          </h1>
          <p className="text-gray-500">จัดการและกู้คืนรายการใบเคลมสินค้าที่ถูกลบออกจากระบบ (สิทธิ์ Admin เท่านั้น)</p>
        </div>
        <button
          onClick={() => navigate('/admin/settings')}
          className="px-4 py-2 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-[#333] rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-[#2c2c2e] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> กลับไปตั้งค่า
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-[2rem] shadow-sm border border-gray-200 dark:border-[#333] p-2 mb-8 flex items-center gap-2">
        <div className="relative flex-grow">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหาตาม RMA ID, ชื่อลูกค้า, รุ่นสินค้า หรือ Serial Number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none rounded-2xl py-3 pl-11 pr-4 text-sm text-[#1d1d1f] dark:text-white placeholder-gray-500 focus:ring-0"
          />
        </div>
      </div>

      {/* Trash list */}
      <div className="space-y-4">
        {filteredRmas.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-[#1c1c1e] rounded-[2rem] border border-gray-200 dark:border-[#333]">
            <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">ไม่มีรายการใบเคลมอยู่ในถังขยะ</p>
          </div>
        ) : (
          filteredRmas.map((rma) => (
            <div key={rma.id} className="glass-panel p-5 bg-white dark:bg-[#1c1c1e] rounded-[2rem] border border-gray-250 dark:border-[#333] hover:border-blue-400/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/10">Deleted</span>
                  <span className="text-sm font-bold text-gray-800 dark:text-white">{rma.id}</span>
                  {rma.quotationNumber && <span className="text-[10px] text-gray-400 border border-gray-200 dark:border-white/10 px-1.5 py-0.5 rounded">Ref: {rma.quotationNumber}</span>}
                </div>
                <h3 className="text-base font-extrabold text-[#1d1d1f] dark:text-white mb-1">
                  {rma.brand} {rma.productModel} <span className="text-xs font-medium text-gray-400">({rma.serialNumber})</span>
                </h3>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>ลูกค้า: <span className="font-semibold text-gray-700 dark:text-gray-300">{rma.customerName || 'ไม่ระบุ'}</span></p>
                  <p>วันที่ลงทะเบียน: {new Date(rma.createdAt).toLocaleString('th-TH')}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRestore(rma.id)}
                  disabled={actionLoading !== null}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 dark:text-blue-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                  title="กู้คืนรายการ"
                >
                  {actionLoading === rma.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  กู้คืนข้อมูล
                </button>
                <button
                  onClick={() => handlePermanentDelete(rma.id)}
                  disabled={actionLoading !== null}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                  title="ลบถาวร"
                >
                  <Trash2 className="w-4 h-4" />
                  ลบถาวร
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
