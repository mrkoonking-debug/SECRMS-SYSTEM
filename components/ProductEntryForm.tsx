
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Minus, ScanBarcode, X, Box, Wifi, Zap, ShoppingBag, Layers, HardDrive, Check, Info, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';
import { ProductType, Team, Attachment } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { GlassSelect } from './GlassSelect';
import { ImageZoomModal } from './ImageZoomModal';
import { COMMON_ACCESSORIES } from '../constants/options';
import { MockDb } from '../services/mockDb';
import { HddBulkModal } from './HddBulkModal';
import { ScannerModal } from './ScannerModal';
import { showToast, showValidationError } from '../services/toast';
import { compressImage } from '../services/imageCompressor';

const DEFAULT_ACCESSORIES = COMMON_ACCESSORIES.filter(a => a !== 'acc_hdd');

const getInputClass = (hasError: boolean) => `
  w-full px-3.5 py-2 md:px-4 md:py-2.5 text-xs md:text-sm apple-card-inner rounded-[18px] md:rounded-[22px] outline-none transition-all
  bg-gray-50/70 dark:bg-white/[0.03] 
  border border-gray-200/90 dark:border-white/[0.08]
  text-[#1d1d1f] dark:text-white
  placeholder-gray-400 dark:placeholder-gray-500
  focus:bg-white dark:focus:bg-[#1c1c20]
  focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]
  ${hasError ? 'border-red-500 focus:ring-red-500 ring-2 ring-red-500/20' : ''}
`;

interface ProductEntryFormProps {
    mode: 'admin' | 'customer';
    onAddItem: (item: any) => void;
}

