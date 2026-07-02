
import { RMA } from '../types';

/**
 * Validation สำหรับข้อมูล RMA ก่อนบันทึกลง Firestore
 * ป้องกันข้อมูลเสีย (corrupt data) จากการส่งข้อมูลไม่ครบ
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate ข้อมูลก่อนสร้าง RMA ใหม่ */
export function validateNewRMA(data: Partial<RMA>): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!data.customerName?.trim()) errors.push('กรุณาระบุชื่อลูกค้า');
  if (!data.brand?.trim()) errors.push('กรุณาระบุยี่ห้อสินค้า');
  if (!data.productModel?.trim()) errors.push('กรุณาระบุรุ่นสินค้า');
  if (!data.serialNumber?.trim()) errors.push('กรุณาระบุ Serial Number');
  if (!data.issueDescription?.trim()) errors.push('กรุณาระบุอาการเสีย');

  // Serial Number format check (basic)
  if (data.serialNumber && data.serialNumber.trim().length < 3) {
    errors.push('Serial Number ต้องมีอย่างน้อย 3 ตัวอักษร');
  }

  // Email format (if provided)
  if (data.customerEmail && data.customerEmail.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.customerEmail.trim())) {
      errors.push('รูปแบบอีเมลไม่ถูกต้อง');
    }
  }

  // Phone format (if provided)
  if (data.customerPhone && data.customerPhone.trim()) {
    const cleaned = data.customerPhone.replace(/[\s-]/g, '');
    if (cleaned.length < 9 || cleaned.length > 15) {
      errors.push('เบอร์โทรศัพท์ต้องมี 9-15 หลัก');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/** Validate ข้อมูลก่อนอัพเดต RMA */
export function validateRMAUpdate(updates: Partial<RMA>): ValidationResult {
  const errors: string[] = [];

  // Serial Number (if being updated)
  if (updates.serialNumber !== undefined && (!updates.serialNumber || updates.serialNumber.trim().length < 3)) {
    errors.push('Serial Number ต้องมีอย่างน้อย 3 ตัวอักษร');
  }

  // Email format (if being updated)
  if (updates.customerEmail !== undefined && updates.customerEmail.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(updates.customerEmail.trim())) {
      errors.push('รูปแบบอีเมลไม่ถูกต้อง');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
