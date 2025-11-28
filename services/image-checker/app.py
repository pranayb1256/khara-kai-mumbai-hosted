from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from typing import List
from PIL import Image
import imagehash
import io
import requests

app = FastAPI(title="Image Checker")

# seed index - in production load from DB + FAISS
seed_db = [
    {"id":"seed1","url":"https://example.com/old_flood.jpg","phash":None,"meta":{"date":"2018-07-05","desc":"Flood 2018"}}
]

# preload phashes for seed DB if URL available (skip remote in simple demo)
for s in seed_db:
    if s["url"] and s["phash"] is None:
        s["phash"] = None  # offline demo; admin will index

def compute_phash_bytes(img_bytes):
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    return str(imagehash.phash(img))

@app.post("/check")
async def check(urls: List[str]=[], file: UploadFile = File(None)):
    matches = []
    if file:
        b = await file.read()
        qhash = compute_phash_bytes(b)
        # naive compare: exact equality
        for s in seed_db:
            if s.get("phash") == qhash:
                matches.append({"id": s["id"], "url": s["url"], "meta": s["meta"], "distance": 0})
    elif urls:
        for u in urls:
            try:
                r = requests.get(u, timeout=5)
                qhash = compute_phash_bytes(r.content)
                for s in seed_db:
                    if s.get("phash") == qhash:
                        matches.append({"id": s["id"], "url": s["url"], "meta": s["meta"], "distance": 0})
            except:
                continue
    return {"matches": matches}
