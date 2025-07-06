/**
 * Security Hardening System for EcoScan
 * Handles CSP violations, XSS prevention, data sanitization, and security monitoring
 */

export interface SecurityThreat {
  id: string;
  type: 'xss' | 'csp_violation' | 'injection' | 'data_leak' | 'unauthorized_access' | 'malformed_data';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  details: string;
  timestamp: number;
  blocked: boolean;
  userAgent: string;
  ipAddress?: string;
}

export interface SecurityConfig {
  enableCSPMonitoring: boolean;
  enableXSSProtection: boolean;
  enableDataSanitization: boolean;
  enableIntegrityChecks: boolean;
  strictMode: boolean;
  reportingEndpoint?: string;
  allowedDomains: string[];
  blockedPatterns: RegExp[];
}

export interface SecurityMetrics {
  totalThreats: number;
  threatsBlocked: number;
  threatsByType: Record<string, number>;
  lastThreatDetected: number;
  securityScore: number;
}

export class SecurityHardeningSystem {
  private threats: SecurityThreat[] = [];
  private config: SecurityConfig;
  private metrics: SecurityMetrics;
  private trustedOrigins: Set<string> = new Set();
  private sanitizers: Map<string, (input: any) => any> = new Map();
  private validators: Map<string, (input: any) => boolean> = new Map();
  
  private readonly MAX_THREATS = 1000;
  private readonly THREAT_RETENTION = 24 * 60 * 60 * 1000; // 24 hours

  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      enableCSPMonitoring: true,
      enableXSSProtection: true,
      enableDataSanitization: true,
      enableIntegrityChecks: true,
      strictMode: false,
      allowedDomains: ['localhost', window.location.hostname],
      blockedPatterns: [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /eval\s*\(/gi,
        /<iframe/gi
      ],
      ...config
    };
    
    this.metrics = {
      totalThreats: 0,
      threatsBlocked: 0,
      threatsByType: {},
      lastThreatDetected: 0,
      securityScore: 100
    };
    
