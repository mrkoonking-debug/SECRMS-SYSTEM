import React from 'react';
import { Team } from '../types';
import { Layers, ChevronDown, Package, Clock, Wrench, CheckCircle2 } from 'lucide-react';

interface ClaimsFilterHubProps {
    teamFilter: 'ALL' | 'GROUP_C' | Team;
    setTeamFilter: (t: 'ALL' | 'GROUP_C' | Team) => void;
    statusFilter: 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'DONE';
    setStatusFilter: (s: 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'DONE') => void;
    isTeamCExpanded: boolean;
    setIsTeamCExpanded: (b: boolean) => void;
    filterLayoutOrder: 'TEAM_FIRST' | 'STATUS_FIRST';
    toggleFilterLayoutOrder: () => void;
    handleClearFilters: () => void;
    activeTeamLabel: string;
    dashboardStats: any;
    isAnyFilterActive: boolean;
    totalJobsCount: number;
    filteredCount: number;
    dateFilter: string;
    activePeriodLabel: string;
    setDateFilter: (d: string) => void;
    setCustomStartDate: (d: string) => void;
    setCustomEndDate: (d: string) => void;
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
    const isTeamCActive =
        isTeamCExpanded ||
        teamFilter === 'GROUP_C' ||
        teamFilter === Team.TEAM_C ||
        teamFilter === Team.TEAM_E ||
        teamFilter === Team.TEAM_G;

    const handleGroupCClick = () => {
        if (teamFilter === 'GROUP_C' || teamFilter === Team.TEAM_C || teamFilter === Team.TEAM_E || teamFilter === Team.TEAM_G) {
            setIsTeamCExpanded(!isTeamCExpanded);
        } else {
            setTeamFilter('GROUP_C');
            setIsTeamCExpanded(true);
        }
    };

