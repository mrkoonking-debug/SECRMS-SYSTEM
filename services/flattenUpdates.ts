
import { RMA } from '../types';

/**
 * Flatten nested RMA updates to dot notation
 * ป้องกัน Firestore overwrite nested objects ทั้งก้อน
 * 
 * เช่น { resolution: { rootCause: 'ไฟกระชาก' } }
 * จะถูก flatten เป็น { "resolution.rootCause": "ไฟกระชาก" }
 * แทนที่จะเขียนทับ resolution ทั้ง object
 */
export function flattenRMAUpdates(updates: Partial<RMA>): Record<string, any> {
  const flat: Record<string, any> = {};

  // Top-level fields — copy directly
  const topLevelFields: (keyof RMA)[] = [
    'brand', 'productModel', 'serialNumber', 'distributor',
    'issueDescription', 'customerName', 'customerEmail',
    'customerPhone', 'customerLineId', 'customerAddress',
    'customerReturnAddress', 'contactPerson', 'productType',
    'serviceType', 'delayReason', 'notes', 'status', 'team',
    'lineAccount', 'deviceUsername', 'devicePassword',
    'groupRequestId', 'quotationNumber', 'createdBy'
  ];

  for (const field of topLevelFields) {
    if (updates[field] !== undefined) {
      flat[field] = updates[field];
    }
  }

  // Arrays — copy directly
  if (updates.accessories !== undefined) flat.accessories = updates.accessories;
  if (updates.distributorSentItems !== undefined) flat.distributorSentItems = updates.distributorSentItems;
  if (updates.trackingIds !== undefined) flat.trackingIds = updates.trackingIds;
  if (updates.customerTrackingIds !== undefined) flat.customerTrackingIds = updates.customerTrackingIds;
  if (updates.attachments !== undefined) flat.attachments = updates.attachments;

  // Nested: resolution — flatten to dot notation
  if (updates.resolution) {
    const r = updates.resolution;
    if (r.actionTaken !== undefined) flat["resolution.actionTaken"] = r.actionTaken;
    if (r.actionDetails !== undefined) flat["resolution.actionDetails"] = r.actionDetails;
    if (r.rootCause !== undefined) flat["resolution.rootCause"] = r.rootCause;
    if (r.technicalNotes !== undefined) flat["resolution.technicalNotes"] = r.technicalNotes;
    if (r.vendorTicketRef !== undefined) flat["resolution.vendorTicketRef"] = r.vendorTicketRef;
    if (r.replacedSerialNumber !== undefined) flat["resolution.replacedSerialNumber"] = r.replacedSerialNumber;
    if (r.restockCondition !== undefined) flat["resolution.restockCondition"] = r.restockCondition;
  }

  // Nested: repairCosts — flatten to dot notation
  if (updates.repairCosts) {
    const rc = updates.repairCosts;
    if (rc.warrantyStatus !== undefined) flat["repairCosts.warrantyStatus"] = rc.warrantyStatus;
    if (rc.labor !== undefined) flat["repairCosts.labor"] = rc.labor;
    if (rc.parts !== undefined) flat["repairCosts.parts"] = rc.parts;
  }

  return flat;
}
