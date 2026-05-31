
import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MockDb } from '../services/mockDb';
import { RMA, RMAStatus, ProductType } from '../types';
import { ArrowLeft, Package, User, Clock, Edit2, AlertCircle, CheckCircle2, History, Trash2, Truck, ShieldCheck, FileText, Edit3, Save, Loader2, Plus, CheckSquare, Square, Zap, X as XClose, Search, Wrench, Undo2, RefreshCw, ClipboardCheck, Settings2, PackageCheck, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { StatusBadge } from '../components/StatusBadge';
import { GlassSelect } from '../components/GlassSelect';
import { createPortal } from 'react-dom';

import { printDistributorDocuments, printCustomerDocuments, getDistributorDocumentsHTML, getCustomerDocumentsHTML } from '../services/printService';
import { Printer, Copy, X as XIcon } from 'lucide-react';
import { ShipmentTagModal } from '../components/ShipmentTagModal';
// html2canvas loaded dynamically when needed — see usage below
import { renderHtmlToBlob } from '../services/renderToImage';
import { showToast } from '../services/toast';
const ProductEntryForm = lazy(() => import('../components/ProductEntryForm').then(m => ({ default: m.ProductEntryForm })));
import { EditRMADrawer } from '../components/EditRMADrawer';


export const JobDetail: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const [rmas, setRMAs] = useState<RMA[]>([]);
    const [jobInfo, setJobInfo] = useState<{ id: string, quotationNumber?: string, customerName: string, count: number, date: string, status: string, type: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedRMAs, setExpandedRMAs] = useState<Set<string>>(new Set());

    // Shipment Tag Modal state
    const [isShipmentTagModalOpen, setIsShipmentTagModalOpen] = useState(false);
    const [shipmentTagTarget, setShipmentTagTarget] = useState<'CUSTOMER' | 'DISTRIBUTOR'>('CUSTOMER');
    const [shipmentTagRmas, setShipmentTagRmas] = useState<RMA[]>([]); // Selected RMAs for shipment tag

    // Distributor Picker state (appears before ShipmentTagModal when multiple distributors)
    const [showDistributorPicker, setShowDistributorPicker] = useState(false);
    const [selectedDistRmas, setSelectedDistRmas] = useState<Set<string>>(new Set());
    const [shipmentDistGroups, setShipmentDistGroups] = useState<Record<string, RMA[]> | undefined>(undefined);

    // Document Preview Popup state
    const [docPreviewHtml, setDocPreviewHtml] = useState<string | null>(null);
    const [docPreviewType, setDocPreviewType] = useState<'DISTRIBUTOR' | 'CUSTOMER'>('DISTRIBUTOR');
    const [docPreviewRmas, setDocPreviewRmas] = useState<RMA[]>([]);
    const docPreviewRenderRef = useRef<HTMLDivElement>(null);
    const [isCopyingImage, setIsCopyingImage] = useState(false);

    // Add item modal
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [isAddingItem, setIsAddingItem] = useState(false);

    // Bulk actions state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
    const [showBulkEditModal, setShowBulkEditModal] = useState(false);
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);
    const [bulkDistOptions, setBulkDistOptions] = useState<any[]>([]);
    const [bulkBrandOptions, setBulkBrandOptions] = useState<any[]>([]);
    const [bulkCustomBrand, setBulkCustomBrand] = useState('');
    const [bulkEditForm, setBulkEditForm] = useState({ brand: '', productModel: '', serialNumber: '', distributor: '', issueDescription: '', rootCause: '', technicalNotes: '', warrantyStatus: '' });
    const [showManualStatusInBulk, setShowManualStatusInBulk] = useState(false);
    const [isBulkEditLocked, setIsBulkEditLocked] = useState(false);
    const [showBulkVendorPopup, setShowBulkVendorPopup] = useState(false);
    const [bulkVendorForm, setBulkVendorForm] = useState({
        actionTaken: '',
        actionDetails: '',
        replacedSerialNumber: '',
        vendorTicketRef: '',
        restockCondition: '' as '' | 'NEW' | 'REFURBISHED'
    });
    const [bulkVendorTargetStatus, setBulkVendorTargetStatus] = useState<RMAStatus>(RMAStatus.RETURNED_FROM_VENDOR);

    // Customer edit state
    const [isEditingCustomer, setIsEditingCustomer] = useState(false);
    const [isSavingCustomer, setIsSavingCustomer] = useState(false);
    const [customerForm, setCustomerForm] = useState({
        quotationNumber: '',
        customerName: '',
        contactPerson: '',
        customerPhone: '',
        customerLineId: '',
        customerEmail: '',
        customerReturnAddress: ''
    });

    const [searchParams, setSearchParams] = useSearchParams();

    const { t } = useLanguage();
    const navigate = useNavigate();

    // ... (rest of useEffects)



    const refreshRMAs = async () => {
        const decodedId = decodeURIComponent(jobId || '');
        const jobRMAs = await MockDb.getRMAsByJobId(decodedId);
        setRMAs(jobRMAs);
    };

    useEffect(() => {
        const fetchJobData = async () => {
            if (!jobId) return;
            setLoading(true);
            try {
                const decodedId = decodeURIComponent(jobId);
                const jobRMAs = await MockDb.getRMAsByJobId(decodedId);

                if (jobRMAs.length > 0) {
                    setRMAs(jobRMAs);
                    jobRMAs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

                    const first = jobRMAs[0];
                    setJobInfo({
                        id: first.groupRequestId || first.quotationNumber || decodedId,
                        quotationNumber: first.quotationNumber,
                        customerName: first.customerName,
                        count: jobRMAs.length,
                        date: first.createdAt,
                        status: jobRMAs.every(r => r.status === RMAStatus.CLOSED) ? 'Completed' : 'In Progress',
                        type: first.quotationNumber ? 'QUOTATION' : first.groupRequestId ? 'GROUP' : 'SINGLE'
                    });

                    // Initialize customer form
                    // Auto-split legacy data: old customer submissions stored "companyName - contactName" in customerName
                    let loadedCustomerName = first.customerName || '';
                    let loadedContactPerson = first.contactPerson || '';
                    if (!loadedContactPerson && loadedCustomerName.includes(' - ')) {
                        const parts = loadedCustomerName.split(' - ');
                        loadedCustomerName = parts[0].trim();
                        loadedContactPerson = parts.slice(1).join(' - ').trim();
                    }
                    setCustomerForm({
                        quotationNumber: first.quotationNumber || '',
                        customerName: loadedCustomerName,
                        contactPerson: loadedContactPerson,
                        customerPhone: first.customerPhone || '',
                        customerLineId: first.customerLineId || '',
                        customerEmail: first.customerEmail || '',
                        customerReturnAddress: first.customerReturnAddress || ''
                    });

                    const editRmaId = searchParams.get('editRmaId');
                    if (editRmaId) {
                        navigate(`/admin/rma/${editRmaId}/edit`, { replace: true });
                    }
                } else {
                    navigate('/admin/rmas');
                }
            } catch (error) {
                console.error("Failed to fetch job", error);
            } finally {
                setLoading(false);
            }
        };

        fetchJobData();
    }, [jobId, searchParams]);

    const toggleHistory = (id: string) => {
        const newSet = new Set(expandedRMAs);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedRMAs(newSet);
    };

    const handleEditClick = (rma: RMA) => {
        navigate(`/admin/rma/${rma.id}/edit`);
    };

    const handleSaveCustomer = async () => {
        setIsSavingCustomer(true);
        try {
            const updates: Partial<RMA> = {
                quotationNumber: customerForm.quotationNumber,
                customerName: customerForm.customerName,
                contactPerson: customerForm.contactPerson,
                customerPhone: customerForm.customerPhone,
                customerLineId: customerForm.customerLineId,
                customerEmail: customerForm.customerEmail,
                customerReturnAddress: customerForm.customerReturnAddress
            };
            // Update all RMAs in this job
            for (const rma of rmas) {
                await MockDb.updateRMA(rma.id, updates);
            }
            // Update local state
            setJobInfo(prev => prev ? { ...prev, customerName: customerForm.customerName, quotationNumber: customerForm.quotationNumber } : null);
            await refreshRMAs();
            setIsEditingCustomer(false);
        } catch (error) {
            console.error('Failed to update customer info', error);
        } finally {
            setIsSavingCustomer(false);
        }
    };

    const handleSaveShipmentTagData = async (customerData: any, rmaIds?: string[]) => {
        if (!jobInfo || rmas.length === 0) return;
        try {
            const rmasToUpdate = rmaIds ? rmas.filter(r => rmaIds.includes(r.id)) : rmas;
            for (const rma of rmasToUpdate) {
                await MockDb.updateRMA(rma.id, customerData);
            }
            await refreshRMAs();
        } catch (error) {
            console.error("Failed to save shipment tag data", error);
            alert("Failed to save data");
        }
    };

    const handleCancelCustomerEdit = () => {
        // Reset form to current data
        if (rmas.length > 0) {
            const first = rmas[0];
            // Auto-split legacy data
            let cancelName = first.customerName || '';
            let cancelContact = first.contactPerson || '';
            if (!cancelContact && cancelName.includes(' - ')) {
                const parts = cancelName.split(' - ');
                cancelName = parts[0].trim();
                cancelContact = parts.slice(1).join(' - ').trim();
            }
            setCustomerForm({
                quotationNumber: first.quotationNumber || '',
                customerName: cancelName,
                contactPerson: cancelContact,
                customerPhone: first.customerPhone || '',
                customerLineId: first.customerLineId || '',
                customerEmail: first.customerEmail || '',
                customerReturnAddress: first.customerReturnAddress || ''
            });
        }
        setIsEditingCustomer(false);
    };

    const handleAddItemToJob = async (item: any) => {
        if (!jobInfo || rmas.length === 0) return;
        setIsAddingItem(true);
        try {
            const first = rmas[0];
            await MockDb.addRMA({
                groupRequestId: first.groupRequestId || jobInfo.id,
                quotationNumber: first.quotationNumber || '',
                customerName: first.customerName,
                contactPerson: first.contactPerson || '',
                customerEmail: first.customerEmail || '',
                customerLineId: first.customerLineId || '',
                customerAddress: first.customerReturnAddress || '',
                customerReturnAddress: first.customerReturnAddress || '',
                customerPhone: first.customerPhone || '',
                lineAccount: (first as any).lineAccount || '',
                brand: item.brand,
                productModel: item.model,
                serialNumber: item.serial,
                productType: ProductType.OTHER,
                distributor: item.distributor || '',
                accessories: item.accessories || [],
                issueDescription: item.issue,
                deviceUsername: item.deviceUsername || '',
                devicePassword: item.devicePassword || '',
                team: item.team || null,
                attachments: [],
                createdBy: `Staff (Added to ${first.groupRequestId || jobInfo.id})`
            });

            await refreshRMAs();
            setJobInfo(prev => prev ? { ...prev, count: prev.count + 1 } : null);
            setShowAddItemModal(false);
            showToast('✅ เพิ่มสินค้าเรียบร้อย', 'success');
        } catch (error) {
            console.error('Failed to add item', error);
            showToast('❌ เกิดข้อผิดพลาดในการเพิ่มสินค้า', 'error');
        } finally {
            setIsAddingItem(false);
        }
    };

    if (loading) return <div className="p-12 text-center">Loading Job...</div>;
    if (!jobInfo) return null;

    const closedRMAs = rmas.filter(rma => rma.status === RMAStatus.CLOSED || rma.status === RMAStatus.REPAIRED || rma.status === RMAStatus.REPLACED_FROM_STOCK || rma.status === RMAStatus.RETURNED_FROM_VENDOR);
    const hasClosedRMAs = closedRMAs.length > 0;
    const allHaveDistributor = rmas.every(rma => rma.distributor && rma.distributor.trim() !== '' && rma.distributor !== 'Pending Staff Input');
    const missingDistributorCount = rmas.filter(rma => !rma.distributor || rma.distributor.trim() === '' || rma.distributor === 'Pending Staff Input').length;

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <Link to="/admin/rmas" className="flex items-center text-sm font-medium text-gray-500 hover:text-[#0071e3] transition-colors"><ArrowLeft className="h-4 w-4 mr-1" /> {t('track.backToList')}</Link>
            </div>

            {/* Unified Job Header & Customer Info Card */}
            <div className="bg-white dark:bg-[#1c1c1e] rounded-[2rem] p-6 sm:p-8 mb-8 border border-gray-100 dark:border-[#333] shadow-sm">

                {/* --- TOP HEADER SECTION --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center text-2xl shadow-inner"><Package /></div>
                        <div>
                            <div className="flex items-center flex-wrap gap-3 mb-2">
                                <h1 className="text-xl sm:text-2xl font-bold text-[#1d1d1f] dark:text-white leading-tight break-all">
                                    {jobInfo.id}
                                </h1>
                                <span className={`text-xs px-2.5 py-1 rounded border flex items-center gap-1 font-medium ${jobInfo.quotationNumber ? 'bg-gray-50 dark:bg-[#2c2c2e] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-[#424245]' : 'bg-gray-50/50 dark:bg-[#2c2c2e]/50 text-gray-400 dark:text-gray-500 border-gray-100 dark:border-[#424245]/50 italic'}`}>
                                    <span className="uppercase text-[10px] font-bold opacity-60">Ref:</span>
                                    {jobInfo.quotationNumber || 'ไม่มี Ref'}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 md:gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {new Date(jobInfo.date).toLocaleDateString()}</span>
                                <span className="bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-xs text-[#1d1d1f] dark:text-gray-300 font-medium">{jobInfo.count} {t('claimsList.items')}</span>
                                <div className="flex gap-2">
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-medium border border-green-100 dark:border-green-900/30">
                                        <CheckCircle2 className="w-3 h-3" />
                                        {rmas.filter(c => c.status === RMAStatus.CLOSED || c.status === RMAStatus.REPAIRED || c.status === RMAStatus.REPLACED_FROM_STOCK || c.status === RMAStatus.RETURNED_FROM_VENDOR).length} {t('track.doneBadge')}
                                    </div>
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium border border-blue-100 dark:border-blue-900/30">
                                        <Clock className="w-3 h-3" />
                                        {rmas.filter(c => c.status !== RMAStatus.CLOSED && c.status !== RMAStatus.REPAIRED && c.status !== RMAStatus.REPLACED_FROM_STOCK && c.status !== RMAStatus.RETURNED_FROM_VENDOR).length} {t('track.activeBadge')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PRINT ACTION GROUPS — 2x2 Grid */}
                    <div className="grid grid-cols-2 gap-2 w-full md:w-auto md:min-w-[340px] md:max-w-[400px]">
                        {/* Top-Left: ใบส่งเคลม */}
                        <button
                            onClick={async () => {
                                const html = await getDistributorDocumentsHTML(rmas);
                                if (html) { setDocPreviewHtml(html); setDocPreviewType('DISTRIBUTOR'); setDocPreviewRmas(rmas); }
                            }}
                            disabled={!allHaveDistributor}
                            className={`h-11 flex items-center justify-center gap-2 rounded-xl text-xs font-semibold transition-all ${allHaveDistributor
                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-95'
                                : 'bg-gray-100 dark:bg-[#2c2c2e] text-gray-400 dark:text-gray-600 cursor-not-allowed'}`}
                            title={!allHaveDistributor ? `กรุณาเลือกผู้นำเข้าให้ครบทุกรายการก่อน (ยังขาด ${missingDistributorCount} รายการ)` : ''}
                        >
                            <Printer className="w-3.5 h-3.5" strokeWidth={2.5} />
                            ส่งให้ศูนย์
                        </button>

                        {/* Top-Right: ใบส่งคืน */}
                        <button
                            onClick={async () => {
                                const html = await getCustomerDocumentsHTML(closedRMAs);
                                if (html) { setDocPreviewHtml(html); setDocPreviewType('CUSTOMER'); setDocPreviewRmas(closedRMAs); }
                            }}
                            disabled={!hasClosedRMAs}
                            className={`h-11 flex items-center justify-center gap-2 rounded-xl text-xs font-semibold transition-all ${hasClosedRMAs
                                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-95'
                                : 'bg-gray-100 dark:bg-[#2c2c2e] text-gray-400 dark:text-gray-600 cursor-not-allowed'}`}
                            title={!hasClosedRMAs ? `ปิดงานก่อนถึงจะพิมพ์ได้ (${closedRMAs.length}/${rmas.length} ปิดแล้ว)` : ''}
                        >
                            <User className="w-3.5 h-3.5" strokeWidth={2.5} />
                            ส่งคืนลูกค้า
                        </button>

                        {/* Bottom-Left: ใบปะหน้า (ศูนย์) */}
                        <button
                            onClick={() => {
                                const distributorGroups = new Set(rmas.map(r => r.distributor || '').filter(Boolean));
                                if (distributorGroups.size > 1) {
                                    // Multiple distributors — show picker
                                    setSelectedDistRmas(new Set(rmas.map(r => r.id)));
                                    setShowDistributorPicker(true);
                                } else {
                                    // Single distributor — go straight to label
                                    setShipmentTagRmas(rmas);
                                    setShipmentTagTarget('DISTRIBUTOR');
                                    setIsShipmentTagModalOpen(true);
                                }
                            }}
                            disabled={!allHaveDistributor}
                            className={`h-11 flex items-center justify-center gap-2 rounded-xl text-xs font-semibold transition-all ${allHaveDistributor
                                ? 'border border-orange-300 dark:border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:scale-[1.02] active:scale-95'
                                : 'border border-gray-200 dark:border-[#333] text-gray-400 dark:text-gray-600 cursor-not-allowed'}`}
                            title={!allHaveDistributor ? `กรุณาเลือกผู้นำเข้าให้ครบทุกรายการก่อน (ยังขาด ${missingDistributorCount} รายการ)` : ''}
                        >
                            <Truck className="w-3.5 h-3.5" strokeWidth={2.5} />
                            ใบปะหน้า (ศูนย์)
                        </button>

                        {/* Bottom-Right: ใบปะหน้า (ลูกค้า) */}
                        <button
                            onClick={() => { setShipmentTagRmas(closedRMAs); setShipmentTagTarget('CUSTOMER'); setIsShipmentTagModalOpen(true); }}
                            disabled={!hasClosedRMAs}
                            className={`h-11 flex items-center justify-center gap-2 rounded-xl text-xs font-semibold transition-all ${hasClosedRMAs
                                ? 'border border-blue-300 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:scale-[1.02] active:scale-95'
                                : 'border border-gray-200 dark:border-[#333] text-gray-400 dark:text-gray-600 cursor-not-allowed'}`}
                            title={!hasClosedRMAs ? `ปิดงานก่อนถึงจะพิมพ์ได้ (${closedRMAs.length}/${rmas.length} ปิดแล้ว)` : ''}
                        >
                            <Truck className="w-3.5 h-3.5" strokeWidth={2.5} />
                            ใบปะหน้า (ลูกค้า)
                        </button>
                    </div>
                </div>

                {/* SEC DIVIDER */}
                <div className="w-full h-px bg-gray-200 dark:bg-[#333] mb-6"></div>

                {/* --- CUSTOMER INFO SECTION --- */}
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="font-semibold text-base flex items-center gap-3 text-[#1d1d1f] dark:text-white">
                            <User className="w-5 h-5 text-gray-400" />
                            {t('submit.customerDetails')}
                        </h2>
                        {!isEditingCustomer ? (
                            <button onClick={() => setIsEditingCustomer(true)} className="text-xs text-blue-500 font-medium hover:text-blue-600 transition-colors flex items-center gap-1"><Edit3 className="w-3 h-3" /> {t('track.changeBtn')}</button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <button onClick={handleCancelCustomerEdit} className="px-4 py-1.5 text-xs text-gray-500 hover:text-red-500 font-medium transition-colors">{t('track.cancelBtn')}</button>
                                <button onClick={handleSaveCustomer} disabled={isSavingCustomer} className="px-5 py-1.5 text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-full shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50">
                                    {isSavingCustomer ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                    {isSavingCustomer ? 'กำลังบันทึก...' : 'บันทึก'}
                                </button>
                            </div>
                        )}
                    </div>

                    {isEditingCustomer ? (
                        <div className="space-y-4 animate-fade-in bg-gray-50 dark:bg-black/20 p-5 rounded-2xl border border-gray-100 dark:border-[#333]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-semibold text-[#0071e3] uppercase mb-2 ml-1">เลขที่ใบเสนอราคา/บิล</label>
                                    <input type="text" value={customerForm.quotationNumber} onChange={e => setCustomerForm(p => ({ ...p, quotationNumber: e.target.value }))} className="w-full rounded-xl px-4 py-3 text-sm text-[#1d1d1f] dark:text-white bg-white dark:bg-[#2c2c2e] border border-blue-200 dark:border-blue-800/50 outline-none ring-1 ring-blue-100 dark:ring-blue-900/30" placeholder="SECXXXXXX" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 ml-1">{t('publicSubmit.companyName')}</label>
                                    <input type="text" value={customerForm.customerName} onChange={e => setCustomerForm(p => ({ ...p, customerName: e.target.value }))} className="w-full rounded-xl px-4 py-3 text-sm text-[#1d1d1f] dark:text-white bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] outline-none" placeholder="ชื่อลูกค้า / บริษัท" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 ml-1">{t('publicSubmit.contactName')}</label>
                                    <input type="text" value={customerForm.contactPerson} onChange={e => setCustomerForm(p => ({ ...p, contactPerson: e.target.value }))} className="w-full rounded-xl px-4 py-3 text-sm text-[#1d1d1f] dark:text-white bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] outline-none" placeholder="ชื่อผู้ติดต่อ" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 ml-1">{t('publicSubmit.phone')}</label>
                                    <input type="text" value={customerForm.customerPhone} onChange={e => setCustomerForm(p => ({ ...p, customerPhone: e.target.value }))} className="w-full rounded-xl px-4 py-3 text-sm text-[#1d1d1f] dark:text-white bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] outline-none" placeholder="เบอร์โทรศัพท์" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 ml-1">{t('submit.lineId')}</label>
                                    <input type="text" value={customerForm.customerLineId} onChange={e => setCustomerForm(p => ({ ...p, customerLineId: e.target.value }))} className="w-full rounded-xl px-4 py-3 text-sm text-[#1d1d1f] dark:text-white bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] outline-none" placeholder="LINE ID" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 ml-1">Email</label>
                                    <input type="text" value={customerForm.customerEmail} onChange={e => setCustomerForm(p => ({ ...p, customerEmail: e.target.value }))} className="w-full rounded-xl px-4 py-3 text-sm text-[#1d1d1f] dark:text-white bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] outline-none" placeholder="อีเมล (ถ้ามี)" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 ml-1">{t('submit.returnAddress')}</label>
                                <textarea value={customerForm.customerReturnAddress} onChange={e => setCustomerForm(p => ({ ...p, customerReturnAddress: e.target.value }))} rows={2} className="w-full rounded-xl px-4 py-3 text-sm text-[#1d1d1f] dark:text-white bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] outline-none" placeholder="ที่อยู่สำหรับจัดส่งคืน" />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 text-sm">
                            <div className="flex flex-col gap-1">
                                <span className="text-gray-400 font-semibold text-[11px] tracking-wider uppercase">{t('publicSubmit.companyName')}</span>
                                <span className="text-[#1d1d1f] dark:text-gray-200 font-medium">{customerForm.customerName || '-'}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-gray-400 font-semibold text-[11px] tracking-wider uppercase">{t('publicSubmit.contactName')}</span>
                                <span className="text-[#1d1d1f] dark:text-gray-200 font-medium">{customerForm.contactPerson || '-'}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-gray-400 font-semibold text-[11px] tracking-wider uppercase">{t('publicSubmit.phone')}</span>
                                <span className="text-[#1d1d1f] dark:text-gray-200 font-medium">{customerForm.customerPhone || '-'}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-gray-400 font-semibold text-[11px] tracking-wider uppercase">{t('submit.lineId')}</span>
                                <span className="text-[#1d1d1f] dark:text-gray-200 font-medium">{customerForm.customerLineId || '-'}</span>
                            </div>
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <span className="text-gray-400 font-semibold text-[11px] tracking-wider uppercase">Email</span>
                                <span className="text-[#1d1d1f] dark:text-gray-200 font-medium">{customerForm.customerEmail || '-'}</span>
                            </div>
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <span className="text-gray-400 font-semibold text-[11px] tracking-wider uppercase">{t('submit.returnAddress')}</span>
                                <div className="text-[#1d1d1f] dark:text-gray-200 font-medium leading-relaxed bg-gray-50 dark:bg-black/10 p-3 rounded-xl border border-gray-100 dark:border-white/5 whitespace-pre-line mt-1">
                                    {customerForm.customerReturnAddress || '-'}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between ml-2 mr-2 mb-4">
                    <div className="flex items-center gap-3">
                        {rmas.length > 1 && (
                            <button
                                onClick={() => {
                                    if (selectedIds.size === rmas.length) {
                                        setSelectedIds(new Set());
                                    } else {
                                        setSelectedIds(new Set(rmas.map(r => r.id)));
                                    }
                                }}
                                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0071e3] transition-colors"
                            >
                                {selectedIds.size === rmas.length ? <CheckSquare className="w-4 h-4 text-[#0071e3]" /> : <Square className="w-4 h-4" />}
                                เลือกทั้งหมด
                            </button>
                        )}
                        <h2 className="text-lg font-bold text-[#1d1d1f] dark:text-white">{t('claimsList.items')}</h2>
                    </div>
                    <button
                        onClick={() => setShowAddItemModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-semibold rounded-full shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        เพิ่มสินค้า
                    </button>
                </div>
                {rmas.map((item, index) => {
                    const isClosed = [RMAStatus.CLOSED, RMAStatus.REPAIRED, RMAStatus.REJECTED].includes(item.status);
                    const isExpanded = expandedRMAs.has(item.id);
                    const isSelected = selectedIds.has(item.id);

                    // เรียงลำดับประวัติให้ล่าสุดอยู่บนสุด
                    const sortedHistory = item.history ? [...item.history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];

                    return (
                        <div key={item.id} className={`bg-white dark:bg-[#1c1c1e] rounded-2xl p-6 transition-all hover:bg-gray-50 dark:hover:bg-[#2c2c2e] border-2 ${isSelected ? 'border-[#0071e3] ring-2 ring-[#0071e3]/20' : 'border-gray-100 dark:border-[#333]'}`}>
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <div className="flex-shrink-0 flex items-center gap-3">
                                    {rmas.length > 1 && (
                                        <button onClick={() => { const n = new Set(selectedIds); isSelected ? n.delete(item.id) : n.add(item.id); setSelectedIds(n); }} className="transition-transform hover:scale-110">
                                            {isSelected ? <CheckSquare className="w-5 h-5 text-[#0071e3]" /> : <Square className="w-5 h-5 text-gray-300 dark:text-gray-600" />}
                                        </button>
                                    )}
                                    {isClosed ? <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><CheckCircle2 className="w-5 h-5" /></div> : <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold">{index + 1}</div>}
                                </div>
                                <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                    <div><div className="font-bold text-lg text-[#1d1d1f] dark:text-white">{item.productModel}</div><div className="text-sm text-gray-500">{item.brand}</div><div className="mt-1 inline-block text-xs font-mono bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">S/N: {item.serialNumber}</div></div>
                                    <div>
                                        <div className="text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">{t('track.issueReported')}
                                        </div>
                                        <div className="text-sm text-gray-700 dark:text-gray-200 flex items-start gap-2"><AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" /><span className="line-clamp-2">{item.issueDescription}</span></div>
                                        {item.resolution?.rootCause && (
                                            <div className="mt-2">
                                                <div className="text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">{t('track.rootCause')}</div>
                                                <div className="text-sm text-gray-700 dark:text-gray-200 flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" /><span className="line-clamp-2">{item.resolution.rootCause}</span></div>
                                            </div>
                                        )}
                                        {item.resolution?.technicalNotes && (
                                            <div className="mt-2">
                                                <div className="text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">อาการหลังส่งศูนย์ (ศูนย์แจ้งกลับมา)</div>
                                                <div className="text-sm text-gray-700 dark:text-gray-200 flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" /><span className="line-clamp-2">{item.resolution.technicalNotes}</span></div>
                                            </div>
                                        )}
                                        <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                                            <Truck className="w-3 h-3" /> {t('submit.distributor')}:{' '}
                                            <span className="inline-flex items-center gap-1 ml-1">
                                                <span className="text-[#1d1d1f] dark:text-white font-medium">{item.distributor || '-'}</span>
                                            </span>
                                        </div>
                                        {/* Warranty Status */}
                                        <div className="mt-1 text-xs text-gray-400 flex items-center gap-1">
                                            <ShieldCheck className="w-3 h-3" /> {t('track.warrantyStatus')}:{' '}
                                            <span className="inline-flex items-center gap-1 ml-1">
                                                <span className={`font-medium ${item.repairCosts?.warrantyStatus === 'IN_WARRANTY' ? 'text-green-500' :
                                                    item.repairCosts?.warrantyStatus === 'OUT_OF_WARRANTY' ? 'text-orange-500' :
                                                        item.repairCosts?.warrantyStatus === 'VOID' ? 'text-red-500' :
                                                            'text-[#1d1d1f] dark:text-white'
                                                    }`}>{item.repairCosts?.warrantyStatus ? t(`warranty.${item.repairCosts.warrantyStatus}`) : '-'}</span>
                                            </span>
                                        </div>
                                        <div className="mt-2 text-xs text-gray-400 flex items-start gap-1 w-full">
                                            <FileText className="w-3 h-3 mt-1 flex-shrink-0" />
                                            <span className="font-bold uppercase mt-1 w-24 flex-shrink-0 truncate" title={t('track.internalNote') || 'Notes'}>{t('track.internalNote') || 'Notes'}:</span>
                                            <div className="flex-grow py-1 text-sm text-[#1d1d1f] dark:text-white whitespace-pre-line" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                                                {item.notes ? item.notes : <span className="text-gray-300 italic">ไม่มีบันทึก</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-shrink-0 flex flex-wrap items-center md:flex-col md:items-end gap-3 md:min-w-[140px]">
                                    <div className="group relative inline-block">
                                        <StatusBadge status={item.status} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => toggleHistory(item.id)}
                                            className={`p-2 rounded-xl transition-colors ${isExpanded ? 'bg-gray-200 dark:bg-white/20 text-gray-800 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500'}`}
                                            title="View Timeline"
                                        >
                                            <History className="w-4 h-4" />
                                        </button>
                                        {/* Delete Button */}
                                        <button
                                            onClick={async () => {
                                                if (!confirm('คุณต้องการลบรายการนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้')) return;
                                                try {
                                                    setLoading(true);
                                                    await MockDb.deleteRMA(item.id);
                                                    // Check remaining RMAs in this job
                                                    const allRMAs = await MockDb.getRMAs();
                                                    const decodedId = decodeURIComponent(jobId || '');
                                                    const remaining = allRMAs.filter(c =>
                                                        c.quotationNumber === decodedId ||
                                                        c.groupRequestId === decodedId ||
                                                        (c.id === decodedId)
                                                    );
                                                    if (remaining.length === 0) {
                                                        navigate('/admin/rmas');
                                                    } else {
                                                        setRMAs(remaining);
                                                        setLoading(false);
                                                    }
                                                } catch (err) {
                                                    console.error('Delete failed:', err);
                                                    alert('ลบไม่สำเร็จ: ' + (err instanceof Error ? err.message : 'Unknown error'));
                                                    setLoading(false);
                                                }
                                            }}
                                            className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                                            title="Delete RMA"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>

                                        <button
                                            onClick={() => handleEditClick(item)}
                                            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-400 hover:text-[#0071e3] transition-colors"
                                            title="Edit Details"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Expandable History Timeline */}
                            {isExpanded && (
                                <div className="mt-6 pt-6 border-t border-gray-200/50 dark:border-white/10 animate-fade-in">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 flex items-center gap-2"><Clock className="w-3 h-3" /> {t('track.activityLog')}</h3>
                                    <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-white/10 pl-2">
                                        {sortedHistory.length > 0 ? (
                                            sortedHistory.map((evt) => (
                                                <div key={evt.id} className="relative pl-8">
                                                    <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-[#1c1c1e] ${evt.type === 'STATUS_CHANGE' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                                    <div>
                                                        <p className="text-sm font-medium text-[#1d1d1f] dark:text-white">{evt.description}</p>
                                                        <p className="text-xs text-gray-400 mt-0.5">{new Date(evt.date).toLocaleString()} • {evt.user}</p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="pl-8 text-sm text-gray-400">{t('track.noHistory')}</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Distributor Picker Modal — Choose which items to create shipping label for */}
            {showDistributorPicker && (() => {
                const distGrouped: Record<string, RMA[]> = {};
                for (const r of rmas) {
                    const key = r.distributor || 'Unknown';
                    if (!distGrouped[key]) distGrouped[key] = [];
                    distGrouped[key].push(r);
                }
                const distributorNames = Object.keys(distGrouped);
                const selectedRmasArr = rmas.filter(r => selectedDistRmas.has(r.id));
                const selectedDistributors = [...new Set(selectedRmasArr.map(r => r.distributor || 'Unknown'))];

                return (
                    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-[#333] flex flex-col max-h-[80vh] overflow-hidden">
                            {/* Header */}
                            <div className="px-6 py-5 border-b border-gray-200 dark:border-[#333] bg-orange-50/50 dark:bg-orange-900/10">
                                <h3 className="text-lg font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                                    <Truck className="w-5 h-5 text-orange-500" /> เลือกรายการที่จะพิมพ์ใบปะหน้า
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">เลือกศูนย์ที่ต้องการ — เลือกหลายศูนย์ได้ ระบบจะสร้างใบปะหน้าแยกให้ทีละศูนย์</p>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto flex-1 space-y-4">
                                {distributorNames.map(distName => {
                                    const items = distGrouped[distName];
                                    const allSelected = items.every(r => selectedDistRmas.has(r.id));

                                    return (
                                        <div key={distName} className={`rounded-xl border-2 transition-all ${allSelected ? 'border-orange-400 dark:border-orange-500/60 bg-orange-50/50 dark:bg-orange-900/10' : 'border-gray-200 dark:border-[#333] bg-white dark:bg-[#2c2c2e]'}`}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newSet = new Set(selectedDistRmas);
                                                    if (allSelected) {
                                                        // Deselect this group
                                                        items.forEach(r => newSet.delete(r.id));
                                                    } else {
                                                        // Select this group
                                                        items.forEach(r => newSet.add(r.id));
                                                    }
                                                    setSelectedDistRmas(newSet);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3"
                                            >
                                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${allSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                                                    {allSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <div className="font-bold text-sm text-[#1d1d1f] dark:text-white">{distName}</div>
                                                    <div className="text-xs text-gray-500 mt-0.5">{items.length} รายการ</div>
                                                </div>
                                                <Package className="w-4 h-4 text-gray-400" />
                                            </button>
                                            {/* Show item details */}
                                            <div className="px-4 pb-3 space-y-1">
                                                {items.map(item => (
                                                    <div key={item.id} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 pl-8">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                                                        <span className="font-medium text-[#1d1d1f] dark:text-gray-300">{item.brand} {item.productModel}</span>
                                                        <span className="text-gray-400">S/N: {item.serialNumber || '-'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#2c2c2e] flex justify-between items-center gap-3">
                                <button onClick={() => setShowDistributorPicker(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">ยกเลิก</button>
                                <div className="text-xs text-gray-500">
                                    {selectedDistributors.length > 1 && <span className="text-orange-500 font-medium">📄 จะสร้าง {selectedDistributors.length} ใบ (ศูนย์ละ 1 ใบ)</span>}
                                </div>
                                <button
                                    disabled={selectedRmasArr.length === 0}
                                    onClick={() => {
                                        setShowDistributorPicker(false);
                                        if (selectedDistributors.length <= 1) {
                                            // Single distributor — open modal directly
                                            setShipmentTagRmas(selectedRmasArr);
                                            setShipmentTagTarget('DISTRIBUTOR');
                                            setIsShipmentTagModalOpen(true);
                                        } else {
                                            // Multiple distributors — pass all groups to modal with tabs
                                            const selectedGroups: Record<string, RMA[]> = {};
                                            for (const d of selectedDistributors) {
                                                selectedGroups[d] = distGrouped[d];
                                            }
                                            setShipmentDistGroups(selectedGroups);
                                            setShipmentTagRmas(selectedRmasArr);
                                            setShipmentTagTarget('DISTRIBUTOR');
                                            setIsShipmentTagModalOpen(true);
                                        }
                                    }}
                                    className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2 ${selectedRmasArr.length > 0 ? 'bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20' : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'}`}
                                >
                                    <Truck className="w-4 h-4" /> สร้างใบปะหน้า ({selectedDistributors.length > 1 ? `${selectedDistributors.length} ใบ` : `${selectedRmasArr.length} รายการ`})
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Shipment Tag Modal - Appears when "Print Shipping Label" is clicked */}
            {rmas.length > 0 && (
                <ShipmentTagModal
                    isOpen={isShipmentTagModalOpen}
                    onClose={() => {
                        setIsShipmentTagModalOpen(false);
                        setShowDistributorPicker(false);
                        setSelectedDistRmas(new Set());
                        setShipmentDistGroups(undefined);
                    }}
                    rma={shipmentTagRmas[0] || rmas[0]}
                    allRmas={shipmentTagRmas.length > 0 ? shipmentTagRmas : rmas}
                    onSave={handleSaveShipmentTagData}
                    targetType={shipmentTagTarget}
                    distributorGroups={shipmentDistGroups}
                />
            )}

            {/* Document Preview Popup */}
            {docPreviewHtml && (
                <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
                    {/* Toolbar */}
                    <div className="flex-shrink-0 flex flex-wrap items-center gap-2 md:gap-3 px-4 md:px-6 py-3 bg-white/90 dark:bg-[#1c1c1e]/95 backdrop-blur border-b border-gray-200 dark:border-white/10 shadow-sm">
                        <h2 className="text-gray-800 dark:text-white font-semibold text-base w-full sm:w-auto flex-1 mb-1 sm:mb-0">📋 Preview เอกสาร</h2>
                        {/* Copy Text Only (Facebook friendly) */}
                        <button
                            onClick={() => {
                                const rma0 = docPreviewRmas[0];
                                const jobIdVal = rma0?.groupRequestId || rma0?.id || '-';
                                const quotationVal = rma0?.quotationNumber || '-';
                                let textLines: string[] = [];
                                textLines.push(`เลขที่งานเคลม (Job ID): ${jobIdVal}`);
                                textLines.push(`เลขอ้างอิง/ใบเสนอราคา: ${quotationVal}`);
                                const actionMap: Record<string, string> = {
                                    'Replaced Component': 'ศูนย์เปลี่ยนอะไหล่',
                                    'Swapped Unit': 'เปลี่ยนเครื่อง (Swap)',
                                    'Software Update': 'อัพเดทซอฟต์แวร์',
                                    'No Fault Found': 'ไม่พบอาการเสีย(ส่งคืน)'
                                };
                                const formatAction = (action?: string) => action ? (actionMap[action] || action) : '-';
                                if (docPreviewType === 'CUSTOMER') {
                                    textLines.push(`ลูกค้า: ${rma0?.customerName || '-'}`);
                                    textLines.push('');
                                    textLines.push(`รายการสินค้า (${docPreviewRmas.length} ชิ้น):`);
                                    docPreviewRmas.forEach((r, i) => {
                                        textLines.push(`รายการ ${i + 1}:`);
                                        textLines.push(`   ${r.brand} รุ่น: ${r.productModel}`);
                                        textLines.push(`   S/N: ${r.serialNumber}`);
                                        textLines.push(`   อาการที่พบ: ${r.resolution?.rootCause || '-'}`);
                                        if (r.resolution?.actionTaken) {
                                            textLines.push(`   การดำเนินการ: ${formatAction(r.resolution.actionTaken)}`);
                                            if (r.resolution.actionDetails) textLines.push(`   รายละเอียด: ${r.resolution.actionDetails}`);
                                            if (r.resolution.replacedSerialNumber) textLines.push(`   S/N ใหม่: ${r.resolution.replacedSerialNumber}`);
                                        }
                                        if (i < docPreviewRmas.length - 1) textLines.push('');
                                    });
                                } else {
                                    // Group by distributor
                                    const distGrouped: Record<string, typeof docPreviewRmas> = {};
                                    for (const r of docPreviewRmas) {
                                        const key = r.distributor || 'Unknown';
                                        if (!distGrouped[key]) distGrouped[key] = [];
                                        distGrouped[key].push(r);
                                    }
                                    const distEntries = Object.entries(distGrouped);

                                    distEntries.forEach(([distName, items], groupIdx) => {
                                        if (groupIdx > 0) {
                                            textLines.push('');
                                            textLines.push('━━━━━━━━━━━━━━━━━━━━');
                                            textLines.push('');
                                            textLines.push(`เลขที่งานเคลม (Job ID): ${jobIdVal}`);
                                            textLines.push(`เลขอ้างอิง/ใบเสนอราคา: ${quotationVal}`);
                                        }
                                        textLines.push(`ผู้นำเข้า: ${distName}`);
                                        textLines.push('');
                                        textLines.push(`รายการสินค้า (${items.length} ชิ้น):`);
                                        items.forEach((r, i) => {
                                            textLines.push(`รายการ ${i + 1}:`);
                                            textLines.push(`   ${r.brand} รุ่น: ${r.productModel}`);
                                            textLines.push(`   S/N: ${r.serialNumber}`);
                                            textLines.push(`   อาการที่ลูกค้าแจ้ง: ${r.issueDescription || '-'}`);
                                            textLines.push(`   อาการที่พบ: ${r.resolution?.rootCause || '-'}`);
                                            if (r.resolution?.actionTaken) {
                                                textLines.push(`   การดำเนินการ: ${formatAction(r.resolution.actionTaken)}`);
                                                if (r.resolution.actionDetails) textLines.push(`   รายละเอียด: ${r.resolution.actionDetails}`);
                                                if (r.resolution.replacedSerialNumber) textLines.push(`   S/N ใหม่: ${r.resolution.replacedSerialNumber}`);
                                            }
                                            if (i < items.length - 1) textLines.push('');
                                        });
                                    });
                                }
                                navigator.clipboard.writeText(textLines.join('\n')).then(() => {
                                    showToast('คัดลอกข้อความแล้ว!', 'success');
                                }).catch(() => showToast('ไม่สามารถคัดลอกได้', 'error'));
                            }}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
                            title="คัดลอกเฉพาะข้อความ (ใช้กับ Facebook ได้)"
                        >
                            <Copy className="w-4 h-4" /> ข้อความ
                        </button>
                        {/* Copy Image — per-page buttons when multiple distributor pages */}
                        {(() => {
                            // Calculate distributor groups for DISTRIBUTOR type
                            const distGroups = docPreviewType === 'DISTRIBUTOR'
                                ? Object.entries(docPreviewRmas.reduce<Record<string, RMA[]>>((acc, r) => {
                                    const key = r.distributor || 'Unknown';
                                    if (!acc[key]) acc[key] = [];
                                    acc[key].push(r);
                                    return acc;
                                }, {}))
                                : [];
                            const hasMultiplePages = distGroups.length > 1;

                            if (hasMultiplePages) {
                                return distGroups.map(([distName], pageIdx) => (
                                    <button
                                        key={distName}
                                        onClick={async () => {
                                            if (!docPreviewHtml || isCopyingImage) return;
                                            setIsCopyingImage(true);
                                            try {
                                                const blob = await renderHtmlToBlob(docPreviewHtml, pageIdx);
                                                try {
                                                    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                                                    showToast(`คัดลอกรูป "${distName}" แล้ว!`, 'success');
                                                } catch {
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url; a.download = `rma-${jobId}-${distName}.png`; a.click();
                                                    URL.revokeObjectURL(url);
                                                    showToast(`ดาวน์โหลดรูป "${distName}" แล้ว`, 'info');
                                                }
                                            } catch (err) {
                                                console.error('Copy image failed:', err);
                                                showToast('ไม่สามารถสร้างรูปภาพได้ ลองปิดแล้วเปิดใหม่', 'error');
                                            } finally {
                                                setIsCopyingImage(false);
                                            }
                                        }}
                                        disabled={isCopyingImage}
                                        className={`px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors ${isCopyingImage ? 'opacity-60 cursor-wait' : ''}`}
                                        title={`คัดลอกรูปภาพ - ${distName}`}
                                    >
                                        {isCopyingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                                        📋 {distName}
                                    </button>
                                ));
                            }

                            // Single page — original button
                            return (
                                <button
                                    onClick={async () => {
                                        if (!docPreviewHtml || isCopyingImage) return;
                                        setIsCopyingImage(true);
                                        try {
                                            const blob = await renderHtmlToBlob(docPreviewHtml);
                                            try {
                                                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                                                showToast('คัดลอกรูปภาพแล้ว!', 'success');
                                            } catch {
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url; a.download = `rma-doc-${jobId}.png`; a.click();
                                                URL.revokeObjectURL(url);
                                                showToast('ดาวน์โหลดรูปภาพแล้ว', 'info');
                                            }
                                        } catch (err) {
                                            console.error('Copy image failed:', err);
                                            showToast('ไม่สามารถสร้างรูปภาพได้ ลองปิดแล้วเปิดใหม่', 'error');
                                        } finally {
                                            setIsCopyingImage(false);
                                        }
                                    }}
                                    disabled={isCopyingImage}
                                    className={`px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${isCopyingImage ? 'opacity-60 cursor-wait' : ''}`}
                                    title="คัดลอกเฉพาะรูปภาพ"
                                >
                                    {isCopyingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />} รูปภาพ
                                </button>
                            );
                        })()}
                        {/* Copy Both (LINE friendly) */}
                        <button
                            onClick={async () => {
                                if (!docPreviewHtml || isCopyingImage) return;
                                setIsCopyingImage(true);
                                try {
                                    const blob = await renderHtmlToBlob(docPreviewHtml);
                                    // Build text summary
                                    const rma0 = docPreviewRmas[0];
                                    const jobIdVal = rma0?.groupRequestId || rma0?.id || '-';
                                    const quotationVal = rma0?.quotationNumber || '-';
                                    let textLines: string[] = [];
                                    textLines.push(`เลขที่งานเคลม (Job ID): ${jobIdVal}`);
                                    textLines.push(`เลขอ้างอิง/ใบเสนอราคา: ${quotationVal}`);
                                    const actionMap: Record<string, string> = {
                                        'Replaced Component': 'ศูนย์เปลี่ยนอะไหล่',
                                        'Swapped Unit': 'เปลี่ยนเครื่อง (Swap)',
                                        'Software Update': 'อัพเดทซอฟต์แวร์',
                                        'No Fault Found': 'ไม่พบอาการเสีย(ส่งคืน)'
                                    };
                                    const formatAction = (action?: string) => action ? (actionMap[action] || action) : '-';
                                    if (docPreviewType === 'CUSTOMER') {
                                        textLines.push(`ลูกค้า: ${rma0?.customerName || '-'}`);
                                        textLines.push('');
                                        textLines.push(`รายการสินค้า (${docPreviewRmas.length} ชิ้น):`);
                                        docPreviewRmas.forEach((r, i) => {
                                            textLines.push(`รายการ ${i + 1}:`);
                                            textLines.push(`   ${r.brand} รุ่น: ${r.productModel}`);
                                            textLines.push(`   S/N: ${r.serialNumber}`);
                                            textLines.push(`   อาการที่พบ: ${r.resolution?.rootCause || '-'}`);
                                            if (r.resolution?.actionTaken) {
                                                textLines.push(`   การดำเนินการ: ${formatAction(r.resolution.actionTaken)}`);
                                                if (r.resolution.actionDetails) textLines.push(`   รายละเอียด: ${r.resolution.actionDetails}`);
                                                if (r.resolution.replacedSerialNumber) textLines.push(`   S/N ใหม่: ${r.resolution.replacedSerialNumber}`);
                                            }
                                            if (i < docPreviewRmas.length - 1) textLines.push('');
                                        });
                                    } else {
                                        // Group by distributor
                                        const distGrouped2: Record<string, typeof docPreviewRmas> = {};
                                        for (const r of docPreviewRmas) {
                                            const key = r.distributor || 'Unknown';
                                            if (!distGrouped2[key]) distGrouped2[key] = [];
                                            distGrouped2[key].push(r);
                                        }
                                        const distEntries2 = Object.entries(distGrouped2);

                                        distEntries2.forEach(([distName, items], groupIdx) => {
                                            if (groupIdx > 0) {
                                                textLines.push('');
                                                textLines.push('━━━━━━━━━━━━━━━━━━━━');
                                                textLines.push('');
                                                textLines.push(`เลขที่งานเคลม (Job ID): ${jobIdVal}`);
                                                textLines.push(`เลขอ้างอิง/ใบเสนอราคา: ${quotationVal}`);
                                            }
                                            textLines.push(`ผู้นำเข้า: ${distName}`);
                                            textLines.push('');
                                            textLines.push(`รายการสินค้า (${items.length} ชิ้น):`);
                                            items.forEach((r, i) => {
                                                textLines.push(`รายการ ${i + 1}:`);
                                                textLines.push(`   ${r.brand} รุ่น: ${r.productModel}`);
                                                textLines.push(`   S/N: ${r.serialNumber}`);
                                                textLines.push(`   อาการที่ลูกค้าแจ้ง: ${r.issueDescription || '-'}`);
                                                textLines.push(`   อาการที่พบ: ${r.resolution?.rootCause || '-'}`);
                                                if (r.resolution?.actionTaken) {
                                                    textLines.push(`   การดำเนินการ: ${formatAction(r.resolution.actionTaken)}`);
                                                    if (r.resolution.actionDetails) textLines.push(`   รายละเอียด: ${r.resolution.actionDetails}`);
                                                    if (r.resolution.replacedSerialNumber) textLines.push(`   S/N ใหม่: ${r.resolution.replacedSerialNumber}`);
                                                }
                                                if (i < items.length - 1) textLines.push('');
                                            });
                                        });
                                    }
                                    const copyText = textLines.join('\n');
                                    try {
                                        await navigator.clipboard.write([
                                            new ClipboardItem({
                                                'image/png': blob,
                                                'text/plain': new Blob([copyText], { type: 'text/plain' })
                                            })
                                        ]);
                                        showToast('คัดลอกรูป + ข้อความแล้ว! วางใน LINE ได้เลย', 'success');
                                    } catch {
                                        await navigator.clipboard.writeText(copyText);
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url; a.download = `rma-doc-${jobId}.png`; a.click();
                                        URL.revokeObjectURL(url);
                                        showToast('คัดลอกข้อความแล้ว + ดาวน์โหลดรูปแยก', 'info');
                                    }
                                } catch (err) {
                                    console.error('Copy failed:', err);
                                    showToast('ไม่สามารถสร้างรูปภาพได้ ลองปิดแล้วเปิดใหม่', 'error');
                                } finally {
                                    setIsCopyingImage(false);
                                }
                            }}
                            disabled={isCopyingImage || (docPreviewType === 'DISTRIBUTOR' && new Set(docPreviewRmas.map(r => r.distributor || 'Unknown')).size > 1)}
                            className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${
                                (docPreviewType === 'DISTRIBUTOR' && new Set(docPreviewRmas.map(r => r.distributor || 'Unknown')).size > 1)
                                    ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                    : `bg-emerald-500 hover:bg-emerald-600 text-white ${isCopyingImage ? 'opacity-60 cursor-wait' : ''}`
                            }`}
                            title={
                                (docPreviewType === 'DISTRIBUTOR' && new Set(docPreviewRmas.map(r => r.distributor || 'Unknown')).size > 1)
                                    ? 'มีหลายผู้นำเข้า — ใช้ปุ่มคัดลอกรูปแยกแต่ละใบแทน'
                                    : 'คัดลอกทั้งรูปภาพและข้อความ (สำหรับ LINE)'
                            }
                        >
                            {isCopyingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />} ทั้งหมด (LINE)
                        </button>
                        <button
                            onClick={() => {
                                const iframe = document.getElementById('doc-preview-iframe') as HTMLIFrameElement;
                                iframe?.contentWindow?.print();
                            }}
                            className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
                        >
                            🖨️ พิมพ์เอกสาร
                        </button>
                        <button
                            onClick={() => setDocPreviewHtml(null)}
                            className="px-5 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
                        >
                            <XIcon className="w-4 h-4" /> ปิด
                        </button>
                    </div>
                    {/* Warning banner for partial customer documents */}
                    {docPreviewType === 'CUSTOMER' && docPreviewRmas.length < rmas.length && (
                        <div className="flex-shrink-0 flex items-center gap-2 px-6 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800/40">
                            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                            <span className="text-sm text-amber-700 dark:text-amber-300">
                                แสดงเฉพาะงานที่ปิดแล้ว <strong>{docPreviewRmas.length}</strong> จาก <strong>{rmas.length}</strong> รายการ — อีก <strong>{rmas.length - docPreviewRmas.length}</strong> รายการยังไม่ได้ปิดงาน ไม่แสดงในเอกสาร
                            </span>
                        </div>
                    )}
                    {/* Preview Content - A4 */}
                    <div className="flex-1 overflow-auto flex justify-start lg:justify-center py-8 px-4 md:px-12 bg-gray-100/50 dark:bg-black/50">
                        <div className="origin-top flex justify-center" style={{ zoom: 'min(0.8, calc(100vw / 850))' }}>
                            <iframe
                                id="doc-preview-iframe"
                                srcDoc={`<html><head><title>Preview</title></head><body style="margin:0;padding:0;background:#f5f5f5;">${docPreviewHtml}</body></html>`}
                                className="border-0 shadow-2xl bg-white"
                                style={{
                                    width: '794px',
                                    minWidth: '794px',
                                    height: (() => {
                                        if (docPreviewType === 'DISTRIBUTOR') {
                                            const distCount = new Set(docPreviewRmas.map(r => r.distributor || 'Unknown')).size;
                                            return `${Math.max(1, distCount) * 1123}px`;
                                        }
                                        return '1123px';
                                    })()
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Add Item Modal */}
            {showAddItemModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => !isAddingItem && setShowAddItemModal(false)}>
                    <div className="bg-white dark:bg-[#1c1c1e] rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="sticky top-0 bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-md px-8 py-5 border-b border-gray-100 dark:border-gray-800 rounded-t-[2rem] flex items-center justify-between z-10">
                            <div>
                                <h2 className="text-lg font-bold text-[#1d1d1f] dark:text-white flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                        <Plus className="w-4 h-4 text-blue-500" />
                                    </div>
                                    เพิ่มสินค้าเข้า Job
                                </h2>
                                <p className="text-xs text-gray-400 mt-1 ml-11">เพิ่มรายการเข้า {jobInfo?.id}</p>
                            </div>
                            <button onClick={() => !isAddingItem && setShowAddItemModal(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                <XIcon className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="p-8">
                            {isAddingItem ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-[#0071e3]" />
                                    <span className="text-sm text-gray-500">กำลังเพิ่มสินค้า...</span>
                                </div>
                            ) : (
                                <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>}>
                                    <ProductEntryForm mode="admin" onAddItem={handleAddItemToJob} />
                                </Suspense>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ FLOATING BULK ACTIONS BAR ═══ */}
            <div className={`fixed bottom-0 left-0 right-0 z-[50] transition-all duration-300 ease-out ${selectedIds.size > 0 ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
                <div className="max-w-3xl mx-auto px-4 pb-6">
                    <div className="bg-[#1d1d1f] dark:bg-[#2c2c2e] text-white rounded-2xl px-6 py-4 shadow-2xl shadow-black/30 border border-white/10 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#0071e3] flex items-center justify-center text-sm font-bold">{selectedIds.size}</div>
                            <span className="text-sm font-medium">รายการที่เลือก</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowBulkStatusModal(true)}
                                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all active:scale-95"
                            >
                                <Zap className="w-3.5 h-3.5" /> เปลี่ยนสถานะ
                            </button>
                            <button
                                onClick={async () => {
                                    const selectedRMAs = rmas.filter(r => selectedIds.has(r.id));
                                    const hasClosed = selectedRMAs.some(r => r.status === RMAStatus.CLOSED);
                                    setIsBulkEditLocked(hasClosed);

                                    const first = selectedRMAs[0];
                                    const [dists, brands] = await Promise.all([
                                        MockDb.getDistributors(),
                                        MockDb.getBrands()
                                    ]);
                                    setBulkDistOptions(dists);
                                    setBulkBrandOptions([...brands, { value: 'Other', label: t('submit.other') || 'อื่นๆ' }]);

                                    const brandValues = brands.map((b: any) => b.value);
                                    let initialBrand = first?.brand || '';
                                    let initialCustomBrand = '';
                                    if (initialBrand && !brandValues.includes(initialBrand)) {
                                        initialCustomBrand = initialBrand;
                                        initialBrand = 'Other';
                                    }
                                    setBulkCustomBrand(initialCustomBrand);

                                    setBulkEditForm({
                                        brand: initialBrand,
                                        productModel: first?.productModel || '',
                                        serialNumber: first?.serialNumber || '',
                                        distributor: first?.distributor || '',
                                        issueDescription: first?.issueDescription || '',
                                        rootCause: first?.resolution?.rootCause || '',
                                        technicalNotes: first?.resolution?.technicalNotes || '',
                                        warrantyStatus: first?.repairCosts?.warrantyStatus || ''
                                    });
                                    setShowBulkEditModal(true);
                                }}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all active:scale-95"
                            >
                                <Edit3 className="w-3.5 h-3.5" /> แก้ไขรายละเอียด
                            </button>
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                                title="ยกเลิกการเลือก"
                            >
                                <XClose className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ BULK STATUS CHANGE MODAL ═══ */}
            {showBulkStatusModal && (() => {
                const selectedRMAs = rmas.filter(r => selectedIds.has(r.id));
                const allSameStatus = selectedRMAs.length > 0 && selectedRMAs.every(r => r.status === selectedRMAs[0].status);
                const commonStatus = allSameStatus ? selectedRMAs[0].status : null;

                const handleExecuteStatusChange = async (newStatus: RMAStatus, additionalUpdates?: Partial<RMA>, skipPopup = false) => {
                    if (newStatus === RMAStatus.RETURNED_FROM_VENDOR && !skipPopup) {
                        const first = selectedRMAs[0];
                        setBulkVendorForm({
                            actionTaken: '',
                            actionDetails: '',
                            replacedSerialNumber: '',
                            vendorTicketRef: first?.resolution?.vendorTicketRef || '',
                            restockCondition: ''
                        });
                        setBulkVendorTargetStatus(newStatus);
                        setShowBulkVendorPopup(true);
                        return;
                    }
                    setIsBulkUpdating(true);
                    try {
                        const user = MockDb.getCurrentUser()?.name || 'Admin';
                        const count = await MockDb.bulkUpdateStatus(Array.from(selectedIds), newStatus, user, additionalUpdates);
                        showToast(`อัปเดตสถานะ ${count} รายการสำเร็จ!`, 'success');
                        await refreshRMAs();
                        setShowBulkStatusModal(false);
                        setShowManualStatusInBulk(false);
                        setSelectedIds(new Set());
                    } catch (err) {
                        showToast('เกิดข้อผิดพลาด', 'error');
                    } finally {
                        setIsBulkUpdating(false);
                    }
                };

                return (
                    <>
                        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => {
                            if (!isBulkUpdating) {
                                setShowBulkStatusModal(false);
                                setShowManualStatusInBulk(false);
                            }
                        }}>
                            <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-[#333] overflow-hidden" onClick={e => e.stopPropagation()}>
                                <div className="px-6 py-5 border-b border-gray-100 dark:border-[#333] flex justify-between items-center bg-gray-50/50 dark:bg-white/[0.02]">
                                    <div>
                                        <h3 className="text-lg font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                                            <Zap className="w-5 h-5 text-orange-500" /> เปลี่ยนสถานะ {selectedIds.size} รายการ
                                        </h3>
                                        {commonStatus ? (
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <span className="text-[11px] text-gray-500">สถานะปัจจุบัน:</span>
                                                <span className="text-[11px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                                                    {t(`status.${commonStatus}`)}
                                                </span>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-500 mt-1">รายการที่เลือกมีสถานะที่แตกต่างกัน</p>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => { setShowBulkStatusModal(false); setShowManualStatusInBulk(false); }}
                                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <XClose className="w-5 h-5" />
                                    </button>
                                </div>
                                
                                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                                    {commonStatus && !showManualStatusInBulk ? (
                                        <div className="space-y-4">
                                            <div className="bg-blue-50/30 dark:bg-blue-900/5 border border-blue-100/50 dark:border-blue-900/10 rounded-2xl p-4">
                                                <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">ขั้นตอนถัดไป (แนะนำ)</h4>
                                                
                                                {commonStatus === RMAStatus.PENDING && (
                                                    <div className="space-y-2">
                                                        <p className="text-xs text-gray-400 mb-1">กดเพื่อเริ่มทำการตรวจสอบอาการสินค้าทั้งกลุ่ม</p>
                                                        <button
                                                            disabled={isBulkUpdating}
                                                            onClick={() => handleExecuteStatusChange(RMAStatus.DIAGNOSING)}
                                                            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-600/40 bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100/75 dark:hover:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-bold transition-all transform active:scale-[0.99] disabled:opacity-50"
                                                        >
                                                            <Search className="w-4 h-4" /> เริ่มตรวจสอบ ({selectedIds.size} รายการ)
                                                        </button>
                                                    </div>
                                                )}

                                                {commonStatus === RMAStatus.DIAGNOSING && (
                                                    <div className="space-y-3">
                                                        <p className="text-xs text-gray-400 mb-1">กรุณาเลือกขั้นตอนที่เหมาะสมหลังการตรวจเช็คอาการ</p>
                                                        <button
                                                            disabled={isBulkUpdating}
                                                            onClick={() => handleExecuteStatusChange(RMAStatus.WAITING_PARTS, { serviceType: 'EXTERNAL' })}
                                                            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border-2 border-dashed border-orange-300 dark:border-orange-600/40 bg-orange-50 dark:bg-orange-900/10 hover:bg-orange-100/75 dark:hover:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-sm font-bold transition-all transform active:scale-[0.99] disabled:opacity-50"
                                                        >
                                                            <Package className="w-4 h-4" /> ส่งเคลมศูนย์
                                                        </button>
                                                        <button
                                                            disabled={isBulkUpdating}
                                                            onClick={() => handleExecuteStatusChange(RMAStatus.REPAIRED, { serviceType: 'INTERNAL', resolution: { actionTaken: 'Software Update' } as any })}
                                                            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border-2 border-dashed border-green-300 dark:border-green-600/40 bg-green-50 dark:bg-green-900/10 hover:bg-green-100/75 dark:hover:bg-blue-900/20 text-green-700 dark:text-green-300 text-sm font-bold transition-all transform active:scale-[0.99] disabled:opacity-50"
                                                        >
                                                            <Wrench className="w-4 h-4" /> แก้ไข Config/Firmware (จบที่ร้าน)
                                                        </button>
                                                        <button
                                                            disabled={isBulkUpdating}
                                                            onClick={() => handleExecuteStatusChange(RMAStatus.REPAIRED, { serviceType: 'INTERNAL', resolution: { actionTaken: 'No Fault Found' } as any })}
                                                            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600/40 bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-700/30 text-gray-600 dark:text-gray-400 text-sm font-bold transition-all transform active:scale-[0.99] disabled:opacity-50"
                                                        >
                                                            <Undo2 className="w-4 h-4" /> ไม่พบอาการเสีย (ส่งคืน)
                                                        </button>
                                                    </div>
                                                )}

                                                {commonStatus === RMAStatus.WAITING_PARTS && (
                                                    <div className="space-y-3">
                                                        <p className="text-xs text-gray-400 mb-1">สถานะปัจจุบัน: รอศูนย์ สามารถสลับสต็อกให้ลูกค้าก่อนได้</p>
                                                        <button
                                                            disabled={isBulkUpdating}
                                                            onClick={() => handleExecuteStatusChange(RMAStatus.REPLACED_FROM_STOCK)}
                                                            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-600/40 bg-purple-50 dark:bg-purple-900/10 hover:bg-purple-100/75 dark:hover:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-sm font-bold transition-all transform active:scale-[0.99] disabled:opacity-50"
                                                        >
                                                            <RefreshCw className="w-4 h-4" /> สลับของสต็อกให้ลูกค้าเลย (Advance Replacement)
                                                        </button>
                                                        <p className="text-xs text-gray-400 mb-1">ของกลับจากศูนย์แล้ว กดเพื่อลงข้อมูลผลจากศูนย์</p>
                                                        <button
                                                            disabled={isBulkUpdating}
                                                            onClick={() => handleExecuteStatusChange(RMAStatus.RETURNED_FROM_VENDOR)}
                                                            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-600/40 bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100/75 dark:hover:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-bold transition-all transform active:scale-[0.99] disabled:opacity-50"
                                                        >
                                                            <PackageCheck className="w-4 h-4" /> รับของคืนจากศูนย์
                                                        </button>
                                                    </div>
                                                )}

                                                {commonStatus === RMAStatus.REPLACED_FROM_STOCK && (
                                                    <div className="space-y-2">
                                                        <p className="text-xs text-gray-400 mb-1">ของกลับจากศูนย์แล้ว นำของที่ได้กลับเข้าสต๊อกคืน</p>
                                                        <button
                                                            disabled={isBulkUpdating}
                                                            onClick={() => handleExecuteStatusChange(RMAStatus.RETURNED_FROM_VENDOR)}
                                                            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-600/40 bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100/75 dark:hover:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-bold transition-all transform active:scale-[0.99] disabled:opacity-50"
                                                        >
                                                            <PackageCheck className="w-4 h-4" /> รับของคืนจากศูนย์ (เข้าคลัง)
                                                        </button>
                                                    </div>
                                                )}

                                                {(commonStatus === RMAStatus.REPAIRED || commonStatus === RMAStatus.RETURNED_FROM_VENDOR) && (
                                                    <div className="space-y-2">
                                                        <p className="text-xs text-gray-400 mb-1">ตรวจสอบข้อมูลทั้งหมดก่อนปิดงาน กดเพื่อดูสรุปและยืนยัน</p>
                                                        <button
                                                            disabled={isBulkUpdating}
                                                            onClick={() => handleExecuteStatusChange(RMAStatus.CLOSED)}
                                                            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-bold shadow-lg shadow-green-500/20 transition-all transform active:scale-[0.98] disabled:opacity-50"
                                                        >
                                                            <ClipboardCheck className="w-4 h-4" /> ตรวจสอบและปิดงาน
                                                        </button>
                                                    </div>
                                                )}

                                                {commonStatus === RMAStatus.CLOSED && (
                                                    <p className="text-xs text-gray-400 text-center py-2">งานนี้ปิดเรียบร้อยแล้ว ไม่แนะนำให้เปลี่ยนสถานะต่อ</p>
                                                )}
                                            </div>

                                            <button 
                                                type="button" 
                                                onClick={() => setShowManualStatusInBulk(true)}
                                                className="w-full py-2.5 border border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl text-xs font-bold text-gray-500 hover:text-blue-500 flex items-center justify-center gap-1.5 transition-colors"
                                            >
                                                <Settings2 className="w-3.5 h-3.5" /> เปลี่ยนสถานะด้วยตนเอง
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center mb-1">
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">เลือกสถานะที่ต้องการเปลี่ยน:</p>
                                                {commonStatus && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setShowManualStatusInBulk(false)}
                                                        className="text-[11px] font-bold text-blue-500 hover:underline"
                                                    >
                                                        กลับไปขั้นตอนแนะนำ
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 gap-2">
                                                {[
                                                    { status: RMAStatus.PENDING, label: 'รับเรื่องแล้ว', color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200/75 dark:hover:bg-gray-700/50' },
                                                    { status: RMAStatus.DIAGNOSING, label: 'กำลังตรวจสอบ', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100/50 dark:hover:bg-blue-900/30' },
                                                    { status: RMAStatus.WAITING_PARTS, label: 'ส่งเคลมศูนย์แล้ว', color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100/50 dark:hover:bg-purple-900/30' },
                                                    { status: RMAStatus.REPLACED_FROM_STOCK, label: 'สลับของให้แล้ว (รอศูนย์)', color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-900/30' },
                                                    { status: RMAStatus.RETURNED_FROM_VENDOR, label: 'ของเคลมกลับมาแล้ว', color: 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 hover:bg-teal-100/50 dark:hover:bg-teal-900/30' },
                                                    { status: RMAStatus.REPAIRED, label: 'ซ่อมเสร็จ / พร้อมคืน', color: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100/50 dark:hover:bg-green-900/30' },
                                                    { status: RMAStatus.CLOSED, label: 'ปิดงาน (ลูกค้ารับของแล้ว)', color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30' },
                                                ].map(opt => (
                                                    <button
                                                        key={opt.status}
                                                        disabled={isBulkUpdating}
                                                        onClick={() => handleExecuteStatusChange(opt.status)}
                                                        className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] border border-transparent hover:border-gray-200 dark:hover:border-[#424245] ${opt.color}`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {isBulkUpdating && (
                                    <div className="px-6 py-4 bg-gray-50/50 dark:bg-white/[0.01] border-t border-gray-100 dark:border-[#333] flex items-center gap-2.5 text-sm text-gray-500 justify-center">
                                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> กำลังดำเนินการอัปเดตสถานะ...
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* BULK VENDOR RESULT POPUP */}
                        {showBulkVendorPopup && createPortal(
                            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 animate-fade-in font-sans" onClick={() => setShowBulkVendorPopup(false)}>
                                <div className="bg-white dark:bg-[#1e1e20] w-full max-w-lg rounded-[2rem] shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                                    <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 bg-blue-50/50 dark:bg-blue-900/10">
                                        <h3 className="text-xl font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                                            <PackageCheck className="w-6 h-6 text-blue-500" /> 📥 ลงผลจากศูนย์ (กลุ่ม {selectedIds.size} รายการ)
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">กรอกรายละเอียดผลการเคลมสำหรับทุกรายการที่เลือก</p>
                                    </div>
                                    <div className="p-8 space-y-5 overflow-y-auto">
                                        <div className="relative z-[90]">
                                            <GlassSelect 
                                                label="วิธีดำเนินการ" 
                                                value={bulkVendorForm.actionTaken} 
                                                onChange={val => setBulkVendorForm(p => ({ ...p, actionTaken: val }))} 
                                                options={[
                                                    { value: "Replaced Component", label: t('actions.replaced_component') || "เปลี่ยนอะไหล่" },
                                                    { value: "Swapped Unit", label: t('actions.swapped_unit') || "เปลี่ยนตัวใหม่" },
                                                    { value: "Software Update", label: t('actions.software_update') || "อัปเดตซอฟต์แวร์" },
                                                    { value: "No Fault Found", label: t('actions.no_fault_found') || "ไม่พบอาการเสีย" },
                                                    { value: "Other", label: t('submit.other') || "อื่นๆ" }
                                                ]} 
                                                placeholder="เลือกวิธีดำเนินการ" 
                                                searchable 
                                            />
                                        </div>
                                        {bulkVendorForm.actionTaken === 'Replaced Component' && (
                                            <div>
                                                <label className="block text-xs font-semibold text-orange-500 uppercase mb-1.5 ml-2">รายละเอียดการเปลี่ยนอะไหล่</label>
                                                <input type="text" value={bulkVendorForm.actionDetails} onChange={e => setBulkVendorForm(p => ({ ...p, actionDetails: e.target.value }))} className="w-full px-4 py-3.5 text-sm rounded-2xl outline-none bg-white dark:bg-[#2c2c2e] border border-orange-300 dark:border-orange-500/30 text-[#1d1d1f] dark:text-white" placeholder="เช่น เปลี่ยน Mainboard" />
                                            </div>
                                        )}
                                        {bulkVendorForm.actionTaken === 'Swapped Unit' && (
                                            <div>
                                                <label className="block text-xs font-semibold text-green-500 uppercase mb-1.5 ml-2 flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> S/N สินค้าตัวใหม่</label>
                                                <input type="text" value={bulkVendorForm.replacedSerialNumber} onChange={e => setBulkVendorForm(p => ({ ...p, replacedSerialNumber: e.target.value }))} className="w-full px-4 py-3.5 text-sm rounded-2xl outline-none bg-white dark:bg-[#2c2c2e] border border-green-300 dark:border-green-500/30 text-[#1d1d1f] dark:text-white" placeholder="ระบุ S/N สินค้าตัวใหม่" />
                                                <p className="text-[11px] text-orange-500 mt-1 ml-2 font-medium">⚠️ คำเตือน: ทุกรายการจะถูกแก้ไขเป็น S/N เดียวกันนี้</p>
                                            </div>
                                        )}
                                        {bulkVendorForm.actionTaken === 'Other' && (
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-2">ระบุวิธีดำเนินการ</label>
                                                <input type="text" value={bulkVendorForm.actionDetails} onChange={e => setBulkVendorForm(p => ({ ...p, actionDetails: e.target.value }))} className="w-full px-4 py-3.5 text-sm rounded-2xl outline-none bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] text-[#1d1d1f] dark:text-white" placeholder="ระบุ..." />
                                            </div>
                                        )}
                                        {selectedRMAs.some(r => r.status === RMAStatus.REPLACED_FROM_STOCK) && (
                                            <div>
                                                <label className="block text-xs font-semibold text-teal-500 uppercase mb-1.5 ml-2 flex items-center gap-1"><PackageCheck className="w-3.5 h-3.5" /> สภาพสินค้าที่ส่งกลับมา (เข้าคลัง)</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button type="button" onClick={() => setBulkVendorForm(p => ({ ...p, restockCondition: 'NEW' }))} className={`px-4 py-3 rounded-2xl text-sm font-medium border transition-colors ${bulkVendorForm.restockCondition === 'NEW' ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-500 text-teal-700 dark:text-teal-300' : 'bg-white dark:bg-[#2c2c2e] border-gray-200 dark:border-[#424245] text-gray-500 hover:border-teal-300'}`}>
                                                        ของใหม่แกะกล่อง (New)
                                                    </button>
                                                    <button type="button" onClick={() => setBulkVendorForm(p => ({ ...p, restockCondition: 'REFURBISHED' }))} className={`px-4 py-3 rounded-2xl text-sm font-medium border transition-colors ${bulkVendorForm.restockCondition === 'REFURBISHED' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 text-orange-700 dark:text-orange-300' : 'bg-white dark:bg-[#2c2c2e] border-gray-200 dark:border-[#424245] text-gray-500 hover:border-orange-300'}`}>
                                                        ซ่อมแล้ว (Refurbished)
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 ml-2">เลข RMA Vendor</label>
                                            <input type="text" value={bulkVendorForm.vendorTicketRef} onChange={e => setBulkVendorForm(p => ({ ...p, vendorTicketRef: e.target.value }))} className="w-full px-4 py-3.5 text-sm rounded-2xl outline-none bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] text-[#1d1d1f] dark:text-white" placeholder="เช่น RMA-SYN-9988" />
                                        </div>
                                    </div>
                                    <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#2c2c2e] flex justify-end gap-3">
                                        <button type="button" onClick={() => setShowBulkVendorPopup(false)} className="px-6 py-2.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">ยกเลิก</button>
                                        <button type="button" onClick={async () => {
                                            if (!bulkVendorForm.actionTaken) { showToast('⚠️ กรุณาเลือกวิธีดำเนินการ', 'error'); return; }
                                            if (selectedRMAs.some(r => r.status === RMAStatus.REPLACED_FROM_STOCK) && !bulkVendorForm.restockCondition) { showToast('⚠️ กรุณาเลือกสภาพสินค้าที่ส่งกลับมา', 'error'); return; }
                                            
                                            // Apply bulk vendor form to updates
                                            const updates: Partial<RMA> = {
                                                resolution: {
                                                    actionTaken: bulkVendorForm.actionTaken === 'Other' ? bulkVendorForm.actionDetails : bulkVendorForm.actionTaken,
                                                    actionDetails: bulkVendorForm.actionTaken === 'Replaced Component' ? bulkVendorForm.actionDetails : '',
                                                    replacedSerialNumber: bulkVendorForm.replacedSerialNumber || '',
                                                    vendorTicketRef: bulkVendorForm.vendorTicketRef || '',
                                                    restockCondition: bulkVendorForm.restockCondition || undefined
                                                } as any
                                            };
                                            
                                            setShowBulkVendorPopup(false);
                                            await handleExecuteStatusChange(bulkVendorTargetStatus, updates, true);
                                        }} className="px-8 py-2.5 rounded-full text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
                                            <Check className="w-4 h-4" /> บันทึกผล
                                        </button>
                                    </div>
                                </div>
                            </div>,
                            document.body
                        )}
                    </>
                );
            })()}

            {/* ═══ BULK EDIT FIELDS MODAL ═══ */}
            {showBulkEditModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => !isBulkUpdating && setShowBulkEditModal(false)}>
                    <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-[#333] overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-[#333]">
                            <h3 className="text-lg font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                                <Edit3 className="w-5 h-5 text-blue-500" /> แก้ไขรายละเอียด {selectedIds.size} รายการ
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">ข้อมูลที่กรอกจะถูกอัปเดตให้ทุกรายการที่เลือก</p>
                        </div>
                        {isBulkEditLocked && (
                            <div className="mx-6 mt-4 flex items-center justify-between gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-600/40 rounded-2xl px-5 py-3">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-lg">⚠️</span>
                                    <div>
                                        <p className="font-semibold text-amber-800 dark:text-amber-300 text-xs">มีรายการที่ปิดงานแล้วเลือกอยู่ — ข้อมูลถูกล็อค</p>
                                        <p className="text-amber-600 dark:text-amber-400 text-[10px] mt-0.5">กดปลดล็อคเพื่อแก้ไขข้อมูล</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsBulkEditLocked(false)} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs flex items-center gap-1 transition-colors whitespace-nowrap">
                                    🔓 ปลดล็อค
                                </button>
                            </div>
                        )}
                        <div className="p-6 space-y-4">
                            <fieldset disabled={isBulkEditLocked} className={`space-y-4 ${isBulkEditLocked ? 'opacity-65 pointer-events-none' : ''}`}>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">ยี่ห้อ (Brand)</label>
                                <select
                                    value={bulkEditForm.brand}
                                    onChange={e => setBulkEditForm(p => ({ ...p, brand: e.target.value }))}
                                    className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-3 text-sm"
                                >
                                    <option value="">— ไม่เปลี่ยน —</option>
                                    {bulkBrandOptions.map((b: any) => (
                                        <option key={b.value} value={b.value}>{b.label}</option>
                                    ))}
                                </select>
                                {bulkEditForm.brand === 'Other' && (
                                    <input
                                        type="text"
                                        value={bulkCustomBrand}
                                        onChange={e => setBulkCustomBrand(e.target.value)}
                                        className="mt-2 w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-3 text-sm"
                                        placeholder="ระบุยี่ห้ออื่น ๆ..."
                                    />
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">รุ่น (Model)</label>
                                <input
                                    type="text"
                                    value={bulkEditForm.productModel}
                                    onChange={e => setBulkEditForm(p => ({ ...p, productModel: e.target.value.replace(/[^\x20-\x7E]/g, '').toUpperCase() }))}
                                    className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-3 text-sm uppercase"
                                    placeholder="เว้นว่างถ้าไม่ต้องการเปลี่ยน"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">S/N (Serial Number)</label>
                                <input
                                    type="text"
                                    value={bulkEditForm.serialNumber}
                                    onChange={e => setBulkEditForm(p => ({ ...p, serialNumber: e.target.value.replace(/[^\x20-\x7E]/g, '').toUpperCase() }))}
                                    className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-3 text-sm font-mono uppercase"
                                    placeholder="เว้นว่างถ้าไม่ต้องการเปลี่ยน"
                                />
                                {selectedIds.size > 1 && (
                                    <p className="text-[10px] text-amber-500 mt-1">
                                        ⚠️ เลือก {selectedIds.size} รายการ: หากระบุ S/N จะเปลี่ยนทุกรายการเป็น S/N เดียวกันทั้งหมด
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">ผู้นำเข้า / ประกันศูนย์</label>
                                <select
                                    value={bulkEditForm.distributor}
                                    onChange={e => setBulkEditForm(p => ({ ...p, distributor: e.target.value }))}
                                    className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-3 text-sm"
                                >
                                    <option value="">— ไม่เปลี่ยน —</option>
                                    {bulkDistOptions.map((d: any) => (
                                        <option key={d.value} value={d.value}>{d.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">อาการที่แจ้ง (ลูกค้าแจ้งมา)</label>
                                <textarea
                                    value={bulkEditForm.issueDescription}
                                    onChange={e => setBulkEditForm(p => ({ ...p, issueDescription: e.target.value }))}
                                    className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-3 text-sm"
                                    rows={2}
                                    placeholder="เว้นว่างถ้าไม่ต้องการเปลี่ยน"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">อาการที่พบ (พนักงานตรวจ)</label>
                                <textarea
                                    value={bulkEditForm.rootCause}
                                    onChange={e => setBulkEditForm(p => ({ ...p, rootCause: e.target.value }))}
                                    className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-3 text-sm"
                                    rows={2}
                                    placeholder="เว้นว่างถ้าไม่ต้องการเปลี่ยน"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">อาการหลังส่งศูนย์ (ศูนย์แจ้งกลับมา)</label>
                                <textarea
                                    value={bulkEditForm.technicalNotes}
                                    onChange={e => setBulkEditForm(p => ({ ...p, technicalNotes: e.target.value }))}
                                    className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-3 text-sm"
                                    rows={2}
                                    placeholder="เว้นว่างถ้าไม่ต้องการเปลี่ยน"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">สถานะประกัน</label>
                                <select
                                    value={bulkEditForm.warrantyStatus}
                                    onChange={e => setBulkEditForm(p => ({ ...p, warrantyStatus: e.target.value }))}
                                    className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-[#424245] rounded-xl px-4 py-3 text-sm"
                                >
                                    <option value="">— ไม่เปลี่ยน —</option>
                                    <option value="IN_WARRANTY">อยู่ในประกัน (In Warranty)</option>
                                    <option value="OUT_OF_WARRANTY">หมดประกัน (Out of Warranty)</option>
                                    <option value="VOID">ประกัน Void</option>
                                </select>
                            </div>
                            </fieldset>
                        </div>
                        <div className="px-6 pb-6 flex justify-end gap-2">
                            <button onClick={() => setShowBulkEditModal(false)} className="px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">ยกเลิก</button>
                            <button
                                disabled={isBulkUpdating || isBulkEditLocked}
                                onClick={async () => {
                                    setIsBulkUpdating(true);
                                    try {
                                        const updates: Partial<RMA> = {};
                                        const finalBrand = bulkEditForm.brand === 'Other' ? bulkCustomBrand : bulkEditForm.brand;
                                        if (finalBrand.trim()) updates.brand = finalBrand.trim();
                                        if (bulkEditForm.productModel.trim()) updates.productModel = bulkEditForm.productModel.trim();
                                        if (bulkEditForm.serialNumber.trim()) updates.serialNumber = bulkEditForm.serialNumber.trim();
                                        if (bulkEditForm.distributor.trim()) updates.distributor = bulkEditForm.distributor.trim();
                                        if (bulkEditForm.issueDescription.trim()) updates.issueDescription = bulkEditForm.issueDescription.trim();
                                        if (bulkEditForm.rootCause.trim() || bulkEditForm.technicalNotes.trim()) {
                                            (updates as any).resolution = {
                                                ...(bulkEditForm.rootCause.trim() ? { rootCause: bulkEditForm.rootCause.trim() } : {}),
                                                ...(bulkEditForm.technicalNotes.trim() ? { technicalNotes: bulkEditForm.technicalNotes.trim() } : {})
                                            };
                                        }
                                        if (bulkEditForm.warrantyStatus) {
                                            updates.repairCosts = { warrantyStatus: bulkEditForm.warrantyStatus as any } as any;
                                        }
                                        if (Object.keys(updates).length === 0) {
                                            showToast('กรุณากรอกข้อมูลที่ต้องการเปลี่ยน', 'error');
                                            setIsBulkUpdating(false);
                                            return;
                                        }
                                        const user = MockDb.getCurrentUser()?.name || 'Admin';
                                        const count = await MockDb.bulkUpdateFields(Array.from(selectedIds), updates, user);
                                        showToast(`อัปเดต ${count} รายการสำเร็จ!`, 'success');
                                        await refreshRMAs();
                                        setShowBulkEditModal(false);
                                        setSelectedIds(new Set());
                                    } catch (err) {
                                        showToast('เกิดข้อผิดพลาด', 'error');
                                    } finally {
                                        setIsBulkUpdating(false);
                                    }
                                }}
                                className="px-6 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isBulkUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isBulkUpdating ? 'กำลังบันทึก...' : `บันทึก (${selectedIds.size} รายการ)`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

