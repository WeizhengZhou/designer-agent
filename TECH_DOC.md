# Interior Designer Agent - Technical Documentation

## 1. System Overview

The **Interior Designer Agent** is a full-stack, AI-powered application designed to serve as an intelligent shopping and visualization assistant for home furnishings. It enables users to converse with an AI agent to discover real-world furniture products, visualize them within a 2D floor plan, and generate both 3D room scenes and photorealistic room images.

The core intelligence is driven by **Google Gemini 2.5 Flash**, utilizing its advanced function-calling capabilities within an interactive WebSocket loop to reason about user requests and invoke the correct backend tools autonomously.

---

## 2. Architecture & Tech Stack

### Frontend (User Interface)
- **Framework:** Angular 17 (TypeScript)
- **State Management:** RxJS (via `furniture-store.service.ts`)
- **3D Rendering:** Three.js (via `visualization-3d` component)
- **Styling:** SCSS, Angular Animations
- **Serving:** Nginx (in production Docker container)

### Backend (API & Agent Logic)
- **Framework:** FastAPI (Python 3.11+)
- **Server:** Uvicorn
- **AI Integration:** Google GenAI SDK (`google-genai` package)
- **Data Validation:** Pydantic (v2)

### External Services & APIs
- **LLM Reasoning & Chat:** Google Gemini 2.5 Flash (via Google AI Studio)
- **Product Search:** SerpAPI (Google Shopping Engine)
- **Image Generation:** Google Imagen 3 (or Gemini image capabilities)

---

## 3. Core System Components

### 3.1 Backend Services (`backend/services/`)
- **`gemini_service.py`**: The heart of the application. Manages the WebSocket connection and the "agentic tool loop". It defines the system prompt and registers available tools (`search_products`, `generate_room_image`, `update_floor_plan`, `create_3d_visualization`). It maintains the conversation context and streams text responses back to the client.
- **`product_service.py`**: Intercepts the `search_products` tool call. Uses SerpAPI to fetch live Google Shopping results based on semantic queries, filters (category, price, style), and caches results locally in `search_cache.json` to optimize performance and reduce API costs.
- **`imagen_service.py`**: Handles generating photorealistic 2D room images when the user requests a visual mockup of a space.
- **`dimension_service.py`**: Processes and calculates dimensional intelligence for 2D and 3D placing logic.

### 3.2 Frontend Components (`frontend/src/app/components/`)
- **`chat-panel`**: Manages the user input (text/images) and displays the streaming response from the AI.
- **`product-grid` & `product-detail-panel`**: Renders the product catalog based on the agent's SerpAPI search results.
- **`floor-plan`**: Translates the `update_floor_plan` tool events (X/Y percentages, widths, depths) into a 2D interactive canvas.
- **`visualization-3d`**: A Three.js canvas that listens to `create_3d_visualization` events to render basic 3D representations of the suggested furniture layout.

---

## 4. Key Workflows

### 4.1 The Agentic WebSocket Loop
The primary interaction pattern relies on a continuous WebSocket connection (`/api/chat/ws`), allowing for bidirectional streaming.
1. **User Input:** The user submits a text message or an image via the Angular frontend.
2. **Context Update:** The backend appends the user input to the active Gemini conversation list (`types.Content`).
3. **LLM Evaluation:** Gemini 2.5 Flash evaluates the context. If a tool is needed (e.g., user asks for a "modern sofa"), it halts text generation and returns a `function_call`.
4. **Tool Execution:** The backend intercepts the `function_call` (e.g., `search_products(query="modern sofa")`), executes the mapped Python service (`ProductService`), and pushes the execution result back into the LLM conversation context.
5. **Streaming Response:** Once all necessary tools are executed, Gemini formulates a final text response. The backend chunks this response and streams it back to the client via the WebSocket (`{"type": "stream", "content": "..."}`).

### 4.2 Product Search & Discovery
1. The AI decides to call the `search_products` tool with specific criteria (price limit, style, category).
2. The `ProductService` intercepts this and hits the SerpAPI (Google Shopping).
3. The raw JSON is parsed into structured Pydantic `Product` models (extracting price strings, finding product thumbnails, and guessing standard categories).
4. The JSON is sent via the active WebSocket connection as a `{"type": "products", ...}` payload to immediately update the frontend UI *while* the AI is still formulating its conversational response.

### 4.3 3D Visualization Pipeline
1. The user requests to see the room in 3D.
2. The AI uses the `create_3d_visualization` tool, generating a JSON payload of 3D objects with physical coordinates, dimensions, and colors (`Scene3DData`).
3. The backend sends a `{"type": "scene_3d"}` WebSocket event.
4. The Angular `visualization-3d` component receives the payload and uses **Three.js** to generate meshes (boxes, planes) dynamically representing the floor, walls, and requested furniture items.

---

## 5. Data Models (`backend/models/schemas.py`)
- **`Product`**: Normalized product representation (ID, title, price, seller, dimensions, images).
- **`FloorPlanData` / `FurniturePlacement`**: Definitions for 2D room layouts (using percentage-based relative positioning).
- **`Scene3DData` / `Furniture3DItem`**: Definitions for 3D room scenes (using absolute coordinates, widths, and depths).
- **`ChatMessage`**: Abstraction for user and assistant messages, including Base64-encoded image attachments.

---

## 6. Infrastructure & Deployment

- **Containerization**: Both the frontend and backend contain `Dockerfile` configurations.
  - **Frontend**: A multi-stage build that compiles the Angular app via Node.js and serves the static output via an Nginx container (`nginx.conf` provided).
  - **Backend**: A standard Python container running FastAPI via Uvicorn.
- **Deployment Script (`deploy.sh`)**: A bash script handling GCP deployment (likely Cloud Run, based on the standard containerized patterns).
- **Environment**: Requires `GOOGLE_API_KEY` for GenAI and `SERPAPI_KEY` (optional) for product search.
