"""
EcoScan FastAPI Service
Advanced AI processing and model optimization for waste classification
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union, Tuple
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
import concurrent.futures
import functools
from threading import Lock
import gc
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Global thread pool for CPU-bound tasks
CPU_POOL = concurrent.futures.ThreadPoolExecutor(max_workers=os.cpu_count())

# Memory optimization
memory_lock = Lock()
last_gc_time = time.time()
GC_INTERVAL = 60  # Run garbage collection every minute

# Initialize FastAPI app with lifespan management
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load models, initialize resources
    logger.info("Starting EcoScan AI Service - Loading resources...")
    
    # Initialize global objects
    app.state.classifier = AdvancedWasteClassifier()
    app.state.optimizer = ModelOptimizer()
    app.state.model_cache = {}
    app.state.performance_stats = {
        "total_requests": 0,
        "average_processing_time": 0,
        "model_accuracy": 0.89,
        "cache_hits": 0,
        "start_time": time.time()
    }
    
    # Warm up models
    await app.state.classifier.warm_up()
    
    # Start background tasks
    app.state.cleanup_task = asyncio.create_task(periodic_cleanup(app))
    
    logger.info("EcoScan AI Service started successfully")
    yield
    
    # Shutdown: Cleanup resources
    logger.info("Shutting down EcoScan AI Service...")
    app.state.cleanup_task.cancel()
    
    # Release models from memory
    for model_name, model in app.state.model_cache.items():
        logger.info(f"Unloading model: {model_name}")
        # Ensure proper cleanup depending on model type
    
    # Close thread pool
    CPU_POOL.shutdown(wait=False)
    
    logger.info("EcoScan AI Service shutdown complete")

app = FastAPI(
    title="EcoScan AI Service",
    description="Advanced AI processing for waste classification and environmental impact analysis",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for API requests/responses
class DetectionRequest(BaseModel):
    image_data: str = Field(..., description="Base64 encoded image data")
    confidence_threshold: float = Field(0.5, ge=0.0, le=1.0)
    model_version: str = Field("latest", description="Model version to use")
    device_info: Optional[Dict[str, Any]] = Field(None, description="Client device information for optimization")

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

# Background task for periodic cleanup
async def periodic_cleanup(app: FastAPI):
    """Periodic cleanup task for memory management and cache optimization"""
    try:
        while True:
            await asyncio.sleep(30)  # Check every 30 seconds
            
            # Clean up expired cache entries
            current_time = time.time()
            expired_models = []
            
            with memory_lock:
                # Remove models that haven't been used recently
                for model_name, model_data in app.state.model_cache.items():
                    if current_time - model_data.get("last_used", 0) > 600:  # 10 minutes
                        expired_models.append(model_name)
                
                for model_name in expired_models:
                    logger.info(f"Removing unused model from cache: {model_name}")
                    del app.state.model_cache[model_name]
                
                # Run garbage collection if needed
                global last_gc_time
                if current_time - last_gc_time > GC_INTERVAL:
                    logger.debug("Running garbage collection")
                    gc.collect()
                    last_gc_time = current_time
            
            # Log current memory usage
            process_info = f"Memory usage: {get_memory_usage_mb():.2f} MB"
            logger.debug(process_info)
            
    except asyncio.CancelledError:
        logger.info("Cleanup task cancelled")
    except Exception as e:
        logger.error(f"Error in cleanup task: {str(e)}")

def get_memory_usage_mb():
    """Get current memory usage in MB"""
    try:
        import psutil
        process = psutil.Process(os.getpid())
        return process.memory_info().rss / (1024 * 1024)
    except ImportError:
        return 0

class AdvancedWasteClassifier:
    """Advanced waste classification using multiple AI techniques"""
    
    def __init__(self):
        self.models = {}
        self.preprocessing_pipeline = None
        self.confidence_thresholds = {
            "recycle": 0.7,
            "compost": 0.8,
            "landfill": 0.6,
            "hazardous": 0.9
        }
        self.environmental_database = self.load_environmental_database()
        self.model_paths = {
            "detection": os.environ.get("DETECTION_MODEL_PATH", "models/yolov8n.onnx"),
            "classification": os.environ.get("CLASSIFICATION_MODEL_PATH", "models/waste_classifier.onnx"),
        }
        self.initialized = False
        self.initialization_lock = asyncio.Lock()
    
    def load_environmental_database(self) -> Dict[str, Any]:
        """Load environmental impact database"""
        try:
            env_db_path = os.environ.get("ENV_DB_PATH", "data/environmental_impact.json")
            if os.path.exists(env_db_path):
                with open(env_db_path, 'r') as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load environmental database: {str(e)}")
        
        # Fallback to default database
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
            },
            # Add more common items
            "paper": {
                "co2_footprint": 0.8,
                "recycling_rate": 0.65,
                "decomposition_time": "2-6 weeks",
                "recycled_uses": ["paper products", "cardboard"]
            },
            "glass_bottle": {
                "co2_footprint": 0.5,
                "recycling_rate": 0.33,
                "decomposition_time": "1 million years",
                "recycled_uses": ["glass containers", "fiberglass"]
            }
        }
    
    async def warm_up(self):
        """Pre-load and warm up models for faster inference"""
        if self.initialized:
            return
        
        async with self.initialization_lock:
            if self.initialized:
                return
                
            logger.info("Warming up waste classifier models")
            try:
                # This would actually load ONNX/TF/PyTorch models
                # For now we'll just simulate the initialization
                await asyncio.sleep(1.0)
                self.initialized = True
                logger.info("Models initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize models: {str(e)}")
                raise
    
    async def classify_image(self, image_data: str, config: Dict[str, Any]) -> List[DetectionResult]:
        """Classify waste items in image using advanced AI"""
        start_time = time.time()
        
        # Ensure models are initialized
        if not self.initialized:
            await self.warm_up()
        
        try:
            # Run computationally intensive tasks in thread pool
            # This prevents blocking the async event loop
            loop = asyncio.get_event_loop()
            
            # Decode image in thread pool
            image = await loop.run_in_executor(
                CPU_POOL, 
                functools.partial(self.decode_base64_image, image_data)
            )
            
            # Preprocessing pipeline (CPU-bound)
            processed_image = await loop.run_in_executor(
                CPU_POOL,
                functools.partial(self.preprocess_image_sync, image, config)
            )
            
            # Multi-model ensemble prediction
            # This simulated function isn't intensive, but real ML would be
            detections = await self.ensemble_predict(processed_image, config)
            
            # Post-processing and validation
            validated_detections = await loop.run_in_executor(
                CPU_POOL,
                functools.partial(self.validate_detections_sync, detections, processed_image)
            )
            
            # Add environmental impact data
            enriched_detections = await self.enrich_with_environmental_data(validated_detections)
            
            processing_time = time.time() - start_time
            logger.info(f"Classification completed in {processing_time:.3f}s")
            
            return enriched_detections
            
        except Exception as e:
            logger.error(f"Classification error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")
    
    def decode_base64_image(self, image_data: str) -> np.ndarray:
        """Decode base64 image to numpy array (CPU-bound)"""
        try:
            # Remove data URL prefix if present
            if "data:image" in image_data:
                image_data = image_data.split(",")[1]
            
            # Decode base64
            image_bytes = base64.b64decode(image_data)
            
            # Use OpenCV directly for faster decoding
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            # Convert to RGB (OpenCV uses BGR)
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            return image
            
        except Exception as e:
            raise ValueError(f"Invalid image data: {str(e)}")
    
    def preprocess_image_sync(self, image: np.ndarray, config: Dict[str, Any]) -> np.ndarray:
        """Synchronous image preprocessing pipeline optimized for performance"""
        try:
            # Resize image based on performance requirements
            target_size = config.get("target_size", (640, 640))
            
            # Fast resize with proper interpolation method
            interpolation = cv2.INTER_AREA if image.shape[0] > target_size[0] else cv2.INTER_LINEAR
            image = cv2.resize(image, target_size, interpolation=interpolation)
            
            # Only enhance if needed based on config
            if config.get("enhance_quality", True):
                # Use faster contrast enhancement
                image = cv2.convertScaleAbs(image, alpha=1.1, beta=5)
            
            # More efficient noise reduction
            if config.get("denoise", True):
                # Fast denoising for real-time performance
                image = cv2.fastNlMeansDenoisingColored(image, None, 5, 5, 7, 21)
            
            # Normalize
            image = image.astype(np.float32) / 255.0
            
            return image
            
        except Exception as e:
            logger.error(f"Preprocessing error: {str(e)}")
            return image
    
    async def ensemble_predict(self, image: np.ndarray, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Ensemble prediction using multiple models"""
        # This would integrate with actual ML models (TensorFlow, PyTorch, etc.)
        # For demonstration, we'll simulate advanced detection
        
        # Simulate model inference time with less waiting
        await asyncio.sleep(0.05)
        
        # Simulate object detection results with more items and categories
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
            },
            {
                "label": "Cardboard Box",
                "category": "recycle",
                "confidence": 0.89,
                "bbox": [50, 400, 250, 550],
                "segmentation_mask": None,
                "material_composition": {"paper": 1.0}
            },
            {
                "label": "Styrofoam Cup",
                "category": "landfill",
                "confidence": 0.78,
                "bbox": [400, 300, 500, 400],
                "segmentation_mask": None,
                "material_composition": {"styrofoam": 1.0}
            }
        ]
        
        return mock_detections
    
    def validate_detections_sync(self, detections: List[Dict[str, Any]], image: np.ndarray) -> List[Dict[str, Any]]:
        """Validate and filter detections - optimized synchronous version"""
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
        """Enrich detections with environmental impact data and generate response objects"""
        enriched_results = []
        
        for detection in detections:
            label = detection["label"].lower().replace(" ", "_")
            category = detection["category"]
            
            # Get environmental impact data
            env_data = self.environmental_database.get(label, {})
            
            # Generate tips and instructions
            instructions = self.generate_disposal_instructions(category, label)
            tips = self.generate_tips(category, label, env_data)
            
            # Create detection result
            result = DetectionResult(
                id=str(uuid.uuid4()),
                label=detection["label"],
                category=category,
                confidence=detection["confidence"],
                bbox=detection["bbox"],
                instructions=instructions,
                tips=tips,
                environmental_impact=env_data
            )
            
            enriched_results.append(result)
        
        return enriched_results
    
    def generate_disposal_instructions(self, category: str, label: str) -> str:
        """Generate disposal instructions based on category and item label"""
        instructions = {
            "recycle": f"Place {label.replace('_', ' ')} in the recycling bin after rinsing.",
            "compost": f"Place {label.replace('_', ' ')} in the compost bin.",
            "landfill": f"Place {label.replace('_', ' ')} in the general waste bin.",
            "hazardous": f"Take {label.replace('_', ' ')} to a hazardous waste collection point."
        }
        
        return instructions.get(category, f"Check local guidelines for disposing {label.replace('_', ' ')}")
    
    def generate_tips(self, category: str, label: str, env_data: Dict[str, Any]) -> List[str]:
        """Generate helpful tips based on category, label and environmental data"""
        tips = []
        
        if category == "recycle":
            tips.append("Ensure item is clean and dry before recycling")
            
            if "recycled_uses" in env_data:
                uses = ", ".join(env_data["recycled_uses"])
                tips.append(f"When recycled, this can become: {uses}")
                
            if "energy_saved_recycling" in env_data:
                percentage = int(env_data["energy_saved_recycling"] * 100)
                tips.append(f"Recycling saves {percentage}% energy compared to manufacturing new")
                
        elif category == "compost":
            tips.append("Compostable items help create nutrient-rich soil")
            
            if "compost_time" in env_data:
                tips.append(f"Takes approximately {env_data['compost_time']} to decompose in compost")
                
        elif category == "landfill":
            if "decomposition_time" in env_data:
                tips.append(f"Takes {env_data['decomposition_time']} to decompose in landfill")
                
            tips.append("Consider alternatives that can be recycled or composted")
            
        elif category == "hazardous":
            tips.append("Never mix with regular trash or recycling")
            tips.append("Keep in original container if possible")
            
        # Add environmental impact information
        if "co2_footprint" in env_data:
            tips.append(f"Produces approximately {env_data['co2_footprint']}kg CO2 equivalent")
            
        return tips

