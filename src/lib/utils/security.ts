/**
 * Security utilities for EcoScan
 * Input validation, sanitization, and security helpers
 */

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  // Remove script tags and dangerous characters
  return input.replace(/<script.*?>.*?<\/script>/gi, '')
    .replace(/[<>"'`;(){}]/g, '')
    .trim();
}

/**
 * Validate file uploads for security
 */
export function validateFileUpload(file: File): {
  isValid: boolean;
  error?: string;
  sanitizedName?: string;
} {
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File size exceeds 10MB limit'
    };
  }

  // Check file type
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp'
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Invalid file type. Only images are allowed.'
    };
  }

  // Sanitize filename
  const sanitizedName = file.name
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .slice(0, 100);

  return {
    isValid: true,
    sanitizedName
  };
}

/**
 * Validate URLs for security
 */
export function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Generate secure random IDs
 */
export function generateSecureId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older browsers
  return 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Rate limiting utility
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts = 10, windowMs = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }

    // Add current attempt
    recentAttempts.push(now);
    this.attempts.set(identifier, recentAttempts);
    
    return true;
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

/**
 * Content Security Policy helpers
 */
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'blob:'],
  'media-src': ["'self'", 'blob:'],
  'connect-src': ["'self'"],
  'font-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'frame-ancestors': ["'none'"]
};

/**
 * Validate and sanitize voice input
 */
export function sanitizeVoiceInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Only allow alphanumeric, spaces, and hyphens
    .slice(0, 200); // Limit length
}

/**
 * Secure local storage wrapper
 */
export class SecureStorage {
  private prefix: string;

  constructor(prefix = 'ecoscan_') {
    this.prefix = prefix;
  }

  set(key: string, value: any): boolean {
    try {
      const sanitizedKey = this.sanitizeKey(key);
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(this.prefix + sanitizedKey, serializedValue);
      return true;
    } catch (error) {
      console.warn('Failed to store data:', error);
      return false;
    }
  }

  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const sanitizedKey = this.sanitizeKey(key);
      const item = localStorage.getItem(this.prefix + sanitizedKey);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch (error) {
      console.warn('Failed to retrieve data:', error);
      return defaultValue || null;
    }
  }

  remove(key: string): boolean {
    try {
      const sanitizedKey = this.sanitizeKey(key);
      localStorage.removeItem(this.prefix + sanitizedKey);
      return true;
    } catch (error) {
      console.warn('Failed to remove data:', error);
      return false;
    }
  }

  clear(): boolean {
    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith(this.prefix))
        .forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.warn('Failed to clear data:', error);
      return false;
    }
  }

  private sanitizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
  }
}

/**
 * Check if running in secure context
 */
export function isSecureContext(): boolean {
  return typeof window !== 'undefined' && 
         (window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost');
}

/**
 * Validate camera permissions securely
 */
export async function validateCameraPermissions(): Promise<{
  hasPermission: boolean;
  error?: string;
}> {
  if (!isSecureContext()) {
    return {
      hasPermission: false,
      error: 'Camera access requires HTTPS or localhost'
    };
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      hasPermission: false,
      error: 'Camera API not supported'
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 640 },
        height: { ideal: 480 }
      } 
    });
    
    // Immediately stop the stream
    stream.getTracks().forEach(track => track.stop());
    
    return { hasPermission: true };
  } catch (error) {
    return {
      hasPermission: false,
      error: error instanceof Error ? error.message : 'Camera access denied'
    };
  }
}

/**
 * Secure error reporting
 */
export function sanitizeError(error: Error): {
  message: string;
  stack?: string;
  timestamp: number;
} {
  return {
    message: sanitizeInput(error.message),
    stack: error.stack ? sanitizeInput(error.stack.slice(0, 500)) : undefined,
    timestamp: Date.now()
  };
}

/**
 * Input validation schemas
 */
export const ValidationSchemas = {
  voiceInput: {
    minLength: 1,
    maxLength: 200,
    pattern: /^[a-zA-Z0-9\s\-.,!?]+$/
  },
  
  fileName: {
    minLength: 1,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9._\-]+$/
  },
  
  analyticsEvent: {
    minLength: 1,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_\-]+$/
  }
};

/**
 * Validate input against schema
 */
export function validateInput(
  input: string, 
  schema: typeof ValidationSchemas.voiceInput
): { isValid: boolean; error?: string } {
  if (typeof input !== 'string') {
    return { isValid: false, error: 'Input must be a string' };
  }

  if (input.length < schema.minLength) {
    return { isValid: false, error: `Input too short (min: ${schema.minLength})` };
  }

  if (input.length > schema.maxLength) {
    return { isValid: false, error: `Input too long (max: ${schema.maxLength})` };
  }

  if (!schema.pattern.test(input)) {
    return { isValid: false, error: 'Input contains invalid characters' };
  }

  return { isValid: true };
}

// Global security instance
export const secureStorage = new SecureStorage();
export const rateLimiter = new RateLimiter();

export function isValidInput(input: string): boolean {
  // Only allow alphanumeric, spaces, dashes, and underscores
  return /^[\w\s\-_]+$/.test(input);
}

export function safeSetLocalStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn('Failed to set localStorage:', error);
  }
}

export function safeGetLocalStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn('Failed to get localStorage:', error);
    return null;
  }
} 