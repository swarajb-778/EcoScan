#!/bin/bash

# EcoScan Development Setup Script
echo "🌱 EcoScan Development Setup"
echo "============================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install npm dependencies
echo "📦 Installing dependencies..."
npm install

# Check if Python is available for model download
if command -v python3 &> /dev/null; then
    echo "🐍 Python 3 detected - setting up ML model..."
    python3 scripts/download-model.py
elif command -v python &> /dev/null; then
    echo "🐍 Python detected - setting up ML model..."
    python scripts/download-model.py
else
    echo "⚠️  Python not found. You'll need to manually download the YOLO model:"
    echo "   1. Download yolov8n.onnx from: https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.onnx"
    echo "   2. Place it in: static/models/yolov8n.onnx"
fi

# Check if model exists
if [ -f "static/models/yolov8n.onnx" ]; then
    echo "✅ YOLO model is ready"
else
    echo "⚠️  YOLO model not found. The app will show errors until the model is available."
fi

# Create necessary directories
mkdir -p static/models static/data

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "  1. npm run dev      # Start development server"
echo "  2. Open http://localhost:5173"
echo ""
echo "📱 For mobile testing, use your local IP:"
echo "  http://$(ipconfig getifaddr en0 2>/dev/null || hostname -I | awk '{print $1}'):5173" 