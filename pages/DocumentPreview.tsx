
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MockDb } from '../services/mockDb';
import { RMA } from '../types';
import { getImporterFormHTML, getCustomerFormHTML } from '../services/printService';
import { ArrowLeft, Printer, Download, Loader2, Image as ImageIcon, X, Check, Copy } from 'lucide-react';
import html2canvas from 'html2canvas';
import { renderHtmlToBlob } from '../services/renderToImage';
import { showToast } from '../services/toast';

export const DocumentPreview: React.FC = () => {
    const { type, id } = useParams<{ type: string; id: string }>();
    const navigate = useNavigate();
    const [rma, setRMA] = useState<RMA | null>(null);
    const [htmlContent, setHtmlContent] = useState('');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const hiddenRenderRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchDoc = async () => {
            if (id) {
                const found = await MockDb.getRMAById(id);
                if (found) {
                    setRMA(found);
                    let content = '';
                    if (type === 'importer') content = await getImporterFormHTML([found]);
                    else if (type === 'customer') content = await getCustomerFormHTML([found]);
                    setHtmlContent(content);
                } else {
                    navigate('/admin/rmas');
                }
            }
        };
        fetchDoc();
    }, [id, type, navigate]);

    const handlePrint = () => {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:0;visibility:hidden;';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (doc) {
            doc.open();
            doc.write(`<!DOCTYPE html><html><head><title>Print</title><meta name="viewport" content="width=794"><style>@page{size:A4 portrait;margin:0}html,body{margin:0;padding:0;background:#fff;width:100%}</style></head><body style="margin:0;padding:0;">${htmlContent}</body></html>`);
            doc.close();
            iframe.contentWindow?.focus();
            setTimeout(() => {
                iframe.contentWindow?.print();
                setTimeout(() => {
                    if (document.body.contains(iframe)) document.body.removeChild(iframe);
                }, 1000);
            }, 800);
        }
    };

    const handleGenerateImage = async () => {
        if (!hiddenRenderRef.current) return;
        setIsGenerating(true);
        setShowImageModal(true);
        setCopySuccess(false);
        try {
            const element = hiddenRenderRef.current.querySelector('.print-doc') as HTMLElement;
            if (element) {
                const canvas = await html2canvas(element, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', logging: false, width: 794, height: 1123, windowWidth: 1200 });
                setImageUrl(canvas.toDataURL('image/jpeg', 0.9));
            }
        } catch (err) { console.error(err); } finally { setIsGenerating(false); }
    };

    const handleDownloadImage = () => {
        if (imageUrl) {
            const link = document.createElement('a');
            link.href = imageUrl;
            link.download = `rma-${id}-${type}.jpg`;
            link.click();
        }
    };

    const handleCopyImage = async () => {
        if (!imageUrl) return;
        try {
            let blobToSend: Blob;
            if (imageUrl.startsWith('data:image/jpeg') || imageUrl.startsWith('data:image/jpg')) {
                blobToSend = await new Promise<Blob>((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) { reject(new Error('Canvas context failed')); return; }
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0);
                        canvas.toBlob((b) => {
                            if (b) resolve(b);
                            else reject(new Error('PNG conversion failed'));
                        }, 'image/png');
                    };
                    img.onerror = (e) => reject(e);
                    img.src = imageUrl;
                });
            } else {
                const response = await fetch(imageUrl);
                blobToSend = await response.blob();
            }
            const clipboardItemInput = { [blobToSend.type]: blobToSend };
            await navigator.clipboard.write([new ClipboardItem(clipboardItemInput)]);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy image:', err);
            alert('Failed to copy image to clipboard. Try downloading instead.');
        }
    };

    if (!rma) return <div className="flex items-center justify-center min-h-[60vh] text-gray-500"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Document...</div>;

    return (
        <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 px-2 gap-3">
                <Link to={`/admin/job/${encodeURIComponent(id || '')}`} className="flex items-center text-sm font-medium text-gray-500 hover:text-[#0071e3] transition-colors"><ArrowLeft className="h-4 w-4 mr-1" /> Back to RMA</Link>
                <div className="flex items-center gap-2 min-w-0">
                    <h1 className="text-base sm:text-xl font-bold text-[#1d1d1f] dark:text-white capitalize truncate">{type === 'importer' ? 'Distributor RMA' : 'Customer Return'} Form</h1>
                    <div className="text-xs font-mono text-gray-400 px-2 py-1 bg-white/50 dark:bg-white/10 rounded-lg border border-gray-200 dark:border-white/10 flex-shrink-0">{id}</div>
                </div>
            </div>

            <div className="glass-panel rounded-2xl p-3 sm:p-4 mb-6 flex flex-wrap items-center justify-between gap-3 sticky top-24 z-30 shadow-sm">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 pl-2"><span className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> A4 Ready (210mm x 297mm)</span></div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    {/* Copy Text Only */}
                    <button
                        onClick={() => {
                            if (!rma) return;
                            let textLines: string[] = [];
                            const jobIdVal = rma.groupRequestId || rma.id || '-';
                            const quotationVal = rma.quotationNumber || '-';
                            textLines.push(`เลขที่งานเคลม (Job ID): ${jobIdVal}`);
                            textLines.push(`เลขอ้างอิง/ใบเสนอราคา: ${quotationVal}`);
                            if (type === 'customer') {
                                textLines.push(`ลูกค้า: ${rma.customerName || '-'}`);
                            } else {
                                textLines.push(`ผู้นำเข้า: ${rma.distributor || '-'}`);
                            }
                            textLines.push('');
                            textLines.push(`${rma.brand} รุ่น: ${rma.productModel}`);
                            textLines.push(`S/N: ${rma.serialNumber}`);
                            textLines.push(`อาการที่ลูกค้าแจ้ง: ${rma.issueDescription || '-'}`);
                            if (rma.resolution?.rootCause) textLines.push(`อาการที่พบ: ${rma.resolution.rootCause}`);
                            navigator.clipboard.writeText(textLines.join('\n')).then(() => {
                                alert('✅ คัดลอกข้อความแล้ว!');
                            }).catch(() => alert('ไม่สามารถคัดลอกได้'));
                        }}
                        className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors"
                        title="คัดลอกเฉพาะข้อความ (Facebook)"
                    >
                        <Copy className="w-4 h-4" /> <span className="hidden sm:inline">ข้อความ</span>
                    </button>
                    {/* Copy Image Only */}
                    <button
                        onClick={async () => {
                            if (!htmlContent) return;
                            try {
                                const blob = await renderHtmlToBlob(htmlContent);
                                try {
                                    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                                    showToast('คัดลอกรูปภาพแล้ว!', 'success');
                                } catch {
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url; a.download = `rma-${id}-${type}.png`; a.click();
                                    URL.revokeObjectURL(url);
                                    showToast('ดาวน์โหลดรูปภาพแล้ว', 'info');
                                }
                            } catch (err) {
                                console.error('Copy image failed:', err);
                                showToast('ไม่สามารถคัดลอกรูปภาพได้ ลองใหม่อีกครั้ง', 'error');
                            }
                        }}
                        className="px-3 sm:px-4 py-2 sm:py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors"
                        title="คัดลอกเฉพาะรูปภาพ"
                    >
                        <ImageIcon className="w-4 h-4" /> <span className="hidden sm:inline">รูปภาพ</span>
                    </button>
                    {/* Copy Both (LINE) */}
                    <button
                        onClick={async () => {
                            if (!htmlContent || !rma) return;
                            try {
                                const blob = await renderHtmlToBlob(htmlContent);
                                let textLines: string[] = [];
                                const jobIdVal = rma.groupRequestId || rma.id || '-';
                                const quotationVal = rma.quotationNumber || '-';
                                textLines.push(`เลขที่งานเคลม (Job ID): ${jobIdVal}`);
                                textLines.push(`เลขอ้างอิง/ใบเสนอราคา: ${quotationVal}`);
                                if (type === 'customer') {
                                    textLines.push(`ลูกค้า: ${rma.customerName || '-'}`);
                                } else {
                                    textLines.push(`ผู้นำเข้า: ${rma.distributor || '-'}`);
                                }
                                textLines.push('');
                                textLines.push(`${rma.brand} รุ่น: ${rma.productModel}`);
                                textLines.push(`S/N: ${rma.serialNumber}`);
                                textLines.push(`อาการที่ลูกค้าแจ้ง: ${rma.issueDescription || '-'}`);
                                if (rma.resolution?.rootCause) textLines.push(`อาการที่พบ: ${rma.resolution.rootCause}`);
                                try {
                                    await navigator.clipboard.write([
                                        new ClipboardItem({
                                            'image/png': blob,
                                            'text/plain': new Blob([textLines.join('\n')], { type: 'text/plain' })
                                        })
                                    ]);
                                    showToast('คัดลอกรูป + ข้อความแล้ว! วางใน LINE ได้เลย', 'success');
                                } catch {
                                    await navigator.clipboard.writeText(textLines.join('\n'));
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url; a.download = `rma-${id}-${type}.png`; a.click();
                                    URL.revokeObjectURL(url);
                                    showToast('คัดลอกข้อความแล้ว + ดาวน์โหลดรูปแยก', 'info');
                                }
                            } catch (err) {
                                console.error('Copy failed:', err);
                                showToast('ไม่สามารถคัดลอกได้ ลองใหม่อีกครั้ง', 'error');
                            }
                        }}
                        className="px-3 sm:px-4 py-2 sm:py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/30"
                        title="คัดลอกทั้งรูปภาพและข้อความ (สำหรับ LINE)"
                    >
                        <Copy className="w-4 h-4" /> <span className="hidden sm:inline">ทั้งหมด (LINE)</span>
                    </button>
                    <button onClick={handlePrint} className="px-4 sm:px-6 py-2 sm:py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/30"><Printer className="w-4 h-4" /> Print</button>
                </div>
            </div>

            <div className="glass-panel rounded-[2rem] p-4 sm:p-8 md:p-12 flex justify-center bg-gray-50/50 dark:bg-[#1c1c1e] dark:border dark:border-white/10">
                <div className="overflow-x-auto w-full flex justify-center">
                    <div className="relative shadow-2xl flex-shrink-0" style={{ width: '210mm', height: '297mm', background: 'white' }}><div className="w-full h-full" dangerouslySetInnerHTML={{ __html: htmlContent }} /></div>
                </div>
            </div>


            {showImageModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fade-in">
                    <div className="glass-panel bg-white dark:bg-[#1c1c1e] rounded-[2rem] w-full max-w-4xl max-h-[90vh] shadow-2xl border border-white/20 dark:border-white/10 flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-white/50 dark:bg-black/20"><h3 className="text-lg font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2"><ImageIcon className="w-5 h-5 text-purple-500" /> Generated A4 Image</h3><button onClick={() => setShowImageModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5 text-[#1d1d1f] dark:text-white" /></button></div>
                        <div className="flex-1 overflow-auto p-6 bg-gray-100 dark:bg-[#000000] flex items-center justify-center">{isGenerating ? <div className="flex flex-col items-center gap-4"><Loader2 className="w-10 h-10 text-[#0071e3] animate-spin" /><span className="text-gray-500 font-medium">Rendering high-quality A4 image...</span></div> : imageUrl ? <img src={imageUrl} alt="Generated A4" className="max-w-full h-auto shadow-xl rounded-lg border border-gray-200 dark:border-gray-800" /> : <span className="text-red-500">Failed to generate image</span>}</div>
                        <div className="p-6 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3 bg-white/50 dark:bg-black/20">
                            <button onClick={() => setShowImageModal(false)} className="px-6 py-3 rounded-xl font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">Close</button>
                            <button onClick={handleCopyImage} disabled={!imageUrl} className={`px-6 py-3 rounded-xl font-bold shadow-lg transition-transform hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:scale-100 ${copySuccess ? 'bg-green-600 text-white shadow-green-600/20' : 'bg-gray-100 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-gray-200 dark:hover:bg-white/20'}`}>{copySuccess ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}{copySuccess ? 'Copied' : 'Copy Image'}</button>
                            <button onClick={handleDownloadImage} disabled={!imageUrl} className="px-6 py-3 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-transform hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:scale-100"><Download className="w-5 h-5" /> Download JPG</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
