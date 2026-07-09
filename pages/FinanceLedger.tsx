import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Landmark, Plus, FileSpreadsheet, Search, RefreshCw, Trash2, Edit2, Check, 
  ArrowUpRight, ArrowDownLeft, AlertCircle, Coins, Clock, ChevronRight, ChevronLeft, Image as ImageIcon, X, Wallet, Calendar
} from 'lucide-react';
import { PettyCashTransaction, PettyCashSummary, PettyCashAudit } from '../types';
import { MockDb } from '../services/mockDb';
import { useLanguage } from '../contexts/LanguageContext';
import { showToast } from '../services/toast';
import { TransactionModal } from '../components/TransactionModal';
import { CashAuditModal } from '../components/CashAuditModal';
import { ReplenishmentPlanner } from '../components/ReplenishmentPlanner';
import { GlassSelect } from '../components/GlassSelect';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';

const formatDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getInitialMonday = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return formatDateString(monday);
};

const getInitialSunday = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return formatDateString(sunday);
};

const getInitialMonthFirstDay = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

const getInitialMonthLastDay = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const lastDayDate = new Date(year, month, 0);
  const lastDayStr = String(lastDayDate.getDate()).padStart(2, '0');
  const monthStr = String(month).padStart(2, '0');
  return `${year}-${monthStr}-${lastDayStr}`;
};

const getMonthList = () => {
  const list = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const val = `${y}-${m}`;
    
    let label = `${m}/${y}`;
    if (i === 0) label = 'เดือนนี้';
    else if (i === 1) label = 'เดือนที่แล้ว';
    
    list.push({ val, label });
  }
  return list;
};


const formatThaiDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  const thaiMonthsShort = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  const monthIdx = parseInt(month, 10) - 1;
  const yearTh = parseInt(year, 10) + 543;
  return `${parseInt(day, 10)} ${thaiMonthsShort[monthIdx]} ${yearTh}`;
};

