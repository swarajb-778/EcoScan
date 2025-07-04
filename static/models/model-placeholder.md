# YOLOv8n Model Placeholder

## Download Instructions

To set up the YOLOv8n ONNX model for EcoScan:

### Option 1: Manual Download
```bash
# Download directly from Ultralytics
curl -L -o static/models/yolov8n.onnx https://github.com/ultralytics/yolov8/releases/download/v8.0.0/yolov8n.onnx

# Alternative: Use wget
wget -O static/models/yolov8n.onnx https://github.com/ultralytics/yolov8/releases/download/v8.0.0/yolov8n.onnx
```

### Option 2: Using Python Script
```bash
python3 scripts/download-model.py
```

### Model Requirements
- **File**: `yolov8n.onnx`
- **Size**: ~6.2MB
- **Input**: 640x640x3 RGB
- **Format**: ONNX (Open Neural Network Exchange)

### Verification
The model file should be approximately 6.2MB and have the following properties:
- Input shape: [1, 3, 640, 640]
- Output shape: [1, 84, 8400]
- Model type: YOLOv8n (nano version)

### Fallback Options
If download fails, the application will:
1. Show informative error messages
2. Enable mock detection mode in development
3. Allow manual model upload via UI

### Development Mode
Set `VITE_DEV_ENABLE_MOCK_MODEL=true` in `.env` to use mock detection without the actual model. 