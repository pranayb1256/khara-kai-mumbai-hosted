from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import re
from datetime import datetime

app = FastAPI(title="Claim Extractor - Mumbai Misinformation Detection")

# Mumbai-specific keywords and patterns
MUMBAI_LOCATIONS = [
    'mumbai', 'bandra', 'andheri', 'dadar', 'kurla', 'thane', 'borivali', 'malad',
    'goregaon', 'kandivali', 'jogeshwari', 'vile parle', 'santacruz', 'khar',
    'mahim', 'matunga', 'sion', 'wadala', 'chembur', 'ghatkopar', 'vikhroli',
    'mulund', 'powai', 'bhandup', 'nahur', 'colaba', 'churchgate', 'marine lines',
    'grant road', 'mumbai central', 'lower parel', 'worli', 'prabhadevi',
    'cst', 'vt', 'kalyan', 'dombivli', 'navi mumbai', 'panvel', 'vasai', 'virar',
    'western line', 'central line', 'harbour line', 'local train', 'best bus'
]

CRISIS_KEYWORDS = {
    'flood': ['flood', 'flooded', 'waterlog', 'submerge', 'drowning', 'rain', 'heavy rain', 'pani'],
    'accident': ['accident', 'crash', 'collision', 'derail', 'injured', 'dead', 'death', 'killed'],
    'fire': ['fire', 'blaze', 'burning', 'smoke', 'explosion', 'blast'],
    'riot': ['riot', 'violence', 'protest', 'bandh', 'strike', 'mob', 'clash'],
    'health': ['epidemic', 'outbreak', 'virus', 'disease', 'hospital', 'cases', 'infected'],
    'traffic': ['traffic', 'jam', 'congestion', 'blocked', 'diverted', 'closed'],
    'infrastructure': ['bridge', 'building', 'collapse', 'crack', 'damage', 'repair']
}

MISINFORMATION_INDICATORS = [
    r'breaking\s*:?\s*!+',
    r'urgent\s*:?\s*!+',
    r'share\s+this',
    r'forward\s+to\s+all',
    r'confirmed\s+by\s+sources',
    r'just\s+now\s+happened',
    r'viral\s+video',
    r'must\s+watch',
    r'shocking',
    r'\d+\s+dead',  # Unverified death counts
    r'\d+\s+injured',
    r'blood\s+needed',
    r'missing\s+child',
]

OFFICIAL_SOURCES = ['bmc', 'mumbai police', 'indian railways', 'mcgm', 'best', 'mhada', 'msrtc']

class ExtractRequest(BaseModel):
    text: str
    media: List[str] = []
    source: Optional[str] = None

class ClaimEntity(BaseModel):
    type: str
    value: str
    confidence: float

class ExtractedClaim(BaseModel):
    original_text: str
    normalized_text: str
    entities: List[ClaimEntity]
    locations: List[str]
    crisis_types: List[str]
    numbers: List[str]
    misinformation_score: float
    priority_score: int
    requires_verification: bool
    extraction_timestamp: str

def extract_locations(text: str) -> List[str]:
    """Extract Mumbai-specific locations from text"""
    text_lower = text.lower()
    found = []
    for loc in MUMBAI_LOCATIONS:
        if loc in text_lower:
            found.append(loc.title())
    return list(set(found))

def extract_numbers(text: str) -> List[str]:
    """Extract significant numbers (casualties, measurements, etc.)"""
    patterns = [
        r'\d+\s*(?:dead|killed|died|deaths)',
        r'\d+\s*(?:injured|hurt|wounded)',
        r'\d+\s*(?:feet|ft|meters|m)\s*(?:water|flood)',
        r'\d+\s*(?:hours?|hrs?)\s*(?:delay|stuck|stranded)',
        r'rs\.?\s*\d+(?:,\d+)*(?:\s*(?:lakh|crore))?',
    ]
    numbers = []
    for pattern in patterns:
        matches = re.findall(pattern, text.lower())
        numbers.extend(matches)
    return numbers

def identify_crisis_types(text: str) -> List[str]:
    """Identify the type(s) of crisis mentioned"""
    text_lower = text.lower()
    types = []
    for crisis_type, keywords in CRISIS_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            types.append(crisis_type)
    return types

