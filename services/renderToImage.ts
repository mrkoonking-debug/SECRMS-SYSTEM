import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Renders HTML content to image blobs using an invisible iframe.
 * If there are multiple printable documents/pages, returns a Blob for each page.
 */
export async function renderHtmlToBlobs(htmlContent: string): Promise<Blob[]> {
  const processedHtml = await inlineImages(htmlContent);

  return new Promise<Blob[]>((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:0;top:0;width:794px;height:1123px;border:0;opacity:0;pointer-events:none;z-index:-99999;';
    document.body.appendChild(iframe);

    const cleanup = () => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
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

    // Execute rendering directly without relying on iframe.onload (which fails to fire in Chromium when document.write is used)
    (async () => {
      try {
        if (iframeDoc.fonts) {
          try { await iframeDoc.fonts.ready; } catch { /* ignore font error */ }
        }

        const imgs = Array.from(iframeDoc.querySelectorAll('img')) as HTMLImageElement[];
        await Promise.allSettled(imgs.map(img =>
          img.complete ? Promise.resolve() : new Promise<void>(res => {
            img.onload = () => res();
            img.onerror = () => res();
            setTimeout(res, 2000);
          })
        ));

        // Brief delay for layout stabilization
        await new Promise(r => setTimeout(r, 250));

        // Locate target page elements (.print-doc, .shipping-label, .label, or body)
        let targets: HTMLElement[] = Array.from(iframeDoc.querySelectorAll('.print-doc')) as HTMLElement[];
        if (targets.length === 0) {
          targets = Array.from(iframeDoc.querySelectorAll('.shipping-label')) as HTMLElement[];
        }
        if (targets.length === 0) {
          targets = Array.from(iframeDoc.querySelectorAll('.label')) as HTMLElement[];
        }
        if (targets.length === 0) {
          targets = [iframeDoc.body];
        }

        const blobs: Blob[] = [];

        for (const target of targets) {
          const canvas = await html2canvas(target, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            windowWidth: 794,
          });

          const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
          if (blob) {
            blobs.push(blob);
          }
        }

        clearTimeout(timer);
        cleanup();

        if (blobs.length > 0) {
          resolve(blobs);
        } else {
          reject(new Error('toBlob returned empty canvas blobs'));
        }

      } catch (err) {
        clearTimeout(timer);
        cleanup();
        reject(err);
      }
    })();
  });
}

/**
 * Renders HTML content to a single image blob using an invisible iframe.
 */
export async function renderHtmlToBlob(htmlContent: string, pageIndex?: number): Promise<Blob> {
  const blobs = await renderHtmlToBlobs(htmlContent);
  if (pageIndex !== undefined && pageIndex >= 0 && pageIndex < blobs.length) {
    return blobs[pageIndex];
  }
  return blobs[0];
}

/**
 * Directly downloads HTML content as a crisp A4 PDF file using jsPDF.save().
 * Supports multi-page PDF generation if multiple pages exist.
 */
export async function downloadHtmlAsPdf(htmlContent: string, fileName: string): Promise<void> {
  const blobs = await renderHtmlToBlobs(htmlContent);
  if (blobs.length === 0) throw new Error('No pages rendered');

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  for (let i = 0; i < blobs.length; i++) {
    if (i > 0) pdf.addPage('a4', 'portrait');

    const imageUrl = URL.createObjectURL(blobs[i]);
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          pdf.addImage(img, 'PNG', 0, 0, 210, 297);
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

  const finalName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  pdf.save(finalName);
}

/**
 * Programmatically generates PDF Blob for other handlers.
 */
export async function renderHtmlToPdfBlob(htmlContent: string): Promise<Blob> {
  const blobs = await renderHtmlToBlobs(htmlContent);
  if (blobs.length === 0) throw new Error('No pages rendered');

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  for (let i = 0; i < blobs.length; i++) {
    if (i > 0) pdf.addPage('a4', 'portrait');

    const imageUrl = URL.createObjectURL(blobs[i]);
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          pdf.addImage(img, 'PNG', 0, 0, 210, 297);
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

  return pdf.output('blob');
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
    if (m.url.startsWith('data:')) {
      urlCache.set(m.url, m.url);
      continue;
    }

    try {
      const dataUri = await toDataUri(m.url);
      urlCache.set(m.url, dataUri);
    } catch {
      urlCache.set(m.url, m.url);
    }
  }

  let result = html;
  for (const [originalUrl, newUrl] of urlCache.entries()) {
    if (newUrl && newUrl !== originalUrl) {
      result = result.replaceAll(originalUrl, newUrl);
    }
  }

  return result;
}

function toDataUri(url: string): Promise<string> {
  if (!url || url.startsWith('data:')) return Promise.resolve(url);

  let fullUrl = url;
  if (url.startsWith('/')) {
    fullUrl = window.location.origin + url;
  }

  // Attempt 1: fetch blob & convert to base64 data URL
  return (async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(fullUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (response.ok) {
        const blob = await response.blob();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch {
      // Fall through to Attempt 2
    }

    // Attempt 2: Image element + canvas
    return new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const timer = setTimeout(() => resolve(fullUrl), 3000);

      img.onload = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 150;
          canvas.height = img.naturalHeight || 150;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(fullUrl);
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(fullUrl);
        }
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve(fullUrl);
      };
      img.src = fullUrl;
    });
  })();
}

