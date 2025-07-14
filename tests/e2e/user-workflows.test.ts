/**
 * End-to-End User Workflow Tests
 * 
 * Tests complete user journeys from start to finish:
 * - QR code scan → Camera detection → Results
 * - Image upload → Processing → Classification
 * - Voice input → Search → Results
 * - Multi-modal interactions
 * - Error recovery flows
 * - Performance under realistic usage
 */

import { test, expect, type Page } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:5173'; // SvelteKit dev server
const MOBILE_VIEWPORT = { width: 375, height: 667 }; // iPhone SE
const DESKTOP_VIEWPORT = { width: 1920, height: 1080 };

// Test utilities
class EcoScanTestHelper {
  constructor(private page: Page) {}

  async navigateToApp() {
    await this.page.goto(BASE_URL);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForModelLoad() {
    // Wait for ML models to load
    await this.page.waitForFunction(() => {
      return window.localStorage.getItem('ecoscan-models-loaded') === 'true';
    }, { timeout: 30000 });
  }

  async mockCameraPermission(granted: boolean = true) {
    await this.page.context().grantPermissions(
      granted ? ['camera'] : [], 
      { origin: BASE_URL }
    );
  }

  async mockMicrophonePermission(granted: boolean = true) {
    await this.page.context().grantPermissions(
      granted ? ['microphone'] : [], 
      { origin: BASE_URL }
    );
  }

  async uploadTestImage(filename: string) {
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(`tests/fixtures/${filename}`);
  }

  async startCameraDetection() {
    await this.page.click('[data-testid="camera-button"]');
    await this.page.waitForSelector('[data-testid="camera-view"]', { state: 'visible' });
  }

  async startVoiceInput() {
    await this.page.click('[data-testid="voice-button"]');
    await this.page.waitForSelector('[data-testid="voice-recording"]', { state: 'visible' });
  }

  async waitForDetectionResults() {
    await this.page.waitForSelector('[data-testid="detection-results"]', { 
      state: 'visible',
      timeout: 10000 
    });
  }

  async checkPerformanceMetrics(): Promise<{loadTime: number; domReady: number; firstPaint: number}> {
    const perfMetrics = await this.page.evaluate(() => {
      return {
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0
      };
    });
    return perfMetrics;
  }

  async measureInferenceTime() {
    const startTime = Date.now();
    await this.waitForDetectionResults();
    return Date.now() - startTime;
  }

  async checkAccessibility() {
    // Check ARIA labels and keyboard navigation
    const accessibilityIssues = await this.page.evaluate(() => {
      const issues = [];
      
      // Check for missing alt text
      const images = document.querySelectorAll('img:not([alt])');
      if (images.length > 0) {
        issues.push(`${images.length} images missing alt text`);
      }
      
      // Check for missing ARIA labels
      const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
      if (buttons.length > 0) {
        issues.push(`${buttons.length} buttons missing ARIA labels`);
      }
      
      // Check color contrast (simplified)
      const elements = document.querySelectorAll('[data-testid]');
      for (const element of elements) {
        const styles = getComputedStyle(element);
        const bgColor = styles.backgroundColor;
        const textColor = styles.color;
        // Basic contrast check would go here
      }
      
      return issues;
    });
    
    return accessibilityIssues;
  }
}

test.describe('EcoScan E2E User Workflows', () => {
  let helper: EcoScanTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new EcoScanTestHelper(page);
    await helper.navigateToApp();
  });

