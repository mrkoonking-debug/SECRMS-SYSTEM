import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MockDb } from '../services/mockDb';
import { RMA, RMAStatus, Team } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Search, Plus, ChevronRight, ChevronDown, Box, Layers, Wifi, Zap, ShoppingBag, Package, User, ChevronsUpDown, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const PAGE_SIZE = 50;

const getTeamBadge = (team: Team) => {
    switch (team) {
        case Team.HIKVISION:
            return (
                <span key={team} className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                    ทีม A
                </span>
            );
        case Team.DAHUA:
            return (
                <span key={team} className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                    ทีม B
                </span>
            );
        case Team.TEAM_C:
            return (
                <span key={team} className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                    ทีม C
                </span>
            );
        case Team.TEAM_E:
            return (
                <span key={team} className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    ทีม E
                </span>
            );
        case Team.TEAM_G:
            return (
                <span key={team} className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-500/20">
                    ทีม G
                </span>
            );
        default:
            return null;
    }
};

export const ClaimsList: React.FC = () => {
    const [rmas, setRMAs] = useState<RMA[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState(() => sessionStorage.getItem('rmas_search') || '');
    const [debouncedSearch, setDebouncedSearch] = useState(() => sessionStorage.getItem('rmas_search') || '');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'DONE'>(() => (sessionStorage.getItem('rmas_statusFilter') as any) || 'ALL');
    const [teamFilter, setTeamFilter] = useState<'ALL' | 'GROUP_C' | Team>(() => (sessionStorage.getItem('rmas_teamFilter') as any) || 'ALL');
    const [expandedDates, setExpandedDates] = useState<Set<string>>(() => {
        const saved = sessionStorage.getItem('rmas_expandedDates');
        return saved ? new Set(JSON.parse(saved)) : new Set(['Today', 'Yesterday', 'This Week']);
    });
    const [isTeamCExpanded, setIsTeamCExpanded] = useState(() => sessionStorage.getItem('rmas_isTeamCExpanded') === 'true');
    const { t } = useLanguage();
    const navigate = useNavigate();
    const searchTimerRef = useRef<any>(null);

    // Debounce search input
    const handleSearchChange = useCallback((value: string) => {
        setSearch(value);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => setDebouncedSearch(value), 300);
    }, []);

    // Save filters state to sessionStorage to preserve filters on back navigation
    useEffect(() => {
        sessionStorage.setItem('rmas_search', search);
    }, [search]);

    useEffect(() => {
        sessionStorage.setItem('rmas_statusFilter', statusFilter);
    }, [statusFilter]);

    useEffect(() => {
        sessionStorage.setItem('rmas_teamFilter', teamFilter);
    }, [teamFilter]);

    useEffect(() => {
        sessionStorage.setItem('rmas_expandedDates', JSON.stringify(Array.from(expandedDates)));
    }, [expandedDates]);

    useEffect(() => {
        sessionStorage.setItem('rmas_isTeamCExpanded', String(isTeamCExpanded));
    }, [isTeamCExpanded]);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                let allRMAs: RMA[] = [];
                let cursor: any = null;
                let more = true;

                // Load all pages automatically
                while (more) {
                    const result = await MockDb.getRMAsPaginated(PAGE_SIZE, cursor);
                    const assignedRMAs = result.rmas.filter(c => c && c.id && c.team && (c.team as any) !== 'UNASSIGNED');
                    allRMAs = [...allRMAs, ...assignedRMAs];
                    cursor = result.lastDoc;
                    more = result.hasMore;

                    // Update state progressively so user sees data appearing
                    setRMAs([...allRMAs]);

                    // Show content after first batch loads
                    if (allRMAs.length > 0) {
                        setLoading(false);
                    }
                }
            } catch (err: unknown) {
                console.error('ClaimsList fetch failed:', err);
                setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลได้');
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);


    const toggleDateGroup = (dateLabel: string) => {
        const newSet = new Set(expandedDates);
        if (newSet.has(dateLabel)) newSet.delete(dateLabel);
        else newSet.add(dateLabel);
        setExpandedDates(newSet);
    };

    const handleExpandAll = () => {
        if (expandedDates.size > 0) setExpandedDates(new Set());
        else setExpandedDates(new Set(['Today', 'Yesterday', 'This Week', 'Earlier']));
    };

    const handleJobClick = (jobId: string) => navigate(`/admin/job/${encodeURIComponent(jobId)}`);

    const groupedByDate = useMemo(() => {
        const matchesSearch = (c: RMA) => {
            if (!c || !c.id) return false;

            // If search is empty, show all (handled by other filters)
            if (!debouncedSearch.trim()) return true;

            const term = debouncedSearch.toLowerCase().trim();

            const matchCustomer = c.customerName && c.customerName.toLowerCase().includes(term);
            const matchSN = c.serialNumber && c.serialNumber.toLowerCase().includes(term);
            const matchModel = c.productModel && c.productModel.toLowerCase().includes(term);
            const matchId = c.id && c.id.toLowerCase().includes(term);
            const matchQuote = c.quotationNumber && c.quotationNumber.toLowerCase().includes(term);
            const matchGroup = c.groupRequestId && c.groupRequestId.toLowerCase().includes(term);
            const matchBrand = c.brand && c.brand.toLowerCase().includes(term);

            return matchId || matchCustomer || matchSN || matchModel || matchQuote || matchGroup || matchBrand;
        };

        const matchesStatus = (c: RMA) => {
            if (statusFilter === 'ALL') return true;
            if (statusFilter === 'PENDING') return c.status === RMAStatus.PENDING;
            if (statusFilter === 'IN_PROGRESS') return [RMAStatus.DIAGNOSING, RMAStatus.WAITING_PARTS].includes(c.status);
            if (statusFilter === 'DONE') return [RMAStatus.REPAIRED, RMAStatus.CLOSED, RMAStatus.REJECTED, RMAStatus.CANCELLED].includes(c.status);
            return true;
        };

        const matchesTeam = (c: RMA) => {
            if (teamFilter === 'ALL') return true;
            if (teamFilter === 'GROUP_C') return [Team.TEAM_C, Team.TEAM_E, Team.TEAM_G].includes(c.team);
            return c.team === teamFilter;
        }

        const filteredRMAs = rmas.filter(c => matchesSearch(c) && matchesStatus(c) && matchesTeam(c));

        const getDateLabel = (dateStr: string) => {
            const date = new Date(dateStr);
            const now = new Date();
            const diffDays = Math.floor(Math.abs(now.getTime() - date.getTime()) / (86400000));
            if (diffDays === 0 && date.getDate() === now.getDate()) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays <= 7) return 'This Week';
            return 'Earlier';
        };

        const groups: Record<string, RMA[]> = { 'Today': [], 'Yesterday': [], 'This Week': [], 'Earlier': [] };
        filteredRMAs.forEach(c => {
            const label = getDateLabel(c.createdAt);
            if (groups[label]) groups[label].push(c);
            else groups['Earlier'].push(c);
        });
        Object.keys(groups).forEach(key => { if (groups[key].length === 0) delete groups[key]; });
        return groups;
    }, [rmas, debouncedSearch, statusFilter, teamFilter]);

    const getJobsForDate = (rmasInDate: RMA[]) => {
        return rmasInDate.reduce((acc, rma) => {
            const jobKey = rma.groupRequestId || rma.quotationNumber || 'Unassigned';
            if (!acc[jobKey]) acc[jobKey] = [];
            acc[jobKey].push(rma);
            return acc;
        }, {} as Record<string, RMA[]>);
    };

    const getTeamCount = (team: Team) => rmas.filter(c => c.team === team && ![RMAStatus.CLOSED, RMAStatus.CANCELLED].includes(c.status)).length;
    const getGroupCCount = () => rmas.filter(c => [Team.TEAM_C, Team.TEAM_E, Team.TEAM_G].includes(c.team) && ![RMAStatus.CLOSED, RMAStatus.CANCELLED].includes(c.status)).length;
    const handleGroupCClick = () => { setIsTeamCExpanded(!isTeamCExpanded); setTeamFilter('GROUP_C'); };
    const isRMAOverdue = (c: RMA) => ![RMAStatus.CLOSED, RMAStatus.REPAIRED, RMAStatus.CANCELLED].includes(c.status) && (Math.floor((Date.now() - new Date(c.createdAt).getTime()) / 86400000) > 15);

    if (loading) return <div className="p-12 text-center">Loading RMAs...</div>;

    if (error) return (
        <div className="max-w-md mx-auto mt-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-8 h-8" /></div>
            <h2 className="text-lg font-bold text-[#1d1d1f] dark:text-white mb-2">โหลดข้อมูลไม่สำเร็จ</h2>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <button onClick={() => window.location.reload()} className="px-6 py-3 bg-[#0071e3] text-white rounded-xl font-bold flex items-center gap-2 mx-auto"><RefreshCw className="w-4 h-4" /> ลองใหม่</button>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto px-3 md:px-6 pb-24 md:pb-8">
            {/* ── Header ── */}
            <div className="flex items-center justify-between gap-4 mb-4 md:mb-6">
                <div>
                    <h1 className="text-xl md:text-[28px] font-extrabold text-[#1d1d1f] dark:text-white tracking-tight">{t('claimsList.title')}</h1>
                    <p className="text-gray-400 dark:text-gray-500 text-[11px] md:text-sm mt-0.5 hidden md:block">{t('claimsList.subtitle')}</p>
                </div>
                <Link to="/admin/submit" className="bg-gradient-to-r from-[#0071e3] to-[#005bbf] hover:from-[#0077ed] hover:to-[#0060c7] text-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-500/20 transition-all whitespace-nowrap hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0"><Plus className="h-4 w-4" /> <span className="hidden md:inline">{t('nav.newRequest')}</span><span className="md:hidden">เพิ่ม</span></Link>
            </div>

            {/* ── Bento Stats Grid ── */}
            <div className="mb-4 md:mb-6 space-y-2.5">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
                    <button onClick={() => { setTeamFilter('ALL'); setIsTeamCExpanded(false); }} className={`rounded-[20px] px-3 py-2.5 md:px-5 md:py-4 text-left transition-all duration-200 min-w-[90px] md:min-w-0 flex-shrink-0 md:flex-1 ${teamFilter === 'ALL' ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-md shadow-blue-500/20 border border-blue-400/20 ring-1 ring-blue-400/30' : 'bg-white/80 dark:bg-white/[0.05] backdrop-blur-sm border border-gray-200/60 dark:border-white/[0.06] hover:border-blue-300 dark:hover:border-blue-500/30 active:scale-[0.97]'}`}><div className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider mb-0.5 ${teamFilter === 'ALL' ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'}`}>{t('claimsList.active')}</div><div className={`text-lg md:text-2xl font-extrabold ${teamFilter === 'ALL' ? 'text-white' : 'text-[#1d1d1f] dark:text-white'}`}>{rmas.filter(c => c.status !== RMAStatus.CLOSED && c.status !== RMAStatus.CANCELLED).length}</div></button>
                    <button onClick={() => { setTeamFilter(Team.HIKVISION); setIsTeamCExpanded(false); }} className={`rounded-[20px] px-3 py-2.5 md:px-5 md:py-4 text-left transition-all duration-200 min-w-[90px] md:min-w-0 flex-shrink-0 md:flex-1 ${teamFilter === Team.HIKVISION ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-md shadow-red-500/20 border border-red-400/20 ring-1 ring-red-400/30' : 'bg-white/80 dark:bg-white/[0.05] backdrop-blur-sm border border-gray-200/60 dark:border-white/[0.06] hover:border-red-300 dark:hover:border-red-500/30 active:scale-[0.97]'}`}><div className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider mb-0.5 ${teamFilter === Team.HIKVISION ? 'text-red-100' : 'text-red-500'}`}>HIK</div><div className={`text-lg md:text-2xl font-extrabold ${teamFilter === Team.HIKVISION ? 'text-white' : 'text-[#1d1d1f] dark:text-white'}`}>{getTeamCount(Team.HIKVISION)}</div></button>
                    <button onClick={() => { setTeamFilter(Team.DAHUA); setIsTeamCExpanded(false); }} className={`rounded-[20px] px-3 py-2.5 md:px-5 md:py-4 text-left transition-all duration-200 min-w-[90px] md:min-w-0 flex-shrink-0 md:flex-1 ${teamFilter === Team.DAHUA ? 'bg-gradient-to-br from-orange-500 to-amber-600 shadow-md shadow-orange-500/20 border border-orange-400/20 ring-1 ring-orange-400/30' : 'bg-white/80 dark:bg-white/[0.05] backdrop-blur-sm border border-gray-200/60 dark:border-white/[0.06] hover:border-orange-300 dark:hover:border-orange-500/30 active:scale-[0.97]'}`}><div className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider mb-0.5 ${teamFilter === Team.DAHUA ? 'text-orange-100' : 'text-orange-500'}`}>DAHUA</div><div className={`text-lg md:text-2xl font-extrabold ${teamFilter === Team.DAHUA ? 'text-white' : 'text-[#1d1d1f] dark:text-white'}`}>{getTeamCount(Team.DAHUA)}</div></button>
                    <button onClick={handleGroupCClick} className={`rounded-[20px] px-3 py-2.5 md:px-5 md:py-4 text-left transition-all duration-200 min-w-[90px] md:min-w-0 flex-shrink-0 md:flex-1 ${isTeamCExpanded || teamFilter === 'GROUP_C' ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-md shadow-violet-500/20 border border-violet-400/20 ring-1 ring-violet-400/30' : 'bg-white/80 dark:bg-white/[0.05] backdrop-blur-sm border border-gray-200/60 dark:border-white/[0.06] hover:border-violet-300 dark:hover:border-violet-500/30 active:scale-[0.97]'}`}><div className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider mb-0.5 ${isTeamCExpanded || teamFilter === 'GROUP_C' ? 'text-violet-100' : 'text-violet-500'}`}>Team C</div><div className={`text-lg md:text-2xl font-extrabold ${isTeamCExpanded || teamFilter === 'GROUP_C' ? 'text-white' : 'text-[#1d1d1f] dark:text-white'}`}>{getGroupCCount()}</div></button>
                </div>
                {isTeamCExpanded && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide animate-fade-in pl-2 border-l-2 border-violet-500/30">
                        <button onClick={() => setTeamFilter(Team.TEAM_C)} className={`rounded-xl px-4 py-2 bg-white/80 dark:bg-white/[0.05] backdrop-blur-sm border whitespace-nowrap text-sm transition-all ${teamFilter === Team.TEAM_C ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10' : 'border-gray-200/60 dark:border-white/[0.06]'} dark:text-white`}>Network ({getTeamCount(Team.TEAM_C)})</button>
                        <button onClick={() => setTeamFilter(Team.TEAM_E)} className={`rounded-xl px-4 py-2 bg-white/80 dark:bg-white/[0.05] backdrop-blur-sm border whitespace-nowrap text-sm transition-all ${teamFilter === Team.TEAM_E ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10' : 'border-gray-200/60 dark:border-white/[0.06]'} dark:text-white`}>UPS ({getTeamCount(Team.TEAM_E)})</button>
                        <button onClick={() => setTeamFilter(Team.TEAM_G)} className={`rounded-xl px-4 py-2 bg-white/80 dark:bg-white/[0.05] backdrop-blur-sm border whitespace-nowrap text-sm transition-all ${teamFilter === Team.TEAM_G ? 'border-fuchsia-500 text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-500/10' : 'border-gray-200/60 dark:border-white/[0.06]'} dark:text-white`}>Online ({getTeamCount(Team.TEAM_G)})</button>
                    </div>
                )}
            </div>

            {/* ── Search + Filters ── */}
            <div className="glass-panel rounded-xl md:rounded-2xl p-1.5 mb-5 md:mb-6 sticky top-14 md:top-24 z-30 flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                <div className="relative flex-grow group"><Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><input type="text" placeholder={t('claimsList.searchPlaceholder')} value={search} onChange={(e) => handleSearchChange(e.target.value)} className="w-full bg-transparent border-none rounded-xl md:rounded-2xl py-2.5 md:py-3 pl-9 md:pl-11 pr-4 text-sm text-[#1d1d1f] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-0" /></div>
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide px-1 md:px-0 pb-0.5 md:pb-0">
                    <button onClick={handleExpandAll} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] flex-shrink-0 transition-colors"><ChevronsUpDown className="w-4 h-4" /></button>
                    <div className="h-5 w-px bg-gray-200 dark:bg-white/10 flex-shrink-0"></div>
                    {['ALL', 'PENDING', 'IN_PROGRESS', 'DONE'].map((s) => (
                        <button key={s} onClick={() => setStatusFilter(s as typeof statusFilter)} className={`px-2.5 md:px-3.5 py-1.5 md:py-2 text-[11px] md:text-xs font-medium rounded-lg md:rounded-xl transition-all whitespace-nowrap flex-shrink-0 ${statusFilter === s ? 'bg-[#1d1d1f] dark:bg-white text-white dark:text-[#1d1d1f] shadow-sm' : 'text-gray-500 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06]'}`}>{s === 'ALL' ? t('claimsList.filterStatus') : t(`status.${s}`)}</button>
                    ))}
                </div>
            </div>

            {/* ── Job List ── */}
            <div className="space-y-6 md:space-y-8">
                {Object.keys(groupedByDate).length === 0 ? (
                    <div className="text-center py-20 md:py-24 bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm rounded-2xl md:rounded-3xl border border-gray-200/60 dark:border-white/[0.06]"><Search className="w-10 h-10 md:w-12 md:h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" /><p className="text-gray-400 dark:text-gray-500 text-sm">{t('claimsList.noClaims')}</p></div>
                ) : (
                    ['Today', 'Yesterday', 'This Week', 'Earlier'].map(dateLabel => {
                        const rmasInDate = groupedByDate[dateLabel];
                        if (!rmasInDate) return null;
                        const isDateExpanded = expandedDates.has(dateLabel);
                        const jobsInDate = getJobsForDate(rmasInDate);
                        const sortedJobKeys = Object.keys(jobsInDate).sort((a, b) => new Date(jobsInDate[b][0].updatedAt).getTime() - new Date(jobsInDate[a][0].updatedAt).getTime());

                        return (
                            <div key={dateLabel} className="animate-fade-in">
                                <button onClick={() => toggleDateGroup(dateLabel)} className="w-full flex items-center gap-2.5 md:gap-3 mb-3 md:mb-4 group">
                                    <div className={`w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center transition-all duration-200 ${isDateExpanded ? 'bg-[#0071e3] text-white shadow-md shadow-blue-500/30 rotate-0' : 'bg-gray-200/80 dark:bg-white/[0.06] text-gray-400 dark:text-gray-500 -rotate-90'}`}><ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4" /></div>
                                    <h2 className="text-sm md:text-base font-bold text-[#1d1d1f] dark:text-white">
                                        {dateLabel === 'Today' ? t('claimsList.today') :
                                            dateLabel === 'Yesterday' ? t('claimsList.yesterday') :
                                                dateLabel === 'This Week' ? t('claimsList.thisWeek') :
                                                    dateLabel === 'Earlier' ? t('claimsList.earlier') : dateLabel} <span className="text-xs font-medium text-gray-400 dark:text-gray-500 ml-1">({rmasInDate.length})</span>
                                    </h2>
                                    <div className="flex-grow h-px bg-gradient-to-r from-gray-200 dark:from-white/10 to-transparent group-hover:from-blue-300 dark:group-hover:from-blue-500/20 transition-colors"></div>
                                </button>

                                {isDateExpanded && (
                                    <div className="space-y-3 md:space-y-4 pl-3 md:pl-0">
                                        {sortedJobKeys.map(jobKey => {
                                            const jobItems = jobsInDate[jobKey];
                                            const jobTeam = jobItems[0]?.team;
                                            const customerName = jobItems[0]?.customerName || 'Unknown';
                                            const quotationNumber = jobItems[0]?.quotationNumber;
                                            const isJobDone = jobItems.every(i => [RMAStatus.CLOSED, RMAStatus.REPAIRED, RMAStatus.CANCELLED].includes(i.status));

                                            return (
                                                <div key={jobKey} onClick={() => handleJobClick(jobKey)} className={`glass-panel glass-panel-hover rounded-[20px] md:rounded-[24px] overflow-hidden cursor-pointer group will-change-transform ${isJobDone ? 'border-green-300 dark:border-green-500/30' : ''} hover:-translate-y-0.5 active:scale-[0.99] active:translate-y-0`}>
                                                    <div className="p-3.5 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-4">
                                                        <div className="flex items-start md:items-center gap-3 md:gap-4">
                                                            <div className={`w-9 h-9 md:w-11 md:h-11 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${isJobDone ? 'bg-gradient-to-br from-emerald-400/20 to-green-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-gradient-to-br from-blue-400/20 to-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                                                                {isJobDone ? <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" /> : <Package className="w-4 h-4 md:w-5 md:h-5" />}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <h3 className="text-[13px] md:text-base font-bold text-[#1d1d1f] dark:text-white flex items-center gap-1.5 md:gap-2 flex-wrap">
                                                                    <span className="truncate">{jobKey}</span>
                                                                    {/* Desktop: Ref badge */}
                                                                    <span className={`hidden md:inline-flex text-[10px] px-2 py-0.5 rounded-md border ${quotationNumber ? 'bg-gray-100/80 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 border-gray-200/60 dark:border-white/[0.06]' : 'bg-gray-50/80 dark:bg-white/[0.03] text-gray-400 dark:text-gray-500 border-gray-100 dark:border-white/[0.04] italic'}`}>{quotationNumber ? `Ref: ${quotationNumber}` : 'ไม่มี Ref'}</span>
                                                                    {/* Job Team Badge */}
                                                                    {jobTeam && getTeamBadge(jobTeam)}
                                                                    {/* Desktop: Full badge / Mobile: Compact badge */}
                                                                    {isJobDone && <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold flex items-center gap-0.5 md:gap-1 flex-shrink-0"><CheckCircle2 className="w-3 h-3" /> <span className="hidden md:inline">เสร็จสิ้น</span><span className="md:hidden">เสร็จ</span></span>}
                                                                    {!isJobDone && jobItems.some(i => isRMAOverdue(i)) && <>
                                                                        <span className="hidden md:inline-flex bg-red-500/10 text-red-500 text-[10px] px-2 py-0.5 rounded-full border border-red-500/15">{t('claimsList.attentionNeeded')}</span>
                                                                        <span className="md:hidden bg-red-500/10 text-red-500 text-[9px] px-1.5 py-0.5 rounded-full border border-red-500/15">⚠️</span>
                                                                    </>}
                                                                </h3>
                                                                <div className="text-[11px] md:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 md:gap-2 mt-0.5">
                                                                    <User className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{customerName}</span> <span className="hidden md:inline w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></span><span className="text-gray-400 dark:text-gray-500 flex-shrink-0">· {jobItems.length} {t('claimsList.items')}</span>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1 md:gap-1.5 mt-1.5">
                                                                    {jobItems.slice(0, 5).map((item) => (
                                                                        <StatusBadge key={item.id} status={item.status} isOverdue={isRMAOverdue(item)} />
                                                                    ))}
                                                                    {jobItems.length > 5 && <span className="text-[10px] text-gray-400 font-medium self-center">+{jobItems.length - 5}</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 justify-end ml-12 md:ml-0">
                                                            {/* Desktop: Brand avatars */}
                                                            <div className="hidden md:flex -space-x-2">
                                                                {jobItems.slice(0, 3).map((item) => (
                                                                    <div key={item.id} className={`w-8 h-8 rounded-xl border-2 border-white dark:border-[#1c1c1e] flex items-center justify-center text-[10px] font-bold text-white shadow-sm ${item.team === Team.HIKVISION ? 'bg-gradient-to-br from-red-400 to-red-600' : 'bg-gradient-to-br from-blue-400 to-blue-600'}`}>{item.brand.substring(0, 1)}</div>
                                                                ))}
                                                                {jobItems.length > 3 && <div className="w-8 h-8 rounded-xl border-2 border-white dark:border-[#1c1c1e] bg-gray-100 dark:bg-white/[0.06] text-gray-400 text-[10px] flex items-center justify-center shadow-sm">+{jobItems.length - 3}</div>}
                                                            </div>
                                                            <div className="text-[11px] md:text-xs text-gray-400 group-hover:text-[#0071e3] dark:group-hover:text-blue-400 flex items-center gap-0.5 md:gap-1 transition-colors">Details <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4 transition-transform group-hover:translate-x-0.5" /></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>


        </div>
    );
};