import React, { useEffect, useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { DashboardStats, Team, RMAStatus } from '../types';
import { MockDb } from '../services/mockDb';
import { Clock, CheckCircle2, AlertTriangle, Truck, TrendingUp, AlertOctagon, Timer, ChevronRight, Layers, Box, Wifi, Zap, ShoppingBag, ChevronDown, RefreshCw, Activity, Package, ArrowUpRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../components/StatusBadge';
import { AdminPageSkeleton } from '../components/AdminPageSkeleton';

const getTeamColorClass = (team: string) => {
    switch (team) {
        case 'ALL': return 'bg-[#1d1d1f] dark:bg-white text-white dark:text-gray-950 shadow-md';
        case 'A': return 'bg-red-500 text-white shadow-md shadow-red-500/25';
        case 'B': return 'bg-orange-500 text-white shadow-md shadow-orange-500/25';
        case 'C': return 'bg-[#0071e3] text-white shadow-md shadow-blue-500/25';
        default: return 'bg-[#1d1d1f] dark:bg-white text-white dark:text-gray-950 shadow-md';
    }
};

const getSubTeamColorClass = (team: string) => {
    switch (team) {
        case Team.TEAM_C: return 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25';
        case Team.TEAM_E: return 'bg-amber-500 text-white shadow-md shadow-amber-500/25';
        case Team.TEAM_G: return 'bg-fuchsia-500 text-white shadow-md shadow-fuchsia-500/25';
        default: return 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25';
    }
};

interface StatCardProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    pillLabel?: string;
    pillColor?: string;
    subLabel?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color, pillLabel, pillColor, subLabel }) => (
    <div className="bg-white dark:bg-[#16161a] apple-liquid-glass rounded-[32px] md:rounded-[38px] p-5 sm:p-6 md:p-7 flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group border border-gray-200/80 dark:border-white/[0.08]">
        <div className="flex items-center justify-between gap-2 mb-3.5 md:mb-5">
            {/* macOS / Apple-style Squircle Icon Badge with 3D Bevel */}
            <div className={`w-11 h-11 md:w-12 md:h-12 rounded-[18px] flex items-center justify-center flex-shrink-0 text-white shadow-md ${color} apple-card-sm transition-transform group-hover:scale-105`}>
                {icon}
            </div>
            {pillLabel && (
                <span className={`text-[10px] md:text-[11px] font-bold px-3 py-1 rounded-full border apple-card-sm ${pillColor || 'bg-black/5 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 border-black/5 dark:border-white/10'}`}>
                    {pillLabel}
                </span>
            )}
        </div>

        <div>
            <div className="text-2xl sm:text-3xl md:text-[34px] font-black text-[#1d1d1f] dark:text-white tracking-tight leading-none mb-1.5">
                {value}
            </div>
            <div className="text-xs md:text-sm font-bold text-gray-600 dark:text-gray-400">
                {label}
            </div>
            {subLabel && (
                <div className="text-[10.5px] text-gray-400 dark:text-gray-500 font-medium mt-1">
                    {subLabel}
                </div>
            )}
        </div>
    </div>
);

