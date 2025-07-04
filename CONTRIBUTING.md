# Contributing to EcoScan 🌱

Thank you for your interest in contributing to EcoScan! We welcome contributions from everyone, whether you're fixing a bug, adding a feature, improving documentation, or just asking questions.

## 🤝 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## 🚀 How to Contribute

### Reporting Issues

Before creating an issue, please:

1. **Search existing issues** to avoid duplicates
2. **Use the bug report template** for bugs
3. **Use the feature request template** for new features
4. **Provide detailed information** including:
   - Browser and version
   - Device type (mobile/desktop)
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots or videos if helpful

### Submitting Pull Requests

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/ecoscan.git
   cd ecoscan
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow our coding standards (see below)
   - Add tests for new functionality
   - Update documentation as needed

4. **Test your changes**
   ```bash
   npm run test
   npm run test:e2e
   npm run lint
   npm run type-check
   ```

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Use the pull request template
   - Link any related issues
   - Provide a clear description of changes

## 📝 Coding Standards

### TypeScript Style

- Use **strict TypeScript** with proper type annotations
- Prefer `interface` over `type` for object types
- Use `const assertions` where appropriate
- Export types alongside implementations

```typescript
// Good
interface DetectionResult {
  bbox: [number, number, number, number];
  confidence: number;
  class: string;
}

export const detector = {
  detect: async (image: ImageData): Promise<DetectionResult[]> => {
    // implementation
  }
} as const;

// Avoid
let result: any = detector.detect(image);
```

### Svelte Components

- Use **TypeScript** in script blocks
- Follow **single responsibility principle**
- Use proper **accessibility attributes**
- Implement **keyboard navigation**

```svelte
<script lang="ts">
  import type { Detection } from '$lib/types';
  
  export let detections: Detection[] = [];
  export let onSelect: (detection: Detection) => void = () => {};
</script>

<div role="region" aria-label="Detection results">
  {#each detections as detection (detection.id)}
    <button
      class="detection-item"
      on:click={() => onSelect(detection)}
      aria-label="Select {detection.class} detection"
    >
      {detection.class}
    </button>
  {/each}
</div>
```

### CSS/Styling

- Use **Tailwind CSS** utility classes
- Prefer component-scoped styles
- Follow **mobile-first** responsive design
- Support **dark mode** and **reduced motion**

```svelte
<style>
  .detection-box {
    @apply absolute border-2 rounded-lg transition-all;
    @apply hover:scale-105 focus:outline-none focus:ring-2;
  }
  
  .detection-box.recycle {
    @apply border-green-500 bg-green-100;
  }
  
  @media (prefers-reduced-motion: reduce) {
    .detection-box {
      @apply transition-none;
    }
  }
</style>
```

### Performance Guidelines

- **Lazy load** non-critical components
- **Debounce** user inputs appropriately
- **Optimize images** and assets
- **Monitor memory usage** in ML operations

```typescript
import { debounce } from '$lib/utils/performance';

const debouncedSearch = debounce(async (query: string) => {
  const results = await classifier.classify(query);
  // handle results
}, 300);
```

## 🧪 Testing

### Unit Tests

Write tests for:
- Utility functions
- Pure components
- Business logic
- Error handling

```typescript
import { test, expect } from 'vitest';
import { validateConfig } from '$lib/config';

test('config validation catches invalid thresholds', () => {
  const result = validateConfig({
    model: { confidenceThreshold: 1.5 }
  });
  
  expect(result.valid).toBe(false);
  expect(result.errors).toContain('confidence threshold must be between 0 and 1');
});
```

### Integration Tests

Test component integration:

```typescript
import { render, fireEvent } from '@testing-library/svelte';
import CameraView from '$lib/components/CameraView.svelte';

test('camera view handles detection results', async () => {
  const { getByRole, getByLabelText } = render(CameraView);
  
  // Mock camera stream
  const startButton = getByRole('button', { name: /start camera/i });
  await fireEvent.click(startButton);
  
  // Assert detection overlay appears
  expect(getByLabelText(/detection results/i)).toBeInTheDocument();
});
```

### E2E Tests

Test complete user workflows:

```typescript
import { test, expect } from '@playwright/test';

test('user can classify waste using camera', async ({ page }) => {
  await page.goto('/');
  
  // Grant camera permissions
  await page.context().grantPermissions(['camera']);
  
  // Start camera
  await page.click('[data-testid="start-camera"]');
  
  // Wait for detection
  await page.waitForSelector('[data-testid="detection-box"]');
  
  // Click detection for details
  await page.click('[data-testid="detection-box"]');
  
  // Verify modal opens
  await expect(page.locator('[data-testid="detection-modal"]')).toBeVisible();
});
```

## 🎨 Design Guidelines

### Accessibility

- **Keyboard navigation** for all interactive elements
- **Screen reader** compatibility
- **High contrast** support
- **Touch target** minimum size (44px)

### Mobile-First

- Design for **mobile devices** first
- Use **responsive breakpoints**:
  - `sm: 640px` - Small tablets
  - `md: 768px` - Tablets
  - `lg: 1024px` - Laptops
  - `xl: 1280px` - Desktops

### Performance

- **60 FPS** on modern devices
- **<3 second** initial load time
- **<100ms** interaction response time
- **Progressive enhancement**

## 🔧 Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Download model**
   ```bash
   python3 scripts/download-model.py
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Run tests**
   ```bash
   npm run test:watch
   ```

## 📦 Project Structure

```
src/
├── lib/
│   ├── components/     # Reusable UI components
│   ├── ml/            # Machine learning modules
│   ├── stores/        # Svelte stores for state
│   ├── utils/         # Utility functions
│   ├── config/        # Configuration management
│   └── types/         # TypeScript type definitions
├── routes/            # SvelteKit pages
└── service-worker.ts  # PWA service worker
```

## 🚀 Release Process

1. **Version Bump**
   ```bash
   npm version patch|minor|major
   ```

2. **Update Changelog**
   - Document new features
   - List bug fixes
   - Note breaking changes

3. **Create Release**
   - Tag the release
   - Generate release notes
   - Deploy to production

## 💡 Feature Ideas

Looking for contribution ideas? Here are some areas we'd love help with:

### 🎯 High Priority
- [ ] Improve model accuracy for specific waste types
- [ ] Add support for more languages
- [ ] Implement offline model updates
- [ ] Add batch image processing

### 🔧 Technical Improvements
- [ ] Optimize model inference speed
- [ ] Add visual regression testing
- [ ] Improve error recovery
- [ ] Add performance monitoring

### 🌟 New Features
- [ ] Custom waste category training
- [ ] Integration with local recycling APIs
- [ ] Gamification and achievements
- [ ] Social sharing of results

### 📚 Documentation
- [ ] Video tutorials
- [ ] API documentation
- [ ] Deployment guides
- [ ] Accessibility audit

## ❓ Questions?

- **General questions**: [GitHub Discussions](https://github.com/yourusername/ecoscan/discussions)
- **Bug reports**: [GitHub Issues](https://github.com/yourusername/ecoscan/issues)
- **Security issues**: security@ecoscan.app
- **Real-time chat**: [Discord Server](https://discord.gg/ecoscan)

## 🙏 Recognition

Contributors are recognized in:
- **README contributors section**
- **CHANGELOG.md** for each release
- **GitHub contributors graph**
- **Annual contributor report**

Thank you for helping make waste sorting better for everyone! 🌱 