def calculate_misinformation_score(text: str, has_media: bool) -> float:
    """Calculate likelihood of misinformation (0-1)"""
    score = 0.0
    text_lower = text.lower()
    
    # Check for misinformation indicators
    for pattern in MISINFORMATION_INDICATORS:
        if re.search(pattern, text_lower):
            score += 0.15
    
    # Unverified claims with numbers are suspicious
    if re.search(r'\d+\s*(dead|killed|injured)', text_lower):
        if not any(src in text_lower for src in OFFICIAL_SOURCES):
            score += 0.2
    
    # All caps text is often sensational
    caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
    if caps_ratio > 0.5:
        score += 0.1
    
    # Excessive exclamation marks
    if text.count('!') > 3:
        score += 0.1
    
    # Media without source attribution
    if has_media and 'source' not in text_lower and 'credit' not in text_lower:
        score += 0.1
    
    # Urgency language
    if any(word in text_lower for word in ['urgent', 'breaking', 'just now', 'happening now']):
        score += 0.1
    
    return min(score, 1.0)

def calculate_priority(crisis_types: List[str], misinformation_score: float, locations: List[str]) -> int:
    """Calculate verification priority (1-10)"""
    priority = 3  # Base priority
    
    # Higher priority for life-threatening situations
    if 'flood' in crisis_types or 'accident' in crisis_types or 'fire' in crisis_types:
        priority += 3
    
    # Higher priority for potential misinformation
    if misinformation_score > 0.5:
        priority += 2
    
    # Higher priority for major locations
    major_locations = ['cst', 'dadar', 'bandra', 'andheri', 'churchgate', 'mumbai central']
    if any(loc.lower() in major_locations for loc in locations):
        priority += 1
    
    return min(priority, 10)

def normalize_text(text: str) -> str:
    """Normalize claim text for processing"""
    # Remove excessive whitespace
    text = ' '.join(text.split())
    # Remove multiple exclamation marks
    text = re.sub(r'!+', '!', text)
    # Remove URLs for cleaner processing
    text = re.sub(r'https?://\S+', '[URL]', text)
    # Remove excessive caps
    if sum(1 for c in text if c.isupper()) / max(len(text), 1) > 0.7:
        text = text.title()
    return text.strip()

@app.post("/extract")
async def extract(req: ExtractRequest):
    """
    Extract and analyze claims from text for fact-checking
    Returns structured claim data with priority and misinformation indicators
    """
    text = req.text
    has_media = len(req.media) > 0
    
    # Extract components
    locations = extract_locations(text)
    crisis_types = identify_crisis_types(text)
    numbers = extract_numbers(text)
    misinformation_score = calculate_misinformation_score(text, has_media)
    priority = calculate_priority(crisis_types, misinformation_score, locations)
    
    # Build entities list
    entities = []
    for loc in locations:
        entities.append(ClaimEntity(type="location", value=loc, confidence=0.9))
    for crisis in crisis_types:
        entities.append(ClaimEntity(type="crisis_type", value=crisis, confidence=0.85))
    for num in numbers:
        entities.append(ClaimEntity(type="statistic", value=num, confidence=0.8))
    
    # Determine if verification is needed
    requires_verification = (
        len(crisis_types) > 0 or 
        misinformation_score > 0.3 or 
        len(numbers) > 0 or
        has_media
    )
    
    claim = ExtractedClaim(
        original_text=text,
        normalized_text=normalize_text(text),
        entities=[e.dict() for e in entities],
        locations=locations,
        crisis_types=crisis_types,
        numbers=numbers,
        misinformation_score=round(misinformation_score, 2),
        priority_score=priority,
        requires_verification=requires_verification,
        extraction_timestamp=datetime.now().isoformat()
    )
    
    print(f"[ClaimExtractor] Extracted claim with priority {priority}, misinfo score {misinformation_score:.2f}")
    
    return {
        "claims": [claim.dict()],
        "metadata": {
            "source": req.source,
            "media_count": len(req.media),
            "processing_time": datetime.now().isoformat()
        }
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "claim-extractor",
        "supported_locations": len(MUMBAI_LOCATIONS),
        "crisis_types": list(CRISIS_KEYWORDS.keys())
    }