# Global classifier instance
classifier = AdvancedWasteClassifier()

class ModelOptimizer:
    """Adaptive model optimization for different devices"""
    
    def __init__(self):
        self.device_profiles = {
            "low_end": {
                "target_size": (320, 320),
                "use_gpu": False,
                "quantization": "int8",
                "optimize_memory": True,
                "batch_size": 1,
                "enhance_quality": False,
                "denoise": False
            },
            "mid_range": {
                "target_size": (480, 480),
                "use_gpu": True,
                "quantization": "int8",
                "optimize_memory": True,
                "batch_size": 1,
                "enhance_quality": True,
                "denoise": True
            },
            "high_end": {
                "target_size": (640, 640),
                "use_gpu": True,
                "quantization": "fp16",
                "optimize_memory": False,
                "batch_size": 1,
                "enhance_quality": True,
                "denoise": True
            }
        }
    
    async def optimize_for_device(self, device_info: Dict[str, Any], performance_metrics: Dict[str, Any], quality: str) -> Dict[str, Any]:
        """Optimize model configuration for specific device"""
        try:
            # Determine device class
            device_class = self.classify_device(device_info)
            
            # Get base configuration from device profile
            config = self.device_profiles.get(device_class, self.device_profiles["mid_range"]).copy()
            
            # Adjust configuration based on quality preference
            if quality == "fast":
                config["target_size"] = (min(320, config["target_size"][0]), min(320, config["target_size"][1]))
                config["enhance_quality"] = False
                config["denoise"] = False
                config["optimize_memory"] = True
            elif quality == "accurate":
                config["target_size"] = (max(640, config["target_size"][0]), max(640, config["target_size"][1]))
                config["enhance_quality"] = True
                config["denoise"] = True
            
            # Predict performance
            expected_performance = self.predict_performance(config, device_info)
            
            # Generate recommendations
            recommendations = self.generate_recommendations(config, device_info)
            
            return {
                "optimized_config": config,
                "expected_performance": expected_performance,
                "recommendations": recommendations
            }
        
        except Exception as e:
            logger.error(f"Optimization error: {str(e)}")
            # Return default configuration on error
            return {
                "optimized_config": self.device_profiles["mid_range"],
                "expected_performance": {},
                "recommendations": ["Using default settings due to optimization error"]
            }
    
    def classify_device(self, device_info: Dict[str, Any]) -> str:
        """Classify device as low_end, mid_range, or high_end"""
        # Default to mid-range if no info provided
        if not device_info:
            return "mid_range"
        
        try:
            # Extract relevant device capabilities
            memory = device_info.get("memory", device_info.get("deviceMemory", 4))
            cores = device_info.get("cores", device_info.get("hardwareConcurrency", 4))
            gpu = device_info.get("gpu", device_info.get("gpuTier", 0))
            
            # Classify based on capabilities
            if memory <= 2 or cores <= 2:
                return "low_end"
            elif memory >= 8 and cores >= 8 and gpu >= 2:
                return "high_end"
            else:
                return "mid_range"
                
        except Exception as e:
            logger.warning(f"Error classifying device: {str(e)}")
            return "mid_range"  # Default to mid-range on error
    
    def predict_performance(self, config: Dict[str, Any], device_info: Dict[str, Any]) -> Dict[str, Any]:
        """Predict performance metrics for given configuration"""
        # This would use a trained performance model in production
        # Here we use simple heuristics
        
        target_size = config["target_size"]
        pixels = target_size[0] * target_size[1]
        
        # Extract device capabilities
        memory = device_info.get("memory", device_info.get("deviceMemory", 4))
        cores = device_info.get("cores", device_info.get("hardwareConcurrency", 4))
        
        # Estimate inference time based on resolution and device
        base_time = 0.1  # Base inference time in seconds
        size_factor = pixels / (640 * 640)  # Normalize to standard size
        device_factor = min(1.0, (cores / 8) * (memory / 8))  # Device performance factor
        
        inference_time = base_time * size_factor / max(0.2, device_factor)
        
        # Estimate memory usage
        base_memory = 200  # Base memory in MB
        memory_usage = base_memory * size_factor
        
        # Adjust for memory optimization
        if config["optimize_memory"]:
            memory_usage *= 0.7
        
        # Estimate model accuracy
        base_accuracy = 0.85
        accuracy_factor = size_factor * 0.1
        
        # Quality settings affect accuracy
        if config["enhance_quality"] and config["denoise"]:
            accuracy_factor += 0.05
        
        accuracy = min(0.98, base_accuracy + accuracy_factor)
        
        return {
            "estimated_inference_time": round(inference_time * 1000, 1),  # Convert to ms
            "estimated_memory_usage": round(memory_usage, 1),
            "estimated_accuracy": round(accuracy, 2),
            "target_fps": max(1, min(30, int(1000 / (inference_time * 1000))))
        }
    
    def generate_recommendations(self, config: Dict[str, Any], device_info: Dict[str, Any]) -> List[str]:
        """Generate recommendations for optimal performance"""
        recommendations = []
        
        memory = device_info.get("memory", device_info.get("deviceMemory", 4))
        is_mobile = device_info.get("mobile", device_info.get("isMobile", False))
        
        # Add device-specific recommendations
        if memory < 4:
            recommendations.append("Close other applications to free up memory")
            recommendations.append("Consider using the 'fast' quality setting for better performance")
        
        if is_mobile:
            recommendations.append("Keep device cool for optimal AI performance")
            if config["use_gpu"]:
                recommendations.append("Using GPU acceleration may drain battery faster")
        
        # Add quality-specific recommendations
        if config["target_size"][0] <= 320:
            recommendations.append("Using reduced resolution for faster performance")
        elif config["target_size"][0] >= 640:
            recommendations.append("Using high resolution for better accuracy")
        
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
async def health_check(app: FastAPI):
    """Detailed health check"""
    return {
        "status": "healthy",
        "performance_stats": app.state.performance_stats,
        "model_cache_size": len(app.state.model_cache),
        "uptime": datetime.now() - datetime.fromtimestamp(app.state.performance_stats["start_time"])
    }

