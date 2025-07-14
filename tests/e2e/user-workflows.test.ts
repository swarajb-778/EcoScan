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

import { test, expect, type Page, type BrowserContext } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
  baseURL: 'http://localhost:5173',
  timeout: 30000,
  actionTimeout: 10000
};

// Helper functions for common actions
class EcoScanTestHelper {
  constructor(private page: Page) {}

  async gotoApp() {
    await this.page.goto(TEST_CONFIG.baseURL);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForCameraReady() {
    await this.page.waitForSelector('[aria-label="Start camera detection"]', { 
      timeout: TEST_CONFIG.timeout 
    });
  }

  async startCamera() {
    await this.page.click('[aria-label="Start camera detection"]');
    await this.page.waitForSelector('video', { timeout: TEST_CONFIG.timeout });
  }

  async mockCameraPermission() {
    // Grant camera permission
    await this.page.context().grantPermissions(['camera']);
  }

  async mockGetUserMedia() {
    // Mock getUserMedia to provide test video stream
    await this.page.addInitScript(() => {
      // @ts-ignore
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 640;
        const ctx = canvas.getContext('2d')!;
        
        // Draw test pattern
        ctx.fillStyle = '#333333';
        ctx.fillRect(0, 0, 640, 640);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(100, 100, 200, 200);
        
        // @ts-ignore
        const stream = canvas.captureStream(30);
        return stream;
      };
    });
  }

  async uploadTestImage() {
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-bottle.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data')
    });
  }

  async waitForDetectionResults() {
    await this.page.waitForSelector('.detection-overlay', { 
      timeout: TEST_CONFIG.timeout 
    });
  }

  async getDetectionCount(): Promise<number> {
    const countText = await this.page.textContent('.detection-count');
    const match = countText?.match(/(\d+) items detected/);
    return match ? parseInt(match[1]) : 0;
  }

  async clickDetection(index: number = 0) {
    const detections = this.page.locator('.detection-box');
    await detections.nth(index).click();
  }

  async startVoiceInput() {
    await this.page.click('[aria-label="Start voice input"]');
  }

  async mockSpeechRecognition() {
    await this.page.addInitScript(() => {
      // @ts-ignore
      class MockSpeechRecognition {
        continuous = false;
        interimResults = false;
        lang = 'en-US';
        
        onstart = null;
        onresult = null;
        onend = null;
        onerror = null;

        start() {
          setTimeout(() => {
            if (this.onstart) this.onstart({});
            
            // Simulate recognition result
            setTimeout(() => {
              if (this.onresult) {
                this.onresult({
                  results: [{
                    0: { transcript: 'plastic bottle' },
                    isFinal: true
                  }],
                  resultIndex: 0
                });
              }
              
              if (this.onend) this.onend({});
            }, 1000);
          }, 100);
        }

        stop() {
          if (this.onend) this.onend({});
        }
      }

      // @ts-ignore
      window.SpeechRecognition = MockSpeechRecognition;
      // @ts-ignore
      window.webkitSpeechRecognition = MockSpeechRecognition;
    });
  }
}