    this.initialize();
  }

  private initialize(): void {
    this.setupCSPMonitoring();
    this.setupXSSProtection();
    this.setupDefaultSanitizers();
    this.setupDefaultValidators();
    this.setupTrustedOrigins();
    this.setupIntegrityChecks();
    
    console.log('🛡️ Security hardening system initialized');
  }

  private setupCSPMonitoring(): void {
    if (!this.config.enableCSPMonitoring) return;
    
    document.addEventListener('securitypolicyviolation', (event) => {
      this.handleCSPViolation(event);
    });
    
    // Monitor for inline script attempts
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            this.checkForUnsafeContent(element);
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private handleCSPViolation(event: SecurityPolicyViolationEvent): void {
    const threat: SecurityThreat = {
      id: this.generateId(),
      type: 'csp_violation',
      severity: this.classifyCSPViolationSeverity(event),
      source: event.sourceFile || 'unknown',
      details: `${event.violatedDirective}: ${event.blockedURI}`,
      timestamp: Date.now(),
      blocked: true,
      userAgent: navigator.userAgent
    };
    
    this.recordThreat(threat);
    
    if (threat.severity === 'critical' || threat.severity === 'high') {
      this.triggerSecurityAlert(threat);
    }
  }

  private classifyCSPViolationSeverity(event: SecurityPolicyViolationEvent): SecurityThreat['severity'] {
    if (event.violatedDirective.includes('script-src')) return 'critical';
    if (event.violatedDirective.includes('object-src')) return 'high';
    if (event.violatedDirective.includes('img-src')) return 'medium';
    return 'low';
  }

  private setupXSSProtection(): void {
    if (!this.config.enableXSSProtection) return;
    
    // Intercept dangerous DOM manipulations
    this.interceptDangerousMethods();
    
    // Monitor form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      if (!this.validateFormData(form)) {
        event.preventDefault();
        this.recordThreat({
          id: this.generateId(),
          type: 'xss',
          severity: 'high',
          source: 'form-submission',
          details: 'Malicious content detected in form data',
          timestamp: Date.now(),
          blocked: true,
          userAgent: navigator.userAgent
        });
      }
    });
  }

  private interceptDangerousMethods(): void {
    // Intercept innerHTML
    const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')!;
    Object.defineProperty(Element.prototype, 'innerHTML', {
      set: function(value: string) {
        const sanitized = securitySystem.sanitizeHTML(value);
        if (sanitized !== value) {
          securitySystem.recordThreat({
            id: securitySystem.generateId(),
            type: 'xss',
            severity: 'medium',
            source: 'innerHTML',
            details: 'Malicious HTML content sanitized',
            timestamp: Date.now(),
            blocked: true,
            userAgent: navigator.userAgent
          });
        }
        originalInnerHTML.set!.call(this, sanitized);
      },
      get: originalInnerHTML.get
    });
    
    // Intercept eval
    const originalEval = window.eval;
    window.eval = function(code: string) {
      securitySystem.recordThreat({
        id: securitySystem.generateId(),
        type: 'injection',
        severity: 'critical',
        source: 'eval',
        details: `Eval attempt blocked: ${code.substring(0, 100)}`,
        timestamp: Date.now(),
        blocked: true,
        userAgent: navigator.userAgent
      });
      
      if (!securitySystem.config.strictMode) {
        console.warn('🚨 Eval usage detected and blocked for security');
        return null;
      }
      
      throw new Error('Eval is disabled for security reasons');
    };
  }

  private setupDefaultSanitizers(): void {
    // HTML sanitizer
    this.sanitizers.set('html', (input: string) => {
      if (typeof input !== 'string') return input;
      
      let sanitized = input;
      for (const pattern of this.config.blockedPatterns) {
        sanitized = sanitized.replace(pattern, '');
      }
      
      // Remove dangerous attributes
      sanitized = sanitized.replace(/\s(on\w+|javascript:|data:text\/html)/gi, '');
      
      return sanitized;
    });
    
    // URL sanitizer
    this.sanitizers.set('url', (input: string) => {
      if (typeof input !== 'string') return input;
      
      try {
        const url = new URL(input, window.location.origin);
        
        // Block javascript: and data: URLs
        if (url.protocol === 'javascript:' || url.protocol === 'data:') {
          throw new Error('Unsafe URL protocol');
        }
        
        // Check against allowed domains
        if (this.config.allowedDomains.length > 0 && 
            !this.config.allowedDomains.includes(url.hostname)) {
          throw new Error('Domain not allowed');
        }
        
        return url.toString();
      } catch {
        return '';
      }
    });
    
    // JSON sanitizer
    this.sanitizers.set('json', (input: any) => {
      if (typeof input === 'string') {
        try {
          const parsed = JSON.parse(input);
          return this.sanitizeObject(parsed);
        } catch {
          return {};
        }
      }
      return this.sanitizeObject(input);
    });
  }

  private sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'string') {
      return this.sanitizeHTML(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeHTML(key);
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  }

  private setupDefaultValidators(): void {
    // Email validator
    this.validators.set('email', (input: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return typeof input === 'string' && emailRegex.test(input) && input.length < 255;
    });
    
    // File upload validator
    this.validators.set('file', (file: File) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      return file instanceof File && 
             allowedTypes.includes(file.type) && 
             file.size <= maxSize;
    });
    
    // User input validator
    this.validators.set('userInput', (input: string) => {
      if (typeof input !== 'string') return false;
      
      // Check for common injection patterns
      for (const pattern of this.config.blockedPatterns) {
        if (pattern.test(input)) return false;
      }
      
      return input.length <= 10000; // Reasonable length limit
    });
  }

  private setupTrustedOrigins(): void {
    this.trustedOrigins.add(window.location.origin);
    this.config.allowedDomains.forEach(domain => {
      this.trustedOrigins.add(`https://${domain}`);
      this.trustedOrigins.add(`http://${domain}`);
    });
  }

  private setupIntegrityChecks(): void {
    if (!this.config.enableIntegrityChecks) return;
    
    // Monitor for DOM tampering
    const checkDOMIntegrity = () => {
      const suspiciousElements = document.querySelectorAll('[onclick], [onload], [onerror]');
      if (suspiciousElements.length > 0) {
        this.recordThreat({
          id: this.generateId(),
          type: 'xss',
          severity: 'medium',
          source: 'dom-tampering',
          details: `${suspiciousElements.length} suspicious event handlers found`,
          timestamp: Date.now(),
          blocked: false,
          userAgent: navigator.userAgent
        });
      }
    };
    
    setInterval(checkDOMIntegrity, 30000); // Check every 30 seconds
  }

  private checkForUnsafeContent(element: Element): void {
    // Check for inline scripts
    if (element.tagName === 'SCRIPT' && element.innerHTML.trim()) {
      this.recordThreat({
        id: this.generateId(),
        type: 'xss',
        severity: 'critical',
        source: 'inline-script',
        details: 'Inline script element detected',
        timestamp: Date.now(),
        blocked: true,
        userAgent: navigator.userAgent
      });
      
      element.remove();
    }
    
    // Check for dangerous attributes
    const dangerousAttrs = ['onclick', 'onload', 'onerror', 'onmouseover'];
    dangerousAttrs.forEach(attr => {
      if (element.hasAttribute(attr)) {
        this.recordThreat({
          id: this.generateId(),
          type: 'xss',
          severity: 'high',
          source: 'dangerous-attribute',
          details: `Dangerous ${attr} attribute detected`,
          timestamp: Date.now(),
          blocked: true,
          userAgent: navigator.userAgent
        });
        
        element.removeAttribute(attr);
      }
    });
  }

  private validateFormData(form: HTMLFormElement): boolean {
    const formData = new FormData(form);
    
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        if (!this.validateUserInput(value)) {
          return false;
        }
      } else if (value instanceof File) {
        if (!this.validateFile(value)) {
          return false;
        }
      }
    }
    
    return true;
  }

  private recordThreat(threat: SecurityThreat): void {
    this.threats.push(threat);
    
    // Maintain threat history limit
    if (this.threats.length > this.MAX_THREATS) {
      this.threats.shift();
    }
    
    // Update metrics
    this.metrics.totalThreats++;
    if (threat.blocked) {
      this.metrics.threatsBlocked++;
    }
    
    this.metrics.threatsByType[threat.type] = (this.metrics.threatsByType[threat.type] || 0) + 1;
    this.metrics.lastThreatDetected = threat.timestamp;
    
    this.updateSecurityScore();
    
    console.warn('🚨 Security threat detected:', threat);
    
    // Report to external endpoint if configured
    if (this.config.reportingEndpoint) {
      this.reportThreat(threat);
    }
  }

  private async reportThreat(threat: SecurityThreat): Promise<void> {
    try {
      await fetch(this.config.reportingEndpoint!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(threat)
      });
    } catch (error) {
      console.warn('Failed to report security threat:', error);
    }
  }

  private triggerSecurityAlert(threat: SecurityThreat): void {
    window.dispatchEvent(new CustomEvent('security-alert', {
      detail: threat
    }));
    
    // Show user notification for critical threats
    if (threat.severity === 'critical') {
      this.showSecurityNotification(threat);
    }
  }

  private showSecurityNotification(threat: SecurityThreat): void {
    // Create security notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 15px;
      border-radius: 5px;
      z-index: 10001;
      max-width: 300px;
    `;
    
    notification.innerHTML = `
      <h4>🚨 Security Alert</h4>
      <p>A security threat was detected and blocked.</p>
      <button onclick="this.parentElement.remove()" style="background: transparent; border: 1px solid white; color: white; padding: 5px 10px; border-radius: 3px;">Dismiss</button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 10000);
  }

  private updateSecurityScore(): void {
    const recentThreats = this.threats.filter(t => 
      Date.now() - t.timestamp < 3600000 // Last hour
    );
    
    let score = 100;
    
    recentThreats.forEach(threat => {
      const impact = {
        low: 1,
        medium: 3,
        high: 7,
        critical: 15
      };
      
      score -= impact[threat.severity];
    });
    
    this.metrics.securityScore = Math.max(0, score);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Public API
  
  sanitizeHTML(input: string): string {
    const sanitizer = this.sanitizers.get('html');
    return sanitizer ? sanitizer(input) : input;
  }

  sanitizeURL(input: string): string {
    const sanitizer = this.sanitizers.get('url');
    return sanitizer ? sanitizer(input) : input;
  }

  sanitizeJSON(input: any): any {
    const sanitizer = this.sanitizers.get('json');
    return sanitizer ? sanitizer(input) : input;
  }

  validateUserInput(input: string): boolean {
    const validator = this.validators.get('userInput');
    return validator ? validator(input) : false;
  }

  validateEmail(input: string): boolean {
    const validator = this.validators.get('email');
    return validator ? validator(input) : false;
  }

  validateFile(file: File): boolean {
    const validator = this.validators.get('file');
    return validator ? validator(file) : false;
  }

  addTrustedOrigin(origin: string): void {
    this.trustedOrigins.add(origin);
  }

  isTrustedOrigin(origin: string): boolean {
    return this.trustedOrigins.has(origin);
  }

  getSecurityMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  getRecentThreats(hours = 24): SecurityThreat[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.threats.filter(threat => threat.timestamp > cutoff);
  }

  clearThreatHistory(): void {
    this.threats = [];
    this.metrics.totalThreats = 0;
    this.metrics.threatsBlocked = 0;
    this.metrics.threatsByType = {};
    this.metrics.lastThreatDetected = 0;
    this.metrics.securityScore = 100;
    console.log('🧹 Security threat history cleared');
  }

  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  dispose(): void {
    this.clearThreatHistory();
    console.log('🛡️ Security hardening system disposed');
  }
}

// Global instance for easy access
export const securitySystem = new SecurityHardeningSystem(); 