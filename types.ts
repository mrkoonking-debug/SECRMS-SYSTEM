
// ==========================================
// ไฟล์กำหนดโครงสร้างข้อมูล (Types & Interfaces)
// เปรียบเสมือน "พิมพ์เขียว" ว่าข้อมูลแต่ละก้อนต้องมีหน้าตาอย่างไร
// ==========================================

// 1. สถานะของงานเคลม (Enum) - ใช้กำหนดค่าคงที่เพื่อป้องกันการพิมพ์ผิด
export enum RMAStatus {
  PENDING = 'PENDING',             // รอดำเนินการ (เพิ่งรับของมา)
  DIAGNOSING = 'DIAGNOSING',       // กำลังตรวจเช็ค/วิเคราะห์อาการ
  WAITING_PARTS = 'WAITING_PARTS', // รออะไหล่มาส่ง
  REPLACED_FROM_STOCK = 'REPLACED_FROM_STOCK', // เบิกของในสต๊อกให้ลูกค้าแล้ว (รอของจากศูนย์)
  REPAIRED = 'REPAIRED',           // ซ่อมเสร็จแล้ว พร้อมคืน
  REJECTED = 'REJECTED',           // ปฏิเสธการเคลม (เช่น ผิดเงื่อนไข)
  CLOSED = 'CLOSED',               // ปิดงานสมบูรณ์ (ลูกค้าได้รับของแล้ว)
  RETURNED_FROM_VENDOR = 'RETURNED_FROM_VENDOR', // ของเคลมกลับมาเข้าคลังแล้ว (จบงาน Advance Replacement)
  CANCELLED = 'CANCELLED'          // ยกเลิกรายการ (เช่น คีย์ข้อมูลผิด)
}

// 2. ประเภทสินค้า (Enum)
export enum ProductType {
  CCTV_CAMERA = 'CCTV_CAMERA',     // กล้องวงจรปิด
  NVR_DVR = 'NVR_DVR',             // เครื่องบันทึกภาพ
  NETWORK_SWITCH = 'NETWORK_SWITCH',// สวิตช์เน็ตเวิร์ค
  ROUTER_FIREWALL = 'ROUTER_FIREWALL', // เราเตอร์/ไฟร์วอลล์
  ACCESS_CONTROL = 'ACCESS_CONTROL',   // ระบบสแกนนิ้ว/หน้า
  OTHER = 'OTHER'                  // อื่นๆ
}

// 3. ทีมช่างที่รับผิดชอบ (Enum) - แบ่งตามแบรนด์หรือกลุ่มสินค้า
export enum Team {
  HIKVISION = 'HIKVISION', // ทีม A: ดูแลแบรนด์ Hikvision
  DAHUA = 'DAHUA',         // ทีม B: ดูแลแบรนด์ Dahua
  TEAM_C = 'TEAM_C',       // ทีม C: Network & UNV (กลุ่มหลัก)
  TEAM_E = 'TEAM_E',       // ทีม E: UPS (เครื่องสำรองไฟ)
  TEAM_G = 'TEAM_G'        // ทีม G: ขายออนไลน์ (Shopee/Lazada)
}

// 4. โครงสร้างข้อมูลไฟล์แนบ (รูปภาพ/วิดีโอ)
export interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  previewUrl?: string; // URL สำหรับแสดงตัวอย่างรูป
}

// 5. โครงสร้างข้อมูลประวัติ (Timeline) - เก็บ Log การทำงาน
export interface TimelineEvent {
  id: string;
  date: string;        // วันที่และเวลาที่เกิดเหตุการณ์
  type: 'STATUS_CHANGE' | 'NOTE' | 'SYSTEM' | 'CUSTOMER_ACTION'; // ประเภท: เปลี่ยนสถานะ, จดบันทึก, ระบบ, ลูกค้าทำเอง
  description: string; // รายละเอียดเหตุการณ์
  user: string;        // ใครเป็นคนทำ (เช่น Admin, System)
}

