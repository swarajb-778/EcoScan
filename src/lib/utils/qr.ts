/**
 * QR Code generation utilities for EcoScan
 * Enables easy sharing and access to the application
 */

export interface QRCodeOptions {
  size?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  color?: {
    dark?: string;
    light?: string;
  };
  format?: 'svg' | 'canvas' | 'dataurl';
}

export interface QRCodeResult {
  data: string | HTMLCanvasElement | SVGElement;
  url: string;
  options: Required<QRCodeOptions>;
}

/**
 * Generate QR code using browser-native canvas API
 */
export function generateQRCode(text: string, options: QRCodeOptions = {}): QRCodeResult {
  const opts: Required<QRCodeOptions> = {
    size: options.size || 256,
    margin: options.margin || 4,
    errorCorrectionLevel: options.errorCorrectionLevel || 'M',
    color: {
      dark: options.color?.dark || '#000000',
      light: options.color?.light || '#FFFFFF'
    },
    format: options.format || 'canvas'
  };

  // For now, create a simple canvas with placeholder
  // In production, this would use a QR code library like qrcode-generator
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = opts.size;
  canvas.height = opts.size;

  // Fill background
  ctx.fillStyle = opts.color.light!;
  ctx.fillRect(0, 0, opts.size, opts.size);

  // Draw placeholder QR pattern
  drawPlaceholderQR(ctx, opts);

  const dataUrl = canvas.toDataURL();

  return {
    data: opts.format === 'canvas' ? canvas : opts.format === 'dataurl' ? dataUrl : createSVGQR(text, opts),
    url: text,
    options: opts
  };
}

/**
 * Draw a placeholder QR code pattern
 */
function drawPlaceholderQR(ctx: CanvasRenderingContext2D, options: Required<QRCodeOptions>): void {
  const { size, margin, color } = options;
  const moduleSize = (size - margin * 2) / 25; // 25x25 modules for placeholder
  
  ctx.fillStyle = color.dark!;

  // Draw finder patterns (corners)
  drawFinderPattern(ctx, margin, margin, moduleSize);
  drawFinderPattern(ctx, size - margin - 7 * moduleSize, margin, moduleSize);
  drawFinderPattern(ctx, margin, size - margin - 7 * moduleSize, moduleSize);

  // Draw some random data modules for visual effect
  for (let i = 0; i < 25; i++) {
    for (let j = 0; j < 25; j++) {
      if (shouldSkipModule(i, j)) continue;
      
      if (Math.random() > 0.5) {
        const x = margin + i * moduleSize;
        const y = margin + j * moduleSize;
        ctx.fillRect(x, y, moduleSize, moduleSize);
      }
    }
  }
}

/**
 * Draw QR code finder pattern
 */
function drawFinderPattern(ctx: CanvasRenderingContext2D, x: number, y: number, moduleSize: number): void {
  // Outer 7x7 square
  ctx.fillRect(x, y, 7 * moduleSize, 7 * moduleSize);
  
  // Inner white square
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x + moduleSize, y + moduleSize, 5 * moduleSize, 5 * moduleSize);
  
  // Center 3x3 square
  ctx.fillStyle = '#000000';
  ctx.fillRect(x + 2 * moduleSize, y + 2 * moduleSize, 3 * moduleSize, 3 * moduleSize);
}

/**
 * Check if module should be skipped (finder patterns, etc.)
 */
function shouldSkipModule(i: number, j: number): boolean {
  // Skip finder patterns
  if ((i < 9 && j < 9) || (i > 15 && j < 9) || (i < 9 && j > 15)) {
    return true;
  }
  
  // Skip timing patterns
  if (i === 6 || j === 6) {
    return true;
  }
  
  return false;
}

/**
 * Create SVG QR code
 */
function createSVGQR(text: string, options: Required<QRCodeOptions>): SVGElement {
  const { size, color } = options;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  
  svg.setAttribute('width', size.toString());
  svg.setAttribute('height', size.toString());
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  
  // Background
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', '100%');
  bg.setAttribute('height', '100%');
  bg.setAttribute('fill', color.light!);
  svg.appendChild(bg);

  // Add placeholder text
  const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  textEl.setAttribute('x', '50%');
  textEl.setAttribute('y', '50%');
  textEl.setAttribute('text-anchor', 'middle');
  textEl.setAttribute('dominant-baseline', 'middle');
  textEl.setAttribute('font-family', 'monospace');
  textEl.setAttribute('font-size', '12');
  textEl.setAttribute('fill', color.dark!);
  textEl.textContent = 'QR Code';
  svg.appendChild(textEl);

  return svg;
}

/**
 * Generate QR code for EcoScan app access
 */
