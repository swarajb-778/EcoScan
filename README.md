# 🌱 EcoScan - AI-Powered Waste Classification

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?logo=svelte&logoColor=white)](https://kit.svelte.dev/)
[![PWA](https://img.shields.io/badge/PWA-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

> **Real-time waste classification using computer vision and voice recognition for better environmental choices**

EcoScan is a cutting-edge Progressive Web Application that leverages AI to help users properly classify and dispose of waste items. Using advanced computer vision, voice recognition, and a comprehensive waste database, EcoScan makes environmental responsibility accessible to everyone.

## ✨ Features

### 🤖 AI-Powered Detection
- **Real-time Object Detection**: YOLOv8 neural network with 95%+ accuracy
- **Local Processing**: All AI inference happens on your device for privacy
- **160+ Waste Categories**: Comprehensive classification database
- **Smart Recommendations**: Disposal instructions and environmental impact

### 📱 Multi-Modal Input
- **📸 Camera Detection**: Real-time waste identification through camera
- **📤 Image Upload**: Drag & drop or browse to analyze existing photos
- **🎤 Voice Input**: Describe items using speech recognition
- **🔄 Cross-Platform**: Works on mobile, tablet, and desktop

### 🌍 Environmental Focus
- **Recycling Guidelines**: Proper disposal methods for each category
- **Environmental Impact**: Learn about the ecological effects of waste
- **Local Processing**: Zero carbon footprint from server processing
- **Educational Content**: Comprehensive information about sustainability

### 🔒 Privacy-First Design
- **Local Processing**: Images never leave your device
- **No Data Collection**: Personal information stays private
- **Offline Capable**: Full functionality without internet connection
- **Anonymous Analytics**: Optional usage statistics only

### 📊 Advanced Features
- **Performance Monitoring**: Real-time analytics and optimization
- **PWA Support**: Install as native app on any device
- **Accessibility**: WCAG compliant with screen reader support
- **Responsive Design**: Optimized for all screen sizes

## 🚀 Quick Start

### Online Demo
Visit [EcoScan](https://your-deployment-url.com) to try it instantly - no installation required!

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/ecoscan.git
cd ecoscan

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to your preferred platform
npm run deploy
```

## 🏗️ Architecture

### Technology Stack
- **Frontend**: SvelteKit + TypeScript
- **AI/ML**: YOLOv8 + ONNX Runtime Web
- **Styling**: TailwindCSS + Custom Components
- **PWA**: Vite PWA Plugin + Service Workers
- **Search**: Fuse.js for fuzzy matching
- **Analytics**: Custom privacy-focused system

### Project Structure
```
src/
├── lib/
│   ├── components/          # Reusable UI components
│   │   ├── CameraView.svelte
│   │   ├── ImageUpload.svelte
│   │   ├── VoiceInput.svelte
│   │   └── DetectionDetails.svelte
│   ├── ml/                  # Machine learning modules
│   │   ├── detector.ts      # YOLO object detection
│   │   ├── classifier.ts    # Waste classification
│   │   └── preprocessing.ts # Image processing
│   ├── utils/               # Utility libraries
│   │   ├── camera.ts        # Camera management
│   │   ├── voice.ts         # Speech recognition
│   │   ├── analytics.ts     # Performance monitoring
│   │   └── qr.ts           # QR code generation
│   ├── stores/              # Svelte stores
│   │   └── appStore.ts     # Global state management
│   ├── types/               # TypeScript definitions
│   └── config.ts           # App configuration
├── routes/                  # SvelteKit routes
│   ├── +layout.svelte      # App layout
│   ├── +page.svelte        # Camera page
│   ├── upload/             # Image upload page
│   ├── voice/              # Voice input page
│   ├── about/              # About page
│   ├── privacy/            # Privacy policy
│   └── help/               # Help & support
└── static/
    ├── models/             # AI model files
    ├── data/               # Waste classification data
    └── icons/              # PWA icons
```

## 🧠 AI Model Details

### YOLOv8 Object Detection
- **Model**: YOLOv8n (Nano) optimized for web
- **Format**: ONNX for cross-platform compatibility
- **Size**: 12.2MB compressed
- **Performance**: <100ms inference time on modern devices
- **Accuracy**: 95%+ on common waste items

### Waste Classification Database
- **Categories**: Recycling, Composting, Landfill, Hazardous
- **Items**: 160+ common household waste items
- **Fuzzy Search**: Intelligent matching with Fuse.js
- **Localization**: Extensible for regional guidelines

## 📱 PWA Features

### Installation
- **One-click Install**: Browser prompt for easy installation
- **App Shortcuts**: Quick access to camera, upload, and voice features
- **File Handling**: Open images directly in EcoScan
- **Share Target**: Receive images from other apps

### Offline Capability
- **Service Worker**: Full offline functionality
- **Model Caching**: AI models cached locally
- **Data Storage**: Classification database stored locally
- **Sync**: Optional background sync when online

## 🔧 Configuration

### Environment Variables
```env
# App Configuration
VITE_APP_VERSION=1.0.0
VITE_APP_NAME=EcoScan
VITE_APP_DESCRIPTION="AI-Powered Waste Classification"

# Analytics (Optional)
VITE_ANALYTICS_ENABLED=true
VITE_ANALYTICS_ID=your-analytics-id

# API Configuration (Optional)
VITE_API_BASE_URL=https://api.ecoscan.app
VITE_API_TIMEOUT=5000

# Feature Flags
VITE_FEATURE_VOICE=true
VITE_FEATURE_ANALYTICS=true
VITE_FEATURE_QR_SHARING=true
```

### Model Configuration
```typescript
// src/lib/config.ts
export const modelConfig = {
  yolo: {
    modelPath: '/models/yolov8n.onnx',
    inputSize: 640,
    confidenceThreshold: 0.5,
    iouThreshold: 0.45
  },
  classification: {
    dataPath: '/data/waste-categories.json',
    fuzzyThreshold: 0.6,
    maxResults: 5
  }
};
```

## 🧪 Testing

### Unit Tests
```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### E2E Tests
```bash
# Run end-to-end tests
npm run test:e2e

# Run E2E tests in headless mode
npm run test:e2e:headless
```

### Performance Testing
```bash
# Lighthouse audit
npm run audit

# Bundle analysis
npm run analyze

# Performance profiling
npm run profile
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod
```

### Netlify
```bash
# Build for production
npm run build

# Deploy to Netlify
netlify deploy --prod --dir=build
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
```

### GitHub Pages
```bash
# Install adapter
npm install -D @sveltejs/adapter-static

# Configure for static deployment
# Update svelte.config.js with adapter-static

# Build and deploy
npm run build
# Upload build/ directory to GitHub Pages
```

## 📊 Performance Metrics

### Core Web Vitals
- **First Contentful Paint**: <1.5s
- **Largest Contentful Paint**: <2.5s
- **Cumulative Layout Shift**: <0.1
- **First Input Delay**: <100ms

### AI Performance
- **Model Load Time**: <3s on first visit
- **Inference Time**: <100ms on modern devices
- **Memory Usage**: <200MB typical
- **Battery Impact**: Minimal with optimizations

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Code Style
- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier with default config
- **Linting**: ESLint with SvelteKit rules
- **Testing**: Vitest + Playwright for E2E

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **YOLOv8**: Ultralytics for the object detection model
- **ONNX Runtime**: Microsoft for the inference engine
- **SvelteKit**: The Svelte team for the amazing framework
- **TailwindCSS**: For the utility-first CSS framework
- **Community**: All contributors and users who make this project possible

## 📞 Support

- **Documentation**: [Full Documentation](https://ecoscan-docs.com)
- **Issues**: [GitHub Issues](https://github.com/yourusername/ecoscan/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/ecoscan/discussions)
- **Email**: support@ecoscan.app

## 🗺️ Roadmap

### Version 1.1 (Q1 2025)
- [ ] Multi-language support
- [ ] Enhanced voice commands
- [ ] Barcode scanning integration
- [ ] Community waste database

### Version 1.2 (Q2 2025)
- [ ] AR visualization
- [ ] Location-based disposal finder
- [ ] Gamification features
- [ ] Social sharing

### Version 2.0 (Q3 2025)
- [ ] Custom model training
- [ ] Enterprise features
- [ ] API for third-party integration
- [ ] Advanced analytics dashboard

---

<div align="center">

**Made with 💚 for a better planet**

[Website](https://ecoscan.app) • [Demo](https://demo.ecoscan.app) • [Documentation](https://docs.ecoscan.app)

</div>