@app.post("/detect", response_model=DetectionResponse)
async def detect_waste(request: DetectionRequest, background_tasks: BackgroundTasks, app: FastAPI):
    """Advanced waste detection endpoint"""
    start_time = time.time()
    
    logger.info(f"Processing detection request with model version: {request.model_version}")
    
    try:
        # Get appropriate model config based on device info
        device_config = {}
        if request.device_info:
            device_config = app.state.optimizer.optimize_for_device(
                request.device_info,
                {"preferred_quality": "balanced"},
                "balanced"
            ).get("optimized_config", {})
        
        # Create configuration for detection
        detection_config = {
            "confidence_threshold": request.confidence_threshold,
            "model_version": request.model_version,
            "target_size": device_config.get("target_size", (640, 640)),
            "enhance_quality": device_config.get("enhance_quality", True),
            "denoise": device_config.get("denoise", True)
        }
        
        # Classify image
        detections = await app.state.classifier.classify_image(
            request.image_data, 
            detection_config
        )
        
        # Generate response
        model_info = {
            "name": f"EcoScan Waste Classifier {request.model_version}",
            "processing_mode": "gpu" if device_config.get("use_gpu", False) else "cpu",
            "input_resolution": f"{detection_config['target_size'][0]}x{detection_config['target_size'][1]}",
            "confidence_threshold": request.confidence_threshold
        }
        
        # Generate recommendations based on detections
        recommendations = generate_recommendations(detections)
        
        processing_time = time.time() - start_time
        
        # Update statistics in background
        background_tasks.add_task(
            update_performance_stats, 
            app,
            processing_time
        )
        
        return DetectionResponse(
            success=True,
            detections=detections,
            processing_time=processing_time,
            model_info=model_info,
            recommendations=recommendations
        )
        
    except Exception as e:
        logger.error(f"Detection error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Detection failed: {str(e)}"
        )

