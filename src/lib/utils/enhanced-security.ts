/**
 * Enhanced Security System
 * Enterprise-grade security with CSP monitoring, threat detection, and secure data handling
 */

export interface SecurityPolicy {
  contentSecurityPolicy: {
    directives: Record<string, string[]>;
    reportUri?: string;
    enforceHttps: boolean;
  };
  dataProtection: {
    encryptLocalStorage: boolean;
    sanitizeInputs: boolean;
    validateFileUploads: boolean;
    sessionTimeout: number; // minutes
  };
  threatDetection: {
    enableXSSDetection: boolean;
    enableCSRFProtection: boolean;
    rateLimiting: {
      enabled: boolean;
      maxRequests: number;
      timeWindow: number; // minutes
    };
    suspiciousActivityDetection: boolean;
  };
  privacyControls: {
    cookieConsent: boolean;
    dataMinimization: boolean;
    rightToErasure: boolean;
    dataPortability: boolean;
  };
}

export interface SecurityThreat {
  id: string;
  type: 'xss' | 'csrf' | 'injection' | 'dos' | 'data-breach' | 'suspicious-activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source: string;
  timestamp: number;
  blocked: boolean;
  details: Record<string, any>;
}

export interface SecurityEvent {
  id: string;
  type: 'policy-violation' | 'threat-detected' | 'auth-failure' | 'data-access' | 'system-change';
  timestamp: number;
  user?: string;
  source: string;
  details: Record<string, any>;
  riskScore: number;
}

export interface DataClassification {
  type: 'public' | 'internal' | 'confidential' | 'restricted';
  category: 'user-data' | 'system-data' | 'analytics' | 'temporary';
  retention: number; // days
  encryption: boolean;
  accessLevel: string[];
}

class EnhancedSecurity {
  private policy: SecurityPolicy;
  private threats: SecurityThreat[] = [];
  private securityEvents: SecurityEvent[] = [];
  private encryptionKey: CryptoKey | null = null;
  private sessionData: Map<string, { timestamp: number; data: any }> = new Map();
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private suspiciousPatterns: RegExp[] = [];
  
  // Security monitoring
  private cspObserver: ReportingObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private integrityMonitor: NodeJS.Timeout | null = null;
  
  // Callbacks
  private onThreatDetectedCallback: ((threat: SecurityThreat) => void) | null = null;
  private onSecurityEventCallback: ((event: SecurityEvent) => void) | null = null;

  constructor() {
    this.policy = this.getDefaultSecurityPolicy();
    this.initializeSecurity();
    this.setupSuspiciousPatterns();
  }

  /**
   * Initialize security system
   */
  private async initializeSecurity(): Promise<void> {
    await this.initializeEncryption();
    this.setupCSPMonitoring();
    this.setupDOMIntegrityMonitoring();
    this.setupEventListeners();
    this.startSecurityMonitoring();
    
    console.log('[EnhancedSecurity] Security system initialized');
  }