export const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [selectedTeam, setSelectedTeam] = useState<Team | 'ALL' | 'GROUP_C'>('ALL');
    const [isGroupCActive, setIsGroupCActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { t, language } = useLanguage();

    useEffect(() => {
        // Trigger overdue email notifications in background only once on page mount
        MockDb.checkAndSendOverdueEmails().catch(e => console.error("checkAndSendOverdueEmails failed:", e));
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setError(null);
                const teamFilter = selectedTeam === 'ALL' ? undefined : selectedTeam;
                const data = await MockDb.getStats(teamFilter);
                setStats(data);
            } catch (err: unknown) {
                console.error('Dashboard fetch failed:', err);
                setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลได้');
            }
        };
        fetchData();

        if (selectedTeam === 'GROUP_C' || [Team.TEAM_C, Team.TEAM_E, Team.TEAM_G].includes(selectedTeam as Team)) {
            setIsGroupCActive(true);
        } else if (selectedTeam !== 'ALL') {
            setIsGroupCActive(false);
        }
    }, [selectedTeam]);

    const handleMainFilterClick = (type: 'ALL' | 'A' | 'B' | 'C') => {
        if (type === 'ALL') { setSelectedTeam('ALL'); setIsGroupCActive(false); }
        else if (type === 'A') { setSelectedTeam(Team.HIKVISION); setIsGroupCActive(false); }
        else if (type === 'B') { setSelectedTeam(Team.DAHUA); setIsGroupCActive(false); }
        else if (type === 'C') { setSelectedTeam('GROUP_C'); setIsGroupCActive(true); }
    };

    const statusData = useMemo(() => {
        if (!stats) return [];
        return [
            { name: 'รอดำเนินการ', value: stats.statusCounts.pending, fill: '#f59e0b' },
            { name: 'ตรวจสอบ', value: stats.statusCounts.diagnosing, fill: '#3b82f6' },
            { name: 'ส่งศูนย์', value: stats.statusCounts.waitingParts, fill: '#f97316' },
            { name: 'สลับของสต๊อก', value: stats.statusCounts.replacedFromStock, fill: '#8b5cf6' },
            { name: 'แก้ไขเรียบร้อย', value: stats.statusCounts.repaired, fill: '#10b981' },
            { name: 'ปิดงาน', value: stats.statusCounts.closed, fill: '#6b7280' },
            { name: 'เข้าคลังคืน', value: stats.statusCounts.returnedFromVendor, fill: '#14b8a6' },
        ];
    }, [stats]);

    if (error) return (
        <div className="max-w-md mx-auto mt-20 text-center bg-white dark:bg-[#16161a] apple-liquid-glass p-8 rounded-[28px]">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-8 h-8" /></div>
            <h2 className="text-lg font-bold text-[#1d1d1f] dark:text-white mb-2">โหลดข้อมูลไม่สำเร็จ</h2>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <button onClick={() => window.location.reload()} className="px-6 py-3 bg-[#0071e3] text-white rounded-xl font-bold flex items-center gap-2 mx-auto shadow-md"><RefreshCw className="w-4 h-4" /> ลองใหม่</button>
        </div>
    );

    if (!stats) return (
        <AdminPageSkeleton title="กำลังประมวลผลข้อมูลแดชบอร์ด..." />
    );

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-5 md:py-8">
            {/* Header with Title and Modern Sliding Team Switcher */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 md:mb-10 gap-5">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-[#0071e3] dark:text-blue-400 border border-blue-500/20 mb-2.5 apple-card-sm">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        ศูนย์วิเคราะห์ข้อมูลแบบเรียลไทม์
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[#1d1d1f] dark:text-white tracking-tight mb-1">{t('dashboard.title')}</h1>
                    <p className="text-xs md:text-base text-gray-500 dark:text-gray-400">{t('dashboard.welcome')}</p>
                </div>

                <div className="flex flex-col gap-2.5">
                    {/* Apple Liquid Pill Segmented Control with Sliding Dynamic Indicator */}
                    <div className="apple-liquid-pill p-1 rounded-full grid grid-cols-4 items-center relative w-full md:max-w-[480px] flex-shrink-0 bg-gray-100/90 dark:bg-[#121215] border border-gray-200/70 dark:border-white/[0.08] shadow-inner">
                        {/* Sliding Dynamic Indicator */}
                        <div 
                          className={`absolute top-1 bottom-1 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] transform translate-z-0 ${getTeamColorClass(
                            selectedTeam === 'ALL' ? 'ALL' : 
                            selectedTeam === Team.HIKVISION ? 'A' : 
                            selectedTeam === Team.DAHUA ? 'B' : 'C'
                          )}`}
                          style={{
                            width: 'calc(25% - 4px)',
                            left: `calc(${
                              (selectedTeam === 'ALL' ? 0 : 
                               selectedTeam === Team.HIKVISION ? 1 : 
                               selectedTeam === Team.DAHUA ? 2 : 3) * 25
                            }% + 2px)`
                          }}
                        />
                        <button 
                            onClick={() => handleMainFilterClick('ALL')} 
                            className={`relative z-10 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-extrabold whitespace-nowrap text-center transition-colors duration-200 outline-none ${selectedTeam === 'ALL' ? 'text-white dark:text-black' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                        >
                            {language === 'en' ? 'All Teams' : 'ทุกทีม'}
                        </button>
                        <button 
                            onClick={() => handleMainFilterClick('A')} 
                            className={`relative z-10 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-extrabold whitespace-nowrap text-center transition-colors duration-200 flex items-center justify-center gap-1.5 outline-none ${selectedTeam === Team.HIKVISION ? 'text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                        >
                            <Box className="w-3.5 h-3.5 hidden sm:inline" /> Team A
                        </button>
                        <button 
                            onClick={() => handleMainFilterClick('B')} 
                            className={`relative z-10 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-extrabold whitespace-nowrap text-center transition-colors duration-200 flex items-center justify-center gap-1.5 outline-none ${selectedTeam === Team.DAHUA ? 'text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                        >
                            <Layers className="w-3.5 h-3.5 hidden sm:inline" /> Team B
                        </button>
                        <button 
                            onClick={() => handleMainFilterClick('C')} 
                            className={`relative z-10 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-extrabold whitespace-nowrap text-center transition-colors duration-200 flex items-center justify-center gap-1.5 outline-none ${isGroupCActive ? 'text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                        >
                            <Wifi className="w-3.5 h-3.5 hidden sm:inline" /> Team C <ChevronDown className={`w-3 h-3 ${isGroupCActive ? 'rotate-180' : ''} transition-transform hidden sm:inline`} />
                        </button>
                    </div>

                    {isGroupCActive && (
                        <div className="apple-liquid-pill p-1 rounded-full grid grid-cols-3 items-center relative w-full max-w-[280px] md:max-w-[360px] flex-shrink-0 animate-fade-in bg-gray-100/90 dark:bg-[#121215] border border-gray-200/70 dark:border-white/[0.08] shadow-inner self-start md:self-end">
                            {selectedTeam !== 'GROUP_C' && (
                                <div 
                                  className={`absolute top-1 bottom-1 rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.2)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] transform translate-z-0 ${getSubTeamColorClass(selectedTeam)}`}
                                  style={{
                                    width: 'calc(33.333% - 4px)',
                                    left: `calc(${
                                      (selectedTeam === Team.TEAM_C ? 0 : 
                                       selectedTeam === Team.TEAM_E ? 1 : 
                                       selectedTeam === Team.TEAM_G ? 2 : 0) * 33.333
                                    }% + 2px)`
                                  }}
                                />
                            )}
                            <button onClick={() => setSelectedTeam(Team.TEAM_C)} className={`relative z-10 py-1.5 rounded-full text-[11px] md:text-xs font-bold text-center transition-colors duration-200 outline-none ${selectedTeam === Team.TEAM_C ? 'text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'}`}>Network</button>
                            <button onClick={() => setSelectedTeam(Team.TEAM_E)} className={`relative z-10 py-1.5 rounded-full text-[11px] md:text-xs font-bold text-center transition-colors duration-200 outline-none ${selectedTeam === Team.TEAM_E ? 'text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'}`}>UPS</button>
                            <button onClick={() => setSelectedTeam(Team.TEAM_G)} className={`relative z-10 py-1.5 rounded-full text-[11px] md:text-xs font-bold text-center transition-colors duration-200 outline-none ${selectedTeam === Team.TEAM_G ? 'text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'}`}>Online</button>
                        </div>
                    )}
                </div>
            </div>

            {/* 4 Bento Stat Cards with Apple Liquid Glass Tactile Surfaces */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-8">
                <StatCard 
                    label={t('dashboard.pendingAction')} 
                    value={stats.pendingRMAs} 
                    icon={<Clock className="w-5 h-5 md:w-6 md:h-6 text-white" />} 
                    color="bg-gradient-to-br from-blue-500 to-[#0071e3]" 
                    pillLabel="รอดำเนินการ"
                    pillColor="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                    subLabel="ต้องตรวจสอบที่ร้าน"
                />
                <StatCard 
                    label={t('dashboard.revenuePipeline')} 
                    value={stats.revenuePipeline} 
                    icon={<Truck className="w-5 h-5 md:w-6 md:h-6 text-white" />} 
                    color="bg-gradient-to-br from-orange-500 to-amber-600" 
                    pillLabel="ส่งซ่อมศูนย์"
                    pillColor="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
                    subLabel="ของค้างที่ซัพพลายเออร์"
                />
                <StatCard 
                    label={t('dashboard.avgTurnaround')} 
                    value={`${Math.round(stats.avgTurnaroundHours / 24)} ${t('dashboard.days')}`} 
                    icon={<Timer className="w-5 h-5 md:w-6 md:h-6 text-white" />} 
                    color="bg-gradient-to-br from-purple-500 to-indigo-600" 
                    pillLabel="รอบเวลาเคลม"
                    pillColor="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                    subLabel={`~${stats.avgTurnaroundHours} ชม. ต่อใบงาน`}
                />
                <StatCard 
                    label={t('dashboard.overdue')} 
                    value={stats.overdueCount} 
                    icon={<AlertOctagon className="w-5 h-5 md:w-6 md:h-6 text-white" />} 
                    color={stats.overdueCount > 0 ? "bg-gradient-to-br from-red-500 to-rose-600" : "bg-gradient-to-br from-emerald-500 to-teal-600"} 
                    pillLabel={stats.overdueCount > 0 ? 'เกินกำหนด' : 'ปกติ'}
                    pillColor={stats.overdueCount > 0 ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"}
                    subLabel="ล่าช้ามากกว่า 15 วัน"
                />
            </div>

            {/* Main Bento Grid: Status Chart & Urgent Action Deck */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-7">
                {/* Left Card: Status Distribution Bar Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-[#16161a] apple-liquid-glass rounded-[32px] sm:rounded-[38px] md:rounded-[44px] p-6 sm:p-8 md:p-9 border border-gray-200/80 dark:border-white/[0.08] shadow-md flex flex-col justify-between">
                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-[14px] bg-blue-500/10 text-[#0071e3] flex items-center justify-center font-black">
                                        <Layers className="w-4 h-4" />
                                    </div>
                                    <h3 className="text-base md:text-xl font-extrabold text-[#1d1d1f] dark:text-white">
                                        สรุปงานแยกตามสถานะ
                                    </h3>
                                </div>
                                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1 pl-11.5">
                                    จำนวนงานเคลมในแต่ละขั้นตอนปัจจุบัน
                                </p>
                            </div>

                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/[0.03] dark:bg-black/40 border border-black/5 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-gray-300 self-start sm:self-auto apple-card-sm">
                                <span className="w-2 h-2 rounded-full bg-[#0071e3] animate-pulse"></span>
                                รวม <span className="font-extrabold text-[#0071e3] dark:text-blue-400">{stats.totalRMAs}</span> งานในระบบ
                            </div>
                        </div>

                        {/* Bar Chart with Apple rounded styling */}
                        <div className="h-64 sm:h-76 w-full my-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={statusData} maxBarSize={44}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.08)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#86868b', fontWeight: 600 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#86868b', fontWeight: 600 }} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ 
                                            borderRadius: '20px', 
                                            background: '#1c1c20', 
                                            border: '1px solid rgba(255,255,255,0.12)', 
                                            boxShadow: '0 8px 30px rgba(0,0,0,0.5)', 
                                            color: '#fff',
                                            fontWeight: 600
                                        }}
                                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                        formatter={(value: number) => [`${value} งาน`, 'จำนวน']}
                                    />
                                    <Bar dataKey="value" radius={[12, 12, 12, 12]}>
                                        {statusData.map((entry, index) => (
                                            <Cell key={index} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Status Distribution Pills Footer */}
                    <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {statusData.map((s, i) => (
                            <div key={i} className="flex items-center justify-between px-3 py-2 rounded-full bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.04]">
                                <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-400">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.fill }}></span>
                                    {s.name}
                                </span>
                                <span className="font-extrabold text-[#1d1d1f] dark:text-white">{s.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Card: Urgent Attention Items Deck */}
                <div className="bg-white dark:bg-[#16161a] apple-liquid-glass rounded-[32px] sm:rounded-[38px] md:rounded-[44px] p-6 sm:p-8 md:p-9 flex flex-col border border-gray-200/80 dark:border-white/[0.08] shadow-md">
                    <div className="flex items-center justify-between gap-2 mb-4 md:mb-6">
                        <div>
                            <h3 className="text-base md:text-xl font-extrabold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" /> {t('dashboard.urgentAttention')}
                            </h3>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">ต้องได้รับการติดตามทันที</p>
                        </div>
                        <span className="px-3.5 py-1 rounded-full text-xs font-black bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30">
                            {stats.urgentRMAs.length} งาน
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar max-h-[360px] sm:max-h-[460px]">
                        {stats.urgentRMAs.length === 0 ? (
                            <div className="h-full min-h-[220px] flex flex-col items-center justify-center p-8 text-center bg-emerald-500/5 rounded-[28px] border border-emerald-500/20">
                                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">ไม่มีงานด่วนค้าง</div>
                                <p className="text-xs text-gray-400 mt-1">ทุกใบงานดำเนินการตามกำหนดเวลาปกติ</p>
                            </div>
                        ) : (
                            stats.urgentRMAs.map(rma => (
                                <Link 
                                    key={rma.id} 
                                    to={`/admin/job/${encodeURIComponent(rma.groupRequestId || rma.id)}`} 
                                    className="block bg-black/[0.02] dark:bg-white/[0.03] apple-card-inner rounded-[24px] md:rounded-[26px] p-4 border border-gray-200/70 dark:border-white/[0.06] hover:border-[#0071e3]/40 dark:hover:border-blue-400/40 hover:-translate-y-0.5 hover:shadow-md transition-all group outline-none"
                                >
                                    <div className="flex justify-between items-start mb-1.5 gap-2">
                                        <div className="font-extrabold text-xs md:text-sm text-[#1d1d1f] dark:text-white group-hover:text-[#0071e3] transition-colors line-clamp-1">
                                            {rma.productModel}
                                        </div>
                                        <div className="text-[9px] font-mono font-bold text-gray-500 dark:text-gray-400 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full flex-shrink-0">
                                            {rma.id}
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2.5 line-clamp-2 leading-relaxed">
                                        {rma.issueDescription}
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-black/5 dark:border-white/5">
                                        <StatusBadge status={rma.status} />
                                        <div className="text-[10px] md:text-[11px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full">
                                            {Math.floor((Date.now() - new Date(rma.createdAt).getTime()) / (86400000))} วันแล้ว
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Section: Aging Analysis Deck */}
            {stats.agingBuckets && (
                <div className="mt-6 md:mt-8 bg-white dark:bg-[#16161a] apple-liquid-glass rounded-[32px] sm:rounded-[38px] md:rounded-[44px] p-6 sm:p-8 md:p-9 border border-gray-200/80 dark:border-white/[0.08] shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-[14px] bg-purple-500/10 text-purple-500 flex items-center justify-center font-black">
                                <Activity className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-base md:text-lg font-extrabold text-[#1d1d1f] dark:text-white">
                                    {t('dashboard.agingAnalysis')}
                                </h3>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    การกระจายตัวของอายุงานค้างในระบบทั้งหมด
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">อัตราหมุนเวียนงาน:</span>
                            <span className="text-xs font-black text-emerald-500">
                                {stats.totalRMAs > 0 ? Math.round(((stats.agingBuckets.bucket0_7) / stats.totalRMAs) * 100) : 100}% อยู่ในเกณฑ์ปกติ
                            </span>
                        </div>
                    </div>

                    {/* Stacked Horizontal Aging Bar */}
                    <div className="w-full h-3.5 bg-black/5 dark:bg-white/[0.05] rounded-full overflow-hidden flex gap-1 p-0.5">
                        <div 
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${stats.totalRMAs > 0 ? Math.max(5, (stats.agingBuckets.bucket0_7 / stats.totalRMAs) * 100) : 33.3}%` }}
                            title={`0-7 วัน: ${stats.agingBuckets.bucket0_7} งาน`}
                        />
                        <div 
                            className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${stats.totalRMAs > 0 ? Math.max(5, (stats.agingBuckets.bucket8_15 / stats.totalRMAs) * 100) : 33.3}%` }}
                            title={`8-15 วัน: ${stats.agingBuckets.bucket8_15} งาน`}
                        />
                        <div 
                            className="bg-red-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${stats.totalRMAs > 0 ? Math.max(5, (stats.agingBuckets.bucket15plus / stats.totalRMAs) * 100) : 33.3}%` }}
                            title={`มากกว่า 15 วัน: ${stats.agingBuckets.bucket15plus} งาน`}
                        />
                    </div>

                    {/* Legend */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
                        <div className="p-3.5 rounded-full sm:rounded-[22px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 flex items-center justify-between">
                            <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400 font-medium">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                {t('dashboard.fresh')} (0-7 วัน)
                            </span>
                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{stats.agingBuckets.bucket0_7} งาน</span>
                        </div>
                        <div className="p-3.5 rounded-full sm:rounded-[22px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 flex items-center justify-between">
                            <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400 font-medium">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                {t('dashboard.aging')} (8-15 วัน)
                            </span>
                            <span className="font-extrabold text-amber-600 dark:text-amber-400">{stats.agingBuckets.bucket8_15} งาน</span>
                        </div>
                        <div className="p-3.5 rounded-full sm:rounded-[22px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 flex items-center justify-between">
                            <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400 font-medium">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                                {t('dashboard.stale')} (15+ วัน)
                            </span>
                            <span className="font-extrabold text-red-600 dark:text-red-400">{stats.agingBuckets.bucket15plus} งาน</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};