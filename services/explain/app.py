from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from deep_translator import GoogleTranslator
from datetime import datetime

app = FastAPI(title="Khara Kai Mumbai - Multilingual Explainer")

class ExplainRequest(BaseModel):
    claimId: str
    text: str
    status: str = "unconfirmed"  # confirmed, contradicted, unconfirmed
    evidence: List[Dict] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=lambda: ['en', 'hi', 'mr'])
    confidence: float = 0.5

# Status-specific templates for Mumbai context
TEMPLATES = {
    'en': {
        'confirmed': {
            'header': '✅ VERIFIED TRUE',
            'body': 'This claim appears to be accurate based on official sources.',
            'action': '✓ This information can be shared. Always verify from official sources like BMC, Mumbai Police.'
        },
        'contradicted': {
            'header': '❌ FALSE / MISLEADING',
            'body': 'This claim has been found to be false or misleading.',
            'action': '⚠️ DO NOT SHARE this misinformation. Report similar posts to help stop the spread.'
        },
        'unconfirmed': {
            'header': '⚠️ UNVERIFIED',
            'body': 'This claim could not be verified from official sources.',
            'action': '🔍 Wait for official confirmation before sharing. Check BMC (@mybaboromlvbmobmc) or Mumbai Police (@MumbaiPolice).'
        }
    },
    'hi': {
        'confirmed': {
            'header': '✅ सत्यापित सच',
            'body': 'यह दावा आधिकारिक स्रोतों के आधार पर सही प्रतीत होता है।',
            'action': '✓ यह जानकारी साझा की जा सकती है। हमेशा बीएमसी, मुंबई पुलिस जैसे आधिकारिक स्रोतों से सत्यापित करें।'
        },
        'contradicted': {
            'header': '❌ झूठा / भ्रामक',
            'body': 'यह दावा झूठा या भ्रामक पाया गया है।',
            'action': '⚠️ यह गलत सूचना साझा न करें। ऐसी पोस्ट की रिपोर्ट करें।'
        },
        'unconfirmed': {
            'header': '⚠️ असत्यापित',
            'body': 'इस दावे की आधिकारिक स्रोतों से पुष्टि नहीं हो सकी।',
            'action': '🔍 साझा करने से पहले आधिकारिक पुष्टि की प्रतीक्षा करें। बीएमसी या मुंबई पुलिस देखें।'
        }
    },
    'mr': {
        'confirmed': {
            'header': '✅ सत्यापित खरे',
            'body': 'हा दावा अधिकृत स्रोतांच्या आधारे बरोबर दिसतो.',
            'action': '✓ ही माहिती शेअर करता येईल. बीएमसी, मुंबई पोलिसांकडून नेहमी खात्री करा.'
        },
        'contradicted': {
            'header': '❌ खोटे / दिशाभूल करणारे',
            'body': 'हा दावा खोटा किंवा दिशाभूल करणारा आढळला आहे.',
            'action': '⚠️ ही चुकीची माहिती शेअर करू नका. अशा पोस्टची तक्रार करा.'
        },
        'unconfirmed': {
            'header': '⚠️ असत्यापित',
            'body': 'या दाव्याची अधिकृत स्रोतांकडून पुष्टी होऊ शकली नाही.',
            'action': '🔍 शेअर करण्यापूर्वी अधिकृत पुष्टीची वाट पहा. बीएमसी किंवा मुंबई पोलीस तपासा.'
        }
    }
}

