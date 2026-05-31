
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight, ArrowLeft, Package, User, X, Box, PenTool, Tag, Check, Trash2, MapPin, Phone, Printer, AlertTriangle } from 'lucide-react';
import { MockDb } from '../services/mockDb';
import { escapeHtml } from '../services/sanitize';
import { ProductType, Team } from '../types';
import { LINE_ACCOUNTS, SEC_ADDRESS, getLineAccountById } from '../lineConfig';
import { useLanguage } from '../contexts/LanguageContext';
import { ProductEntryForm } from '../components/ProductEntryForm';


const INPUT_CLASS = "w-full bg-white dark:bg-[#1c1c1e] hover:bg-gray-50 dark:hover:bg-[#2c2c2e] border border-gray-200 dark:border-[#333] hover:border-blue-400/50 dark:hover:border-white/30 rounded-2xl px-4 py-4 text-[#1d1d1f] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-[#1c1c1e] focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3] transition-all outline-none";

export const CustomerSubmit: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [submittedRef, setSubmittedRef] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [customer, setCustomer] = useState({ quotationNumber: '', companyName: '', contactName: '', phone: '', email: '', lineId: '', returnAddress: '', lineAccount: '' });
    const [basket, setBasket] = useState<any[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showLabelModal, setShowLabelModal] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [sameAsReturn, setSameAsReturn] = useState<boolean | null>(null);
    const [altSender, setAltSender] = useState({ name: '', phone: '', address: '', postalCode: '' });
    // State to hold data for success screen/printing after form is cleared
    const [submittedData, setSubmittedData] = useState<{ customer: any, altSender: any, sameAsReturn: boolean | null } | null>(null);

    // Navigation Guard Logic
    const isDirty = basket.length > 0 ||
        Object.values(customer).some(val => val !== '') ||
        Object.values(altSender).some(val => val !== '');

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty && step === 'form') {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty, step]);

    const handleBack = () => {
        if (isDirty && step === 'form') {
            if (window.confirm(t('publicSubmit.confirmExit'))) {
                navigate('/');
            }
        } else {
            navigate('/');
        }
    };

    const handleAddItem = (item: any) => setBasket(prev => [...prev, { ...item, id: Date.now().toString() + Math.random().toString(36).slice(2, 6) }]);
    const handleRemoveItem = (id: string) => setBasket(basket.filter(i => i.id !== id));

    const formatAccessory = (acc: string) => {
        if (acc.startsWith('acc_hdd::')) return `HDD (${acc.split('::')[1]})`;
        if (acc.startsWith('acc_')) return t(`accessories_list.${acc}`);
        return acc;
    };

    const handleSubmit = () => {
        const newErrors: Record<string, string> = {};
        if (!customer.lineAccount) newErrors.lineAccount = t('publicSubmit.lineAccountRequired');

        if (!customer.companyName) newErrors.companyName = t('validation.companyRequired');
        if (!customer.contactName) newErrors.contactName = t('validation.contactRequired');
        if (!customer.phone) newErrors.phone = t('validation.phoneRequired');
        if (!customer.returnAddress) newErrors.returnAddress = t('validation.addressRequired');
        if (Object.keys(newErrors).length > 0) { setErrors(newErrors); window.scrollTo(0, 0); return; }
        if (basket.length > 0) processSubmission(basket);
        else alert(t('validation.atLeastOneProduct'));
    };

    const processSubmission = async (items: any[]) => {
        setIsSubmitting(true);
        const groupRequestId = await MockDb.generateNextGroupRequestId();

        try {
            // Create a promise that rejects after 15 seconds
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timed out')), 15000);
            });

            const submissionPromise = async () => {
                for (const item of items) {
                    await MockDb.addRMA({
                        groupRequestId,
                        customerName: customer.companyName,
                        contactPerson: customer.contactName,
                        customerEmail: customer.email,
                        customerLineId: customer.lineId,
                        customerAddress: customer.returnAddress,
                        customerReturnAddress: customer.returnAddress,
                        customerPhone: customer.phone,
                        quotationNumber: customer.quotationNumber,
                        brand: item.brand,
                        productModel: item.model,
                        serialNumber: item.serial,
                        productType: ProductType.OTHER,
                        distributor: item.distributor || 'Pending Staff Input',
                        accessories: item.accessories,
                        issueDescription: item.issue,
                        deviceUsername: item.deviceUsername || '',
                        devicePassword: item.devicePassword || '',
                        lineAccount: customer.lineAccount,
                        team: null as any,
                        attachments: [],
                        createdBy: 'Customer (Web)'
                    });
                }
            };

            await Promise.race([submissionPromise(), timeoutPromise]);

            setSubmittedRef(groupRequestId);

            // Save data for success screen before clearing
            setSubmittedData({
                customer: { ...customer },
                altSender: { ...altSender },
                sameAsReturn: sameAsReturn
            });

            // Clear sensitive state to avoid dirty check triggering
            setBasket([]);
            setCustomer({ quotationNumber: '', companyName: '', contactName: '', phone: '', email: '', lineId: '', returnAddress: '', lineAccount: '' });
            setAltSender({ name: '', phone: '', address: '', postalCode: '' });

            setStep('success');
            window.scrollTo(0, 0);
        } catch (error) {
            console.error("Submission error:", error);
            alert(t('publicSubmit.error') || "Submission failed. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const StepCard = ({ icon: Icon, step, title, desc }: any) => (
        <div className="flex flex-col items-center text-center relative z-10 group">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm group-hover:scale-110 transition-transform duration-300 mb-3"><Icon className="w-7 h-7" /></div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{step}</div>
            <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white mb-1">{title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[140px]">{desc}</p>
        </div>
    );

    const handlePrintLabel = () => {
        if (!submittedData) return;

        const { customer: sCustomer } = submittedData;
        const sSelectedLineConfig = getLineAccountById(sCustomer.lineAccount);

        // Use CURRENT state for sender choice (sameAsReturn, altSender) so user can edit in modal
        // Logic: Default to customer address if no alt sender provided.
        const useCustomerAddress = sameAsReturn === true || (sameAsReturn === null && (!altSender.name));

        const fromName = useCustomerAddress ? `${sCustomer.companyName} - ${sCustomer.contactName}` : altSender.name;
        const fromPhone = useCustomerAddress ? sCustomer.phone : altSender.phone;
        const fromAddress = useCustomerAddress ? sCustomer.returnAddress : `${altSender.address} ${altSender.postalCode}`;

        const recipientContacts = sSelectedLineConfig
            ? sSelectedLineConfig.recipients.map(r => `${r.name}: ${r.phone}`).join(' / ')
            : '-';

        // Use hidden iframe approach instead of popup window
        // This prevents the unprofessional about:blank window from lingering
        const existingFrame = document.getElementById('print-label-frame');
        if (existingFrame) existingFrame.remove();

        const iframe = document.createElement('iframe');
        iframe.id = 'print-label-frame';
        iframe.style.position = 'fixed';
        iframe.style.top = '-10000px';
        iframe.style.left = '-10000px';
        iframe.style.width = '800px';
        iframe.style.height = '600px';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) return;

        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(submittedRef)}&margin=0`;

        iframeDoc.open();
        iframeDoc.write(`
            <html>
            <head>
                <title>Shipping Label - ${submittedRef}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Sarabun', 'Inter', sans-serif; 
                        padding: 12mm; 
                        background: #fff;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .label {
                        border: 2.5px solid #000;
                        max-width: 190mm;
                        margin: 0 auto;
                        overflow: hidden;
                    }
                    
                    /* Header with ref number and QR */
                    .header {
                        display: flex;
                        border-bottom: 2.5px solid #000;
                    }
                    .header-left {
                        flex: 1;
                        padding: 14px 20px;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                    }
                    .header-title {
                        font-size: 9px;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 3px;
                        color: #555;
                        margin-bottom: 6px;
                    }
                    .header-ref {
                        font-size: 28px;
                        font-weight: 800;
                        font-family: 'Inter', monospace;
                        color: #000;
                        letter-spacing: -0.5px;
                        line-height: 1.1;
                    }
                    .header-note {
                        font-size: 10px;
                        color: #666;
                        margin-top: 6px;
                        font-weight: 500;
                    }
                    .header-qr {
                        width: 38mm;
                        border-left: 2.5px solid #000;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 10px;
                        background: #fafafa;
                    }
                    .header-qr img {
                        width: 26mm;
                        height: 26mm;
                    }
                    .header-qr span {
                        font-size: 7px;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 1.5px;
                        color: #888;
                        margin-top: 4px;
                    }

                    /* Sender Section */
                    .sender {
                        padding: 14px 20px;
                        border-bottom: 1.5px dashed #999;
                        position: relative;
                    }
                    .section-badge {
                        display: inline-block;
                        font-size: 8px;
                        font-weight: 800;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                        color: #fff;
                        background: #000;
                        padding: 3px 10px;
                        margin-bottom: 10px;
                    }
                    .sender-name {
                        font-size: 16px;
                        font-weight: 700;
                        color: #000;
                        margin-bottom: 3px;
                    }
                    .sender-address {
                        font-size: 13px;
                        color: #333;
                        line-height: 1.5;
                        white-space: pre-line;
                    }
                    .sender-phone {
                        font-size: 13px;
                        font-weight: 600;
                        color: #000;
                        margin-top: 4px;
                    }
                    
                    /* Cut line */
                    .cut-guide {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 0 20px;
                        height: 0;
                        position: relative;
                    }

                    /* Recipient Section - Larger & bolder */
                    .recipient {
                        padding: 16px 20px 20px;
                    }
                    .recipient-badge {
                        display: inline-block;
                        font-size: 9px;
                        font-weight: 800;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                        color: #000;
                        background: #000;
                        color: #fff;
                        padding: 4px 12px;
                        margin-bottom: 12px;
                    }
                    .recipient-company {
                        font-size: 20px;
                        font-weight: 800;
                        color: #000;
                        margin-bottom: 4px;
                        line-height: 1.2;
                    }
                    .recipient-line-id {
                        display: inline-block;
                        font-size: 12px;
                        font-weight: 700;
                        color: #333;
                        border: 1.5px solid #000;
                        padding: 2px 8px;
                        margin-bottom: 8px;
                        letter-spacing: 0.5px;
                    }
                    .recipient-address {
                        font-size: 14px;
                        color: #222;
                        line-height: 1.6;
                        margin-bottom: 8px;
                    }
                    .recipient-contacts {
                        font-size: 13px;
                        font-weight: 700;
                        color: #000;
                        line-height: 1.6;
                    }
                    .recipient-contacts span {
                        font-weight: 400;
                        color: #444;
                    }

                    /* Footer */
                    .footer {
                        border-top: 1.5px solid #000;
                        padding: 8px 20px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: #fafafa;
                    }
                    .footer-left {
                        font-size: 9px;
                        color: #888;
                        font-weight: 500;
                    }
                    .footer-right {
                        font-size: 9px;
                        color: #888;
                        font-weight: 600;
                        font-family: 'Inter', monospace;
                    }

                    @media print { 
                        body { padding: 8mm; } 
                        @page { size: A4 portrait; margin: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="label">
                    <!-- Header: Ref Number + QR Code -->
                    <div class="header">
                        <div class="header-left">
                            <div class="header-title">${t('publicSubmit.refLabel')}</div>
                            <div class="header-ref">${escapeHtml(submittedRef)}</div>
                            <div class="header-note">กรุณาเก็บรักษาเลขนี้ไว้เพื่อติดตามสถานะ</div>
                        </div>
                        <div class="header-qr">
                            <img src="${qrUrl}" alt="QR Code" />
                            <span>SCAN TO TRACK</span>
                        </div>
                    </div>

                    <!-- Sender -->
                    <div class="sender">
                        <div class="section-badge">${t('publicSubmit.senderLabel')}</div>
                        <div class="sender-name">${escapeHtml(fromName)}</div>
                        <div class="sender-address">${escapeHtml(fromAddress)}</div>
                        <div class="sender-phone">โทร. ${escapeHtml(fromPhone)}</div>
                    </div>

                    <div class="cut-guide"></div>

                    <!-- Recipient (larger, more prominent) -->
                    <div class="recipient">
                        <div class="recipient-badge">${t('publicSubmit.recipientLabel')}</div>
                        <div class="recipient-company">${SEC_ADDRESS.company}</div>
                        ${sSelectedLineConfig?.lineId ? `<div class="recipient-line-id">${sSelectedLineConfig.lineId}</div>` : ''}
                        <div class="recipient-address">${SEC_ADDRESS.address}</div>
                        <div class="recipient-contacts">
                            ${sSelectedLineConfig 
                                ? sSelectedLineConfig.recipients.map(r => 
                                    `<span>โทร.</span> ${escapeHtml(r.name)} ${escapeHtml(r.phone)}`
                                  ).join(' &nbsp;/&nbsp; ')
                                : '-'
                            }
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="footer">
                        <div class="footer-right">${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                    </div>
                </div>
            </body>
            </html>
        `);
        iframeDoc.close();

        // Wait for fonts to load, then print from iframe and clean up
        iframe.onload = () => {
            setTimeout(() => {
                iframe.contentWindow?.print();
                // Clean up iframe after print dialog closes
                setTimeout(() => {
                    iframe.remove();
                }, 1000);
            }, 500);
        };

        setShowLabelModal(false);
    };

    if (step === 'success') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
                <div className="glass-panel rounded-[3rem] p-12 max-w-2xl w-full text-center shadow-2xl">
                    <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" /></div>
                    <h1 className="text-3xl font-bold text-[#1d1d1f] dark:text-white mb-4">{t('publicSubmit.successTitle')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">{t('publicSubmit.successDesc')}</p>
                    <div className="bg-gray-50 dark:bg-[#1c1c1e] p-6 rounded-2xl border border-gray-200 dark:border-[#333] mb-8"><div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('publicSubmit.yourRef')}</div><div className="text-3xl sm:text-4xl font-mono font-bold text-[#0071e3] break-all">{submittedRef}</div><div className="text-xs text-blue-500 mt-2 flex items-center justify-center gap-1"><Check className="w-3 h-3" /> Database Updated</div></div>
                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                        <button onClick={() => setShowLabelModal(true)} className="px-8 py-3 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                            <Printer className="w-4 h-4" /> {t('publicSubmit.printLabel')}
                        </button>
                        <button onClick={() => setShowExitConfirm(true)} className="px-8 py-3 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-[#1d1d1f] dark:text-white rounded-full font-semibold transition-colors">{t('publicSubmit.backHome')}</button>
                    </div>
                    <p className="mt-8 text-xs text-gray-400">{t('publicSubmit.thankYou')}</p>
                </div>

                {/* Exit Confirmation Modal */}
                {showExitConfirm && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowExitConfirm(false)}>
                        <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl p-8 max-w-md w-full shadow-2xl transform transition-all" onClick={e => e.stopPropagation()}>
                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-5">
                                    <AlertTriangle className="w-8 h-8 text-amber-500" />
                                </div>
                                <h3 className="text-xl font-bold text-[#1d1d1f] dark:text-white mb-3">ยืนยันออกจากหน้านี้?</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 leading-relaxed">
                                    คุณได้จดบันทึกรหัสอ้างอิง หรือพิมพ์ใบจ่าหน้ากล่องเรียบร้อยแล้วใช่หรือไม่?
                                </p>
                                <div className="bg-gray-50 dark:bg-white/5 rounded-xl px-4 py-3 mb-5 w-full">
                                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">รหัสอ้างอิงของคุณ</div>
                                    <div className="text-lg font-mono font-bold text-[#0071e3]">{submittedRef}</div>
                                </div>
                                <p className="text-xs text-amber-600 dark:text-amber-400 mb-6">
                                    ⚠ หากออกจากหน้านี้ คุณอาจไม่สามารถเรียกดูรหัสนี้ได้อีก
                                </p>
                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={() => setShowExitConfirm(false)}
                                        className="flex-1 py-3 rounded-xl font-semibold text-sm bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-[#1d1d1f] dark:text-white transition-colors"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        onClick={() => navigate('/')}
                                        className="flex-1 py-3 rounded-xl font-semibold text-sm bg-[#1d1d1f] dark:bg-white hover:bg-black dark:hover:bg-gray-100 text-white dark:text-[#1d1d1f] transition-colors"
                                    >
                                        ยืนยัน ออกจากหน้านี้
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Print Label Modal */}
                {showLabelModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowLabelModal(false)}>
                        <div className="bg-white dark:bg-[#1c1c1e] rounded-[2rem] p-8 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                                    <Printer className="w-5 h-5 text-[#0071e3]" /> {t('publicSubmit.printLabel')}
                                </h2>
                                <button onClick={() => setShowLabelModal(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('publicSubmit.printLabelDesc')}</p>

                            {/* Question: Same as return address? */}
                            <div className="mb-6">
                                <label className="text-sm font-bold text-[#1d1d1f] dark:text-white block mb-3">{t('publicSubmit.sameAsReturn')}</label>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setSameAsReturn(true); }}
                                        className={`flex-1 py-3 rounded-xl font-semibold text-sm border-2 transition-all ${sameAsReturn === true
                                            ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-md'
                                            : 'bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white border-gray-200 dark:border-[#424245] hover:border-[#0071e3]'
                                            }`}
                                    >
                                        {t('publicSubmit.yes')}
                                    </button>
                                    <button
                                        onClick={() => { setSameAsReturn(false); }}
                                        className={`flex-1 py-3 rounded-xl font-semibold text-sm border-2 transition-all ${sameAsReturn === false
                                            ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-md'
                                            : 'bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white border-gray-200 dark:border-[#424245] hover:border-[#0071e3]'
                                            }`}
                                    >
                                        {t('publicSubmit.no')}
                                    </button>
                                </div>
                            </div>

                            {/* Show return address for confirmation OR input for different address */}
                            {sameAsReturn === true && submittedData && (
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-xl mb-6">
                                    <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-1">{t('publicSubmit.senderAddress')}</div>
                                    <p className="text-sm text-[#1d1d1f] dark:text-gray-200">{submittedData.customer.companyName} - {submittedData.customer.contactName}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">{submittedData.customer.returnAddress}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('publicSubmit.phone')}: {submittedData.customer.phone}</p>
                                </div>
                            )}

                            {sameAsReturn === false && (
                                <div className="space-y-3 mb-6">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase ml-2 mb-1 block">{t('publicSubmit.senderName')} <span className="text-red-500">*</span></label>
                                        <input
                                            value={altSender.name}
                                            onChange={e => setAltSender(p => ({ ...p, name: e.target.value }))}
                                            className="w-full bg-white dark:bg-[#1c1c1e] hover:bg-gray-50 dark:hover:bg-[#2c2c2e] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-3 text-[#1d1d1f] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-[#1c1c1e] focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3] transition-all outline-none"
                                            placeholder={t('publicSubmit.senderNamePlaceholder')}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase ml-2 mb-1 block">{t('publicSubmit.senderPhone')} <span className="text-red-500">*</span></label>
                                        <input
                                            value={altSender.phone}
                                            onChange={e => setAltSender(p => ({ ...p, phone: e.target.value }))}
                                            className="w-full bg-white dark:bg-[#1c1c1e] hover:bg-gray-50 dark:hover:bg-[#2c2c2e] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-3 text-[#1d1d1f] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-[#1c1c1e] focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3] transition-all outline-none"
                                            placeholder={t('publicSubmit.senderPhonePlaceholder')}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase ml-2 mb-1 block">{t('publicSubmit.senderAddressField')} <span className="text-red-500">*</span></label>
                                        <textarea
                                            value={altSender.address}
                                            onChange={e => setAltSender(p => ({ ...p, address: e.target.value }))}
                                            rows={2}
                                            className="w-full bg-white dark:bg-[#1c1c1e] hover:bg-gray-50 dark:hover:bg-[#2c2c2e] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-3 text-[#1d1d1f] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-[#1c1c1e] focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3] transition-all outline-none"
                                            placeholder={t('publicSubmit.senderAddressPlaceholder')}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase ml-2 mb-1 block">{t('publicSubmit.senderPostalCode')} <span className="text-red-500">*</span></label>
                                        <input
                                            value={altSender.postalCode}
                                            onChange={e => setAltSender(p => ({ ...p, postalCode: e.target.value }))}
                                            className="w-full bg-white dark:bg-[#1c1c1e] hover:bg-gray-50 dark:hover:bg-[#2c2c2e] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-3 text-[#1d1d1f] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-[#1c1c1e] focus:ring-2 focus:ring-[#0071e3]/50 focus:border-[#0071e3] transition-all outline-none"
                                            placeholder={t('publicSubmit.senderPostalCodePlaceholder')}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Print Button */}
                            <button
                                onClick={handlePrintLabel}
                                disabled={sameAsReturn === null || (sameAsReturn === false && (!altSender.name.trim() || !altSender.phone.trim() || !altSender.address.trim() || !altSender.postalCode.trim()))}
                                className="w-full py-4 bg-[#0071e3] hover:bg-[#0077ed] disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                            >
                                <Printer className="w-5 h-5" /> {t('publicSubmit.printLabel')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 flex items-center gap-4"><button onClick={handleBack} className="p-2 rounded-full bg-white/40 dark:bg-white/5 hover:bg-white/60 transition-colors"><ArrowLeft className="w-5 h-5 text-[#1d1d1f] dark:text-white" /></button><div><h1 className="text-3xl font-bold text-[#1d1d1f] dark:text-white">{t('publicSubmit.title')}</h1><p className="text-gray-500 dark:text-gray-400 text-sm">{t('publicSubmit.subtitle')}</p></div></div>
                <div className="glass-panel rounded-[2rem] p-8 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/0 via-blue-500/20 to-blue-500/0"></div>
                    <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-white mb-6 text-center">{t('publicSubmit.howToTitle')}</h2>
                    {/* Simplified steps display just as info */}
                    <div className="flex flex-wrap justify-center gap-6 md:gap-12">
                        <div className="flex flex-col items-center text-center max-w-[120px]">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 mb-2"><Box className="w-5 h-5" /></div>
                            <div className="text-xs font-bold text-gray-500">1. {t('publicSubmit.step1')}</div>
                        </div>
                        <div className="flex flex-col items-center text-center max-w-[120px]">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 mb-2"><User className="w-5 h-5" /></div>
                            <div className="text-xs font-bold text-gray-500">2. {t('publicSubmit.step2')}</div>
                        </div>
                        <div className="flex flex-col items-center text-center max-w-[120px]">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 mb-2"><PenTool className="w-5 h-5" /></div>
                            <div className="text-xs font-bold text-gray-500">3. {t('publicSubmit.step3')}</div>
                        </div>
                    </div>
                </div>

                {/* Single Page Form Container */}
                <div className="space-y-8">

                    {/* Section 1: Customer Details */}
                    <div className="glass-panel rounded-[2rem] p-8 relative overflow-hidden">
                        <h2 className="text-lg font-bold text-[#1d1d1f] dark:text-white flex items-center gap-3 mb-6">
                            <span className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center text-sm font-bold">1</span>
                            {t('publicSubmit.contactInfo')}
                        </h2>

                        <div className="space-y-6">
                            {/* Row 1: Quotation (Ref) & Company Name */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 ml-2">{t('publicSubmit.quotationNo')}</label>
                                    <input
                                        value={customer.quotationNumber}
                                        onChange={e => setCustomer({ ...customer, quotationNumber: e.target.value })}
                                        className={INPUT_CLASS}
                                        placeholder="SECXXXXXX"
                                    />
                                    {errors.quotationNumber && <p className="text-red-500 text-xs ml-2 mt-1">{errors.quotationNumber}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 ml-2">{t('publicSubmit.companyName')} <span className="text-red-500">*</span></label>
                                    <input
                                        value={customer.companyName}
                                        onChange={e => setCustomer({ ...customer, companyName: e.target.value })}
                                        className={INPUT_CLASS}
                                        placeholder={t('publicSubmit.companyPlaceholder')}
                                        maxLength={200}
                                    />
                                    {errors.companyName && <p className="text-red-500 text-xs ml-2 mt-1">{errors.companyName}</p>}
                                </div>
                            </div>

                            {/* Row 2: Contact Person & Phone Number */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 ml-2">{t('publicSubmit.contactName')} <span className="text-red-500">*</span></label>
                                    <input
                                        value={customer.contactName}
                                        onChange={e => setCustomer({ ...customer, contactName: e.target.value })}
                                        className={INPUT_CLASS}
                                        placeholder={t('publicSubmit.contactPlaceholder')}
                                        maxLength={100}
                                    />
                                    {errors.contactName && <p className="text-red-500 text-xs ml-2 mt-1">{errors.contactName}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 ml-2">{t('publicSubmit.phone')} <span className="text-red-500">*</span></label>
                                    <input
                                        type="tel"
                                        value={customer.phone}
                                        onChange={e => setCustomer({ ...customer, phone: e.target.value })}
                                        className={INPUT_CLASS}
                                        placeholder={t('publicSubmit.phonePlaceholder')}
                                        maxLength={20}
                                    />
                                    {errors.phone && <p className="text-red-500 text-xs ml-2 mt-1">{errors.phone}</p>}
                                </div>
                            </div>

                            {/* Row 3: LINE Account (Where they bought) & LINE ID */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 ml-2">{t('publicSubmit.lineAccountLabel')} <span className="text-red-500">*</span></label>
                                    <select value={customer.lineAccount} onChange={e => setCustomer({ ...customer, lineAccount: e.target.value })} className={INPUT_CLASS + ' cursor-pointer'}>
                                        <option value="">{t('publicSubmit.lineAccountPlaceholder')}</option>
                                        {LINE_ACCOUNTS.map(la => <option key={la.id} value={la.id}>{la.label}</option>)}
                                    </select>
                                    {errors.lineAccount && <p className="text-red-500 text-xs ml-2 mt-1">{errors.lineAccount}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 ml-2">{t('submit.lineId')}</label>
                                    <input
                                        value={customer.lineId}
                                        onChange={e => setCustomer({ ...customer, lineId: e.target.value })}
                                        className={INPUT_CLASS}
                                        placeholder={t('placeholders.lineId')}
                                        maxLength={100}
                                    />
                                </div>
                            </div>

                            {/* Row 4: Return Address */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 ml-2">{t('submit.returnAddress')} <span className="text-red-500">*</span></label>
                                <textarea
                                    value={customer.returnAddress}
                                    onChange={e => setCustomer({ ...customer, returnAddress: e.target.value })}
                                    className={INPUT_CLASS}
                                    placeholder={t('publicSubmit.addressPlaceholder')}
                                    rows={3}
                                    maxLength={500}
                                />
                                {errors.returnAddress && <p className="text-red-500 text-xs ml-2 mt-1">{errors.returnAddress}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Product Info */}
                    <div className="glass-panel rounded-[2rem] p-8 relative overflow-hidden">
                        <h2 className="text-lg font-bold text-[#1d1d1f] dark:text-white flex items-center gap-3 mb-6">
                            <span className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center text-sm font-bold">2</span>
                            {t('publicSubmit.productInfo')}
                        </h2>

                        {/* Step-by-step guide for customers */}
                        <div className="mb-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/60 dark:border-blue-800/30 rounded-2xl">
                            <h3 className="text-sm font-bold text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
                                📋 วิธีเพิ่มรายการเข้าระบบ
                            </h3>
                            <div className="space-y-2">
                                {[
                                    { num: '①', text: 'เลือกยี่ห้อสินค้า เช่น Hikvision, Dahua' },
                                    { num: '②', text: 'กรอกรุ่นสินค้า และ Serial Number (ดูจากสติกเกอร์บนตัวเครื่อง) หรือกด 📷 สแกน' },
                                    { num: '③', text: 'อธิบายอาการเสีย เช่น "ภาพมืด", "เชื่อมต่อไม่ได้"' },
                                    { num: '④', text: 'กดปุ่ม "เพิ่มรายการ" ด้านล่าง เพื่อเพิ่มเข้ารายการ' },
                                    { num: '⑤', text: 'ถ้ามีสินค้ามากกว่า 1 ชิ้น ให้กรอกข้อมูลชิ้นถัดไป แล้วกด "เพิ่มรายการ" อีกครั้ง ทำซ้ำจนครบทุกชิ้น' },
                                ].map((s, i) => (
                                    <div key={i} className="flex items-start gap-2.5 text-sm text-blue-800/80 dark:text-blue-200/80">
                                        <span className="text-blue-500 font-bold text-base leading-5">{s.num}</span>
                                        <span>{s.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <ProductEntryForm mode="customer" onAddItem={handleAddItem} />

                        {/* Basket List */}
                        {basket.length > 0 && (
                            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/10">
                                <h3 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                                    <Package className="w-4 h-4" /> {t('submit.itemsInJob')} ({basket.length})
                                </h3>
                                <div className="space-y-3">
                                    {basket.map((item, idx) => (
                                        <div key={idx} className="p-4 bg-white/40 dark:bg-white/5 rounded-2xl border border-white/20 flex justify-between items-start">
                                            <div>
                                                <div className="font-bold text-sm text-[#1d1d1f] dark:text-white flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-[10px] flex items-center justify-center font-bold">{idx + 1}</span>
                                                    {item.brand} {item.model}
                                                </div>
                                                <div className="text-xs text-gray-500 font-mono mt-1 ml-7">S/N: {item.serial}</div>
                                                <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 ml-7">{item.issue}</div>
                                                {item.accessories.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2 ml-7">
                                                        {item.accessories.map((acc: string) => (
                                                            <span key={acc} className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-white/10 rounded text-gray-500">{formatAccessory(acc)}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Submit Section */}
                    <div className="glass-panel rounded-[2rem] p-8 text-center">
                        <div className="max-w-md mx-auto">
                            {!basket.length ? (
                                <p className="text-sm text-gray-500 mb-4 italic">{t('validation.atLeastOneProduct')}</p>
                            ) : (
                                <p className="text-sm text-green-600 dark:text-green-400 mb-4 font-semibold flex items-center justify-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> Ready to Submit {basket.length} items
                                </p>
                            )}

                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || basket.length === 0}
                                className="w-full py-4 bg-[#0071e3] hover:bg-[#0077ed] disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-2xl font-bold shadow-xl shadow-blue-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>Loading...</>
                                ) : (
                                    <>{t('publicSubmit.submitAll')} <ArrowRight className="w-5 h-5" /></>
                                )}
                            </button>
                            <p className="text-[10px] text-gray-400 mt-4 max-w-xs mx-auto">{t('publicSubmit.disclaimer')}</p>
                        </div>
                    </div>
                </div>


            </div>
        </div>
    );
};