// 6. รายละเอียดการซ่อม (Resolution)
export interface ResolutionDetails {
  actionTaken: string;     // ทำอะไรไปบ้าง (เช่น เปลี่ยน Mainboard)
  rootCause: string;       // สาเหตุที่เสีย (เช่น ไฟกระชาก, มดเข้า)
  vendorTicketRef?: string;// เลขใบงานของศูนย์นอก (ถ้าส่งต่อ Synnex/SIS)
  technicalNotes: string;  // บันทึกเชิงเทคนิคสำหรับช่างด้วยกัน
  replacedSerialNumber?: string; // *** NEW: S/N ใหม่กรณีเปลี่ยนตัว ***
  actionDetails?: string;  // รายละเอียดการดำเนินการ เช่น "เปลี่ยน Mainboard"
  restockCondition?: 'NEW' | 'REFURBISHED'; // *** NEW: สภาพสินค้าที่ส่งกลับมาเข้าคลัง ***
}

// 7. สาเหตุความล่าช้า (Enum)
export type DelayReason = 'NONE' | 'WAITING_PARTS' | 'WAITING_DISTRIBUTOR' | 'WAITING_CUSTOMER' | 'INTERNAL_QUEUE';

// *** 9. โครงสร้างหลักของใบเคลม (Main RMA Interface) ***
// นี่คือ Object ที่ใช้เก็บข้อมูลงานเคลม 1 งาน
export interface RMA {
  id: string;               // รหัสอ้างอิงงานเคลม (Primary Key) เช่น RMA-12345
  groupRequestId?: string;  // รหัสกลุ่มงาน (กรณีลูกค้าส่งมา 10 ตัวในบิลเดียว จะใช้เลขนี้เชื่อมกัน)
  quotationNumber?: string; // เลขที่ใบเสนอราคา (SEC...) *สำคัญมาก*

  // ข้อมูลลูกค้า
  customerName: string;
  contactPerson?: string; // *** NEW: ชื่อผู้ติดต่อ (แยกจากชื่อบริษัท) ***
  customerEmail: string;
  customerPhone?: string;
  customerLineId?: string;
  customerAddress?: string;       // ที่อยู่ลูกค้า
  customerReturnAddress?: string; // ที่อยู่สำหรับส่งของคืน
  trackingIds?: string[]; // Array of tracking IDs for multi-box shipments (Distributor)
  customerTrackingIds?: string[]; // Array of tracking IDs for customer return shipments
  createdBy?: string;             // ใครเป็นคนสร้างรายการนี้ (Admin คนไหน)

  // ข้อมูลสินค้า
  brand: string;           // ยี่ห้อ
  productModel: string;    // รุ่น
  serialNumber: string;    // S/N (หัวใจสำคัญของการเคลม)
  productType: ProductType;// ประเภท
  distributor: string;     // ผู้นำเข้า (Synnex, SIS...) เอาไว้ส่งเคลมต่อ
  accessories: string[];   // ของที่ลูกค้าฝากมาด้วย (กล่อง, สายไฟ, เมาส์)
  distributorSentItems?: string[]; // ของที่เราส่งต่อให้ Vendor (เช่น ส่งแค่ตัวเครื่อง ไม่ส่งสายไฟ)
  attachments?: Attachment[]; // รูปภาพหลักฐาน

  issueDescription: string; // อาการเสียที่ลูกค้าแจ้งมา
  deviceUsername?: string;   // Username อุปกรณ์ (ถ้ามี)
  devicePassword?: string;   // Password อุปกรณ์ (ถ้ามี)
  status: RMAStatus;      // สถานะปัจจุบันของงาน
  team: Team;               // ทีมไหนรับผิดชอบ
  lineAccount?: string;     // LINE@ ที่ลูกค้าซื้อจาก (e.g. 'hikcctv', 'dahuacctv')

  // เวลา (Timestamp)
  createdAt: string;  // วันที่สร้างรายการ
  updatedAt: string;  // วันที่แก้ไขล่าสุด
  resolvedAt?: string;// วันที่ปิดงาน (เอาไว้คำนวณเวลาทำงานเฉลี่ย)

  history: TimelineEvent[]; // ประวัติการทำงานทั้งหมด (Array)

