/**
 * Security utilities for EcoScan
 * Handles input sanitization, CSP, and security headers
 */

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/[<>'"&]/g, (char) => {
      switch (char) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#x27;';
        case '&': return '&amp;';
        default: return char;
      }
    })
    .trim()
    .slice(0, 1000); // Limit length
}

/**
 * Validate file uploads for security
 */
export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF files are allowed.'
    };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 10MB.'
    };
  }

  // Check file name
  const sanitizedName = sanitizeFileName(file.name);
  if (sanitizedName !== file.name) {
    return {
      valid: false,
      error: 'Invalid characters in filename.'
    };
  }

  return { valid: true };
}

/**
 * Sanitize file names
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .replace(/\.{2,}/g, '.')
    .slice(0, 255);
}

/**
 * Content Security Policy configuration
 */
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Svelte
    "'wasm-unsafe-eval'", // Required for ONNX Runtime
    "https://cdn.jsdelivr.net" // For external libraries
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for Tailwind
    "https://fonts.googleapis.com"
  ],
  'font-src': [
    "'self'",
    "https://fonts.gstatic.com"
  ],
  'img-src': [
    "'self'",
    "data:", // For canvas/blob images
    "blob:" // For camera streams
  ],
  'media-src': [
    "'self'",
    "blob:" // For camera streams
  ],
  'worker-src': [
    "'self'",
    "blob:" // For ONNX workers
  ],
  'connect-src': [
    "'self'",
    "https://api.ecoscan.app" // API endpoints
  ],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"]
};

/**
 * Generate CSP header value
 */
export function generateCSPHeader(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

/**
 * Rate limiting for API calls
 */
export class RateLimiter {
  private attempts = new Map<string, { count: number; resetTime: number }>();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts = 100, windowMs = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record || now > record.resetTime) {
      // Reset or first attempt
      this.attempts.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }

    if (record.count >= this.maxAttempts) {
      return false;
    }

    record.count++;
    return true;
  }

  /**
   * Get remaining attempts
   */
  getRemainingAttempts(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record || Date.now() > record.resetTime) {
      return this.maxAttempts;
    }
    return Math.max(0, this.maxAttempts - record.count);
  }

  /**
   * Clean up expired records
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.attempts.entries()) {
      if (now > record.resetTime) {
        this.attempts.delete(key);
      }
    }
  }
}

/**
 * Secure random ID generation
 */
export function generateSecureId(length = 16): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash sensitive data
 */
export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate URL for security
 */
export function isValidUrl(url: string, allowedHosts?: string[]): boolean {
  try {
    const urlObj = new URL(url);
    
    // Only allow HTTPS (except localhost for development)
    if (urlObj.protocol !== 'https:' && !urlObj.hostname.includes('localhost')) {
      return false;
    }

    // Check allowed hosts if provided
    if (allowedHosts && !allowedHosts.includes(urlObj.hostname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Security headers for enhanced protection
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
};

/**
 * Monitor for potential security issues
 */
export class SecurityMonitor {
  private suspiciousActivities: Array<{
    type: string;
    timestamp: number;
    details: any;
  }> = [];

  /**
   * Report suspicious activity
   */
  reportActivity(type: string, details: any): void {
    this.suspiciousActivities.push({
      type,
      timestamp: Date.now(),
      details
    });

    // Keep only recent activities
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.suspiciousActivities = this.suspiciousActivities
      .filter(activity => activity.timestamp > oneHourAgo);

    // Check for patterns
    this.checkForPatterns();
  }

  private checkForPatterns(): void {
    const recentActivities = this.suspiciousActivities
      .filter(activity => activity.timestamp > Date.now() - 5 * 60 * 1000); // Last 5 minutes

    // Too many failed attempts
    const failedAttempts = recentActivities
      .filter(activity => activity.type === 'failed_upload' || activity.type === 'invalid_input');

    if (failedAttempts.length > 10) {
      console.warn('Security: High number of failed attempts detected');
      // In production, you might want to temporarily block the user
    }

    // Unusual file uploads
    const uploadAttempts = recentActivities
      .filter(activity => activity.type === 'file_upload');

    if (uploadAttempts.length > 20) {
      console.warn('Security: Unusual number of file uploads detected');
    }
  }

  /**
   * Get security report
   */
  getSecurityReport(): any {
    const now = Date.now();
    const last24Hours = now - 24 * 60 * 60 * 1000;
    
    const recentActivities = this.suspiciousActivities
      .filter(activity => activity.timestamp > last24Hours);

    const activityCounts = recentActivities.reduce((counts, activity) => {
      counts[activity.type] = (counts[activity.type] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    return {
      totalActivities: recentActivities.length,
      activityBreakdown: activityCounts,
      riskLevel: this.calculateRiskLevel(recentActivities)
    };
  }

  private calculateRiskLevel(activities: any[]): 'low' | 'medium' | 'high' {
    if (activities.length > 100) return 'high';
    if (activities.length > 50) return 'medium';
    return 'low';
  }
}

// Global security monitor instance
export const securityMonitor = new SecurityMonitor(); 