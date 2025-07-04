#!/usr/bin/env python3
"""
EcoScan Model Download Script
Downloads and prepares YOLOv8n model for browser inference
"""

import os
import sys
import urllib.request
from pathlib import Path

def download_model():
    """Download YOLOv8n model and convert to ONNX format"""
    
    # Create models directory
    models_dir = Path("static/models")
    models_dir.mkdir(parents=True, exist_ok=True)
    
    model_path = models_dir / "yolov8n.onnx"
    
    # Check if model already exists
    if model_path.exists():
        print(f"✅ Model already exists at {model_path}")
        print(f"📏 Size: {model_path.stat().st_size / 1024 / 1024:.1f} MB")
        return True
    
    try:
        # Try to use ultralytics to export model
        print("🔄 Installing ultralytics...")
        os.system("pip install ultralytics")
        
        print("🔄 Downloading and converting YOLOv8n model...")
        
        # Python code to export model
        export_code = '''
from ultralytics import YOLO
import os

# Download YOLOv8n and export to ONNX
model = YOLO('yolov8n.pt')
model.export(format='onnx', imgsz=640, simplify=True, dynamic=False)

# Move to static/models
import shutil
if os.path.exists('yolov8n.onnx'):
    os.makedirs('static/models', exist_ok=True)
    shutil.move('yolov8n.onnx', 'static/models/yolov8n.onnx')
    print("✅ Model exported successfully")
else:
    print("❌ Model export failed")
'''
        
        # Execute the export
        exec(export_code)
        
        if model_path.exists():
            size_mb = model_path.stat().st_size / 1024 / 1024
            print(f"✅ YOLOv8n model downloaded successfully!")
            print(f"📁 Location: {model_path}")
            print(f"📏 Size: {size_mb:.1f} MB")
            return True
        else:
            print("❌ Model download failed")
            return False
            
    except Exception as e:
        print(f"❌ Error downloading model: {e}")
        print("\n🔧 Alternative: Download manually from:")
        print("   https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.onnx")
        print(f"   And place it in: {model_path}")
        return False

def verify_model():
    """Verify the model file is valid"""
    model_path = Path("static/models/yolov8n.onnx")
    
    if not model_path.exists():
        return False
    
    # Check minimum file size (should be around 6MB)
    size_mb = model_path.stat().st_size / 1024 / 1024
    if size_mb < 5:
        print(f"⚠️  Model file seems too small ({size_mb:.1f} MB)")
        return False
    
    print(f"✅ Model verification passed ({size_mb:.1f} MB)")
    return True

if __name__ == "__main__":
    print("🌱 EcoScan - YOLOv8n Model Setup")
    print("=" * 40)
    
    success = download_model()
    
    if success:
        verify_model()
        print("\n🎉 Setup complete! You can now run the development server.")
        print("   npm run dev")
    else:
        print("\n⚠️  Manual setup required. Check the instructions above.")
        sys.exit(1) 