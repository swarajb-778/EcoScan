# EcoScan AI Models

This directory contains the machine learning models used by EcoScan for waste classification and detection.

## Required Models

The EcoScan API requires the following models to be present in this directory:

1. **YOLOv8 Object Detection Model**
   - Filename: `yolov8n.onnx`
   - Size: ~12MB
   - Description: ONNX-formatted YOLOv8 nano model for detecting waste items in images
   - Download: [YOLOv8n ONNX Model](https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.pt)

2. **Waste Classification Model**
   - Filename: `waste_classifier.onnx`
   - Size: ~6MB
   - Description: ONNX-formatted classifier for categorizing waste into recycle/compost/landfill/hazardous categories
   - This is a custom model that needs to be trained on waste classification dataset

## Model Download

To download the required models:

```bash
# From the api directory
cd models

# Download YOLOv8n model
curl -L https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.onnx -o yolov8n.onnx

# Note: For the waste classifier, you need to train your own model or use a pre-trained one
```

## Model Configuration

The API will automatically look for these models in this directory. You can configure custom model paths using environment variables:

- `DETECTION_MODEL_PATH`: Path to object detection model
- `CLASSIFICATION_MODEL_PATH`: Path to waste classification model

## Model Formats

All models should be in ONNX format for maximum compatibility and performance across platforms. ONNX provides a consistent runtime interface regardless of the framework used to train the model.

## Fallback Models

For low-resource environments, we provide fallback models:

- `yolov8n-fallback.onnx`: A smaller, quantized version of YOLOv8n
- `yolov8s-lite.onnx`: A pruned small model for mobile devices
- `basic-detector.onnx`: Minimal model for very constrained environments

## Model Versioning

The API supports model versioning. You can add new model versions by using the following naming convention:

- `yolov8n-v2.onnx`
- `waste_classifier-v2.onnx`

## Performance Considerations

- For best performance, models are loaded into memory at startup
- Models are automatically optimized for the available hardware (CPU/GPU)
- Quantized models (INT8) are used when running on low-memory devices 