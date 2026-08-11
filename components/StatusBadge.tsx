
import React from 'react';
import { RMAStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  status: RMAStatus;
  isOverdue?: boolean;
  isPublic?: boolean;
}

export const StatusBadge: React.FC<Props> = React.memo(({ status, isOverdue, isPublic }) => {
  const { t, language } = useLanguage();

  const getStyles = () => {
    if (isOverdue && ![RMAStatus.CLOSED, RMAStatus.REPAIRED, RMAStatus.REJECTED, RMAStatus.CANCELLED].includes(status)) {
      return 'bg-red-500 text-white shadow-md shadow-red-500/20';
    }

    switch (status) {
      case RMAStatus.PENDING:
        return 'bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-500/20';
      case RMAStatus.DIAGNOSING:
        return 'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-500/20';
      case RMAStatus.WAITING_PARTS:
        return 'bg-orange-50 text-orange-600 border border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-500/20';
      case RMAStatus.REPLACED_FROM_STOCK:
        return isPublic ? 'bg-green-500 text-white shadow-md shadow-green-500/20' : 'bg-purple-50 text-purple-600 border border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-500/20';
      case RMAStatus.RETURNED_FROM_VENDOR:
        return 'bg-teal-50 text-teal-600 border border-teal-100 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-500/20';
      case RMAStatus.REPAIRED:
      case RMAStatus.CLOSED:
        return 'bg-green-500 text-white shadow-md shadow-green-500/20';
      case RMAStatus.REJECTED:
        return 'bg-gray-800 text-white';
      case RMAStatus.CANCELLED:
        return 'bg-gray-100 text-gray-500 border border-gray-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/10 line-through';
      default:
        return 'bg-gray-100 text-[#86868b] dark:bg-white/10 dark:text-gray-300';
    }
  };

  const getLabel = () => {
    if (isPublic && language === 'th') {
      switch (status) {
        case RMAStatus.REPLACED_FROM_STOCK:
          return 'เปลี่ยนตัวใหม่เรียบร้อย';
        case RMAStatus.RETURNED_FROM_VENDOR:
          return 'เคลมเสร็จสิ้น';
        case RMAStatus.REPAIRED:
          return 'ซ่อมเสร็จสิ้น';
        case RMAStatus.CLOSED:
          return 'ส่งคืนสินค้าเรียบร้อย';
        case RMAStatus.WAITING_PARTS:
          return 'ส่งเคลมศูนย์แล้ว';
        case RMAStatus.DIAGNOSING:
          return 'กำลังตรวจสอบ';
        case RMAStatus.PENDING:
          return 'รับเรื่องแล้ว';
        case RMAStatus.REJECTED:
          return 'ปฏิเสธการเคลม';
        case RMAStatus.CANCELLED:
          return 'ยกเลิกรายการ';
      }
    } else if (isPublic && language === 'en') {
      switch (status) {
        case RMAStatus.REPLACED_FROM_STOCK:
          return 'Replaced with New Unit';
        case RMAStatus.RETURNED_FROM_VENDOR:
          return 'Claim Completed';
        case RMAStatus.REPAIRED:
          return 'Repaired & Ready';
        case RMAStatus.CLOSED:
          return 'Returned / Completed';
      }
    }
    return t(`status.${status}`);
  };

  return (
    <span className={`px-2 md:px-3 py-0.5 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-wider ${getStyles()}`}>
      {getLabel()}
    </span>
  );
});
