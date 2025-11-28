FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Pre-download spaCy model (small)
RUN python -m spacy download en_core_web_sm
COPY . .
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