def generate_recommendations(detections: List[DetectionResult]) -> List[Dict[str, Any]]:
    """Generate recommendations based on detected items"""
    recommendations = []
    
    # Count items by category
    categories = {}
    for detection in detections:
        categories[detection.category] = categories.get(detection.category, 0) + 1
    
    # Generate category-specific recommendations
    if categories.get("landfill", 0) > 0:
        recommendations.append({
            "title": "Reduce Landfill Items",
            "description": "Consider alternatives for single-use items going to landfill.",
            "icon": "trash-alt"
        })
    
    if categories.get("recycle", 0) > 0:
        recommendations.append({
            "title": "Recycling Tips",
            "description": "Ensure recyclable items are clean and free of food residue.",
            "icon": "recycle"
        })
    
    if categories.get("compost", 0) > 0:
        recommendations.append({
            "title": "Composting Benefits",
            "description": "Composting reduces methane emissions from landfills.",
            "icon": "seedling"
        })
    
    # Add general recommendation
    recommendations.append({
        "title": "Environmental Impact",
        "description": "Making sustainable choices reduces your carbon footprint.",
        "icon": "leaf"
    })
    
    return recommendations

@app.post("/optimize", response_model=OptimizationResponse)
async def optimize_model(request: OptimizationRequest, app: FastAPI):
    """Optimize model configuration for client device"""
    try:
        logger.info(f"Optimizing for device with quality preference: {request.preferred_quality}")
        
        result = app.state.optimizer.optimize_for_device(
            request.device_info,
            request.performance_metrics,
            request.preferred_quality
        )
        
        return OptimizationResponse(
            optimized_config=result.get("optimized_config", {}),
            expected_performance=result.get("expected_performance", {}),
            recommendations=result.get("recommendations", [])
        )
    except Exception as e:
        logger.error(f"Optimization error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")

