import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Renders HTML content to an image blob using a hidden DOM container.
 * html2canvas runs locally with imported module — zero CDN dependency.
 */
export async function renderHtmlToBlob(htmlContent: string, pageIndex?: number): Promise<Blob> {
  const processedHtml = await inlineImages(htmlContent);

  return new Promise<Blob>((resolve, reject) => {
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:#ffffff;z-index:-9999;overflow:hidden;';
    container.innerHTML = processedHtml;
    document.body.appendChild(container);

    const cleanup = () => {
      if (document.body.contains(container)) document.body.removeChild(container);
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout 15s'));
    }, 15000);

    // Wait for images to load
    const imgs = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
    Promise.allSettled(imgs.map(img =>
      img.complete ? Promise.resolve() : new Promise<void>(res => {
        img.onload = () => res();
        img.onerror = () => { img.style.display = 'none'; res(); };
        setTimeout(res, 3000);
      })
    )).then(async () => {
      try {
        await new Promise(r => setTimeout(r, 300));

        let target: HTMLElement;
        if (pageIndex !== undefined) {
          const allDocs = Array.from(container.querySelectorAll('.print-doc')) as HTMLElement[];
          target = allDocs[pageIndex] || allDocs[0] || container;
        } else {
          target = container.querySelector('.print-doc') as HTMLElement
                || container.querySelector('.shipping-label') as HTMLElement
                || container.querySelector('.label') as HTMLElement
                || container;
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
    });
  });
}

/**
 * Finds all <img src="..."> in the HTML string and converts them to data URIs.
 * Never rejects — falls back to original URL if conversion fails or taints canvas.
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

/**
 * Fetches an image and converts it to a data URI safely.
 */
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

/**
 * Renders HTML content to a PDF Blob using imported html2canvas and jsPDF.
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
