import React from 'react';
import { Team } from '../types';
import { Layers, Package, ChevronDown, Clock, Wrench, CheckCircle2 } from 'lucide-react';

interface ClaimsFilterHubProps {
    teamFilter: 'ALL' | 'GROUP_C' | Team;
    setTeamFilter: (team: 'ALL' | 'GROUP_C' | Team) => void;
    statusFilter: 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'DONE';
    setStatusFilter: (status: 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'DONE') => void;
    isTeamCExpanded: boolean;
    setIsTeamCExpanded: React.Dispatch<React.SetStateAction<boolean>>;
    filterLayoutOrder?: 'TEAM_FIRST' | 'STATUS_FIRST';
    toggleFilterLayoutOrder?: () => void;
    handleClearFilters?: () => void;
    activeTeamLabel?: string;
    dashboardStats: any;
    isAnyFilterActive?: boolean;
    totalJobsCount?: number;
    filteredCount?: number;
    dateFilter?: string;
    activePeriodLabel?: string;
    setDateFilter?: (date: string) => void;
    setCustomStartDate?: (d: string) => void;
    setCustomEndDate?: (d: string) => void;
}

export const ClaimsFilterHub: React.FC<ClaimsFilterHubProps> = ({
    teamFilter,
    setTeamFilter,
    statusFilter,
    setStatusFilter,
    isTeamCExpanded,
    setIsTeamCExpanded,
    dashboardStats,
}) => {
    const handleGroupCClick = () => {
        setIsTeamCExpanded(!isTeamCExpanded);
        setTeamFilter('GROUP_C');
    };

    return (
        <div className="bg-white dark:bg-[#16181d] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-3 sm:p-4 mb-4 shadow-xs space-y-3">
            {/* 1. Team Scope KPI Cards (Compact, consistent "ชิ้น" unit) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                {/* All Teams */}
                <button
                    type="button"
                    onClick={() => { setTeamFilter('ALL'); setIsTeamCExpanded(false); }}
                    className={`relative p-3 sm:p-3.5 rounded-xl text-left transition-all duration-150 flex flex-col justify-between border cursor-pointer ${
                        teamFilter === 'ALL'
                            ? 'bg-blue-50/70 dark:bg-blue-500/10 border-[#0071e3] ring-1 ring-[#0071e3]/30 shadow-xs'
                            : 'bg-slate-50/80 dark:bg-[#1a1d24] border-slate-200/70 dark:border-white/[0.06] hover:border-blue-400/50 dark:hover:border-blue-500/40'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                teamFilter === 'ALL' ? 'bg-[#0071e3] text-white' : 'bg-blue-500/10 text-[#0071e3] dark:text-blue-400'
                            }`}>
                                <Layers className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                                <h3 className={`font-bold text-xs sm:text-sm leading-tight truncate ${
                                    teamFilter === 'ALL' ? 'text-[#0071e3] dark:text-blue-400' : 'text-slate-900 dark:text-white'
                                }`}>
                                    ทุกทีม
                                </h3>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate block">รวมทุกแบรนด์</span>
                            </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                            teamFilter === 'ALL' ? 'bg-[#0071e3] text-white' : 'bg-blue-500/10 text-[#0071e3] dark:text-blue-400'
                        }`}>
                            {dashboardStats.all?.rate ?? 0}%
                        </span>
                    </div>

                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                                {dashboardStats.all?.active ?? 0}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">ชิ้นค้าง</span>
                        </div>
                        <span className="text-[10.5px] text-slate-500 dark:text-slate-400 tabular-nums">
                            ทั้งหมด {dashboardStats.all?.total ?? 0} · เสร็จ <strong className="text-emerald-600 dark:text-emerald-400">{dashboardStats.all?.done ?? 0}</strong>
                        </span>
                    </div>

                    <div className="w-full h-1 bg-slate-200/80 dark:bg-white/[0.08] rounded-full overflow-hidden">
                        <div className="bg-[#0071e3] h-full rounded-full transition-all duration-300" style={{ width: `${dashboardStats.all?.rate ?? 0}%` }} />
                    </div>
                </button>

                {/* Team A (HIKVISION) */}
                <button
                    type="button"
                    onClick={() => { setTeamFilter(Team.HIKVISION); setIsTeamCExpanded(false); }}
                    className={`relative p-3 sm:p-3.5 rounded-xl text-left transition-all duration-150 flex flex-col justify-between border cursor-pointer ${
                        teamFilter === Team.HIKVISION
                            ? 'bg-red-50/70 dark:bg-red-500/10 border-red-500 ring-1 ring-red-500/30 shadow-xs'
                            : 'bg-slate-50/80 dark:bg-[#1a1d24] border-slate-200/70 dark:border-white/[0.06] hover:border-red-400/50 dark:hover:border-red-500/40'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                teamFilter === Team.HIKVISION ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-600 dark:text-red-400'
                            }`}>
                                <span className="font-black text-xs">A</span>
                            </div>
                            <div className="min-w-0">
                                <h3 className={`font-bold text-xs sm:text-sm leading-tight truncate ${
                                    teamFilter === Team.HIKVISION ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'
                                }`}>
                                    ทีม A
                                </h3>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate block">HIKVISION</span>
                            </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                            teamFilter === Team.HIKVISION ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-600 dark:text-red-400'
                        }`}>
                            {dashboardStats.hik?.rate ?? 0}%
                        </span>
                    </div>

                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                                {dashboardStats.hik?.active ?? 0}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">ชิ้นค้าง</span>
                        </div>
                        <span className="text-[10.5px] text-slate-500 dark:text-slate-400 tabular-nums">
                            ทั้งหมด {dashboardStats.hik?.total ?? 0} · เสร็จ <strong className="text-emerald-600 dark:text-emerald-400">{dashboardStats.hik?.done ?? 0}</strong>
                        </span>
                    </div>

                    <div className="w-full h-1 bg-slate-200/80 dark:bg-white/[0.08] rounded-full overflow-hidden">
                        <div className="bg-red-500 h-full rounded-full transition-all duration-300" style={{ width: `${dashboardStats.hik?.rate ?? 0}%` }} />
                    </div>
                </button>

                {/* Team B (DAHUA) */}
                <button
                    type="button"
                    onClick={() => { setTeamFilter(Team.DAHUA); setIsTeamCExpanded(false); }}
                    className={`relative p-3 sm:p-3.5 rounded-xl text-left transition-all duration-150 flex flex-col justify-between border cursor-pointer ${
                        teamFilter === Team.DAHUA
                            ? 'bg-orange-50/70 dark:bg-orange-500/10 border-orange-500 ring-1 ring-orange-500/30 shadow-xs'
                            : 'bg-slate-50/80 dark:bg-[#1a1d24] border-slate-200/70 dark:border-white/[0.06] hover:border-orange-400/50 dark:hover:border-orange-500/40'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                teamFilter === Team.DAHUA ? 'bg-orange-500 text-white' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                            }`}>
                                <span className="font-black text-xs">B</span>
                            </div>
                            <div className="min-w-0">
                                <h3 className={`font-bold text-xs sm:text-sm leading-tight truncate ${
                                    teamFilter === Team.DAHUA ? 'text-orange-600 dark:text-orange-400' : 'text-slate-900 dark:text-white'
                                }`}>
                                    ทีม B
                                </h3>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate block">DAHUA</span>
                            </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                            teamFilter === Team.DAHUA ? 'bg-orange-500 text-white' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                        }`}>
                            {dashboardStats.dahua?.rate ?? 0}%
                        </span>
                    </div>

                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                                {dashboardStats.dahua?.active ?? 0}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">ชิ้นค้าง</span>
                        </div>
                        <span className="text-[10.5px] text-slate-500 dark:text-slate-400 tabular-nums">
                            ทั้งหมด {dashboardStats.dahua?.total ?? 0} · เสร็จ <strong className="text-emerald-600 dark:text-emerald-400">{dashboardStats.dahua?.done ?? 0}</strong>
                        </span>
                    </div>

                    <div className="w-full h-1 bg-slate-200/80 dark:bg-white/[0.08] rounded-full overflow-hidden">
                        <div className="bg-orange-500 h-full rounded-full transition-all duration-300" style={{ width: `${dashboardStats.dahua?.rate ?? 0}%` }} />
                    </div>
                </button>

                {/* Team C (Network · UPS · Online) */}
                <button
                    type="button"
                    onClick={handleGroupCClick}
                    className={`relative p-3 sm:p-3.5 rounded-xl text-left transition-all duration-150 flex flex-col justify-between border cursor-pointer ${
                        isTeamCExpanded || teamFilter === 'GROUP_C' || teamFilter === Team.TEAM_C || teamFilter === Team.TEAM_E || teamFilter === Team.TEAM_G
                            ? 'bg-violet-50/70 dark:bg-violet-500/10 border-violet-500 ring-1 ring-violet-500/30 shadow-xs'
                            : 'bg-slate-50/80 dark:bg-[#1a1d24] border-slate-200/70 dark:border-white/[0.06] hover:border-violet-400/50 dark:hover:border-violet-500/40'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                isTeamCExpanded || teamFilter === 'GROUP_C' || teamFilter === Team.TEAM_C || teamFilter === Team.TEAM_E || teamFilter === Team.TEAM_G
                                    ? 'bg-violet-500 text-white'
                                    : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                            }`}>
                                <span className="font-black text-xs">C</span>
                            </div>
                            <div className="min-w-0">
                                <h3 className={`font-bold text-xs sm:text-sm leading-tight truncate flex items-center gap-1 ${
                                    isTeamCExpanded || teamFilter === 'GROUP_C' || teamFilter === Team.TEAM_C || teamFilter === Team.TEAM_E || teamFilter === Team.TEAM_G
                                        ? 'text-violet-600 dark:text-violet-400'
                                        : 'text-slate-900 dark:text-white'
                                }`}>
                                    ทีม C
                                    <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${isTeamCExpanded ? 'rotate-180' : ''}`} />
                                </h3>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate block">Network · UPS · Online</span>
                            </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                            isTeamCExpanded || teamFilter === 'GROUP_C' || teamFilter === Team.TEAM_C || teamFilter === Team.TEAM_E || teamFilter === Team.TEAM_G
                                ? 'bg-violet-500 text-white'
                                : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                        }`}>
                            {dashboardStats.groupC?.rate ?? 0}%
                        </span>
                    </div>

                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                                {dashboardStats.groupC?.active ?? 0}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">ชิ้นค้าง</span>
                        </div>
                        <span className="text-[10.5px] text-slate-500 dark:text-slate-400 tabular-nums">
                            ทั้งหมด {dashboardStats.groupC?.total ?? 0} · เสร็จ <strong className="text-emerald-600 dark:text-emerald-400">{dashboardStats.groupC?.done ?? 0}</strong>
                        </span>
                    </div>

                    <div className="w-full h-1 bg-slate-200/80 dark:bg-white/[0.08] rounded-full overflow-hidden">
                        <div className="bg-violet-500 h-full rounded-full transition-all duration-300" style={{ width: `${dashboardStats.groupC?.rate ?? 0}%` }} />
                    </div>
                </button>
            </div>

            {/* Sub-teams of Team C */}
            {isTeamCExpanded && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-violet-500/5 dark:bg-violet-950/20 border border-violet-500/15 overflow-x-auto scrollbar-hide animate-fade-in text-xs">
                    <span className="text-[11px] text-violet-600 dark:text-violet-400 font-bold shrink-0 ml-1">แผนกย่อยทีม C:</span>
                    <button
                        type="button"
                        onClick={() => setTeamFilter('GROUP_C')}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-all font-semibold cursor-pointer ${
                            teamFilter === 'GROUP_C'
                                ? 'bg-violet-500 text-white shadow-xs'
                                : 'bg-white dark:bg-[#16181d] text-slate-700 dark:text-slate-300 hover:bg-violet-500/10 border border-slate-200/80 dark:border-white/5'
                        }`}
                    >
                        รวมทุกแผนก ({dashboardStats.groupC?.active ?? 0} ชิ้น)
                    </button>
                    <button
                        type="button"
                        onClick={() => setTeamFilter(Team.TEAM_C)}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-all font-semibold flex items-center gap-1.5 cursor-pointer ${
                            teamFilter === Team.TEAM_C
                                ? 'bg-cyan-500 text-white shadow-xs'
                                : 'bg-white dark:bg-[#16181d] text-slate-700 dark:text-slate-300 hover:bg-cyan-500/10 border border-slate-200/80 dark:border-white/5'
                        }`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                        Network ({dashboardStats.teamC?.active ?? 0})
                    </button>
                    <button
                        type="button"
                        onClick={() => setTeamFilter(Team.TEAM_E)}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-all font-semibold flex items-center gap-1.5 cursor-pointer ${
                            teamFilter === Team.TEAM_E
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-white dark:bg-[#16181d] text-slate-700 dark:text-slate-300 hover:bg-amber-500/10 border border-slate-200/80 dark:border-white/5'
                        }`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        UPS ({dashboardStats.teamE?.active ?? 0})
                    </button>
                    <button
                        type="button"
                        onClick={() => setTeamFilter(Team.TEAM_G)}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-all font-semibold flex items-center gap-1.5 cursor-pointer ${
                            teamFilter === Team.TEAM_G
                                ? 'bg-fuchsia-500 text-white shadow-xs'
                                : 'bg-white dark:bg-[#16181d] text-slate-700 dark:text-slate-300 hover:bg-fuchsia-500/10 border border-slate-200/80 dark:border-white/5'
                        }`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400"></span>
                        Online ({dashboardStats.teamG?.active ?? 0})
                    </button>
                </div>
            )}

            {/* 2. STATUS PIPELINE (All 4 tabs consistently count RMA items "ชิ้น") */}
            <div className="bg-slate-100/90 dark:bg-black/30 p-1 rounded-xl border border-slate-200/80 dark:border-white/[0.06]">
                <div className="grid grid-cols-4 gap-1">
                    {/* ทั้งหมด */}
                    <button
                        type="button"
                        onClick={() => setStatusFilter('ALL')}
                        className={`h-9 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer select-none border min-w-0 ${
                            statusFilter === 'ALL'
                                ? 'bg-white dark:bg-[#1f232b] text-slate-900 dark:text-white border-slate-200/90 dark:border-white/10 shadow-xs'
                                : 'bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/[0.04]'
                        }`}
                    >
                        <Package className={`w-3.5 h-3.5 shrink-0 hidden sm:block ${statusFilter === 'ALL' ? 'text-[#0071e3] dark:text-blue-400' : 'text-slate-400'}`} />
                        <span className="font-semibold text-[11px] sm:text-xs truncate">ทั้งหมด</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 tabular-nums ${
                            statusFilter === 'ALL' ? 'bg-blue-500/15 text-[#0071e3] dark:text-blue-400' : 'bg-black/5 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                        }`}>
                            {dashboardStats.scoped?.total ?? 0}
                        </span>
                    </button>

                    {/* รอรับเรื่อง */}
                    <button
                        type="button"
                        onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
                        className={`h-9 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer select-none border min-w-0 ${
                            statusFilter === 'PENDING'
                                ? 'bg-white dark:bg-[#1f232b] text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 shadow-xs'
                                : 'bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                        }`}
                    >
                        <Clock className={`w-3.5 h-3.5 shrink-0 hidden sm:block ${statusFilter === 'PENDING' ? 'text-blue-500' : 'text-blue-400/70'}`} />
                        <span className="font-semibold text-[11px] sm:text-xs truncate">รอรับเรื่อง</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 tabular-nums ${
                            statusFilter === 'PENDING' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-black/5 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                        }`}>
                            {dashboardStats.scoped?.pendingCount ?? 0}
                        </span>
                    </button>

                    {/* กำลังดำเนินการ */}
                    <button
                        type="button"
                        onClick={() => setStatusFilter(statusFilter === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS')}
                        className={`h-9 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer select-none border min-w-0 ${
                            statusFilter === 'IN_PROGRESS'
                                ? 'bg-white dark:bg-[#1f232b] text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 shadow-xs'
                                : 'bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-900/10'
                        }`}
                    >
                        <Wrench className={`w-3.5 h-3.5 shrink-0 hidden sm:block ${statusFilter === 'IN_PROGRESS' ? 'text-amber-500' : 'text-amber-400/70'}`} />
                        <span className="font-semibold text-[11px] sm:text-xs truncate">
                            <span className="hidden sm:inline">กำลัง</span>ดำเนินการ
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 tabular-nums ${
                            statusFilter === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-black/5 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                        }`}>
                            {dashboardStats.scoped?.inProgressCount ?? 0}
                        </span>
                    </button>

                    {/* เสร็จสิ้นแล้ว */}
                    <button
                        type="button"
                        onClick={() => setStatusFilter(statusFilter === 'DONE' ? 'ALL' : 'DONE')}
                        className={`h-9 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer select-none border min-w-0 ${
                            statusFilter === 'DONE'
                                ? 'bg-white dark:bg-[#1f232b] text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 shadow-xs'
                                : 'bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10'
                        }`}
                    >
                        <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 hidden sm:block ${statusFilter === 'DONE' ? 'text-emerald-500' : 'text-emerald-400/70'}`} />
                        <span className="font-semibold text-[11px] sm:text-xs truncate">
                            เสร็จสิ้น<span className="hidden sm:inline">แล้ว</span>
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 tabular-nums ${
                            statusFilter === 'DONE' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-black/5 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                        }`}>
                            {dashboardStats.scoped?.doneCount ?? 0}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};
