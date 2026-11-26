import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

export type PaperFormat = 'a4' | 'a3' | 'letter';
export type PrintOrientation = 'portrait' | 'landscape';
export type MarginPreset = 'normal' | 'narrow' | 'wide';
export type ColorMode = 'color' | 'grayscale';

export interface PrintOptions {
  paperFormat: PaperFormat;
  orientation: PrintOrientation;
  margins: MarginPreset;
  scalePct: number;
  colorMode: ColorMode;
}

export const MARGIN_MM: Record<MarginPreset, number> = {
  narrow: 5,
  normal: 10,
  wide: 16,
};

const CSS_PAGE_SIZE: Record<PaperFormat, string> = {
  a4: 'A4',
  a3: 'A3',
  letter: 'letter',
};

export function isEmbeddedIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function applyDynamicPrintPageCss(options: PrintOptions): void {
  let styleEl = document.getElementById(
    'dynamic-print-page'
  ) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dynamic-print-page';
    document.head.appendChild(styleEl);
  }
  const margin = MARGIN_MM[options.margins];
  const size = CSS_PAGE_SIZE[options.paperFormat];
  const zoom = Math.max(0.7, Math.min(1.15, options.scalePct / 100));
  const filterCss =
    options.colorMode === 'grayscale' ? 'filter: grayscale(100%);' : '';

  styleEl.textContent = `
    @media print {
      @page {
        size: ${size} ${options.orientation};
        margin: ${margin}mm ${margin}mm ${margin + 2}mm ${margin}mm;
      }
      .print-sheet {
        zoom: ${zoom};
        ${filterCss}
      }
    }
  `;
}

export function triggerNativePrint(options: PrintOptions): Promise<boolean> {
  applyDynamicPrintPageCss(options);

  return new Promise((resolve) => {
    let fired = false;
    const onBeforePrint = () => {
      fired = true;
    };
    window.addEventListener('beforeprint', onBeforePrint, { once: true });

    const start = performance.now();
    try {
      window.print();
    } catch {
      window.removeEventListener('beforeprint', onBeforePrint);
      resolve(false);
      return;
    }

    const elapsed = performance.now() - start;
    if (fired || elapsed > 120) {
      window.removeEventListener('beforeprint', onBeforePrint);
      resolve(true);
      return;
    }

    window.setTimeout(() => {
      window.removeEventListener('beforeprint', onBeforePrint);
      resolve(fired);
    }, 260);
  });
}

async function buildJsPdfFromElement(
  element: HTMLElement,
  options: PrintOptions
): Promise<jsPDF> {
  const prevFilter = element.style.filter;
  if (options.colorMode === 'grayscale') {
    element.style.filter = 'grayscale(100%)';
  }

  let dataUrl: string;
  try {
    dataUrl = await toPng(element, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      skipFonts: true,
      cacheBust: true,
    });
  } finally {
    element.style.filter = prevFilter;
  }

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () =>
      reject(new Error('Impossible de générer le rendu du document.'));
    img.src = dataUrl;
  });

  const pdf = new jsPDF({
    orientation: options.orientation === 'landscape' ? 'l' : 'p',
    unit: 'mm',
    format: options.paperFormat,
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = MARGIN_MM[options.margins];
  const scaleFactor = Math.max(0.7, Math.min(1.0, options.scalePct / 100));
  const printableWidth = (pageWidth - margin * 2) * scaleFactor;
  const printableHeight = pageHeight - margin * 2;
  const offsetX = margin + (pageWidth - margin * 2 - printableWidth) / 2;

  const imgWidthMm = printableWidth;
  const imgHeightMm = (img.height * imgWidthMm) / img.width;

  let heightLeft = imgHeightMm;
  let position = margin;

  pdf.addImage(
    dataUrl,
    'PNG',
    offsetX,
    position,
    imgWidthMm,
    imgHeightMm,
    undefined,
    'FAST'
  );
  heightLeft -= printableHeight;

  while (heightLeft > 1) {
    position = margin - (imgHeightMm - heightLeft);
    pdf.addPage();
    pdf.addImage(
      dataUrl,
      'PNG',
      offsetX,
      position,
      imgWidthMm,
      imgHeightMm,
      undefined,
      'FAST'
    );
    heightLeft -= printableHeight;
  }

  pdf.autoPrint({ variant: 'non-conform' });
  return pdf;
}

export async function exportSheetToPdf(
  element: HTMLElement,
  fileName: string,
  options: PrintOptions
): Promise<void> {
  const pdf = await buildJsPdfFromElement(element, options);
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, '_');
  pdf.save(safeName.endsWith('.pdf') ? safeName : `${safeName}.pdf`);
}