  test.describe('Primary User Journey: Camera Detection', () => {
    test('complete camera detection workflow', async ({ page }) => {
      // Set mobile viewport for realistic testing
      await page.setViewportSize(MOBILE_VIEWPORT);
      await helper.mockCameraPermission(true);
      
      // Step 1: User grants camera permission and starts detection
      await helper.startCameraDetection();
      
      // Step 2: Wait for models to load
      await helper.waitForModelLoad();
      
      // Step 3: Mock camera feed with test image
      await page.evaluate(() => {
        // Mock camera stream with test image
        const video = document.querySelector('video');
        if (video) {
          video.srcObject = null;
          video.src = '/tests/fixtures/bottle-test-image.jpg';
        }
      });
      
      // Step 4: Wait for detection results
      const inferenceTime = await helper.measureInferenceTime();
      expect(inferenceTime).toBeLessThan(3000); // Should complete within 3 seconds
      
      // Step 5: Verify results are displayed
      const results = await page.locator('[data-testid="detection-results"]');
      await expect(results).toBeVisible();
      
      const detectionCount = await page.locator('[data-testid="detection-item"]').count();
      expect(detectionCount).toBeGreaterThan(0);
      
      // Step 6: User taps on detection for details
      await page.click('[data-testid="detection-item"]:first-child');
      await expect(page.locator('[data-testid="detection-details"]')).toBeVisible();
      
      // Step 7: Verify classification information
      const category = await page.locator('[data-testid="waste-category"]').textContent();
      expect(['recycle', 'compost', 'landfill']).toContain(category?.toLowerCase());
      
      const instructions = await page.locator('[data-testid="disposal-instructions"]').textContent();
      expect(instructions?.length).toBeGreaterThan(0);
    });

    test('handles camera permission denial gracefully', async ({ page }) => {
      await helper.mockCameraPermission(false);
      
      await page.click('[data-testid="camera-button"]');
      
      // Should show permission error
      await expect(page.locator('[data-testid="camera-permission-error"]')).toBeVisible();
      
      // Should offer alternative input methods
      await expect(page.locator('[data-testid="upload-alternative"]')).toBeVisible();
      await expect(page.locator('[data-testid="voice-alternative"]')).toBeVisible();
    });

    test('performs well under continuous use', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await helper.mockCameraPermission(true);
      await helper.startCameraDetection();
      await helper.waitForModelLoad();
      
      // Simulate continuous detection for 30 seconds
      const detectionTimes = [];
      const startTime = Date.now();
      
      while (Date.now() - startTime < 30000) {
        const detectionStart = Date.now();
        
        // Mock new detection
        await page.evaluate(() => {
          window.dispatchEvent(new CustomEvent('mock-detection', {
            detail: { mockResults: true }
          }));
        });
        
        await helper.waitForDetectionResults();
        detectionTimes.push(Date.now() - detectionStart);
        
        // Small delay between detections
        await page.waitForTimeout(500);
      }
      
      // Verify performance consistency
      const avgTime = detectionTimes.reduce((a, b) => a + b, 0) / detectionTimes.length;
      expect(avgTime).toBeLessThan(1000); // Average under 1 second
      
      const maxTime = Math.max(...detectionTimes);
      expect(maxTime).toBeLessThan(3000); // No single detection over 3 seconds
    });
  });

  test.describe('Image Upload Workflow', () => {
    test('complete image upload and classification workflow', async ({ page }) => {
      // Step 1: Navigate to upload section
      await page.click('[data-testid="upload-tab"]');
      await expect(page.locator('[data-testid="upload-area"]')).toBeVisible();
      
      // Step 2: Upload test image
      await helper.uploadTestImage('mixed-waste.jpg');
      
      // Step 3: Wait for upload preview
      await expect(page.locator('[data-testid="upload-preview"]')).toBeVisible();
      
      // Step 4: Trigger processing
      await page.click('[data-testid="process-image-button"]');
      
      // Step 5: Wait for detection results
      const processingTime = await helper.measureInferenceTime();
      expect(processingTime).toBeLessThan(5000); // Upload processing should be quick
      
      // Step 6: Verify multiple detections for complex image
      const detectionCount = await page.locator('[data-testid="detection-item"]').count();
      expect(detectionCount).toBeGreaterThan(1); // Should detect multiple items
      
      // Step 7: Test sorting and filtering
      await page.click('[data-testid="sort-by-confidence"]');
      await page.waitForTimeout(500);
      
      const confidenceValues = await page.locator('[data-testid="confidence-value"]').allTextContents();
      const confidenceNumbers = confidenceValues.map(val => parseFloat(val.replace('%', '')));
      
      // Should be sorted in descending order
      for (let i = 1; i < confidenceNumbers.length; i++) {
        expect(confidenceNumbers[i]).toBeLessThanOrEqual(confidenceNumbers[i-1]);
      }
    });

    test('handles various image formats', async ({ page }) => {
      const imageFormats = [
        'test-image.jpg',
        'test-image.png',
        'test-image.webp',
        'test-image.gif'
      ];
      
      for (const imageFile of imageFormats) {
        await page.click('[data-testid="upload-tab"]');
        await helper.uploadTestImage(imageFile);
        
        // Should accept and process all supported formats
        await expect(page.locator('[data-testid="upload-preview"]')).toBeVisible();
        await page.click('[data-testid="process-image-button"]');
        await helper.waitForDetectionResults();
        
        // Clear for next iteration
        await page.click('[data-testid="clear-upload"]');
      }
    });

    test('validates file size and type restrictions', async ({ page }) => {
      await page.click('[data-testid="upload-tab"]');
      
      // Test oversized file
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'large-file.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.alloc(50 * 1024 * 1024) // 50MB
      });
      
      await expect(page.locator('[data-testid="file-size-error"]')).toBeVisible();
      
      // Test invalid file type
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('fake pdf content')
      });
      
      await expect(page.locator('[data-testid="file-type-error"]')).toBeVisible();
    });
  });

  test.describe('Voice Input Workflow', () => {
    test('complete voice search and classification workflow', async ({ page }) => {
      await helper.mockMicrophonePermission(true);
      
      // Step 1: Start voice input
      await helper.startVoiceInput();
      
      // Step 2: Mock speech recognition
      await page.evaluate(() => {
        // Mock SpeechRecognition API
        const mockRecognition = {
          start: () => {
            setTimeout(() => {
              mockRecognition.onresult({
                results: [[{ transcript: 'plastic bottle' }]]
              });
            }, 1000);
          },
          stop: () => {},
          onresult: null,
          onerror: null
        };
        
        window.SpeechRecognition = function() { return mockRecognition; };
        window.webkitSpeechRecognition = function() { return mockRecognition; };
      });
      
      // Step 3: Wait for transcription
      await expect(page.locator('[data-testid="voice-transcript"]')).toHaveText('plastic bottle');
      
      // Step 4: Wait for classification results
      await helper.waitForDetectionResults();
      
      // Step 5: Verify voice-based classification
      const category = await page.locator('[data-testid="waste-category"]').textContent();
      expect(category?.toLowerCase()).toBe('recycle');
      
      // Step 6: Test voice alternatives and corrections
      await page.click('[data-testid="try-again-button"]');
      await helper.startVoiceInput();
      
             await page.evaluate(() => {
         const recognition = new window.SpeechRecognition();
         if (recognition && recognition.onresult) {
           recognition.onresult({
             results: [[{ transcript: 'banana peel' }]]
           });
         }
       });
      
      await helper.waitForDetectionResults();
      const newCategory = await page.locator('[data-testid="waste-category"]').textContent();
      expect(newCategory?.toLowerCase()).toBe('compost');
    });

    test('handles microphone permission denial', async ({ page }) => {
      await helper.mockMicrophonePermission(false);
      
      await page.click('[data-testid="voice-button"]');
      
      // Should show permission error and text fallback
      await expect(page.locator('[data-testid="mic-permission-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="text-input-fallback"]')).toBeVisible();
      
      // Test text input fallback
      await page.fill('[data-testid="text-input-fallback"]', 'glass jar');
      await page.click('[data-testid="text-search-button"]');
      
      await helper.waitForDetectionResults();
      const category = await page.locator('[data-testid="waste-category"]').textContent();
      expect(category?.toLowerCase()).toBe('recycle');
    });

    test('handles unclear speech and provides suggestions', async ({ page }) => {
      await helper.mockMicrophonePermission(true);
      await helper.startVoiceInput();
      
      // Mock unclear speech
      await page.evaluate(() => {
        window.SpeechRecognition().onresult({
          results: [[{ transcript: 'umm... plastic... thing?' }]]
        });
      });
      
      // Should show suggestions
      await expect(page.locator('[data-testid="speech-suggestions"]')).toBeVisible();
      
      const suggestions = await page.locator('[data-testid="suggestion-item"]').allTextContents();
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('plastic'))).toBe(true);
      
      // User can select suggestion
      await page.click('[data-testid="suggestion-item"]:first-child');
      await helper.waitForDetectionResults();
    });
  });

  test.describe('Multi-Modal Workflow', () => {
    test('combines camera, upload, and voice for comprehensive classification', async ({ page }) => {
      // Step 1: Start with camera detection
      await helper.mockCameraPermission(true);
      await helper.startCameraDetection();
      await helper.waitForModelLoad();
      await helper.waitForDetectionResults();
      
      const cameraResults = await page.locator('[data-testid="detection-item"]').count();
      
      // Step 2: Switch to upload for detailed analysis
      await page.click('[data-testid="upload-tab"]');
      await helper.uploadTestImage('complex-waste-scene.jpg');
      await page.click('[data-testid="process-image-button"]');
      await helper.waitForDetectionResults();
      
      const uploadResults = await page.locator('[data-testid="detection-item"]').count();
      
      // Step 3: Use voice to clarify uncertain items
      await page.click('[data-testid="voice-tab"]');
      await helper.mockMicrophonePermission(true);
      await helper.startVoiceInput();
      
      await page.evaluate(() => {
        window.SpeechRecognition().onresult({
          results: [[{ transcript: 'what about aluminum cans' }]]
        });
      });
      
      await helper.waitForDetectionResults();
      
      // Step 4: Compare results across modalities
      expect(cameraResults).toBeGreaterThan(0);
      expect(uploadResults).toBeGreaterThan(0);
      
      // Should maintain detection history
      await page.click('[data-testid="detection-history"]');
      const historyItems = await page.locator('[data-testid="history-item"]').count();
      expect(historyItems).toBeGreaterThanOrEqual(3); // At least one from each modality
    });

    test('provides consistent classification across input methods', async ({ page }) => {
      const testItem = 'plastic water bottle';
      const expectedCategory = 'recycle';
      
      // Test 1: Voice classification
      await helper.mockMicrophonePermission(true);
      await helper.startVoiceInput();
      
      await page.evaluate((item) => {
        window.SpeechRecognition().onresult({
          results: [[{ transcript: item }]]
        });
      }, testItem);
      
      await helper.waitForDetectionResults();
      const voiceCategory = await page.locator('[data-testid="waste-category"]').textContent();
      
      // Test 2: Image upload classification
      await page.click('[data-testid="upload-tab"]');
      await helper.uploadTestImage('plastic-bottle.jpg');
      await page.click('[data-testid="process-image-button"]');
      await helper.waitForDetectionResults();
      
      const imageCategory = await page.locator('[data-testid="waste-category"]').textContent();
      
      // Test 3: Camera detection (mocked)
      await helper.mockCameraPermission(true);
      await helper.startCameraDetection();
      await page.evaluate(() => {
        // Mock detection result
        window.dispatchEvent(new CustomEvent('mock-detection', {
          detail: { 
            detections: [{ 
              class: 'bottle', 
              category: 'recycle',
              confidence: 0.95 
            }] 
          }
        }));
      });
      
      await helper.waitForDetectionResults();
      const cameraCategory = await page.locator('[data-testid="waste-category"]').textContent();
      
      // All methods should classify consistently
      expect(voiceCategory?.toLowerCase()).toBe(expectedCategory);
      expect(imageCategory?.toLowerCase()).toBe(expectedCategory);
      expect(cameraCategory?.toLowerCase()).toBe(expectedCategory);
    });
  });

  test.describe('Error Recovery and Edge Cases', () => {
    test('recovers from network interruptions', async ({ page }) => {
      // Step 1: Start normal operation
      await helper.startCameraDetection();
      await helper.waitForModelLoad();
      
      // Step 2: Simulate network failure
      await page.route('**/*', route => route.abort());
      
      // Step 3: Attempt operation that requires network
      await page.click('[data-testid="sync-button"]');
      
      // Should show offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      
      // Step 4: Restore network
      await page.unroute('**/*');
      
      // Step 5: Should automatically retry and succeed
      await page.click('[data-testid="retry-sync"]');
      await expect(page.locator('[data-testid="online-indicator"]')).toBeVisible();
    });

    test('handles slow model loading gracefully', async ({ page }) => {
      // Mock slow model loading
      await page.route('**/yolov8n.onnx', route => {
        setTimeout(() => route.continue(), 10000); // 10 second delay
      });
      
      await helper.startCameraDetection();
      
      // Should show loading indicator
      await expect(page.locator('[data-testid="model-loading"]')).toBeVisible();
      
      // Should show progress if available
      const progressBar = page.locator('[data-testid="loading-progress"]');
      if (await progressBar.isVisible()) {
        const progress = await progressBar.getAttribute('value');
        expect(parseInt(progress!)).toBeGreaterThanOrEqual(0);
      }
      
      // Should eventually load or timeout gracefully
      try {
        await helper.waitForModelLoad();
      } catch (error) {
        // Should show timeout message
        await expect(page.locator('[data-testid="loading-timeout"]')).toBeVisible();
        await expect(page.locator('[data-testid="try-offline-mode"]')).toBeVisible();
      }
    });

    test('maintains functionality with limited browser features', async ({ page, browserName }) => {
      // Disable various browser features to test graceful degradation
      await page.addInitScript(() => {
        // Mock missing APIs
        delete window.Worker;
        delete navigator.mediaDevices;
        delete window.SpeechRecognition;
        delete window.webkitSpeechRecognition;
      });
      
      await helper.navigateToApp();
      
      // Should detect missing features and adapt
      await expect(page.locator('[data-testid="limited-mode-notice"]')).toBeVisible();
      
      // Upload should still work
      await page.click('[data-testid="upload-tab"]');
      await helper.uploadTestImage('test-image.jpg');
      await expect(page.locator('[data-testid="upload-preview"]')).toBeVisible();
      
      // Should show alternative methods
      await expect(page.locator('[data-testid="text-search-alternative"]')).toBeVisible();
    });
  });

  test.describe('Performance and Accessibility', () => {
    test('meets performance benchmarks', async ({ page }) => {
      const metrics = await helper.checkPerformanceMetrics();
      
      // Page load performance
      expect(metrics.loadTime).toBeLessThan(3000); // 3 seconds
      expect(metrics.domReady).toBeLessThan(2000); // 2 seconds
      
      // First meaningful paint
      if (metrics.firstPaint > 0) {
        expect(metrics.firstPaint).toBeLessThan(1500); // 1.5 seconds
      }
      
      // Model initialization
      const modelLoadStart = Date.now();
      await helper.waitForModelLoad();
      const modelLoadTime = Date.now() - modelLoadStart;
      expect(modelLoadTime).toBeLessThan(10000); // 10 seconds max
      
      // Inference performance
      await helper.startCameraDetection();
      const inferenceTime = await helper.measureInferenceTime();
      expect(inferenceTime).toBeLessThan(1000); // 1 second for inference
    });

    test('meets accessibility standards', async ({ page }) => {
      const accessibilityIssues = await helper.checkAccessibility();
      
      // Should have minimal accessibility issues
      expect(accessibilityIssues.length).toBeLessThan(3);
      
      // Keyboard navigation
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus').first();
      await expect(focusedElement).toBeVisible();
      
      // Should be able to navigate entire interface with keyboard
      const tabStops = [];
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');
        const focused = await page.locator(':focus').first();
        if (await focused.isVisible()) {
          const tagName = await focused.evaluate(el => el.tagName);
          tabStops.push(tagName);
        }
      }
      
      expect(tabStops.length).toBeGreaterThan(5); // Should have multiple focusable elements
      
      // Screen reader compatibility
      const ariaLabels = await page.locator('[aria-label]').count();
      expect(ariaLabels).toBeGreaterThan(3);
      
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
      expect(headings).toBeGreaterThan(1); // Proper heading structure
    });

    test('works across different devices and browsers', async ({ page, browserName }) => {
      const viewports = [
        { width: 375, height: 667, name: 'iPhone SE' },
        { width: 414, height: 896, name: 'iPhone 11' },
        { width: 768, height: 1024, name: 'iPad' },
        { width: 1920, height: 1080, name: 'Desktop' }
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await helper.navigateToApp();
        
        // Should be responsive
        await expect(page.locator('[data-testid="main-interface"]')).toBeVisible();
        
        // Should maintain functionality
        if (viewport.width < 768) {
          // Mobile: should show mobile-optimized interface
          await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
        } else {
          // Desktop: should show full interface
          await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();
        }
        
        // Core functionality should work regardless of viewport
        await page.click('[data-testid="upload-tab"]');
        await expect(page.locator('[data-testid="upload-area"]')).toBeVisible();
      }
    });
  });
}); 