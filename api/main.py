"""
EcoScan FastAPI Service
Advanced AI processing and model optimization for waste classification
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import asyncio
import io
import base64
import numpy as np
from PIL import Image
import cv2
import logging
import time
from datetime import datetime, timedelta
import uuid
import os
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="EcoScan AI Service",
    description="Advanced AI processing for waste classification and environmental impact analysis",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for API requests/responses
class DetectionRequest(BaseModel):
    image_data: str = Field(..., description="Base64 encoded image data")
    confidence_threshold: float = Field(0.5, ge=0.0, le=1.0)
    model_version: str = Field("latest", description="Model version to use")

class DetectionResult(BaseModel):
    id: str
    label: str
    category: str
    confidence: float
    bbox: List[float]
    instructions: str
    tips: List[str]
    environmental_impact: Dict[str, Any]

class DetectionResponse(BaseModel):
    success: bool
    detections: List[DetectionResult]
    processing_time: float
    model_info: Dict[str, Any]
    recommendations: List[Dict[str, Any]]

class OptimizationRequest(BaseModel):
    device_info: Dict[str, Any]
    performance_metrics: Dict[str, Any]
    preferred_quality: str = Field("balanced", regex="^(fast|balanced|accurate)$")

class OptimizationResponse(BaseModel):
    optimized_config: Dict[str, Any]
    expected_performance: Dict[str, Any]
    recommendations: List[str]

class FeedbackRequest(BaseModel):
    detection_id: str
    user_correction: str
    confidence_rating: float = Field(..., ge=0.0, le=1.0)
    was_helpful: bool

# Global variables for model caching
model_cache = {}
performance_stats = {
    "total_requests": 0,
    "average_processing_time": 0,
    "model_accuracy": 0.89,
    "cache_hits": 0
}

class AdvancedWasteClassifier:
    """Advanced waste classification using multiple AI techniques"""
    
    def __init__(self):
        self.models = {}
        self.preprocessing_pipeline = None
        self.confidence_thresholds = {
            "recycle": 0.7,
            "compost": 0.8,
            "trash": 0.6,
            "hazardous": 0.9
        }
        self.environmental_database = self.load_environmental_database()
        
    def load_environmental_database(self) -> Dict[str, Any]:
        """Load environmental impact database"""
        return {
            "plastic_bottle": {
                "co2_footprint": 2.3,  # kg CO2
                "recycling_rate": 0.29,
                "decomposition_time": "450 years",
                "recycled_uses": ["clothing", "carpets", "park benches"]
            },
            "aluminum_can": {
                "co2_footprint": 3.2,
                "recycling_rate": 0.75,
                "decomposition_time": "200-500 years",
                "energy_saved_recycling": 0.95
            },
            "food_waste": {
                "methane_production": 1.1,  # kg CO2 equivalent
                "compost_time": "3-6 months",
                "soil_improvement": "rich nutrients"
            }
        }
    
    async def classify_image(self, image_data: str, config: Dict[str, Any]) -> List[DetectionResult]:
        """Classify waste items in image using advanced AI"""
        start_time = time.time()
        
        try:
            # Decode base64 image
            image = self.decode_base64_image(image_data)
            
            # Preprocessing pipeline
            processed_image = await self.preprocess_image(image, config)
            
            # Multi-model ensemble prediction
            detections = await self.ensemble_predict(processed_image, config)
            
            # Post-processing and validation
            validated_detections = await self.validate_detections(detections, processed_image)
            
            # Add environmental impact data
            enriched_detections = await self.enrich_with_environmental_data(validated_detections)
            
            processing_time = time.time() - start_time
            logger.info(f"Classification completed in {processing_time:.3f}s")
            
            return enriched_detections
            
        except Exception as e:
            logger.error(f"Classification error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")
    
    def decode_base64_image(self, image_data: str) -> np.ndarray:
        """Decode base64 image to numpy array"""
        try:
            # Remove data URL prefix if present
            if "data:image" in image_data:
                image_data = image_data.split(",")[1]
            
            # Decode base64
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert to numpy array
            return np.array(image)
            
        except Exception as e:
            raise ValueError(f"Invalid image data: {str(e)}")
    
    async def preprocess_image(self, image: np.ndarray, config: Dict[str, Any]) -> np.ndarray:
        """Advanced image preprocessing pipeline"""
        try:
            # Resize image based on performance requirements
            target_size = config.get("target_size", (640, 640))
            image = cv2.resize(image, target_size)
            
            # Enhance image quality
            if config.get("enhance_quality", True):
                # Contrast enhancement
                lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
                l, a, b = cv2.split(lab)
                l = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8)).apply(l)
                image = cv2.merge([l, a, b])
                image = cv2.cvtColor(image, cv2.COLOR_LAB2RGB)
            
            # Noise reduction
            if config.get("denoise", True):
                image = cv2.bilateralFilter(image, 9, 75, 75)
            
            # Normalization
            image = image.astype(np.float32) / 255.0
            
            return image
            
        except Exception as e:
            logger.error(f"Preprocessing error: {str(e)}")
            return image
    
    async def ensemble_predict(self, image: np.ndarray, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Ensemble prediction using multiple models"""
        # This would integrate with actual ML models (TensorFlow, PyTorch, etc.)
        # For demonstration, we'll simulate advanced detection
        
        await asyncio.sleep(0.1)  # Simulate model inference time
        
        # Simulate object detection results
        mock_detections = [
            {
                "label": "Plastic Bottle",
                "category": "recycle",
                "confidence": 0.92,
                "bbox": [100, 50, 200, 300],
                "segmentation_mask": None,
                "material_composition": {"plastic": 0.95, "metal": 0.05}
            },
            {
                "label": "Apple Core",
                "category": "compost",
                "confidence": 0.87,
                "bbox": [300, 100, 450, 250],
                "segmentation_mask": None,
                "material_composition": {"organic": 1.0}
            }
        ]
        
        return mock_detections
    
    async def validate_detections(self, detections: List[Dict[str, Any]], image: np.ndarray) -> List[Dict[str, Any]]:
        """Validate and filter detections"""
        validated = []
        
        for detection in detections:
            # Confidence threshold filtering
            category = detection["category"]
            threshold = self.confidence_thresholds.get(category, 0.5)
            
            if detection["confidence"] >= threshold:
                # Additional validation could include:
                # - Bbox sanity checks
                # - Object size validation
                # - Context analysis
                validated.append(detection)
        
        return validated
    
    async def enrich_with_environmental_data(self, detections: List[Dict[str, Any]]) -> List[DetectionResult]:
        """Enrich detections with environmental impact data"""
        enriched = []
        
        for detection in detections:
            label_key = detection["label"].lower().replace(" ", "_")
            env_data = self.environmental_database.get(label_key, {})
            
            # Generate disposal instructions
            instructions = self.generate_disposal_instructions(detection["category"], detection["label"])
            
            # Generate tips
            tips = self.generate_tips(detection["category"], detection["label"], env_data)
            
            enriched_detection = DetectionResult(
                id=str(uuid.uuid4()),
                label=detection["label"],
                category=detection["category"],
                confidence=detection["confidence"],
                bbox=detection["bbox"],
                instructions=instructions,
                tips=tips,
                environmental_impact=env_data
            )
            
            enriched.append(enriched_detection)
        
        return enriched
    
    def generate_disposal_instructions(self, category: str, label: str) -> str:
        """Generate specific disposal instructions"""
        instructions = {
            "recycle": f"Clean the {label.lower()}, remove any labels, and place in recycling bin. Check local guidelines for specific requirements.",
            "compost": f"Add the {label.lower()} to your compost bin or organic waste collection. Ensure no stickers or non-organic materials are attached.",
            "trash": f"Dispose of the {label.lower()} in regular waste bin. Consider if there are reusable alternatives for future use.",
            "hazardous": f"Take the {label.lower()} to designated hazardous waste facility. Do not dispose in regular trash or recycling."
        }
        
        return instructions.get(category, "Follow local waste disposal guidelines.")
    
    def generate_tips(self, category: str, label: str, env_data: Dict[str, Any]) -> List[str]:
        """Generate helpful tips based on item and environmental data"""
        tips = []
        
        if category == "recycle":
            tips.append(f"Recycling this {label.lower()} saves energy and reduces landfill waste")
            if "energy_saved_recycling" in env_data:
                tips.append(f"Recycling saves {int(env_data['energy_saved_recycling']*100)}% of energy vs. new production")
        
        elif category == "compost":
            tips.append(f"Composting reduces methane emissions from landfills")
            if "compost_time" in env_data:
                tips.append(f"This will decompose in approximately {env_data['compost_time']}")
        
        elif category == "trash":
            tips.append("Consider reusable alternatives to reduce waste")
            if "decomposition_time" in env_data:
                tips.append(f"This item takes {env_data['decomposition_time']} to decompose")
        
        return tips

