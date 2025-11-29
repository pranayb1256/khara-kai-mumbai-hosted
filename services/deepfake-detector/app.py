"""
Khara Kai Mumbai - Deepfake Detection Service
FastAPI service for detecting manipulated images and videos
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import Optional, List
import httpx
import base64
import hashlib
from io import BytesIO
import os
from datetime import datetime
import google.generativeai as genai
from PIL import Image
import numpy as np

# Initialize FastAPI app
app = FastAPI(
    title="Khara Kai Mumbai - Deepfake Detector",
    description="AI-powered image manipulation and deepfake detection service",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Request/Response Models
class ImageUrlRequest(BaseModel):
    image_url: HttpUrl
    check_metadata: bool = True
    check_manipulation: bool = True
    check_ai_generated: bool = True

class ImageBase64Request(BaseModel):
    image_base64: str
    filename: Optional[str] = None
    check_metadata: bool = True
    check_manipulation: bool = True
    check_ai_generated: bool = True

class ManipulationIndicator(BaseModel):
    type: str
    description: str
    severity: str  # low, medium, high
    location: Optional[str] = None

class AnalysisResult(BaseModel):
    is_authentic: bool
    confidence: float
    verdict: str
    analysis: str
    manipulation_indicators: List[ManipulationIndicator]
    metadata_analysis: Optional[dict] = None
    ai_generated_probability: float
    processing_time_ms: int
    image_hash: str

# Analysis prompts
DEEPFAKE_ANALYSIS_PROMPT = """You are an expert forensic image analyst. Analyze this image for signs of manipulation, AI generation, or deepfake characteristics.

Look for these specific indicators:

1. **Facial Inconsistencies** (for images with faces):
   - Asymmetric facial features
   - Unnatural skin texture or blurring
   - Misaligned eyes, ears, or facial boundaries
   - Hair irregularities at edges
   - Teeth or lip anomalies

2. **Lighting & Shadow Issues**:
   - Inconsistent lighting direction across the image
   - Missing or incorrect shadows
   - Unnatural reflections in eyes or surfaces
   - Color temperature mismatches

3. **Background Artifacts**:
   - Warping around subject edges
   - Repeated patterns or clone stamps
   - Blending inconsistencies
   - Perspective errors

4. **Compression & Quality Issues**:
   - Localized quality differences
   - JPEG artifacts in unexpected areas
   - Edge anomalies suggesting compositing

5. **AI Generation Markers**:
   - Unnaturally perfect symmetry
   - Texture inconsistencies (especially in hands, text, fine details)
   - Impossible physics or anatomy
   - Semantic inconsistencies

Provide your analysis in this exact JSON format:
{
    "is_authentic": true/false,
    "confidence": 0-100,
    "verdict": "authentic" | "manipulated" | "ai_generated" | "uncertain",
    "analysis": "Brief explanation of findings",
    "manipulation_indicators": [
        {
            "type": "category name",
            "description": "what was found",
            "severity": "low|medium|high",
            "location": "where in image"
        }
    ],
    "ai_generated_probability": 0-100
}

