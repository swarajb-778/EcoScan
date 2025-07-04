/**
 * Accessibility utilities for EcoScan
 * Provides screen reader support, keyboard navigation, and ARIA helpers
 */

/**
 * Announce text to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Generate unique ID for accessibility attributes
 */
export function generateAccessibilityId(prefix = 'ecoscan'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Manage focus for modals and overlays
 */
export class FocusManager {
  private focusableElements: HTMLElement[] = [];
  private previousActiveElement: Element | null = null;
  private trapped = false;

  /**
   * Trap focus within a container
   */
  trapFocus(container: HTMLElement): void {
    this.previousActiveElement = document.activeElement;
    this.focusableElements = this.getFocusableElements(container);
    this.trapped = true;

    // Focus first element
    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
    }

    // Add event listeners
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('focusin', this.handleFocusIn);
  }

  /**
   * Release focus trap
   */
  releaseFocus(): void {
    this.trapped = false;
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('focusin', this.handleFocusIn);

    // Restore previous focus
    if (this.previousActiveElement && 'focus' in this.previousActiveElement) {
      (this.previousActiveElement as HTMLElement).focus();
    }
  }

  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.trapped || event.key !== 'Tab') return;

    const firstElement = this.focusableElements[0];
    const lastElement = this.focusableElements[this.focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  };

  private handleFocusIn = (event: FocusEvent): void => {
    if (!this.trapped) return;

    const target = event.target as HTMLElement;
    if (!this.focusableElements.includes(target)) {
      event.preventDefault();
      this.focusableElements[0]?.focus();
    }
  };
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: high)').matches;
}

/**
 * Add keyboard event listeners with proper cleanup
 */
export function addKeyboardListener(
  element: HTMLElement,
  key: string,
  handler: (event: KeyboardEvent) => void,
  options: { preventDefault?: boolean; stopPropagation?: boolean } = {}
): () => void {
  const wrappedHandler = (event: KeyboardEvent) => {
    if (event.key === key || (Array.isArray(key) && key.includes(event.key))) {
      if (options.preventDefault) event.preventDefault();
      if (options.stopPropagation) event.stopPropagation();
      handler(event);
    }
  };

  element.addEventListener('keydown', wrappedHandler);
  
  // Return cleanup function
  return () => element.removeEventListener('keydown', wrappedHandler);
}

/**
 * Create ARIA attributes for detection results
 */
export function createDetectionAria(
  category: string,
  confidence: number,
  instructions?: string
): Record<string, string> {
  const label = `${category} detected with ${Math.round(confidence * 100)}% confidence`;
  const description = instructions 
    ? `${label}. ${instructions}`
    : label;

  return {
    'aria-label': label,
    'aria-describedby': generateAccessibilityId('detection-desc'),
    'role': 'button',
    'tabindex': '0'
  };
}

/**
 * Format detection results for screen readers
 */
export function formatDetectionForScreenReader(
  detections: Array<{ category: string; confidence: number }>
): string {
  if (detections.length === 0) {
    return 'No objects detected';
  }

  if (detections.length === 1) {
    const { category, confidence } = detections[0];
    return `Detected ${category} with ${Math.round(confidence * 100)}% confidence`;
  }

  const items = detections
    .map(({ category, confidence }) => 
      `${category} (${Math.round(confidence * 100)}%)`
    )
    .join(', ');

  return `Detected ${detections.length} objects: ${items}`;
}

/**
 * Create voice input accessibility features
 */
export function createVoiceInputAria(isListening: boolean, isSupported: boolean): Record<string, string> {
  if (!isSupported) {
    return {
      'aria-label': 'Voice input not supported on this device',
      'aria-disabled': 'true'
    };
  }

  return {
    'aria-label': isListening ? 'Stop voice input' : 'Start voice input',
    'aria-pressed': isListening.toString(),
    'role': 'button',
    'tabindex': '0'
  };
}

/**
 * Handle file upload accessibility
 */
export function createFileUploadAria(isDragOver: boolean, hasFile: boolean): Record<string, string> {
  let label = 'Upload image for analysis';
  
  if (isDragOver) {
    label = 'Drop image to upload';
  } else if (hasFile) {
    label = 'Image uploaded, ready for analysis';
  }

  return {
    'aria-label': label,
    'role': 'button',
    'tabindex': '0',
    'aria-dropeffect': isDragOver ? 'copy' : 'none'
  };
}

/**
 * Announce detection results
 */
export function announceDetectionResults(
  detections: Array<{ category: string; confidence: number; instructions?: string }>
): void {
  if (detections.length === 0) {
    announceToScreenReader('No objects detected in the image');
    return;
  }

  const message = formatDetectionForScreenReader(detections);
  announceToScreenReader(message, 'polite');

  // Announce disposal instructions for the most confident detection
  const topDetection = detections.reduce((max, current) => 
    current.confidence > max.confidence ? current : max
  );

  if (topDetection.instructions) {
    setTimeout(() => {
      announceToScreenReader(`Disposal instructions: ${topDetection.instructions}`, 'polite');
    }, 1500);
  }
}

/**
 * Create skip link for keyboard navigation
 */
export function createSkipLink(targetId: string, text = 'Skip to main content'): HTMLElement {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.textContent = text;
  skipLink.className = 'skip-link sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-white px-4 py-2 rounded z-50';
  
  return skipLink;
}

/**
 * Ensure minimum touch target size (44px) for mobile accessibility
 */
export function ensureMinimumTouchTarget(element: HTMLElement): void {
  const style = getComputedStyle(element);
  const width = parseInt(style.width);
  const height = parseInt(style.height);
  
  if (width < 44 || height < 44) {
    element.style.minWidth = '44px';
    element.style.minHeight = '44px';
    element.style.display = 'inline-flex';
    element.style.alignItems = 'center';
    element.style.justifyContent = 'center';
  }
}

/**
 * Global keyboard shortcuts handler
 */
export class KeyboardShortcuts {
  private shortcuts = new Map<string, () => void>();

  constructor() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Register a keyboard shortcut
   */
  register(key: string, handler: () => void): void {
    this.shortcuts.set(key.toLowerCase(), handler);
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregister(key: string): void {
    this.shortcuts.delete(key.toLowerCase());
  }

  /**
   * Clean up all shortcuts
   */
  destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.shortcuts.clear();
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    // Don't trigger shortcuts when typing in form elements
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }

    const key = event.key.toLowerCase();
    const handler = this.shortcuts.get(key);
    
    if (handler) {
      event.preventDefault();
      handler();
    }
  };
} 