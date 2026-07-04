
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MockDb } from '../services/mockDb';
import { Settings, Save, Check, Loader2, Globe, Building, Zap, Trash2, AlertTriangle, Archive, X, Search, Wrench, Download, Upload, Mail, Send, Copy } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { showToast } from '../services/toast';
import { RMAStatus } from '../types';

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

  const [isSendingSummary, setIsSendingSummary] = useState(false);
  const [summaryList, setSummaryList] = useState<any[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const handleSendOverdueSummary = async () => {
    setIsSendingSummary(true);
    try {
      const allRmas = await MockDb.getRMAs();
      const activeRmas = allRmas.filter(rma => 
        !rma.isDeleted && 
        ![RMAStatus.CLOSED, RMAStatus.REPAIRED, RMAStatus.CANCELLED].includes(rma.status)
      );

      if (activeRmas.length === 0) {
        showToast('ไม่พบงานค้างที่ต้องแจ้งเตือนในระบบในขณะนี้ ✨', 'success');
        return;
      }

      // Group active RMAs by creator
      const groups: Record<string, { name: string; email: string; items: any[] }> = {};
      
      activeRmas.forEach(rma => {
        const creatorName = rma.createdBy || 'Unknown';
        const creatorEmail = rma.creatorEmail || '';
        const groupKey = creatorEmail ? creatorEmail.toLowerCase() : creatorName.toLowerCase();
        
        if (!groups[groupKey]) {
          groups[groupKey] = {
            name: creatorName,
            email: creatorEmail,
            items: []
          };
        }
        groups[groupKey].items.push(rma);
      });

      const list = Object.values(groups);
      setSummaryList(list);
      setShowSummaryModal(true);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการรวบรวมข้อมูล', 'error');
    } finally {
      setIsSendingSummary(false);
    }
  };

  const getLineMessage = (group: any) => {
    const dateStr = new Date().toLocaleDateString('th-TH');
    let msg = `📋 สรุปรายการงานเคลมค้างดำเนินการ\n👤 ผู้รับผิดชอบ: ${group.name}\n📅 วันที่: ${dateStr}\n\n`;
    group.items.forEach((item: any, idx: number) => {
      msg += `${idx + 1}. รหัส: ${item.id}\n   รุ่น: ${item.brand} ${item.productModel}\n   S/N: ${item.serialNumber}\n   สถานะ: ${item.status}\n\n`;
    });
    msg += `จัดการงานเคลมคลิกที่นี่: ${window.location.origin}/admin/rmas`;
    return msg;
  };

  const getMailtoUrl = (group: any) => {
    const email = group.email || '';
    const subject = encodeURIComponent(`[SEC RMS] สรุปรายการงานเคลมค้างดำเนินการของคุณ ${group.name} (${group.items.length} รายการ)`);
    const body = encodeURIComponent(getLineMessage(group));
    return `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const handleCopyToClipboard = (text: string, name: string) => {
    navigator.clipboard.writeText(text);
    showToast(`คัดลอกสรุปงานของ ${name} เรียบร้อย! 📋`, 'success');
  };

  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isBackingUpJson, setIsBackingUpJson] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const downloadFile = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = async () => {
    setIsExportingCsv(true);
    try {
      const rmas = await MockDb.getRMAs();
      const headers = ['RMA ID', 'Job ID', 'Quotation Ref', 'Brand', 'Model', 'Serial Number', 'Status', 'Customer Name', 'Phone', 'Created At', 'Updated At'];
      const rows = rmas.map(r => [
        r.id,
        r.groupRequestId || '',
        r.quotationNumber || '',
        r.brand,
        r.productModel,
        r.serialNumber,
        r.status,
        r.customerName,
        r.customerPhone || '',
        r.createdAt,
        r.updatedAt
      ]);
      
      const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
      
      downloadFile(csvContent, `sec-rmas-export-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
      showToast('ดาวน์โหลด CSV สำเร็จ 📊', 'success');
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการส่งออก CSV', 'error');
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleBackupJSON = async () => {
    setIsBackingUpJson(true);
    try {
      const rmas = await MockDb.getRMAs();
      const brands = await MockDb.getBrands();
      const distributors = await MockDb.getDistributors();
      const settingsData = await MockDb.getSettings();
      
      const backupData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        rmas,
        brands,
        distributors,
        settings: settingsData
      };
      
      const jsonContent = JSON.stringify(backupData, null, 2);
      downloadFile(jsonContent, `sec-db-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
      showToast('สำรองข้อมูลฐานข้อมูลสำเร็จ 🔐', 'success');
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการสำรองข้อมูล', 'error');
    } finally {
      setIsBackingUpJson(false);
    }
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!confirm('⚠️ คำเตือน: การกู้คืนข้อมูลจะเขียนทับข้อมูลเดิมในระบบทั้งหมด ต้องการดำเนินการต่อหรือไม่?')) {
      e.target.value = '';
      return;
    }

    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target?.result as string);
        if (!backup.rmas || !Array.isArray(backup.rmas)) {
          throw new Error('รูปแบบไฟล์สำรองข้อมูลไม่ถูกต้อง');
        }

        await MockDb.restoreDatabaseBackup(backup);
        showToast('กู้คืนข้อมูลสำเร็จเรียบร้อย! 🎉', 'success');
      } catch (err: any) {
        showToast(err.message || 'เกิดข้อผิดพลาดในการกู้คืนข้อมูล', 'error');
      } finally {
        setIsRestoring(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
      <div className="mb-6 md:mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1d1d1f] dark:text-white mb-2">{t('nav.settings')}</h1>
        <p className="text-sm text-gray-500">ตั้งค่าข้อมูลบริษัทสำหรับใช้แสดงผลในเอกสารใบเคลมและใบรับคืน</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 md:space-y-6">
        <div className="glass-panel p-4 sm:p-6 md:p-8 rounded-xl md:rounded-[2rem] space-y-4 md:space-y-6">
          <h3 className="text-base md:text-lg font-bold flex items-center gap-2"><Building className="w-5 h-5 text-blue-500" /> ข้อมูลบริษัท</h3>

          <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-start mb-6 border-b border-gray-100 dark:border-white/10 pb-4 md:pb-6">
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
            <div className="flex-1 pt-2 md:pt-4">
              <h4 className="font-bold text-sm text-[#1d1d1f] dark:text-white mb-1">Logo Configuration</h4>
              <p className="text-xs text-gray-500 leading-relaxed">This logo will appear on all printed documents including Distributor RMA Requests and Customer Return Notes. Please use a transparent PNG for best results.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Company Name (TH)</label>
              <input value={settings.nameTh} onChange={e => setSettings({ ...settings, nameTh: e.target.value })} className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Company Name (EN)</label>
              <input value={settings.nameEn} onChange={e => setSettings({ ...settings, nameEn: e.target.value })} className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-2.5 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Address</label>
            <textarea value={settings.address} onChange={e => setSettings({ ...settings, address: e.target.value })} className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-2.5 text-sm" rows={3} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Tax ID</label>
              <input value={settings.taxId} onChange={e => setSettings({ ...settings, taxId: e.target.value })} className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Tel</label>
              <input value={settings.tel} onChange={e => setSettings({ ...settings, tel: e.target.value })} className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Website</label>
              <input value={settings.website} onChange={e => setSettings({ ...settings, website: e.target.value })} className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-2.5 text-sm" />
            </div>
          </div>
        </div>

        <div className="glass-panel p-4 sm:p-6 md:p-8 rounded-xl md:rounded-[2rem] space-y-4 md:space-y-6 mt-6">
          <h3 className="text-base md:text-lg font-bold flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-500" /> การแสดงผลและประสิทธิภาพ (Performance)</h3>

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

        {/* Email Notifications Section */}
        <div className="glass-panel p-4 sm:p-6 md:p-8 rounded-xl md:rounded-[2rem] space-y-4 md:space-y-6 mt-6">
          <h3 className="text-base md:text-lg font-bold flex items-center gap-2"><Mail className="w-5 h-5 text-blue-500" /> ระบบแจ้งเตือนทางอีเมล (Email Notifications)</h3>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl flex-wrap gap-4">
            <div className="flex-1">
              <h4 className="font-bold text-sm text-[#1d1d1f] dark:text-white mb-1">ระบบแจ้งเตือนอีเมลอัตโนมัติ (Overdue Alerts)</h4>
              <p className="text-xs text-gray-500">แจ้งเตือนทางอีเมลไปยังผู้สร้างงานโดยอัตโนมัติ เมื่อใบงานค้างอยู่ในระบบเกิน 15 วันและยังดำเนินการไม่เสร็จสิ้น</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, enableOverdueEmailAlerts: !settings.enableOverdueEmailAlerts })}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.enableOverdueEmailAlerts ? 'bg-green-500' : 'bg-gray-200 dark:bg-[#424245]'}`}
              role="switch"
              aria-checked={settings.enableOverdueEmailAlerts}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.enableOverdueEmailAlerts ? 'translate-x-5' : 'translate-x-0'}`}></span>
            </button>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex-1">
                <h4 className="font-bold text-sm text-[#1d1d1f] dark:text-white mb-1 flex items-center gap-2">
                  <Send className="w-4 h-4 text-blue-500" /> ส่งอีเมลสรุปงานค้างถึงทุกคนตอนนี้ (Send Summary Now)
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  ส่งอีเมลรวบรวมรายการใบงานค้างดำเนินการทั้งหมดแยกตามผู้รับผิดชอบ ไปยังอีเมลของพนักงานและเจ้าหน้าที่ทุกคนที่มีงานค้างในระบบทันที
                </p>
              </div>
              <button
                type="button"
                onClick={handleSendOverdueSummary}
                disabled={isSendingSummary}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all active:scale-95 shadow-sm"
              >
                {isSendingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {isSendingSummary ? 'กำลังส่ง...' : 'ส่งสรุปอีเมล'}
              </button>
            </div>
          </div>
        </div>

        {/* Data Management Section */}
        <div className="glass-panel p-4 sm:p-6 md:p-8 rounded-xl md:rounded-[2rem] space-y-4 md:space-y-6 mt-6">
          <h3 className="text-base md:text-lg font-bold flex items-center gap-2"><Archive className="w-5 h-5 text-orange-500" /> การจัดการข้อมูล (Data Management)</h3>

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

          {/* Export & Backup Section */}
          <div className="p-4 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl mt-4">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex-1">
                <h4 className="font-bold text-sm text-[#1d1d1f] dark:text-white mb-1 flex items-center gap-2">
                  <Download className="w-4 h-4 text-green-500" /> สำรองและส่งออกข้อมูล (Backup & Export)
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  ดาวน์โหลดข้อมูลทั้งหมดในระบบเป็นไฟล์สำรอง (JSON) หรือไฟล์สำหรับเปิดใน Excel (CSV)
                </p>
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={isExportingCsv}
                  className="px-4 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                >
                  {isExportingCsv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  ส่งออก Excel (CSV)
                </button>
                <button
                  type="button"
                  onClick={handleBackupJSON}
                  disabled={isBackingUpJson}
                  className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                >
                  {isBackingUpJson ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                  สำรองข้อมูล (JSON)
                </button>
              </div>
            </div>
          </div>

          {/* Restore Backup Section */}
          <div className="p-4 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl mt-4">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex-1">
                <h4 className="font-bold text-sm text-[#1d1d1f] dark:text-white mb-1 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-purple-500" /> กู้คืนข้อมูล (Restore Database)
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  นำเข้าไฟล์สำรอง (JSON) ที่ดาวน์โหลดไว้เพื่อเขียนทับข้อมูลในระบบทั้งหมด (RMA, แบรนด์, ตัวแทนจำหน่าย)
                </p>
              </div>
              <div className="relative">
                <button
                  type="button"
                  disabled={isRestoring}
                  className="px-4 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer"
                >
                  {isRestoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  เลือกไฟล์กู้คืน (JSON)
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestoreBackup}
                    disabled={isRestoring}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </button>
              </div>
            </div>
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-700 dark:text-red-400">คำเตือน: การกู้คืนข้อมูลจะเขียนทับข้อมูลเก่าทั้งหมดทันทีและไม่สามารถย้อนกลับได้</p>
            </div>
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
      {/* ===== Summary Email Preview & Action Center Modal ===== */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-2xl rounded-2xl md:rounded-[24px] shadow-2xl border border-gray-100 dark:border-[#2c2c2e] max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 md:p-6 border-b border-gray-100 dark:border-[#2c2c2e] flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-bold text-lg md:text-xl text-[#1d1d1f] dark:text-white flex items-center gap-2">
                  <Send className="w-5 h-5 text-blue-500" />
                  รายการสรุปงานค้างแยกตามพนักงาน
                </h3>
                <p className="text-xs text-gray-500 mt-1">คัดลอกข้อความเพื่อส่งทาง LINE หรือส่งตรงไปยังอีเมลของแต่ละคนได้ฟรีแบบไม่มีค่าใช้จ่าย</p>
              </div>
              <button onClick={() => setShowSummaryModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="flex-grow overflow-y-auto p-5 md:p-6 space-y-4">
              {summaryList.map((group, idx) => {
                const lineMessage = getLineMessage(group);
                return (
                  <div key={idx} className="p-4 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#3a3a3c] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#1d1d1f] dark:text-white text-base">{group.name}</span>
                        {group.email && <span className="text-xs text-gray-400">({group.email})</span>}
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-semibold flex items-center gap-1">
                        📦 มีงานค้างดำเนินการ {group.items.length} รายการ
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => handleCopyToClipboard(lineMessage, group.name)}
                        className="flex-1 sm:flex-initial px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        คัดลอกส่ง LINE
                      </button>
                      <a
                        href={getMailtoUrl(group)}
                        className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm text-center"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        ส่งอีเมล
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-gray-100 dark:border-[#2c2c2e] flex items-center justify-end flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="px-5 py-2.5 bg-gray-200 dark:bg-[#3a3a3c] text-gray-600 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-300 transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
