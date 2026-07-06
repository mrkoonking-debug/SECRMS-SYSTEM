import React, { useState, useEffect, useCallback } from 'react';
import { renderHtmlToBlob } from '../services/renderToImage';
import { X, Package, Trash2, Expand, RefreshCw, Copy, Mail, Plus, Save, Truck } from 'lucide-react';
import { RMA, Distributor } from '../types';
import { ShippingLabelPayload, getCustomerShippingLabelHTML } from '../services/printService';
import { MockDb } from '../services/mockDb';
import { useLanguage } from '../contexts/LanguageContext';
import { showToast } from '../services/toast';

interface TabState {
    receiverName: string;
    contactPerson: string;
    receiverPhone: string;
    receiverAddress: string;
    trackingIds: string[];
}

interface ShipmentTagModalProps {
    isOpen: boolean;
    onClose: () => void;
    rma: RMA;
    allRmas?: RMA[];
    onSave: (customerData: any, rmaIds?: string[]) => Promise<void>;
    targetType: 'CUSTOMER' | 'DISTRIBUTOR';
    distributorGroups?: Record<string, RMA[]>;
}

export const ShipmentTagModal: React.FC<ShipmentTagModalProps> = ({
    isOpen,
    onClose,
    rma,
    allRmas,
    onSave,
    targetType,
    distributorGroups
}) => {
    const { t } = useLanguage();

    // Receiver Info State
    const [receiverName, setReceiverName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [receiverPhone, setReceiverPhone] = useState('');
    const [receiverAddress, setReceiverAddress] = useState('');

    // Tracking IDs State
    const [trackingIds, setTrackingIds] = useState<string[]>(['']); // Start with 1 empty box

    const [isSaving, setIsSaving] = useState(false);
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);

    // Tabbed multi-distributor state
    const [activeTab, setActiveTab] = useState('');
    const [tabData, setTabData] = useState<Record<string, TabState>>({});
    const isTabbed = !!distributorGroups && Object.keys(distributorGroups).length > 1;
    const tabNames = isTabbed ? Object.keys(distributorGroups!) : [];

    // Get current RMAs for the active tab (or all RMAs in single mode)
    const currentRmas = isTabbed && distributorGroups
        ? (distributorGroups[activeTab] || [])
        : (allRmas && allRmas.length > 0 ? allRmas : [rma]);
    const currentRma = (isTabbed && distributorGroups ? distributorGroups[activeTab]?.[0] : null) || rma;

    // --- TABBED MODE: derive form values directly from tabData[activeTab] ---
    // This eliminates the dual-state desync that caused fields not to update on tab switch.
    const activeTabData = isTabbed ? tabData[activeTab] : null;

    // Effective values: in tabbed mode read from tabData, otherwise from individual state
    const effectiveReceiverName = isTabbed ? (activeTabData?.receiverName ?? '') : receiverName;
    const effectiveContactPerson = isTabbed ? (activeTabData?.contactPerson ?? '') : contactPerson;
    const effectiveReceiverPhone = isTabbed ? (activeTabData?.receiverPhone ?? '') : receiverPhone;
    const effectiveReceiverAddress = isTabbed ? (activeTabData?.receiverAddress ?? '') : receiverAddress;
    const effectiveTrackingIds = isTabbed ? (activeTabData?.trackingIds ?? ['']) : trackingIds;

    // Tabbed mode field updater: writes directly to tabData[activeTab]
    const updateTabField = useCallback((field: keyof TabState, value: any) => {
        setTabData(prev => ({
            ...prev,
            [activeTab]: { ...prev[activeTab], [field]: value }
        }));
    }, [activeTab]);

    // Switch tab: just change activeTab — data is already in tabData
    const handleTabChange = useCallback((newTab: string) => {
        setActiveTab(newTab);
        setPreviewHtml(null);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setPreviewHtml(null);
            if (isTabbed && distributorGroups) {
                // Tabbed mode: initialize all tabs
                const tabs = Object.keys(distributorGroups);
                setActiveTab(tabs[0]);
                MockDb.getDistributors().then((distributors: Distributor[]) => {
                    const initial: Record<string, TabState> = {};
                    for (const distName of tabs) {
                        const firstRma = distributorGroups[distName][0];
                        const sc = (firstRma as any).distributorContactPerson || '';
                        const sp = (firstRma as any).distributorPhone || '';
                        const sa = (firstRma as any).distributorAddress || '';
                        const match = distributors.find(d => d.value === distName);
                        initial[distName] = {
                            receiverName: match?.label || distName,
                            contactPerson: match?.contactPerson || sc,
                            receiverPhone: match?.phone || sp,
                            receiverAddress: match?.address || sa,
                            trackingIds: firstRma.trackingIds?.length ? firstRma.trackingIds : ['']
                        };
                    }
                    setTabData(initial);
                    // Load first tab into form
                    const first = initial[tabs[0]];
                    setReceiverName(first.receiverName);
                    setContactPerson(first.contactPerson);
                    setReceiverPhone(first.receiverPhone);
                    setReceiverAddress(first.receiverAddress);
                    setTrackingIds(first.trackingIds);
                }).catch(() => {
                    const initial: Record<string, TabState> = {};
                    for (const distName of tabs) {
                        const firstRma = distributorGroups[distName][0];
                        initial[distName] = {
                            receiverName: distName,
                            contactPerson: (firstRma as any).distributorContactPerson || '',
                            receiverPhone: (firstRma as any).distributorPhone || '',
                            receiverAddress: (firstRma as any).distributorAddress || '',
                            trackingIds: firstRma.trackingIds?.length ? firstRma.trackingIds : ['']
                        };
                    }
                    setTabData(initial);
                    const first = initial[tabs[0]];
                    setReceiverName(first.receiverName);
                    setContactPerson(first.contactPerson);
                    setReceiverPhone(first.receiverPhone);
                    setReceiverAddress(first.receiverAddress);
                    setTrackingIds(first.trackingIds);
                });
            } else if (targetType === 'DISTRIBUTOR') {
                // Single distributor mode (original logic)
                const savedContact = (rma as any).distributorContactPerson || '';
                const savedPhone = (rma as any).distributorPhone || '';
                const savedAddress = (rma as any).distributorAddress || '';
                setContactPerson(savedContact);
                setReceiverPhone(savedPhone);
                setReceiverAddress(savedAddress);
                if (rma.distributor) {
                    setReceiverName(rma.distributor);
                    MockDb.getDistributors().then((distributors: Distributor[]) => {
                        const match = distributors.find(d => d.value === rma.distributor);
                        if (match) {
                            setReceiverName(match.label || rma.distributor || '');
                            if (match.contactPerson && !savedContact) setContactPerson(match.contactPerson);
                            if (match.phone && !savedPhone) setReceiverPhone(match.phone);
                            if (match.address && !savedAddress) setReceiverAddress(match.address);
                        }
                    }).catch(() => {});
                } else {
                    setReceiverName('');
                }
                setTrackingIds(rma.trackingIds?.length ? rma.trackingIds : ['']);
            } else {
                setReceiverName(rma.customerName || '');
                setContactPerson(rma.contactPerson || '');
                setReceiverPhone(rma.customerPhone || '');
                setReceiverAddress(rma.customerReturnAddress || '');
                setTrackingIds(rma.customerTrackingIds?.length ? rma.customerTrackingIds : ['']);
            }
        }
    }, [isOpen, rma, targetType]);

    if (!isOpen) return null;

    const displayId = rma.quotationNumber || rma.id;

    const handleAddTrackingId = () => {
        setTrackingIds([...trackingIds, '']);
    };

    const handleRemoveTrackingId = (index: number) => {
        const newIds = [...trackingIds];
        newIds.splice(index, 1);
        if (newIds.length === 0) {
            newIds.push(''); // Always keep at least 1 input
        }
        setTrackingIds(newIds);
    };

    const handleTrackingIdChange = (index: number, value: string) => {
        const newIds = [...trackingIds];
        newIds[index] = value;
        setTrackingIds(newIds);
    };

    const buildSavePayload = () => {
        const cleanTrackingIds = effectiveTrackingIds.map(t => t.trim()).filter(Boolean);
        if (targetType === 'DISTRIBUTOR') {
            return {
                distributorContactPerson: effectiveContactPerson,
                distributorPhone: effectiveReceiverPhone,
                distributorAddress: effectiveReceiverAddress,
                trackingIds: cleanTrackingIds
            };
        } else {
            return {
                customerName: effectiveReceiverName,
                contactPerson: effectiveContactPerson,
                customerPhone: effectiveReceiverPhone,
                customerReturnAddress: effectiveReceiverAddress,
                customerTrackingIds: cleanTrackingIds
            };
        }
    };

    const handleSaveAndPrint = async () => {
        try {
            setIsSaving(true);
            const rmaIds = isTabbed ? currentRmas.map(r => r.id) : undefined;
            await onSave(buildSavePayload(), rmaIds);

            const payloads: ShippingLabelPayload[] = effectiveTrackingIds.map((tid, index) => ({
                rma: currentRma,
                receiverName: effectiveReceiverName,
                contactPerson: effectiveContactPerson,
                receiverPhone: effectiveReceiverPhone,
                receiverAddress: effectiveReceiverAddress,
                trackingId: tid,
                currentBox: index + 1,
                totalBoxes: effectiveTrackingIds.length
            }));

            const html = await getCustomerShippingLabelHTML(payloads);
            setPreviewHtml(html);

        } catch (error) {
            console.error("Failed to save or generate preview", error);
            showToast('เกิดข้อผิดพลาดในการสร้าง Preview', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrintFromPreview = () => {
        const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
        if (iframe?.contentWindow) {
            iframe.contentWindow.print();
        }
    };

    // Preview ALL distributors at once (tabbed mode only)
    const handlePreviewAll = async () => {
        if (!isTabbed || !distributorGroups) return;
        try {
            setIsSaving(true);
            // In tabbed mode, tabData is already up-to-date (no separate form state)
            const latestTabData = { ...tabData };

            // Save all tabs to DB
            for (const [distName, data] of Object.entries(latestTabData)) {
                const distRmas = distributorGroups[distName];
                if (!distRmas) continue;
                const cleanIds = data.trackingIds.map(t => t.trim()).filter(Boolean);
                const payload = {
                    distributorContactPerson: data.contactPerson,
                    distributorPhone: data.receiverPhone,
                    distributorAddress: data.receiverAddress,
                    trackingIds: cleanIds
                };
                await onSave(payload, distRmas.map(r => r.id));
            }

            // Build combined payloads for ALL distributors
            const allPayloads: ShippingLabelPayload[] = [];
            for (const [distName, data] of Object.entries(latestTabData)) {
                const distRmas = distributorGroups[distName];
                if (!distRmas) continue;
                const firstRma = distRmas[0];
                data.trackingIds.forEach((tid, index) => {
                    allPayloads.push({
                        rma: firstRma,
                        receiverName: data.receiverName,
                        contactPerson: data.contactPerson,
                        receiverPhone: data.receiverPhone,
                        receiverAddress: data.receiverAddress,
                        trackingId: tid,
                        currentBox: index + 1,
                        totalBoxes: data.trackingIds.length
                    });
                });
            }

            const html = await getCustomerShippingLabelHTML(allPayloads);
            setPreviewHtml(html);
        } catch (error) {
            console.error("Failed to generate preview all", error);
            showToast('เกิดข้อผิดพลาดในการสร้าง Preview', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveClick = async () => {
        try {
            setIsSaving(true);
            const rmaIds = isTabbed ? currentRmas.map(r => r.id) : undefined;
            await onSave(buildSavePayload(), rmaIds);
            showToast('บันทึกข้อมูลสำเร็จ', 'success');
        } catch (error) {
            console.error(error);
            showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyData = () => {
        const jobId = currentRma.groupRequestId || currentRma.id;
        const refNo = currentRma.quotationNumber || '-';
        const cleanTrackingIds = effectiveTrackingIds.map(t => t.trim()).filter(Boolean);
        const items = currentRmas;

        let text = `เลขที่งานเคลม (Job ID): ${jobId}\n`;
        text += `เลขอ้างอิง/ใบเสนอราคา: ${refNo}\n\n`;

        // รายการสินค้า
        text += `รายการสินค้า (${items.length} ชิ้น):\n`;
        items.forEach((item, i) => {
            text += `${i + 1}. ${item.brand} ${item.productModel} | S/N: ${item.serialNumber || '-'}\n`;
            text += `   อาการที่ลูกค้าแจ้ง: ${item.issueDescription || '-'}\n`;
            text += `   อาการที่พบ: ${item.resolution?.rootCause || '-'}\n`;
        });

        text += `\nนำส่ง...${effectiveReceiverName}\n`;
        if (effectiveContactPerson) text += `ผู้ติดต่อ: ${effectiveContactPerson}\n`;
        if (effectiveReceiverAddress) text += `${effectiveReceiverAddress}\n`;
        if (effectiveReceiverPhone) text += `โทร. ${effectiveReceiverPhone}\n`;
        text += `\nพัสดุจะปรากฏในระบบภายใน 1-3 วันทำการ\nหากยังไม่ปรากฏ กรุณาตรวจสอบอีกครั้งในวันถัดไป\n`;

        if (cleanTrackingIds.length > 0) {
            text += `\n`;
            cleanTrackingIds.forEach(tid => {
                text += `หมายเลขพัสดุ: ${tid}\n`;
                text += `https://track.thailandpost.co.th/?trackNumber=${tid}\n`;
            });
        }

        navigator.clipboard.writeText(text.trim()).then(() => {
            showToast('คัดลอกข้อมูลเรียบร้อยแล้ว', 'success');
        }).catch(() => {
            showToast('ไม่สามารถคัดลอกได้', 'error');
        });
    };

    return (<>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-200 dark:border-[#333]">

                {/* Sticky Header */}
                <div className="flex-shrink-0 flex items-start sm:items-center justify-between p-4 px-4 md:px-6 border-b border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#2c2c2e]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                            <Truck className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-[#1d1d1f] dark:text-white leading-tight">
                                {targetType === 'CUSTOMER' ? 'สร้างใบปะหน้า - ส่งคืนลูกค้า' : 'สร้างใบปะหน้า - ส่งเคลมศูนย์'}
                            </h2>
                            <p className="text-xs md:text-sm text-gray-500 font-mono mt-0.5">ID: {displayId}</p>
                        </div>
                    </div>        <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors ml-2"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Distributor Tabs */}
                {isTabbed && tabNames.length > 0 && (
                    <div className="flex-shrink-0 flex items-center gap-1 px-4 md:px-6 py-2 bg-white dark:bg-[#1c1c1e] border-b border-gray-200 dark:border-[#333] overflow-x-auto">
                        {tabNames.map((name, i) => (
                            <button
                                key={name}
                                onClick={() => handleTabChange(name)}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                                    activeTab === name
                                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                        : 'bg-gray-100 dark:bg-[#2c2c2e] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#3c3c3e]'
                                }`}
                            >
                                <Package className="w-3.5 h-3.5" />
                                {name}
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                    activeTab === name ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-600'
                                }`}>
                                    {distributorGroups![name]?.length || 0}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Content */}
                <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-6 md:space-y-8">

                    {/* Order Info (Read-only) */}
                    <div>
                        <h3 className="text-sm font-semibold text-[#0071e3] mb-4">ข้อมูลงานเคลม</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/10 text-sm">
                            <div>
                                <span className="text-gray-500 dark:text-gray-400">รหัสงานเคลม (Job ID):</span>
                                <div className="font-medium mt-1 text-[#1d1d1f] dark:text-white">{rma.groupRequestId || rma.id}</div>
                            </div>
                            <div>
                                <span className="text-gray-500 dark:text-gray-400">เลขอ้างอิง/ใบเสนอราคา:</span>
                                <div className="font-medium mt-1 text-[#1d1d1f] dark:text-white">{rma.quotationNumber || '-'}</div>
                            </div>
                            <div>
                                <span className="text-gray-500 dark:text-gray-400">ชื่อลูกค้า:</span>
                                <div className="font-medium mt-1 text-[#1d1d1f] dark:text-white">{rma.customerName || '-'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Receiver Info (Editable) */}
                    <div>
                        <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-white mb-4">ข้อมูลผู้รับสินค้า</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 ml-1">
                                    {targetType === 'DISTRIBUTOR' ? 'ชื่อผู้นำเข้า / ชื่อบริษัท' : 'ชื่อผู้รับ / ชื่อบริษัท'}
                                </label>
                                <input
                                    type="text"
                                    value={effectiveReceiverName}
                                    onChange={e => isTabbed ? updateTabField('receiverName', e.target.value) : setReceiverName(e.target.value)}
                                    className="w-full rounded-xl px-4 py-2.5 text-sm text-[#1d1d1f] dark:text-white bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-[#424245] outline-none font-medium"
                                    placeholder={targetType === 'DISTRIBUTOR' ? 'เช่น Synnex, SIS...' : 'ชื่อลูกค้า'}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">ผู้ติดต่อ</label>
                                <input
                                    type="text"
                                    value={effectiveContactPerson}
                                    onChange={(e) => isTabbed ? updateTabField('contactPerson', e.target.value) : setContactPerson(e.target.value)}
                                    className="w-full px-4 py-2 bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-[#0071e3] outline-none text-[#1d1d1f] dark:text-white text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">เบอร์โทรติดต่อ</label>
                                <input
                                    type="text"
                                    value={effectiveReceiverPhone}
                                    onChange={(e) => isTabbed ? updateTabField('receiverPhone', e.target.value) : setReceiverPhone(e.target.value)}
                                    className="w-full px-4 py-2 bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-[#0071e3] outline-none text-[#1d1d1f] dark:text-white text-sm"
                                />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">ที่อยู่จัดส่ง</label>
                            <textarea
                                value={effectiveReceiverAddress}
                                onChange={(e) => isTabbed ? updateTabField('receiverAddress', e.target.value) : setReceiverAddress(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-[#0071e3] outline-none text-[#1d1d1f] dark:text-white text-sm resize-none"
                            />
                        </div>
                    </div>

                    <div className="h-px bg-gray-200 dark:bg-white/10 w-full my-6"></div>

                    {/* Tracking IDs Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-white mb-4">รายการ EMS / Tracking No. ({effectiveTrackingIds.length} กล่อง)</h3>
                        <div className="space-y-3">
                            {effectiveTrackingIds.map((tid, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <div className="text-gray-400 text-sm font-mono w-6">#{index + 1}</div>
                                    <input
                                        type="text"
                                        value={tid}
                                        onChange={(e) => {
                                            if (isTabbed) {
                                                const newIds = [...effectiveTrackingIds];
                                                newIds[index] = e.target.value;
                                                updateTabField('trackingIds', newIds);
                                            } else {
                                                handleTrackingIdChange(index, e.target.value);
                                            }
                                        }}
                                        placeholder="กรอก EMS / Tracking No. (เว้นว่างไว้ได้)"
                                        className="flex-1 px-4 py-2 bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-[#0071e3] outline-none text-[#1d1d1f] dark:text-white text-sm"
                                    />
                                    {/* Action buttons mirroring UI */}
                                    <div className="flex gap-1">
                                        <button className="p-2 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
                                        <button className="p-2 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg"><Expand className="w-4 h-4" /></button>
                                        <button
                                            onClick={() => {
                                                if (isTabbed) {
                                                    const newIds = [...effectiveTrackingIds];
                                                    newIds.splice(index, 1);
                                                    if (newIds.length === 0) newIds.push('');
                                                    updateTabField('trackingIds', newIds);
                                                } else {
                                                    handleRemoveTrackingId(index);
                                                }
                                            }}
                                            className="p-2 text-red-400 hover:text-red-600 border border-red-100 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => isTabbed ? updateTabField('trackingIds', [...effectiveTrackingIds, '']) : handleAddTrackingId()}
                            className="mt-4 w-full py-3 border border-dashed border-gray-300 dark:border-[#444] rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-[#0071e3] dark:hover:text-[#2997ff] hover:border-[#0071e3] dark:hover:border-[#2997ff] transition-all flex justify-center items-center gap-2 font-medium text-sm"
                        >
                            <Plus className="w-4 h-4" /> เพิ่ม EMS / Tracking No. (กล่องที่ {effectiveTrackingIds.length + 1})
                        </button>
                    </div>

                </div>


                {/* Footer Buttons */}
                <div className="p-3 md:p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#1c1c1e] flex justify-between items-center gap-1.5 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-3 sm:px-6 py-2 sm:py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium shadow-sm transition-colors flex-shrink-0"
                    >
                        ปิด
                    </button>

                    <div className="flex gap-1 sm:gap-2 overflow-x-auto">
                        <button
                            onClick={handleSaveClick}
                            disabled={isSaving}
                            className="px-3 sm:px-6 py-2 sm:py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium shadow-md shadow-orange-500/20 transition-all flex items-center gap-1 sm:gap-2 whitespace-nowrap"
                        >
                            <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> บันทึกข้อมูล
                        </button>

                        <button
                            onClick={handleSaveAndPrint}
                            disabled={isSaving}
                            className="px-3 sm:px-6 py-2 sm:py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium shadow-md shadow-blue-500/20 transition-all flex items-center gap-1 sm:gap-2 whitespace-nowrap"
                        >
                            <Expand className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Preview {isTabbed ? `ศูนย์` : 'ใบปะหน้า'}
                        </button>

                        {isTabbed && (
                            <button
                                onClick={handlePreviewAll}
                                disabled={isSaving}
                                className="px-3 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 transition-all flex items-center gap-1 sm:gap-2 whitespace-nowrap"
                            >
                                <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> ทั้งหมด ({tabNames.length} ใบ)
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Preview Overlay */}
        {previewHtml && (
            <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
                {/* Toolbar */}
                <div className="flex-shrink-0 flex items-center justify-between gap-1.5 px-3 md:px-6 py-2 bg-white dark:bg-[#1c1c1e] border-b border-gray-200 dark:border-white/10 shadow-sm w-full overflow-x-auto scrollbar-none">
                    <h2 className="text-gray-800 dark:text-white font-bold text-xs sm:text-base flex-shrink-0 whitespace-nowrap mr-1">📋 Preview</h2>
                    
                    <div className="flex items-center gap-1 sm:gap-2">
                        {/* Copy Text Only (Facebook friendly) */}
                        <button
                            onClick={handleCopyData}
                            className="px-2.5 py-1.5 md:px-4 md:py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium text-[11px] md:text-sm flex items-center gap-1 md:gap-2 transition-colors whitespace-nowrap"
                            title="คัดลอกเฉพาะข้อความ (ใช้กับ Facebook ได้)"
                        >
                            <Copy className="w-3.5 h-3.5" /> ข้อความ
                        </button>
                        
                        {/* Copy Image Only */}
                        <button
                            onClick={async () => {
                                try {
                                    if (!previewHtml) { showToast('ไม่มีเอกสารสำหรับก็อปปี้', 'error'); return; }
                                    const blob = await renderHtmlToBlob(previewHtml);
                                    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                                    showToast('คัดลอกรูปภาพแล้ว!', 'success');
                                } catch (err) {
                                    console.error('Copy image failed:', err);
                                    showToast('ไม่สามารถคัดลอกรูปภาพได้ ลองใหม่อีกครั้ง', 'error');
                                }
                            }}
                            className="px-2.5 py-1.5 md:px-4 md:py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium text-[11px] md:text-sm flex items-center gap-1 md:gap-2 transition-colors whitespace-nowrap"
                            title="คัดลอกเฉพาะรูปภาพ"
                        >
                            <Copy className="w-3.5 h-3.5" /> รูปภาพ
                        </button>
                        
                        {/* Copy Both (LINE friendly) */}
                        <button
                            onClick={async () => {
                                try {
                                    if (!previewHtml) { showToast('ไม่มีเอกสารสำหรับก็อปปี้', 'error'); return; }
                                    const blob = await renderHtmlToBlob(previewHtml);
                                    // Build text
                                    const jobId = currentRma.groupRequestId || currentRma.id;
                                    const refNo = currentRma.quotationNumber || '-';
                                    const cleanTrackingIds = effectiveTrackingIds.map(t => t.trim()).filter(Boolean);
                                    const items = currentRmas;
                                    let text = `เลขที่งานเคลม (Job ID): ${jobId}\n`;
                                    text += `เลขอ้างอิง/ใบเสนอราคา: ${refNo}\n\n`;
                                    text += `รายการสินค้า (${items.length} ชิ้น):\n`;
                                    items.forEach((item, i) => {
                                        text += `${i + 1}. ${item.brand} ${item.productModel} | S/N: ${item.serialNumber || '-'}\n`;
                                    });
                                    text += `\nนำส่ง...${effectiveReceiverName}\n`;
                                    if (effectiveContactPerson) text += `ผู้ติดต่อ: ${effectiveContactPerson}\n`;
                                    if (effectiveReceiverAddress) text += `${effectiveReceiverAddress}\n`;
                                    if (effectiveReceiverPhone) text += `โทร. ${effectiveReceiverPhone}\n`;
                                    if (cleanTrackingIds.length > 0) {
                                        text += `\n`;
                                        cleanTrackingIds.forEach(tid => {
                                            text += `หมายเลขพัสดุ: ${tid}\n`;
                                            text += `https://track.thailandpost.co.th/?trackNumber=${tid}\n`;
                                        });
                                    }
                                    await navigator.clipboard.write([
                                        new ClipboardItem({
                                            'image/png': blob,
                                            'text/plain': new Blob([text.trim()], { type: 'text/plain' })
                                        })
                                    ]);
                                    showToast('คัดลอกรูป + ข้อความแล้ว! วางใน LINE ได้เลย', 'success');
                                } catch (err) {
                                    console.error('Copy failed:', err);
                                    showToast('ไม่สามารถคัดลอกได้ ลองใหม่อีกครั้ง', 'error');
                                }
                            }}
                            className="px-2.5 py-1.5 md:px-4 md:py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium text-[11px] md:text-sm flex items-center gap-1 md:gap-2 transition-colors whitespace-nowrap"
                            title="คัดลอกทั้งรูปภาพและข้อความ (สำหรับ LINE)"
                        >
                            <Copy className="w-3.5 h-3.5" /> ทั้งหมด
                        </button>
                        
                        <button
                            onClick={handlePrintFromPreview}
                            className="px-2.5 py-1.5 md:px-4 md:py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-[11px] md:text-sm flex items-center gap-1 md:gap-2 transition-colors whitespace-nowrap"
                        >
                            🖨️ พิมพ์
                        </button>
                        
                        <button
                            onClick={() => setPreviewHtml(null)}
                            className="px-2.5 py-1.5 md:px-4 md:py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium text-[11px] md:text-sm flex items-center gap-1.5 md:gap-2 transition-colors whitespace-nowrap"
                        >
                            <X className="w-3.5 h-3.5 md:w-4 md:h-4" /> ปิด
                        </button>
                    </div>
                </div>
                {/* Preview Content - A4 size */}
                <div className="flex-1 overflow-auto flex justify-start lg:justify-center py-8 px-4 md:px-12 bg-gray-100/50 dark:bg-black/50">
                    <div className="origin-top flex justify-center" style={{ zoom: 'min(0.8, calc(100vw / 850))' }}>
                        <iframe
                            id="preview-iframe"
                            srcDoc={`<html><head><title>Preview</title><style>body{margin:0;padding:24px;background:#e5e7eb;}@media print{body{padding:0;margin:0;background:#fff !important;}}</style></head><body>${previewHtml}</body></html>`}
                            className="border-0 bg-gray-200"
                            style={{ width: '850px', height: `${isTabbed ? Math.max(1, tabNames.length) * 620 : 1123}px`, minWidth: '794px' }}
                        />
                    </div>
                </div>
            </div>
        )}
    </>);
};
