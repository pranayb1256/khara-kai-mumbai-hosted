from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
from PIL import Image
import imagehash
import io
import requests
import urllib.parse
from bs4 import BeautifulSoup
from datetime import datetime
import hashlib

app = FastAPI(title="Image Checker - Reverse Image Search")

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

# Known fake/recycled Mumbai images database (phash -> metadata)
known_fake_images = {
    # These would be populated with known viral fake images
    # "phash_value": {"id": "fake1", "original_date": "2018-07-05", "desc": "Old flood photo from 2018", "original_url": "..."}
}

# Cache for recent image checks
image_cache = {}

def compute_phash_bytes(img_bytes):
    """Compute perceptual hash of image"""
    try:
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        return str(imagehash.phash(img))
    except Exception as e:
        print(f"[ImageChecker] Error computing phash: {e}")
        return None

def compute_md5(img_bytes):
    """Compute MD5 hash for caching"""
    return hashlib.md5(img_bytes).hexdigest()

def reverse_image_search_tineye(image_url: str):
    """
    Attempt reverse image search using TinEye-style approach
    Returns list of matches with dates
    """
    matches = []
    try:
        # Use Google Images reverse search (basic approach)
        search_url = f"https://www.google.com/searchbyimage?image_url={urllib.parse.quote(image_url)}"
        # Note: This is a simplified approach - in production, use TinEye API or Google Cloud Vision
        print(f"[ImageChecker] Would perform reverse search for: {image_url}")
    except Exception as e:
        print(f"[ImageChecker] Reverse search error: {e}")
    return matches

def analyze_image_metadata(img_bytes):
    """Extract and analyze image metadata for authenticity"""
    analysis = {
        "has_exif": False,
        "creation_date": None,
        "software": None,
        "is_edited": False,
        "warnings": []
    }
    
    try:
        img = Image.open(io.BytesIO(img_bytes))
        exif = img._getexif()
        
        if exif:
            analysis["has_exif"] = True
            # Check for editing software
            if 306 in exif:  # DateTime
                analysis["creation_date"] = exif[306]
            if 305 in exif:  # Software
                analysis["software"] = exif[305]
                if any(editor in str(exif[305]).lower() for editor in ['photoshop', 'gimp', 'lightroom']):
                    analysis["is_edited"] = True
                    analysis["warnings"].append("Image appears to have been edited with photo editing software")
        else:
            analysis["warnings"].append("No EXIF metadata found - image may have been stripped or is a screenshot")
    except Exception as e:
        analysis["warnings"].append(f"Could not analyze metadata: {str(e)}")
    
    return analysis

def check_against_known_fakes(phash: str, threshold: int = 10):
    """Check if image matches known fake/viral images"""
    matches = []
    
    if not phash:
        return matches
    
    try:
        query_hash = imagehash.hex_to_hash(phash)
        
        for known_phash, meta in known_fake_images.items():
            try:
                known_hash = imagehash.hex_to_hash(known_phash)
                distance = query_hash - known_hash
                
                if distance <= threshold:
                    matches.append({
                        "id": meta.get("id"),
                        "url": meta.get("original_url"),
                        "meta": {
                            "date": meta.get("original_date"),
                            "desc": meta.get("desc"),
                            "similarity": f"{100 - (distance * 10)}%"
                        },
                        "distance": distance,
                        "warning": f"⚠️ This image is similar to a known {meta.get('desc', 'recycled image')}"
                    })
            except:
                continue
    except Exception as e:
        print(f"[ImageChecker] Error checking against known fakes: {e}")
    
    return matches

class CheckRequest(BaseModel):
    urls: List[str] = []

@app.post("/check")
async def check(request: CheckRequest = None, urls: List[str] = [], file: UploadFile = File(None)):
    """
    Check images for:
    1. Known fake/recycled images
    2. Metadata analysis (editing, date)
    3. Perceptual hash matching
    """
    results = {
        "matches": [],
        "analysis": [],
        "warnings": []
    }
    
    # Get URLs from request body or parameter
    url_list = []
    if request and request.urls:
        url_list = request.urls
    elif urls:
        url_list = urls
    
    # Process uploaded file
    if file:
        try:
            img_bytes = await file.read()
            phash = compute_phash_bytes(img_bytes)
            md5 = compute_md5(img_bytes)
            
            # Check cache
            if md5 in image_cache:
                return image_cache[md5]
            
            # Analyze metadata
            metadata_analysis = analyze_image_metadata(img_bytes)
            results["analysis"].append({
                "source": "uploaded_file",
                "metadata": metadata_analysis
            })
            
            if metadata_analysis["warnings"]:
                results["warnings"].extend(metadata_analysis["warnings"])
            
            # Check against known fakes
            fake_matches = check_against_known_fakes(phash)
            results["matches"].extend(fake_matches)
            
            # Cache result
            image_cache[md5] = results
            
        except Exception as e:
            results["warnings"].append(f"Error processing uploaded file: {str(e)}")
    
    # Process URLs
    for url in url_list:
        try:
            print(f"[ImageChecker] Checking URL: {url}")
            response = requests.get(url, headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                img_bytes = response.content
                phash = compute_phash_bytes(img_bytes)
                
                # Analyze metadata
                metadata_analysis = analyze_image_metadata(img_bytes)
                results["analysis"].append({
                    "source": url,
                    "phash": phash,
                    "metadata": metadata_analysis
                })
                
                if metadata_analysis["warnings"]:
                    for warning in metadata_analysis["warnings"]:
                        results["warnings"].append(f"{url}: {warning}")
                
                # Check against known fakes
                fake_matches = check_against_known_fakes(phash)
                for match in fake_matches:
                    match["checked_url"] = url
                results["matches"].extend(fake_matches)
                
        except Exception as e:
            results["warnings"].append(f"Error checking {url}: {str(e)}")
    
    print(f"[ImageChecker] Checked {len(url_list)} URLs, found {len(results['matches'])} matches")
    
    return results

@app.post("/add-known-fake")
async def add_known_fake(image_url: str, original_date: str, description: str):
    """Add an image to the known fake images database"""
    try:
        response = requests.get(image_url, headers=HEADERS, timeout=10)
        if response.status_code == 200:
            phash = compute_phash_bytes(response.content)
            if phash:
                known_fake_images[phash] = {
                    "id": f"fake_{len(known_fake_images) + 1}",
                    "original_date": original_date,
                    "desc": description,
                    "original_url": image_url
                }
                return {"success": True, "phash": phash, "message": "Image added to known fakes database"}
        return {"success": False, "error": "Could not fetch image"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "image-checker",
        "known_fakes_count": len(known_fake_images),
        "cache_size": len(image_cache)
    }