@app.post("/feedback")
async def submit_feedback(request: FeedbackRequest, app: FastAPI):
    """Submit user feedback for continuous improvement"""
    try:
        logger.info(f"Received feedback for detection {request.detection_id}")
        
        # Store feedback for model improvement (would connect to database in production)
        feedback_data = {
            "id": str(uuid.uuid4()),
            "detection_id": request.detection_id,
            "correction": request.user_correction,
            "confidence_rating": request.confidence_rating,
            "was_helpful": request.was_helpful,
            "timestamp": datetime.now().isoformat()
        }
        
        # In a real implementation, this would be stored in a database
        # For now, just log it
        logger.info(f"Feedback data: {feedback_data}")
        
        return {"success": True, "message": "Feedback submitted successfully"}
        
    except Exception as e:
        logger.error(f"Feedback submission error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Feedback submission failed: {str(e)}")

@app.get("/models")
async def list_models(app: FastAPI):
    """List available models with metadata"""
    try:
        # In a real implementation, this would query available models
        # For demo purposes, return mock data
        models = [
            {
                "name": "yolov8n",
                "type": "detection",
                "size_mb": 12.3,
                "precision": "fp16",
                "classes": 80,
                "accuracy": 0.89,
                "is_latest": True
            },
            {
                "name": "waste_classifier_v1",
                "type": "classification",
                "size_mb": 5.6,
                "precision": "fp16",
                "classes": 20,
                "accuracy": 0.92,
                "is_latest": True
            },
            {
                "name": "tiny_detector",
                "type": "detection",
                "size_mb": 4.2,
                "precision": "int8",
                "classes": 40,
                "accuracy": 0.76,
                "is_latest": False
            }
        ]
        
        return {
            "models": models,
            "default_model": "yolov8n",
            "model_path": os.environ.get("MODEL_PATH", "models/")
        }
        
    except Exception as e:
        logger.error(f"Error listing models: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list models: {str(e)}")

