
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MockDb } from '../services/mockDb';
import { Settings, Save, Check, Loader2, Globe, Building, Zap, Trash2, AlertTriangle, Archive, X, Search, Wrench } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { showToast } from '../services/toast';

interface OldRmaItem {
  id: string; brand: string; model: string; serial: string;
  customer: string; createdAt: string; jobId: string;
}

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [isDeletingOld, setIsDeletingOld] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isFixingIds, setIsFixingIds] = useState(false);
  const [fixResult, setFixResult] = useState('');
  const [oldRmaList, setOldRmaList] = useState<OldRmaItem[]>([]);
  const [showOldRmaModal, setShowOldRmaModal] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const user = MockDb.getCurrentUser();
    if (!user || user.role !== 'admin') {
      navigate('/admin/dashboard', { replace: true });
      return;
    }

    const fetch = async () => {
      const data = await MockDb.getSettings();
      setSettings(data);
      setLoading(false);
    };
    fetch();
  }, [navigate]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await MockDb.updateSettings(settings);
    setSuccess('Settings Saved!');
    setIsSaving(false);

    if (settings.performanceMode) {
      document.documentElement.classList.add('performance-mode');
    } else {
      document.documentElement.classList.remove('performance-mode');
    }

    setTimeout(() => setSuccess(''), 3000);
  };

  // Step 1: Scan old RMAs and show list
  const handleScanOldRMAs = async () => {
    setIsScanning(true);
    try {
      const items = await MockDb.scanOldRMAs(5);
      if (items.length === 0) {
        showToast('ไม่พบรายการเคลมที่เก่าเกิน 5 ปี ✨', 'success');
      } else {
        setOldRmaList(items);
        setShowOldRmaModal(true);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  // Step 2: Confirm and delete
  const handleConfirmDelete = async () => {
    setIsDeletingOld(true);
    try {
      const count = await MockDb.deleteOldRMAs(5);
      showToast(`ลบรายการเคลมเก่าสำเร็จ ${count} รายการ`, 'success');
      setShowOldRmaModal(false);
      setOldRmaList([]);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด', 'error');
    } finally {
      setIsDeletingOld(false);
    }
  };

  const handleFixJobIds = async () => {
    if (!confirm('ต้องการแก้ไขเลข Job ID ที่ผิดปกติ (เลขสุ่มจาก fallback) ให้เรียงลำดับถูกต้องหรือไม่?')) return;
    setIsFixingIds(true);
    setFixResult('');
    try {
      const result = await MockDb.fixGroupRequestIds();
      setFixResult(result);
      showToast('แก้ไขเลข Job ID สำเร็จ!', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด', 'error');
    } finally {
      setIsFixingIds(false);
    }
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-[#1d1d1f] dark:text-white mb-2">{t('nav.settings')}</h1>
        <p className="text-gray-500">ตั้งค่าข้อมูลบริษัทสำหรับใช้แสดงผลในเอกสารใบเคลมและใบรับคืน</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="glass-panel p-8 rounded-[2rem] space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-2"><Building className="w-5 h-5 text-blue-500" /> ข้อมูลบริษัท</h3>

          <div className="flex flex-col md:flex-row gap-8 items-start mb-6 border-b border-gray-100 dark:border-white/10 pb-6">
            <div className="shrink-0">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Company Logo</label>
              <div className="w-48 h-20 border-2 border-dashed border-gray-200 dark:border-[#424245] rounded-xl flex items-center justify-center bg-gray-50 dark:bg-[#2c2c2e] overflow-hidden relative group cursor-pointer hover:border-blue-500 transition-colors">
                {settings.logoUrl ?
                  <img src={settings.logoUrl} className="w-full h-full object-contain p-2" alt="Logo" /> :
                  <span className="text-gray-400 text-xs">Upload Logo</span>
                }
                <input type="file" accept="image/*" onChange={handleLogoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity pointer-events-none">Click to Change</div>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">Recommended: 200px width (PNG/JPG)</p>
            </div>
            <div className="flex-1 pt-4">
              <h4 className="font-bold text-sm text-[#1d1d1f] dark:text-white mb-1">Logo Configuration</h4>
              <p className="text-xs text-gray-500 leading-relaxed">This logo will appear on all printed documents including Distributor RMA Requests and Customer Return Notes. Please use a transparent PNG for best results.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Company Name (TH)</label>
              <input value={settings.nameTh} onChange={e => setSettings({ ...settings, nameTh: e.target.value })} className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-3 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Company Name (EN)</label>
              <input value={settings.nameEn} onChange={e => setSettings({ ...settings, nameEn: e.target.value })} className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-3 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Address</label>
            <textarea value={settings.address} onChange={e => setSettings({ ...settings, address: e.target.value })} className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-3 text-sm" rows={3} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Tax ID</label>
              <input value={settings.taxId} onChange={e => setSettings({ ...settings, taxId: e.target.value })} className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-3 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Tel</label>
              <input value={settings.tel} onChange={e => setSettings({ ...settings, tel: e.target.value })} className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-3 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Website</label>
              <input value={settings.website} onChange={e => setSettings({ ...settings, website: e.target.value })} className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-3 text-sm" />
            </div>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-[2rem] space-y-6 mt-6">
          <h3 className="text-lg font-bold flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-500" /> การแสดงผลและประสิทธิภาพ (Performance)</h3>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl flex-wrap gap-4">
            <div className="flex-1">
              <h4 className="font-bold text-sm text-[#1d1d1f] dark:text-white mb-1">Performance Mode (ลด Effect กราฟิก)</h4>
              <p className="text-xs text-gray-500">ปิดการทำงานของลูกเล่นพื้นหลังเบลอ (Glassmorphism / Blur) ทั้งโปรแกรม เพื่อให้ทำงานได้ลื่นไหลขึ้นบนคอมพิวเตอร์และมือถือสเปคต่ำ</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, performanceMode: !settings.performanceMode })}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.performanceMode ? 'bg-green-500' : 'bg-gray-200 dark:bg-[#424245]'}`}
              role="switch"
              aria-checked={settings.performanceMode}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.performanceMode ? 'translate-x-5' : 'translate-x-0'}`}></span>
            </button>
          </div>
        </div>

        {/* Data Management Section */}
        <div className="glass-panel p-8 rounded-[2rem] space-y-6 mt-6">
          <h3 className="text-lg font-bold flex items-center gap-2"><Archive className="w-5 h-5 text-orange-500" /> การจัดการข้อมูล (Data Management)</h3>

          <div className="p-4 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex-1">
                <h4 className="font-bold text-sm text-[#1d1d1f] dark:text-white mb-1 flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-red-500" /> ลบรายการเคลมเก่า (เกิน 5 ปี)
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  ลบรายการเคลมที่สร้างก่อนปี <strong>{new Date().getFullYear() - 5}</strong> ออกจากระบบ 
                  เพื่อประหยัดพื้นที่จัดเก็บข้อมูลบน Firestore ระบบจะยืนยันก่อนลบทุกครั้ง
                </p>
              </div>
              <button
                type="button"
                onClick={handleScanOldRMAs}
                disabled={isScanning || isDeletingOld}
                className="px-5 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all active:scale-95 shadow-sm"
              >
                {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {isScanning ? 'กำลังสแกน...' : 'สแกนรายการเก่า'}
              </button>
            </div>
            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 dark:text-amber-400">การลบข้อมูลจะไม่สามารถกู้คืนได้ กรุณาตรวจสอบให้แน่ใจก่อนดำเนินการ</p>
            </div>
          </div>

          {/* Fix Job ID Section */}
          <div className="p-4 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl mt-4">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex-1">
                <h4 className="font-bold text-sm text-[#1d1d1f] dark:text-white mb-1 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-blue-500" /> แก้ไขเลข Job ID ที่ผิดปกติ
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  สแกนและแก้ไข Job ID ที่เป็นเลขสุ่ม (เช่น 4745, 8501) ให้กลับมาเรียงลำดับถูกต้อง เช่น 0039, 0040...
                </p>
              </div>
              <button
                type="button"
                onClick={handleFixJobIds}
                disabled={isFixingIds}
                className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all active:scale-95 shadow-sm"
              >
                {isFixingIds ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
                {isFixingIds ? 'กำลังแก้ไข...' : 'แก้ไข Job ID'}
              </button>
            </div>
            {fixResult && (
              <pre className="mt-3 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 rounded-lg text-xs text-green-700 dark:text-green-400 whitespace-pre-wrap">{fixResult}</pre>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-[#1c1c1e] p-6 rounded-[2rem] border border-gray-100 dark:border-[#333]">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Globe className="w-4 h-4" /> Changes will reflect on all PDF documents.
          </div>
          <div className="flex items-center gap-4">
            {success && <span className="text-green-500 text-sm font-bold flex items-center gap-1"><Check className="w-4 h-4" /> {success}</span>}
            <button disabled={isSaving} className="px-8 py-3 bg-[#0071e3] text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 flex items-center gap-2 active:scale-95 transition-all">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Settings</>}
            </button>
          </div>
        </div>
      </form>

      {/* Old RMA List Modal */}
      {showOldRmaModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setShowOldRmaModal(false)}>
          <div className="bg-white dark:bg-[#1c1c1e] rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col animate-fade-in" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-[#333] flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  รายการเคลมที่จะถูกลบ ({oldRmaList.length} รายการ)
                </h3>
                <p className="text-xs text-gray-500 mt-1">รายการด้านล่างถูกสร้างก่อนปี {new Date().getFullYear() - 5} (เก่ากว่า 5 ปี)</p>
              </div>
              <button onClick={() => setShowOldRmaModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-[#2c2c2e]">
                  <tr className="text-left text-[10px] uppercase text-gray-400 font-bold">
                    <th className="p-2 rounded-l-lg">#</th>
                    <th className="p-2">Job ID</th>
                    <th className="p-2">Brand / Model</th>
                    <th className="p-2">Serial</th>
                    <th className="p-2">ลูกค้า</th>
                    <th className="p-2 rounded-r-lg">วันที่สร้าง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#333]">
                  {oldRmaList.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="p-2 text-gray-400">{idx + 1}</td>
                      <td className="p-2 font-mono text-xs text-blue-600 dark:text-blue-400">{item.jobId}</td>
                      <td className="p-2">
                        <div className="font-medium dark:text-white">{item.brand}</div>
                        <div className="text-[11px] text-gray-400">{item.model}</div>
                      </td>
                      <td className="p-2 font-mono text-xs text-gray-600 dark:text-gray-400">{item.serial}</td>
                      <td className="p-2 text-gray-600 dark:text-gray-300">{item.customer}</td>
                      <td className="p-2 text-gray-400 text-xs">{item.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-gray-100 dark:border-[#333] flex items-center justify-between flex-shrink-0">
              <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg flex items-start gap-2 flex-1 mr-4">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-600 dark:text-red-400">การลบจะไม่สามารถกู้คืนได้ กรุณาตรวจสอบรายการให้แน่ใจก่อนดำเนินการ</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowOldRmaModal(false)}
                  className="px-5 py-2.5 bg-gray-200 dark:bg-[#3a3a3c] text-gray-600 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-300 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeletingOld}
                  className="px-5 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
                >
                  {isDeletingOld ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {isDeletingOld ? 'กำลังลบ...' : `ยืนยันลบ ${oldRmaList.length} รายการ`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
