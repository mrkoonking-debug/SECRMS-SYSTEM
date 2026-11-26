
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Loader2, Save } from 'lucide-react';
import { Team } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { MockDb } from '../services/mockDb';
import { ProductEntryForm } from '../components/ProductEntryForm';
import { showValidationError, scrollAppToTop } from '../services/toast';

const getInputClass = (hasError: boolean) => `
  w-full px-3.5 py-2.5 text-xs md:text-sm rounded-xl outline-none transition-all
  bg-slate-50 dark:bg-[#1a1d24]
  border border-slate-200 dark:border-white/[0.08]
  text-slate-900 dark:text-white
  placeholder-slate-400 dark:placeholder-slate-500
  focus:bg-white dark:focus:bg-[#1f232b]
  focus:ring-2 focus:ring-[#0071e3]/25 focus:border-[#0071e3]
  ${hasError ? 'border-red-500 focus:ring-red-500/20 ring-2 ring-red-500/20' : ''}
`;

export const SubmitClaim: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [customer, setCustomer] = useState({ quotationNumber: '', name: '', contactPerson: '', phone: '', email: '', lineId: '', returnAddress: '' });
  const [basket, setBasket] = useState<any[]>([]);
  const [hasProductDraft, setHasProductDraft] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [submittedRef, setSubmittedRef] = useState('');

  const handleAddItem = (item: any) => setBasket(prev => [...prev, { ...item, id: Date.now().toString() + Math.random().toString(36).slice(2, 6), attachments: item.attachments || [] }]);
  const handleRemoveItem = (id: string) => setBasket(prev => prev.filter(item => item.id !== id));

  const validateField = (name: string, value: any) => {
    let error = '';
    if (typeof value === 'string' && !value.trim()) {
      if (['name', 'contactPerson', 'phone'].includes(name)) error = t('validation.required');
    }
    return error;
  };

  const handleBlur = (field: string, value: any) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(prev => ({ ...prev, [field]: validateField(field, value) }));
  };

  const formatAccessory = (acc: string) => {
    if (acc.startsWith('acc_hdd::')) return `HDD (${acc.split('::')[1]})`;
    if (acc.startsWith('acc_')) return t(`accessories_list.${acc}`);
    return acc;
  };

  const handleSubmitAll = async () => {
    const newErrors: Record<string, string> = {};

    if (!customer.name) newErrors.name = t('validation.nameRequired');
    if (!customer.contactPerson) newErrors.contactPerson = t('validation.required');
    if (!customer.phone) newErrors.phone = t('validation.phoneRequired');
    if (Object.keys(newErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...newErrors }));
      setTouched(prev => ({ ...prev, name: true, contactPerson: true, phone: true }));
      // แจ้ง popup ใหญ่บอกว่าผิดตรงไหน
      const missingFields: string[] = [];
      if (newErrors.name) missingFields.push('ชื่อลูกค้า / บริษัท');
      if (newErrors.contactPerson) missingFields.push('ชื่อผู้ติดต่อ');
      if (newErrors.phone) missingFields.push('เบอร์โทรศัพท์');
      showValidationError(missingFields);
      return;
    }
    if (basket.length === 0) {
      showValidationError(
        [
          hasProductDraft
            ? 'คุณกรอกข้อมูลสินค้าไว้ในส่วนที่ 2 แล้ว แต่ยังไม่ได้กดปุ่ม "เพิ่มรายการเข้า Job"'
            : 'ยังไม่ได้เพิ่มสินค้า — กรุณาเพิ่มอย่างน้อย 1 รายการ'
        ],
        'ยังไม่มีสินค้าในรายการ'
      );
      return;
    }

    setIsSubmitting(true);
    const groupRequestId = await MockDb.generateNextGroupRequestId();
    let firstId = '';

    try {
      const promises = basket.map(async (item, i) => {
        const rmaData = {
          groupRequestId,
          quotationNumber: customer.quotationNumber,
          customerName: customer.name,
          contactPerson: customer.contactPerson,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          customerLineId: customer.lineId,
          customerReturnAddress: customer.returnAddress,
          brand: item.brand,
          productModel: item.model,
          serialNumber: item.serial,
          productType: item.type,
          distributor: item.distributor,
          accessories: item.accessories,
          issueDescription: item.issue,
          team: item.team as Team,
          attachments: item.attachments || [],
          createdBy: MockDb.getCurrentUser()?.name || 'Admin',
          creatorEmail: MockDb.getCurrentUser()?.email || ''
        };

        const newRMA = await MockDb.addRMA(rmaData);
        if (i === 0) firstId = newRMA.id;
      });
      await Promise.all(promises);

      if (firstId) {
        setSubmittedRef(groupRequestId);
        setStep('success');
        scrollAppToTop();
      } else {
        navigate('/admin/rmas');
      }
    } catch (error) {
      console.error("Failed to save rmas:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 md:py-6 px-3 sm:px-4 md:px-6 pb-28 md:pb-8">
      {step === 'success' ? (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
          <div className="bg-white dark:bg-[#16181d] rounded-2xl p-6 sm:p-10 md:p-12 max-w-xl w-full shadow-lg border border-slate-200/80 dark:border-white/[0.08]">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Save className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-2">{t('submit.successTitle') || 'Submission Successful'}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">{t('submit.successDesc') || 'The rma has been registered successfully.'}</p>

            <div className="bg-slate-50 dark:bg-[#1a1d24] p-5 rounded-xl border border-slate-200/80 dark:border-white/10 mb-6">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('publicSubmit.yourRef')}</div>
              <div className="text-3xl font-mono font-extrabold text-[#0071e3] dark:text-blue-400 break-all">{submittedRef}</div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={() => navigate('/admin/rmas')}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-900 dark:text-white rounded-xl font-semibold text-sm transition-all cursor-pointer"
              >
                {t('submit.backToList') || 'Back to List'}
              </button>
              <button
                onClick={() => {
                  setStep('form');
                  setBasket([]);
                  setCustomer({ quotationNumber: '', name: '', contactPerson: '', phone: '', email: '', lineId: '', returnAddress: '' });
                  setSubmittedRef('');
                  setTouched({});
                  scrollAppToTop();
                }}
                className="px-6 py-3 bg-[#0071e3] hover:bg-[#0062c4] text-white rounded-xl font-semibold text-sm shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                {t('submit.registerNew') || 'Register New Claim'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Page Title & Items Counter Header */}
          <div className="flex items-center justify-between gap-4 mb-6 md:mb-8 px-1">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#1d1d1f] dark:text-white tracking-tight mb-1">{t('submit.title')}</h1>
              <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">{t('submit.subtitle')}</p>
            </div>
            {basket.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/[0.04] dark:bg-black/40 border border-black/5 dark:border-white/10 apple-card-sm text-right">
                <span className="text-2xl md:text-3xl font-black text-[#0071e3] dark:text-blue-400">{basket.length}</span>
                <span className="text-[10px] md:text-xs text-gray-500 font-bold uppercase">{t('submit.itemsInJob')}</span>
              </div>
            )}
          </div>

          {/* Section 1: Customer Details */}
          <div className="bg-white dark:bg-[#16161a] apple-liquid-glass rounded-[28px] sm:rounded-[34px] p-5 sm:p-7 md:p-8 mb-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-[#0071e3] text-white flex items-center justify-center text-xs font-extrabold flex-shrink-0 shadow-md shadow-blue-500/30">
                1
              </div>
              <h2 className="font-extrabold text-base md:text-xl text-[#1d1d1f] dark:text-white tracking-tight">
                {t('submit.customerDetails')}
              </h2>
            </div>

            {/* Row 1: Quotation (Ref) & Company Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-4 md:mb-5">
              <div>
                <label className="block text-[10.5px] md:text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-2">{t('publicSubmit.quotationNo')}</label>
                <input
                  value={customer.quotationNumber}
                  onChange={e => setCustomer({ ...customer, quotationNumber: e.target.value })}
                  onBlur={() => handleBlur('quotationNumber', customer.quotationNumber)}
                  type="text"
                  className={getInputClass(!!errors.quotationNumber)}
                  placeholder="SECXXXXXX หรือ INVXXXXXX"
                />
                {errors.quotationNumber && touched.quotationNumber && <p className="text-red-500 text-xs mt-1.5 ml-3 font-medium">{errors.quotationNumber}</p>}
              </div>
              <div>
                <label className="block text-[10.5px] md:text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-2">{t('publicSubmit.companyName')} <span className="text-red-500 font-bold">*</span></label>
                <input
                  value={customer.name}
                  onChange={e => setCustomer({ ...customer, name: e.target.value })}
                  onBlur={() => handleBlur('name', customer.name)}
                  type="text"
                  className={getInputClass(!!errors.name)}
                  placeholder={t('placeholders.name')}
                />
                {errors.name && touched.name && <p className="text-red-500 text-xs mt-1.5 ml-3 font-medium">{errors.name}</p>}
              </div>
            </div>

            {/* Row 2: Contact Person & Phone Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-4 md:mb-5">
              <div>
                <label className="block text-[10.5px] md:text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-2">{t('publicSubmit.contactName')} <span className="text-red-500 font-bold">*</span></label>
                <input
                  value={customer.contactPerson}
                  onChange={e => setCustomer({ ...customer, contactPerson: e.target.value })}
                  onBlur={() => handleBlur('contactPerson', customer.contactPerson)}
                  type="text"
                  className={getInputClass(!!errors.contactPerson)}
                  placeholder={t('publicSubmit.contactPlaceholder')}
                />
                {errors.contactPerson && touched.contactPerson && <p className="text-red-500 text-xs mt-1.5 ml-3 font-medium">{errors.contactPerson}</p>}
              </div>
              <div>
                <label className="block text-[10.5px] md:text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-2">{t('publicSubmit.phone')} <span className="text-red-500 font-bold">*</span></label>
                <input
                  value={customer.phone}
                  onChange={e => setCustomer({ ...customer, phone: e.target.value })}
                  onBlur={() => handleBlur('phone', customer.phone)}
                  type="text"
                  className={getInputClass(!!errors.phone)}
                  placeholder={t('publicSubmit.phonePlaceholder')}
                />
                {errors.phone && touched.phone && <p className="text-red-500 text-xs mt-1.5 ml-3 font-medium">{errors.phone}</p>}
              </div>
            </div>

            {/* Row 3: LINE ID & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-4 md:mb-5">
              <div>
                <label className="block text-[10.5px] md:text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-2">{t('submit.lineId')}</label>
                <input
                  value={customer.lineId}
                  onChange={e => setCustomer({ ...customer, lineId: e.target.value })}
                  type="text"
                  className={getInputClass(false)}
                  placeholder={t('placeholders.lineId')}
                />
              </div>
              <div>
                <label className="block text-[10.5px] md:text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-2">Email (Optional)</label>
                <input
                  value={customer.email}
                  onChange={e => setCustomer({ ...customer, email: e.target.value })}
                  type="text"
                  className={getInputClass(false)}
                  placeholder={t('placeholders.emailOrPhone')}
                />
              </div>
            </div>

            {/* Row 4: Return Address */}
            <div className="grid grid-cols-1 gap-4 md:gap-5">
              <div>
                <label className="block text-[10.5px] md:text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-2">{t('submit.returnAddress')}</label>
                  <textarea
                  value={customer.returnAddress}
                  onChange={e => setCustomer({ ...customer, returnAddress: e.target.value })}
                  rows={2}
                  className={getInputClass(false)}
                  placeholder={t('placeholders.shippingAddress')}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Add Item */}
          <div className="bg-white dark:bg-[#16161a] apple-liquid-glass rounded-[28px] sm:rounded-[34px] p-5 sm:p-7 md:p-8 mb-6 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-[#0071e3] text-white flex items-center justify-center text-xs font-extrabold flex-shrink-0 shadow-md shadow-blue-500/30">
                2
              </div>
              <h2 className="font-extrabold text-base md:text-xl text-[#1d1d1f] dark:text-white tracking-tight">
                {t('submit.addItem')}
              </h2>
            </div>
            <ProductEntryForm mode="admin" onAddItem={handleAddItem} onDraftChange={setHasProductDraft} />
          </div>

          {/* Section 3: Items in Job Basket */}
          {basket.length > 0 && (
            <div className="bg-white dark:bg-[#16161a] apple-liquid-glass rounded-[28px] sm:rounded-[34px] p-5 sm:p-7 md:p-8 mb-8 animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#34c759] text-white flex items-center justify-center text-xs font-extrabold flex-shrink-0 shadow-md shadow-emerald-500/30">
                    3
                  </div>
                  <h2 className="font-extrabold text-base md:text-xl text-[#1d1d1f] dark:text-white tracking-tight">
                    {t('submit.itemsInJob')} ({basket.length})
                  </h2>
                </div>
                <button
                  onClick={() => setBasket([])}
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold text-red-500 hover:text-white hover:bg-red-500 transition-all cursor-pointer"
                >
                  ล้างรายการทั้งหมด
                </button>
              </div>

              <div className="space-y-3">
                {basket.map((item, idx) => (
                  <div key={item.id} className="p-4 bg-gray-50/70 dark:bg-white/[0.03] apple-card-inner rounded-[20px] md:rounded-[24px] border border-gray-200/60 dark:border-white/[0.06] hover:border-blue-500/30 transition-all flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-full bg-blue-500/10 text-[#0071e3] flex items-center justify-center text-xs font-extrabold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-sm md:text-base text-[#1d1d1f] dark:text-white leading-snug">
                          {item.brand} {item.model}
                        </div>
                        <div className="text-xs text-gray-500 font-mono font-medium my-0.5">
                          S/N: {item.serial}
                        </div>
                        <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mb-2 leading-relaxed">
                          {item.issue}
                        </div>
                        {item.accessories.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            {item.accessories.map((acc: string) => (
                              <span key={acc} className="text-[10px] font-medium px-2.5 py-0.5 bg-black/5 dark:bg-white/[0.06] rounded-full text-gray-600 dark:text-gray-300 border border-black/5 dark:border-white/5">
                                {formatAccessory(acc)}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.attachments && item.attachments.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 my-1.5">
                            {item.attachments.map((att: any, aIdx: number) => (
                              <img key={att.id || aIdx} src={att.previewUrl} alt={att.fileName || 'Photo'} className="w-10 h-10 rounded-xl object-cover border border-gray-200/80 dark:border-white/10" />
                            ))}
                            <span className="text-[11px] text-gray-500 font-medium">แนบรูป {item.attachments.length} รูป</span>
                          </div>
                        )}
                        <div className="text-[10.5px] text-gray-400 font-medium mt-1">
                          ศูนย์: {item.distributor || '-'} · ทีม: {item.team || '-'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all cursor-pointer"
                      title="ลบรายการนี้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {hasProductDraft && (
                <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 font-medium">
                  💡 คุณกรอกข้อมูลสินค้าไว้ในส่วนที่ 2 ค้างอยู่ หากต้องการส่งชิ้นนั้นด้วย กรุณากดปุ่ม &quot;เพิ่มรายการเข้า Job&quot; ก่อนกดบันทึก
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/5">
                <button
                  onClick={handleSubmitAll}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-[#0071e3] hover:bg-[#0077ed] disabled:bg-gray-400 text-white rounded-full font-extrabold text-base md:text-lg shadow-xl shadow-blue-500/25 transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('submit.submitting')}
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {t('submit.submitJob')}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
