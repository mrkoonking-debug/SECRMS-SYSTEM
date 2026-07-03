import React, { useEffect, useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { DashboardStats, Team, RMAStatus } from '../types';
import { MockDb } from '../services/mockDb';
import { Clock, CheckCircle2, AlertTriangle, Truck, TrendingUp, AlertOctagon, Timer, ChevronRight, Layers, Box, Wifi, Zap, ShoppingBag, ChevronDown, RefreshCw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../components/StatusBadge';

export const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [selectedTeam, setSelectedTeam] = useState<Team | 'ALL' | 'GROUP_C'>('ALL');
    const [isGroupCActive, setIsGroupCActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { t } = useLanguage();

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
            { name: 'เข้าคลังคืน', value: stats.statusCounts.returnedFromVendor, fill: '#14b8a6' }, // teal-500
        ];
    }, [stats]);

    if (error) return (
        <div className="max-w-md mx-auto mt-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-8 h-8" /></div>
            <h2 className="text-lg font-bold text-[#1d1d1f] dark:text-white mb-2">โหลดข้อมูลไม่สำเร็จ</h2>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <button onClick={() => window.location.reload()} className="px-6 py-3 bg-[#0071e3] text-white rounded-xl font-bold flex items-center gap-2 mx-auto"><RefreshCw className="w-4 h-4" /> ลองใหม่</button>
        </div>
    );

    if (!stats) return <div className="p-20 text-center text-gray-400">Loading Data...</div>;

    const StatCard = ({ label, value, icon, color, subValue, subLabel }: any) => (
        <div className="glass-panel p-3.5 md:p-6 flex flex-col justify-between relative overflow-hidden group">
            <div className="relative z-10 flex flex-col justify-between h-full">
                <div className={`p-1.5 md:p-2.5 rounded-xl ${color} bg-opacity-10 dark:bg-opacity-20 w-fit flex-shrink-0`}>
                    {React.cloneElement(icon, { className: 'w-4 h-4 md:w-5 md:h-5' })}
                </div>
                <div className="mt-2.5 md:mt-4">
                    <div className="text-xl md:text-2xl font-bold text-[#1d1d1f] dark:text-white tracking-tight leading-none mb-1">{value}</div>
                    <div className="text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400 leading-tight">{label}</div>
                    {subValue && (
                        <div className="text-[9px] md:text-[10px] text-gray-450 dark:text-gray-500 font-medium mt-0.5">
                            {subValue} {subLabel}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 md:py-8">
            <div className="flex flex-col justify-between mb-6 md:mb-12 gap-4 md:gap-6">
                <div>
                    <h1 className="text-lg md:text-4xl lg:text-5xl font-bold text-[#1d1d1f] dark:text-white tracking-tight mb-1">{t('dashboard.title')}</h1>
                    <p className="text-[11px] md:text-lg text-gray-450 dark:text-gray-500">{t('dashboard.welcome')}</p>
                </div>

                <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2 w-full">
                        <button onClick={() => handleMainFilterClick('ALL')} className={`px-4 py-2 md:px-6 md:py-3 rounded-full text-[11px] md:text-sm font-semibold whitespace-nowrap transition-all ${selectedTeam === 'ALL' ? 'bg-[#1d1d1f] dark:bg-white text-white dark:text-black shadow-lg' : 'bg-white dark:bg-[#1c1c1e] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2c2c2e]'}`}>{t('teams.all')}</button>
                        <button onClick={() => handleMainFilterClick('A')} className={`px-4 py-2 md:px-6 md:py-3 rounded-full text-[11px] md:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${selectedTeam === Team.HIKVISION ? 'bg-red-500 text-white shadow-lg' : 'bg-white dark:bg-[#1c1c1e] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2c2c2e]'}`}><Box className="w-3.5 h-3.5" /> Team A</button>
                        <button onClick={() => handleMainFilterClick('B')} className={`px-4 py-2 md:px-6 md:py-3 rounded-full text-[11px] md:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${selectedTeam === Team.DAHUA ? 'bg-orange-500 text-white shadow-lg' : 'bg-white dark:bg-[#1c1c1e] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2c2c2e]'}`}><Layers className="w-3.5 h-3.5" /> Team B</button>
                        <button onClick={() => handleMainFilterClick('C')} className={`px-4 py-2 md:px-6 md:py-3 rounded-full text-[11px] md:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${isGroupCActive ? 'bg-blue-500 text-white shadow-lg' : 'bg-white dark:bg-[#1c1c1e] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2c2c2e]'}`}><Wifi className="w-3.5 h-3.5" /> Team C <ChevronDown className={`w-3 h-3 ${isGroupCActive ? 'rotate-180' : ''}`} /></button>
                    </div>
                    {isGroupCActive && (
                        <div className="flex flex-wrap items-center gap-2 animate-fade-in pl-4 border-l-2 border-blue-500/20">
                            <button onClick={() => setSelectedTeam(Team.TEAM_C)} className={`px-4 py-2 rounded-full text-xs font-bold ${selectedTeam === Team.TEAM_C ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}>Network</button>
                            <button onClick={() => setSelectedTeam(Team.TEAM_E)} className={`px-4 py-2 rounded-full text-xs font-bold ${selectedTeam === Team.TEAM_E ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}>UPS</button>
                            <button onClick={() => setSelectedTeam(Team.TEAM_G)} className={`px-4 py-2 rounded-full text-xs font-bold ${selectedTeam === Team.TEAM_G ? 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-200' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}>Online</button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-10">
                <StatCard label={t('dashboard.pendingAction')} value={stats.pendingRMAs} icon={<Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />} color="bg-blue-500" />
                <StatCard label={t('dashboard.revenuePipeline')} value={stats.revenuePipeline} icon={<Truck className="w-6 h-6 text-orange-600 dark:text-orange-400" />} color="bg-orange-500" />
                <StatCard label={t('dashboard.avgTurnaround')} value={`${Math.round(stats.avgTurnaroundHours / 24)}`} subLabel="วัน" subValue="Avg" icon={<Timer className="w-6 h-6 text-purple-600 dark:text-purple-400" />} color="bg-purple-500" />
                <StatCard label={t('dashboard.overdue')} value={stats.overdueCount} icon={<AlertOctagon className="w-6 h-6 text-red-600 dark:text-red-400" />} color="bg-red-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 glass-panel p-8">
                    <div className="mb-8">
                        <h3 className="text-xl font-bold text-[#1d1d1f] dark:text-white flex items-center gap-3"><Layers className="w-6 h-6 text-blue-500" /> สรุปงานแยกตามสถานะ</h3>
                        <p className="text-sm text-gray-500 mt-1">จำนวนงานเคลมในแต่ละสถานะ</p>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={statusData} barSize={60}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.1)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#86868b', fontWeight: 500 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#86868b', fontWeight: 500 }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', background: '#fff', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', color: '#1d1d1f' }}
                                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
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
                <div className="glass-panel p-8 flex flex-col">
                    <div className="mb-6">
                        <h3 className="text-xl font-bold text-[#1d1d1f] dark:text-white flex items-center gap-3"><AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" /> {t('dashboard.urgentAttention')}</h3>
                        <p className="text-sm text-gray-500 mt-1">Requires immediate action</p>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar max-h-[400px]">
                        {stats.urgentRMAs.map(rma => (
                            <Link key={rma.id} to={`/admin/job/${encodeURIComponent(rma.quotationNumber || rma.groupRequestId || rma.id)}`} className="block bg-[#f5f5f7] dark:bg-[#2c2c2e] hover:bg-gray-100 dark:hover:bg-[#3a3a3c] p-5 rounded-3xl transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-bold text-[#1d1d1f] dark:text-white group-hover:text-[#0071e3] transition-colors">{rma.productModel}</div>
                                    <div className="text-[10px] font-mono text-gray-400 bg-white dark:bg-black/20 px-2 py-1 rounded-lg">{rma.id}</div>
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2 leading-relaxed">{rma.issueDescription}</div>
                                <div className="flex justify-between items-center">
                                    <StatusBadge status={rma.status} />
                                    <div className="text-[11px] font-medium text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full">
                                        {Math.floor((Date.now() - new Date(rma.createdAt).getTime()) / (86400000))}d ago
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};