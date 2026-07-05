
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MockDb } from '../services/mockDb';
import { Tag, Plus, Trash2, Edit2, Check, X, Loader2, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const BrandManagement: React.FC = () => {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const navigate = useNavigate();
  const { t } = useLanguage();

  const fetchBrands = async () => {
    setLoading(true);
    const data = await MockDb.getBrands();
    setBrands(data.sort((a, b) => a.value.localeCompare(b.value)));
    setLoading(false);
  };

  useEffect(() => {
    const user = MockDb.getCurrentUser();
    if (!user || user.role !== 'admin') {
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    fetchBrands();
  }, [navigate]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsSubmitting(true);
    await MockDb.addBrand({ value: newName.trim(), label: newName.trim() });
    setNewName('');
    await fetchBrands();
    setIsSubmitting(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    setIsSubmitting(true);
    await MockDb.updateBrand(id, { value: editName.trim(), label: editName.trim() });
    setEditingId(null);
    await fetchBrands();
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('management.deleteConfirm'))) {
      try {
        await MockDb.deleteBrand(id);
        await fetchBrands();
      } catch (e: any) {
        alert('ลบไม่สำเร็จ: ' + (e?.message || e));
        console.error('Delete brand error:', e);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 md:py-8">
      <div className="mb-6 md:mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1d1d1f] dark:text-white mb-1">{t('nav.brands')}</h1>
        <p className="text-xs md:text-sm text-gray-500">จัดการรายชื่อยี่ห้อสินค้าสำหรับใช้ในการออกใบเคลม</p>
      </div>

      <div className="glass-panel p-4 md:p-6 rounded-2xl md:rounded-[2rem] mb-6 md:mb-8">
        <h3 className="text-sm md:text-base font-bold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-blue-500" /> {t('management.addBrand')}</h3>
        <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="flex-1 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-3 py-2 text-xs md:text-sm outline-none focus:ring-2 focus:ring-[#0071e3]"
            placeholder={t('management.brandName')}
          />
          <button disabled={isSubmitting} className="w-full md:w-auto px-6 py-2.5 bg-[#0071e3] text-white rounded-xl text-xs md:text-sm font-bold shadow-md hover:scale-105 transition-all">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('management.addBrand')}
          </button>
        </form>
      </div>

      <div className="glass-panel rounded-2xl md:rounded-[2rem] overflow-hidden">
        <div className="p-4 md:p-5 border-b border-gray-100 dark:border-[#333] flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
          <h3 className="text-sm md:text-base font-bold dark:text-white">รายชื่อยี่ห้อทั้งหมด ({brands.length})</h3>
          <Tag className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
        </div>
        {loading ? <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto" /></div> : (
          <div className="divide-y divide-gray-100 dark:divide-[#333]">
            {brands.map((b) => (
              <div key={b.id} className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                {editingId === b.id ? (
                  <div className="flex-1 flex gap-3 animate-fade-in">
                    <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} className="flex-1 bg-white dark:bg-[#333] border border-[#0071e3] rounded-lg px-3 py-2 text-sm" />
                    <button onClick={() => handleUpdate(b.id)} className="p-2 bg-green-500 text-white rounded-lg"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingId(null)} className="p-2 bg-gray-200 text-gray-500 rounded-lg"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <>
                    <div className="font-medium text-sm md:text-base dark:text-white">{b.value}</div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingId(b.id); setEditName(b.value); }} className="p-2 text-gray-400 hover:text-blue-500 transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(b.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