@app.get("/environmental-impact/{item_type}")
async def get_environmental_impact(item_type: str, app: FastAPI):
    """Get detailed environmental impact for specific item type"""
    try:
        # Normalize item type
        normalized_item = item_type.lower().replace(" ", "_")
        
        # Get environmental data
        env_data = app.state.classifier.environmental_database.get(normalized_item, {})
        
        if not env_data:
            raise HTTPException(
                status_code=404,
                detail=f"No environmental data found for {item_type}"
            )
        
        # Enhance with additional calculations and context
        enhanced_data = env_data.copy()
        enhanced_data["item_type"] = item_type
        
        return {
            "success": True,
            "data": enhanced_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting environmental data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get environmental data: {str(e)}")

async def update_performance_stats(app: FastAPI, processing_time: float):
    """Update performance statistics"""
    try:
        stats = app.state.performance_stats
        
        # Update request count and average processing time
        stats["total_requests"] += 1
        
        # Calculate new moving average
        new_avg = (stats["average_processing_time"] * (stats["total_requests"] - 1) + processing_time) / stats["total_requests"]
        stats["average_processing_time"] = new_avg
        
        # Log every 100 requests
        if stats["total_requests"] % 100 == 0:
            logger.info(f"Performance stats: {stats}")
            
    except Exception as e:
        logger.error(f"Error updating performance stats: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment variable or use default
    port = int(os.environ.get("PORT", 8000))
    
    # Start server with reload for development
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
        reload=os.environ.get("ENV", "production") == "development"
    ) 