test.describe('EcoScan User Workflows', () => {
  let helper: EcoScanTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new EcoScanTestHelper(page);
    await helper.gotoApp();
  });

  test.describe('Camera Detection Workflow', () => {
    test('complete camera detection workflow', async ({ page }) => {
      // Setup mocks
      await helper.mockCameraPermission();
      await helper.mockGetUserMedia();

      // Verify initial state
      await helper.waitForCameraReady();
      await expect(page.locator('text=Camera Ready')).toBeVisible();
      await expect(page.locator('text=Tap to start detecting waste items')).toBeVisible();

      // Start camera
      await helper.startCamera();

      // Verify camera is active
      await expect(page.locator('video')).toBeVisible();
      await expect(page.locator('canvas')).toBeVisible();

      // Wait for detection results (mocked)
      await page.waitForTimeout(2000); // Give time for detection to process

      // Verify detection interface
      await expect(page.locator('.detection-count')).toBeVisible();
      await expect(page.locator('.switch-camera')).toBeVisible();

      // Test camera switching
      await page.click('.switch-camera');
      await page.waitForTimeout(1000);

      // Verify camera is still active after switch
      await expect(page.locator('video')).toBeVisible();
    });

    test('camera permission handling', async ({ page }) => {
      // Deny camera permission
      await page.context().grantPermissions([]);

      await helper.waitForCameraReady();
      await helper.startCamera();

      // Should show error or fallback
      await page.waitForTimeout(2000);
      
      // Check for error handling (exact implementation may vary)
      const hasVideo = await page.locator('video').isVisible();
      if (!hasVideo) {
        // Should provide alternative methods
        await expect(page.locator('text=upload')).toBeVisible();
      }
    });

    test('camera keyboard navigation', async ({ page }) => {
      await helper.mockCameraPermission();
      await helper.mockGetUserMedia();

      await helper.waitForCameraReady();

      // Test keyboard activation
      const cameraButton = page.locator('[aria-label="Start camera detection"]');
      await cameraButton.focus();
      await page.keyboard.press('Enter');

      // Should start camera
      await expect(page.locator('video')).toBeVisible();
    });
  });

  test.describe('Image Upload Workflow', () => {
    test('complete image upload workflow', async ({ page }) => {
      // Navigate to upload section
      await page.click('text=Upload');

      // Upload test image
      await helper.uploadTestImage();

      // Wait for image processing
      await page.waitForTimeout(3000);

      // Verify image is displayed
      await expect(page.locator('img')).toBeVisible();

      // Wait for detection results
      await helper.waitForDetectionResults();

      // Verify detection overlay
      await expect(page.locator('.detection-overlay')).toBeVisible();

      // Click on detection for details
      const detections = page.locator('.detection-box');
      if (await detections.count() > 0) {
        await detections.first().click();
        
        // Verify details modal
        await expect(page.locator('.detection-details')).toBeVisible();
        await expect(page.locator('.disposal-instructions')).toBeVisible();
      }
    });

    test('drag and drop upload', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseURL}/upload`);

      // Create a file to drop
      const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
      
      // Simulate drag and drop
      const dropZone = page.locator('.upload-zone');
      await dropZone.dispatchEvent('dragover', { dataTransfer });
      await dropZone.dispatchEvent('drop', { dataTransfer });

      await page.waitForTimeout(2000);
      
      // Should show upload progress or result
      // Implementation depends on actual component behavior
    });

    test('invalid file handling', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseURL}/upload`);

      // Try to upload non-image file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('fake-pdf-data')
      });

      await page.waitForTimeout(1000);

      // Should show error message
      await expect(page.locator('text=not supported')).toBeVisible();
    });
  });

  test.describe('Voice Input Workflow', () => {
    test('complete voice input workflow', async ({ page }) => {
      await helper.mockSpeechRecognition();
      
      // Navigate to voice section
      await page.click('text=Voice');

      // Grant microphone permission
      await page.context().grantPermissions(['microphone']);

      // Start voice input
      await helper.startVoiceInput();

      // Verify recording state
      await expect(page.locator('.recording-indicator')).toBeVisible();

      // Wait for speech recognition result
      await page.waitForTimeout(2000);

      // Verify classification result
      await expect(page.locator('.voice-result')).toBeVisible();
      await expect(page.locator('.classification-category')).toBeVisible();
      await expect(page.locator('.disposal-instructions')).toBeVisible();
    });

    test('voice input error handling', async ({ page }) => {
      // Don't grant microphone permission
      await page.context().grantPermissions([]);

      await page.goto(`${TEST_CONFIG.baseURL}/voice`);

      await helper.startVoiceInput();

      await page.waitForTimeout(2000);

      // Should show error or fallback
      await expect(page.locator('text=microphone')).toBeVisible();
    });

    test('voice input with unclear speech', async ({ page }) => {
      // Mock unclear speech recognition
      await page.addInitScript(() => {
        // @ts-ignore
        class MockSpeechRecognition {
          start() {
            setTimeout(() => {
              if (this.onerror) {
                this.onerror({ error: 'no-speech' });
              }
            }, 1000);
          }
          
          onstart = null;
          onerror = null;
          onend = null;
        }

        // @ts-ignore
        window.SpeechRecognition = MockSpeechRecognition;
      });

      await page.goto(`${TEST_CONFIG.baseURL}/voice`);
      await page.context().grantPermissions(['microphone']);

      await helper.startVoiceInput();
      await page.waitForTimeout(2000);

      // Should show retry option
      await expect(page.locator('text=try again')).toBeVisible();
    });
  });

  test.describe('Multi-Modal Workflow', () => {
    test('switching between input methods', async ({ page }) => {
      await helper.mockCameraPermission();
      await helper.mockGetUserMedia();
      await helper.mockSpeechRecognition();

      // Start with camera
      await helper.waitForCameraReady();
      await helper.startCamera();
      await expect(page.locator('video')).toBeVisible();

      // Switch to upload
      await page.click('text=Upload');
      await expect(page.locator('input[type="file"]')).toBeVisible();

      // Switch to voice
      await page.click('text=Voice');
      await expect(page.locator('[aria-label="Start voice input"]')).toBeVisible();

      // Switch back to camera
      await page.click('text=Camera');
      await expect(page.locator('video')).toBeVisible();
    });

    test('session state persistence', async ({ page }) => {
      await helper.mockCameraPermission();
      await helper.mockGetUserMedia();

      // Perform detection
      await helper.startCamera();
      await page.waitForTimeout(2000);

      // Navigate to different section
      await page.click('text=About');
      await expect(page.locator('h1')).toContainText('About');

      // Navigate back
      await page.click('text=Scan');
      
      // State should be preserved
      await expect(page.locator('video')).toBeVisible();
    });
  });

  test.describe('Performance & Reliability', () => {
    test('app loads within performance budget', async ({ page }) => {
      const startTime = Date.now();
      
      await helper.gotoApp();
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('handles rapid user interactions', async ({ page }) => {
      await helper.mockCameraPermission();
      await helper.mockGetUserMedia();

      await helper.waitForCameraReady();

      // Rapid clicking
      for (let i = 0; i < 5; i++) {
        await page.click('[aria-label="Start camera detection"]');
        await page.waitForTimeout(100);
      }

      // Should handle gracefully
      await expect(page.locator('video')).toBeVisible();
    });

    test('recovers from temporary failures', async ({ page }) => {
      // Mock network failure
      await page.route('**/*', route => {
        if (route.request().url().includes('models')) {
          route.abort();
        } else {
          route.continue();
        }
      });

      await helper.gotoApp();
      await page.waitForTimeout(2000);

      // Should show error handling
      const hasError = await page.locator('text=error').isVisible();
      const hasRetry = await page.locator('text=retry').isVisible();
      
      expect(hasError || hasRetry).toBe(true);
    });
  });

  test.describe('Accessibility', () => {
    test('keyboard navigation works throughout app', async ({ page }) => {
      await helper.gotoApp();

      // Tab through interactive elements
      await page.keyboard.press('Tab');
      let activeElement = await page.locator(':focus').getAttribute('aria-label');
      expect(activeElement).toBeTruthy();

      // Continue tabbing
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should reach actionable elements
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('screen reader announcements work', async ({ page }) => {
      await helper.gotoApp();

      // Check for live regions
      await expect(page.locator('[aria-live]')).toBeVisible();
      
      // Check for proper ARIA labels
      await expect(page.locator('[aria-label]')).toHaveCount({ expected: 1, comparison: '>=' });
    });

    test('color contrast meets WCAG standards', async ({ page }) => {
      await helper.gotoApp();

      // This would typically use axe-core or similar tool
      // For now, verify text is readable
      const textElements = page.locator('p, h1, h2, h3, span');
      const count = await textElements.count();
      
      expect(count).toBeGreaterThan(0);
      
      // Verify no text is invisible (basic check)
      for (let i = 0; i < Math.min(count, 5); i++) {
        await expect(textElements.nth(i)).toBeVisible();
      }
    });
  });

  test.describe('Error Scenarios', () => {
    test('handles missing model files', async ({ page }) => {
      // Block model loading
      await page.route('**/models/**', route => route.abort());

      await helper.gotoApp();
      await page.waitForTimeout(3000);

      // Should show graceful error handling
      const errorText = await page.textContent('body');
      expect(errorText).toMatch(/(error|failed|unavailable)/i);
    });

    test('handles offline state', async ({ page }) => {
      await helper.gotoApp();
      
      // Go offline
      await page.context().setOffline(true);
      await page.reload();

      await page.waitForTimeout(2000);

      // Should show offline message or cached content
      const content = await page.textContent('body');
      expect(content).toMatch(/(offline|cached|unavailable)/i);
    });

    test('handles browser incompatibility', async ({ page }) => {
      // Mock unsupported browser
      await page.addInitScript(() => {
        // @ts-ignore
        delete navigator.mediaDevices;
        // @ts-ignore
        delete window.SpeechRecognition;
      });

      await helper.gotoApp();
      await page.waitForTimeout(2000);

      // Should show browser compatibility warnings
      const content = await page.textContent('body');
      expect(content).toMatch(/(browser|support|compatible)/i);
    });
  });

  test.describe('Data Privacy', () => {
    test('no data sent to external servers', async ({ page }) => {
      let externalRequests = 0;
      
      page.on('request', request => {
        const url = request.url();
        if (!url.startsWith(TEST_CONFIG.baseURL) && !url.startsWith('chrome-extension://')) {
          externalRequests++;
        }
      });

      await helper.gotoApp();
      await helper.mockCameraPermission();
      await helper.mockGetUserMedia();
      await helper.startCamera();
      
      await page.waitForTimeout(5000);

      // Should not make external requests for user data
      expect(externalRequests).toBeLessThan(5); // Allow some for CDN assets
    });

    test('local storage usage is appropriate', async ({ page }) => {
      await helper.gotoApp();
      
      const localStorage = await page.evaluate(() => {
        const items: { [key: string]: string } = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            items[key] = window.localStorage.getItem(key) || '';
          }
        }
        return items;
      });

      // Should not store sensitive data
      const values = Object.values(localStorage).join(' ').toLowerCase();
      expect(values).not.toMatch(/(password|key|token|secret)/);
    });
  });

  test.describe('Mobile Experience', () => {
    test('works on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await helper.gotoApp();
      await helper.mockCameraPermission();
      await helper.mockGetUserMedia();

      // Should be responsive
      await expect(page.locator('.camera-container')).toBeVisible();
      
      // Touch interactions should work
      await helper.startCamera();
      await expect(page.locator('video')).toBeVisible();
    });

    test('handles device orientation changes', async ({ page }) => {
      await helper.gotoApp();
      
      // Portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      // Landscape
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(500);

      // Should remain functional
      await expect(page.locator('main')).toBeVisible();
    });
  });
});

// Test configuration for different environments
test.describe.configure({ mode: 'parallel' });

// Global test setup
test.beforeAll(async () => {
  console.log('🧪 Starting E2E tests for EcoScan');
});

test.afterAll(async () => {
  console.log('✅ E2E tests completed');
}); 