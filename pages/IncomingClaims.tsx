
import React, { useEffect, useState, useMemo } from 'react';
import { MockDb } from '../services/mockDb';
import { RMA, Team } from '../types';
import { Package, User, Clock, ArrowRight, CheckCircle2, Loader2, Info, ChevronRight, ChevronDown, Check, Box, Layers, Wifi, Zap, ShoppingBag, Truck } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { GlassSelect } from '../components/GlassSelect';

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

    // UI Selection State
    const [selectedMainGroup, setSelectedMainGroup] = useState<'A' | 'B' | 'C' | ''>('');
    const [finalTeam, setFinalTeam] = useState<Team | ''>('');
    const [selectedDistributor, setSelectedDistributor] = useState('');
    const [customDistributor, setCustomDistributor] = useState('');
    const [distOptions, setDistOptions] = useState<any[]>([]);

    const [isAssigning, setIsAssigning] = useState(false);
    const { t } = useLanguage();

    // Load distributor options
    useEffect(() => {
        const loadDists = async () => {
            const dists = await MockDb.getDistributors();
            setDistOptions([...dists, { value: 'Other', label: t('submit.other') }]);
        };
        loadDists();
    }, [t]);

    const fetchIncoming = async () => {
        setLoading(true);
        const data = await MockDb.getUnassignedRMAs();
        setIncoming(data);
        setLoading(false);
    };

    useEffect(() => { fetchIncoming(); }, []);

    // Group rmas by groupRequestId
    const groupedJobs: GroupedJob[] = useMemo(() => {
        const map = new Map<string, RMA[]>();
        incoming.forEach(rma => {
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
    }, [incoming]);

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

        // Assign ALL rmas in the group
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

    if (loading) return <div className="p-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-[#0071e3]" /></div>;

    return (
        <div className="max-w-5xl mx-auto px-3 md:px-4 py-4 sm:py-8 pb-24 md:pb-8">
            <div className="mb-5 md:mb-10">
                <h1 className="text-xl md:text-3xl font-bold text-[#1d1d1f] dark:text-white mb-1 md:mb-2">{t('incoming.title')}</h1>
                <p className="text-xs md:text-base text-gray-500">{t('incoming.subtitle')}</p>
            </div>

            {groupedJobs.length === 0 ? (
                <div className="glass-panel p-12 md:p-20 text-center rounded-2xl md:rounded-[3rem]">
                    <div className="w-14 h-14 md:w-20 md:h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                        <CheckCircle2 className="w-7 h-7 md:w-10 md:h-10 text-gray-400" />
                    </div>
                    <h3 className="text-base md:text-xl font-bold text-gray-400">{t('incoming.noIncoming')}</h3>
                </div>
            ) : (
                <div className="space-y-4 md:space-y-6">
                    {groupedJobs.map((job) => {
                        const isExpanded = expandedGroupId === job.groupId;
                        const isSelected = selectedGroupId === job.groupId;

                        return (
                            <div key={job.groupId} className={`glass-panel overflow-hidden transition-all duration-300 ${isSelected ? 'ring-2 ring-[#0071e3] scale-[1.01] shadow-2xl' : 'hover:scale-[1.005]'}`}>
                                <div className="p-3.5 md:p-8 flex flex-col gap-3 md:gap-6">
                                    {/* Summary Row */}
                                    <div className="flex flex-col gap-3 md:gap-6">
                                        <div className="flex-1 space-y-2 md:space-y-4 cursor-pointer" onClick={() => toggleExpand(job.groupId)}>
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[9px] md:text-[10px] font-bold text-[#0071e3] uppercase tracking-widest mb-0.5 md:mb-1 flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0"></div>
                                                        {t('incoming.receivedFrom')}
                                                    </div>
                                                    <h3 className="text-base md:text-2xl font-bold text-[#1d1d1f] dark:text-white truncate">
                                                        {job.customerName}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 md:px-3 md:py-1 bg-[#0071e3]/10 text-[#0071e3] rounded-full text-[11px] md:text-sm font-bold">
                                                            <Package className="w-3 h-3 md:w-4 md:h-4" />
                                                            {job.rmas.length} {job.rmas.length === 1 ? 'item' : 'items'}
                                                        </span>
                                                    </div>
                                                    {/* Email hidden on mobile to save space */}
                                                    <div className="hidden md:block text-sm text-gray-500 mt-1">{job.customerEmail}</div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <div className="text-[9px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Ref ID</div>
                                                    <div className="text-[11px] md:text-sm font-mono font-bold dark:text-gray-300 whitespace-nowrap">{job.groupId}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 md:gap-4 text-[10px] md:text-xs text-gray-400">
                                                <span className="flex items-center gap-1"><Clock className="w-3 h-3 md:w-3.5 md:h-3.5" /> {new Date(job.createdAt).toLocaleString()}</span>
                                                <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                                                <span className={job.quotationNumber && job.quotationNumber !== 'N/A' ? '' : 'italic opacity-60'}>{job.quotationNumber && job.quotationNumber !== 'N/A' ? `QT: ${job.quotationNumber}` : 'ไม่มี Ref'}</span>
                                            </div>

                                            {/* Expand/Collapse hint */}
                                            <button className="flex items-center gap-1.5 text-xs md:text-sm text-[#0071e3] font-semibold hover:underline transition-colors">
                                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                {isExpanded ? 'ซ่อนรายละเอียด' : `ดูรายละเอียด ${job.rmas.length} รายการ`}
                                            </button>
                                        </div>

                                        <div className="w-full sm:w-auto flex-shrink-0">
                                            {!isSelected && (
                                                <button
                                                    onClick={() => { setSelectedGroupId(job.groupId); setExpandedGroupId(job.groupId); }}
                                                    className="w-full sm:w-auto py-3 md:py-4 px-5 md:px-6 bg-[#1d1d1f] dark:bg-white text-white dark:text-black rounded-xl md:rounded-2xl text-sm md:text-base font-bold flex items-center justify-center gap-2 md:gap-3 transition-all hover:scale-105 active:scale-95 shadow-lg md:shadow-xl"
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
                                                    <div key={rma.id} className="p-3 md:p-4 bg-gray-50 dark:bg-white/5 rounded-xl md:rounded-2xl flex flex-col md:flex-row md:items-center gap-2.5 md:gap-4">
                                                        <div className="w-8 h-8 rounded-full bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center text-sm font-bold flex-shrink-0">
                                                            {idx + 1}
                                                        </div>
                                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                                                            <div>
                                                                <div className="text-[10px] font-bold text-gray-400 uppercase">Brand / Model</div>
                                                                <div className="text-sm font-bold text-[#1d1d1f] dark:text-white">{rma.brand} {rma.productModel}</div>
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
                                                        className={`p-2.5 md:p-4 rounded-xl md:rounded-2xl border text-left transition-all flex flex-col md:flex-row items-center gap-2 md:gap-4 ${selectedMainGroup === 'A' ? 'bg-white dark:bg-[#2c2c2e] border-red-500 ring-2 ring-red-500/20 shadow-lg' : 'bg-gray-50 dark:bg-white/5 border-transparent hover:bg-white dark:hover:bg-[#2c2c2e]'}`}
                                                    >
                                                        <div className={`p-2 md:p-3 rounded-lg md:rounded-xl ${selectedMainGroup === 'A' ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-400'}`}><Box className="w-4 h-4 md:w-6 md:h-6" /></div>
                                                        <div className="text-center md:text-left"><div className="font-bold text-xs md:text-base text-[#1d1d1f] dark:text-white">HIK</div><div className="text-[9px] md:text-[10px] text-gray-500">Team A</div></div>
                                                    </button>

                                                    <button
                                                        onClick={() => handleMainGroupSelect('B')}
                                                        className={`p-2.5 md:p-4 rounded-xl md:rounded-2xl border text-left transition-all flex flex-col md:flex-row items-center gap-2 md:gap-4 ${selectedMainGroup === 'B' ? 'bg-white dark:bg-[#2c2c2e] border-orange-500 ring-2 ring-orange-500/20 shadow-lg' : 'bg-gray-50 dark:bg-white/5 border-transparent hover:bg-white dark:hover:bg-[#2c2c2e]'}`}
                                                    >
                                                        <div className={`p-2 md:p-3 rounded-lg md:rounded-xl ${selectedMainGroup === 'B' ? 'bg-orange-500 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-400'}`}><Layers className="w-4 h-4 md:w-6 md:h-6" /></div>
                                                        <div className="text-center md:text-left"><div className="font-bold text-xs md:text-base text-[#1d1d1f] dark:text-white">DAHUA</div><div className="text-[9px] md:text-[10px] text-gray-500">Team B</div></div>
                                                    </button>

                                                    <button
                                                        onClick={() => handleMainGroupSelect('C')}
                                                        className={`p-2.5 md:p-4 rounded-xl md:rounded-2xl border text-left transition-all flex flex-col md:flex-row items-center gap-2 md:gap-4 ${selectedMainGroup === 'C' ? 'bg-white dark:bg-[#2c2c2e] border-blue-500 ring-2 ring-blue-500/20 shadow-lg' : 'bg-gray-50 dark:bg-white/5 border-transparent hover:bg-white dark:hover:bg-[#2c2c2e]'}`}
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
                                                                className={`p-2.5 md:p-4 rounded-lg md:rounded-xl border text-center md:text-left transition-all flex flex-col md:flex-row items-center gap-1.5 md:gap-3 ${finalTeam === sub.val ? 'bg-white dark:bg-[#2c2c2e] border-[#0071e3] ring-1 ring-[#0071e3] shadow-md' : 'bg-white dark:bg-[#1c1c1e] border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}
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
                                                    className="px-4 md:px-8 py-2 md:py-3 bg-gray-100 dark:bg-white/10 rounded-lg md:rounded-xl text-xs md:text-sm font-bold text-gray-500 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    disabled={!finalTeam || isAssigning}
                                                    onClick={() => handleAssignGroup(job)}
                                                    className="flex-1 sm:flex-none px-4 md:px-10 py-2 md:py-3 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-lg md:rounded-xl text-xs md:text-sm font-bold shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 md:gap-3 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
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
        </div>
    );
};