  // ข้อมูลการดำเนินการ
  notes?: string;        // *** NEW: Internal Notes (บันทึกข้อความ) ***
  serviceType?: 'INTERNAL' | 'EXTERNAL'; // ซ่อมเอง (Internal) หรือ ส่งศูนย์นอก (External)
  resolution?: ResolutionDetails;        // ผลสรุปการซ่อม
  delayReason?: DelayReason;             // สาเหตุที่งานช้า

  // ข้อมูลค่าใช้จ่ายและการรับประกัน
  repairCosts?: {
    labor: number; // ค่าแรง
    parts: number; // ค่าอะไหล่
    warrantyStatus: 'IN_WARRANTY' | 'OUT_OF_WARRANTY' | 'VOID'; // สถานะประกัน
  };

  // Soft Delete Support
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;

  // Email Notifications
  creatorEmail?: string;
  overdueEmailSent?: boolean;
}

// 10. โครงสร้างข้อมูลสำหรับ Dashboard (สถิติรวม)
export interface DashboardStats {
  totalRMAs: number;      // งานทั้งหมดในระบบ
  pendingRMAs: number;    // งานที่ยังค้างอยู่
  resolvedThisMonth: number;// งานที่จบได้ในเดือนนี้
  criticalIssues: number;   // งานวิกฤต/ล่าช้า

  revenuePipeline: number;    // มูลค่ารายได้คาดการณ์ (ค่าแรง+ค่าของ)
  avgTurnaroundHours: number; // เวลาเฉลี่ยที่ใช้ปิดงาน (ชม.)
  overdueCount: number;       // จำนวนงานที่เกินกำหนด (>7วัน)
  agingBuckets: {             // การกระจายตัวของอายุงาน (ใช้พล็อตกราฟ)
    bucket0_7: number;        // 0-7 วัน
    bucket8_15: number;       // 8-15 วัน
    bucket15plus: number;     // มากกว่า 15 วัน
  };
  statusCounts: {             // จำนวนงานแยกตามสถานะ
    pending: number;
    diagnosing: number;
    waitingParts: number;
    replacedFromStock: number;
    repaired: number;
    closed: number;
    returnedFromVendor: number;
    cancelled?: number;
  };
  urgentRMAs: RMA[];      // รายการงานด่วนที่ต้องรีบดู
}

// 11. แบรนด์และผู้นำเข้า (Dynamic Management)
export interface Brand {
  id: string;
  value: string;
  label: string;
}

export interface Distributor {
  id: string;
  value: string;
  label: string;
  address?: string;        // ที่อยู่สำหรับส่งเคลม
  contactPerson?: string;  // ชื่อผู้ติดต่อ
  phone?: string;          // เบอร์โทรติดต่อ
}

// ===== FINANCE MODULE (แยกขาดจาก RMA) =====

export interface PettyCashTransaction {
  id: string;
  date: string;                    // YYYY-MM-DD
  time?: string;                   // HH:MM
  type: 'INCOME' | 'EXPENSE';
  amount: number;                  // จำนวนเงิน (บาท)
  description: string;             // เช่น "ค่าส่งปลายทาง Hikvision"
  category?: string;               // หมวดหมู่ เช่น 'ค่าขนส่ง', 'ค่าบรรจุภัณฑ์', 'เติมเงินกองกลาง'
  paidBy: 'PETTY_CASH' | 'PERSONAL_CASH' | 'PERSONAL_TRANSFER';
  staffName: string;               // ใครเป็นคนจ่าย/รับเงิน
  isReimbursed: boolean;           // สำรองจ่าย → คืนเงินแล้วหรือยัง?
  reimbursedAt?: string;
  reimbursedBy?: string;           // ใครเป็นคนอนุมัติคืน
  receiptUrl?: string;             // รูปใบเสร็จ/สลิป (ถ้ามี)
  note?: string;                   // หมายเหตุเพิ่มเติม
  refRmaId?: string;               // รหัส RMA ที่เกี่ยวข้อง (Optional)
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PettyCashSummary {
  pettyCashBalance: number;        // Current cash in the common box
  totalPersonalAdvance: number;    // Unreimbursed personal advances (to be repaid)
  personalAdvanceByStaff: Record<string, number>; // Breakdown per employee
}