Be thorough but objective. If you cannot determine authenticity with confidence, say so.
"""

@app.get("/")
async def root():
    return {
        "service": "Deepfake Detector",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "gemini_configured": bool(GEMINI_API_KEY)
    }

@app.post("/analyze", response_model=AnalysisResult)
async def analyze_image_url(request: ImageUrlRequest):
    """Analyze an image from URL for manipulation/deepfake detection"""
    start_time = datetime.now()
    
    try:
        # Download image
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(str(request.image_url))
            response.raise_for_status()
            image_data = response.content
            
    except httpx.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"Failed to download image: {str(e)}")
    
    # Calculate image hash
    image_hash = hashlib.sha256(image_data).hexdigest()[:16]
    
    # Analyze with Gemini Vision
    result = await analyze_image_with_gemini(image_data)
    
    processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
    
    return AnalysisResult(
        is_authentic=result.get("is_authentic", False),
        confidence=result.get("confidence", 0),
        verdict=result.get("verdict", "uncertain"),
        analysis=result.get("analysis", "Analysis unavailable"),
        manipulation_indicators=[
            ManipulationIndicator(**ind) for ind in result.get("manipulation_indicators", [])
        ],
        metadata_analysis=result.get("metadata_analysis"),
        ai_generated_probability=result.get("ai_generated_probability", 0),
        processing_time_ms=processing_time,
        image_hash=image_hash
    )

@app.post("/analyze/base64", response_model=AnalysisResult)
async def analyze_image_base64(request: ImageBase64Request):
    """Analyze an image from base64 data"""
    start_time = datetime.now()
    
    try:
        # Decode base64
        if "," in request.image_base64:
            # Handle data URL format
            image_data = base64.b64decode(request.image_base64.split(",")[1])
        else:
            image_data = base64.b64decode(request.image_base64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 image: {str(e)}")
    
    # Calculate image hash
    image_hash = hashlib.sha256(image_data).hexdigest()[:16]
    
    # Analyze with Gemini Vision
    result = await analyze_image_with_gemini(image_data)
    
    processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
    
    return AnalysisResult(
        is_authentic=result.get("is_authentic", False),
        confidence=result.get("confidence", 0),
        verdict=result.get("verdict", "uncertain"),
        analysis=result.get("analysis", "Analysis unavailable"),
        manipulation_indicators=[
            ManipulationIndicator(**ind) for ind in result.get("manipulation_indicators", [])
        ],
        metadata_analysis=result.get("metadata_analysis"),
        ai_generated_probability=result.get("ai_generated_probability", 0),
        processing_time_ms=processing_time,
        image_hash=image_hash
    )

@app.post("/analyze/upload", response_model=AnalysisResult)
async def analyze_uploaded_image(file: UploadFile = File(...)):
    """Analyze an uploaded image file"""
    start_time = datetime.now()
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Read image data
    image_data = await file.read()
    
    # Calculate image hash
    image_hash = hashlib.sha256(image_data).hexdigest()[:16]
    
    # Analyze with Gemini Vision
    result = await analyze_image_with_gemini(image_data)
    
    processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
    
    return AnalysisResult(
        is_authentic=result.get("is_authentic", False),
        confidence=result.get("confidence", 0),
        verdict=result.get("verdict", "uncertain"),
        analysis=result.get("analysis", "Analysis unavailable"),
        manipulation_indicators=[
            ManipulationIndicator(**ind) for ind in result.get("manipulation_indicators", [])
        ],
        metadata_analysis=result.get("metadata_analysis"),
        ai_generated_probability=result.get("ai_generated_probability", 0),
        processing_time_ms=processing_time,
        image_hash=image_hash
    )

async def analyze_image_with_gemini(image_data: bytes) -> dict:
    """Use Gemini Vision to analyze image for manipulation"""
    
    if not GEMINI_API_KEY:
        # Return mock analysis if no API key
        return {
            "is_authentic": True,
            "confidence": 50,
            "verdict": "uncertain",
            "analysis": "Gemini API key not configured. Unable to perform deep analysis.",
            "manipulation_indicators": [],
            "ai_generated_probability": 0
        }
    
    try:
        # Initialize Gemini model
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Create image part
        image = Image.open(BytesIO(image_data))
        
        # Generate analysis
        response = model.generate_content([
            DEEPFAKE_ANALYSIS_PROMPT,
            image
        ])
        
        # Parse response
        response_text = response.text
        
        # Try to extract JSON from response
        import json
        import re
        
        # Find JSON in response
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            try:
                result = json.loads(json_match.group())
                return result
            except json.JSONDecodeError:
                pass
        
        # Fallback parsing if JSON extraction fails
        is_authentic = "authentic" in response_text.lower() and "not authentic" not in response_text.lower()
        
        return {
            "is_authentic": is_authentic,
            "confidence": 60,
            "verdict": "authentic" if is_authentic else "uncertain",
            "analysis": response_text[:500],
            "manipulation_indicators": [],
            "ai_generated_probability": 20 if "ai" in response_text.lower() else 0
        }
        
    except Exception as e:
        return {
            "is_authentic": True,
            "confidence": 30,
            "verdict": "uncertain",
            "analysis": f"Analysis error: {str(e)}",
            "manipulation_indicators": [],
            "ai_generated_probability": 0
        }

@app.post("/batch")
async def batch_analyze(image_urls: List[HttpUrl]):
    """Analyze multiple images in batch"""
    if len(image_urls) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 images per batch")
    
    results = []
    for url in image_urls:
        try:
            result = await analyze_image_url(ImageUrlRequest(image_url=url))
            results.append({"url": str(url), "result": result})
        except Exception as e:
            results.append({"url": str(url), "error": str(e)})
    
    return {"results": results, "total": len(results)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
