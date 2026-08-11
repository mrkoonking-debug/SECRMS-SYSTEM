import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Renders HTML content to an image blob using an invisible iframe.
 */
export async function renderHtmlToBlob(htmlContent: string, pageIndex?: number): Promise<Blob> {
  const processedHtml = await inlineImages(htmlContent);

  return new Promise<Blob>((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:0;top:0;width:794px;height:1123px;border:0;opacity:0;pointer-events:none;z-index:-99999;';
    document.body.appendChild(iframe);

    const cleanup = () => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Rendering timeout 15s'));
    }, 15000);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      cleanup();
      clearTimeout(timer);
      reject(new Error('No iframe document'));
      return;
    }

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; background: #ffffff; font-family: 'Sarabun', 'Inter', sans-serif; }
</style>
</head>
<body>
${processedHtml}
</body>
</html>`;

    iframeDoc.open();
    iframeDoc.write(fullHtml);
    iframeDoc.close();

    iframe.onload = async () => {
      try {
        const iDoc = iframe.contentDocument!;
        if (iDoc.fonts) {
          try { await iDoc.fonts.ready; } catch { /* ignore font error */ }
        }

        const imgs = Array.from(iDoc.querySelectorAll('img')) as HTMLImageElement[];
        await Promise.allSettled(imgs.map(img =>
          img.complete ? Promise.resolve() : new Promise<void>(res => {
            img.onload = () => res();
            img.onerror = () => { res(); };
            setTimeout(res, 2500);
          })
        ));

        await new Promise(r => setTimeout(r, 300));

        let target: HTMLElement;
        if (pageIndex !== undefined) {
          const allDocs = Array.from(iDoc.querySelectorAll('.print-doc')) as HTMLElement[];
          target = allDocs[pageIndex] || allDocs[0] || iDoc.body;
        } else {
          target = iDoc.querySelector('.print-doc') as HTMLElement
                || iDoc.querySelector('.shipping-label') as HTMLElement
                || iDoc.querySelector('.label') as HTMLElement
                || iDoc.body;
        }

        const canvas = await html2canvas(target, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: 794,
        });

        canvas.toBlob((blob: Blob | null) => {
          clearTimeout(timer);
          cleanup();
          if (blob) resolve(blob);
          else reject(new Error('toBlob failed'));
        }, 'image/png');

      } catch (err) {
        clearTimeout(timer);
        cleanup();
        reject(err);
      }
    };

    iframe.onerror = () => {
      clearTimeout(timer);
      cleanup();
      reject(new Error('iframe error'));
    };
  });
}

/**
 * Directly downloads HTML content as a crisp A4 PDF file using jsPDF.save().
 */
export async function downloadHtmlAsPdf(htmlContent: string, fileName: string): Promise<void> {
  const imageBlob = await renderHtmlToBlob(htmlContent);
  const imageUrl = URL.createObjectURL(imageBlob);

  return new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        pdf.addImage(img, 'PNG', 0, 0, 210, 297);
        const finalName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
        pdf.save(finalName);
        URL.revokeObjectURL(imageUrl);
        resolve();
      } catch (err) {
        URL.revokeObjectURL(imageUrl);
        reject(err);
      }
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(imageUrl);
      reject(err);
    };
    img.src = imageUrl;
  });
}

/**
 * Programmatically generates PDF Blob for other handlers.
 */
export async function renderHtmlToPdfBlob(htmlContent: string): Promise<Blob> {
  const imageBlob = await renderHtmlToBlob(htmlContent);
  const imageUrl = URL.createObjectURL(imageBlob);

  return new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        pdf.addImage(img, 'PNG', 0, 0, 210, 297);
        const pdfBlob = pdf.output('blob');
        URL.revokeObjectURL(imageUrl);
        resolve(pdfBlob);
      } catch (err) {
        URL.revokeObjectURL(imageUrl);
        reject(err);
      }
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(imageUrl);
      reject(err);
    };
    img.src = imageUrl;
  });
}

/**
 * Finds all <img src="..."> in the HTML string and converts them to data URIs safely.
 */
async function inlineImages(html: string): Promise<string> {
  const imgRegex = /(<img[^>]*\ssrc=["'])([^"']+)(["'][^>]*>)/gi;
  const matches: { full: string; url: string }[] = [];
  let match;
  
  while ((match = imgRegex.exec(html)) !== null) {
    matches.push({ full: match[0], url: match[2] });
  }

  if (matches.length === 0) return html;

  const urlCache = new Map<string, string>();
  
  for (const m of matches) {
    if (urlCache.has(m.url)) continue;
    if (m.url.startsWith('data:')) { urlCache.set(m.url, m.url); continue; }

    try {
      const dataUri = await toDataUri(m.url);
      urlCache.set(m.url, dataUri);
    } catch {
      urlCache.set(m.url, m.url);
    }
  }

  let result = html;
  for (const m of matches) {
    const newUrl = urlCache.get(m.url) || m.url;
    if (newUrl !== m.url) {
      result = result.replaceAll(m.url, newUrl);
    }
  }

  return result;
}

function toDataUri(url: string): Promise<string> {
  return new Promise((resolve) => {
    if (url.startsWith('data:')) return resolve(url);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(url);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(url);
      }
    };
    img.onerror = () => resolve(url);

    if (url.startsWith('/')) {
      img.src = window.location.origin + url;
    } else {
      img.src = url;
    }
  });
}
