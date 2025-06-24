# 🌱 EcoScan - AI-Powered Waste Classification

[![Live Demo](https://img.shields.io/badge/Demo-Live-green)](https://ecoscan.vercel.app)
[![Built with SvelteKit](https://img.shields.io/badge/Built%20with-SvelteKit-orange)](https://kit.svelte.dev/)
[![Powered by YOLO](https://img.shields.io/badge/AI-YOLOv8-blue)](https://ultralytics.com/yolov8)

> **Real-time object detection and waste classification in your browser**

EcoScan is a progressive web application that helps users properly sort their waste by using computer vision to identify objects and classify them into **Recycle**, **Compost**, or **Landfill** categories.

![EcoScan Demo](https://via.placeholder.com/800x400/22c55e/ffffff?text=EcoScan+Demo)

## ✨ Features

### 🎥 **Real-Time Camera Detection**
- Point your camera at waste items
- Instant object detection with bounding boxes
- Live classification with disposal instructions
- Works on mobile and desktop browsers

### 📱 **Voice Input**
- Say the item name for quick classification
- Speech-to-text conversion
- Fuzzy matching for natural language

### 📸 **Image Upload**
- Drag & drop or select images
- Batch processing for multiple items
- Detailed analysis with confidence scores

### 🚀 **Key Benefits**
- **Zero Installation** - Works directly in web browsers
- **Privacy First** - All processing happens on your device
- **Offline Capable** - Core features work without internet
- **Fast & Accurate** - Real-time detection at 15+ FPS
- **Educational** - Learn proper disposal methods

## 🛠️ Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | SvelteKit + TypeScript | Fast, reactive UI framework |
| **Styling** | Tailwind CSS + DaisyUI | Responsive, modern design |
| **AI/ML** | YOLOv8n + ONNX Runtime Web | Real-time object detection |
| **Voice** | Web Speech API | Browser-native speech recognition |
| **Build** | Vite | Lightning-fast development |
| **Deploy** | Vercel/Netlify | Edge-optimized hosting |

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ 
- **Python** 3.8+ (for model export)
- Modern web browser with camera access

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/EcoScan.git
cd EcoScan
npm install
```

### 2. Export YOLO Model
```bash
# Install Python dependencies
pip install ultralytics

# Export YOLOv8n to ONNX format
python -c "
from ultralytics import YOLO
model = YOLO('yolov8n.pt')
model.export(format='onnx', imgsz=640, simplify=True)
"

# Move model to static folder
mkdir -p static/models
mv yolov8n.onnx static/models/
```

### 3. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Configure Tailwind CSS
npx tailwindcss init -p
```

### 4. Start Development
```bash
npm run dev
```

Visit `http://localhost:5173` and grant camera permissions to start detecting!

## 📁 Project Structure

```
EcoScan/
├── src/
│   ├── lib/
│   │   ├── components/         # Svelte components
│   │   │   ├── CameraView.svelte
│   │   │   ├── ImageUpload.svelte
│   │   │   └── VoiceInput.svelte
│   │   ├── ml/                 # ML pipeline
│   │   │   ├── detector.ts     # YOLO detection
│   │   │   └── classifier.ts   # Waste classification
│   │   ├── stores/             # State management
│   │   ├── utils/              # Helper functions
│   │   └── types/              # TypeScript definitions
│   ├── routes/                 # SvelteKit routes
│   │   ├── +layout.svelte      # App shell
│   │   ├── +page.svelte        # Home page
│   │   ├── camera/             # Camera interface
│   │   ├── upload/             # Upload interface
│   │   └── voice/              # Voice interface
│   └── app.html                # HTML template
├── static/
│   ├── models/                 # ONNX models
│   │   └── yolov8n.onnx       # YOLOv8 nano model
│   └── data/                   # Classification data
│       └── wasteData.json     # Object-to-category mapping
├── docs/                       # Documentation
│   ├── PRD_EcoScan_Detailed.md
│   └── Project_Breakdown_1Day.md
└── package.json
```

## 🎯 Development Phases

This project is designed for **1-day development** with clear phases:

| Phase | Duration | Focus |
|-------|----------|-------|
| **Setup** | 1.5h | Project initialization, dependencies |
| **Core ML** | 3.5h | YOLO integration, detection pipeline |
| **UI/UX** | 2.5h | Camera interface, responsive design |
| **Features** | 1.5h | Voice input, image upload |
| **Deploy** | 1h | Optimization, production deployment |

See [`Project_Breakdown_1Day.md`](./Project_Breakdown_1Day.md) for detailed tasks and subtasks.

## 🌍 Environmental Impact

EcoScan addresses critical waste management challenges:

- **🗂️ Reduce Contamination** - Proper sorting prevents recycling contamination
- **📚 Education** - Teach users about different material types
- **♻️ Increase Recycling** - Make correct disposal decisions easy
- **🌱 Promote Composting** - Identify compostable organic materials

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **🐛 Report Bugs** - Found an issue? Open a GitHub issue
2. **💡 Suggest Features** - Have ideas? Start a discussion
3. **🔧 Code Contributions** - Fork, branch, and submit PRs
4. **📚 Documentation** - Improve docs and examples
5. **🧪 Testing** - Test on different devices and browsers

### Development Guidelines
- Follow TypeScript strict mode
- Use Prettier for code formatting
- Test on mobile devices
- Maintain accessibility standards

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[Ultralytics](https://ultralytics.com/)** for YOLOv8
- **[ONNX Runtime](https://onnxruntime.ai/)** for web inference
- **[SvelteKit](https://kit.svelte.dev/)** for the amazing framework
- **Environmental organizations** inspiring this work

## 📞 Support

- 📧 **Email**: [your-email@example.com]
- 🐦 **Twitter**: [@your-handle]
- 💬 **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/EcoScan/discussions)

---

**⭐ Star this repository if you find it useful!**

Made with ❤️ for a greener planet 🌍 