def generate_explanation(text: str, status: str, evidence: List[Dict], language: str, confidence: float) -> str:
    """Generate a detailed explanation in the specified language"""
    
    # Get template for language and status
    lang_templates = TEMPLATES.get(language, TEMPLATES['en'])
    status_template = lang_templates.get(status, lang_templates['unconfirmed'])
    
    # Build explanation
    lines = []
    
    # Header with emoji
    lines.append(status_template['header'])
    lines.append("")
    
    # Claim summary
    if language == 'en':
        lines.append(f'📝 Claim: "{text[:200]}..."' if len(text) > 200 else f'📝 Claim: "{text}"')
    elif language == 'hi':
        lines.append(f'📝 दावा: "{text[:200]}..."' if len(text) > 200 else f'📝 दावा: "{text}"')
    else:  # Marathi
        lines.append(f'📝 दावा: "{text[:200]}..."' if len(text) > 200 else f'📝 दावा: "{text}"')
    
    lines.append("")
    
    # Analysis
    lines.append(status_template['body'])
    
    # Evidence summary
    if evidence and len(evidence) > 0:
        if language == 'en':
            lines.append("")
            lines.append("📰 Sources checked:")
        elif language == 'hi':
            lines.append("")
            lines.append("📰 जाँचे गए स्रोत:")
        else:
            lines.append("")
            lines.append("📰 तपासलेले स्रोत:")
        
        for e in evidence[:3]:  # Show top 3 sources
            source = e.get('source', 'Unknown')
            snippet = e.get('snippet', e.get('excerpt', ''))[:100]
            if snippet:
                lines.append(f"  • {source}: {snippet}...")
            else:
                lines.append(f"  • {source}")
    
    lines.append("")
    
    # Confidence indicator
    confidence_pct = int(confidence * 100)
    if language == 'en':
        lines.append(f"🎯 Confidence: {confidence_pct}%")
    elif language == 'hi':
        lines.append(f"🎯 विश्वास स्तर: {confidence_pct}%")
    else:
        lines.append(f"🎯 विश्वास पातळी: {confidence_pct}%")
    
    lines.append("")
    
    # Action recommendation
    lines.append(status_template['action'])
    
    # Footer
    lines.append("")
    if language == 'en':
        lines.append("━━━━━━━━━━━━━━━━━━━━━━")
        lines.append("🔍 Khara Kai Mumbai - Your Reality Check")
        lines.append(f"⏰ Verified: {datetime.now().strftime('%d %b %Y, %I:%M %p')}")
    elif language == 'hi':
        lines.append("━━━━━━━━━━━━━━━━━━━━━━")
        lines.append("🔍 खरा कै मुंबई - आपकी सच्चाई की जाँच")
        lines.append(f"⏰ सत्यापित: {datetime.now().strftime('%d %b %Y, %I:%M %p')}")
    else:
        lines.append("━━━━━━━━━━━━━━━━━━━━━━")
        lines.append("🔍 खरा कै मुंबई - तुमची खरी तपासणी")
        lines.append(f"⏰ सत्यापित: {datetime.now().strftime('%d %b %Y, %I:%M %p')}")
    
    return "\n".join(lines)

def translate_text(text: str, target_lang: str) -> str:
    """Translate text using Google Translate"""
    try:
        if target_lang in ['hi', 'mr']:
            translator = GoogleTranslator(source='en', target=target_lang)
            return translator.translate(text)
        return text
    except Exception as e:
        print(f"[Explainer] Translation error: {e}")
        return text

@app.post("/explain")
async def explain(req: ExplainRequest):
    """
    Generate multilingual fact-check explanations for Mumbai claims
    Supports English, Hindi, and Marathi
    """
    explanations = {}
    
    for lang in req.languages:
        if lang in ['en', 'hi', 'mr']:
            # Use pre-built templates
            explanation = generate_explanation(
                text=req.text,
                status=req.status,
                evidence=req.evidence,
                language=lang,
                confidence=req.confidence
            )
            explanations[lang] = explanation
        else:
            # Translate English version for other languages
            en_explanation = generate_explanation(
                text=req.text,
                status=req.status,
                evidence=req.evidence,
                language='en',
                confidence=req.confidence
            )
            explanations[lang] = translate_text(en_explanation, lang)
    
    print(f"[Explainer] Generated explanations in {len(explanations)} languages for claim {req.claimId}")
    
    return {
        "claimId": req.claimId,
        "explanations": explanations,
        "generated_at": datetime.now().isoformat()
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "multilingual-explainer",
        "supported_languages": ["en", "hi", "mr"],
        "version": "2.0"
    }