export async function createPdfBlobUrl(
  element: HTMLElement,
  options: PrintOptions
): Promise<string> {
  const pdf = await buildJsPdfFromElement(element, options);
  const blob = pdf.output('blob');
  return URL.createObjectURL(blob);
}

const imageDataUrlCache = new Map<string, string>();

async function toDataUrl(src: string): Promise<string> {
  if (!src || src.startsWith('data:')) return src;
  const cached = imageDataUrlCache.get(src);
  if (cached) return cached;

  try {
    const res = await fetch(src);
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || src));
      reader.onerror = () => reject();
      reader.readAsDataURL(blob);
    });
    imageDataUrlCache.set(src, dataUrl);
    return dataUrl;
  } catch {
    return src;
  }
}

function collectDocumentStyles(): string {
  const cssParts: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules;
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        cssParts.push(rule.cssText);
      }
    } catch {
      // Cross-origin stylesheet - skip safely
    }
  }
  return cssParts.join('\n');
}

export async function createPrintableHtmlBlobUrl(
  element: HTMLElement,
  title: string,
  options: PrintOptions
): Promise<string> {
  const clone = element.cloneNode(true) as HTMLElement;
  const imgs = Array.from(clone.querySelectorAll('img'));
  await Promise.all(
    imgs.map(async (img) => {
      const rawSrc = img.getAttribute('src') || '';
      if (rawSrc) {
        img.setAttribute('src', await toDataUrl(rawSrc));
      }
    })
  );

  const collectedCss = collectDocumentStyles();
  const safeTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const margin = MARGIN_MM[options.margins];
  const size = CSS_PAGE_SIZE[options.paperFormat];
  const zoom = Math.max(0.7, Math.min(1.15, options.scalePct / 100));
  const filterCss =
    options.colorMode === 'grayscale' ? 'filter: grayscale(100%);' : '';

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>${safeTitle}</title>
  <style>
    ${collectedCss}
    @page {
      size: ${size} ${options.orientation};
      margin: ${margin}mm ${margin}mm ${margin + 2}mm ${margin}mm;
    }
    body {
      background: #f1f5f9;
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
    }
    .print-sheet {
      zoom: ${zoom};
      ${filterCss}
    }
    .standalone-toolbar {
      max-width: ${options.orientation === 'landscape' ? '1060px' : '920px'};
      margin: 0 auto 16px auto;
      padding: 12px 16px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-size: 13px;
    }
    .standalone-btn {
      background: #1d4ed8;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
    }
    .standalone-btn:hover {
      background: #1e40af;
    }
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .standalone-toolbar {
        display: none !important;
      }
      .print-sheet {
        border: none !important;
        box-shadow: none !important;
        margin: 0 !important;
        padding: 0 !important;
        max-width: none !important;
        width: 100% !important;
      }
    }
  </style>
</head>
<body>
  <div class="standalone-toolbar">
    <div>
      <strong>${safeTitle}</strong> — ${size} ${
    options.orientation === 'landscape' ? 'Paysage' : 'Portrait'
  }
      <div style="font-size: 11px; color: #475569; margin-top: 2px;">
        Si la fenêtre d'impression ne s'ouvre pas automatiquement, appuyez sur <strong>Ctrl + P</strong> (ou cliquez sur le bouton).
      </div>
    </div>
    <button type="button" class="standalone-btn" onclick="window.print()">
      Imprimer (Ctrl + P)
    </button>
  </div>
  ${clone.outerHTML}
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () {
        try { window.print(); } catch (e) {}
      }, 250);
    });
  </script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  return URL.createObjectURL(blob);
}
