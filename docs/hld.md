# Interior Designer Agent — High-Level Design

| Field   | Value                                    |
|---------|------------------------------------------|
| Version | 1.0                                      |
| Date    | 2026-02-24                               |
| Status  | Draft                                    |
| Authors | Engineering Team                         |

---

## Table of Contents

1. [Overview and Goals](#1-overview--goals)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Core Subsystems](#4-core-subsystems)
5. [Data Flow](#5-data-flow)
6. [Infrastructure and Deployment](#6-infrastructure--deployment)
7. [Security Considerations](#7-security-considerations)
8. [Key Design Decisions](#8-key-design-decisions)
9. [Known Gaps and MVP Constraints](#9-known-gaps--mvp-constraints)

---

## 1. Overview & Goals

### 1.1 What We Are Building

Interior Designer Agent is a web application that allows consumers to plan and furnish a room using an AI-powered conversational interface. The user describes their space and preferences in plain language; the system responds with product recommendations, photorealistic room images, a 2D floor plan, and an interactive 3D scene — all in one unified interface.

The application is split into two panels:

- **Left panel (Chat)** — a conversational AI interface backed by Gemini 2.0 Flash. Users type requests, optionally attach room photos or floor plan images, and the AI executes tools on their behalf.
- **Right panel (Canvas)** — a seven-tab workspace showing Products, Plan, Uploads, Floor Plan, 3D View, Room Images, and Shopping Cart.

### 1.2 Why We Are Building It

Traditional furniture shopping requires customers to visit multiple retailer websites, manually imagine how pieces fit together, and make purchase decisions based on flat photos. This product collapses that journey into a single AI-guided session: from inspiration to a dimensionally-accurate 3D room to a shopping cart.

### 1.3 Success Criteria

| Metric                                          | Target (MVP)    |
|-------------------------------------------------|-----------------|
| Time from first message to product results      | < 5 seconds     |
| Time from plan to 3D layout (AI-generated)      | < 10 seconds    |
| Room image generation latency                   | < 20 seconds    |
| Product search cache hit rate (repeat queries)  | > 60%           |
| Zero unhandled client-side crashes per session  | 100%            |

---

## 2. System Architecture

### 2.1 Architecture Diagram

```
  Browser (Angular 17 SPA)
  ┌──────────────────────────────────────────────────────────┐
  │  ┌───────────────┐          ┌──────────────────────────┐ │
  │  │  Chat Panel   │          │     Canvas Panel         │ │
  │  │  (left 40%)   │          │     (right 60%)          │ │
  │  │               │          │  ┌────────────────────┐  │ │
  │  │  ChatPanel    │          │  │ Products  | Plan   │  │ │
  │  │  Component    │          │  │ Uploads   | Floor  │  │ │
  │  │               │          │  │ 3D View   | Images │  │ │
  │  │               │          │  │ Cart               │  │ │
  │  └───────┬───────┘          └──────────────────────────┘ │
  │          │ WebSocket                                       │
  │  ┌───────▼───────────────────────────────────────────┐   │
  │  │              Angular Services Layer                │   │
  │  │  ApiService  FurnitureStoreService  PlanService   │   │
  │  │  CartService  DimensionService                     │   │
  │  └───────┬──────────────────────────┬────────────────┘   │
  └──────────┼──────────────────────────┼────────────────────┘
             │ WebSocket                │ REST HTTP
             │ ws://backend/api/chat/ws │ http://backend/api/*
             ▼                          ▼
  ┌──────────────────────────────────────────────────────────┐
  │              FastAPI Backend (Python 3.12)                │
  │                                                           │
  │  ┌───────────────┐   ┌──────────────┐  ┌─────────────┐  │
  │  │  chat router  │   │ products     │  │  images     │  │
  │  │  /api/chat/ws │   │ /api/products│  │  /api/images│  │
  │  └───────┬───────┘   └──────┬───────┘  └──────┬──────┘  │
  │          │                  │                  │          │
  │  ┌───────▼───────────────────────────────────────────┐   │
  │  │              Service Layer                         │   │
  │  │  GeminiService   ProductService   ImagenService   │   │
  │  │  DimensionService                                  │   │
  │  └───────┬──────────────┬────────────────────────────┘   │
  └──────────┼──────────────┼────────────────────────────────┘
             │              │
             ▼              ▼
  ┌─────────────────┐  ┌──────────────┐
  │  Google Gemini  │  │   SerpAPI    │
  │  API            │  │   Google     │
  │  gemini-2.0-    │  │   Shopping   │
  │  flash          │  └──────────────┘
  │  gemini-2.0-    │
  │  flash-preview- │
  │  image-gen      │
  └─────────────────┘
```

### 2.2 Component Overview

| Component             | Technology        | Responsibility                                          |
|-----------------------|-------------------|---------------------------------------------------------|
| Angular SPA           | Angular 17        | UI rendering, local state, WebSocket client             |
| FastAPI backend       | Python 3.12       | WebSocket server, REST APIs, agentic tool loop          |
| GeminiService         | google-genai SDK  | Stateful Gemini agentic loop with 4 tools               |
| ProductService        | SerpAPI           | Real-time Google Shopping search with JSON file cache   |
| ImagenService         | google-genai SDK  | Room visualization image generation                     |
| DimensionService      | httpx + Gemini    | Product page scraping for real dimensions               |
| FurnitureStoreService | Angular/RxJS      | Central in-memory state bus (BehaviorSubjects)          |

---

## 3. Technology Stack

### 3.1 Frontend

| Technology            | Version   | Purpose                                            |
|-----------------------|-----------|----------------------------------------------------|
| Angular               | 17        | SPA framework, standalone components               |
| TypeScript            | 5.x       | Type-safe frontend code                            |
| Three.js              | 0.161+    | 3D room scene rendering                            |
| HTML Canvas (2D)      | Native    | Floor plan top-down rendering                      |
| RxJS                  | 7.x       | Reactive state management with BehaviorSubjects    |
| SCSS                  | —         | Component-scoped styles                            |
| Angular HTTP Client   | 17        | REST calls to backend                              |
| WebSocket (native)    | —         | Streaming AI responses                             |

### 3.2 Backend

| Technology            | Version   | Purpose                                            |
|-----------------------|-----------|----------------------------------------------------|
| Python                | 3.12      | Runtime                                            |
| FastAPI               | 0.111+    | REST + WebSocket API framework                     |
| Uvicorn               | 0.29+     | ASGI server                                        |
| Pydantic v2           | 2.x       | Request/response schema validation                 |
| google-genai          | 1.x       | New Gemini SDK (NOT google-generativeai)           |
| httpx                 | 0.27+     | Async HTTP client for image proxy and scraping     |
| serpapi               | 0.1+      | Google Shopping product search                     |
| python-dotenv         | 1.x       | Secret loading from .env                           |

### 3.3 AI / ML

| Service                                   | Model ID                                    | Purpose                        |
|-------------------------------------------|---------------------------------------------|--------------------------------|
| Gemini chat + tool use                    | gemini-2.0-flash                            | Agentic assistant loop         |
| Room image generation                     | gemini-2.0-flash-preview-image-generation   | Photorealistic room renders    |
| AI 3D layout                              | gemini-2.0-flash                            | Furniture placement JSON       |
| Dimension scraping                        | gemini-2.0-flash                            | Extract inches from page text  |
| Floor plan from 3D                        | gemini-2.5-flash                            | 2D overlay from 3D scene       |

### 3.4 Infrastructure

| Service                  | Purpose                                        |
|--------------------------|------------------------------------------------|
| Google Cloud Run         | Containerised FastAPI backend                  |
| Firebase Hosting         | Angular SPA static hosting with CDN            |
| Google Secret Manager    | GOOGLE_API_KEY and SERPAPI_KEY at runtime      |
| Google Artifact Registry | Docker image storage                           |

### 3.5 Third-Party Services

| Service  | Purpose                          | Fallback                         |
|----------|----------------------------------|----------------------------------|
| SerpAPI  | Google Shopping product search   | Empty results list; no crash     |
| Placehold.co | Placeholder product images   | Built-in fallback URL in client  |

---

## 4. Core Subsystems

### 4.1 Chat and WebSocket

The left panel is a full-duplex streaming chat interface. The Angular `ApiService` opens a single WebSocket connection on application load and auto-reconnects every 3 seconds on disconnect. The user's text and any attached images are serialised to JSON and sent as a `message` frame. The server streams responses back as a sequence of typed frames (`thinking`, `products`, `image`, `floor_plan`, `scene_3d`, `stream`, `done`, `error`). Chat history is held in memory on the server, scoped to each WebSocket connection. A `reset` message clears the server-side history and calls `clearAll()` on the store.

### 4.2 AI Agent Tool Loop

`GeminiService` implements an agentic loop around Gemini 2.0 Flash. On each user turn, it calls `generate_content` with the current conversation history. If the model returns function calls, the service executes them (possibly multiple in sequence within one turn), appends the function responses, and calls Gemini again. This repeats until Gemini returns a plain text response, which is chunked into 60-character pieces and streamed to the client. The four available tools are: `search_products`, `generate_room_image`, `update_floor_plan`, and `create_3d_visualization`.

### 4.3 Product Search

`ProductService` queries SerpAPI's Google Shopping engine. Search parameters include a natural-language query, optional category, optional max price, and optional style. Results are normalised into the `Product` Pydantic model. A JSON file (`search_cache.json`) caches results keyed by query + price + limit to avoid redundant API calls. Category is inferred from the product title using a keyword matching dictionary.

### 4.4 3D Visualization

The `Visualization3dComponent` uses Three.js to render a real-time 3D room with compound geometric furniture models. The room is a box with floor, walls, and a grid. Each piece of furniture is built from `buildFurnitureGroup()`, which produces detailed compound meshes (e.g. the sofa has legs, back panel, arms, seat base, seat cushions, and back cushions). Users can select, move (XZ only), rotate (Y only), and scale furniture with TransformControls. Keyboard shortcuts mirror Blender conventions (G=grab, R=rotate, S=scale, Shift+D=duplicate, Del=delete). HTML label overlays show item names above each piece.

### 4.5 Floor Plan

The `FloorPlanComponent` renders a top-down 2D room plan on an HTML Canvas. It subscribes to `floorPlan$` from the store and redraws on every update. Furniture is drawn as labelled rounded rectangles at percentage-based positions within the room boundary. Room dimensions are shown as dimension annotations. A compass rose is drawn in the bottom-right corner. The canvas resizes responsively using a `ResizeObserver`.

### 4.6 Room Images

The `RoomImagesComponent` displays a gallery of AI-generated photorealistic room images. Images arrive via the WebSocket `image` frame (base64 PNG) or from the REST endpoint `POST /api/images/generate-from-plan`. Each image is stored as a base64 string in `roomImages$` on the store. The tab shows a count badge. A lightbox is available for full-screen viewing.

### 4.7 Plan and Cart

`PlanService` manages the active room plan as a single `Plan` object with RxJS BehaviorSubject. Products are added from the product card's "Add to Plan" button. Quantities are adjustable from the Plan tab. The plan panel offers "Visualize in 3D" (local CATEGORY_MAP → Scene3DData) and "Generate 3D Layout" (AI via `POST /api/layout/generate-3d-layout`), and "Visualize Floor Plan" (local CATEGORY_MAP → FloorPlanData). Products can be moved to the cart from the plan. `CartService` holds a simple list of `CartItem` objects. Checkout is currently a stub (`alert()`).

---

## 5. Data Flow

### 5.1 Product Search Request

```
User types "find a mid-century sofa under $800"
        │
        ▼
ChatPanelComponent.send()
  → ApiService.sendMessage()
    → WebSocket frame: { type:"message", content:"...", images:[] }
        │
        ▼
chat.py WebSocket handler
  → GeminiService.process_message()
    → Gemini 2.0 Flash (1st call)
      → Returns function_call: search_products
        { query:"mid-century sofa", style:"mid-century", max_price:800 }
        │
        ▼
_execute_tool("search_products", args)
  → ProductService.search()
    → cache check (search_cache.json)
    → [miss] SerpAPI Google Shopping API
    → normalise results → list[Product]
  → websocket.send_json({ type:"products", data:[...] })
        │
        ▼
Gemini 2.0 Flash (2nd call, with function result)
  → Returns text response: "I found 8 mid-century sofas..."
  → chunks streamed as { type:"stream", content:"..." }
  → { type:"done" }
        │
        ▼
ApiService.handleServerMessage()
  → case "products": store.setProducts(products) → Products tab auto-switches
  → case "stream":   store.addMessage() / appendToLastMessage()
  → case "done":     store.setThinking(null)
```

### 5.2 Room Image Generation

```
User types "show me what the room looks like"
  → Gemini calls generate_room_image{ room_description:"...", style:"..." }
  → ImagenService.generate_room_image(prompt)
    → gemini-2.0-flash-preview-image-generation
    → Returns base64 PNG
  → websocket.send_json({ type:"image", data:"<base64>" })
  → ApiService: store.addRoomImage(b64) → Room Images tab auto-switches
```

### 5.3 AI 3D Layout Generation

```
User clicks "Generate 3D Layout" in the Plan tab
  → Visualization3dComponent.generateFromPlan()
    → builds LayoutFurnitureInput[] from plan items + FURNITURE_PRESETS
    → ApiService.generate3dLayout(inputs, roomDims)
      → POST /api/layout/generate-3d-layout
        → GeminiService (layout router)
          → gemini-2.0-flash with JSON schema constraint
          → Returns Scene3DData JSON
        → Response: Scene3DData
      → Visualization3dComponent.loadFromSceneData(data)
        → clears scene, rebuilds room, places each furniture item
```

### 5.4 Dimension Scraping

```
User adds product to plan via "Add to Plan"
  → ProductCardComponent.addToPlan()
    → PlanService.addProduct(product)
    → DimensionService.fetchDimensions(product)  [background, first time only]
      → POST /api/dimensions/fetch { url, product_title }
        → DimensionService.fetch_dimensions()
          → httpx GET product URL (scraped)
          → strip HTML, extract keyword window
          → Gemini 2.0 Flash (JSON mode) → { width, depth, height }
        → Returns DimensionResponse
      → PlanService.updateProductDimensions(productId, dims)
        → dimensions stored on PlanItem.product.dimensions (inches)
```

---

## 6. Infrastructure & Deployment

### 6.1 Google Cloud Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Google Cloud Project                          │
│                                                                  │
│  ┌────────────────┐        ┌──────────────────────────────────┐ │
│  │ Firebase       │        │  Cloud Run (backend)             │ │
│  │ Hosting        │        │                                  │ │
│  │                │  HTTPS │  FastAPI + Uvicorn               │ │
│  │  Angular SPA   │◄──────►│  Container image from           │ │
│  │  (CDN-cached)  │        │  Artifact Registry              │ │
│  │                │        │                                  │ │
│  │  index.html    │        │  Min instances: 1               │ │
│  │  main.js       │        │  Max instances: 10              │ │
│  │  styles.css    │        │  Memory: 512 MB                 │ │
│  └────────────────┘        │  CPU: 1                         │ │
│                            └────────────┬─────────────────────┘ │
│                                         │                        │
│                            ┌────────────▼─────────────────────┐ │
│                            │  Secret Manager                  │ │
│                            │  - GOOGLE_API_KEY                │ │
│                            │  - SERPAPI_KEY                   │ │
│                            └──────────────────────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Artifact Registry                                        │   │
│  │  gcr.io/<project>/interior-designer-agent:latest         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                │                          │
                ▼                          ▼
    Google Gemini API             SerpAPI (external)
    (Vertex AI endpoint)
```

### 6.2 Deployment Commands

Backend is containerised via a Dockerfile, pushed to Artifact Registry, and deployed to Cloud Run. The `deploy.sh` script automates:
1. `docker build` and `docker push` to Artifact Registry
2. `gcloud run deploy` with secret mounts for API keys
3. CORS origin updated to the Firebase Hosting URL

Frontend is built with `ng build --configuration production` and deployed via `firebase deploy --only hosting`.

### 6.3 Environment Configuration

| Variable          | Source                              | Used by                      |
|-------------------|-------------------------------------|------------------------------|
| `GOOGLE_API_KEY`  | Cloud Run secret / local `.env`     | GeminiService, DimensionService, layout router |
| `SERPAPI_KEY`     | Cloud Run secret / local `.env`     | ProductService               |
| `apiUrl`          | Angular environment.ts              | ApiService, DimensionService |
| `wsUrl`           | Angular environment.ts              | ApiService                   |

---

## 7. Security Considerations

### 7.1 API Key Management

`GOOGLE_API_KEY` and `SERPAPI_KEY` are never embedded in frontend code or Docker images. In production they are mounted as secrets from Google Secret Manager into the Cloud Run container's environment. In development they are loaded from `backend/.env` via `python-dotenv`. The `.env` file is listed in `.gitignore`.

### 7.2 CORS Policy

The FastAPI `CORSMiddleware` is configured to allow requests only from the Angular development origins (`http://localhost:4200`, `http://localhost:4201`). In production, the allowed origins list must be updated to include the Firebase Hosting domain. Wildcard (`*`) origins must not be used in production.

### 7.3 Image Proxy and SSRF Prevention

The `GET /api/images/proxy` endpoint fetches external images to resolve browser CORS restrictions on SerpAPI thumbnail URLs. It validates that the URL starts with `http://` or `https://` before making the request. It does not follow redirects to private IP ranges. An improvement for production is to add an allowlist of trusted domains (SerpAPI CDN hosts) and block requests to RFC-1918 addresses.

### 7.4 Input Validation

All REST request bodies are validated by Pydantic v2 models before handlers execute. WebSocket messages are `receive_json()` with type-checking in the handler. User-supplied image data is base64-decoded on the backend before being passed to the Gemini SDK — raw bytes are never written to disk.

### 7.5 Secrets in Logs

The backend log file (`product_search.log`) records query strings and cache keys. API keys are never written to logs. The logger must not log `params` dicts that contain the `api_key` field from SerpAPI calls.

---

## 8. Key Design Decisions

### 8.1 WebSocket vs REST for Chat

**Decision:** Use a persistent WebSocket for the conversational AI channel.

**Rationale:** The agentic tool loop can involve multiple Gemini API calls, each taking 2–8 seconds, before the final text response is ready. A single HTTP request would hold the connection open for 10–20 seconds. WebSocket allows the server to stream intermediate `thinking` events, `products` data, and `image` data to the client as each tool completes, without waiting for the entire turn to finish. This gives users real-time feedback on what the AI is doing.

### 8.2 Stateful Server Session

**Decision:** Conversation history is held in-memory on the server, scoped to each WebSocket connection.

**Rationale:** The Gemini API requires the full conversation history to be submitted on every call. Holding history on the server avoids sending large image payloads back from the browser on every turn. The trade-off is that sessions are lost if the server restarts or the WebSocket reconnects. Cloud Run's minimum instances setting of 1 mitigates but does not eliminate this risk. Session persistence to a database is a post-MVP item.

### 8.3 SerpAPI Caching

**Decision:** Cache SerpAPI results to a local JSON file (`search_cache.json`).

**Rationale:** SerpAPI charges per query. Identical search queries within a session (or repeated sessions on the same server instance) should not re-issue API calls. The cache key is a stable hash of `{query, max_price, limit}`. The cache is in-memory on startup and persisted to disk asynchronously. This is suitable for a single Cloud Run instance. A Redis cache or Cloud Memorystore would be needed for multi-instance deployments.

### 8.4 In-Memory vs Persistent State

**Decision (MVP):** All application state (chat history, plan, cart, uploaded assets, generated images) is held in-memory in the browser and server process.

**Rationale:** Adding a database and authentication layer would significantly increase MVP complexity. The trade-off is that page reloads destroy all state, and server restarts lose chat history. This is the highest-priority P0 gap identified in UX research. A remediation plan using `localStorage` for Plan and Cart, and server-side session storage for chat history, is described in section 9.

### 8.5 Local Layout Algorithm vs AI Layout

**Decision:** The "Visualize in 3D" quick-action uses a local linear packing algorithm (CATEGORY_MAP). The "Generate 3D Layout" button calls the AI layout endpoint.

**Rationale:** The local algorithm is instantaneous and useful for quickly seeing what is in the plan. The AI layout endpoint takes 3–8 seconds but produces semantically correct room arrangements (sofa facing TV, dining chairs around table, bed against wall). The local algorithm is a known P1 issue; the UX remediation plan is to default to the AI layout on first use.

---

## 9. Known Gaps & MVP Constraints

The following gaps have been identified through UX research. Items marked P0 represent functional problems; P1 items are significant usability issues.

| Priority | Gap                                        | Current Behaviour                                        | Impact                                              |
|----------|--------------------------------------------|----------------------------------------------------------|-----------------------------------------------------|
| P0       | Stub checkout                              | `alert()` claiming "purchase complete"                  | Misrepresents purchase; no actual transaction       |
| P0       | No session persistence                     | Page reload destroys all plan, cart, chat history       | Users lose all work on accidental reload            |
| P1       | No onboarding for first-time users         | Blank chat panel with no guidance                       | Users do not know how to start                      |
| P1       | Dual upload paths confusing                | Upload in chat vs Upload in Uploads tab                 | Users unsure which image goes where                 |
| P1       | 3D keyboard shortcuts undiscoverable       | No visible legend; shortcuts silently active            | Users cannot use G/R/S/Delete                       |
| P1       | Initial 3D layout is linear packing        | Items packed left-to-right with no room arrangement logic | Unrealistic; all items in a row                   |
| P1       | Product `style` field always empty         | SerpAPI results never populate the `style` field        | Style filter in AI tool has no effect on real data  |
| P2       | Tool-use disclosure uses technical language | "Using tool: search_products..." shown verbatim         | Users see internal function names                   |
| P2       | Auto-tab switch removes user control       | setProducts(), setFloorPlan(), setScene3d() force tab   | Tab jumps interrupt user's current work             |
| P2       | No mobile support                          | Layout is desktop-only                                  | No mobile-responsive breakpoints                   |
| N/A      | No user authentication                     | Single shared server process                            | All WebSocket sessions share the same process       |
| N/A      | No multi-tenant data isolation             | search_cache.json is shared across all sessions         | Cache poisoning possible from concurrent users      |
