from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List, Dict
from deep_translator import GoogleTranslator

app = FastAPI(title="Explainer")

class ExplainRequest(BaseModel):
    claimId: str
    text: str
    evidence: List[Dict] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=lambda: ['en'])

def generate_template(text, evidence):
    # Basic template - 3 lines, robust against missing keys / None
    summary = f'The claim "{text}" has been reviewed.'
    if evidence and isinstance(evidence[0], dict):
        src = evidence[0].get('source') or ''
        url = evidence[0].get('url') or ''
        combined = (src + (' ' if src and url else '') + url).strip()
        why_detail = combined if combined else 'No strong official evidence found.'
    else:
        why_detail = 'No strong official evidence found.'
    why = 'Evidence: ' + why_detail
    action = 'Do not share unverified information. Follow official channels.'
    return summary + "\n" + why + "\n" + action

@app.post("/explain")
async def explain(req: ExplainRequest):
    base = generate_template(req.text, req.evidence)
    out = {}
    for lang in req.languages:
        if lang == 'en':
            out['en'] = base
        else:
            try:
                translated = GoogleTranslator(source='auto', target=lang).translate(base)
                out[lang] = translated
            except Exception:
                out[lang] = base  # fallback
    return {"claimId": req.claimId, "explanations": out}

@app.get("/health")
async def health():
    return {"status": "ok"}
