
import React, { useEffect, useState, useMemo } from 'react';
import { MockDb } from '../services/mockDb';
// Add Box to the imports from lucide-react
import { Clock, Search, ExternalLink, User, History, Filter, AlertCircle, RefreshCw, Loader2, ArrowRight, Box } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export const LogsManagement: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { t } = useLanguage();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await MockDb.getAllLogs();
      setLogs(data);
    } catch (err) {
      console.error("Failed to fetch logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = MockDb.getCurrentUser();
    if (!user || user.role !== 'admin') {
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    fetchLogs();
  }, [navigate]);

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const lower = search.toLowerCase();
    return logs.filter(log =>
      log.description?.toLowerCase().includes(lower) ||
      log.user?.toLowerCase().includes(lower) ||
      log.claimId?.toLowerCase().includes(lower) ||
      log.claimRef?.toLowerCase().includes(lower) ||
      log.productModel?.toLowerCase().includes(lower) ||
      log.serialNumber?.toLowerCase().includes(lower)
    );
  }, [logs, search]);

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'STATUS_CHANGE': return <RefreshCw className="w-4 h-4 text-blue-500" />;
      case 'SYSTEM': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'NOTE': return <History className="w-4 h-4 text-purple-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-10 h-10 text-[#0071e3] animate-spin" />
      <p className="text-gray-500 font-medium tracking-tight">กำลังรวบรวมประวัติกิจกรรมทั้งหมด...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-[#1d1d1f] dark:text-white mb-2">System Activity Logs</h1>
          <p className="text-gray-500">ติดตามทุกความเคลื่อนไหวในระบบ เรียงลำดับจากล่าสุด</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchLogs}
            className="px-5 py-2.5 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-[#333] rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-[#2c2c2e] transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1c1c1e] rounded-[2rem] shadow-sm border border-gray-200 dark:border-[#333] p-2 mb-8 flex items-center gap-2">
        <div className="relative flex-grow">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by User, Claim ID, Serial, or Description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none rounded-2xl py-3 pl-11 pr-4 text-sm text-[#1d1d1f] dark:text-white placeholder-gray-500 focus:ring-0"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-20 glass-panel rounded-[2rem]">
            <History className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">ไม่พบประวัติกิจกรรมที่ค้นหา</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="glass-panel p-4 md:p-5 hover:bg-gray-50 dark:hover:bg-white/5 transition-all group border border-gray-100 dark:border-[#333]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4 flex-1">
                  <div className="mt-1 p-2 bg-gray-100 dark:bg-white/10 rounded-xl flex-shrink-0">
                    {getLogIcon(log.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{log.type}</span>
                      <span className="text-xs text-gray-300">•</span>
                      <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                        <User className="w-3 h-3" /> {log.user}
                      </span>
                    </div>
                    <p className="text-[#1d1d1f] dark:text-gray-200 font-bold mb-2">{log.description}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <div className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-full">
                        <Clock className="w-3 h-3" /> {new Date(log.date).toLocaleString()}
                      </div>
                      <div className="text-[11px] font-bold text-blue-500 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/5">
                        <Box className="w-3 h-3" /> {log.productModel} ({log.serialNumber})
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <Link
                    to={`/admin/job/${log.jobId}?editRmaId=${log.claimId}`}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#2c2c2e] hover:bg-[#0071e3] hover:text-white border border-gray-200 dark:border-white/10 text-xs font-bold rounded-xl transition-all shadow-sm"
                  >
                    Jump to Claim <ArrowRight className="w-3 h-3" />
                  </Link>
                  <div className="text-[10px] font-mono text-gray-400">Ref: {log.claimRef}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