# Global classifier instance
classifier = AdvancedWasteClassifier()

class ModelOptimizer:
    """Optimize model performance based on device capabilities"""
    
    def __init__(self):
        self.optimization_cache = {}
    
    async def optimize_for_device(self, device_info: Dict[str, Any], performance_metrics: Dict[str, Any], quality: str) -> Dict[str, Any]:
        """Generate optimized configuration for device"""
        
        # Analyze device capabilities
        memory_gb = device_info.get("memory", 4)
        cpu_cores = device_info.get("cores", 2)
        gpu_available = device_info.get("gpu", False)
        network_speed = device_info.get("network_speed", "3g")
        
        # Generate optimization config
        config = {
            "model_precision": "float32",
            "batch_size": 1,
            "target_size": (640, 640),
            "enhancement_level": "medium",
            "cache_enabled": True
        }
        
        # Device-specific optimizations
        if memory_gb < 2:
            config.update({
                "model_precision": "int8",
                "target_size": (416, 416),
                "enhancement_level": "low",
                "batch_size": 1
            })
        elif memory_gb >= 8:
            config.update({
                "target_size": (832, 832),
                "enhancement_level": "high",
                "batch_size": 2
            })
        
        if gpu_available:
            config["acceleration"] = "gpu"
        else:
            config["acceleration"] = "cpu"
        
        # Quality preference adjustments
        if quality == "fast":
            config.update({
                "target_size": (320, 320),
                "enhancement_level": "low",
                "model_precision": "int8"
            })
        elif quality == "accurate":
            config.update({
                "target_size": (1024, 1024),
                "enhancement_level": "high",
                "model_precision": "float32"
            })
        
        # Performance predictions
        expected_performance = self.predict_performance(config, device_info)
        
        return {
            "config": config,
            "performance": expected_performance,
            "recommendations": self.generate_recommendations(config, device_info)
        }
    
    def predict_performance(self, config: Dict[str, Any], device_info: Dict[str, Any]) -> Dict[str, Any]:
        """Predict performance metrics based on configuration"""
        
        # Base performance estimates
        base_fps = 15
        base_accuracy = 0.85
        base_latency = 200  # ms
        
        # Adjust based on configuration
        size_factor = (config["target_size"][0] / 640) ** 2
        fps = base_fps / size_factor
        latency = base_latency * size_factor
        
        if config["model_precision"] == "int8":
            fps *= 1.5
            latency *= 0.7
            base_accuracy *= 0.95
        
        if config["acceleration"] == "gpu":
            fps *= 2.0
            latency *= 0.5
        
        return {
            "expected_fps": round(fps, 1),
            "expected_latency": round(latency),
            "expected_accuracy": round(base_accuracy, 2),
            "memory_usage": f"{round(size_factor * 150)}MB"
        }
    
    def generate_recommendations(self, config: Dict[str, Any], device_info: Dict[str, Any]) -> List[str]:
        """Generate optimization recommendations"""
        recommendations = []
        
        if device_info.get("memory", 4) < 2:
            recommendations.append("Consider closing other applications to free up memory")
        
        if config["target_size"][0] < 640:
            recommendations.append("Image quality reduced for better performance")
        
        if config["acceleration"] == "cpu":
            recommendations.append("GPU acceleration would significantly improve performance")
        
        return recommendations

