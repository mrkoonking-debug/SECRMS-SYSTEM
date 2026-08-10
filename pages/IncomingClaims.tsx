import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { MockDb, matchesSmartRef } from '../services/mockDb';
import { RMA, Team } from '../types';
import { Package, User, Clock, ArrowRight, CheckCircle2, Loader2, Info, ChevronRight, ChevronDown, Check, Box, Layers, Wifi, Zap, ShoppingBag, Truck, Pencil, Trash2, X, Search, ChevronLeft, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { GlassSelect } from '../components/GlassSelect';
import { showToast } from '../services/toast';

interface GroupedJob {
    groupId: string;
    rmas: RMA[];
    customerName: string;
    customerEmail: string;
    createdAt: string;
    quotationNumber: string;
}

export const IncomingClaims: React.FC = () => {
    const [incoming, setIncoming] = useState<RMA[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

    // Search and Filter States
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [brandFilter, setBrandFilter] = useState('ALL');

    // DOM Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState<number>(20);

    const searchTimerRef = useRef<any>(null);

    // Edit Modal States
    const [editingJob, setEditingJob] = useState<GroupedJob | null>(null);
    const [editingRMA, setEditingRMA] = useState<RMA | null>(null);
    const [jobForm, setJobForm] = useState({ customerName: '', contactPerson: '', phone: '', email: '', returnAddress: '', quotationNumber: '' });
    const [rmaForm, setRmaForm] = useState({ brand: '', productModel: '', serialNumber: '', issueDescription: '' });
    const [isSaving, setIsSaving] = useState(false);

    // UI Selection State
    const [selectedMainGroup, setSelectedMainGroup] = useState<'A' | 'B' | 'C' | ''>('');
    const [finalTeam, setFinalTeam] = useState<Team | ''>('');
    const [selectedDistributor, setSelectedDistributor] = useState('');
    const [customDistributor, setCustomDistributor] = useState('');
    const [distOptions, setDistOptions] = useState<any[]>([]);
    const [brandOptions, setBrandOptions] = useState<string[]>([]);

    const [isAssigning, setIsAssigning] = useState(false);
    const { t } = useLanguage();

    const handleSearchChange = useCallback((value: string) => {
        setSearch(value);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => setDebouncedSearch(value), 300);
    }, []);

    const handleClearSearch = useCallback(() => {
        setSearch('');
        setDebouncedSearch('');
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, brandFilter, pageSize]);

    // Load distributor & brand options
    useEffect(() => {
        const loadOptions = async () => {
            const [dists, brands] = await Promise.all([
                MockDb.getDistributors(),
                MockDb.getBrands()
            ]);
            setDistOptions([...dists, { value: 'Other', label: t('submit.other') }]);
            const names = brands.map(b => b.label || b.value);
            const defaultBrands = ['Hikvision', 'Dahua', 'Ruijie', 'Ezviz', 'Imou', 'Hilook', 'อื่นๆ'];
            setBrandOptions(Array.from(new Set([...names, ...defaultBrands])));
        };
        loadOptions();
    }, [t]);

    const brandSelectOptions = useMemo(() => {
        const list = [...brandOptions];
        if (rmaForm.brand && !list.includes(rmaForm.brand)) {
            list.unshift(rmaForm.brand);
        }
        return list.map(b => ({ value: b, label: b }));
    }, [brandOptions, rmaForm.brand]);

    const fetchIncoming = async () => {
        setLoading(true);
        const data = await MockDb.getUnassignedRMAs();
        setIncoming(data);
        setLoading(false);
    };

    useEffect(() => { fetchIncoming(); }, []);

    // Filter incoming RMAs across full dataset
    const filteredIncoming = useMemo(() => {
        return incoming.filter(rma => {
            if (!rma) return false;
            // Brand filter
            if (brandFilter !== 'ALL' && rma.brand?.toLowerCase() !== brandFilter.toLowerCase()) {
                return false;
            }
            // Multi-field search
            if (debouncedSearch.trim()) {
                const term = debouncedSearch.toLowerCase().trim();
                const match =
                    matchesSmartRef(rma.id, term) ||
                    matchesSmartRef(rma.groupRequestId, term) ||
                    matchesSmartRef(rma.quotationNumber, term) ||
                    matchesSmartRef(rma.serialNumber, term) ||
                    (rma.customerName && rma.customerName.toLowerCase().includes(term)) ||
                    (rma.contactPerson && rma.contactPerson.toLowerCase().includes(term)) ||
                    (rma.customerPhone && rma.customerPhone.includes(term)) ||
                    (rma.customerEmail && rma.customerEmail.toLowerCase().includes(term)) ||
                    (rma.productModel && rma.productModel.toLowerCase().includes(term)) ||
                    (rma.brand && rma.brand.toLowerCase().includes(term)) ||
                    (rma.issueDescription && rma.issueDescription.toLowerCase().includes(term));
                if (!match) return false;
            }
            return true;
        });
    }, [incoming, debouncedSearch, brandFilter]);

    // Group filtered rmas by groupRequestId
    const groupedJobs: GroupedJob[] = useMemo(() => {
        const map = new Map<string, RMA[]>();
        filteredIncoming.forEach(rma => {
            const key = rma.groupRequestId || rma.id;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(rma);
        });
        return Array.from(map.entries()).map(([groupId, rmas]) => ({
            groupId,
            rmas,
            customerName: rmas[0].customerName,
            customerEmail: rmas[0].customerEmail,
            createdAt: rmas[0].createdAt,
            quotationNumber: rmas[0].quotationNumber || 'N/A',
        }));
    }, [filteredIncoming]);

    // Total grouped jobs
    const totalJobsCount = groupedJobs.length;

    // Apply pagination slicing
    const totalPages = pageSize === -1 ? 1 : Math.ceil(totalJobsCount / pageSize) || 1;
    const activePage = Math.min(currentPage, totalPages);

    const paginatedGroupedJobs = useMemo(() => {
        if (pageSize === -1) return groupedJobs;
        const start = (activePage - 1) * pageSize;
        return groupedJobs.slice(start, start + pageSize);
    }, [groupedJobs, activePage, pageSize]);

    const resetSelection = () => {
        setSelectedGroupId(null);
        setSelectedMainGroup('');
        setFinalTeam('');
        setSelectedDistributor('');
        setCustomDistributor('');
    };

    const handleMainGroupSelect = (group: 'A' | 'B' | 'C') => {
        setSelectedMainGroup(group);
        if (group === 'A') setFinalTeam(Team.HIKVISION);
        else if (group === 'B') setFinalTeam(Team.DAHUA);
        else setFinalTeam('');
    };

    const handleAssignGroup = async (job: GroupedJob) => {
        if (!finalTeam) return;
        setIsAssigning(true);

        for (const rma of job.rmas) {
            await MockDb.updateRMA(rma.id, {
                team: finalTeam as Team,
                updatedAt: new Date().toISOString()
            });

            await MockDb.addTimelineEvent(rma.id, {
                type: 'SYSTEM',
                description: `พนักงานรับเรื่องเข้าทีม: ${t(`teams.${finalTeam.toLowerCase()}`)}`,
                user: MockDb.getCurrentUser()?.name || 'Staff'
            });
        }

        resetSelection();
        setExpandedGroupId(null);
        setIsAssigning(false);
        await fetchIncoming();
    };

    const toggleExpand = (groupId: string) => {
        setExpandedGroupId(prev => prev === groupId ? null : groupId);
    };

    // Delete Handlers
    const handleDeleteJob = async (job: GroupedJob, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`คุณต้องการลบรายการแจ้งเคลมของ "${job.customerName}" (${job.rmas.length} รายการ) ใช่หรือไม่?`)) return;
        try {
            setLoading(true);
            for (const rma of job.rmas) {
                await MockDb.deleteRMA(rma.id);
            }
            showToast('ลบรายการแจ้งเคลมเรียบร้อยแล้ว', 'success');
            await fetchIncoming();
        } catch (err) {
            console.error('Delete job error:', err);
            showToast('เกิดข้อผิดพลาดในการลบรายการ', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRMA = async (rma: RMA, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`คุณต้องการลบรายการสินค้า "${rma.productModel} (${rma.serialNumber})" ใช่หรือไม่?`)) return;
        try {
            setLoading(true);
            await MockDb.deleteRMA(rma.id);
            showToast('ลบรายการสินค้าเรียบร้อยแล้ว', 'success');
            await fetchIncoming();
        } catch (err) {
            console.error('Delete RMA error:', err);
            showToast('เกิดข้อผิดพลาดในการลบรายการ', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Edit Handlers
    const startEditJob = (job: GroupedJob, e: React.MouseEvent) => {
        e.stopPropagation();
        const firstRMA = job.rmas[0];
        setJobForm({
            customerName: firstRMA.customerName || '',
            contactPerson: firstRMA.contactPerson || '',
            phone: firstRMA.customerPhone || '',
            email: firstRMA.customerEmail || '',
            returnAddress: firstRMA.customerReturnAddress || firstRMA.customerAddress || '',
            quotationNumber: firstRMA.quotationNumber || ''
        });
        setEditingJob(job);
    };

    const handleSaveJobEdit = async () => {
        if (!editingJob) return;
        setIsSaving(true);
        try {
            for (const rma of editingJob.rmas) {
                await MockDb.updateRMA(rma.id, {
                    customerName: jobForm.customerName,
                    contactPerson: jobForm.contactPerson,
                    customerPhone: jobForm.phone,
                    customerEmail: jobForm.email,
                    customerReturnAddress: jobForm.returnAddress,
                    quotationNumber: jobForm.quotationNumber,
                    updatedAt: new Date().toISOString()
                });
            }
            showToast('อัปเดตข้อมูลลูกค้าเรียบร้อยแล้ว', 'success');
            setEditingJob(null);
            await fetchIncoming();
        } catch (err) {
            console.error('Save job edit error:', err);
            showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const startEditRMA = (rma: RMA, e: React.MouseEvent) => {
        e.stopPropagation();
        setRmaForm({
            brand: rma.brand || '',
            productModel: rma.productModel || '',
            serialNumber: rma.serialNumber || '',
            issueDescription: rma.issueDescription || ''
        });
        setEditingRMA(rma);
    };

    const handleSaveRMAEdit = async () => {
        if (!editingRMA) return;
        setIsSaving(true);
        try {
            await MockDb.updateRMA(editingRMA.id, {
                brand: rmaForm.brand,
                productModel: rmaForm.productModel,
                serialNumber: rmaForm.serialNumber,
                issueDescription: rmaForm.issueDescription,
                updatedAt: new Date().toISOString()
            });
            showToast('อัปเดตข้อมูลสินค้าเรียบร้อยแล้ว', 'success');
            setEditingRMA(null);
            await fetchIncoming();
        } catch (err) {
            console.error('Save rma edit error:', err);
            showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="p-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-[#0071e3]" /></div>;

    return (
        <div className="max-w-[1600px] w-full mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-8 pb-6">
            <div className="mb-5 md:mb-8">
                <h1 className="text-xl md:text-3xl font-bold text-[#1d1d1f] dark:text-white mb-1 md:mb-2">{t('incoming.title')}</h1>
                <p className="text-xs md:text-base text-gray-500">{t('incoming.subtitle')}</p>
            </div>

            {/* Search and Brand Filter Controls */}
            <div className="bg-white dark:bg-[#16161a] rounded-2xl md:rounded-[24px] border border-gray-200/60 dark:border-white/[0.08] p-3 shadow-sm mb-6 space-y-3">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full flex-1">
                        <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <input
                            type="text"
                            placeholder="ค้นหาตามชื่อลูกค้า, เบอร์โทร, Ref #, S/N, รุ่นสินค้า, อาการเสีย..."
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="w-full bg-transparent border-none rounded-xl py-2 pl-10 pr-10 text-sm dark:text-white focus:ring-0"
                        />
                        {search && (
                            <button
                                onClick={handleClearSearch}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-xs font-semibold text-gray-400 whitespace-nowrap">ยี่ห้อ:</span>
                        <select
                            value={brandFilter}
                            onChange={(e) => setBrandFilter(e.target.value)}
                            className="bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/10 text-xs font-bold rounded-xl px-3 py-2 text-gray-700 dark:text-white focus:ring-0 w-full sm:w-auto"
                        >
                            <option value="ALL">ยี่ห้อทั้งหมด</option>
                            {brandOptions.map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 dark:border-white/5 pt-2 px-1">
                    <div>
                        พบงานรอดำเนินการ <span className="font-bold text-[#0071e3]">{totalJobsCount}</span> ใบงาน ({filteredIncoming.length} รายการสินค้า)
                    </div>
                    {pageSize !== -1 && totalPages > 1 && (
                        <div>หน้า {activePage} / {totalPages}</div>
                    )}
                </div>
            </div>

            {totalJobsCount === 0 ? (
                <div className="glass-panel p-12 md:p-20 text-center rounded-2xl md:rounded-[3rem]">
                    <div className="w-14 h-14 md:w-20 md:h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                        <CheckCircle2 className="w-7 h-7 md:w-10 md:h-10 text-gray-400" />
                    </div>
                    <h3 className="text-base md:text-xl font-bold text-gray-400">{t('incoming.noIncoming')}</h3>
                </div>
            ) : (
                <div className="space-y-4 md:space-y-6">
                    {paginatedGroupedJobs.map((job) => {
                        const isExpanded = expandedGroupId === job.groupId;
                        const isSelected = selectedGroupId === job.groupId;

                        return (
                            <div key={job.groupId} className={`glass-panel overflow-hidden transition-all duration-300 ${isSelected ? 'ring-2 ring-[#0071e3] scale-[1.01] shadow-2xl' : 'hover:scale-[1.005]'}`}>
                                <div className="p-3.5 md:p-8 flex flex-col gap-3 md:gap-6">
                                    {/* Summary Row */}
                                    <div className="flex flex-col gap-3 md:gap-6">
                                        <div className="flex-1 space-y-2 md:space-y-4 cursor-pointer" onClick={() => toggleExpand(job.groupId)}>
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2.5">
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[9px] md:text-[10px] font-bold text-[#0071e3] uppercase tracking-widest mb-0.5 md:mb-1 flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0"></div>
                                                        {t('incoming.receivedFrom')}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-base md:text-2xl font-bold text-[#1d1d1f] dark:text-white break-words">
                                                            {job.customerName}
                                                        </h3>

                                                        {/* Quick Action Buttons for Job Customer Info */}
                                                        <div className="flex items-center gap-1 ml-2">
                                                            <button
                                                                onClick={(e) => startEditJob(job, e)}
                                                                title="แก้ไขข้อมูลลูกค้า"
                                                                className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5 text-[#0071e3]" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDeleteJob(job, e)}
                                                                title="ลบรายการแจ้งเคลมนี้"
                                                                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-500 transition-colors cursor-pointer"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 md:px-3 md:py-1 bg-[#0071e3]/10 text-[#0071e3] rounded-full text-[11px] md:text-sm font-bold">
                                                            <Package className="w-3 h-3 md:w-4 md:h-4" />
                                                            {job.rmas.length} {job.rmas.length === 1 ? 'item' : 'items'}
                                                        </span>
                                                    </div>
                                                    <div className="hidden md:block text-sm text-gray-500 mt-1">{job.customerEmail}</div>
                                                </div>
                                                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-none border-gray-150/10 dark:border-white/5 mt-1 sm:mt-0 w-full sm:w-auto">
                                                    <div className="text-[9px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mr-1 sm:mr-0">REF ID</div>
                                                    <div className="text-[11px] md:text-sm font-mono font-bold dark:text-gray-300 whitespace-nowrap">{job.groupId}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 md:gap-4 text-[10px] md:text-xs text-gray-400">
                                                <span className="flex items-center gap-1"><Clock className="w-3 h-3 md:w-3.5 md:h-3.5 text-blue-500" /> {new Date(job.createdAt).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                                <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                                                <span className={job.quotationNumber && job.quotationNumber !== 'N/A' ? '' : 'italic opacity-60'}>{job.quotationNumber && job.quotationNumber !== 'N/A' ? `QT: ${job.quotationNumber}` : 'ไม่มี Ref'}</span>
                                            </div>

                                            <button className="flex items-center gap-1.5 text-xs md:text-sm text-[#0071e3] font-semibold hover:underline transition-colors">
                                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                {isExpanded ? 'ซ่อนรายละเอียด' : `ดูรายละเอียด ${job.rmas.length} รายการ`}
                                            </button>
                                        </div>

                                        <div className="w-full sm:w-auto flex-shrink-0 flex items-center gap-2">
                                            {!isSelected && (
                                                <button
                                                    onClick={() => { setSelectedGroupId(job.groupId); setExpandedGroupId(job.groupId); }}
                                                    className="w-full sm:w-auto py-3 md:py-4 px-5 md:px-6 bg-[#1d1d1f] dark:bg-white text-white dark:text-black rounded-xl md:rounded-2xl text-sm md:text-base font-bold flex items-center justify-center gap-2 md:gap-3 transition-all hover:scale-105 active:scale-95 shadow-lg md:shadow-xl cursor-pointer"
                                                >
                                                    {t('incoming.assignBtn')}
                                                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Item Details */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-100 dark:border-white/5 pt-4 md:pt-6 animate-slide-up">
                                            <div className="space-y-2 md:space-y-3">
                                                {job.rmas.map((rma, idx) => (
                                                    <div key={rma.id} className="p-3 md:p-4 bg-gray-50 dark:bg-white/5 rounded-xl md:rounded-2xl flex flex-col md:flex-row md:items-center gap-2.5 md:gap-4 relative group">
                                                        <div className="w-8 h-8 rounded-full bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center text-sm font-bold flex-shrink-0">
                                                            {idx + 1}
                                                        </div>
                                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3 pr-16 md:pr-0">
                                                            <div>
                                                                <div className="text-[10px] font-extrabold text-[#0071e3] dark:text-blue-400 uppercase tracking-wider">{rma.brand}</div>
                                                                <div className="text-sm font-bold text-[#1d1d1f] dark:text-white leading-snug">{rma.productModel}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[10px] font-bold text-gray-400 uppercase">S/N</div>
                                                                <div className="text-sm font-mono text-[#1d1d1f] dark:text-gray-300">{rma.serialNumber}</div>
                                                            </div>
                                                            <div className="md:col-span-2">
                                                                <div className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><Info className="w-3 h-3" /> Issue</div>
                                                                <div className="text-sm text-[#1d1d1f] dark:text-gray-300 line-clamp-2">{rma.issueDescription}</div>
                                                            </div>
                                                        </div>

                                                        {/* Action buttons for individual item */}
                                                        <div className="flex items-center gap-1 self-end md:self-center">
                                                            <button
                                                                onClick={(e) => startEditRMA(rma, e)}
                                                                title="แก้ไขรายการสินค้านี้"
                                                                className="p-1.5 rounded-lg bg-white dark:bg-[#2c2c2e] hover:bg-gray-100 dark:hover:bg-white/20 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 transition-colors cursor-pointer"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5 text-[#0071e3]" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDeleteRMA(rma, e)}
                                                                title="ลบเฉพาะสินค้าชิ้นนี้"
                                                                className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 border border-red-200 dark:border-red-800/30 transition-colors cursor-pointer"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Team Selection UI */}
                                    {isSelected && (
                                        <div className="border-t border-gray-100 dark:border-white/5 pt-4 md:pt-8 animate-slide-up">
                                            <div className="mb-4 md:mb-6">
                                                <h4 className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-widest mb-3 md:mb-4">{t('incoming.selectTeamTitle')}</h4>
                                                <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-4">
                                                    <button
                                                        onClick={() => handleMainGroupSelect('A')}
                                                        className={`p-2.5 md:p-4 rounded-xl md:rounded-2xl border text-left transition-all flex flex-col md:flex-row items-center gap-2 md:gap-4 cursor-pointer ${selectedMainGroup === 'A' ? 'bg-white dark:bg-[#2c2c2e] border-red-500 ring-2 ring-red-500/20 shadow-lg' : 'bg-gray-50 dark:bg-white/5 border-transparent hover:bg-white dark:hover:bg-[#2c2c2e]'}`}
                                                    >
                                                        <div className={`p-2 md:p-3 rounded-lg md:rounded-xl ${selectedMainGroup === 'A' ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-400'}`}><Box className="w-4 h-4 md:w-6 md:h-6" /></div>
                                                        <div className="text-center md:text-left"><div className="font-bold text-xs md:text-base text-[#1d1d1f] dark:text-white">HIK</div><div className="text-[9px] md:text-[10px] text-gray-500">Team A</div></div>
                                                    </button>

                                                    <button
                                                        onClick={() => handleMainGroupSelect('B')}
                                                        className={`p-2.5 md:p-4 rounded-xl md:rounded-2xl border text-left transition-all flex flex-col md:flex-row items-center gap-2 md:gap-4 cursor-pointer ${selectedMainGroup === 'B' ? 'bg-white dark:bg-[#2c2c2e] border-orange-500 ring-2 ring-orange-500/20 shadow-lg' : 'bg-gray-50 dark:bg-white/5 border-transparent hover:bg-white dark:hover:bg-[#2c2c2e]'}`}
                                                    >
                                                        <div className={`p-2 md:p-3 rounded-lg md:rounded-xl ${selectedMainGroup === 'B' ? 'bg-orange-500 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-400'}`}><Layers className="w-4 h-4 md:w-6 md:h-6" /></div>
                                                        <div className="text-center md:text-left"><div className="font-bold text-xs md:text-base text-[#1d1d1f] dark:text-white">DAHUA</div><div className="text-[9px] md:text-[10px] text-gray-500">Team B</div></div>
                                                    </button>

                                                    <button
                                                        onClick={() => handleMainGroupSelect('C')}
                                                        className={`p-2.5 md:p-4 rounded-xl md:rounded-2xl border text-left transition-all flex flex-col md:flex-row items-center gap-2 md:gap-4 cursor-pointer ${selectedMainGroup === 'C' ? 'bg-white dark:bg-[#2c2c2e] border-blue-500 ring-2 ring-blue-500/20 shadow-lg' : 'bg-gray-50 dark:bg-white/5 border-transparent hover:bg-white dark:hover:bg-[#2c2c2e]'}`}
                                                    >
                                                        <div className={`p-2 md:p-3 rounded-lg md:rounded-xl ${selectedMainGroup === 'C' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-400'}`}><Wifi className="w-4 h-4 md:w-6 md:h-6" /></div>
                                                        <div className="text-center md:text-left"><div className="font-bold text-xs md:text-base text-[#1d1d1f] dark:text-white">Network</div><div className="text-[9px] md:text-[10px] text-gray-500">C / E / G</div></div>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Sub-Selection for Team C Group */}
                                            {selectedMainGroup === 'C' && (
                                                <div className="animate-fade-in mb-4 md:mb-8 pl-3 md:pl-6 border-l-4 border-blue-500/20 py-1 md:py-2">
                                                    <div className="text-[10px] md:text-xs font-black text-blue-500 uppercase mb-2 md:mb-4 tracking-widest">Select Specific Sub-Team</div>
                                                    <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-4">
                                                        {[
                                                            { val: Team.TEAM_C, label: t('teams.teamC'), icon: Wifi, color: 'cyan' },
                                                            { val: Team.TEAM_E, label: t('teams.teamE'), icon: Zap, color: 'yellow' },
                                                            { val: Team.TEAM_G, label: t('teams.teamG'), icon: ShoppingBag, color: 'fuchsia' }
                                                        ].map(sub => (
                                                            <button
                                                                key={sub.val}
                                                                onClick={() => setFinalTeam(sub.val)}
                                                                className={`p-2.5 md:p-4 rounded-lg md:rounded-xl border text-center md:text-left transition-all flex flex-col md:flex-row items-center gap-1.5 md:gap-3 cursor-pointer ${finalTeam === sub.val ? 'bg-white dark:bg-[#2c2c2e] border-[#0071e3] ring-1 ring-[#0071e3] shadow-md' : 'bg-white dark:bg-[#1c1c1e] border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}
                                                            >
                                                                <sub.icon className={`w-4 h-4 md:w-5 md:h-5 ${finalTeam === sub.val ? 'text-[#0071e3]' : 'text-gray-400'}`} />
                                                                <span className={`text-[11px] md:text-sm font-bold ${finalTeam === sub.val ? 'text-[#1d1d1f] dark:text-white' : 'text-gray-500'}`}>{sub.label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex flex-row justify-end items-center gap-2 md:gap-3 pt-2 md:pt-4">
                                                <button
                                                    onClick={resetSelection}
                                                    className="px-4 md:px-8 py-2 md:py-3 bg-gray-100 dark:bg-white/10 rounded-lg md:rounded-xl text-xs md:text-sm font-bold text-gray-500 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    disabled={!finalTeam || isAssigning}
                                                    onClick={() => handleAssignGroup(job)}
                                                    className="flex-1 sm:flex-none px-4 md:px-10 py-2 md:py-3 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-lg md:rounded-xl text-xs md:text-sm font-bold shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 md:gap-3 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 cursor-pointer"
                                                >
                                                    {isAssigning ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <><Check className="w-4 h-4 md:w-5 md:h-5" /> {t('incoming.assignBtn')} ({job.rmas.length} items)</>}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* DOM Pagination Bar */}
            {totalJobsCount > 0 && (
                <div className="mt-8 pt-4 border-t border-gray-200/60 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <span>แสดงใบงานต่อหน้า:</span>
                        <select 
                            value={pageSize} 
                            onChange={(e) => setPageSize(Number(e.target.value))}
                            className="bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:ring-[#0071e3]"
                        >
                            <option value={20}>20 ใบงาน</option>
                            <option value={50}>50 ใบงาน</option>
                            <option value={100}>100 ใบงาน</option>
                            <option value={-1}>ทั้งหมด ({totalJobsCount})</option>
                        </select>
                    </div>

                    {pageSize !== -1 && totalPages > 1 && (
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setCurrentPage(1)}
                                disabled={activePage === 1}
                                className="p-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-white/5"
                                title="หน้าแรก"
                            >
                                <ChevronsLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={activePage === 1}
                                className="p-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-white/5"
                                title="หน้าก่อนหน้า"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            <span className="px-3 py-1 font-bold text-gray-700 dark:text-gray-300">
                                {activePage} / {totalPages}
                            </span>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={activePage === totalPages}
                                className="p-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-white/5"
                                title="หน้าถัดไป"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={activePage === totalPages}
                                className="p-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-white/5"
                                title="หน้าสุดท้าย"
                            >
                                <ChevronsRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Modal: Edit Job Customer Info */}
            {editingJob && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-white/10 animate-scale-up">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-white/10">
                            <h3 className="font-bold text-lg text-[#1d1d1f] dark:text-white flex items-center gap-2">
                                <Pencil className="w-5 h-5 text-[#0071e3]" />
                                แก้ไขข้อมูลลูกค้า (REF: {editingJob.groupId})
                            </h3>
                            <button onClick={() => setEditingJob(null)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4 text-left">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">ชื่อบริษัท / ชื่อลูกค้า</label>
                                <input
                                    type="text"
                                    value={jobForm.customerName}
                                    onChange={(e) => setJobForm({ ...jobForm, customerName: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">ชื่อผู้ติดต่อ</label>
                                    <input
                                        type="text"
                                        value={jobForm.contactPerson}
                                        onChange={(e) => setJobForm({ ...jobForm, contactPerson: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">เบอร์โทรศัพท์</label>
                                    <input
                                        type="text"
                                        value={jobForm.phone}
                                        onChange={(e) => setJobForm({ ...jobForm, phone: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">อีเมล</label>
                                    <input
                                        type="email"
                                        value={jobForm.email}
                                        onChange={(e) => setJobForm({ ...jobForm, email: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">เลขใบเสนอราคา / Ref</label>
                                    <input
                                        type="text"
                                        value={jobForm.quotationNumber}
                                        onChange={(e) => setJobForm({ ...jobForm, quotationNumber: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">ที่อยู่จัดส่งคืน</label>
                                <textarea
                                    rows={2}
                                    value={jobForm.returnAddress}
                                    onChange={(e) => setJobForm({ ...jobForm, returnAddress: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-white/10">
                            <button
                                onClick={() => setEditingJob(null)}
                                className="px-5 py-2.5 bg-gray-100 dark:bg-white/10 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
                            >
                                ยกเลิก
                            </button>
                            <button
                                disabled={isSaving}
                                onClick={handleSaveJobEdit}
                                className="px-6 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                บันทึกข้อมูล
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Edit RMA Product Item */}
            {editingRMA && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-white/10 animate-scale-up">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-white/10">
                            <h3 className="font-bold text-lg text-[#1d1d1f] dark:text-white flex items-center gap-2">
                                <Pencil className="w-5 h-5 text-[#0071e3]" />
                                แก้ไขข้อมูลสินค้า ({editingRMA.productModel})
                            </h3>
                            <button onClick={() => setEditingRMA(null)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4 text-left">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <GlassSelect
                                        label="ยี่ห้อ (Brand)"
                                        value={rmaForm.brand}
                                        onChange={(val) => setRmaForm({ ...rmaForm, brand: val })}
                                        options={brandSelectOptions}
                                        placeholder="เลือกยี่ห้อ..."
                                        searchable
                                        recentKey="brand"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">ชื่อรุ่น (Model)</label>
                                    <input
                                        type="text"
                                        value={rmaForm.productModel}
                                        onChange={(e) => setRmaForm({ ...rmaForm, productModel: e.target.value.replace(/[^\x20-\x7E]/g, '').toUpperCase() })}
                                        style={{ textTransform: 'uppercase' }}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-[#1d1d1f] dark:text-white uppercase focus:outline-none focus:border-[#0071e3]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Serial Number (S/N)</label>
                                <input
                                    type="text"
                                    value={rmaForm.serialNumber}
                                    onChange={(e) => setRmaForm({ ...rmaForm, serialNumber: e.target.value.replace(/[^\x20-\x7E]/g, '').toUpperCase() })}
                                    style={{ textTransform: 'uppercase' }}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-mono font-bold text-[#1d1d1f] dark:text-white uppercase focus:outline-none focus:border-[#0071e3]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">อาการเสียที่ระบุ (Issue Description)</label>
                                <textarea
                                    rows={3}
                                    value={rmaForm.issueDescription}
                                    onChange={(e) => setRmaForm({ ...rmaForm, issueDescription: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-white/10">
                            <button
                                onClick={() => setEditingRMA(null)}
                                className="px-5 py-2.5 bg-gray-100 dark:bg-white/10 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
                            >
                                ยกเลิก
                            </button>
                            <button
                                disabled={isSaving}
                                onClick={handleSaveRMAEdit}
                                className="px-6 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                บันทึกข้อมูล
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