    return (
        <div className="bg-white dark:bg-[#16161a] apple-liquid-glass rounded-[24px] sm:rounded-[28px] p-2.5 sm:p-3.5 mb-3 space-y-2.5">
            {/* 1. Compact Apple Team Bar (High-density so Job Cards appear immediately above the fold) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {/* All Teams */}
                <button
                    type="button"
                    onClick={() => { setTeamFilter('ALL'); setIsTeamCExpanded(false); }}
                    className={`relative overflow-hidden px-3 py-2.5 rounded-[16px] text-left transition-all duration-150 border cursor-pointer flex items-center justify-between gap-2 ${
                        teamFilter === 'ALL'
                            ? 'bg-gradient-to-br from-[#0071e3]/14 via-blue-500/8 to-transparent dark:from-[#0071e3]/25 dark:via-blue-600/12 border-[#0071e3] ring-1 ring-[#0071e3]/30 shadow-sm'
                            : 'bg-gray-50/75 dark:bg-white/[0.03] border-gray-200/70 dark:border-white/[0.06] hover:border-blue-400/50 hover:bg-gray-100/60 dark:hover:bg-white/[0.06]'
                    }`}
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 transition-transform ${
                            teamFilter === 'ALL' ? 'bg-gradient-to-br from-[#007aff] to-[#005bb5] text-white shadow-sm' : 'bg-blue-500/10 text-[#0071e3] dark:text-blue-400'
                        }`}>
                            <Layers className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <div className={`font-extrabold text-xs sm:text-[13px] leading-tight truncate ${
                                teamFilter === 'ALL' ? 'text-[#0071e3] dark:text-blue-400' : 'text-[#1d1d1f] dark:text-white'
                            }`}>
                                ทุกทีม
                            </div>
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                                รวม {dashboardStats.all?.total ?? 0} ชิ้น · เสร็จ {dashboardStats.all?.rate ?? 0}%
                            </div>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <div className="text-lg sm:text-xl font-black text-[#1d1d1f] dark:text-white leading-none">
                            {dashboardStats.all?.active ?? 0}
                        </div>
                        <div className="text-[9.5px] font-bold text-gray-400 mt-0.5">ชิ้นค้าง</div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-black/[0.04] dark:bg-white/[0.06]">
                        <div className="h-full bg-[#0071e3] transition-all duration-500" style={{ width: `${dashboardStats.all?.rate ?? 0}%` }} />
                    </div>
                </button>

                {/* Team A (HIKVISION) */}
                <button
                    type="button"
                    onClick={() => { setTeamFilter(Team.HIKVISION); setIsTeamCExpanded(false); }}
                    className={`relative overflow-hidden px-3 py-2.5 rounded-[16px] text-left transition-all duration-150 border cursor-pointer flex items-center justify-between gap-2 ${
                        teamFilter === Team.HIKVISION
                            ? 'bg-gradient-to-br from-red-500/14 via-red-500/8 to-transparent dark:from-red-600/25 dark:via-red-700/12 border-red-500 ring-1 ring-red-500/30 shadow-sm'
                            : 'bg-gray-50/75 dark:bg-white/[0.03] border-gray-200/70 dark:border-white/[0.06] hover:border-red-400/50 hover:bg-gray-100/60 dark:hover:bg-white/[0.06]'
                    }`}
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 font-black text-xs transition-transform ${
                            teamFilter === Team.HIKVISION ? 'bg-gradient-to-br from-[#ff3b30] to-[#d62217] text-white shadow-sm' : 'bg-red-500/10 text-red-600 dark:text-red-400'
                        }`}>
                            A
                        </div>
                        <div className="min-w-0">
                            <div className={`font-extrabold text-xs sm:text-[13px] leading-tight truncate ${
                                teamFilter === Team.HIKVISION ? 'text-red-600 dark:text-red-400' : 'text-[#1d1d1f] dark:text-white'
                            }`}>
                                ทีม A · HIK
                            </div>
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                                รวม {dashboardStats.hik?.total ?? 0} ชิ้น · เสร็จ {dashboardStats.hik?.rate ?? 0}%
                            </div>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <div className="text-lg sm:text-xl font-black text-[#1d1d1f] dark:text-white leading-none">
                            {dashboardStats.hik?.active ?? 0}
                        </div>
                        <div className="text-[9.5px] font-bold text-gray-400 mt-0.5">ชิ้นค้าง</div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-black/[0.04] dark:bg-white/[0.06]">
                        <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${dashboardStats.hik?.rate ?? 0}%` }} />
                    </div>
                </button>

                {/* Team B (DAHUA) */}
                <button
                    type="button"
                    onClick={() => { setTeamFilter(Team.DAHUA); setIsTeamCExpanded(false); }}
                    className={`relative overflow-hidden px-3 py-2.5 rounded-[16px] text-left transition-all duration-150 border cursor-pointer flex items-center justify-between gap-2 ${
                        teamFilter === Team.DAHUA
                            ? 'bg-gradient-to-br from-orange-500/14 via-orange-500/8 to-transparent dark:from-orange-600/25 dark:via-orange-700/12 border-orange-500 ring-1 ring-orange-500/30 shadow-sm'
                            : 'bg-gray-50/75 dark:bg-white/[0.03] border-gray-200/70 dark:border-white/[0.06] hover:border-orange-400/50 hover:bg-gray-100/60 dark:hover:bg-white/[0.06]'
                    }`}
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 font-black text-xs transition-transform ${
                            teamFilter === Team.DAHUA ? 'bg-gradient-to-br from-[#ff9500] to-[#d97706] text-white shadow-sm' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                        }`}>
                            B
                        </div>
                        <div className="min-w-0">
                            <div className={`font-extrabold text-xs sm:text-[13px] leading-tight truncate ${
                                teamFilter === Team.DAHUA ? 'text-orange-600 dark:text-orange-400' : 'text-[#1d1d1f] dark:text-white'
                            }`}>
                                ทีม B · DAHUA
                            </div>
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                                รวม {dashboardStats.dahua?.total ?? 0} ชิ้น · เสร็จ {dashboardStats.dahua?.rate ?? 0}%
                            </div>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <div className="text-lg sm:text-xl font-black text-[#1d1d1f] dark:text-white leading-none">
                            {dashboardStats.dahua?.active ?? 0}
                        </div>
                        <div className="text-[9.5px] font-bold text-gray-400 mt-0.5">ชิ้นค้าง</div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-black/[0.04] dark:bg-white/[0.06]">
                        <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${dashboardStats.dahua?.rate ?? 0}%` }} />
                    </div>
                </button>

                {/* Team C (Network · UPS · Online) */}
                <button
                    type="button"
                    onClick={handleGroupCClick}
                    className={`relative overflow-hidden px-3 py-2.5 rounded-[16px] text-left transition-all duration-150 border cursor-pointer flex items-center justify-between gap-2 ${
                        isTeamCActive
                            ? 'bg-gradient-to-br from-violet-500/14 via-violet-500/8 to-transparent dark:from-violet-600/25 dark:via-violet-700/12 border-violet-500 ring-1 ring-violet-500/30 shadow-sm'
                            : 'bg-gray-50/75 dark:bg-white/[0.03] border-gray-200/70 dark:border-white/[0.06] hover:border-violet-400/50 hover:bg-gray-100/60 dark:hover:bg-white/[0.06]'
                    }`}
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 font-black text-xs transition-transform ${
                            isTeamCActive ? 'bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] text-white shadow-sm' : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                        }`}>
                            C
                        </div>
                        <div className="min-w-0">
                            <div className={`font-extrabold text-xs sm:text-[13px] leading-tight truncate flex items-center gap-1 ${
                                isTeamCActive ? 'text-violet-600 dark:text-violet-400' : 'text-[#1d1d1f] dark:text-white'
                            }`}>
                                <span>ทีม C</span>
                                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isTeamCExpanded ? 'rotate-180' : ''}`} />
                            </div>
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                                Net·UPS·Online ({dashboardStats.groupC?.rate ?? 0}%)
                            </div>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <div className="text-lg sm:text-xl font-black text-[#1d1d1f] dark:text-white leading-none">
                            {dashboardStats.groupC?.active ?? 0}
                        </div>
                        <div className="text-[9.5px] font-bold text-gray-400 mt-0.5">ชิ้นค้าง</div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-black/[0.04] dark:bg-white/[0.06]">
                        <div className="h-full bg-violet-500 transition-all duration-500" style={{ width: `${dashboardStats.groupC?.rate ?? 0}%` }} />
                    </div>
                </button>
            </div>

            {/* Sub-teams of Team C (Inline chips when expanded) */}
            {isTeamCExpanded && (
                <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-[14px] bg-violet-500/5 dark:bg-violet-950/20 border border-violet-500/15 overflow-x-auto scrollbar-hide animate-fade-in text-xs">
                    <span className="text-[11px] text-violet-600 dark:text-violet-400 font-bold shrink-0 ml-1">แผนกย่อยทีม C:</span>
                    <button
                        type="button"
                        onClick={() => setTeamFilter('GROUP_C')}
                        className={`px-3 py-1 rounded-full text-xs transition-all font-semibold cursor-pointer shrink-0 ${
                            teamFilter === 'GROUP_C'
                                ? 'bg-violet-500 text-white shadow-xs'
                                : 'bg-white dark:bg-[#16161a] text-gray-700 dark:text-gray-300 hover:bg-violet-500/10 border border-gray-200/60 dark:border-white/5'
                        }`}
                    >
                        รวม ({dashboardStats.groupC?.active ?? 0})
                    </button>
                    <button
                        type="button"
                        onClick={() => setTeamFilter(Team.TEAM_C)}
                        className={`px-3 py-1 rounded-full text-xs transition-all font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 ${
                            teamFilter === Team.TEAM_C
                                ? 'bg-cyan-500 text-white shadow-xs'
                                : 'bg-white dark:bg-[#16161a] text-gray-700 dark:text-gray-300 hover:bg-cyan-500/10 border border-gray-200/60 dark:border-white/5'
                        }`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                        Network ({dashboardStats.teamC?.active ?? 0})
                    </button>
                    <button
                        type="button"
                        onClick={() => setTeamFilter(Team.TEAM_E)}
                        className={`px-3 py-1 rounded-full text-xs transition-all font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 ${
                            teamFilter === Team.TEAM_E
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-white dark:bg-[#16161a] text-gray-700 dark:text-gray-300 hover:bg-amber-500/10 border border-gray-200/60 dark:border-white/5'
                        }`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        UPS ({dashboardStats.teamE?.active ?? 0})
                    </button>
                    <button
                        type="button"
                        onClick={() => setTeamFilter(Team.TEAM_G)}
                        className={`px-3 py-1 rounded-full text-xs transition-all font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 ${
                            teamFilter === Team.TEAM_G
                                ? 'bg-fuchsia-500 text-white shadow-xs'
                                : 'bg-white dark:bg-[#16161a] text-gray-700 dark:text-gray-300 hover:bg-fuchsia-500/10 border border-gray-200/60 dark:border-white/5'
                        }`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400"></span>
                        Online ({dashboardStats.teamG?.active ?? 0})
                    </button>
                </div>
            )}

            {/* 2. Apple Capsule Segmented Status Track (All 4 tabs count items consistently) */}
            {(() => {
                const activeStatusIdx = statusFilter === 'ALL' ? 0 : statusFilter === 'PENDING' ? 1 : statusFilter === 'IN_PROGRESS' ? 2 : 3;
                const activeBorderClass =
                    statusFilter === 'ALL' ? 'border-gray-200/90 dark:border-white/10' :
                    statusFilter === 'PENDING' ? 'border-blue-200 dark:border-blue-500/30' :
                    statusFilter === 'IN_PROGRESS' ? 'border-amber-200 dark:border-amber-500/30' :
                    'border-emerald-200 dark:border-emerald-500/30';
                return (
                    <div className="bg-gray-100/90 dark:bg-black/40 p-1 rounded-full border border-gray-200/75 dark:border-white/[0.06] shadow-inner">
                        <div className="relative grid grid-cols-4 items-center">
                            {/* Sliding Dynamic Capsule Indicator */}
                            <div
                                aria-hidden="true"
                                className={`pointer-events-none absolute inset-y-0 left-0 w-1/4 rounded-full bg-white dark:bg-[#222226] shadow-sm border transition-[transform,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${activeBorderClass}`}
                                style={{ transform: `translateX(${activeStatusIdx * 100}%)` }}
                            />

                            {/* ทั้งหมด */}
                            <button
                                type="button"
                                onClick={() => setStatusFilter('ALL')}
                                className={`relative z-10 h-8 sm:h-9 px-1.5 sm:px-3 rounded-full flex items-center justify-center gap-1 sm:gap-1.5 transition-colors duration-200 cursor-pointer select-none min-w-0 ${
                                    statusFilter === 'ALL'
                                        ? 'text-[#1d1d1f] dark:text-white'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                <Package className={`w-3.5 h-3.5 shrink-0 hidden min-[390px]:block ${
                                    statusFilter === 'ALL' ? 'text-[#0071e3] dark:text-blue-400' : 'text-gray-400'
                                }`} />
                                <span className="font-bold text-[11px] sm:text-xs truncate">ทั้งหมด</span>
                                <span className={`text-[9.5px] sm:text-[11px] font-black px-1.5 py-0.2 rounded-full shrink-0 ${
                                    statusFilter === 'ALL'
                                        ? 'bg-blue-500/15 text-[#0071e3] dark:text-blue-400'
                                        : 'bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                                }`}>
                                    {dashboardStats.scoped?.total ?? 0}
                                </span>
                            </button>

                            {/* รอรับเรื่อง */}
                            <button
                                type="button"
                                onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
                                className={`relative z-10 h-8 sm:h-9 px-1.5 sm:px-3 rounded-full flex items-center justify-center gap-1 sm:gap-1.5 transition-colors duration-200 cursor-pointer select-none min-w-0 ${
                                    statusFilter === 'PENDING'
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-300'
                                }`}
                            >
                                <Clock className={`w-3.5 h-3.5 shrink-0 hidden min-[390px]:block ${
                                    statusFilter === 'PENDING' ? 'text-blue-500' : 'text-blue-400/60'
                                }`} />
                                <span className="font-bold text-[11px] sm:text-xs truncate">รอรับเรื่อง</span>
                                <span className={`text-[9.5px] sm:text-[11px] font-black px-1.5 py-0.2 rounded-full shrink-0 ${
                                    statusFilter === 'PENDING'
                                        ? 'bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-500/30'
                                        : 'bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                                }`}>
                                    {dashboardStats.scoped?.pendingCount ?? 0}
                                </span>
                            </button>

                            {/* กำลังดำเนินการ */}
                            <button
                                type="button"
                                onClick={() => setStatusFilter(statusFilter === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS')}
                                className={`relative z-10 h-8 sm:h-9 px-1.5 sm:px-3 rounded-full flex items-center justify-center gap-1 sm:gap-1.5 transition-colors duration-200 cursor-pointer select-none min-w-0 ${
                                    statusFilter === 'IN_PROGRESS'
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-300'
                                }`}
                            >
                                <Wrench className={`w-3.5 h-3.5 shrink-0 hidden min-[390px]:block ${
                                    statusFilter === 'IN_PROGRESS' ? 'text-amber-500' : 'text-amber-400/60'
                                }`} />
                                <span className="font-bold text-[11px] sm:text-xs truncate">
                                    <span className="hidden sm:inline">กำลัง</span>ดำเนินการ
                                </span>
                                <span className={`text-[9.5px] sm:text-[11px] font-black px-1.5 py-0.2 rounded-full shrink-0 ${
                                    statusFilter === 'IN_PROGRESS'
                                        ? 'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-500/30'
                                        : 'bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                                }`}>
                                    {dashboardStats.scoped?.inProgressCount ?? 0}
                                </span>
                            </button>

                            {/* เสร็จสิ้นแล้ว */}
                            <button
                                type="button"
                                onClick={() => setStatusFilter(statusFilter === 'DONE' ? 'ALL' : 'DONE')}
                                className={`relative z-10 h-8 sm:h-9 px-1.5 sm:px-3 rounded-full flex items-center justify-center gap-1 sm:gap-1.5 transition-colors duration-200 cursor-pointer select-none min-w-0 ${
                                    statusFilter === 'DONE'
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-300'
                                }`}
                            >
                                <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 hidden min-[390px]:block ${
                                    statusFilter === 'DONE' ? 'text-emerald-500' : 'text-emerald-400/60'
                                }`} />
                                <span className="font-bold text-[11px] sm:text-xs truncate">
                                    เสร็จสิ้น<span className="hidden sm:inline">แล้ว</span>
                                </span>
                                <span className={`text-[9.5px] sm:text-[11px] font-black px-1.5 py-0.2 rounded-full shrink-0 ${
                                    statusFilter === 'DONE'
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/30'
                                        : 'bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                                }`}>
                                    {dashboardStats.scoped?.doneCount ?? 0}
                                </span>
                            </button>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
