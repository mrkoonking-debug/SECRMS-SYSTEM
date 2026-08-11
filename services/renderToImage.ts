/**
 * Renders HTML content to an image blob using a fully isolated iframe.
 * html2canvas runs INSIDE the iframe — zero Tailwind interference.
 * Images are pre-converted to data URIs to avoid CORS/loading issues.
 */
export async function renderHtmlToBlob(htmlContent: string, pageIndex?: number): Promise<Blob> {
  // Pre-convert all image URLs to data URIs for reliable rendering
  const processedHtml = await inlineImages(htmlContent);

  return new Promise<Blob>((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:0;visibility:hidden;';
    document.body.appendChild(iframe);

    const cleanup = () => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
    };

    const timer = setTimeout(() => { cleanup(); reject(new Error('Timeout 20s')); }, 20000);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) { cleanup(); clearTimeout(timer); reject(new Error('No iframe doc')); return; }

    const fullHtml = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"><\/script>
</head>
<body style="margin:0;padding:0;background:#fff;">
${processedHtml}
</body></html>`;

    iframeDoc.open();
    iframeDoc.write(fullHtml);
    iframeDoc.close();

    iframe.onload = async () => {
      try {
        const iWin = iframe.contentWindow as any;
        const iDoc = iframe.contentDocument!;

        // Wait for html2canvas script
        let tries = 0;
        while (!iWin.html2canvas && tries < 50) {
          await new Promise(r => setTimeout(r, 200));
          tries++;
        }
        if (!iWin.html2canvas) throw new Error('html2canvas not loaded');

        // Wait for fonts
        if (iDoc.fonts) await iDoc.fonts.ready;

        // Wait for any remaining images
        const imgs = Array.from(iDoc.querySelectorAll('img')) as HTMLImageElement[];
        await Promise.allSettled(imgs.map(img =>
          img.complete ? Promise.resolve() : new Promise<void>(res => {
            img.onload = () => res();
            img.onerror = () => { img.style.display = 'none'; res(); };
            setTimeout(res, 5000);
          })
        ));

        // Settle time
        await new Promise(r => setTimeout(r, 500));

        // Capture - support selecting specific page by index
        let target: HTMLElement;
        if (pageIndex !== undefined) {
          const allDocs = Array.from(iDoc.querySelectorAll('.print-doc')) as HTMLElement[];
          target = allDocs[pageIndex] || allDocs[0] || iDoc.body;
        } else {
          target = iDoc.querySelector('.print-doc') as HTMLElement
                || iDoc.querySelector('.shipping-label') as HTMLElement
                || iDoc.body;
        }

        const canvas = await iWin.html2canvas(target, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: 794,
        });

        const blob = await new Promise<Blob>((res, rej) =>
          canvas.toBlob((b: Blob | null) => b ? res(b) : rej(new Error('toBlob failed')), 'image/png')
        );

        clearTimeout(timer);
        cleanup();
        resolve(blob);
      } catch (err) {
        clearTimeout(timer);
        cleanup();
        reject(err);
      }
    };

    iframe.onerror = () => { clearTimeout(timer); cleanup(); reject(new Error('iframe error')); };
  });
}

/**
 * Finds all <img src="..."> in the HTML string and converts them to data URIs.
 * This ensures images render correctly inside the iframe without CORS issues.
 */
async function inlineImages(html: string): Promise<string> {
  // Find all img src attributes
  const imgRegex = /(<img[^>]*\ssrc=["'])([^"']+)(["'][^>]*>)/gi;
  const matches: { full: string; prefix: string; url: string; suffix: string }[] = [];
  let match;
  
  while ((match = imgRegex.exec(html)) !== null) {
    matches.push({ full: match[0], prefix: match[1], url: match[2], suffix: match[3] });
  }

  if (matches.length === 0) return html;

  // Convert each unique URL to data URI
  const urlCache = new Map<string, string>();
  
  for (const m of matches) {
    if (urlCache.has(m.url)) continue;
    if (m.url.startsWith('data:')) { urlCache.set(m.url, m.url); continue; }

    try {
      const dataUri = await toDataUri(m.url);
      urlCache.set(m.url, dataUri);
    } catch {
      urlCache.set(m.url, m.url); // Keep original if conversion fails
    }
  }

  // Replace URLs in HTML
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
 * Fetches an image and converts it to a data URI.
 */
// Convert image URL to Data URI
function toDataUri(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('no ctx')); return; }
      ctx.drawImage(img, 0, 0);
      try {
        resolve(canvas.toDataURL('image/png'));
      } catch {
        reject(new Error('tainted'));
      }
    };
    img.onerror = () => reject(new Error('load failed'));
    // Resolve relative URLs
    if (url.startsWith('/')) {
      img.src = window.location.origin + url;
    } else {
      img.src = url;
    }
  });
}

/**
 * Renders HTML content to a PDF Blob using html2canvas and jsPDF.
 */
export async function renderHtmlToPdfBlob(htmlContent: string): Promise<Blob> {
  const imageBlob = await renderHtmlToBlob(htmlContent);
  const imageUrl = URL.createObjectURL(imageBlob);

  return new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const loadJsPdf = () => {
        try {
          const { jsPDF } = (window as any).jspdf;
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
          pdf.addImage(img, 'PNG', 0, 0, 210, 297);
          const pdfBlob = pdf.output('blob');
          URL.revokeObjectURL(imageUrl);
          resolve(pdfBlob);
        } catch (e) {
          URL.revokeObjectURL(imageUrl);
          reject(e);
        }
      };

      if ((window as any).jspdf) {
        loadJsPdf();
      } else {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => loadJsPdf();
        script.onerror = () => {
          URL.revokeObjectURL(imageUrl);
          reject(new Error('Failed to load jsPDF library'));
        };
        document.head.appendChild(script);
      }
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(imageUrl);
      reject(err);
    };
    img.src = imageUrl;
  });
}