# Global optimizer instance
optimizer = ModelOptimizer()

# API Routes

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "EcoScan AI Service",
        "status": "operational",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "performance_stats": performance_stats,
        "model_cache_size": len(model_cache),
        "uptime": "service_uptime_placeholder"
    }

@app.post("/detect", response_model=DetectionResponse)
async def detect_waste(request: DetectionRequest, background_tasks: BackgroundTasks):
    """Advanced waste detection endpoint"""
    start_time = time.time()
    
    try:
        # Update stats
        global performance_stats
        performance_stats["total_requests"] += 1
        
        # Configuration for detection
        config = {
            "confidence_threshold": request.confidence_threshold,
            "model_version": request.model_version,
            "target_size": (640, 640),
            "enhance_quality": True,
            "denoise": True
        }
        
        # Perform detection
        detections = await classifier.classify_image(request.image_data, config)
        
        # Generate AI recommendations
        recommendations = []
        for detection in detections:
            # This would integrate with the AI recommendations system
            rec = {
                "type": "reduce",
                "title": f"Reduce {detection.label} Usage",
                "description": f"Consider sustainable alternatives to {detection.label.lower()}",
                "priority": "medium"
            }
            recommendations.append(rec)
        
        processing_time = time.time() - start_time
        
        # Update performance stats in background
        background_tasks.add_task(update_performance_stats, processing_time)
        
        return DetectionResponse(
            success=True,
            detections=detections,
            processing_time=processing_time,
            model_info={
                "version": request.model_version,
                "accuracy": 0.89,
                "supported_categories": ["recycle", "compost", "trash", "hazardous"]
            },
            recommendations=recommendations
        )
        
    except Exception as e:
        logger.error(f"Detection error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/optimize", response_model=OptimizationResponse)
