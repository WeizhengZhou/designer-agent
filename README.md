# Interior Designer Agent

A full-stack AI-powered furniture shopping assistant with chat, product discovery, floor plan, and 3D visualization.

## Stack
- **Frontend**: Angular 17 (TypeScript, Three.js)
- **Backend**: FastAPI (Python)
- **LLM**: Google Gemini 2.0 Flash (function calling + streaming)
- **Image Generation**: Gemini 2.0 Flash with image output *(swap for Imagen 3 via Vertex AI if preferred)*

## Project Structure
```
furniture/
├── backend/          # FastAPI Python server
└── frontend/         # Angular 17 app
```

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Google AI Studio API key → https://aistudio.google.com/apikey

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm start                          # Serves on http://localhost:4200
```

## Key Features
- **Chat panel** (left): text + image upload, streaming AI responses
- **Products tab**: AI-driven product grid with clickable cards and detail side panel
- **Floor Plan tab**: AI-generated 2D room layout with furniture placement
- **3D View tab**: Three.js interactive 3D room visualization
- **Room Images tab**: AI-generated room visualization images

## Environment Variables
| Variable | Description |
|----------|-------------|
| `GOOGLE_API_KEY` | Google AI Studio API key |
| `GOOGLE_CLOUD_PROJECT` | (Optional) GCP project for Vertex AI / Imagen 3 |
# designer-agent