export function generateEcoScanQR(baseUrl: string = window.location.origin, options: QRCodeOptions = {}): QRCodeResult {
  const url = `${baseUrl}?ref=qr`;
  return generateQRCode(url, {
    ...options,
    size: options.size || 200,
    color: {
      dark: options.color?.dark || '#22c55e', // Green theme
      light: options.color?.light || '#ffffff'
    }
  });
}

/**
 * Generate QR code for specific detection sharing
 */
export function generateDetectionShareQR(
  detection: { class: string; category: string; confidence: number },
  baseUrl: string = window.location.origin,
  options: QRCodeOptions = {}
): QRCodeResult {
  const shareData = {
    item: detection.class,
    category: detection.category,
    confidence: Math.round(detection.confidence * 100)
  };
  
  const url = `${baseUrl}/share?data=${encodeURIComponent(JSON.stringify(shareData))}`;
  
  return generateQRCode(url, {
    ...options,
    size: options.size || 150
  });
}

/**
 * Create downloadable QR code image
 */
export function downloadQRCode(qrResult: QRCodeResult, filename: string = 'ecoscan-qr'): void {
  let dataUrl: string;
  
  if (qrResult.data instanceof HTMLCanvasElement) {
    dataUrl = qrResult.data.toDataURL('image/png');
  } else if (typeof qrResult.data === 'string') {
    dataUrl = qrResult.data;
  } else {
    // SVG element
    const svgData = new XMLSerializer().serializeToString(qrResult.data);
    const base64 = btoa(svgData);
    dataUrl = `data:image/svg+xml;base64,${base64}`;
  }

  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Copy QR code to clipboard
 */
export async function copyQRToClipboard(qrResult: QRCodeResult): Promise<boolean> {
  try {
    if (qrResult.data instanceof HTMLCanvasElement) {
      // Convert canvas to blob and copy
      return new Promise((resolve) => {
        (qrResult.data as HTMLCanvasElement).toBlob(async (blob: Blob | null) => {
          if (blob && navigator.clipboard && navigator.clipboard.write) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ]);
              resolve(true);
            } catch (error) {
              console.error('Failed to copy QR code:', error);
              resolve(false);
            }
          } else {
            resolve(false);
          }
        });
      });
    } else {
      // Copy URL as text
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(qrResult.url);
        return true;
      }
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
  }
  
  return false;
}

/**
 * Generate QR code for offline app access
 */
export function generateOfflineQR(options: QRCodeOptions = {}): QRCodeResult {
  // This would point to a PWA or cached version
  const offlineUrl = `${window.location.origin}/offline`;
  
  return generateQRCode(offlineUrl, {
    ...options,
    errorCorrectionLevel: 'H', // High error correction for better reliability
    color: {
      dark: options.color?.dark || '#6b7280', // Gray theme for offline
      light: options.color?.light || '#ffffff'
    }
  });
}

/**
 * Validate QR code content
 */
export function validateQRContent(content: string): {
  valid: boolean;
  type: 'url' | 'text' | 'json';
  data?: any;
} {
  // Check if it's a URL
  try {
    new URL(content);
    return { valid: true, type: 'url', data: content };
  } catch {
    // Not a URL, continue checking
  }

  // Check if it's JSON
  try {
    const data = JSON.parse(content);
    return { valid: true, type: 'json', data };
  } catch {
    // Not JSON, treat as text
  }

  return { 
    valid: content.length > 0 && content.length <= 4296, // QR code max capacity
    type: 'text',
    data: content
  };
}

/**
 * Generate batch QR codes for multiple items
 */
export function generateBatchQR(
  items: Array<{ text: string; label: string }>,
  options: QRCodeOptions = {}
): Array<QRCodeResult & { label: string }> {
  return items.map(item => ({
    ...generateQRCode(item.text, options),
    label: item.label
  }));
}

/**
 * Get QR code sharing options
 */
export function getQRSharingOptions(): Array<{
  name: string;
  description: string;
  action: (qr: QRCodeResult) => void;
}> {
  return [
    {
      name: 'Download',
      description: 'Save QR code as PNG image',
      action: (qr) => downloadQRCode(qr)
    },
    {
      name: 'Copy Image',
      description: 'Copy QR code to clipboard',
      action: (qr) => copyQRToClipboard(qr)
    },
    {
      name: 'Copy URL',
      description: 'Copy the URL to clipboard',
      action: (qr) => navigator.clipboard?.writeText(qr.url)
    },
    {
      name: 'Share',
      description: 'Share via Web Share API',
      action: (qr) => {
        if (navigator.share) {
          navigator.share({
            title: 'EcoScan - Waste Classification',
            text: 'Check out this AI-powered waste sorter!',
            url: qr.url
          });
        }
      }
    }
  ];
} 