  /**
   * Get default security policy
   */
  private getDefaultSecurityPolicy(): SecurityPolicy {
    return {
      contentSecurityPolicy: {
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'unsafe-eval'"], // Note: unsafe-eval needed for ML models
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'blob:', 'https:'],
          'font-src': ["'self'", 'https://fonts.gstatic.com'],
          'connect-src': ["'self'", 'https:', 'wss:'],
          'media-src': ["'self'", 'blob:'],
          'worker-src': ["'self'", 'blob:'],
          'frame-ancestors': ["'none'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"]
        },
        reportUri: '/api/csp-report',
        enforceHttps: true
      },
      dataProtection: {
        encryptLocalStorage: true,
        sanitizeInputs: true,
        validateFileUploads: true,
        sessionTimeout: 30
      },
      threatDetection: {
        enableXSSDetection: true,
        enableCSRFProtection: true,
        rateLimiting: {
          enabled: true,
          maxRequests: 100,
          timeWindow: 15
        },
        suspiciousActivityDetection: true
      },
      privacyControls: {
        cookieConsent: true,
        dataMinimization: true,
        rightToErasure: true,
        dataPortability: true
      }
    };
  }

  /**
   * Initialize encryption for sensitive data
   */
  private async initializeEncryption(): Promise<void> {
    if (!window.crypto || !window.crypto.subtle) {
      console.warn('[EnhancedSecurity] Web Crypto API not available');
      return;
    }

    try {
      // Generate or retrieve encryption key
      const keyData = localStorage.getItem('ecoscan_security_key');
      
      if (keyData) {
        // Import existing key
        const keyBuffer = this.base64ToArrayBuffer(keyData);
        this.encryptionKey = await window.crypto.subtle.importKey(
          'raw',
          keyBuffer,
          { name: 'AES-GCM' },
          false,
          ['encrypt', 'decrypt']
        );
      } else {
        // Generate new key
        this.encryptionKey = await window.crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        );
        
        // Export and store key
        const keyBuffer = await window.crypto.subtle.exportKey('raw', this.encryptionKey);
        const keyData = this.arrayBufferToBase64(keyBuffer);
        localStorage.setItem('ecoscan_security_key', keyData);
      }
      
      console.log('[EnhancedSecurity] Encryption initialized');
    } catch (error) {
      console.error('[EnhancedSecurity] Failed to initialize encryption:', error);
    }
  }

  /**
   * Setup Content Security Policy monitoring
   */
  private setupCSPMonitoring(): void {
    // Set CSP header (in a real app, this would be done server-side)
    this.setCSPMeta();
    
    // Monitor CSP violations using Reporting Observer
    if ('ReportingObserver' in window) {
      this.cspObserver = new ReportingObserver((reports) => {
        reports.forEach(report => {
          if (report.type === 'csp-violation') {
            this.handleCSPViolation(report.body as any);
          }
        });
      });
      
      this.cspObserver.observe();
    }
    
    // Fallback: Listen for CSP violation events
    document.addEventListener('securitypolicyviolation', (event) => {
      this.handleCSPViolation({
        documentURL: event.documentURI,
        violatedDirective: event.violatedDirective,
        blockedURL: event.blockedURI,
        sourceFile: event.sourceFile,
        lineNumber: event.lineNumber,
        columnNumber: event.columnNumber
      });
    });
  }

  /**
   * Set CSP meta tag
   */
  private setCSPMeta(): void {
    const cspValue = Object.entries(this.policy.contentSecurityPolicy.directives)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');
    
    let metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]') as HTMLMetaElement;
    
    if (!metaCSP) {
      metaCSP = document.createElement('meta');
      metaCSP.httpEquiv = 'Content-Security-Policy';
      document.head.appendChild(metaCSP);
    }
    
    metaCSP.content = cspValue;
  }

  /**
   * Handle CSP violations
   */
  private handleCSPViolation(violation: any): void {
    const threat: SecurityThreat = {
      id: this.generateId(),
      type: 'injection',
      severity: 'high',
      description: `CSP violation: ${violation.violatedDirective}`,
      source: violation.documentURL,
      timestamp: Date.now(),
      blocked: true,
      details: violation
    };
    
    this.recordThreat(threat);
    
    // Check if this is a potential XSS attempt
    if (violation.violatedDirective.includes('script-src') || 
        violation.violatedDirective.includes('unsafe-inline')) {
      threat.type = 'xss';
      threat.severity = 'critical';
    }
  }

  /**
   * Setup DOM integrity monitoring
   */
  private setupDOMIntegrityMonitoring(): void {
    if (this.policy.threatDetection.enableXSSDetection) {
      this.mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          this.checkForSuspiciousChanges(mutation);
        });
      });
      
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['onclick', 'onload', 'onerror', 'src', 'href']
      });
    }
  }

  /**
   * Check for suspicious DOM changes
   */
  private checkForSuspiciousChanges(mutation: MutationRecord): void {
    // Check for script injection
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          
          // Check for script tags
          if (element.tagName === 'SCRIPT') {
            this.detectScriptInjection(element as HTMLScriptElement);
          }
          
          // Check for inline event handlers
          this.checkForInlineEventHandlers(element);
        }
      });
    }
    
    // Check attribute changes for event handlers
    if (mutation.type === 'attributes' && mutation.attributeName) {
      const target = mutation.target as Element;
      if (mutation.attributeName.startsWith('on')) {
        this.detectInlineEventHandler(target, mutation.attributeName);
      }
    }
  }

  /**
   * Detect script injection attempts
   */
  private detectScriptInjection(script: HTMLScriptElement): void {
    const threat: SecurityThreat = {
      id: this.generateId(),
      type: 'xss',
      severity: 'critical',
      description: 'Potential script injection detected',
      source: script.src || 'inline',
      timestamp: Date.now(),
      blocked: false,
      details: {
        src: script.src,
        content: script.textContent?.substring(0, 100),
        attributes: Array.from(script.attributes).map(attr => ({ name: attr.name, value: attr.value }))
      }
    };
    
    // Check against suspicious patterns
    if (this.containsSuspiciousContent(script.textContent || script.src)) {
      script.remove();
      threat.blocked = true;
    }
    
    this.recordThreat(threat);
  }

  /**
   * Check for inline event handlers
   */
  private checkForInlineEventHandlers(element: Element): void {
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) {
        this.detectInlineEventHandler(element, attr.name);
      }
    });
  }

  /**
   * Detect inline event handler injection
   */
  private detectInlineEventHandler(element: Element, attributeName: string): void {
    const attributeValue = element.getAttribute(attributeName);
    
    if (attributeValue && this.containsSuspiciousContent(attributeValue)) {
      const threat: SecurityThreat = {
        id: this.generateId(),
        type: 'xss',
        severity: 'high',
        description: 'Suspicious inline event handler detected',
        source: element.tagName,
        timestamp: Date.now(),
        blocked: true,
        details: {
          element: element.tagName,
          attribute: attributeName,
          value: attributeValue,
          removed: true
        }
      };
      
      element.removeAttribute(attributeName);
      this.recordThreat(threat);
    }
  }

  /**
   * Setup suspicious pattern matching
   */
  private setupSuspiciousPatterns(): void {
    this.suspiciousPatterns = [
      /javascript:/i,
      /vbscript:/i,
      /on\w+\s*=/i,
      /<script[\s\S]*?>/i,
      /eval\s*\(/i,
      /document\.write/i,
      /innerHTML\s*=/i,
      /fromCharCode/i,
      /String\.fromCharCode/i,
      /unescape/i,
      /decodeURI/i,
      /alert\s*\(/i,
      /confirm\s*\(/i,
      /prompt\s*\(/i
    ];
  }

  /**
   * Check if content contains suspicious patterns
   */
  private containsSuspiciousContent(content: string): boolean {
    return this.suspiciousPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Setup security event listeners
   */
  private setupEventListeners(): void {
    // Rate limiting monitoring
    if (this.policy.threatDetection.rateLimiting.enabled) {
      this.setupRateLimiting();
    }
    
    // Session monitoring
    this.setupSessionMonitoring();
    
    // Form submission monitoring
    document.addEventListener('submit', (event) => {
      this.validateFormSubmission(event);
    });
    
    // File upload monitoring
    document.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement;
      if (target.type === 'file') {
        this.validateFileUpload(target);
      }
    });
  }

  /**
   * Setup rate limiting
   */
  private setupRateLimiting(): void {
    const originalFetch = window.fetch;
    
    window.fetch = ((...args) => {
      const url = args[0] as string;
      const clientId = this.getClientId();
      
      if (this.isRateLimited(clientId)) {
        const threat: SecurityThreat = {
          id: this.generateId(),
          type: 'dos',
          severity: 'medium',
          description: 'Rate limit exceeded',
          source: url,
          timestamp: Date.now(),
          blocked: true,
          details: { clientId, url }
        };
        
        this.recordThreat(threat);
        return Promise.reject(new Error('Rate limit exceeded'));
      }
      
      this.recordRequest(clientId);
      return originalFetch.apply(this, args);
    }) as typeof fetch;
  }

  /**
   * Check if client is rate limited
   */
  private isRateLimited(clientId: string): boolean {
    const { maxRequests, timeWindow } = this.policy.threatDetection.rateLimiting;
    const now = Date.now();
    const windowStart = now - (timeWindow * 60 * 1000);
    
    let requestData = this.requestCounts.get(clientId);
    
    if (!requestData || requestData.resetTime < windowStart) {
      requestData = { count: 0, resetTime: now };
      this.requestCounts.set(clientId, requestData);
    }
    
    return requestData.count >= maxRequests;
  }

  /**
   * Record API request for rate limiting
   */
  private recordRequest(clientId: string): void {
    const requestData = this.requestCounts.get(clientId) || { count: 0, resetTime: Date.now() };
    requestData.count++;
    this.requestCounts.set(clientId, requestData);
  }

  /**
   * Get client identifier
   */
  private getClientId(): string {
    // In a real application, this would be based on user session, IP, etc.
    return 'client-' + (sessionStorage.getItem('client-id') || Math.random().toString(36));
  }

  /**
   * Setup session monitoring
   */
  private setupSessionMonitoring(): void {
    const sessionTimeout = this.policy.dataProtection.sessionTimeout * 60 * 1000;
    
    setInterval(() => {
      const now = Date.now();
      
      this.sessionData.forEach((session, key) => {
        if (now - session.timestamp > sessionTimeout) {
          this.sessionData.delete(key);
          this.recordSecurityEvent({
            type: 'system-change',
            source: 'session-manager',
            details: { action: 'session-expired', sessionId: key },
            riskScore: 1
          });
        }
      });
    }, 60000); // Check every minute
  }

  /**
   * Validate form submissions
   */
  private validateFormSubmission(event: SubmitEvent): void {
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    
    // Sanitize and validate inputs
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        if (this.containsSuspiciousContent(value)) {
          event.preventDefault();
          
          const threat: SecurityThreat = {
            id: this.generateId(),
            type: 'injection',
            severity: 'high',
            description: 'Malicious content in form submission',
            source: form.action || window.location.href,
            timestamp: Date.now(),
            blocked: true,
            details: { field: key, value: value.substring(0, 100) }
          };
          
          this.recordThreat(threat);
          return;
        }
        
        // Sanitize input
        if (this.policy.dataProtection.sanitizeInputs) {
          formData.set(key, this.sanitizeInput(value));
        }
      }
    }
  }

  /**
   * Validate file uploads
   */
  private validateFileUpload(input: HTMLInputElement): void {
    if (!this.policy.dataProtection.validateFileUploads || !input.files) return;
    
    Array.from(input.files).forEach(file => {
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        this.recordThreat({
          id: this.generateId(),
          type: 'injection',
          severity: 'medium',
          description: 'Invalid file type uploaded',
          source: file.name,
          timestamp: Date.now(),
          blocked: true,
          details: { fileName: file.name, fileType: file.type, fileSize: file.size }
        });
        
        input.value = '';
        return;
      }
      
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        this.recordThreat({
          id: this.generateId(),
          type: 'dos',
          severity: 'medium',
          description: 'File size exceeds limit',
          source: file.name,
          timestamp: Date.now(),
          blocked: true,
          details: { fileName: file.name, fileSize: file.size }
        });
        
        input.value = '';
        return;
      }
    });
  }

  /**
   * Sanitize user input
   */
  private sanitizeInput(input: string): string {
    return input
      .replace(/[<>\"']/g, (match) => {
        const entities: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;'
        };
        return entities[match];
      })
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  /**
   * Start continuous security monitoring
   */
  private startSecurityMonitoring(): void {
    this.integrityMonitor = setInterval(() => {
      this.performSecurityCheck();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Perform periodic security checks
   */
  private performSecurityCheck(): void {
    // Check for DOM tampering
    this.checkDOMIntegrity();
    
    // Monitor for suspicious network activity
    this.monitorNetworkActivity();
    
    // Check session security
    this.validateSessionSecurity();
    
    // Clean up old threats and events
    this.cleanupOldData();
  }

  /**
   * Check DOM integrity
   */
  private checkDOMIntegrity(): void {
    // Check for unexpected script tags
    const scripts = document.querySelectorAll('script:not([data-ecoscan-verified])');
    if (scripts.length > 0) {
      scripts.forEach(script => {
        if (this.containsSuspiciousContent(script.textContent || script.getAttribute('src') || '')) {
          this.recordThreat({
            id: this.generateId(),
            type: 'xss',
            severity: 'critical',
            description: 'Unverified script detected in DOM',
            source: script.getAttribute('src') || 'inline',
            timestamp: Date.now(),
            blocked: false,
            details: { element: script.outerHTML.substring(0, 200) }
          });
        }
      });
    }
  }

  /**
   * Monitor network activity
   */
  private monitorNetworkActivity(): void {
    // This would typically monitor outgoing requests for data exfiltration
    // For now, we'll check for suspicious localStorage usage
    const storageUsage = this.getStorageUsage();
    
    if (storageUsage.total > 5 * 1024 * 1024) { // 5MB threshold
      this.recordSecurityEvent({
        type: 'data-access',
        source: 'storage-monitor',
        details: { usage: storageUsage, threshold: '5MB' },
        riskScore: 3
      });
    }
  }

  /**
   * Get storage usage statistics
   */
  private getStorageUsage(): { localStorage: number; sessionStorage: number; total: number } {
    const getStorageSize = (storage: Storage): number => {
      let size = 0;
      for (let key in storage) {
        if (storage.hasOwnProperty(key)) {
          size += storage[key].length + key.length;
        }
      }
      return size;
    };
    
    const localSize = getStorageSize(localStorage);
    const sessionSize = getStorageSize(sessionStorage);
    
    return {
      localStorage: localSize,
      sessionStorage: sessionSize,
      total: localSize + sessionSize
    };
  }

  /**
   * Validate session security
   */
  private validateSessionSecurity(): void {
    // Check for session hijacking indicators
    const userAgent = navigator.userAgent;
    const screenResolution = `${screen.width}x${screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    const sessionFingerprint = btoa(`${userAgent}|${screenResolution}|${timezone}`);
    const storedFingerprint = sessionStorage.getItem('session-fingerprint');
    
    if (storedFingerprint && storedFingerprint !== sessionFingerprint) {
      this.recordThreat({
        id: this.generateId(),
        type: 'suspicious-activity',
        severity: 'high',
        description: 'Session fingerprint mismatch detected',
        source: 'session-validator',
        timestamp: Date.now(),
        blocked: false,
        details: { stored: storedFingerprint, current: sessionFingerprint }
      });
    } else if (!storedFingerprint) {
      sessionStorage.setItem('session-fingerprint', sessionFingerprint);
    }
  }

  /**
   * Clean up old security data
   */
  private cleanupOldData(): void {
    const retentionPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
    const cutoffTime = Date.now() - retentionPeriod;
    
    this.threats = this.threats.filter(threat => threat.timestamp > cutoffTime);
    this.securityEvents = this.securityEvents.filter(event => event.timestamp > cutoffTime);
  }

  /**
   * Encrypt sensitive data
   */
  async encryptData(data: string): Promise<string | null> {
    if (!this.encryptionKey) return null;
    
    try {
      const encoder = new TextEncoder();
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.encryptionKey,
        encoder.encode(data)
      );
      
      const encryptedArray = new Uint8Array(encrypted);
      const combined = new Uint8Array(iv.length + encryptedArray.length);
      combined.set(iv);
      combined.set(encryptedArray, iv.length);
      
      return this.arrayBufferToBase64(combined.buffer);
    } catch (error) {
      console.error('[EnhancedSecurity] Encryption failed:', error);
      return null;
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decryptData(encryptedData: string): Promise<string | null> {
    if (!this.encryptionKey) return null;
    
    try {
      const combined = this.base64ToArrayBuffer(encryptedData);
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        this.encryptionKey,
        encrypted
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('[EnhancedSecurity] Decryption failed:', error);
      return null;
    }
  }

  /**
   * Secure localStorage wrapper
   */
  async setSecureItem(key: string, value: string): Promise<void> {
    if (this.policy.dataProtection.encryptLocalStorage) {
      const encrypted = await this.encryptData(value);
      if (encrypted) {
        localStorage.setItem(key, encrypted);
      }
    } else {
      localStorage.setItem(key, value);
    }
  }

  /**
   * Secure localStorage getter
   */
  async getSecureItem(key: string): Promise<string | null> {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    if (this.policy.dataProtection.encryptLocalStorage) {
      return await this.decryptData(stored);
    } else {
      return stored;
    }
  }

  /**
   * Record security threat
   */
  private recordThreat(threat: SecurityThreat): void {
    this.threats.push(threat);
    this.onThreatDetectedCallback?.(threat);
    
    // Also record as security event
    this.recordSecurityEvent({
      type: 'threat-detected',
      source: threat.source,
      details: threat,
      riskScore: this.calculateRiskScore(threat)
    });
    
    console.warn('[EnhancedSecurity] Threat detected:', threat);
  }

  /**
   * Record security event
   */
  private recordSecurityEvent(eventData: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
    const event: SecurityEvent = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...eventData
    };
    
    this.securityEvents.push(event);
    this.onSecurityEventCallback?.(event);
  }

  /**
   * Calculate risk score for threat
   */
  private calculateRiskScore(threat: SecurityThreat): number {
    const severityScores = { low: 1, medium: 3, high: 6, critical: 10 };
    const typeModifiers = { 
      xss: 1.5, 
      csrf: 1.2, 
      injection: 1.5, 
      'dos': 0.8, 
      'data-breach': 2.0, 
      'suspicious-activity': 1.0 
    };
    
    return severityScores[threat.severity] * typeModifiers[threat.type];
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Get security report
   */
  getSecurityReport(): {
    policy: SecurityPolicy;
    threatsSummary: {
      total: number;
      byType: Record<string, number>;
      bySeverity: Record<string, number>;
      blocked: number;
    };
    recentEvents: SecurityEvent[];
    riskScore: number;
  } {
    const threatsByType = this.threats.reduce((acc, threat) => {
      acc[threat.type] = (acc[threat.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const threatsBySeverity = this.threats.reduce((acc, threat) => {
      acc[threat.severity] = (acc[threat.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const blockedThreats = this.threats.filter(t => t.blocked).length;
    
    const riskScore = this.securityEvents
      .slice(-10)
      .reduce((sum, event) => sum + event.riskScore, 0) / 10;
    
    return {
      policy: this.policy,
      threatsSummary: {
        total: this.threats.length,
        byType: threatsByType,
        bySeverity: threatsBySeverity,
        blocked: blockedThreats
      },
      recentEvents: this.securityEvents.slice(-20),
      riskScore
    };
  }

  /**
   * Set security callbacks
   */
  setCallbacks(
    onThreatDetected: (threat: SecurityThreat) => void,
    onSecurityEvent: (event: SecurityEvent) => void
  ): void {
    this.onThreatDetectedCallback = onThreatDetected;
    this.onSecurityEventCallback = onSecurityEvent;
  }

  /**
   * Update security policy
   */
  updatePolicy(newPolicy: Partial<SecurityPolicy>): void {
    this.policy = { ...this.policy, ...newPolicy };
    this.setCSPMeta(); // Update CSP if changed
  }

  /**
   * Get current threats
   */
  getThreats(severity?: SecurityThreat['severity']): SecurityThreat[] {
    if (severity) {
      return this.threats.filter(threat => threat.severity === severity);
    }
    return [...this.threats];
  }

  /**
   * Clear threats and events
   */
  clearSecurityData(): void {
    this.threats = [];
    this.securityEvents = [];
  }

  /**
   * Destroy security system
   */
  destroy(): void {
    if (this.cspObserver) {
      this.cspObserver.disconnect();
    }
    
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    
    if (this.integrityMonitor) {
      clearInterval(this.integrityMonitor);
    }
    
    this.clearSecurityData();
  }
}

export const enhancedSecurity = new EnhancedSecurity();
export default EnhancedSecurity; 