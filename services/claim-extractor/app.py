from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI(title="Claim Extractor")

class ExtractRequest(BaseModel):
	text: str
	media: List[str] = []

@app.post("/extract")
async def extract(req: ExtractRequest):
	# Naive placeholder extraction; in production apply NLP/NER
	entities = []
	location = None
	numbers = []
	return {"claims": [{"entities": entities, "location": location, "numbers": numbers}]}