async def optimize_model(request: OptimizationRequest):
    """Optimize model configuration for device"""
    try:
        optimization_result = await optimizer.optimize_for_device(
            request.device_info,
            request.performance_metrics,
            request.preferred_quality
        )
        
        return OptimizationResponse(
            optimized_config=optimization_result["config"],
            expected_performance=optimization_result["performance"],
            recommendations=optimization_result["recommendations"]
        )
        
    except Exception as e:
        logger.error(f"Optimization error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/feedback")
async def submit_feedback(request: FeedbackRequest):
    """Submit user feedback for model improvement"""
    try:
        # Store feedback for model training
        feedback_data = {
            "detection_id": request.detection_id,
            "user_correction": request.user_correction,
            "confidence_rating": request.confidence_rating,
            "was_helpful": request.was_helpful,
            "timestamp": datetime.now().isoformat()
        }
        
        # In a real implementation, this would be stored in a database
        logger.info(f"Feedback received: {feedback_data}")
        
        return {"success": True, "message": "Feedback received successfully"}
        
    except Exception as e:
        logger.error(f"Feedback error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models")
async def list_models():
    """List available models and their capabilities"""
    return {
        "models": [
            {
                "id": "yolov8n-waste",
                "name": "YOLOv8 Nano Waste Detector",
                "accuracy": 0.87,
                "speed": "fast",
                "size": "12MB",
                "supported_categories": ["recycle", "compost", "trash"]
            },
            {
                "id": "efficientdet-waste",
                "name": "EfficientDet Waste Classifier",
                "accuracy": 0.92,
                "speed": "medium",
                "size": "45MB",
                "supported_categories": ["recycle", "compost", "trash", "hazardous"]
            }
        ]
    }

@app.get("/environmental-impact/{item_type}")
async def get_environmental_impact(item_type: str):
    """Get environmental impact data for specific item type"""
    try:
        impact_data = classifier.environmental_database.get(item_type.lower().replace(" ", "_"), {})
        
        if not impact_data:
            raise HTTPException(status_code=404, detail="Item type not found")
        
        return {
            "item_type": item_type,
            "environmental_impact": impact_data,
            "disposal_instructions": classifier.generate_disposal_instructions("recycle", item_type),
            "tips": classifier.generate_tips("recycle", item_type, impact_data)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Environmental impact error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def update_performance_stats(processing_time: float):
    """Update global performance statistics"""
    global performance_stats
    
    # Update running average
    total = performance_stats["total_requests"]
    current_avg = performance_stats["average_processing_time"]
    performance_stats["average_processing_time"] = (
        (current_avg * (total - 1) + processing_time) / total
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info") 