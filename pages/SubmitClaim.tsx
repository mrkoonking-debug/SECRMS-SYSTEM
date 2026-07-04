
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Loader2, Save } from 'lucide-react';
import { Team } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { MockDb } from '../services/mockDb';
import { ProductEntryForm } from '../components/ProductEntryForm';
import { showToast, showValidationError } from '../services/toast';

const getInputClass = (hasError: boolean) => `
  liquid-input w-full rounded-2xl px-4 py-3.5 text-sm
  text-[#1d1d1f] dark:text-white 
  bg-white dark:bg-[#2c2c2e]
  border border-gray-200 dark:border-[#424245]
  placeholder-gray-400 dark:placeholder-gray-500 
  ${hasError ? 'border-red-500 focus:ring-red-500' : ''}
`;

export const SubmitClaim: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [customer, setCustomer] = useState({ quotationNumber: '', name: '', contactPerson: '', phone: '', email: '', lineId: '', returnAddress: '' });
  const [basket, setBasket] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [submittedRef, setSubmittedRef] = useState('');

  const handleAddItem = (item: any) => setBasket(prev => [...prev, { ...item, id: Date.now().toString() + Math.random().toString(36).slice(2, 6), attachments: [] }]);
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
      showValidationError(['ยังไม่ได้เพิ่มสินค้า — กรุณาเพิ่มอย่างน้อย 1 รายการ'], 'ยังไม่มีสินค้าในรายการ');
      return;
    }

    setIsSubmitting(true);
    const groupRequestId = await MockDb.generateNextGroupRequestId();
    let firstId = '';

    try {
      for (let i = 0; i < basket.length; i++) {
        const item = basket[i];
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
          attachments: [],
          createdBy: MockDb.getCurrentUser()?.name || 'Admin'
        };

        const newRMA = await MockDb.addRMA(rmaData);
        if (i === 0) firstId = newRMA.id;
      }

      if (firstId) {
        setSubmittedRef(groupRequestId);
        setStep('success');
        window.scrollTo(0, 0);
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
    <div className="max-w-4xl mx-auto py-4 md:py-6 px-2 sm:px-4 md:px-6 pb-28 md:pb-6">
      {step === 'success' ? (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
          <div className="bg-white dark:bg-[#1c1c1e] rounded-[3rem] p-12 max-w-2xl w-full shadow-xl border border-gray-100 dark:border-[#333]">
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Save className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-[#1d1d1f] dark:text-white mb-4">{t('submit.successTitle') || 'Submission Successful'}</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">{t('submit.successDesc') || 'The rma has been registered successfully.'}</p>

            <div className="bg-gray-50 dark:bg-[#2c2c2e] p-6 rounded-2xl border border-gray-200 dark:border-[#424245] mb-8">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('publicSubmit.yourRef')}</div>
              <div className="text-3xl sm:text-4xl font-mono font-bold text-[#0071e3] break-all">{submittedRef}</div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={() => navigate('/admin/rmas')}
                className="px-8 py-3 bg-gray-100 dark:bg-[#2c2c2e] hover:bg-gray-200 dark:hover:bg-[#3a3a3c] text-[#1d1d1f] dark:text-white rounded-full font-semibold transition-colors"
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
                  window.scrollTo(0, 0);
                }}
                className="px-8 py-3 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full font-semibold transition-colors"
              >
                {t('submit.registerNew') || 'Register New Claim'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 mb-5 md:mb-8 px-1">
                <div><h1 className="text-xl md:text-3xl font-bold text-[#1d1d1f] dark:text-white mb-0.5">{t('submit.title')}</h1><p className="text-gray-500 dark:text-gray-400 text-xs md:text-base">{t('submit.subtitle')}</p></div>
                {basket.length > 0 && (<div className="text-right"><div className="text-2xl md:text-3xl font-bold text-[#0071e3]">{basket.length}</div><div className="text-[10px] md:text-xs text-gray-500 uppercase font-semibold">{t('submit.itemsInJob')}</div></div>)}
          </div>

          <div className="bg-white dark:bg-[#1c1c1e] rounded-xl md:rounded-[2rem] p-5 md:p-8 mb-5 md:mb-8 border border-gray-100 dark:border-[#333]">
                <h2 className="font-semibold text-base md:text-lg flex items-center gap-2 md:gap-3 mb-4 md:mb-6 text-[#1d1d1f] dark:text-white"><span className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center text-xs md:text-sm font-bold">1</span>{t('submit.customerDetails')}</h2>

            {/* Row 1: Quotation (Ref) & Company Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 ml-2">{t('publicSubmit.quotationNo')}</label>
                <input
                  value={customer.quotationNumber}
                  onChange={e => setCustomer({ ...customer, quotationNumber: e.target.value })}
                  onBlur={() => handleBlur('quotationNumber', customer.quotationNumber)}
                  type="text"
                  className={getInputClass(!!errors.quotationNumber)}
                  placeholder="SECXXXXXX"
                />
                {errors.quotationNumber && touched.quotationNumber && <p className="text-red-500 text-xs mt-1 ml-2">{errors.quotationNumber}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 ml-2">{t('publicSubmit.companyName')} <span className="text-red-500">*</span></label>
                <input
                  value={customer.name}
                  onChange={e => setCustomer({ ...customer, name: e.target.value })}
                  onBlur={() => handleBlur('name', customer.name)}
                  type="text"
                  className={getInputClass(!!errors.name)}
                  placeholder={t('placeholders.name')}
                />
                {errors.name && touched.name && <p className="text-red-500 text-xs mt-1 ml-2">{errors.name}</p>}
              </div>
            </div>

            {/* Row 2: Contact Person & Phone Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 ml-2">{t('publicSubmit.contactName')} <span className="text-red-500">*</span></label>
                <input
                  value={customer.contactPerson}
                  onChange={e => setCustomer({ ...customer, contactPerson: e.target.value })}
                  onBlur={() => handleBlur('contactPerson', customer.contactPerson)}
                  type="text"
                  className={getInputClass(!!errors.contactPerson)}
                  placeholder={t('publicSubmit.contactPlaceholder')}
                />
                {errors.contactPerson && touched.contactPerson && <p className="text-red-500 text-xs mt-1 ml-2">{errors.contactPerson}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 ml-2">{t('publicSubmit.phone')} <span className="text-red-500">*</span></label>
                <input
                  value={customer.phone}
                  onChange={e => setCustomer({ ...customer, phone: e.target.value })}
                  onBlur={() => handleBlur('phone', customer.phone)}
                  type="text"
                  className={getInputClass(!!errors.phone)}
                  placeholder={t('publicSubmit.phonePlaceholder')}
                />
                {errors.phone && touched.phone && <p className="text-red-500 text-xs mt-1 ml-2">{errors.phone}</p>}
              </div>
            </div>

            {/* Row 3: LINE ID & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 ml-2">{t('submit.lineId')}</label>
                <input
                  value={customer.lineId}
                  onChange={e => setCustomer({ ...customer, lineId: e.target.value })}
                  type="text"
                  className={getInputClass(false)}
                  placeholder={t('placeholders.lineId')}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 ml-2">Email (Optional)</label>
                <input
                  value={customer.email}
                  onChange={e => setCustomer({ ...customer, email: e.target.value })}
                  type="text"
                  className={getInputClass(false)}
                  placeholder={t('placeholders.emailOrPhone')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 ml-2">{t('submit.returnAddress')}</label>
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

          <div className="bg-white dark:bg-[#1c1c1e] rounded-xl md:rounded-[2rem] p-5 md:p-8 mb-5 md:mb-8 border border-gray-100 dark:border-[#333] relative overflow-hidden">
                <h2 className="font-semibold text-base md:text-lg flex items-center gap-2 md:gap-3 mb-4 md:mb-6 text-[#1d1d1f] dark:text-white"><span className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center text-xs md:text-sm font-bold">2</span>{t('submit.addItem')}</h2>
            <ProductEntryForm mode="admin" onAddItem={handleAddItem} />
          </div>

          {basket.length > 0 && (
            <div className="bg-white dark:bg-[#1c1c1e] rounded-[2rem] p-8 mb-8 border border-gray-100 dark:border-[#333] animate-fade-in">
              <h2 className="font-semibold text-lg mb-6 text-[#1d1d1f] dark:text-white flex justify-between items-center"><span className="flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center text-sm font-bold">3</span>{t('submit.itemsInJob')} ({basket.length})</span><button onClick={() => setBasket([])} className="text-xs text-red-500 hover:underline">{t('submit.other')} (Clear)</button></h2>
              <div className="space-y-4">
                {basket.map((item, idx) => (
                  <div key={item.id} className="flex items-start justify-between p-4 bg-gray-50 dark:bg-[#2c2c2e] rounded-2xl border border-gray-100 dark:border-[#333]">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#3a3a3c] flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">{idx + 1}</div>
                      <div>
                        <div className="font-bold text-[#1d1d1f] dark:text-white">{item.brand} {item.model}</div>
                        <div className="text-xs text-gray-500 font-mono mb-1">S/N: {item.serial}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">{item.issue}</div>
                        {item.accessories.length > 0 && (<div className="flex flex-wrap gap-1 mb-1">{item.accessories.map((acc: string) => (<span key={acc} className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-[#3a3a3c] rounded text-gray-500">{formatAccessory(acc)}</span>))}</div>)}
                        <div className="text-[10px] text-gray-400 mt-1">Dist: {item.distributor} | Team: {item.team}</div>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-gray-200/50 dark:border-white/10">
                <button
                  onClick={handleSubmitAll}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-2xl font-bold text-lg shadow-xl shadow-green-600/20 transition-all transform hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-3"
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