export const ProductEntryForm: React.FC<ProductEntryFormProps> = ({ mode, onAddItem }) => {
    const { t } = useLanguage();

    // Dynamic Options state
    const [brandOptions, setBrandOptions] = useState<any[]>([]);
    const [distOptions, setDistOptions] = useState<any[]>([]);

    // Main Item State
    const [currentItem, setCurrentItem] = useState({
        brand: '', model: '', serial: '', type: ProductType.CCTV_CAMERA,
        distributor: '', issue: '', accessories: [] as string[], team: '' as Team | '',
        deviceUsername: '', devicePassword: '',
    });

    // UI Helper State
    const [selectedMainTeam, setSelectedMainTeam] = useState<'A' | 'B' | 'C' | ''>('');
    const [customAccessory, setCustomAccessory] = useState('');
    const [activeZoomImage, setActiveZoomImage] = useState<string | null>(null);
    const [customDistributor, setCustomDistributor] = useState('');
    const [customBrand, setCustomBrand] = useState('');
    const [noSerial, setNoSerial] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    // Modals State
    const [showHddModal, setShowHddModal] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [scanTarget, setScanTarget] = useState<'model' | 'serial'>('serial');

    // Load dynamic data
    useEffect(() => {
        const loadData = async () => {
            const [brands, dists] = await Promise.all([MockDb.getBrands(), MockDb.getDistributors()]);
            setBrandOptions([...brands, { value: 'Other', label: 'อื่นๆ' }]);
            setDistOptions([...dists, { value: 'Other', label: 'อื่นๆ' }]);
        };
        loadData();
    }, []);

    // Auto-select Team logic
    useEffect(() => {
        if (mode === 'customer') return;
        const teamMap: Record<string, any> = { 'A': Team.HIKVISION, 'B': Team.DAHUA, '': '' };
        if (selectedMainTeam !== 'C') setCurrentItem(prev => ({ ...prev, team: teamMap[selectedMainTeam] || '' }));
        else setCurrentItem(prev => ({ ...prev, team: '' }));
    }, [selectedMainTeam, mode]);



    const validate = (): Record<string, string> => {
        const newErrors: Record<string, string> = {};
        const required = noSerial ? ['brand', 'model', 'issue'] : ['brand', 'model', 'serial', 'issue'];
        if (mode === 'admin') required.push('team', 'distributor');

        required.forEach(f => {
            let val = (currentItem as any)[f];
            if (f === 'distributor' && val === 'Other') val = customDistributor;
            if (f === 'brand' && val === 'Other') val = customBrand;
            if (!val || (typeof val === 'string' && !val.trim())) newErrors[f] = t('validation.required');
        });

        if (mode === 'admin' && selectedMainTeam === 'C' && !currentItem.team) newErrors.team = t('modals.selectSubUnit');
        if (currentItem.accessories.length === 0) newErrors.accessories = t('validation.accessoriesRequired');

        setErrors(newErrors);
        return newErrors;
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploadingImage(true);
        try {
            const newAttachments: Attachment[] = [...attachments];
            for (let i = 0; i < files.length; i++) {
                if (newAttachments.length >= 5) {
                    showToast('อัพโหลดรูปภาพได้สูงสุด 5 รูปต่อสินค้าหนึ่งชิ้น', 'error');
                    break;
                }
                const file = files[i];
                const compressed = await compressImage(file, 800, 800, 0.5);
                newAttachments.push({
                    id: 'img-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                    fileName: file.name,
                    fileType: file.type,
                    previewUrl: compressed
                });
            }
            setAttachments(newAttachments);
            showToast('อัพโหลดรูปภาพอุปกรณ์สำเร็จ', 'success');
        } catch (err) {
            console.error(err);
            showToast('ไม่สามารถอัพโหลดรูปภาพได้', 'error');
        } finally {
            setIsUploadingImage(false);
        }
    };

    const removeAttachment = (id: string) => {
        setAttachments(prev => prev.filter(att => att.id !== id));
    };

    const handleAddClick = () => {
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            // แจ้ง popup บอกว่าข้อมูลสินค้าไม่ครบ
            const fieldNames: Record<string, string> = {
                brand: 'ยี่ห้อ',
                model: 'รุ่นสินค้า',
                serial: 'Serial Number',
                issue: 'อาการเสีย',
                team: 'Team',
                distributor: 'ตัวแทนจำหน่าย',
                accessories: 'อุปกรณ์เสริม'
            };
            const missing = Object.keys(validationErrors)
                .map(k => fieldNames[k] || k);
            showValidationError(missing, 'ข้อมูลสินค้าไม่ครบ');
            return;
        }

        let finalAcc = [...currentItem.accessories];
        if (customAccessory.trim() && !finalAcc.includes(customAccessory.trim())) finalAcc.push(customAccessory.trim());

        const baseItem = {
            ...currentItem,
            brand: currentItem.brand === 'Other' ? customBrand.trim() : currentItem.brand,
            distributor: mode === 'customer' ? 'Customer' : (currentItem.distributor === 'Other' ? customDistributor.trim() : currentItem.distributor),
            accessories: finalAcc,
            team: mode === 'customer' ? Team.TEAM_C : currentItem.team,
            deviceUsername: currentItem.deviceUsername.trim(),
            devicePassword: currentItem.devicePassword.trim(),
            attachments: attachments,
        };

        if (noSerial && quantity > 1) {
            for (let i = 1; i <= quantity; i++) {
                onAddItem({ ...baseItem, serial: `N/A-${String(i).padStart(3, '0')}` });
            }
        } else if (noSerial) {
            onAddItem({ ...baseItem, serial: 'N/A' });
        } else {
            onAddItem(baseItem);
        }

        // Reset Form
        setCurrentItem({ brand: '', model: '', serial: '', type: ProductType.CCTV_CAMERA, distributor: '', issue: '', accessories: [], team: '', deviceUsername: '', devicePassword: '' });
        setAttachments([]);
        setSelectedMainTeam(''); setCustomDistributor(''); setCustomBrand(''); setCustomAccessory(''); setErrors({});
        setNoSerial(false); setQuantity(1);
    };

    const toggleAccessory = (acc: string) => {
        if (acc === 'acc_hdd') setShowHddModal(true);
        else setCurrentItem(prev => {
            const filtered = prev.accessories.filter(a => a !== 'unit_only');
            return prev.accessories.includes(acc) ? { ...prev, accessories: filtered.filter(a => a !== acc) } : { ...prev, accessories: [...filtered, acc] };
        });
        setErrors(p => ({ ...p, accessories: '' }));
    };

    const getExistingHdds = () => currentItem.accessories.filter(a => a.startsWith('acc_hdd::')).map(a => a.split('::')[1]);

    return (
        <div className="space-y-4 md:space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 md:gap-5">
                <div data-tour="tour-brand">
                    <GlassSelect label={t('submit.brand')} placeholder={t('submit.brandPlaceholder') || '-- เลือกยี่ห้อ --'} searchPlaceholder="ค้นหายี่ห้อ..." value={currentItem.brand} onChange={val => { setCurrentItem(p => ({ ...p, brand: val })); setErrors(p => ({ ...p, brand: '' })); }} options={brandOptions} searchable recentKey="brand" hasError={!!errors.brand} required />
                    {mode === 'customer' && <p className="text-[11px] text-blue-600/80 dark:text-blue-400/85 mt-1.5 ml-2 flex items-center gap-1">💡 เช่น Hikvision, Dahua, Uniview</p>}
                    {currentItem.brand === 'Other' && <input value={customBrand} onChange={e => setCustomBrand(e.target.value)} className={`mt-2 ${getInputClass(!!errors.customBrand)}`} placeholder={t('placeholders.specifyBrand')} />}
                </div>

                <div className="relative" data-tour="tour-model-serial">
                    <label className="block text-[10.5px] md:text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1">{t('submit.model')} <span className="text-red-500 font-bold">*</span></label>
                    <div className="relative">
                        <input value={currentItem.model} onChange={e => setCurrentItem({ ...currentItem, model: e.target.value.replace(/[^\x20-\x7E]/g, '').toUpperCase() })} className={`${getInputClass(!!errors.model)} pr-10 uppercase`} placeholder={t('submit.enterModel')} style={{ textTransform: 'uppercase' }} />
                        <button type="button" onClick={() => { setScanTarget('model'); setShowScanner(true); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"><ScanBarcode className="w-5 h-5" /></button>
                    </div>
                    {mode === 'customer' && <p className="text-[11px] text-blue-600/80 dark:text-blue-400/85 mt-1.5 ml-2 flex items-center gap-1">💡 ดูจากสติกเกอร์บนตัวเครื่อง หรือกด 📷 สแกน</p>}
                </div>

                <div className="relative">
                    {noSerial ? (
                        <>
                            <label className="block text-[10.5px] md:text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1">จำนวน (Quantity)</label>
                            <div className="flex items-center gap-4 px-3 py-1.5 bg-white dark:bg-[#16161a] border border-gray-200/80 dark:border-white/[0.08] apple-card-inner rounded-[18px]">
                                <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/10 transition-all active:scale-95 cursor-pointer">
                                    <Minus className="w-4 h-4 text-gray-500" />
                                </button>
                                <span className="text-2xl font-black text-[#1d1d1f] dark:text-white tabular-nums min-w-[2ch] text-center">{quantity}</span>
                                <button type="button" onClick={() => setQuantity(q => Math.min(20, q + 1))} className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-500/30 transition-all active:scale-95 cursor-pointer">
                                    <Plus className="w-4 h-4 text-[#0071e3] dark:text-blue-400" />
                                </button>
                                <span className="text-xs text-gray-400 ml-1 font-semibold">ชิ้น (สูงสุด 20)</span>
                            </div>
                            <p className="text-[11px] text-amber-500 mt-1.5 ml-2 font-medium flex items-center gap-1">{`⚡ ระบบจะสร้าง S/N อัตโนมัติ: N/A-001 ถึง N/A-${String(quantity).padStart(3, '0')}`}</p>
                        </>
                    ) : (
                        <>
                            <label className="block text-[10.5px] md:text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1">{t('submit.serial')} <span className="text-red-500 font-bold">*</span></label>
                            <div className="relative">
                                <input value={currentItem.serial} onChange={e => setCurrentItem({ ...currentItem, serial: e.target.value.replace(/[^\x20-\x7E]/g, '').toUpperCase() })} className={`${getInputClass(!!errors.serial)} pr-10 uppercase`} placeholder={t('submit.enterSn')} style={{ textTransform: 'uppercase' }} />
                                <button type="button" onClick={() => { setScanTarget('serial'); setShowScanner(true); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"><ScanBarcode className="w-5 h-5" /></button>
                            </div>
                            {mode === 'customer' && <p className="text-[11px] text-blue-600/80 dark:text-blue-400/85 mt-1.5 ml-2 flex items-center gap-1">💡 หมายเลข S/N อยู่บนสติกเกอร์ด้านหลังเครื่อง</p>}
                            {mode !== 'customer' && <p className="text-[11px] text-gray-400 mt-1.5 ml-2">{t('submit.serialHint')}</p>}
                        </>
                    )}
                    <button
                        type="button"
                        onClick={() => { setNoSerial(!noSerial); if (!noSerial) { setCurrentItem(p => ({ ...p, serial: '' })); setQuantity(1); } }}
                        className={`mt-2 flex items-center gap-2 px-3 py-1.5 rounded-[14px] text-xs font-semibold transition-all border apple-card-sm cursor-pointer ${noSerial
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : 'bg-black/[0.02] dark:bg-white/[0.03] text-gray-500 dark:text-gray-400 border-gray-200/80 dark:border-white/[0.08] hover:border-amber-400/50 hover:text-amber-500'
                        }`}
                    >
                        <div className={`w-4 h-4 rounded-[6px] border-2 flex items-center justify-center transition-all ${noSerial ? 'bg-amber-500 border-amber-500' : 'border-gray-300 dark:border-gray-600'}`}>
                            {noSerial && <Check className="w-3 h-3 text-white" />}
                        </div>
                        ไม่มี S/N (เช่น บัตร, อุปกรณ์เล็ก)
                    </button>
                </div>
            </div>

            {mode === 'admin' && (
                <TeamSelector selectedMain={selectedMainTeam} onSelectMain={setSelectedMainTeam} currentTeam={currentItem.team} onSelectSub={(t: any) => setCurrentItem(p => ({ ...p, team: t }))} t={t} error={errors.team} />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 md:gap-5">
                {mode === 'admin' && (
                    <div>
                        <GlassSelect label={t('submit.distributor')} searchPlaceholder="ค้นหาตัวแทนจำหน่าย..." value={currentItem.distributor} onChange={val => setCurrentItem(p => ({ ...p, distributor: val }))} options={distOptions} searchable recentKey="distributor" hasError={!!errors.distributor} required />
                        {currentItem.distributor === 'Other' && <input value={customDistributor} onChange={e => setCustomDistributor(e.target.value)} className={`mt-2 ${getInputClass(!!errors.customDistributor)}`} placeholder={t('placeholders.specifyDistributor')} />}
                    </div>
                )}

                <div className={mode === 'customer' ? 'col-span-2' : ''} data-tour="tour-accessories">
                    <label className="block text-[10.5px] md:text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1">{t('submit.accessories')} <span className="text-red-500 font-bold">*</span></label>
                    {mode === 'customer' && <p className="text-[11px] text-blue-600/80 dark:text-blue-400/85 mb-2 ml-2 flex items-center gap-1"><Info className="w-3 h-3 text-blue-500 flex-shrink-0" /> เลือกสิ่งที่ส่งมาพร้อมเครื่อง (ไม่จำเป็นต้องเลือก ข้ามได้)</p>}
                    <div className="flex flex-wrap gap-2 mb-2.5">
                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); setCurrentItem(prev => ({ ...prev, accessories: prev.accessories.includes('unit_only') ? prev.accessories.filter(a => a !== 'unit_only') : ['unit_only'] })); setErrors(p => ({ ...p, accessories: '' })); }}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all flex items-center gap-1.5 outline-none cursor-pointer apple-card-sm ${currentItem.accessories.includes('unit_only') ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-black/[0.02] dark:bg-white/[0.03] border-gray-200/80 dark:border-white/[0.08] text-[#1d1d1f] dark:text-gray-300 hover:border-amber-500/50 hover:text-amber-500'}`}
                        >
                            {t('accessories_list.unit_only')}
                        </button>
                        {COMMON_ACCESSORIES.map(acc => {
                            const hddCount = acc === 'acc_hdd' ? currentItem.accessories.filter(a => a.startsWith('acc_hdd::')).length : 0;
                            const isActive = currentItem.accessories.includes(acc) || hddCount > 0;
                            return (
                                <button
                                    type="button"
                                    key={acc}
                                    onClick={(e) => { e.preventDefault(); toggleAccessory(acc); }}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all flex items-center gap-1.5 outline-none cursor-pointer apple-card-sm ${isActive ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-md' : 'bg-black/[0.02] dark:bg-white/[0.03] border-gray-200/80 dark:border-white/[0.08] text-[#1d1d1f] dark:text-gray-300 hover:border-blue-500/50 hover:text-blue-500'}`}
                                >
                                    {t(`accessories_list.${acc}`)}
                                    {acc === 'acc_hdd' && <span className={`flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[9px] font-bold ${hddCount > 0 ? 'bg-white text-[#0071e3]' : 'bg-black/10 dark:bg-white/10 text-gray-400'}`}>{hddCount > 0 ? hddCount : <Plus className="w-2.5 h-2.5" />}</span>}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex gap-2 mb-3">
                        <input type="text" value={customAccessory} onChange={e => setCustomAccessory(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), setCustomAccessory(''), toggleAccessory(customAccessory))} placeholder={t('publicSubmit.otherAccPlaceholder')} className={`flex-1 ${getInputClass(false)} !py-2`} />
                        <button type="button" onClick={() => { if (customAccessory) { toggleAccessory(customAccessory); setCustomAccessory(''); } }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-[#1d1d1f] dark:text-white rounded-[14px] transition-all cursor-pointer"><Plus className="w-4 h-4" /></button>
                    </div>
                    {currentItem.accessories.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-3 bg-black/[0.02] dark:bg-black/40 rounded-[18px] border border-black/5 dark:border-white/10 apple-card-inner">
                            {currentItem.accessories.map((acc, idx) => (
                                <span key={`${acc}-${idx}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#1a1a1e] text-xs font-semibold rounded-[12px] shadow-sm border border-gray-200/80 dark:border-white/10 text-[#1d1d1f] dark:text-white apple-card-sm">
                                    {acc.startsWith('acc_hdd::') ? `HDD (${acc.split('::')[1]})` : (acc.startsWith('acc_') || acc === 'unit_only' ? t(`accessories_list.${acc}`) : acc)}
                                    <button type="button" onClick={() => setCurrentItem(p => ({ ...p, accessories: p.accessories.filter(a => a !== acc) }))} className="text-gray-400 hover:text-red-500 ml-1 cursor-pointer"><X className="w-3 h-3" /></button>
                                </span>
                            ))}
                        </div>
                    )}
                    {errors.accessories && <p className="text-red-500 text-xs mt-2 font-medium ml-2">{errors.accessories}</p>}
                </div>
            </div>

            <div data-tour="tour-issue">
                <label className="block text-[10.5px] md:text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1">{t('submit.issueDesc')} <span className="text-red-500 font-bold">*</span></label>
                <textarea value={currentItem.issue} onChange={e => setCurrentItem({ ...currentItem, issue: e.target.value })} rows={3} className={getInputClass(!!errors.issue)} placeholder={mode === 'customer' ? t('placeholders.issueCustomer') : t('placeholders.issueAdmin')} />
                {mode === 'customer'
                    ? <p className="text-[11px] text-blue-600/80 dark:text-blue-400/85 mt-1.5 ml-2 flex items-center gap-1"><Info className="w-3 h-3 text-blue-500 flex-shrink-0" /> เช่น &quot;ภาพมืด&quot;, &quot;เชื่อมต่อไม่ได้&quot;, &quot;มีเสียงดัง&quot;</p>
                    : <p className="text-[11px] text-gray-400 mt-1.5 ml-2">{t('submit.issueHint')}</p>
                }
            </div>

            {/* Device Username / Password (Optional) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10.5px] md:text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1">{t('submit.deviceUsername')}</label>
                    <input value={currentItem.deviceUsername} onChange={e => setCurrentItem({ ...currentItem, deviceUsername: e.target.value })} className={getInputClass(false)} placeholder={t('placeholders.username')} />
                    {mode === 'customer'
                        ? <p className="text-[11px] text-blue-600/80 dark:text-blue-400/85 mt-1.5 ml-2 flex items-center gap-1"><Info className="w-3 h-3 text-blue-500 flex-shrink-0" /> ถ้ามีรหัสเข้าเครื่อง กรุณาแจ้งด้วย ช่วยให้ซ่อมเร็วขึ้น</p>
                        : <p className="text-[11px] text-gray-400 mt-1.5 ml-2">{t('submit.usernameHint')}</p>
                    }
                </div>
                <div>
                    <label className="block text-[10.5px] md:text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1">{t('submit.devicePassword')}</label>
                    <input value={currentItem.devicePassword} onChange={e => setCurrentItem({ ...currentItem, devicePassword: e.target.value })} className={getInputClass(false)} placeholder={t('placeholders.password')} />
                    {mode !== 'customer' && <p className="text-[11px] text-gray-400 mt-1.5 ml-2">{t('submit.passwordHint')}</p>}
                </div>
            </div>

            {/* แนบรูปภาพอุปกรณ์ */}
            <div>
                <label className="block text-[10.5px] md:text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5" /> แนบรูปภาพตัวเครื่อง / อาการเสีย (Optional)
                </label>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {attachments.map((att) => (
                        <div key={att.id} className="relative aspect-square w-full rounded-[20px] overflow-hidden border border-gray-200/80 dark:border-white/10 group bg-black/[0.02] dark:bg-white/[0.03] flex items-center justify-center cursor-pointer apple-card-sm">
                            <img 
                                src={att.previewUrl} 
                                alt="Product Attachment Preview" 
                                className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                                onClick={() => setActiveZoomImage(att.previewUrl || null)}
                                title="คลิกเพื่อดูรูปและซูมขยาย"
                            />
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeAttachment(att.id);
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-[10px] opacity-0 group-hover:opacity-100 transition-opacity active:scale-95 shadow z-10 cursor-pointer"
                                title="ลบรูปภาพ"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                    
                    {attachments.length < 5 && (
                        <div className="relative aspect-square w-full border-2 border-dashed border-gray-300/80 dark:border-white/15 hover:border-blue-500 dark:hover:border-blue-400 transition-colors rounded-[20px] bg-black/[0.01] dark:bg-white/[0.02] flex flex-col items-center justify-center cursor-pointer p-2 apple-card-sm">
                            {isUploadingImage ? (
                                <div className="flex flex-col items-center gap-1 text-[10px] text-gray-400 text-center">
                                    <Loader2 className="w-5 h-5 text-[#0071e3] animate-spin" />
                                    <span>กำลังบีบอัด...</span>
                                </div>
                            ) : (
                                <>
                                    <Plus className="w-6 h-6 text-gray-400 mb-1" />
                                    <span className="text-[10px] text-gray-400 font-semibold text-center">แนบรูปภาพ (สูงสุด 5 รูป)</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageChange}
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    />
                                </>
                            )}
                        </div>
                    )}
                </div>
                <p className="text-[10.5px] text-gray-400 mt-2 ml-1">
                    *ระบบจะบีบอัดรูปภาพอุปกรณ์ให้อัตโนมัติ เพื่อไม่ให้เปลืองปริมาณการส่งข้อมูลมือถือ
                </p>
            </div>

            <button data-tour="tour-add-button" onClick={handleAddClick} className="w-full py-4 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-[18px] md:rounded-[22px] text-sm md:text-base font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.01] active:scale-[0.98] outline-none cursor-pointer">
                <Plus className="w-5 h-5" /> {noSerial && quantity > 1 ? `เพิ่ม ${quantity} รายการ` : t(mode === 'customer' ? 'publicSubmit.addAnother' : 'submit.addToJob')}
            </button>

            {showScanner && <ScannerModal onClose={() => setShowScanner(false)} onScan={(val) => { setCurrentItem(p => ({ ...p, [scanTarget]: val })); setShowScanner(false); }} />}

            {showHddModal && (
                <HddBulkModal
                    initialSerials={getExistingHdds()}
                    onClose={() => setShowHddModal(false)}
                    onConfirm={(serials) => {
                        const nonHdd = currentItem.accessories.filter(a => !a.startsWith('acc_hdd::'));
                        const newHdd = serials.map(s => `acc_hdd::${s}`);
                        setCurrentItem(p => ({ ...p, accessories: [...nonHdd, ...newHdd] }));
                        setShowHddModal(false);
                    }}
                />
            )}

            {/* Image Zoom Modal */}
            <ImageZoomModal
                imageUrl={activeZoomImage}
                onClose={() => setActiveZoomImage(null)}
                title="รูปภาพอุปกรณ์แนบ"
            />
        </div>
    );
};

// --- Sub Components ---

const TeamSelector = ({ selectedMain, onSelectMain, currentTeam, onSelectSub, t, error }: any) => {
    return (
        <div className="bg-black/[0.02] dark:bg-black/40 rounded-[22px] md:rounded-[26px] p-4 sm:p-5 md:p-6 border border-gray-200/70 dark:border-white/[0.08] apple-card-inner">
            <label className="block text-[10.5px] md:text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-3 ml-1">
                {t('submit.assignTeam')} <span className="text-red-500 font-bold">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 mb-4">
                {[
                    { id: 'A', label: 'HIKVISION', sub: 'Team A', icon: Box, color: 'red', val: Team.HIKVISION },
                    { id: 'B', label: 'DAHUA', sub: 'Team B', icon: Layers, color: 'orange', val: Team.DAHUA },
                    { id: 'C', label: 'Network', sub: 'C / E / G', icon: Wifi, color: 'blue', val: null }
                ].map((item) => {
                    const isSelected = selectedMain === item.id;
                    return (
                        <button
                            type="button"
                            key={item.id}
                            onClick={() => onSelectMain(item.id)}
                            className={`relative p-3 sm:p-4 rounded-[18px] md:rounded-[20px] border text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer outline-none apple-card-sm ${
                                isSelected 
                                    ? (item.color === 'red' 
                                        ? 'bg-red-500/10 dark:bg-red-500/15 border-red-500 ring-2 ring-red-500/30 shadow-md shadow-red-500/20' 
                                        : item.color === 'orange' 
                                            ? 'bg-orange-500/10 dark:bg-orange-500/15 border-orange-500 ring-2 ring-orange-500/30 shadow-md shadow-orange-500/20' 
                                            : 'bg-blue-500/10 dark:bg-blue-500/15 border-blue-500 ring-2 ring-blue-500/30 shadow-md shadow-blue-500/20')
                                    : 'bg-white dark:bg-[#16161a] border-gray-200/80 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/20 hover:scale-[1.01]'
                            }`}
                        >
                            <div className={`p-2 rounded-[12px] ${
                                isSelected 
                                    ? (item.color === 'red' ? 'bg-red-500 text-white shadow-md' : item.color === 'orange' ? 'bg-orange-500 text-white shadow-md' : 'bg-blue-500 text-white shadow-md') 
                                    : (item.color === 'red' ? 'bg-red-500/10 text-red-500' : item.color === 'orange' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500')
                            }`}>
                                <item.icon className="w-4 h-4 md:w-5 md:h-5" />
                            </div>
                            <div>
                                <div className="font-extrabold text-xs sm:text-sm text-[#1d1d1f] dark:text-white leading-tight">{item.label}</div>
                                <div className="text-[9.5px] sm:text-[10px] text-gray-400 font-medium mt-0.5">{item.sub}</div>
                            </div>
                        </button>
                    );
                })}
            </div>
            {selectedMain === 'C' && (
                <div className="animate-fade-in pl-3 sm:pl-4 border-l-2 border-[#0071e3]/40 ml-1.5 my-2">
                    <div className="text-[10.5px] md:text-xs font-black text-[#0071e3] dark:text-blue-400 uppercase tracking-wider mb-2.5">{t('modals.selectSubUnit')}</div>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        {[
                            { val: Team.TEAM_C, label: 'Team C (Net)', icon: Wifi, color: 'cyan' },
                            { val: Team.TEAM_E, label: 'Team E (UPS)', icon: Zap, color: 'amber' },
                            { val: Team.TEAM_G, label: 'Team G (Online)', icon: ShoppingBag, color: 'fuchsia' }
                        ].map(sub => {
                            const isSubActive = currentTeam === sub.val;
                            return (
                                <button
                                    type="button"
                                    key={sub.val}
                                    onClick={() => onSelectSub(sub.val)}
                                    className={`p-2.5 sm:p-3 rounded-[16px] border text-center transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer outline-none apple-card-sm ${
                                        isSubActive 
                                            ? 'bg-blue-500/10 dark:bg-blue-500/15 border-[#0071e3] ring-1 ring-[#0071e3] shadow-sm text-[#0071e3] dark:text-blue-400 font-bold' 
                                            : 'bg-white dark:bg-[#16161a] border-gray-200/80 dark:border-white/[0.08] hover:bg-gray-50 dark:hover:bg-white/[0.05] text-gray-600 dark:text-gray-400'
                                    }`}
                                >
                                    <sub.icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isSubActive ? 'text-[#0071e3] dark:text-blue-400' : 'text-gray-400'}`} />
                                    <span className="text-[10px] sm:text-xs font-semibold">{sub.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
            {error && <p className="text-red-500 text-xs mt-2 font-medium ml-1">{error}</p>}
        </div>
    );
};
