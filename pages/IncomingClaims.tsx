import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MockDb, matchesSmartRef } from '../services/mockDb';
import { RMA, Team } from '../types';
import { Package, User, Clock, ArrowRight, CheckCircle2, Loader2, Info, ChevronRight, ChevronDown, Check, Box, Layers, Wifi, Zap, ShoppingBag, Truck, Pencil, Trash2, X, Search, ChevronLeft, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { GlassSelect } from '../components/GlassSelect';
import { showToast, showConfirmDialog } from '../services/toast';
import { AdminPageSkeleton } from '../components/AdminPageSkeleton';
import { LINE_ACCOUNTS, getLineAccountById } from '../lineConfig';

interface GroupedJob {
    groupId: string;
    rmas: RMA[];
    customerName: string;
    customerEmail: string;
    createdAt: string;
    quotationNumber: string;
    lineAccount?: string;
}

export const IncomingClaims: React.FC = () => {
    const navigate = useNavigate();
    const initialCachedIncoming = useMemo(() => {
        const cached = MockDb.getCachedRMAs();
        return cached ? cached.filter(r => !r.team || (r.team as any) === 'UNASSIGNED') : null;
    }, []);
    const [incoming, setIncoming] = useState<RMA[]>(() => initialCachedIncoming || []);
    const [loading, setLoading] = useState(() => !initialCachedIncoming);
    const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [openTeamCJobId, setOpenTeamCJobId] = useState<string | null>(null);
    const [assigningJobId, setAssigningJobId] = useState<string | null>(null);
    const [lastAssignedBanner, setLastAssignedBanner] = useState<{ jobId: string; customerName: string; team: Team; teamLabel: string } | null>(null);

    // Search and Filter States
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [brandFilter, setBrandFilter] = useState('ALL');

    // DOM Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState<number>(-1);

    const searchTimerRef = useRef<any>(null);

    // Edit Modal States
    const [editingJob, setEditingJob] = useState<GroupedJob | null>(null);
    const [editingRMA, setEditingRMA] = useState<RMA | null>(null);
    const [jobForm, setJobForm] = useState({ customerName: '', contactPerson: '', phone: '', email: '', returnAddress: '', quotationNumber: '', lineAccount: '' });
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

    const fetchIncoming = async (silent = false) => {
        if (!silent) setLoading(true);
        const data = await MockDb.getUnassignedRMAs();
        setIncoming(data);
        setLoading(false);
    };

    useEffect(() => { fetchIncoming(Boolean(initialCachedIncoming)); }, []);

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
                    (rma.issueDescription && rma.issueDescription.toLowerCase().includes(term)) ||
                    (rma.lineAccount && rma.lineAccount.toLowerCase().includes(term));
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
            lineAccount: rmas[0].lineAccount || '',
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

    const getTeamDisplayLabel = (team: Team) => {
        switch (team) {
            case Team.HIKVISION: return 'ทีม A (HIKVISION)';
            case Team.DAHUA: return 'ทีม B (DAHUA)';
            case Team.TEAM_C: return 'ทีม C (Network)';
            case Team.TEAM_E: return 'ทีม C (UPS)';
            case Team.TEAM_G: return 'ทีม C (Online)';
            default: return team;
        }
    };

    const assignJobToTeam = async (job: GroupedJob, targetTeam: Team) => {
        const teamLabel = getTeamDisplayLabel(targetTeam);
        const confirmed = await showConfirmDialog({
            title: 'ยืนยันการรับงานเข้าทีม',
            message: `ต้องการรับงานของ "${job.customerName}"\nเลขที่: ${job.groupId} (${job.rmas.length} รายการสินค้า)\nเข้าสู่ ${teamLabel} ใช่หรือไม่?`,
            confirmText: `ยืนยันรับเข้า ${teamLabel}`,
            cancelText: 'ยกเลิก',
            variant: 'primary'
        });
        if (!confirmed) return;

        setIsAssigning(true);
        setAssigningJobId(job.groupId);
        const nowIso = new Date().toISOString();
        try {
            await Promise.all(
                job.rmas.map(async (rma) => {
                    await MockDb.updateRMA(rma.id, {
                        team: targetTeam,
                        assignedAt: nowIso,
                        updatedAt: nowIso
                    });
                    await MockDb.addTimelineEvent(rma.id, {
                        type: 'SYSTEM',
                        description: `พนักงานรับเรื่องเข้าทีม: ${teamLabel}`,
                        user: MockDb.getCurrentUser()?.name || 'Staff'
                    });
                })
            );

            // Optimistic removal for instant snappy feel
            const assignedIds = new Set(job.rmas.map(r => r.id));
            setIncoming(prev => prev.filter(r => !assignedIds.has(r.id)));
            resetSelection();
            setExpandedGroupId(null);
            setOpenTeamCJobId(null);
            setLastAssignedBanner({ jobId: job.groupId, customerName: job.customerName, team: targetTeam, teamLabel });
            showToast(`รับงานเข้า ${teamLabel} แล้ว (แสดงเป็นงานล่าสุดอันแรก)`, 'success');
            fetchIncoming(true);
        } catch (err) {
            console.error('Assign group error:', err);
            showToast('เกิดข้อผิดพลาดในการรับงานเข้าทีม กรุณาลองใหม่', 'error');
        } finally {
            setIsAssigning(false);
            setAssigningJobId(null);
        }
    };

    const handleAssignGroup = async (job: GroupedJob) => {
        if (!finalTeam) return;
        await assignJobToTeam(job, finalTeam as Team);
    };

    const toggleExpand = (groupId: string) => {
        setExpandedGroupId(prev => prev === groupId ? null : groupId);
    };

    // Delete Handlers
    const handleDeleteJob = async (job: GroupedJob, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!(await showConfirmDialog({
            title: 'ลบรายการแจ้งเคลม',
            message: `คุณต้องการลบรายการแจ้งเคลมของ "${job.customerName}" (${job.rmas.length} รายการ) ใช่หรือไม่?`,
            confirmText: 'ยืนยันการลบ',
            variant: 'danger'
        }))) return;
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
        if (!(await showConfirmDialog({
            title: 'ลบรายการสินค้า',
            message: `คุณต้องการลบรายการสินค้า "${rma.productModel} (${rma.serialNumber})" ใช่หรือไม่?`,
            confirmText: 'ยืนยันการลบ',
            variant: 'danger'
        }))) return;
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
            quotationNumber: firstRMA.quotationNumber || '',
            lineAccount: firstRMA.lineAccount || ''
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
                    lineAccount: jobForm.lineAccount,
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

    if (loading) return <AdminPageSkeleton title="กำลังโหลดรายการเคลมเข้า..." />;

    return (
        <div className="max-w-[1600px] w-full mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-8 pb-6">
            <div className="mb-5 md:mb-6">
                <h1 className="text-xl md:text-3xl font-bold text-[#1d1d1f] dark:text-white mb-1 md:mb-1.5">{t('incoming.title')}</h1>
                <p className="text-xs md:text-sm text-gray-500">รายการที่ลูกค้าลงทะเบียนผ่านหน้าเว็บ — กดเลือกทีมและยืนยันเพื่อรับเข้างาน</p>
            </div>

            {/* Instant Jump Banner after accepting a job into a team */}
            {lastAssignedBanner && (
                <div className="mb-4 p-3.5 sm:p-4 rounded-[22px] bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                            <Check className="w-4 h-4" />
                        </div>
                        <div className="text-xs sm:text-sm min-w-0">
                            <span className="font-bold text-emerald-700 dark:text-emerald-300">รับงาน &quot;{lastAssignedBanner.customerName}&quot; เข้า {lastAssignedBanner.teamLabel} แล้ว</span>
                            <span className="text-emerald-600/80 dark:text-emerald-400/80 block sm:inline sm:ml-1.5 text-xs">• งานจะขึ้นอยู่อันแรกสุดของทีมทันที</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => navigate(`/admin/rmas?team=${encodeURIComponent(lastAssignedBanner.team)}`)}
                            className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                        >
                            <span>ไปดูใน{lastAssignedBanner.teamLabel.split(' ')[0]} {lastAssignedBanner.teamLabel.split(' ')[1]}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate(`/admin/job/${encodeURIComponent(lastAssignedBanner.jobId)}`)}
                            className="px-3 py-1.5 rounded-full bg-white dark:bg-white/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-50 dark:hover:bg-white/15 transition-all cursor-pointer"
                        >
                            เปิดใบงาน
                        </button>
                        <button
                            type="button"
                            onClick={() => setLastAssignedBanner(null)}
                            className="p-1.5 rounded-full text-emerald-600/70 hover:bg-emerald-500/15"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Search and Brand Filter Controls */}
            <div className="bg-white dark:bg-[#16161a] apple-liquid-glass rounded-[32px] sm:rounded-[36px] md:rounded-[42px] p-4 sm:p-5 md:p-6 shadow-sm mb-6 space-y-3">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <input
                            type="text"
                            placeholder="ค้นหาตามชื่อลูกค้า, เบอร์โทร, Ref #, S/N, รุ่นสินค้า, อาการเสีย..."
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="w-full bg-gray-50/70 dark:bg-white/[0.03] border border-gray-150/60 dark:border-white/5 apple-card-inner rounded-full py-2.5 pl-11 pr-10 text-xs md:text-sm dark:text-white focus:ring-2 focus:ring-[#0071e3]/30 transition-all outline-none"
                        />
                        {search && (
                            <button
                                onClick={handleClearSearch}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
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
                            className="bg-gray-50/70 dark:bg-white/[0.04] border border-gray-200/80 dark:border-white/10 apple-card-inner text-xs font-bold rounded-full px-4 py-2.5 text-gray-700 dark:text-white focus:ring-2 focus:ring-[#0071e3]/30 outline-none w-full sm:w-auto transition-all cursor-pointer"
                        >
                            <option value="ALL">ยี่ห้อทั้งหมด</option>
                            {brandOptions.map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 border-t border-black/5 dark:border-white/5 pt-2.5 px-1">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#0071e3] inline-block"></span>
                        พบงานรอดำเนินการ <span className="font-extrabold text-[#0071e3] dark:text-blue-400">{totalJobsCount}</span> ใบงาน ({filteredIncoming.length} รายการสินค้า)
                    </div>
                    {pageSize !== -1 && totalPages > 1 && (
                        <div className="font-medium">หน้า {activePage} / {totalPages}</div>
                    )}
                </div>
            </div>

            {totalJobsCount === 0 ? (
                <div className="bg-white dark:bg-[#16161a] apple-liquid-glass p-12 md:p-20 text-center rounded-[34px] sm:rounded-[38px] md:rounded-[44px]">
                    <div className="w-14 h-14 md:w-20 md:h-20 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 text-[#0071e3]">
                        <CheckCircle2 className="w-7 h-7 md:w-10 md:h-10 text-emerald-500" />
                    </div>
                    <h3 className="text-base md:text-xl font-bold text-gray-700 dark:text-gray-300">{t('incoming.noIncoming')}</h3>
                    <p className="text-xs md:text-sm text-gray-400 mt-1">ไม่มีงานแจ้งเคลมใหม่ที่รอดำเนินการ</p>
                </div>
            ) : (
                <div className="space-y-4 md:space-y-6">
                    {paginatedGroupedJobs.map((job) => {
                        const isExpanded = expandedGroupId === job.groupId;
                        const isSelected = selectedGroupId === job.groupId;

                        return (
                            <div 
                                key={job.groupId} 
                                className={`bg-white dark:bg-[#16161a] apple-liquid-glass rounded-[32px] sm:rounded-[36px] md:rounded-[42px] overflow-hidden transition-all duration-200 ${
                                    isSelected 
                                        ? 'ring-2 ring-[#0071e3] shadow-2xl shadow-blue-500/25' 
                                        : 'hover:-translate-y-0.5 hover:shadow-lg'
                                }`}
                            >
                                <div className="p-5 sm:p-6 md:p-7 flex flex-col gap-4 md:gap-5">
                                    {/* Top Header Row: Source, Items Count, and REF ID */}
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 apple-card-sm">
                                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0"></span>
                                                {t('incoming.receivedFrom')}
                                            </span>
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-[#0071e3] dark:text-blue-400 border border-blue-500/25 apple-card-sm">
                                                <Package className="w-3.5 h-3.5" />
                                                {job.rmas.length} {job.rmas.length === 1 ? 'item' : 'items'}
                                            </span>
                                            {/* LINE@ Badge */}
                                            {(() => {
                                                const config = job.lineAccount ? getLineAccountById(job.lineAccount) : null;
                                                const label = config?.label || job.lineAccount;
                                                if (label) {
                                                    return (
                                                        <span 
                                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-[#06C755]/15 text-[#06C755] dark:text-[#2ddc76] border border-[#06C755]/30 apple-card-sm shadow-sm"
                                                            title={`สั่งซื้อผ่านช่องทาง: ${label}`}
                                                        >
                                                            <span className="w-4 h-4 rounded-full bg-[#06C755] text-white flex items-center justify-center text-[9px] font-black shrink-0 leading-none">
                                                                @
                                                            </span>
                                                            <span>{label}</span>
                                                        </span>
                                                    );
                                                }
                                                return (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                                        LINE@: ไม่ระบุ
                                                    </span>
                                                );
                                            })()}
                                        </div>

                                        <div className="flex items-center gap-2 px-3 py-1 rounded-[14px] bg-black/[0.04] dark:bg-black/40 border border-black/5 dark:border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                                            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 tracking-wider uppercase">REF ID</span>
                                            <span className="text-xs md:text-sm font-mono font-black text-gray-800 dark:text-gray-200">{job.groupId}</span>
                                        </div>
                                    </div>

                                    {/* Customer Name Row */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 
                                                    onClick={() => toggleExpand(job.groupId)}
                                                    className="text-xl sm:text-2xl md:text-[25px] font-black text-[#1d1d1f] dark:text-white tracking-tight leading-snug cursor-pointer hover:text-[#0071e3] dark:hover:text-blue-400 transition-colors"
                                                >
                                                    {job.customerName}
                                                </h3>

                                                {/* Quick Action Buttons for Job Customer Info */}
                                                <div className="flex items-center gap-1.5 ml-1">
                                                    <button
                                                        onClick={(e) => startEditJob(job, e)}
                                                        title="แก้ไขข้อมูลลูกค้า"
                                                        className="p-1.5 rounded-[10px] bg-black/5 hover:bg-black/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-gray-600 dark:text-gray-300 border border-black/5 dark:border-white/[0.08] transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5 text-[#0071e3]" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteJob(job, e)}
                                                        title="ลบรายการแจ้งเคลมนี้"
                                                        className="p-1.5 rounded-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {job.customerEmail && (
                                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-medium">{job.customerEmail}</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Quick Item Preview Chips (see brand/model at a glance before clicking team) */}
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {job.rmas.slice(0, 4).map((rma, idx) => (
                                            <span
                                                key={rma.id}
                                                onClick={() => toggleExpand(job.groupId)}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100/90 dark:bg-white/[0.05] border border-gray-200/70 dark:border-white/[0.08] text-[11px] font-semibold text-gray-700 dark:text-gray-200 cursor-pointer hover:border-[#0071e3]/40 transition-colors"
                                            >
                                                <span className="font-extrabold text-[#0071e3] dark:text-blue-400">{rma.brand || 'ไม่ระบุ'}</span>
                                                <span className="truncate max-w-[160px]">{rma.productModel}</span>
                                                {rma.serialNumber && <span className="font-mono text-[10px] text-gray-400 hidden sm:inline">({rma.serialNumber})</span>}
                                                {idx === 3 && job.rmas.length > 4 && <span className="text-gray-400">+{job.rmas.length - 4}</span>}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Metadata & 1-Click Quick Assign Pills Row */}
                                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pt-1">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/[0.03] dark:bg-black/40 border border-black/5 dark:border-white/[0.08] text-xs text-gray-500 dark:text-gray-400 apple-card-sm">
                                                <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-medium">
                                                    <Clock className="w-3.5 h-3.5 text-[#0071e3] shrink-0" />
                                                    {new Date(job.createdAt).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {job.quotationNumber && job.quotationNumber !== 'N/A' && (
                                                    <>
                                                        <span className="text-gray-300 dark:text-gray-600">·</span>
                                                        <span className="font-mono text-[11px] font-bold text-gray-600 dark:text-gray-300">
                                                            QT: {job.quotationNumber}
                                                        </span>
                                                    </>
                                                )}
                                            </div>

                                            <button 
                                                onClick={() => toggleExpand(job.groupId)}
                                                className="flex items-center gap-1.5 text-xs md:text-sm text-[#0071e3] dark:text-blue-400 font-bold hover:underline transition-colors cursor-pointer"
                                            >
                                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                {isExpanded ? 'ซ่อนรายละเอียด' : `ดูรายละเอียด ${job.rmas.length} ชิ้น`}
                                            </button>
                                        </div>

                                        {/* 1-Click Apple Team Triage Pills */}
                                        <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
                                            <span className="text-[11px] font-bold text-gray-400 mr-1 hidden sm:inline">รับเข้าทีม:</span>
                                            <button
                                                type="button"
                                                disabled={assigningJobId === job.groupId}
                                                onClick={() => assignJobToTeam(job, Team.HIKVISION)}
                                                className="flex-1 sm:flex-none px-3.5 py-2 rounded-full bg-red-500/10 hover:bg-red-500 text-red-600 dark:text-red-400 hover:text-white border border-red-500/25 text-xs font-extrabold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                                            >
                                                {assigningJobId === job.groupId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Box className="w-3.5 h-3.5" />}
                                                <span>ทีม A · HIK</span>
                                            </button>
                                            <button
                                                type="button"
                                                disabled={assigningJobId === job.groupId}
                                                onClick={() => assignJobToTeam(job, Team.DAHUA)}
                                                className="flex-1 sm:flex-none px-3.5 py-2 rounded-full bg-orange-500/10 hover:bg-orange-500 text-orange-600 dark:text-orange-400 hover:text-white border border-orange-500/25 text-xs font-extrabold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                                            >
                                                <Layers className="w-3.5 h-3.5" />
                                                <span>ทีม B · DAHUA</span>
                                            </button>
                                            <button
                                                type="button"
                                                disabled={assigningJobId === job.groupId}
                                                onClick={() => setOpenTeamCJobId(prev => prev === job.groupId ? null : job.groupId)}
                                                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-full border text-xs font-extrabold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                                                    openTeamCJobId === job.groupId
                                                        ? 'bg-violet-500 text-white border-violet-500 shadow-sm'
                                                        : 'bg-violet-500/10 hover:bg-violet-500 text-violet-600 dark:text-violet-400 hover:text-white border-violet-500/25'
                                                }`}
                                            >
                                                <Wifi className="w-3.5 h-3.5" />
                                                <span>ทีม C</span>
                                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openTeamCJobId === job.groupId ? 'rotate-180' : ''}`} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Inline Quick Sub-Team Picker for Team C */}
                                    {openTeamCJobId === job.groupId && (
                                        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/5 animate-fade-in">
                                            <span className="text-[11px] font-bold text-violet-500">เลือกแผนกย่อยทีม C:</span>
                                            <button
                                                type="button"
                                                disabled={assigningJobId === job.groupId}
                                                onClick={() => assignJobToTeam(job, Team.TEAM_C)}
                                                className="px-3.5 py-1.5 rounded-full bg-cyan-500/10 hover:bg-cyan-500 text-cyan-700 dark:text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                                            >
                                                <Wifi className="w-3.5 h-3.5" /> Network
                                            </button>
                                            <button
                                                type="button"
                                                disabled={assigningJobId === job.groupId}
                                                onClick={() => assignJobToTeam(job, Team.TEAM_E)}
                                                className="px-3.5 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500 text-amber-700 dark:text-amber-300 hover:text-white border border-amber-500/30 text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                                            >
                                                <Zap className="w-3.5 h-3.5" /> UPS
                                            </button>
                                            <button
                                                type="button"
                                                disabled={assigningJobId === job.groupId}
                                                onClick={() => assignJobToTeam(job, Team.TEAM_G)}
                                                className="px-3.5 py-1.5 rounded-full bg-fuchsia-500/10 hover:bg-fuchsia-500 text-fuchsia-700 dark:text-fuchsia-300 hover:text-white border border-fuchsia-500/30 text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                                            >
                                                <ShoppingBag className="w-3.5 h-3.5" /> Online
                                            </button>
                                        </div>
                                    )}

                                    {/* Expanded Item Details */}
                                    {isExpanded && (
                                        <div className="border-t border-black/5 dark:border-white/5 pt-4 md:pt-5 animate-slide-up">
                                            <div className="space-y-2.5 md:space-y-3">
                                                {job.rmas.map((rma, idx) => (
                                                    <div key={rma.id} className="p-4 md:p-5 bg-gray-50/70 dark:bg-white/[0.03] apple-card-inner rounded-[24px] md:rounded-[28px] border border-gray-200/60 dark:border-white/[0.06] flex flex-col md:flex-row md:items-center gap-3 md:gap-4.5 relative group">
                                                        <div className="w-8 h-8 rounded-[14px] bg-[#0071e3] text-white flex items-center justify-center text-xs font-black flex-shrink-0 shadow-sm">
                                                            {idx + 1}
                                                        </div>
                                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2.5 md:gap-4 pr-16 md:pr-0">
                                                            <div>
                                                                <div className="text-[10px] font-extrabold text-[#0071e3] dark:text-blue-400 uppercase tracking-wider">{rma.brand}</div>
                                                                <div className="text-sm font-bold text-[#1d1d1f] dark:text-white leading-snug">{rma.productModel}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[10px] font-bold text-gray-400 uppercase">S/N</div>
                                                                <div className="text-sm font-mono font-medium text-[#1d1d1f] dark:text-gray-300">{rma.serialNumber}</div>
                                                            </div>
                                                            <div className="md:col-span-2">
                                                                <div className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><Info className="w-3 h-3" /> Issue</div>
                                                                <div className="text-sm text-[#1d1d1f] dark:text-gray-300 line-clamp-2">{rma.issueDescription}</div>
                                                            </div>
                                                        </div>

                                                        {/* Action buttons for individual item */}
                                                        <div className="flex items-center gap-1.5 self-end md:self-center">
                                                            <button
                                                                onClick={(e) => startEditRMA(rma, e)}
                                                                title="แก้ไขรายการสินค้านี้"
                                                                className="p-2 rounded-full bg-white dark:bg-white/[0.08] hover:bg-gray-100 dark:hover:bg-white/20 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 transition-colors cursor-pointer"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5 text-[#0071e3]" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDeleteRMA(rma, e)}
                                                                title="ลบเฉพาะสินค้าชิ้นนี้"
                                                                className="p-2 rounded-full bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 border border-red-200 dark:border-red-800/30 transition-colors cursor-pointer"
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
                                        <div className="border-t border-black/5 dark:border-white/5 pt-4 md:pt-6 animate-slide-up">
                                            <div className="mb-4 md:mb-6">
                                                <h4 className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-widest mb-3 md:mb-4">{t('incoming.selectTeamTitle')}</h4>
                                                <div className="grid grid-cols-3 gap-2.5 md:gap-4">
                                                    <button
                                                        onClick={() => handleMainGroupSelect('A')}
                                                        className={`p-3.5 md:p-4.5 apple-card-inner rounded-[24px] md:rounded-[28px] border text-left transition-all flex flex-col md:flex-row items-center gap-2 md:gap-4 cursor-pointer ${
                                                            selectedMainGroup === 'A' 
                                                                ? 'bg-red-500/10 dark:bg-red-500/15 border-red-500 ring-2 ring-red-500/30 shadow-lg shadow-red-500/20' 
                                                                : 'bg-black/[0.02] dark:bg-white/[0.03] border-gray-200/80 dark:border-white/[0.08] hover:border-red-400/40'
                                                        }`}
                                                    >
                                                        <div className={`p-2.5 md:p-3 rounded-[16px] ${selectedMainGroup === 'A' ? 'bg-red-500 text-white shadow-md' : 'bg-red-500/10 text-red-500'}`}><Box className="w-4 h-4 md:w-5 md:h-5" /></div>
                                                        <div className="text-center md:text-left"><div className="font-extrabold text-xs md:text-base text-[#1d1d1f] dark:text-white">HIK</div><div className="text-[10px] text-gray-400">Team A</div></div>
                                                    </button>

                                                    <button
                                                        onClick={() => handleMainGroupSelect('B')}
                                                        className={`p-3.5 md:p-4.5 apple-card-inner rounded-[24px] md:rounded-[28px] border text-left transition-all flex flex-col md:flex-row items-center gap-2 md:gap-4 cursor-pointer ${
                                                            selectedMainGroup === 'B' 
                                                                ? 'bg-orange-500/10 dark:bg-orange-500/15 border-orange-500 ring-2 ring-orange-500/30 shadow-lg shadow-orange-500/20' 
                                                                : 'bg-black/[0.02] dark:bg-white/[0.03] border-gray-200/80 dark:border-white/[0.08] hover:border-orange-400/40'
                                                        }`}
                                                    >
                                                        <div className={`p-2.5 md:p-3 rounded-[16px] ${selectedMainGroup === 'B' ? 'bg-orange-500 text-white shadow-md' : 'bg-orange-500/10 text-orange-500'}`}><Layers className="w-4 h-4 md:w-5 md:h-5" /></div>
                                                        <div className="text-center md:text-left"><div className="font-extrabold text-xs md:text-base text-[#1d1d1f] dark:text-white">DAHUA</div><div className="text-[10px] text-gray-400">Team B</div></div>
                                                    </button>

                                                    <button
                                                        onClick={() => handleMainGroupSelect('C')}
                                                        className={`p-3.5 md:p-4.5 apple-card-inner rounded-[24px] md:rounded-[28px] border text-left transition-all flex flex-col md:flex-row items-center gap-2 md:gap-4 cursor-pointer ${
                                                            selectedMainGroup === 'C' 
                                                                ? 'bg-blue-500/10 dark:bg-blue-500/15 border-blue-500 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/20' 
                                                                : 'bg-black/[0.02] dark:bg-white/[0.03] border-gray-200/80 dark:border-white/[0.08] hover:border-blue-400/40'
                                                        }`}
                                                    >
                                                        <div className={`p-2.5 md:p-3 rounded-[16px] ${selectedMainGroup === 'C' ? 'bg-blue-500 text-white shadow-md' : 'bg-blue-500/10 text-blue-500'}`}><Wifi className="w-4 h-4 md:w-5 md:h-5" /></div>
                                                        <div className="text-center md:text-left"><div className="font-extrabold text-xs md:text-base text-[#1d1d1f] dark:text-white">Network</div><div className="text-[10px] text-gray-400">C / E / G</div></div>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Sub-Selection for Team C Group */}
                                            {selectedMainGroup === 'C' && (
                                                <div className="animate-fade-in mb-4 md:mb-6 pl-3 md:pl-5 border-l-2 border-blue-500/40 py-1">
                                                    <div className="text-[10px] md:text-xs font-black text-blue-500 uppercase mb-2 md:mb-3 tracking-widest">Select Specific Sub-Team</div>
                                                    <div className="grid grid-cols-3 gap-2 md:gap-3.5">
                                                        {[
                                                            { val: Team.TEAM_C, label: t('teams.teamC'), icon: Wifi, color: 'cyan' },
                                                            { val: Team.TEAM_E, label: t('teams.teamE'), icon: Zap, color: 'amber' },
                                                            { val: Team.TEAM_G, label: t('teams.teamG'), icon: ShoppingBag, color: 'fuchsia' }
                                                        ].map(sub => (
                                                            <button
                                                                key={sub.val}
                                                                onClick={() => setFinalTeam(sub.val)}
                                                                className={`p-2.5 md:p-3.5 apple-card-sm rounded-full sm:rounded-[20px] border text-center md:text-left transition-all flex flex-col md:flex-row items-center gap-1.5 md:gap-3 cursor-pointer ${
                                                                    finalTeam === sub.val 
                                                                        ? 'bg-blue-500/10 dark:bg-blue-500/15 border-[#0071e3] ring-1 ring-[#0071e3] shadow-md' 
                                                                        : 'bg-black/[0.02] dark:bg-white/[0.03] border-gray-200/80 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/20'
                                                                }`}
                                                            >
                                                                <sub.icon className={`w-4 h-4 md:w-5 md:h-5 ${finalTeam === sub.val ? 'text-[#0071e3]' : 'text-gray-400'}`} />
                                                                <span className={`text-[11px] md:text-sm font-bold ${finalTeam === sub.val ? 'text-[#0071e3] dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>{sub.label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex flex-row justify-end items-center gap-2 md:gap-3 pt-2 md:pt-4">
                                                <button
                                                    onClick={resetSelection}
                                                    className="px-5 md:px-8 py-2.5 md:py-3 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 rounded-full text-xs md:text-sm font-bold text-gray-600 dark:text-gray-300 transition-all cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    disabled={!finalTeam || isAssigning}
                                                    onClick={() => handleAssignGroup(job)}
                                                    className="flex-1 sm:flex-none px-6 md:px-10 py-2.5 md:py-3 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-xs md:text-sm font-bold shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 cursor-pointer"
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
                                <GlassSelect
                                    label="LINE@ ที่สั่งซื้อ"
                                    value={jobForm.lineAccount}
                                    onChange={(val) => setJobForm({ ...jobForm, lineAccount: val })}
                                    options={[
                                        { value: '', label: '-- ไม่ระบุ --' },
                                        ...LINE_ACCOUNTS.map(la => ({
                                            value: la.id,
                                            label: la.label,
                                            icon: (
                                                <span className="w-4 h-4 rounded-full bg-[#06C755]/15 text-[#06C755] flex items-center justify-center text-[9px] font-black shrink-0">@</span>
                                            )
                                        }))
                                    ]}
                                    placeholder="เลือก LINE@..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">ที่อยู่จัดส่งคืน</label>
                                <textarea
                                    rows={4}
                                    value={jobForm.returnAddress}
                                    onChange={(e) => setJobForm({ ...jobForm, returnAddress: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3] min-h-[110px] resize-y"
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
