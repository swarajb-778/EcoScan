# EcoScan 🌱

AI-powered waste classification application using computer vision to help users sort waste correctly for sustainable living.

## ✨ Features

- **AI-Powered Detection**: Advanced YOLOv8 object detection for waste identification
- **Multi-Modal Input**: Camera capture, image upload, and voice input support
- **Real-Time Classification**: Instant waste categorization (recycle, compost, landfill)
- **Adaptive Performance**: Dynamic optimization based on device capabilities
- **Progressive Web App**: Installable with offline capabilities
- **Comprehensive Testing**: Built-in testing framework and performance monitoring
- **Accessibility First**: Full keyboard navigation and screen reader support

## 🚀 Quick Start

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

## 🏗️ Development

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Modern browser with WebGL support

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run check        # Run type checking
npm run lint         # Run linting
npm run format       # Format code with Prettier
```

### Testing

Access the developer tools at `/dev` in development mode for:

- **Concurrent User Simulation**: Test with multiple simulated users
- **Automated Testing**: Run comprehensive test suites
- **Performance Monitoring**: Real-time metrics and optimization

## 🧠 AI Models

The application uses ONNX.js with YOLOv8 models:

- **YOLOv8n**: Fast, lightweight detection (default)
- **YOLOv8s**: Balanced speed and accuracy
- **YOLOv8m**: Higher accuracy for complex scenes

Models are loaded dynamically based on device capabilities and user settings.

## 🏗️ Architecture

### Core Technologies

- **Frontend**: SvelteKit with TypeScript
- **AI/ML**: ONNX.js, YOLOv8, Custom waste classifier
- **Styling**: TailwindCSS with DaisyUI
- **State Management**: Svelte stores with SSR safety
- **PWA**: Service Worker with offline caching

### Key Components

- **Object Detection**: Real-time waste item detection
- **Classification Engine**: Waste category determination
- **Adaptive Engine**: Performance optimization
- **WebGL Manager**: GPU acceleration management
- **A/B Testing**: Experiment framework for model comparison

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Required Features

- WebGL for GPU acceleration
- getUserMedia for camera access
- Web Audio API for audio feedback (optional)
- Service Worker for PWA features

## 🔧 Configuration

### Environment Variables

```env
# Optional: Analytics and monitoring
VITE_ANALYTICS_ID=your_analytics_id
VITE_SENTRY_DSN=your_sentry_dsn

# Model configurations
VITE_MODEL_PATH=/models/
VITE_DEFAULT_MODEL=yolov8n.onnx
```

### Model Customization

Place custom ONNX models in `static/models/` and update the configuration in `src/lib/ml/detector.ts`.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript for type safety
- Follow Prettier formatting rules
- Add JSDoc comments for public APIs
- Include tests for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [YOLOv8](https://github.com/ultralytics/ultralytics) for object detection
- [ONNX.js](https://onnxjs.ai/) for browser-based AI inference  
- [SvelteKit](https://kit.svelte.dev/) for the amazing framework
- Environmental organizations promoting sustainable practices

## 🛠️ Troubleshooting

### Common Issues

**Camera not working:**
- Ensure HTTPS is enabled (required for camera access)
- Check browser permissions for camera access
- Close other applications using the camera

**AI models not loading:**
- Check network connection
- Ensure sufficient device memory (2GB+ recommended)
- Try refreshing the page
- Use the diagnostic panel (click 🔧 in footer) for detailed information

**Performance issues:**
- Close unnecessary browser tabs
- Use the performance optimization system (auto-enabled)
- Consider using a more powerful device for better experience

**Application errors:**
- The app includes automatic error recovery
- Check the diagnostic panel for system health
- Try the "Auto Recovery" feature if errors persist

### Performance Optimization

The application automatically optimizes based on your device:
- **High-end devices**: Full features with WebGL acceleration
- **Mid-range devices**: Balanced performance and quality
- **Low-end devices**: Reduced quality for better performance

## 📞 Support

- Create an [Issue](https://github.com/yourusername/ecoscan/issues) for bug reports
- Start a [Discussion](https://github.com/yourusername/ecoscan/discussions) for questions
- Check the [Wiki](https://github.com/yourusername/ecoscan/wiki) for detailed documentation
- Use the built-in diagnostic panel for system health information

---

Made with 💚 for a sustainable future

## 🚀 Latest Enhancements

### Version 2.0 - Enhanced AI & Performance Update

**🤖 Advanced AI Detection System:**
- **Enhanced Detection Engine**: New `EnhancedDetector` with LLM integration for contextual understanding
- **Multi-Model Support**: Dynamic model switching based on device performance (fp32, fp16, int8, int4)
- **Ensemble Detection**: Combines multiple models for higher accuracy
- **Adaptive Performance**: Real-time optimization based on device capabilities

**⚡ Performance Optimization:**
- **Smart Performance Monitoring**: Continuous performance analysis and optimization
- **Dynamic Model Loading**: Automatic selection of optimal model variant for device
- **Memory Management**: Advanced memory pressure handling and garbage collection
- **Battery Awareness**: Automatic power-saving mode on low battery

**🧪 Comprehensive Testing Strategy:**
- **Unit Tests**: Complete coverage of all components, ML systems, and utilities
- **Integration Tests**: End-to-end ML pipeline testing with error scenarios
- **E2E Tests**: Full user workflow testing with Playwright
- **Performance Benchmarking**: Automated performance testing and monitoring
- **Error Handling Tests**: Robust testing of edge cases and failure scenarios

**🔧 Developer Experience:**
- **Advanced Diagnostics**: Detailed performance monitoring and debugging tools
- **Development Tools**: Comprehensive testing framework and development utilities
- **Error Recovery**: Intelligent error recovery with graceful degradation
- **Progressive Loading**: Smart model preloading and caching strategies