export const FinanceLedger: React.FC = () => {
  const [transactions, setTransactions] = useState<PettyCashTransaction[]>([]);
  const [summary, setSummary] = useState<PettyCashSummary>({
    pettyCashBalance: 0,
    totalPersonalAdvance: 0,
    personalAdvanceByStaff: {}
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState(getInitialMonthFirstDay);
  const [endDate, setEndDate] = useState(getInitialMonthLastDay);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'records' | 'dashboard' | 'reimbursements' | 'audit'>('records');
  const [dashboardMonth, setDashboardMonth] = useState<string>(''); // YYYY-MM or 'ALL'
  const [selectedTx, setSelectedTx] = useState<PettyCashTransaction | undefined>(undefined);
  const [activeReceiptUrl, setActiveReceiptUrl] = useState<string | null>(null);
  const [execMode, setExecMode] = useState(false);
  const [targetFloat, setTargetFloat] = useState<number>(5000);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  
  // Cash Audit states
  const [auditLogs, setAuditLogs] = useState<PettyCashAudit[]>([]);
  const [showAuditModal, setShowAuditModal] = useState(false);

  const getDisplayName = (fullName: string) => {
    if (!fullName) return '';
    const trimmed = fullName.trim();
    return userMap[trimmed] || fullName;
  };

  // Swipe gesture states
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [touchEndY, setTouchEndY] = useState<number | null>(null);

  // Carousel track state
  const [carouselState, setCarouselState] = useState<'idle' | 'snapping-prev' | 'snapping-next' | 'snapping-back'>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const dragXRef = useRef(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const carouselContainerRef = useRef<HTMLDivElement>(null);
  const swipeContentRef = useRef<HTMLDivElement>(null);

  // Overrides for sliding to non-adjacent months
  const [overridePrevMonth, setOverridePrevMonth] = useState<string | null>(null);
  const [overrideNextMonth, setOverrideNextMonth] = useState<string | null>(null);

  const getAvailableMonths = () => {
    const months = new Set<string>();
    transactions.forEach(t => {
      if (t.date) {
        const [year, month] = t.date.split('-');
        if (year && month) {
          months.add(`${year}-${month}`);
        }
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  };

  const getDashboardData = () => {
    const filtered = transactions.filter(t => {
      if (dashboardMonth === 'ALL') return true;
      return t.date.startsWith(dashboardMonth);
    });

    let totalIncome = 0;
    let totalExpense = 0;
    let pettyCashSpent = 0;
    let personalAdvance = 0;

    const categoryBreakdown: Record<string, number> = {};
    const staffBreakdown: Record<string, number> = {};

    filtered.forEach(t => {
      if (t.type === 'INCOME') {
        totalIncome += t.amount;
      } else {
        totalExpense += t.amount;
        
        // Category breakdown
        const cat = t.category || 'อื่นๆ';
        categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + t.amount;

        // Staff breakdown
        const staff = t.staffName || 'Unknown';
        staffBreakdown[staff] = (staffBreakdown[staff] || 0) + t.amount;

        // Paid by breakdown
        if (t.paidBy === 'PETTY_CASH') {
          pettyCashSpent += t.amount;
        } else if (t.paidBy === 'SPLIT') {
          pettyCashSpent += t.splitPettyCashAmount || 0;
          personalAdvance += t.splitPersonalAmount || 0;
        } else {
          personalAdvance += t.amount;
        }
      }
    });

    return {
      totalIncome,
      totalExpense,
      pettyCashSpent,
      personalAdvance,
      categoryBreakdown,
      staffBreakdown
    };
  };

  const formatMonthTh = (yearMonthStr: string) => {
    if (yearMonthStr === 'ALL') return 'ข้อมูลทั้งหมด';
    const parts = yearMonthStr.split('-');
    if (parts.length !== 2) return yearMonthStr;
    const [year, month] = parts;
    const monthNames = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const monthIdx = parseInt(month, 10) - 1;
    const thaiYear = parseInt(year, 10) + 543;
    return `${monthNames[monthIdx]} ${thaiYear}`;
  };

  const navigate = useNavigate();
  const { t } = useLanguage();
  const currentUser = MockDb.getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';

  const fetchData = async () => {
    setLoading(true);
    try {
      let txList = await MockDb.getPettyCashTransactions();
      
      // Seeding removed for clean system.

      // Normalize 'ค่าเครื่องเขียน' category to 'ค่าของใช้สำนักงาน'
      const normalizedTxList = txList.map(tx => {
        if (tx.category === 'ค่าเครื่องเขียน') {
          return { ...tx, category: 'ค่าของใช้สำนักงาน' };
        }
        return tx;
      });

      const summ = await MockDb.getPettyCashSummary();

      // Fetch users to map names to nicknames in Finance
      try {
        const allUsers = await MockDb.getAllUsers();
        const map: Record<string, string> = {};
        allUsers.forEach((u: any) => {
          if (u.name && u.nickname) {
            map[u.name.trim()] = u.nickname.trim();
          }
        });
        setUserMap(map);
      } catch (err) {
        console.error("Error building userMap:", err);
      }

      // Fetch cash audits
      try {
        const audits = await MockDb.getCashAudits();
        setAuditLogs(audits);
      } catch (err) {
        console.error("Error fetching audits:", err);
      }

      setTransactions(normalizedTxList);
      setSummary(summ);
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการโหลดข้อมูลการเงิน', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { replace: true });
      return;
    }
    // Guard: only admin or users with canAccessFinance can access
    if (currentUser.role !== 'admin' && !(currentUser as any).canAccessFinance) {
      showToast('คุณไม่มีสิทธิ์เข้าถึงหน้าการเงิน กรุณาติดต่อผู้ดูแลระบบ', 'error');
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    fetchData();
  }, [currentUser, navigate]);

  useEffect(() => {
    const handleOpenModal = () => {
      setSelectedTx(undefined);
      setShowModal(true);
    };

    window.addEventListener('open-finance-modal', handleOpenModal);
    return () => {
      window.removeEventListener('open-finance-modal', handleOpenModal);
    };
  }, []);

  // Sync selectedMonth to startDate & endDate
  useEffect(() => {
    if (selectedMonth && selectedMonth !== 'CUSTOM') {
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      const firstDay = `${yearStr}-${monthStr}-01`;
      const lastDayDate = new Date(year, month, 0);
      const lastDayStr = String(lastDayDate.getDate()).padStart(2, '0');
      const lastDay = `${yearStr}-${monthStr}-${lastDayStr}`;
      
      setStartDate(firstDay);
      setEndDate(lastDay);
    }
  }, [selectedMonth]);

  const getPrevAndNextMonths = useCallback(() => {
    const list = getMonthList();
    const idx = list.findIndex(m => m.val === selectedMonth);
    const prev = idx > 0 ? list[idx - 1].val : null;
    const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1].val : null;
    return { prevMonth: prev, nextMonth: next };
  }, [selectedMonth]);

  const animateMonthChange = useCallback((direction: 'left' | 'right', newMonth: string) => {
    if (carouselState !== 'idle') return;

    if (direction === 'right') {
      // We want to slide to the previous panel, which will show newMonth
      setOverridePrevMonth(newMonth);
      setCarouselState('snapping-prev');
      setTimeout(() => {
        setSelectedMonth(newMonth);
        setCarouselState('idle');
        setOverridePrevMonth(null);
      }, 280);
    } else {
      // We want to slide to the next panel, which will show newMonth
      setOverrideNextMonth(newMonth);
      setCarouselState('snapping-next');
      setTimeout(() => {
        setSelectedMonth(newMonth);
        setCarouselState('idle');
        setOverrideNextMonth(null);
      }, 280);
    }
  }, [carouselState]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (carouselState !== 'idle') return;
    const tagName = (e.target as HTMLElement).tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'select' || tagName === 'button' || (e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) {
      return;
    }
    touchStartXRef.current = e.targetTouches[0].clientX;
    touchStartYRef.current = e.targetTouches[0].clientY;
    setIsDragging(true);
    setDragX(0);
    dragXRef.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || touchStartXRef.current === null || touchStartYRef.current === null) return;
    const currentX = e.targetTouches[0].clientX;
    const currentY = e.targetTouches[0].clientY;
    const diffX = currentX - touchStartXRef.current;
    const diffY = currentY - touchStartYRef.current;

    // If vertical scroll is dominant, don't swipe
    if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 10) {
      setIsDragging(false);
      setDragX(0);
      dragXRef.current = 0;
      return;
    }

    // Prevent horizontal bounce/drag default
    if (Math.abs(diffX) > 10) {
      if (e.cancelable) e.preventDefault();
      
      // Boundary resistance
      const { prevMonth, nextMonth } = getPrevAndNextMonths();
      let finalDiffX = diffX;
      if (diffX > 0 && !prevMonth) {
        finalDiffX = diffX * 0.3;
      } else if (diffX < 0 && !nextMonth) {
        finalDiffX = diffX * 0.3;
      }
      
      setDragX(finalDiffX);
      dragXRef.current = finalDiffX;
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const finalDragX = dragXRef.current;
    const { prevMonth, nextMonth } = getPrevAndNextMonths();
    const threshold = 60;

    if (finalDragX > threshold && prevMonth) {
      setCarouselState('snapping-prev');
      setDragX(0);
      setTimeout(() => {
        setSelectedMonth(prevMonth);
        setCarouselState('idle');
      }, 280);
    } else if (finalDragX < -threshold && nextMonth) {
      setCarouselState('snapping-next');
      setDragX(0);
      setTimeout(() => {
        setSelectedMonth(nextMonth);
        setCarouselState('idle');
      }, 280);
    } else {
      setCarouselState('snapping-back');
      setDragX(0);
      setTimeout(() => {
        setCarouselState('idle');
      }, 280);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (carouselState !== 'idle') return;
    const tagName = (e.target as HTMLElement).tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'select' || tagName === 'button' || (e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) {
      return;
    }
    touchStartXRef.current = e.clientX;
    touchStartYRef.current = e.clientY;
    setIsDragging(true);
    setDragX(0);
    dragXRef.current = 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || touchStartXRef.current === null || touchStartYRef.current === null) return;
    const currentX = e.clientX;
    const currentY = e.clientY;
    const diffX = currentX - touchStartXRef.current;

    const { prevMonth, nextMonth } = getPrevAndNextMonths();
    let finalDiffX = diffX;
    if (diffX > 0 && !prevMonth) {
      finalDiffX = diffX * 0.3;
    } else if (diffX < 0 && !nextMonth) {
      finalDiffX = diffX * 0.3;
    }
    
    setDragX(finalDiffX);
    dragXRef.current = finalDiffX;
  };

  const handleMouseUp = () => {
    handleTouchEnd();
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleTouchEnd();
    }
  };

  const getCarouselTransitionClass = () => {
    if (carouselState === 'idle') {
      return isDragging ? 'carousel-dragging' : '';
    }
    return 'carousel-snapping';
  };

  const getCarouselTransformStyle = () => {
    if (carouselState === 'idle') {
      return `translate3d(calc(-33.33333% + ${dragX}px), 0, 0)`;
    }
    if (carouselState === 'snapping-prev') {
      return 'translate3d(0%, 0, 0)';
    }
    if (carouselState === 'snapping-next') {
      return 'translate3d(-66.66667%, 0, 0)';
    }
    return 'translate3d(-33.33333%, 0, 0)';
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    // Search filter
    const matchesSearch = 
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.note && tx.note.toLowerCase().includes(searchTerm.toLowerCase()));

    // Type filter
    const matchesType = typeFilter === 'ALL' || tx.type === typeFilter;

    // Source filter
    const matchesSource = sourceFilter === 'ALL' || 
      (sourceFilter === 'PERSONAL_CASH' && (tx.paidBy === 'PERSONAL_CASH' || tx.paidBy === 'PERSONAL_TRANSFER')) ||
      tx.paidBy === sourceFilter;

    // Date range filter
    const matchesStartDate = !startDate || tx.date >= startDate;
    const matchesEndDate = !endDate || tx.date <= endDate;

    return matchesSearch && matchesType && matchesSource && matchesStartDate && matchesEndDate;
  });

  const handleReimburse = async (txId: string) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;
    const amountToReimburse = tx.paidBy === 'SPLIT' ? (tx.splitPersonalAmount || 0) : tx.amount;
    const displayName = userMap[tx.staffName.trim()] ? `${userMap[tx.staffName.trim()]} (${tx.staffName})` : tx.staffName;
    if (!confirm(`ยืนยันการคืนเงินสำรองจ่ายจำนวน ${formatCurrency(amountToReimburse)} ให้กับ ${displayName} เรียบร้อยแล้วใช่หรือไม่?`)) return;
    try {
      await MockDb.updatePettyCashTransaction(txId, {
        isReimbursed: true,
        reimbursedAt: new Date().toISOString(),
        reimbursedBy: currentUser?.name || 'Admin'
      });
      showToast('บันทึกคืนเงินพนักงานสำเร็จ', 'success');
      fetchData();
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    }
  };

  const handleReimburseAllForStaff = async (staffName: string) => {
    const displayName = userMap[staffName.trim()] ? `${userMap[staffName.trim()]} (${staffName})` : staffName;
    if (!confirm(`ยืนยันคืนเงินสำรองจ่ายทั้งหมดให้กับ ${displayName} หรือไม่?`)) return;
    try {
      // Find all unpaid advance transactions for this staff
      const unpaid = transactions.filter(
        tx => tx.staffName === staffName && 
        tx.type === 'EXPENSE' && 
        (tx.paidBy === 'PERSONAL_CASH' || tx.paidBy === 'PERSONAL_TRANSFER' || tx.paidBy === 'SPLIT') && 
        !tx.isReimbursed
      );

      for (const tx of unpaid) {
        await MockDb.updatePettyCashTransaction(tx.id, {
          isReimbursed: true,
          reimbursedAt: new Date().toISOString(),
          reimbursedBy: currentUser?.name || 'Admin'
        });
      }
      showToast(`คืนเงินสำรองจ่ายของ ${displayName} เรียบร้อยแล้ว`, 'success');
      fetchData();
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการคืนเงินสะสม', 'error');
    }
  };

  const handleDelete = async (txId: string) => {
    if (!isAdmin) {
      showToast('เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถลบรายการการเงินได้', 'error');
      return;
    }
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการการเงินนี้? การกระทำนี้ไม่สามารถกู้คืนได้')) return;
    try {
      await MockDb.deletePettyCashTransaction(txId);
      showToast('ลบรายการการเงินสำเร็จ', 'success');
      fetchData();
    } catch (err) {
      showToast('ลบรายการไม่สำเร็จ', 'error');
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = ['วันที่', 'ประเภท', 'จำนวนเงิน', 'รายละเอียด', 'หมวดหมู่', 'จ่ายโดย', 'ผู้ทำรายการ', 'คืนเงินแล้ว', 'หมายเหตุ'];
      const rows = filteredTransactions.map(t => [
        t.date,
        t.type === 'INCOME' ? 'รายรับ' : 'รายจ่าย',
        t.amount.toFixed(2),
        t.description,
        t.category || '',
        t.paidBy === 'PETTY_CASH' ? 'เงินกองกลาง' : t.paidBy === 'PERSONAL_CASH' ? 'เงินสดส่วนตัวพนักงาน' : 'เงินโอนส่วนตัวพนักงาน',
        t.staffName,
        t.type === 'INCOME' ? 'N/A' : t.paidBy === 'PETTY_CASH' ? 'N/A' : t.isReimbursed ? 'คืนแล้ว' : 'ยังไม่คืน',
        t.note || ''
      ]);

      const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sec-finance-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('ส่งออก CSV รายการเงินสำเร็จ', 'success');
    } catch (e) {
      showToast('ส่งออกล้มเหลว', 'error');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(val);
  };

  const getMonthlyTrendData = () => {
    const monthlyMap = new Map<string, { month: string; income: number; expense: number }>();
    
    // Sort transactions chronologically
    const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    
    sortedTxs.forEach(t => {
      if (!t.date) return;
      const monthKey = t.date.substring(0, 7); // 'YYYY-MM'
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { month: monthKey, income: 0, expense: 0 });
      }
      const data = monthlyMap.get(monthKey)!;
      if (t.type === 'INCOME') {
        data.income += t.amount;
      } else {
        data.expense += t.amount;
      }
    });
    
    return Array.from(monthlyMap.values());
  };

  const formatMonthShortTh = (yearMonthStr: string) => {
    const parts = yearMonthStr.split('-');
    if (parts.length !== 2) return yearMonthStr;
    const [year, month] = parts;
    const shortMonthNames = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const monthIdx = parseInt(month, 10) - 1;
    const shortYear = (parseInt(year, 10) + 543).toString().slice(-2);
    return `${shortMonthNames[monthIdx]} ${shortYear}`;
  };

  const renderDashboard = () => {
    const data = getDashboardData();
    const netCashflow = data.totalIncome - data.totalExpense;
    const monthlyTrend = getMonthlyTrendData();
    
    const getPercent = (amount: number, total: number) => {
      if (total <= 0) return 0;
      return Math.round((amount / total) * 100);
    };

    const COLORS = ['#0071e3', '#ff9500', '#af52de', '#34c759', '#ff3b30', '#5856d6', '#5ac8fa'];

    const categoryData = Object.entries(data.categoryBreakdown).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);

    const staffData = Object.entries(data.staffBreakdown).map(([name, value]) => ({
      name: name,
      value
    })).sort((a, b) => b.value - a.value);

    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-white/95 dark:bg-[#1c1c1e]/95 border border-gray-200 dark:border-white/10 p-3 rounded-2xl shadow-xl backdrop-blur-md">
            <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5">{formatMonthTh(label)}</p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-4 justify-between">
                <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  รายรับ:
                </span>
                <span className="font-bold tabular-nums dark:text-white">{formatCurrency(payload[0].value)}</span>
              </div>
              <div className="flex items-center gap-4 justify-between">
                <span className="flex items-center gap-1.5 font-medium text-red-600 dark:text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  รายจ่าย:
                </span>
                <span className="font-bold tabular-nums dark:text-white">{formatCurrency(payload[1].value)}</span>
              </div>
              <hr className="border-gray-200/50 dark:border-white/5 my-1" />
              <div className="flex items-center gap-4 justify-between font-bold">
                <span className="text-gray-700 dark:text-gray-300">สุทธิ:</span>
                <span className={`tabular-nums ${payload[0].value - payload[1].value >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {formatCurrency(payload[0].value - payload[1].value)}
                </span>
              </div>
            </div>
          </div>
        );
      }
      return null;
    };

    // Calculate pending advances
    const pendingTxs = transactions.filter(
      tx => tx.type === 'EXPENSE' && !tx.isReimbursed &&
      (tx.paidBy === 'PERSONAL_CASH' || tx.paidBy === 'PERSONAL_TRANSFER' || tx.paidBy === 'SPLIT')
    );

    const netRemaining = summary.pettyCashBalance - summary.totalPersonalAdvance;
    const spentFromBox = Math.max(0, targetFloat - summary.pettyCashBalance);
    const requestedAmount = spentFromBox + summary.totalPersonalAdvance;

    if (execMode) {
      return (
        <div className="space-y-6 animate-fade-in">
          {/* Executive Control bar inside the view */}
          <div className="bg-white/40 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/[0.06] rounded-3xl p-4 md:p-6 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#1d1d1f] dark:text-white">ใบสรุปเสนอเบิกเงินสำหรับผู้บริหาร</h3>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">จับภาพหน้าจอนี้เพื่อส่งรายงานเบิกเติมเงินกองกลาง</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">วงเงินกองกลางเป้าหมาย:</span>
                <input
                  type="number"
                  value={targetFloat}
                  onChange={e => setTargetFloat(Number(e.target.value) || 0)}
                  className="w-24 px-2.5 py-1.5 bg-white dark:bg-[#1c1c1e] border border-gray-205 dark:border-white/10 rounded-xl text-xs font-bold text-center text-[#1d1d1f] dark:text-white outline-none focus:border-[#0071e3] shadow-sm"
                />
              </div>
              <button
                onClick={() => setExecMode(false)}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-orange-500/10"
              >
                ปิดโหมดผู้บริหาร
              </button>
            </div>
          </div>

          {/* Screenshot Card Container */}
          <div className="bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-[#333] rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 text-[#1d1d1f] dark:text-white">
            
            {/* Report Header */}
            <div className="flex justify-between items-start border-b border-gray-200 dark:border-white/10 pb-6">
              <div className="space-y-1">
                <span className="px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-lg uppercase tracking-wider">
                  รายงานการเงินภายใน
                </span>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-1.5">ใบขออนุมัติเติมเงินกองกลางร้าน</h1>
                <p className="text-xs text-gray-400">สรุปรายงานยอดคงเหลือและรายการค้างคืนพนักงาน ณ วันที่ {new Date().toLocaleDateString('th-TH')}</p>
              </div>
              <div className="text-right">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 ml-auto">
                  <Landmark className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Calculations and replenishments */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-150 dark:border-white/5 rounded-2xl">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block">1. เงินสดปัจจุบันในกล่อง</span>
                <span className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white block mt-1.5 tabular-nums">
                  {formatCurrency(summary.pettyCashBalance)}
                </span>
                <span className="text-[9px] text-gray-400 block mt-1 leading-tight">*ยอดเงินสดที่นับได้ในกล่องจริง</span>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-150 dark:border-white/5 rounded-2xl">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block text-red-500">2. หัก: ยอดค้างจ่ายคืนพนักงาน</span>
                <span className="text-lg sm:text-xl font-bold text-red-500 block mt-1.5 tabular-nums">
                  -{formatCurrency(summary.totalPersonalAdvance)}
                </span>
                <span className="text-[9px] text-gray-400 block mt-1 leading-tight">*เงินส่วนตัวที่พนักงานช่วยสำรองจ่ายล่วงหน้า</span>
              </div>
              <div className="p-4 bg-orange-500/5 dark:bg-orange-500/[0.03] border border-orange-500/20 rounded-2xl">
                <span className="text-[10px] text-orange-500 font-bold uppercase tracking-wider block">3. ยอดเงินคงเหลือสุทธิ</span>
                <span className={`text-lg sm:text-xl font-black block mt-1.5 tabular-nums ${netRemaining >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {formatCurrency(netRemaining)}
                </span>
                <span className="text-[9px] text-gray-400 block mt-1 leading-tight">*ยอดจริงหลังหักหนี้ค้างคืนพนักงานแล้ว</span>
              </div>
            </div>

            {/* replenishments calculation sheet */}
            <div className="p-5 bg-blue-500/5 dark:bg-blue-500/[0.02] border border-blue-500/20 rounded-2xl space-y-3.5">
              <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">สูตรคำนวณขออนุมัติเติมเงินกองกลาง</h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                  <span>ยอดเงินสดที่ใช้ไปจากกล่องกองกลาง (วงเงินเป้าหมาย {formatCurrency(targetFloat)} - เงินสดเหลือจริง {formatCurrency(summary.pettyCashBalance)}):</span>
                  <span className="font-semibold tabular-nums text-gray-800 dark:text-gray-200">{formatCurrency(spentFromBox)}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600 dark:text-gray-400 border-b border-gray-200/50 dark:border-white/5 pb-2">
                  <span className="text-orange-500">บวก: ยอดเงินสำรองจ่ายค้างจ่ายคืนพนักงาน (ที่พนักงานออกเงินไปก่อน):</span>
                  <span className="font-bold text-orange-500 tabular-nums">+{formatCurrency(summary.totalPersonalAdvance)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-black pt-1">
                  <span className="text-blue-600 dark:text-blue-400">รวมยอดเงินที่ต้องขอเบิกเติมใหม่ทั้งหมด (เงินใช้ไป + สำรองจ่ายค้างคืน):</span>
                  <span className="text-base text-blue-600 dark:text-blue-400 tabular-nums bg-blue-500/10 px-3 py-1 rounded-xl">
                    {formatCurrency(requestedAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* breakdown of pending items */}
            <div className="space-y-3">
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">รายละเอียดรายการค้างคืนพนักงานที่รอการเบิกจ่ายจริง</h3>
                <p className="text-[9px] text-gray-400">รายการสำรองจ่ายพนักงานและเบี้ยเลี้ยงที่ยังไม่ได้เคลียร์ตู้เงินสด</p>
              </div>

              {pendingTxs.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-4 border border-dashed border-gray-200 dark:border-white/10 rounded-2xl">ไม่มีรายการสำรองจ่ายค้างคืน</p>
              ) : (
                <div className="overflow-hidden border border-gray-200 dark:border-white/10 rounded-2xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 text-[10px] font-bold text-gray-400 uppercase">
                        <th className="py-2.5 px-3">วันที่</th>
                        <th className="py-2.5 px-3">พนักงาน</th>
                        <th className="py-2.5 px-3">รายละเอียดรายการ</th>
                        <th className="py-2.5 px-3">หมวดหมู่</th>
                        <th className="py-2.5 px-3 text-right">จำนวนเงิน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 dark:divide-white/5">
                      {pendingTxs.map(tx => {
                        const personalAmount = tx.paidBy === 'SPLIT' ? (tx.splitPersonalAmount || 0) : tx.amount;
                        return (
                          <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                            <td className="py-2.5 px-3 font-mono text-[11px] text-gray-400">{tx.date}</td>
                            <td className="py-2.5 px-3 font-semibold">{tx.staffName}</td>
                            <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300">
                              <div>{tx.description}</div>
                              {tx.note && <div className="text-[9px] text-gray-400 italic">หมายเหตุ: {tx.note}</div>}
                            </td>
                            <td className="py-2.5 px-3 text-gray-400">{tx.category}</td>
                            <td className="py-2.5 px-3 text-right font-bold tabular-nums">{formatCurrency(personalAmount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Signature Area */}
            <div className="pt-8 flex justify-between text-xs text-gray-400">
              <div className="space-y-1">
                <p>ผู้ทำรายการรายงาน: .......................................</p>
                <p className="pl-4">({currentUser?.name || 'พนักงาน'})</p>
              </div>
              <div className="space-y-1 text-right">
                <p>ผู้อนุมัติเติมเงิน: .......................................</p>
                <p className="pr-4">(ผู้บริหาร/ผู้มีอำนาจอนุมัติ)</p>
              </div>
            </div>

          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Dashboard Header & Month Selector */}
        <div className="bg-white/40 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/[0.06] rounded-3xl p-4 md:p-6 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#1d1d1f] dark:text-white leading-tight">รายงานสรุปการเงิน</h2>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">วิเคราะห์สัดส่วนรายรับ-รายจ่ายของเงินกองกลางประจำเดือน</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
            <button
              onClick={() => setExecMode(true)}
              className="px-3.5 py-2.5 bg-orange-500/10 hover:bg-orange-500 hover:text-white border border-orange-500/20 text-orange-500 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
              title="เปิดมุมมองเสนอผู้บริหารเพื่อเติมเงิน"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>เสนอเบิกเงินผู้บริหาร</span>
            </button>
            <div className="w-full sm:w-48 shrink-0">
              <GlassSelect
                value={dashboardMonth}
                onChange={val => setDashboardMonth(val)}
                options={[
                  { value: 'ALL', label: 'ทั้งหมด (ทุกเดือน)' },
                  ...getAvailableMonths().map(m => ({
                    value: m,
                    label: formatMonthTh(m)
                  }))
                ]}
              />
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {/* Total Income */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/5 dark:to-teal-500/0 border border-emerald-200/40 dark:border-emerald-900/10 rounded-3xl p-4 sm:p-5 flex flex-col justify-between min-h-[110px] sm:min-h-[135px]">
            <span className="text-[9px] sm:text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider block">รายรับทั้งหมด</span>
            <span className="text-base sm:text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 block tabular-nums">
              {formatCurrency(data.totalIncome)}
            </span>
            <span className="text-[8px] sm:text-[10px] text-gray-400 dark:text-gray-500 mt-1 leading-tight block">
              *รวมยอดเบิกแอดวานซ์/เติมเงินกองกลาง
            </span>
          </div>

          {/* Total Expense */}
          <div className="bg-gradient-to-br from-red-500/10 to-rose-500/5 dark:from-red-500/5 dark:to-rose-500/0 border border-red-200/40 dark:border-red-900/10 rounded-3xl p-4 sm:p-5 flex flex-col justify-between min-h-[110px] sm:min-h-[135px]">
            <span className="text-[9px] sm:text-xs text-red-700 dark:text-red-400 font-bold uppercase tracking-wider block">รายจ่ายทั้งหมด</span>
            <span className="text-base sm:text-xl md:text-2xl font-black text-red-600 dark:text-red-400 mt-2 block tabular-nums">
              {formatCurrency(data.totalExpense)}
            </span>
            <span className="text-[8px] sm:text-[10px] text-gray-400 dark:text-gray-500 mt-1 leading-tight block">
              *ยอดใช้จ่ายรวมทุกประเภทเงิน
            </span>
          </div>

          {/* Petty Cash Portion */}
          <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 dark:from-blue-500/5 dark:to-indigo-500/0 border border-blue-200/40 dark:border-blue-900/10 rounded-3xl p-4 sm:p-5 flex flex-col justify-between min-h-[110px] sm:min-h-[135px]">
            <span className="text-[9px] sm:text-xs text-blue-700 dark:text-blue-400 font-bold uppercase tracking-wider block">จ่ายจากเงินกองกลาง</span>
            <span className="text-base sm:text-xl md:text-2xl font-black text-blue-600 dark:text-blue-400 mt-2 block tabular-nums">
              {formatCurrency(data.pettyCashSpent)}
            </span>
            <span className="text-[8px] sm:text-[10px] text-gray-400 dark:text-gray-500 mt-1 leading-tight block">
              คิดเป็น {getPercent(data.pettyCashSpent, data.totalExpense)}% ของยอดจ่ายทั้งหมด
            </span>
          </div>

          {/* Personal Advance Portion */}
          <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/5 dark:from-orange-500/5 dark:to-amber-500/0 border border-orange-200/40 dark:border-orange-900/10 rounded-3xl p-4 sm:p-5 flex flex-col justify-between min-h-[110px] sm:min-h-[135px]">
            <span className="text-[9px] sm:text-xs text-orange-700 dark:text-orange-400 font-bold uppercase tracking-wider block">พนักงานสำรองจ่าย</span>
            <span className="text-base sm:text-xl md:text-2xl font-black text-orange-600 dark:text-orange-400 mt-2 block tabular-nums">
              {formatCurrency(data.personalAdvance)}
            </span>
            <span className="text-[8px] sm:text-[10px] text-gray-400 dark:text-gray-500 mt-1 leading-tight block">
              คิดเป็น {getPercent(data.personalAdvance, data.totalExpense)}% ของยอดจ่ายทั้งหมด
            </span>
          </div>
        </div>

        {/* Net Cashflow Banner */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          netCashflow >= 0 
            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
            : 'bg-red-500/5 border-red-500/20 text-red-600 dark:text-red-400'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <Coins className="w-4 h-4 shrink-0" />
            <span className="text-[10px] sm:text-xs font-bold truncate">กระแสเงินสดสุทธิประจำเดือน (รายรับ - รายจ่าย)</span>
          </div>
          <span className="text-xs sm:text-sm md:text-base font-black tabular-nums shrink-0">
            {netCashflow >= 0 ? '+' : ''}{formatCurrency(netCashflow)}
          </span>
        </div>

        {/* Monthly Trend Area Chart */}
        {monthlyTrend.length > 0 && (
          <div className="bg-white/40 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/[0.06] rounded-3xl p-5 md:p-6 backdrop-blur-xl space-y-4">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-gray-800 dark:text-white">แนวโน้มกระแสเงินสดกองกลาง (Cash Flow Trend)</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">การเปรียบเทียบรายรับและรายจ่ายในแต่ละเดือนเพื่อติดตามสภาพคล่องของร้าน</p>
            </div>
            <div className="w-full h-80 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                  <XAxis dataKey="month" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatMonthShortTh} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2.5} name="รายรับ" />
                  <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2.5} name="รายจ่าย" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Two Column Breakdown Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Breakdown card */}
          <div className="bg-white/40 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/[0.06] rounded-3xl p-5 md:p-6 backdrop-blur-xl space-y-4">
            <h3 className="text-xs sm:text-sm font-bold text-gray-800 dark:text-white border-b border-gray-100 dark:border-white/5 pb-3">
              รายจ่ายแยกตามหมวดหมู่ (Expense by Category)
            </h3>
            
            {categoryData.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-6">ไม่มีรายการบันทึกรายจ่ายในช่วงเวลานี้</p>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                {/* Donut Chart */}
                <div className="w-full sm:w-1/2 flex items-center justify-center shrink-0">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend list */}
                <div className="flex-1 w-full space-y-2.5 max-h-60 overflow-y-auto custom-scrollbar">
                  {categoryData.map((item, index) => {
                    const percent = getPercent(item.value, data.totalExpense);
                    return (
                      <div key={item.name} className="flex items-center justify-between text-xs py-1 border-b border-gray-100/30 dark:border-white/[0.02] last:border-0">
                        <div className="flex items-center gap-2 truncate min-w-0 pr-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="font-semibold text-gray-700 dark:text-gray-300 truncate">{item.name}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-[#1d1d1f] dark:text-white tabular-nums">{formatCurrency(item.value)}</span>
                          <span className="text-[10px] text-gray-400 ml-1.5">({percent}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Staff Breakdown card */}
          <div className="bg-white/40 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/[0.06] rounded-3xl p-5 md:p-6 backdrop-blur-xl space-y-4">
            <h3 className="text-xs sm:text-sm font-bold text-gray-800 dark:text-white border-b border-gray-100 dark:border-white/5 pb-3">
              รายจ่ายแยกตามผู้ทำรายการ (Expense by Staff)
            </h3>
            
            {staffData.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-6">ไม่มีรายการบันทึกรายจ่ายในช่วงเวลานี้</p>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                {/* Horizontal Bar Chart */}
                <div className="w-full sm:w-3/5 flex items-center justify-center shrink-0">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={staffData} layout="vertical" margin={{ left: -10, right: 10, top: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ffffff10" />
                      <XAxis type="number" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} width={75} />
                      <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                      <Bar dataKey="value" fill="#ff9500" radius={[0, 6, 6, 0]} barSize={10}>
                        {staffData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend list */}
                <div className="flex-1 w-full space-y-2.5 max-h-60 overflow-y-auto custom-scrollbar">
                  {staffData.map((item, index) => {
                    const percent = getPercent(item.value, data.totalExpense);
                    return (
                      <div key={item.name} className="flex items-center justify-between text-xs py-1 border-b border-gray-100/30 dark:border-white/[0.02] last:border-0">
                        <div className="flex items-center gap-2 truncate min-w-0 pr-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[(index + 1) % COLORS.length] }} />
                          <span className="font-semibold text-gray-700 dark:text-gray-300 truncate">{item.name}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-[#1d1d1f] dark:text-white tabular-nums">{formatCurrency(item.value)}</span>
                          <span className="text-[10px] text-gray-400 ml-1.5">({percent}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getPendingReimbursementsByStaff = () => {
    const map = new Map<string, { total: number; txs: PettyCashTransaction[] }>();
    
    transactions.forEach(tx => {
      if (tx.type === 'EXPENSE' && !tx.isReimbursed) {
        let personalAmount = 0;
        if (tx.paidBy === 'PERSONAL_CASH' || tx.paidBy === 'PERSONAL_TRANSFER') {
          personalAmount = tx.amount;
        } else if (tx.paidBy === 'SPLIT') {
          personalAmount = tx.splitPersonalAmount || 0;
        }
        
        if (personalAmount > 0) {
          const staff = tx.staffName || 'Unknown';
          if (!map.has(staff)) {
            map.set(staff, { total: 0, txs: [] });
          }
          const data = map.get(staff)!;
          data.total += personalAmount;
          data.txs.push(tx);
        }
      }
    });
    
    return map;
  };

  const renderAuditTab = () => {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Smart Forecast Planner Component */}
        <ReplenishmentPlanner 
          currentBalance={summary.pettyCashBalance} 
          transactions={transactions} 
          targetFloat={targetFloat} 
          totalPersonalAdvance={summary.totalPersonalAdvance}
        />

        {/* Audit Action Banner */}
        <div className="bg-white/40 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/[0.06] rounded-3xl p-5 md:p-6 backdrop-blur-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-bold text-[#1d1d1f] dark:text-white leading-tight">ตรวจสอบและตรวจนับเงินสดจริง</h2>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">ทำการตรวจนับเงินสดจริงในกล่องเก็บเงิน เพื่อกระทบยอดบัญชีและป้องกันความผิดพลาด</p>
          </div>
          <button
            onClick={() => setShowAuditModal(true)}
            className="px-5 py-3 bg-gradient-to-r from-blue-500 to-[#0071e3] hover:from-blue-600 hover:to-[#0077ed] text-white font-black rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-blue-500/10 outline-none w-full md:w-auto"
          >
            <Coins className="w-4.5 h-4.5" />
            <span>เริ่มบันทึกตรวจนับเงินสด</span>
          </button>
        </div>

        {/* Audit History Log */}
        <div className="bg-white/40 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/[0.06] rounded-3xl p-5 md:p-6 backdrop-blur-xl space-y-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#1d1d1f] dark:text-white">ประวัติการตรวจนับเงินสด (Audit Trail)</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">รายการตรวจสอบความถูกต้องของกล่องเงินสดย้อนหลัง</p>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-12 text-center text-gray-400 dark:text-gray-500 italic text-xs">
              ยังไม่มีประวัติการบันทึกตรวจนับเงินในระบบ
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200/60 dark:border-white/5">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#1c1c1e] text-gray-400 font-bold border-b border-gray-150/40 dark:border-white/5">
                    <th className="py-3.5 px-4">วันที่ / เวลา</th>
                    <th className="py-3.5 px-3">ผู้ตรวจสอบ</th>
                    <th className="py-3.5 px-3 text-right">ยอดในระบบ</th>
                    <th className="py-3.5 px-3 text-right">ยอดนับจริง</th>
                    <th className="py-3.5 px-3 text-right">ส่วนต่าง</th>
                    <th className="py-3.5 px-3 text-center">สถานะ</th>
                    <th className="py-3.5 px-4">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150/30 dark:divide-white/5">
                  {auditLogs.map((log) => {
                    const diff = log.discrepancy;
                    return (
                      <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                        <td className="py-3 px-4 font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('th-TH', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </td>
                        <td className="py-3 px-3 font-semibold text-gray-700 dark:text-gray-200">{log.auditedBy}</td>
                        <td className="py-3 px-3 text-right font-semibold tabular-nums text-gray-500 dark:text-gray-400">{formatCurrency(log.systemBalance)}</td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums text-gray-800 dark:text-gray-100">{formatCurrency(log.physicalBalance)}</td>
                        <td className={`py-3 px-3 text-right font-extrabold tabular-nums ${
                          diff === 0 ? 'text-emerald-500' : diff > 0 ? 'text-amber-500' : 'text-red-500'
                        }`}>
                          {diff > 0 ? `+${diff.toFixed(2)}` : diff === 0 ? '±0.00' : diff.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.status === 'MATCHED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}>
                            {log.status === 'MATCHED' ? '✓ ตรงกัน' : '⚠️ ไม่ตรง'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400 italic max-w-[200px] truncate" title={log.note}>
                          {log.note || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderReimbursements = () => {
    const pendingMap = getPendingReimbursementsByStaff();
    const staffList = Array.from(pendingMap.entries()).sort((a, b) => b[1].total - a[1].total);

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-white/40 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/[0.06] rounded-3xl p-4 md:p-6 backdrop-blur-xl">
          <h2 className="text-base sm:text-lg font-bold text-[#1d1d1f] dark:text-white leading-tight">รายชื่อพนักงานที่รอรับเงินคืน</h2>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">แสดงรายละเอียดรายการสำรองจ่ายส่วนตัวที่ยังไม่ได้ทำการคืนเงินแยกตามรายบุคคล</p>
        </div>

        {staffList.length === 0 ? (
          <div className="bg-white/40 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/[0.06] rounded-3xl p-12 text-center text-gray-400 dark:text-gray-500 italic">
             ไม่มีพนักงานที่ค้างเงินสำรองจ่ายในระบบ
          </div>
        ) : (
          <div className="space-y-6">
            {staffList.map(([staffName, data]) => (
              <div key={staffName} className="bg-white/40 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/[0.06] rounded-3xl p-5 md:p-6 backdrop-blur-xl space-y-4">
                
                {/* Staff Summary Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-150/50 dark:border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0 font-bold text-sm">
                      {staffName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-[#1d1d1f] dark:text-white">
                        {getDisplayName(staffName)} {userMap[staffName.trim()] && <span className="text-xs text-gray-400 font-normal">({staffName})</span>}
                      </h3>
                      <p className="text-[10px] text-gray-400 mt-0.5">{data.txs.length} รายการที่รอคืน</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 justify-between sm:justify-end">
                    <div className="text-left sm:text-right">
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">ยอดเงินรอคืนรวม</span>
                      <span className="text-base sm:text-lg font-black text-[#ff9500] block mt-0.5 tabular-nums">
                        {formatCurrency(data.total)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleReimburseAllForStaff(staffName)}
                      className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-[#0071e3] hover:from-blue-600 hover:to-[#0077ed] text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-blue-500/10 outline-none"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>คืนเงินทั้งหมด ({formatCurrency(data.total)})</span>
                    </button>
                  </div>
                </div>

                {/* Desktop Table View of items */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-150/30 dark:border-white/5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-left">
                        <th className="pb-2 pl-2">วันที่ / เวลา</th>
                        <th className="pb-2">ใบเสร็จ</th>
                        <th className="pb-2">รายละเอียดรายการ</th>
                        <th className="pb-2">หมวดหมู่</th>
                        <th className="pb-2">วิธีจ่ายเงิน</th>
                        <th className="pb-2 text-right">จำนวนเงินสำรอง</th>
                        <th className="pb-2 text-right pr-2">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/50 dark:divide-white/5">
                      {data.txs.map(tx => {
                        const personalAmount = tx.paidBy === 'SPLIT' ? (tx.splitPersonalAmount || 0) : tx.amount;
                        return (
                          <tr key={tx.id} className="text-xs text-[#1d1d1f] dark:text-gray-200 hover:bg-gray-50/20 dark:hover:bg-white/[0.01] transition-all">
                            {/* Date / Time */}
                            <td className="py-3 pl-2 font-mono whitespace-nowrap">
                              <div>{tx.date}</div>
                              {tx.time && <div className="text-[10px] text-gray-400 mt-0.5">{tx.time}</div>}
                            </td>

                            {/* Receipt Thumbnail */}
                            <td className="py-3">
                              {tx.receiptUrl ? (
                                <button
                                  onClick={() => setActiveReceiptUrl(tx.receiptUrl!)}
                                  className="w-10 h-10 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shrink-0 hover:scale-105 active:scale-95 transition-transform shadow-sm"
                                  title="ดูใบเสร็จ"
                                >
                                  <img src={tx.receiptUrl} className="w-full h-full object-cover" alt="Receipt" />
                                </button>
                              ) : (
                                <span className="text-gray-400 italic text-[10px]">ไม่มีรูป</span>
                              )}
                            </td>

                            {/* Description */}
                            <td className="py-3 max-w-[250px]">
                              <div className="space-y-1">
                                <span className="font-semibold text-gray-800 dark:text-gray-200 block truncate" title={tx.description}>
                                  {tx.description}
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {tx.note && (
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 italic block">
                                      หมายเหตุ: {tx.note}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Category */}
                            <td className="py-3 text-gray-500 dark:text-gray-400">{tx.category}</td>

                            {/* Method */}
                            <td className="py-3 font-medium">
                              {tx.paidBy === 'PERSONAL_CASH' ? (
                                <span className="text-amber-500">เงินสด</span>
                              ) : tx.paidBy === 'PERSONAL_TRANSFER' ? (
                                <span className="text-amber-500">เงินโอน</span>
                              ) : (
                                <span className="text-purple-500">จ่ายแบบผสม (ค้าง {tx.splitPersonalAmount} บ.)</span>
                              )}
                            </td>

                            {/* Amount */}
                            <td className="py-3 text-right font-bold tabular-nums whitespace-nowrap">
                              {formatCurrency(personalAmount)}
                            </td>

                            {/* Actions */}
                            <td className="py-3 text-right pr-2">
                              <button
                                onClick={() => handleReimburse(tx.id)}
                                className="px-4 py-2 bg-[#34c759] hover:bg-[#30b34f] text-white font-bold rounded-xl text-xs shadow-sm shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-95 transition-all outline-none inline-flex items-center gap-1.5"
                                title="กดบันทึกคืนเงินพนักงาน"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>คืนเงินพนักงาน</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile List View of items */}
                <div className="sm:hidden space-y-3">
                  {data.txs.map(tx => {
                    const personalAmount = tx.paidBy === 'SPLIT' ? (tx.splitPersonalAmount || 0) : tx.amount;
                    return (
                      <div key={tx.id} className="p-4 bg-gray-50/50 dark:bg-[#1c1c1e]/40 border border-gray-200/30 dark:border-white/5 rounded-2xl space-y-3 text-xs">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-1">
                            <span className="font-semibold text-gray-700 dark:text-gray-200 block truncate">{tx.description}</span>
                            <div className="text-[10px] text-gray-400 flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono">{tx.date}</span>
                              <span>•</span>
                              <span>{tx.category}</span>
                              <span>•</span>
                              <span className="text-[#ff9500] font-medium">
                                {tx.paidBy === 'PERSONAL_CASH' ? 'เงินสด' : tx.paidBy === 'PERSONAL_TRANSFER' ? 'เงินโอน' : 'จ่ายแบบผสม'}
                              </span>
                            </div>
                            {tx.note && <p className="text-[10px] text-gray-400 italic">หมายเหตุ: {tx.note}</p>}
                          </div>
                          {tx.receiptUrl && (
                            <button
                              onClick={() => setActiveReceiptUrl(tx.receiptUrl!)}
                              className="w-12 h-12 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shrink-0 shadow-sm"
                            >
                              <img src={tx.receiptUrl} className="w-full h-full object-cover" alt="Receipt" />
                            </button>
                          )}
                        </div>
                        <div className="pt-2 border-t border-gray-150/30 dark:border-white/5 flex items-center justify-between">
                          <span className="font-bold text-sm text-[#1d1d1f] dark:text-white tabular-nums">
                            {formatCurrency(personalAmount)}
                          </span>
                          <button
                            onClick={() => handleReimburse(tx.id)}
                            className="px-4 py-2 bg-[#34c759] hover:bg-[#30b34f] text-white font-bold rounded-xl text-[11px] shadow-sm transition-colors active:scale-95 flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>คืนเงิน</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderTransactionDetails = (tx: PettyCashTransaction) => {
    const isExpense = tx.type === 'EXPENSE';
    const isPersonal = tx.paidBy !== 'PETTY_CASH';
    const showReimburseBtn = isExpense && isPersonal && !tx.isReimbursed;
    
    // Icon bg & color
    let iconBg = 'bg-orange-500/10 text-[#ff9500]';
    let IconComponent = ArrowDownLeft;
    if (tx.type === 'INCOME') {
      iconBg = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
      IconComponent = ArrowUpRight;
    } else if (tx.paidBy === 'PETTY_CASH') {
      iconBg = 'bg-blue-500/10 text-blue-500';
    } else if (tx.paidBy === 'SPLIT') {
      iconBg = 'bg-purple-500/10 text-purple-500';
    }

    return (
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 w-full py-1">
        {/* Description & Thumbnail/Icon */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {tx.receiptUrl ? (
            <button
              onClick={() => setActiveReceiptUrl(tx.receiptUrl!)}
              className="w-10 h-10 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shrink-0 hover:scale-105 active:scale-95 transition-all shadow-sm"
              title="ดูใบเสร็จ"
            >
              <img src={tx.receiptUrl} className="w-full h-full object-cover" alt="Receipt" />
            </button>
          ) : (
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
              <IconComponent className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className="font-semibold block text-sm text-gray-800 dark:text-gray-100 break-words whitespace-normal" title={tx.description}>
              {tx.description}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 block mt-0.5">
              {tx.category} · {tx.time ? `${tx.time} น. · ` : ''}โดย {getDisplayName(tx.staffName)}
              {tx.note && <span className="italic"> ({tx.note})</span>}
            </span>
          </div>
        </div>

        {/* Status & Method Badge / Actions */}
        <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0">
          {/* Payment source status */}
          <div className="text-left lg:text-right">
            {tx.type === 'INCOME' ? (
              <span className="text-[10px] text-gray-400 block font-medium">เบิกเงินพี่เกษม</span>
            ) : tx.paidBy === 'PETTY_CASH' ? (
              <span className="text-[10px] text-blue-500 font-semibold block">เงินกองกลาง</span>
            ) : tx.paidBy === 'SPLIT' ? (
              <div className="space-y-0.5">
                <span className="text-[10px] text-purple-500 font-semibold block">จ่ายแบบผสม</span>
                <span className="text-[9px] text-gray-400 dark:text-gray-500 block leading-tight">
                  (กองกลาง {tx.splitPettyCashAmount} / ส่วนตัว {tx.splitPersonalAmount})
                </span>
                {tx.isReimbursed ? (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                    <Check className="w-2.5 h-2.5" /> คืนพนักงาน {tx.splitPersonalAmount} บ.
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.2 rounded animate-pulse">
                    <AlertCircle className="w-2.5 h-2.5" /> ค้างคืน {tx.splitPersonalAmount} บ.
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-0.5">
                <span className="text-[10px] text-amber-500 font-semibold block">
                  {tx.paidBy === 'PERSONAL_CASH' ? 'สำรองจ่าย (เงินสด)' : 'สำรองจ่าย (เงินโอน)'}
                </span>
                {tx.isReimbursed ? (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                    <Check className="w-2.5 h-2.5" /> คืนพนักงานแล้ว
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.2 rounded animate-pulse">
                    <AlertCircle className="w-2.5 h-2.5" /> ยังไม่คืนเงิน
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Amount */}
          <div className={`text-right font-black text-sm tabular-nums whitespace-nowrap min-w-[80px] ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-gray-700 dark:text-gray-200'}`}>
            {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
          </div>

          {/* Actions Button Group */}
          <div className="flex items-center gap-1">
            {showReimburseBtn && (
              <button
                onClick={() => handleReimburse(tx.id)}
                className="px-2 py-1 bg-[#34c759] hover:bg-[#30b34f] text-white font-bold rounded-lg text-[10px] shadow-sm transition-colors active:scale-95 whitespace-nowrap"
                title="กดบันทึกคืนเงินพนักงาน"
              >
                คืนเงิน
              </button>
            )}
            <button
              onClick={() => { setSelectedTx(tx); setShowModal(true); }}
              className="p-1 text-gray-400 hover:text-blue-500 hover:bg-gray-150 dark:hover:bg-white/5 rounded-lg transition-colors"
              title="แก้ไขรายการ"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            {isAdmin && (
              <button
                onClick={() => handleDelete(tx.id)}
                className="p-1 text-gray-400 hover:text-red-500 hover:bg-gray-150 dark:hover:bg-white/5 rounded-lg transition-colors"
                title="ลบรายการ"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMonthPanel = (panelMonth: string) => {
    const isCustomRange = panelMonth === 'CUSTOM';
    
    const panelTransactions = transactions.filter(tx => {
      // 1. Date / Month matching
      if (isCustomRange) {
        const matchesStartDate = !startDate || tx.date >= startDate;
        const matchesEndDate = !endDate || tx.date <= endDate;
        if (!matchesStartDate || !matchesEndDate) return false;
      } else {
        if (!tx.date.startsWith(panelMonth)) return false;
      }
      
      // 2. Search filter
      const matchesSearch = 
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.note && tx.note.toLowerCase().includes(searchTerm.toLowerCase()));

      // 3. Type filter
      const matchesType = typeFilter === 'ALL' || tx.type === typeFilter;

      // 4. Source filter
      const matchesSource = sourceFilter === 'ALL' || 
        (sourceFilter === 'PERSONAL_CASH' && (tx.paidBy === 'PERSONAL_CASH' || tx.paidBy === 'PERSONAL_TRANSFER')) ||
        tx.paidBy === sourceFilter;

      return matchesSearch && matchesType && matchesSource;
    });

    if (panelTransactions.length === 0) {
      return (
        <div className="py-12 text-center text-gray-400 italic">
          ไม่พบข้อมูลบันทึกรายการการเงินที่ตรงกับตัวกรอง
        </div>
      );
    }

    // Sort transactions reverse-chronologically (newest first)
    const sortedTxs = [...panelTransactions].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return (b.time || '').localeCompare(a.time || '');
    });

    // Group transactions by date (only needed for mobile Timeline layout)
    const groups: { date: string; txs: PettyCashTransaction[] }[] = [];
    sortedTxs.forEach(tx => {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === tx.date) {
        lastGroup.txs.push(tx);
      } else {
        groups.push({ date: tx.date, txs: [tx] });
      }
    });

    return (
      <div className="w-full flex flex-col">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-left">
                <th className="pb-3 pl-2">วันที่</th>
                <th className="pb-3">ประเภท</th>
                <th className="pb-3">รายละเอียดรายการ</th>
                <th className="pb-3">วิธีจ่ายเงิน / สถานะ</th>
                <th className="pb-3">ผู้ทำรายการ</th>
                <th className="pb-3 text-right">จำนวนเงิน</th>
                <th className="pb-3 text-right pr-2">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/50 dark:divide-white/5">
              {sortedTxs.map(tx => {
                const isExpense = tx.type === 'EXPENSE';
                const isPersonal = tx.paidBy !== 'PETTY_CASH';
                const showReimburseBtn = isExpense && isPersonal && !tx.isReimbursed;

                return (
                  <tr key={tx.id} className="text-xs text-[#1d1d1f] dark:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-all">
                    {/* Date */}
                    <td className="py-3.5 pl-2 font-mono whitespace-nowrap">
                      <div>{tx.date}</div>
                      {tx.time && (
                        <div className="text-[10px] text-gray-400 flex items-center gap-0.5 mt-0.5">
                          <Clock className="w-3 h-3 text-gray-400/80" />
                          {tx.time}
                        </div>
                      )}
                    </td>
                    
                    {/* Type Icon */}
                    <td className="py-3.5 whitespace-nowrap">
                      {tx.type === 'INCOME' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full font-bold text-[10px]">
                          <ArrowUpRight className="w-3 h-3" /> เบิกเงินพี่เกษม
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-orange-500/10 text-[#ff9500] rounded-full font-bold text-[10px]">
                          <ArrowDownLeft className="w-3 h-3" /> รายจ่าย
                        </span>
                      )}
                    </td>

                    {/* Description & linked RMA */}
                    <td className="py-3.5 max-w-[200px] md:max-w-[300px]">
                      <div className="flex items-center gap-3">
                        {tx.receiptUrl && (
                          <button
                            onClick={() => setActiveReceiptUrl(tx.receiptUrl!)}
                            className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 shrink-0 hover:scale-105 active:scale-95 transition-transform"
                            title="ดูใบเสร็จ"
                          >
                            <img src={tx.receiptUrl} className="w-full h-full object-cover" alt="Receipt" />
                          </button>
                        )}
                        <div className="truncate">
                          <span className="font-semibold block truncate" title={tx.description}>{tx.description}</span>
                          <span className="text-[10px] text-gray-400 mt-0.5 block">{tx.category}</span>
                        </div>
                      </div>
                    </td>

                    {/* Payment Method / Reimbursement */}
                    <td className="py-3.5">
                      <div>
                        {tx.type === 'INCOME' ? (
                          <span className="text-gray-400">เบิกเงินพี่เกษม</span>
                        ) : tx.paidBy === 'PETTY_CASH' ? (
                          <span className="text-blue-500 font-medium">เงินกองกลาง</span>
                        ) : tx.paidBy === 'SPLIT' ? (
                          <div className="space-y-1">
                            <span className="text-purple-500 font-semibold block">จ่ายแบบผสม</span>
                            <span className="text-[10px] text-gray-400 block leading-tight">
                              (กองกลาง {tx.splitPettyCashAmount} / ส่วนตัว {tx.splitPersonalAmount})
                            </span>
                            {tx.isReimbursed ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                                <Check className="w-2.5 h-2.5" /> คืนส่วนต่าง {tx.splitPersonalAmount} บ. แล้ว
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-md animate-pulse">
                                <AlertCircle className="w-2.5 h-2.5" /> ค้างคืนพนักงาน {tx.splitPersonalAmount} บ.
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-amber-500 font-semibold block">
                              {tx.paidBy === 'PERSONAL_CASH' ? 'สำรองจ่าย (เงินสด)' : 'สำรองจ่าย (เงินโอน)'}
                            </span>
                            {tx.isReimbursed ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.2 rounded-md">
                                <Check className="w-2.5 h-2.5" /> คืนพนักงานแล้ว
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.2 rounded-md animate-pulse">
                                <AlertCircle className="w-2.5 h-2.5" /> ยังไม่เบิกคืน
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Staff Name */}
                    <td className="py-3.5 whitespace-nowrap text-gray-500 dark:text-gray-400" title={tx.staffName}>{getDisplayName(tx.staffName)}</td>

                    {/* Amount */}
                    <td className="py-3.5 text-right font-bold text-sm tabular-nums whitespace-nowrap">
                      {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 text-right pr-2 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {showReimburseBtn && (
                          <button
                            onClick={() => handleReimburse(tx.id)}
                            className="px-2 py-1 bg-[#34c759] hover:bg-[#30b34f] text-white font-bold rounded-lg text-[10px] shadow-sm transition-colors active:scale-95"
                            title="กดบันทึกคืนเงินพนักงาน"
                          >
                            คืนเงินพนักงาน
                          </button>
                        )}
                        <button
                          onClick={() => { setSelectedTx(tx); setShowModal(true); }}
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-gray-150 dark:hover:bg-white/5 rounded-lg transition-colors"
                          title="แก้ไขรายการ"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-150 dark:hover:bg-white/5 rounded-lg transition-colors"
                            title="ลบรายการ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Timeline View (Full width, no left column) */}
        <div className="md:hidden flex flex-col w-full divide-y divide-gray-100/50 dark:divide-white/5 select-none">
          {groups.map(group => (
            <div key={group.date} className="py-3">
              {/* Date Header Separator Row */}
              <div className="flex items-center gap-2 py-1.5 mb-2">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-lg shrink-0">
                  {formatThaiDate(group.date)}
                </span>
                <div className="h-px bg-gray-200/50 dark:bg-white/5 flex-1" />
              </div>

              {/* Transactions list */}
              <div className="space-y-3.5">
                {group.txs.map(tx => (
                  <div key={tx.id} className="bg-white dark:bg-[#1c1c1e] p-3 rounded-2xl border border-gray-200/50 dark:border-white/[0.05] shadow-sm">
                    {renderTransactionDetails(tx)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-in px-4 pb-20 md:pb-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-white/40 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/[0.06] rounded-2xl p-4 backdrop-blur-xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base md:text-lg font-bold text-[#1d1d1f] dark:text-white leading-tight truncate whitespace-nowrap">รายจ่าย & เงินกองกลาง</h1>
            <p className="text-[9px] sm:text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate whitespace-nowrap">จัดการเงินกองกลางและสำรองจ่าย</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto shrink-0">
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#2c2c2e] dark:hover:bg-[#3a3a3c] border border-gray-200/50 dark:border-white/5 text-gray-700 dark:text-gray-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-all outline-none"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
            <span>ส่งออก CSV</span>
          </button>
          <button
            onClick={() => { setSelectedTx(undefined); setShowModal(true); }}
            className="flex-1 sm:flex-none px-3 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-all shadow-md shadow-blue-500/10 outline-none"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มบันทึก</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="relative flex p-1 bg-gray-100/50 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/5 rounded-2xl w-full sm:w-[580px] h-10 select-none">
        {/* Sliding background pill */}
        <div 
          className={`absolute top-1 bottom-1 w-[calc(25%-6px)] bg-white dark:bg-[#2c2c2e] rounded-xl shadow-sm border border-gray-200/20 dark:border-white/5 transition-all duration-300 ease-out ${
            activeTab === 'records' 
              ? 'left-1' 
              : activeTab === 'dashboard' 
                ? 'left-[calc(25%+2px)]' 
                : activeTab === 'reimbursements' 
                  ? 'left-[calc(50%+2px)]' 
                  : 'left-[calc(75%+2px)]'
          }`}
        />
        <button
          onClick={() => setActiveTab('records')}
          className={`relative z-10 flex-1 py-1.5 text-[10px] sm:text-xs font-bold text-center rounded-xl transition-colors duration-300 flex items-center justify-center ${
            activeTab === 'records'
              ? 'text-[#0071e3]'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          รายการบันทึก
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`relative z-10 flex-1 py-1.5 text-[10px] sm:text-xs font-bold text-center rounded-xl transition-colors duration-300 flex items-center justify-center ${
            activeTab === 'dashboard'
              ? 'text-[#0071e3]'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          สถิติ & แดชบอร์ด
        </button>
        <button
          onClick={() => setActiveTab('reimbursements')}
          className={`relative z-10 flex-1 py-1.5 text-[10px] sm:text-xs font-bold text-center rounded-xl transition-colors duration-300 flex items-center justify-center ${
            activeTab === 'reimbursements'
              ? 'text-[#0071e3]'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          คนที่รอคืน ({Object.keys(summary.personalAdvanceByStaff).length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`relative z-10 flex-1 py-1.5 text-[10px] sm:text-xs font-bold text-center rounded-xl transition-colors duration-300 flex items-center justify-center ${
            activeTab === 'audit'
              ? 'text-[#0071e3]'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          ตรวจนับ & แผนเงิน
        </button>
      </div>

      {activeTab === 'records' ? (
        <>
          {/* Summary Widgets Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {/* Petty Cash Balance */}
        <div className="bg-emerald-500/5 dark:bg-emerald-500/[0.02] border border-emerald-500/20 dark:border-emerald-500/10 rounded-2xl p-3.5 sm:p-5 backdrop-blur-xl flex flex-col justify-between min-h-[110px] sm:min-h-[135px] relative overflow-hidden">
          <div className="absolute right-3 top-3 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center">
            <Coins className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider block pr-6 truncate whitespace-nowrap">เงินสดกองกลาง</span>
            <span className={`text-base sm:text-xl md:text-2xl font-black mt-1 sm:mt-2 block tabular-nums ${summary.pettyCashBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
              {formatCurrency(summary.pettyCashBalance)}
            </span>
          </div>
          <span className="text-[8px] sm:text-[10px] text-emerald-600/70 dark:text-emerald-400/60 mt-1 sm:mt-2 block leading-tight truncate whitespace-nowrap">
            *เงินสดพร้อมหยิบจ่ายได้ทันที
          </span>
        </div>

        {/* Net Remaining Balance */}
        {(() => {
          const netBalance = summary.pettyCashBalance - summary.totalPersonalAdvance;
          return (
            <div className="bg-blue-500/5 dark:bg-blue-500/[0.02] border border-blue-500/20 dark:border-blue-500/10 rounded-2xl p-3.5 sm:p-5 backdrop-blur-xl flex flex-col justify-between min-h-[110px] sm:min-h-[135px] relative overflow-hidden">
              <div className="absolute right-3 top-3 text-blue-600 dark:text-blue-400 bg-blue-500/10 w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider block pr-6 truncate whitespace-nowrap">คงเหลือสุทธิ</span>
                <span className={`text-base sm:text-xl md:text-2xl font-black mt-1 sm:mt-2 block tabular-nums ${netBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
                  {formatCurrency(netBalance)}
                </span>
              </div>
              <span className="text-[8px] sm:text-[10px] text-blue-600/70 dark:text-blue-400/60 mt-1 sm:mt-2 block leading-tight truncate whitespace-nowrap">
                *หักยอดค้างคืนพนักงานแล้ว
              </span>
            </div>
          );
        })()}

        {/* Unpaid Advance Payments */}
        <div className="bg-orange-500/5 dark:bg-orange-500/[0.02] border border-orange-500/20 dark:border-orange-500/10 rounded-2xl p-3.5 sm:p-5 backdrop-blur-xl flex flex-col justify-between min-h-[110px] sm:min-h-[135px] relative overflow-hidden">
          <div className="absolute right-3 top-3 text-orange-600 dark:text-orange-400 bg-orange-500/10 w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-xs text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider block pr-6 truncate whitespace-nowrap">สำรองจ่ายค้างคืน</span>
            <span className="text-base sm:text-xl md:text-2xl font-black text-orange-600 dark:text-orange-400 mt-1 sm:mt-2 block tabular-nums">
              {formatCurrency(summary.totalPersonalAdvance)}
            </span>
          </div>
          <span className="text-[8px] sm:text-[10px] text-orange-600/70 dark:text-orange-400/60 mt-1 sm:mt-2 block leading-tight truncate whitespace-nowrap">
            *พนักงานสำรองจ่ายเงินส่วนตัว
          </span>
        </div>

        {/* Staff Breakdown settlement card */}
        <div className="bg-purple-500/5 dark:bg-purple-500/[0.02] border border-purple-500/20 dark:border-purple-500/10 rounded-2xl p-3.5 sm:p-5 backdrop-blur-xl flex flex-col justify-between min-h-[110px] sm:min-h-[135px]">
          <span className="text-[9px] sm:text-xs text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider block mb-1 truncate whitespace-nowrap">ยอดค้างคืนแยกรายคน</span>
          <div className="flex-1 overflow-y-auto max-h-[60px] sm:max-h-[85px] space-y-1 custom-scrollbar pr-0.5">
            {Object.keys(summary.personalAdvanceByStaff).length === 0 ? (
              <p className="text-[9px] sm:text-xs text-purple-600/70 dark:text-purple-400/50 italic mt-1 sm:mt-2 truncate whitespace-nowrap">ไม่มีค้างจ่ายพนักงาน</p>
            ) : (
              Object.entries(summary.personalAdvanceByStaff).map(([name, amount]) => (
                <div key={name} className="flex flex-col gap-1 py-1 border-b border-purple-200/30 dark:border-purple-500/5 last:border-0">
                  <span className="font-semibold text-purple-800 dark:text-purple-300 truncate text-[10px] sm:text-xs" title={name}>{getDisplayName(name)}</span>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-purple-600 dark:text-purple-400 tabular-nums text-[10px] sm:text-xs">{formatCurrency(amount)}</span>
                    <button
                      onClick={() => handleReimburseAllForStaff(name)}
                      className="text-[8px] sm:text-[9px] px-2 py-0.5 bg-purple-500/10 hover:bg-[#0071e3] hover:text-white text-purple-600 dark:text-purple-400 font-bold rounded transition-colors active:scale-95 shrink-0"
                    >
                      คืนเงิน
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Filter and Table Section */}
      <div 
        className="bg-white/40 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/[0.06] rounded-3xl p-4 md:p-6 backdrop-blur-xl space-y-6 select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        
        {/* Month Horizontal Selector Bar */}
        <div className="flex justify-start sm:justify-center border-b border-gray-150/40 dark:border-white/5 pb-2 mb-4 overflow-x-auto scrollbar-none select-none w-full gap-6 px-2">
          {getMonthList().map(item => {
            const isActive = selectedMonth === item.val;
            return (
              <button
                key={item.val}
                type="button"
                onClick={() => {
                  if (item.val === selectedMonth) return;
                  const list = getMonthList();
                  const currentIdx = list.findIndex(m => m.val === selectedMonth);
                  const targetIdx = list.findIndex(m => m.val === item.val);
                  const direction = targetIdx > currentIdx ? 'left' : 'right';
                  animateMonthChange(direction, item.val);
                }}
                className={`pb-1 text-xs sm:text-sm font-bold whitespace-nowrap transition-all relative outline-none cursor-pointer ${
                  isActive 
                    ? 'text-blue-500 dark:text-white' 
                    : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                }`}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 dark:bg-white rounded-full animate-fade-in" />
                )}
              </button>
            );
          })}
        </div>

        {/* Date Range Subtext indicator */}
        <div className="text-center select-none w-full">
          {startDate && endDate && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider block">
              ช่วงเวลารอบบัญชี: {formatThaiDate(startDate)} — {formatThaiDate(endDate)} · 📱 ปัดซ้าย/ขวาเพื่อเลื่อนเดือน
            </span>
          )}
        </div>



        {/* Filters Row */}
        <div className="flex flex-col xl:flex-row xl:items-center gap-4">
          {/* Search bar */}
          <div className="relative w-full xl:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-gray-50/50 dark:bg-[#1c1c1e]/60 border border-gray-200/50 dark:border-white/5 rounded-xl text-xs outline-none focus:border-[#0071e3] focus:bg-white dark:focus:bg-[#1c1c1e] text-[#1d1d1f] dark:text-white transition-all shadow-sm"
              placeholder="ค้นหาข้อความ..."
            />
          </div>

          {/* Filter Chips Container */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 w-full">
            {/* Type Filter Segmented Control */}
            <div className="relative grid grid-cols-3 bg-gray-100/60 dark:bg-white/[0.03] p-0.5 rounded-lg w-full md:w-56 shrink-0 select-none border border-gray-200/20 dark:border-white/[0.03] h-9">
              <div 
                className={`absolute top-0.5 bottom-0.5 w-[calc(33.333%-4px)] bg-white dark:bg-[#2c2c2e] rounded-md shadow-sm border border-gray-200/20 dark:border-white/5 transition-all duration-300 ease-out ${
                  typeFilter === 'ALL' 
                    ? 'left-0.5' 
                    : typeFilter === 'INCOME' 
                    ? 'left-[calc(33.333%+0.5px)]' 
                    : 'left-[calc(66.666%+0.5px)]'
                }`}
              />
              <button
                onClick={() => setTypeFilter('ALL')}
                className={`relative z-10 py-1 text-[11px] font-bold text-center rounded-md transition-colors duration-300 flex items-center justify-center ${
                  typeFilter === 'ALL'
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setTypeFilter('INCOME')}
                className={`relative z-10 py-1 text-[11px] font-bold text-center rounded-md transition-colors duration-300 flex items-center justify-center ${
                  typeFilter === 'INCOME'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                }`}
              >
                เงินเข้า
              </button>
              <button
                onClick={() => setTypeFilter('EXPENSE')}
                className={`relative z-10 py-1 text-[11px] font-bold text-center rounded-md transition-colors duration-300 flex items-center justify-center ${
                  typeFilter === 'EXPENSE'
                    ? 'text-orange-600 dark:text-[#ff9500]'
                    : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                }`}
              >
                รายจ่าย
              </button>
            </div>

            {/* Source Filter Segmented Control */}
            <div className="relative grid grid-cols-4 bg-gray-100/60 dark:bg-white/[0.03] p-0.5 rounded-lg w-full md:w-72 shrink-0 select-none border border-gray-200/20 dark:border-white/[0.03] h-9">
              <div 
                className={`absolute top-0.5 bottom-0.5 w-[calc(25%-4px)] bg-white dark:bg-[#2c2c2e] rounded-md shadow-sm border border-gray-200/20 dark:border-white/5 transition-all duration-300 ease-out ${
                  sourceFilter === 'ALL' 
                    ? 'left-0.5' 
                    : sourceFilter === 'PETTY_CASH' 
                    ? 'left-[calc(25%+0.5px)]' 
                    : sourceFilter === 'PERSONAL_CASH' 
                    ? 'left-[calc(50%+0.5px)]' 
                    : 'left-[calc(75%+0.5px)]'
                }`}
              />
              <button
                onClick={() => setSourceFilter('ALL')}
                className={`relative z-10 py-1 text-[11px] font-bold text-center rounded-md transition-colors duration-300 flex items-center justify-center ${
                  sourceFilter === 'ALL'
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setSourceFilter('PETTY_CASH')}
                className={`relative z-10 py-1 text-[11px] font-bold text-center rounded-md transition-colors duration-300 flex items-center justify-center ${
                  sourceFilter === 'PETTY_CASH'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                }`}
              >
                กองกลาง
              </button>
              <button
                onClick={() => setSourceFilter('PERSONAL_CASH')}
                className={`relative z-10 py-1 text-[11px] font-bold text-center rounded-md transition-colors duration-300 flex items-center justify-center ${
                  sourceFilter === 'PERSONAL_CASH'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                }`}
              >
                สำรองจ่าย
              </button>
              <button
                onClick={() => setSourceFilter('SPLIT')}
                className={`relative z-10 py-1 text-[11px] font-bold text-center rounded-md transition-colors duration-300 flex items-center justify-center ${
                  sourceFilter === 'SPLIT'
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                }`}
              >
                แบบผสม
              </button>
            </div>
          </div>

          {/* Date range pickers */}
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full xl:w-auto flex-shrink-0">
            <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
              <span className="text-[10px] text-gray-400 font-semibold w-7 sm:hidden shrink-0">จาก</span>
              <input
                type="date"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setSelectedMonth('CUSTOM'); }}
                className="w-full sm:w-28 px-2 py-1.5 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 rounded-xl text-[11px] outline-none focus:border-[#0071e3] text-[#1d1d1f] dark:text-white shadow-sm"
              />
            </div>
            <span className="hidden sm:inline text-gray-400 text-[10px] font-semibold shrink-0">ถึง</span>
            <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
              <span className="text-[10px] text-gray-400 font-semibold w-7 sm:hidden shrink-0">ถึง</span>
              <input
                type="date"
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setSelectedMonth('CUSTOM'); }}
                className="w-full sm:w-28 px-2 py-1.5 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 rounded-xl text-[11px] outline-none focus:border-[#0071e3] text-[#1d1d1f] dark:text-white shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Clear Filters Helper */}
        {(searchTerm || typeFilter !== 'ALL' || sourceFilter !== 'ALL' || startDate || endDate) && (
          <button
            onClick={() => { setSearchTerm(''); setTypeFilter('ALL'); setSourceFilter('ALL'); setStartDate(''); setEndDate(''); setSelectedMonth('CUSTOM'); }}
            className="text-xs text-blue-500 hover:text-blue-600 font-bold flex items-center gap-1 mt-1 pl-1"
          >
            <RefreshCw className="w-3 h-3" /> ล้างตัวกรองทั้งหมด
          </button>
        )}

        {/* Transactions list */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#0071e3]" />
            <p className="text-sm font-medium">กำลังประมวลผลข้อมูลการเงิน...</p>
          </div>
        ) : (() => {
          const { prevMonth, nextMonth } = getPrevAndNextMonths();
          return selectedMonth === 'CUSTOM' ? (
            renderMonthPanel('CUSTOM')
          ) : (
            <div 
              ref={carouselContainerRef} 
              className="relative overflow-hidden w-full cursor-grab active:cursor-grabbing"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              <div 
                ref={swipeContentRef}
                className={`carousel-track ${getCarouselTransitionClass()}`}
                style={{
                  transform: getCarouselTransformStyle(),
                  willChange: isDragging || carouselState !== 'idle' ? 'transform' : undefined
                }}
              >
                {/* Panel 1: Previous Month */}
                <div className="carousel-panel">
                  {prevMonth || overridePrevMonth ? renderMonthPanel(overridePrevMonth || prevMonth!) : (
                    <div className="py-12 text-center text-gray-400 italic">ไม่มีข้อมูลเดือนก่อนหน้า</div>
                  )}
                </div>

                {/* Panel 2: Selected Month */}
                <div className="carousel-panel">
                  {renderMonthPanel(selectedMonth)}
                </div>

                {/* Panel 3: Next Month */}
                <div className="carousel-panel">
                  {nextMonth || overrideNextMonth ? renderMonthPanel(overrideNextMonth || nextMonth!) : (
                    <div className="py-12 text-center text-gray-400 italic">ไม่มีข้อมูลเดือนถัดไป</div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
        </>
      ) : activeTab === 'dashboard' ? (
        renderDashboard()
      ) : activeTab === 'reimbursements' ? (
        renderReimbursements()
      ) : (
        renderAuditTab()
      )}

      {/* Transaction Entry/Edit Modal popup */}
      {showModal && (
        <TransactionModal
          onClose={() => { setShowModal(false); setSelectedTx(undefined); }}
          onSave={() => { setShowModal(false); setSelectedTx(undefined); fetchData(); }}
          transaction={selectedTx}
        />
      )}

      {/* Cash Audit Modal popup */}
      {showAuditModal && (
        <CashAuditModal
          isOpen={showAuditModal}
          onClose={() => setShowAuditModal(false)}
          currentBalance={summary.pettyCashBalance}
          onSave={fetchData}
        />
      )}

      {/* Lightbox for viewing Receipt */}
      {activeReceiptUrl && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setActiveReceiptUrl(null)}
        >
          <div 
            className="relative max-w-3xl w-full max-h-[90vh] bg-white dark:bg-[#1c1c1e] rounded-3xl overflow-hidden shadow-2xl p-2 flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveReceiptUrl(null)}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-full overflow-auto flex justify-center p-4 mt-8">
              <img src={activeReceiptUrl} alt="Receipt Full size" className="max-w-full max-h-[70vh] object-contain rounded-xl" />
            </div>
            <div className="pb-4 pt-2 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">รูปภาพหลักฐานการทำรายการการเงิน</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
