# Interior Designer Agent — Detailed Level Design

| Field   | Value                                    |
|---------|------------------------------------------|
| Version | 1.0                                      |
| Date    | 2026-02-24                               |
| Status  | Draft                                    |
| Authors | Engineering Team                         |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend Architecture](#3-backend-architecture)
4. [Data Models](#4-data-models)
5. [API Design](#5-api-design)
6. [AI Agent Specification](#6-ai-agent-specification)
7. [Frontend Component Specifications](#7-frontend-component-specifications)
8. [State Management](#8-state-management)
9. [Product Search Pipeline](#9-product-search-pipeline)
10. [Image Generation Pipeline](#10-image-generation-pipeline)
11. [3D Layout Generation](#11-3d-layout-generation)
12. [Floor Plan Generation](#12-floor-plan-generation)
13. [Dimension Scraping Service](#13-dimension-scraping-service)
14. [MVP Feature Gaps and Remediation Plan](#14-mvp-feature-gaps--remediation-plan)
15. [Non-Functional Requirements](#15-non-functional-requirements)

---

## 1. Introduction

### 1.1 Purpose

This document provides a detailed engineering specification for the Interior Designer Agent application. It is intended for developers implementing new features, fixing bugs, or extending the system. It describes every significant component, data model, API contract, service behaviour, and algorithm in the current codebase.

### 1.2 Scope

This DLD covers:
- Angular 17 frontend (components, services, state management)
- FastAPI Python backend (routers, services, WebSocket protocol)
- All four AI pipelines (product search, image generation, 3D layout, floor plan generation)
- Dimension scraping service
- Known MVP gaps with concrete remediation approaches

### 1.3 Relationship to HLD

This document expands on the High-Level Design (`docs/hld.md`). The HLD provides architectural decisions and rationale. This DLD provides implementation detail sufficient for an engineer to implement or modify any subsystem without reading source code first.

---

## 2. Frontend Architecture

### 2.1 Angular Module Structure

The frontend uses Angular 17 **standalone components** exclusively. There is no `AppModule`. Every component, directive, and pipe declares its own `imports` array.

```
frontend/src/
  app/
    app.component.ts           Root component — two-column layout
    components/
      chat-panel/              Left panel: conversation UI
      canvas-panel/            Right panel: tab container
      product-card/            Individual product card (used in grid and chat)
      product-grid/            Grid of ProductCard components
      product-detail-panel/    Slide-in detail panel for selected product
      plan-panel/              Room plan list with visualize actions
      floor-plan/              HTML Canvas 2D floor plan renderer
      visualization-3d/        Three.js interactive 3D room
        furniture-geometry.ts  Standalone geometry builders (not a component)
      cart-panel/              Shopping cart with stub checkout
    services/
      api.service.ts           WebSocket client + REST helpers
      furniture-store.service.ts  Central RxJS state bus
      plan.service.ts          Room plan state
      cart.service.ts          Cart state
      dimension.service.ts     REST client for dimension scraping
    models/
      index.ts                 All TypeScript interfaces and type aliases
    environments/
      environment.ts           API URL and WS URL (development)
      environment.prod.ts      Production overrides
```

### 2.2 Component Tree

```
AppComponent
├── ChatPanelComponent
│   └── ProductCardComponent  (inline product cards in assistant messages)
└── CanvasPanelComponent
    ├── [tab: products]   → ProductGridComponent
    │                        └── ProductCardComponent (×N)
    ├── [tab: plan]       → PlanPanelComponent
    ├── [tab: assets]     → (inline upload UI in CanvasPanelComponent template)
    ├── [tab: floor-plan] → FloorPlanComponent
    ├── [tab: 3d-view]    → Visualization3dComponent
    ├── [tab: room-images]→ (inline gallery in CanvasPanelComponent template)
    ├── [tab: cart]       → CartPanelComponent
    └── [overlay]         → ProductDetailPanelComponent (shown when selectedProduct != null)
```

### 2.3 RxJS State Management

All shared state flows through `FurnitureStoreService`. Components subscribe to observables and never hold authoritative copies of shared state. The store is the single source of truth for UI state.

```
FurnitureStoreService
  _messages$        BehaviorSubject<ChatMessage[]>
  _products$        BehaviorSubject<Product[]>
  _selectedProduct$ BehaviorSubject<Product | null>
  _activeTab$       BehaviorSubject<CanvasTab>
  _floorPlan$       BehaviorSubject<FloorPlanData | null>
  _scene3d$         BehaviorSubject<Scene3DData | null>
  _roomImages$      BehaviorSubject<string[]>          // base64 PNGs
  _isThinking$      BehaviorSubject<string | null>
  _uploadedAssets$  BehaviorSubject<UploadedAsset[]>

PlanService
  _plan$            BehaviorSubject<Plan>

CartService
  _items$           BehaviorSubject<CartItem[]>
```

### 2.4 Routing

There is no Angular Router. The application is a single-page, single-view layout. Tab navigation is handled by `CanvasTab` state in `FurnitureStoreService._activeTab$`. The active tab identifier is a string union type: `'products' | 'plan' | 'assets' | 'floor-plan' | '3d-view' | 'room-images' | 'cart'`.

### 2.5 WebSocket Client State Machine

`ApiService` maintains the following implicit state machine:

```
States: DISCONNECTED → CONNECTING → CONNECTED → AWAITING_RESPONSE → CONNECTED

Transitions:
  DISCONNECTED   → connect()       → CONNECTING
  CONNECTING     → onopen          → CONNECTED
  CONNECTED      → ws.close        → DISCONNECTED (then auto-reconnect after 3s)
  CONNECTED      → sendMessage()   → AWAITING_RESPONSE
  AWAITING_RESPONSE → "done"/"error" → CONNECTED

Internal buffers (reset on "done" and "error"):
  _pendingProducts: Product[]    // buffered before stream starts
  _pendingImages:   string[]     // buffered before stream starts
  _streamingMsgId:  string|null  // ID of current assistant message
```

The buffering mechanism allows products and images (which arrive before the text stream) to be attached to the same `ChatMessage` as the final text.

---

## 3. Backend Architecture

### 3.1 FastAPI App Structure

```
backend/
  main.py               FastAPI app, CORS middleware, router registration
  .env                  GOOGLE_API_KEY, SERPAPI_KEY (not committed)
  models/
    schemas.py          Pydantic v2 models for all request/response shapes
  routers/
    chat.py             WebSocket endpoint /api/chat/ws
    products.py         REST: GET /, POST /search, GET /{id}
    images.py           REST: POST /generate, POST /generate-from-plan, GET /proxy
    layout.py           REST: POST /generate-3d-layout, POST /generate-floor-plan-from-3d
    dimensions.py       REST: POST /fetch
  services/
    gemini_service.py   GeminiService — agentic tool loop
    product_service.py  ProductService — SerpAPI + cache
    imagen_service.py   ImagenService — image generation
    dimension_service.py DimensionService — scraping + Gemini extraction
```

### 3.2 Router Layout

| Router prefix       | File              | Endpoints                                                        |
|---------------------|-------------------|------------------------------------------------------------------|
| `/api/chat`         | routers/chat.py   | `WebSocket /ws`                                                  |
| `/api/products`     | routers/products.py | `GET /`, `POST /search`, `GET /{id}`                           |
| `/api/images`       | routers/images.py | `POST /generate`, `POST /generate-from-plan`, `GET /proxy`      |
| `/api/layout`       | routers/layout.py | `POST /generate-3d-layout`, `POST /generate-floor-plan-from-3d` |
| `/api/dimensions`   | routers/dimensions.py | `POST /fetch`                                                |
| `/health`           | main.py           | `GET /health`                                                    |

### 3.3 Dependency Injection

FastAPI DI is not fully utilised in the current implementation. Each router module instantiates its own service instances at module load time (module-level singletons):

```python
# routers/chat.py
_product_svc = ProductService()
_imagen_svc  = ImagenService()
_gemini_svc  = GeminiService(_product_svc, _imagen_svc)

# routers/products.py
_svc = ProductService()   # separate instance from chat router
```

The implication is that `ProductService` has two cache instances in memory. This is an architectural debt item. A post-MVP refactor should use FastAPI's `Depends()` with a singleton factory.

### 3.4 WebSocket Session Lifecycle

```
Browser connects to ws://backend/api/chat/ws
  │
  ├─► websocket.accept()
  ├─► history: list[dict] = []   (in-scope to this connection only)
  │
  └─► async loop:
        data = await websocket.receive_json()

        if type == "message":
          await gemini_svc.process_message(ws, content, images, history)

        if type == "reset":
          history.clear()
          await websocket.send_json({"type": "reset_ack"})

        on WebSocketDisconnect: exit loop
        on other Exception: send {"type":"error"}, exit loop
```

The `history` list is a plain Python list of dicts with keys `role`, `content`, `images`. It is rebuilt into `types.Content` objects on every Gemini call inside `_build_contents()`.

### 3.5 Agentic Tool Loop Pseudocode

```
async process_message(ws, content, images, history):
  user_parts = [image_parts...] + [text_part(content)]
  gemini_contents = build_contents(history) + [Content(role="user", parts=user_parts)]
  history.append({role:"user", content:content, images:images})

  while True:
    response = await call_gemini(gemini_contents, config)

    candidate = response.candidates[0]
    fn_calls  = [part for part in candidate.content.parts if part.function_call]
    text_parts = [part.text for part in candidate.content.parts if part.text]

    if fn_calls:
      gemini_contents.append(candidate.content)  # model turn
      result_parts = []

      for fc in fn_calls:
        await ws.send_json({"type":"thinking", "text":f"Using tool: {fc.name}…"})
        result = await execute_tool(fc.name, fc.args, ws)
        result_parts.append(Part.from_function_response(fc.name, result))

      gemini_contents.append(Content(role="user", parts=result_parts))
      # loop again

    else:
      # Final text response — stream in 60-char chunks
      for chunk in split_60(join(text_parts)):
        await ws.send_json({"type":"stream", "content":chunk})
        await sleep(0.02)

      history.append({role:"assistant", content:full_text})
      await ws.send_json({"type":"done"})
      break
```

Note: tool calls within a single turn are executed **sequentially**, not in parallel. If Gemini returns multiple function calls in one response, they are iterated with a `for` loop. The spec described parallel execution but the implementation is sequential. This is an optimisation opportunity for post-MVP.

---

## 4. Data Models

### 4.1 Product

Defined in `backend/models/schemas.py` (Pydantic) and `frontend/src/app/models/index.ts` (TypeScript interface).

| Field              | Type              | Notes                                                   |
|--------------------|-------------------|---------------------------------------------------------|
| `id`               | string            | `"SRP-" + MD5(product_id or title+source)[:10]`        |
| `title`            | string            | Raw product title from SerpAPI                         |
| `description`      | string            | Assembled from snippet + extensions (max 4 parts)      |
| `short_description`| string            | First 120 chars of description                         |
| `price`            | float             | Extracted from `extracted_price` or parsed from string |
| `currency`         | string            | Always `"USD"` for current SerpAPI config              |
| `seller`           | string            | `source` field from SerpAPI                            |
| `rating`           | float             | 0.0–5.0, from SerpAPI `rating` field                   |
| `review_count`     | int               | From SerpAPI `reviews` field                           |
| `category`         | string            | Inferred by `_guess_category()` keyword matching       |
| `style`            | string            | Always empty string (SerpAPI does not provide this)    |
| `images`           | string[]          | `[thumbnail_url]` — single element from SerpAPI        |
| `dimensions`       | Dimensions\|null  | Populated later by DimensionService if scraping works  |
| `colors`           | string[]          | Always empty list                                      |
| `in_stock`         | bool              | Always `true` (SerpAPI does not provide stock info)    |
| `url`              | string            | `product_link` or `link` or `"#"`                      |
| `tags`             | string[]          | Always empty list                                      |

### 4.2 Dimensions

| Field    | Type  | Notes                    |
|----------|-------|--------------------------|
| `width`  | float | Inches                   |
| `depth`  | float | Inches (front-to-back)   |
| `height` | float | Inches (floor-to-top)    |

### 4.3 PlanItem

Frontend only (`frontend/src/app/models/index.ts`).

| Field      | Type     | Notes                                              |
|------------|----------|----------------------------------------------------|
| `id`       | string   | `crypto.randomUUID()`                              |
| `product`  | Product  | Full Product object (mutable: dimensions added later) |
| `quantity` | number   | Min 1; set to 0 removes from plan                  |
| `addedAt`  | Date     | Timestamp when added                               |

### 4.4 Plan

Frontend only.

| Field       | Type       | Notes                              |
|-------------|------------|------------------------------------|
| `id`        | string     | `"default"` (only one plan at MVP) |
| `name`      | string     | User-editable, default "My Room Plan" |
| `items`     | PlanItem[] | Ordered by add time                |
| `createdAt` | Date       | —                                  |

### 4.5 UploadedAsset

Frontend only.

| Field        | Type      | Notes                                                          |
|--------------|-----------|----------------------------------------------------------------|
| `id`         | string    | `crypto.randomUUID()`                                          |
| `name`       | string    | Original filename                                              |
| `dataUrl`    | string    | Full `data:<mime>;base64,<data>` string                        |
| `mimeType`   | string    | e.g. `"image/jpeg"`, `"image/png"`                            |
| `type`       | AssetType | `'floor-plan'` \| `'reference'` \| `'other'`                 |
| `uploadedAt` | Date      | —                                                              |

Only one asset may have type `'floor-plan'` at a time. `updateAssetType()` demotes any existing floor-plan asset to `'reference'` when a new one is promoted.

### 4.6 FloorPlanData

Shared between frontend and backend.

| Field                  | Type                  | Notes                        |
|------------------------|-----------------------|------------------------------|
| `room_width`           | float                 | Feet, default 15             |
| `room_length`          | float                 | Feet, default 20             |
| `furniture_placements` | FurniturePlacement[]  | Ordered list of placements   |

**FurniturePlacement:**

| Field           | Type   | Notes                                      |
|-----------------|--------|--------------------------------------------|
| `name`          | string | Display label                              |
| `x_percent`     | float  | Left edge as % of room width (0–100)       |
| `y_percent`     | float  | Top edge as % of room length (0–100)       |
| `width_percent` | float  | Width as % of room width                   |
| `depth_percent` | float  | Depth as % of room length                  |
| `rotation`      | float  | Degrees (0 / 90 / 180 / 270)              |
| `color`         | string | CSS hex color, default `"#94a3b8"`         |

### 4.7 Scene3DData

Shared between frontend and backend.

| Field            | Type              | Notes                           |
|------------------|-------------------|---------------------------------|
| `room_width`     | float             | Feet, default 15                |
| `room_length`    | float             | Feet, default 20                |
| `room_height`    | float             | Feet, default 9                 |
| `furniture_items`| Furniture3DItem[] | —                               |

**Furniture3DItem:**

| Field      | Type   | Notes                                                        |
|------------|--------|--------------------------------------------------------------|
| `id`       | string | Unique identifier, e.g. `"sofa-1"`                         |
| `name`     | string | Display name                                                 |
| `type`     | string | Must match a `FurniturePreset.type` key                     |
| `x`        | float  | Left-front corner X position in feet (not center)           |
| `z`        | float  | Left-front corner Z position in feet (not center)           |
| `width`    | float  | Feet                                                         |
| `depth`    | float  | Feet                                                         |
| `height`   | float  | Feet                                                         |
| `color`    | string | CSS hex color                                                |
| `rotation` | float  | Degrees (0 / 90 / 180 / 270)                                |

### 4.8 CartItem

Frontend only.

| Field      | Type    | Notes                      |
|------------|---------|----------------------------|
| `id`       | string  | `crypto.randomUUID()`      |
| `product`  | Product | —                          |
| `quantity` | number  | Min 1                      |

### 4.9 ChatMessage

Frontend only.

| Field            | Type         | Notes                                              |
|------------------|--------------|----------------------------------------------------|
| `id`             | string       | `crypto.randomUUID()`                              |
| `role`           | MessageRole  | `'user'` \| `'assistant'`                         |
| `content`        | string       | Text content, accumulated during streaming         |
| `timestamp`      | Date         | —                                                  |
| `images`         | string[]?    | User-attached images (base64 data URLs)            |
| `products`       | Product[]?   | Products returned during this turn                 |
| `generatedImages`| string[]?    | Base64 PNG images generated during this turn       |
| `floorPlan`      | FloorPlanData? | Not currently attached to messages (handled via store) |
| `scene3d`        | Scene3DData? | Not currently attached to messages                 |
| `isStreaming`    | boolean?     | True while the assistant is still responding       |

---

## 5. API Design

### 5.1 REST Endpoints

#### GET /health

```
Response 200:
{
  "status": "ok",
  "api_key_set": true
}
```

#### GET /api/products/

```
Query params:
  limit: integer (default=24, max=48)

Response 200: Product[]
```

#### POST /api/products/search

```
Request:
{
  "query": string,           // required
  "category": string?,       // optional filter
  "max_price": number?,      // optional USD ceiling
  "style": string?,          // optional style filter
  "limit": integer           // default=12, max=24
}

Response 200: Product[]
```

#### GET /api/products/{product_id}

```
Response 200: Product
Response 404: { "detail": "Product not found" }
```

Note: `get_by_id()` always returns `null` in the current implementation (SerpAPI does not support lookup by ID). The 404 is always returned.

#### POST /api/images/generate

```
Request:
{
  "prompt": string,
  "width": integer,    // ignored (not passed to model)
  "height": integer    // ignored
}

Response 200:
{
  "image": string,      // base64 PNG
  "mime_type": "image/png"
}
Response 500: { "detail": "Image generation failed" }
```

#### POST /api/images/generate-from-plan

```
Request:
{
  "furniture_items": [
    { "title": string, "image_url": string }
  ],
  "floor_plan_image": string?   // base64 data URL, optional
}

Response 200:
{
  "image": string,      // base64 PNG
  "mime_type": "image/png"
}
Response 500: { "detail": "3D image generation failed" }
```

#### GET /api/images/proxy

```
Query params:
  url: string    // URL-encoded full http/https URL

Response 200: image bytes with original Content-Type
Response 400: { "detail": "Invalid URL" }      // non http/https
Response 502: { "detail": "Failed to fetch image: ..." }
```

#### POST /api/layout/generate-3d-layout

```
Request:
{
  "furniture_items": [
    {
      "name": string,
      "preset_type": string,   // e.g. "sofa", "dining-table"
      "quantity": integer,
      "width": float,          // feet
      "depth": float,
      "height": float,
      "color": string          // hex
    }
  ],
  "room_width": float,    // default 15.0
  "room_length": float,   // default 20.0
  "room_height": float    // default 9.0
}

Response 200: Scene3DData
Response 400: { "detail": "furniture_items must not be empty" }
Response 502: { "detail": "Gemini error: ..." }
```

#### POST /api/layout/generate-floor-plan-from-3d

```
Request:
{
  "scene3d": Scene3DData,
  "floor_plan_image": string    // base64 data URL (required)
}

Response 200: FloorPlanData
Response 400: { "detail": "Invalid floor plan image: ..." }
Response 502: { "detail": "Gemini error: ..." }
```

#### POST /api/dimensions/fetch

```
Request:
{
  "url": string,
  "product_title": string
}

Response 200:
{
  "width":  number | null,
  "depth":  number | null,
  "height": number | null,
  "found":  boolean
}
```

Never returns a 4xx or 5xx for scraping failures. `found: false` and null dimensions are returned instead.

### 5.2 WebSocket Message Protocol

**Endpoint:** `ws://<host>/api/chat/ws`

#### Client → Server Messages

| `type`    | Payload fields                        | Description                           |
|-----------|---------------------------------------|---------------------------------------|
| `message` | `content: string`, `images: string[]` | User turn; images are base64 data URLs|
| `reset`   | (none)                                | Clear conversation history            |

#### Server → Client Messages

| `type`       | Payload fields              | Description                                                  |
|--------------|-----------------------------|--------------------------------------------------------------|
| `thinking`   | `text: string`              | Emitted before each tool call: `"Using tool: <name>…"`      |
| `products`   | `data: Product[]`           | Product search results from `search_products` tool           |
| `image`      | `data: string`              | Base64 PNG from `generate_room_image` tool                   |
| `floor_plan` | `data: FloorPlanData`       | Floor plan JSON from `update_floor_plan` tool                |
| `scene_3d`   | `data: Scene3DData`         | 3D scene JSON from `create_3d_visualization` tool            |
| `stream`     | `content: string`           | 60-character text chunk of assistant response                |
| `done`       | (none)                      | Turn is complete; no more messages for this turn             |
| `error`      | `message: string`           | Unhandled exception; turn is terminated                      |
| `reset_ack`  | (none)                      | Confirms history has been cleared                            |

**Message ordering guarantee:** Within a single turn, the sequence is always:
```
(thinking → [tool result frame])* → (stream chunks)* → done
```
`products`, `image`, `floor_plan`, and `scene_3d` frames always arrive before any `stream` frame for that same turn.

---

## 6. AI Agent Specification

### 6.1 System Prompt

Located in `backend/services/gemini_service.py` as `SYSTEM_PROMPT`.

```
You are an expert AI interior designer and furniture shopping assistant.
You help users find furniture, visualize their spaces, and make confident design decisions.

You have access to tools:
- search_products: Search the furniture catalog
- generate_room_image: Generate a photorealistic room visualization
- update_floor_plan: Place furniture on a 2-D floor plan
- create_3d_visualization: Build a 3-D room scene

Guidelines:
- When a user describes what they want, proactively call search_products.
- When the user wants to see how furniture looks together, call generate_room_image.
- When discussing room layout, call update_floor_plan.
- When the user wants a 3-D view, call create_3d_visualization.
- Be warm, creative, and specific. Mention exact product names you found.
- Keep responses concise but informative.
```

### 6.2 Tool Schemas

All four tools are declared as a single `types.Tool` with `function_declarations`.

#### Tool: search_products

```json
{
  "name": "search_products",
  "description": "Search the furniture product catalog. Call this whenever the user asks for furniture suggestions.",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Natural-language search query"
      },
      "category": {
        "type": "string",
        "description": "Furniture category: sofa, dining table, chair, bed, bookshelf, dresser, coffee table, desk, tv stand, floor lamp, rug"
      },
      "max_price": {
        "type": "number",
        "description": "Maximum price in USD"
      },
      "style": {
        "type": "string",
        "description": "Style: modern, mid-century, farmhouse, industrial, contemporary, traditional, transitional, bohemian"
      }
    },
    "required": ["query"]
  }
}
```

#### Tool: generate_room_image

```json
{
  "name": "generate_room_image",
  "description": "Generate a photorealistic room visualization. Call when the user wants to see what the room will look like.",
  "parameters": {
    "type": "object",
    "properties": {
      "room_description": {
        "type": "string",
        "description": "Detailed description of the room, furniture, colours, and style"
      },
      "style": {
        "type": "string",
        "description": "Interior design style"
      }
    },
    "required": ["room_description"]
  }
}
```

#### Tool: update_floor_plan

```json
{
  "name": "update_floor_plan",
  "description": "Update the 2-D floor plan with furniture placements.",
  "parameters": {
    "type": "object",
    "properties": {
      "room_width":  { "type": "number", "description": "Room width in feet" },
      "room_length": { "type": "number", "description": "Room length in feet" },
      "furniture_placements": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name":          { "type": "string" },
            "x_percent":     { "type": "number", "description": "X position as % of room width (0-100)" },
            "y_percent":     { "type": "number", "description": "Y position as % of room length (0-100)" },
            "width_percent": { "type": "number" },
            "depth_percent": { "type": "number" },
            "rotation":      { "type": "number" },
            "color":         { "type": "string", "description": "CSS hex color" }
          }
        }
      }
    },
    "required": ["furniture_placements"]
  }
}
```

#### Tool: create_3d_visualization

```json
{
  "name": "create_3d_visualization",
  "description": "Create a 3-D room scene with furniture. Call when the user wants a 3-D view.",
  "parameters": {
    "type": "object",
    "properties": {
      "room_width":  { "type": "number" },
      "room_length": { "type": "number" },
      "room_height": { "type": "number" },
      "furniture_items": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id":       { "type": "string" },
            "name":     { "type": "string" },
            "type":     { "type": "string" },
            "x":        { "type": "number" },
            "z":        { "type": "number" },
            "width":    { "type": "number" },
            "depth":    { "type": "number" },
            "height":   { "type": "number" },
            "color":    { "type": "string" },
            "rotation": { "type": "number" }
          }
        }
      }
    },
    "required": ["furniture_items"]
  }
}
```

### 6.3 Tool Selection Logic

Gemini 2.0 Flash selects tools autonomously based on user intent. The system prompt provides explicit triggering rules:

| User Intent                                | Tool Called               |
|--------------------------------------------|---------------------------|
| Describes furniture needs                  | `search_products`         |
| Asks to see the room / how it will look    | `generate_room_image`     |
| Asks about layout / arrangement            | `update_floor_plan`       |
| Asks for a 3D view                         | `create_3d_visualization` |

Gemini may call multiple tools in a single turn (e.g. `search_products` + `generate_room_image`). When this happens, the tool calls appear in `candidate.content.parts` and are executed sequentially in the order returned.

### 6.4 Conversation History Management

History is stored as `list[dict]` with the following per-message format:

```python
# User turn
{"role": "user", "content": "find me a sofa", "images": ["data:image/jpeg;base64,..."]}

# Assistant turn
{"role": "assistant", "content": "I found 8 sofas for you...", "images": []}
```

Tool call turns (model → function call → function response) are **not** persisted to the history list. Only user turns and final text responses are stored. The full `gemini_contents` list (including intermediate tool call/response pairs) is rebuilt on each call using `_build_contents()` to convert the history dicts to `types.Content` objects, with images decoded from base64 back to bytes.

**History size:** There is currently no truncation. Long sessions will eventually exceed the model's context window. A post-MVP fix should implement a rolling window or summarisation strategy.

---

## 7. Frontend Component Specifications

### 7.1 ChatPanelComponent

**File:** `frontend/src/app/components/chat-panel/chat-panel.component.ts`

**Inputs:** None (reads from injected services)

**Key State:**
- `messages: ChatMessage[]` — mirrored from `store.messages$`
- `thinkingText: string | null` — mirrored from `store.isThinking$`
- `inputText: string` — bound to textarea
- `pendingImages: { dataUrl: string; name: string }[]` — images staged for sending
- `isDragging: boolean` — drag-and-drop overlay state

**Key Methods:**

| Method           | Trigger           | Behaviour                                                                             |
|------------------|-------------------|---------------------------------------------------------------------------------------|
| `send()`         | Button click / Enter | Calls `store.addMessage(user)` then `api.sendMessage(text, images)`              |
| `onKeyDown()`    | keydown           | Enter (no Shift) submits; Shift+Enter inserts newline                                 |
| `onFileChange()` | file input change | Reads files as base64 via `FileReader`, pushes to `pendingImages`                    |
| `onDrop()`       | drag drop         | Accepts image files via drag-and-drop                                                 |
| `resetChat()`    | Reset button      | Calls `api.resetConversation()` which clears history server-side and `store.clearAll()` |
| `scrollToBottom()` | AfterViewChecked | Smooth scroll when `shouldScroll` flag is set                                        |

**Rendering Notes:**
- User messages show attached image thumbnails
- Assistant messages show inline `ProductCardComponent` for any `msg.products`
- Thinking indicator shows `thinkingText` with a spinner
- Streaming messages show `isStreaming = true` cursor animation

### 7.2 CanvasPanelComponent

**File:** `frontend/src/app/components/canvas-panel/canvas-panel.component.ts`

**Tab IDs and Labels:**

| Tab ID         | Label        | Icon | Badge Source                    |
|----------------|--------------|------|---------------------------------|
| `products`     | Products     | —    | None                            |
| `plan`         | Plan         | —    | `planItemCount` (PlanService)   |
| `assets`       | Uploads      | —    | `uploadedCount`                 |
| `floor-plan`   | Floor Plan   | —    | None                            |
| `3d-view`      | 3D View      | —    | None                            |
| `room-images`  | Room Images  | —    | `roomImages.length`             |
| `cart`         | Cart         | —    | `cartItemCount` (CartService)   |

**Tab Switching Logic:**

- User-initiated: `setTab(tab)` → `store.setActiveTab(tab)`
- AI-initiated (automatic):
  - `store.setProducts()` auto-switches to `'products'`
  - `store.setFloorPlan()` auto-switches to `'floor-plan'`
  - `store.setScene3d()` auto-switches to `'3d-view'`
  - `store.addRoomImage()` auto-switches to `'room-images'`

**Upload Handling:**

The Uploads tab is implemented inline in the CanvasPanelComponent template (not a separate component). File type guessing uses a filename regex: `/floor|plan/i` → `'floor-plan'`, otherwise `'reference'`. Only one asset may have type `'floor-plan'` at a time. The `store.updateAssetType()` method enforces this.

**Image Generation from Plan:**

The "Generate Room Image" button on the Uploads tab calls `generateImageFromPlan()`. This:
1. Collects `{ title, image_url }` from plan items
2. Finds the floor-plan typed asset (if any) via `store.getFloorPlanAsset()`
3. Calls `apiService.generateImageFromPlan(items, fpAsset?.dataUrl)`
4. On success: calls `store.addRoomImage(res.image)` (switches to Room Images tab)

### 7.3 ProductCardComponent

**File:** `frontend/src/app/components/product-card/product-card.component.ts`

**Inputs:**
- `@Input({ required: true }) product: Product`

**Outputs:**
- `@Output() cardClick: EventEmitter<Product>`

**Key State:**
- `imgFailed: boolean` — true if image fails to load; shows placeholder

**Key Methods:**

| Method          | Behaviour                                                                                         |
|-----------------|---------------------------------------------------------------------------------------------------|
| `addToPlan(e)`  | Calls `plan.addProduct(product)`. On first add (not already in plan and no dimensions): fires `dimensionSvc.fetchDimensions()` in background, then calls `plan.updateProductDimensions()` on result |
| `imgSrc` (getter) | External URLs are proxied through `environment.apiUrl + '/images/proxy?url='`                  |
| `inPlan` (getter) | Calls `plan.isInPlan(product.id)`                                                              |
| `planQty` (getter) | Calls `plan.getQuantity(product.id)`                                                          |
| `onImgError()`  | Sets `imgFailed = true`                                                                           |

**Image Proxy Rule:**
```
if (imgFailed)           → placehold.co placeholder
if (raw.startsWith('data:') || raw.includes('placehold.co'))  → raw URL
else                     → PROXY + encodeURIComponent(raw)
```

### 7.4 PlanPanelComponent

**File:** `frontend/src/app/components/plan-panel/plan-panel.component.ts`

**Key State:**
- `plan: Plan` — mirrored from `planService.plan$`
- `editingName: boolean` — inline plan name edit mode

**CATEGORY_MAP (local layout algorithm):**

Used by both `visualize3D()` and `visualizeFloorPlan()`. Maps product category string to a `FurnitureSpec`:

| Category           | type             | w    | d    | h    | color     |
|--------------------|------------------|------|------|------|-----------|
| `sofa`             | sofa             | 7    | 3.5  | 3    | #8b7355   |
| `chair`/`armchair` | armchair         | 3    | 3    | 3.5  | #9c8b7d   |
| `bed`              | bed-queen        | 5.5  | 6.5  | 2    | #ddd0c8   |
| `dining table`     | dining-table     | 6    | 3.5  | 2.5  | #6b4c2a   |
| `coffee table`     | coffee-table     | 4    | 2    | 1.5  | #5c3d1e   |
| `side table`       | side-table       | 1.5  | 1.5  | 2.5  | #8b7355   |
| `desk`             | desk             | 5    | 2.5  | 2.5  | #8b7355   |
| `bookshelf`        | bookshelf        | 3    | 1    | 7    | #6b4c2a   |
| `dresser`          | dresser          | 4    | 1.5  | 3.5  | #7a6040   |
| `wardrobe`         | wardrobe         | 5    | 2    | 7.5  | #5c4a3a   |
| `tv stand`         | tv-stand         | 6    | 1.5  | 2    | #3d2b1a   |
| `floor lamp`       | floor-lamp       | 1    | 1    | 5.5  | #c8a96e   |
| `rug`              | rug              | 8    | 5    | 0.15 | #b8860b   |

**`visualize3D()` Algorithm:**

Produces a `Scene3DData` with room 20×20×9 ft. Items are packed left-to-right, wrapping to next row when `curX + spec.w + PADDING > ROOM_W`. Row height tracks the maximum depth seen. If overflow exceeds room bounds, resets to position (1, 1). No rotation is applied (all items at 0 degrees). This produces a linear packing layout, not a designed arrangement.

**`visualizeFloorPlan()` Algorithm:**

Same packing logic but produces percentage-based positions for FloorPlanData. Room is 20×20 ft.

**Key Methods:**

| Method            | Behaviour                                                              |
|-------------------|------------------------------------------------------------------------|
| `addToCart(item)` | Calls `cartService.addItem(item.product, item.quantity)`              |
| `addAllToCart()`  | Loops all items and adds each to cart                                  |
| `updateQty(item, delta)` | Calls `planService.updateQuantity(item.id, item.quantity + delta)` |
| `removeItem(item)` | Calls `planService.removeItem(item.id)`                              |
| `visualize3D()`   | Local packing algorithm → `store.setScene3d(sceneData)`              |
| `visualizeFloorPlan()` | Local packing algorithm → `store.setFloorPlan(floorPlan)`       |

### 7.5 Visualization3dComponent

**File:** `frontend/src/app/components/visualization-3d/visualization-3d.component.ts`

**FURNITURE_PRESETS (20 items):**

| type            | name           | w    | d   | h    | category    |
|-----------------|----------------|------|-----|------|-------------|
| sofa            | Sofa           | 7    | 3.5 | 3    | Living Room |
| sectional       | Sectional      | 9    | 4.5 | 3    | Living Room |
| armchair        | Armchair       | 3    | 3   | 3.5  | Living Room |
| coffee-table    | Coffee Table   | 4    | 2   | 1.5  | Living Room |
| floor-lamp      | Floor Lamp     | 1    | 1   | 5.5  | Living Room |
| tv-stand        | TV Stand       | 6    | 1.5 | 2    | Living Room |
| side-table      | Side Table     | 1.5  | 1.5 | 2.5  | Living Room |
| dining-table    | Dining Table   | 6    | 3.5 | 2.5  | Dining      |
| dining-chair    | Dining Chair   | 1.5  | 1.8 | 3.5  | Dining      |
| bed-king        | King Bed       | 6.5  | 7   | 2    | Bedroom     |
| bed-queen       | Queen Bed      | 5.5  | 6.5 | 2    | Bedroom     |
| bed-single      | Single Bed     | 3.5  | 6.5 | 2    | Bedroom     |
| dresser         | Dresser        | 4    | 1.5 | 3.5  | Bedroom     |
| wardrobe        | Wardrobe       | 5    | 2   | 7.5  | Bedroom     |
| nightstand      | Nightstand     | 1.5  | 1.5 | 2    | Bedroom     |
| desk            | Desk           | 5    | 2.5 | 2.5  | Office      |
| bookshelf       | Bookshelf      | 3    | 1   | 7    | Office      |
| office-chair    | Office Chair   | 2    | 2   | 4    | Office      |
| rug             | Rug            | 8    | 5   | 0.15 | Decor       |
| plant           | Plant          | 1.5  | 1.5 | 3.5  | Decor       |

**Three.js Scene Setup:**

- Renderer: `WebGLRenderer` with antialiasing, PCFSoftShadowMap, pixel ratio capped at 2
- Camera: `PerspectiveCamera(50°, aspect, 0.1, 300)`, initial position `(W*1.15, H*1.2, L*1.2)`
- Lighting: `AmbientLight(0xffffff, 0.7)` + `DirectionalLight(0xfffbf0, 1.1)` at (12,18,12) with 2048×2048 shadow map + `DirectionalLight(0xdbeafe, 0.4)` fill
- Scene background: `0xf1f5f9`, `FogExp2(0xf1f5f9, 0.018)`
- Floor: `PlaneGeometry(W, L)` with canvas texture (wood plank pattern at 512×512)
- Walls: `BoxGeometry(W, H, L)` with `BackSide` rendering
- Room outline: `LineSegments` with `EdgesGeometry`

**TransformControls Configuration:**

| Mode        | Axes Shown          | Constraint                                |
|-------------|---------------------|-------------------------------------------|
| `translate` | X, Z only (Y hidden)| Items can only move on the floor plane    |
| `rotate`    | Y only              | Items can only rotate vertically          |
| `scale`     | X, Y, Z             | Free scale                                |

`snapToFloor()` is called on every `objectChange` event, setting `group.position.y = 0` to prevent items from floating.

**Keyboard Shortcuts:**

| Key           | Action                          | Condition               |
|---------------|---------------------------------|-------------------------|
| `Escape`      | Deselect item                   | Always                  |
| `Delete`/`Backspace` | Remove selected item   | Item selected           |
| `g` / `G`     | Set mode to translate           | Item selected           |
| `r` / `R`     | Set mode to rotate              | Item selected           |
| `s` / `S`     | Set mode to scale               | Item selected; no Ctrl/Meta |
| `Shift+D`     | Duplicate selected item         | Item selected           |

**`loadFromSceneData(data: Scene3DData)` Logic:**

1. `clearAll()` — removes all items from scene
2. Updates `roomDims` from `data.room_width/length/height`
3. Calls `buildRoom()` to rebuild floor/walls/grid for new dimensions
4. For each `fi` in `data.furniture_items`:
   - Finds matching `FurniturePreset` by type (exact match, then partial)
   - Falls back to `FURNITURE_PRESETS[0]` (sofa)
   - Calls `buildFurnitureGroup(preset.type, W, D, H, color)`
   - Sets `group.position` to `(fi.x + W/2, 0, fi.z + D/2)` — centers the group
   - Note: `fi.x` and `fi.z` are left-front corners, group origin is center
   - Sets `group.rotation.y` from `fi.rotation` (degrees → radians)

**`generateFromPlan()` (AI Layout):**

1. Reads `planService.currentPlan.items`
2. For each item, calls `matchPreset()` to find the matching `FurniturePreset` by title keyword rules
3. Uses `item.product.dimensions` (inches → feet) if available, else preset defaults
4. Builds `LayoutFurnitureInput[]`
5. Calls `apiService.generate3dLayout(inputs, roomDims)` → `POST /api/layout/generate-3d-layout`
6. On success: calls `loadFromSceneData(data)`

**HTML Label Overlays:**

Label `<div>` elements are created in a `position:absolute` overlay container. Each frame, labels are repositioned using `getWorldPosition()` → `project(camera)` → screen-space pixel coordinates. Items behind the camera (`pos.z >= 1`) have their label hidden. Selected item labels are fully opaque; others at 70%.

### 7.6 FloorPlanComponent

**File:** `frontend/src/app/components/floor-plan/floor-plan.component.ts`

**Canvas Drawing Pipeline:**

1. Subscribe to `store.floorPlan$` and `store.scene3d$`
2. On each update, call `draw()`
3. `resizeObserver` on parent element triggers `resizeAndDraw()` (sets canvas dimensions, then draws)

**`draw()` procedure:**
1. Clear canvas
2. If no floor plan: draw empty state text
3. Draw background grid (30px step, `#e2e8f0`)
4. Draw room boundary (`pad=48px` on each side) with dimension labels
5. For each `furniture_placement`:
   - Calculate pixel coordinates from percentages
   - `ctx.translate(center)` + `ctx.rotate(deg→rad)`
   - Draw shadow + rounded rect fill + border + truncated label (14 chars max)
6. Draw compass rose (bottom-right, 22px radius, N in red)

**`generateFromScene3D()`:**

Requires: `this.scene3d != null` AND `this.store.getFloorPlanAsset() != null`. Calls `apiService.generateFloorPlanFrom3d(scene3d, fpAsset.dataUrl)` → `POST /api/layout/generate-floor-plan-from-3d`. On success: `store.setFloorPlan(res)`.

### 7.7 RoomImagesComponent

Room images are displayed inline within the `CanvasPanelComponent` template (no separate component file). Images are stored as base64 strings in `store.roomImages$`. The `data:image/png;base64,` prefix is prepended to render each image. A lightbox is available: clicking an image sets `lightboxIndex`, which triggers a full-screen overlay.

### 7.8 CartPanelComponent

**File:** `frontend/src/app/components/cart-panel/cart-panel.component.ts`

**Key Methods:**

| Method              | Behaviour                                                       |
|---------------------|-----------------------------------------------------------------|
| `updateQty(id, delta)` | `cartService.updateQuantity(productId, item.quantity + delta)` |
| `removeItem(id)`    | `cartService.removeItem(productId)`                             |
| `checkout()`        | Calls `cartService.checkout()` → `alert("Checkout complete!")` + `clearCart()` |
| `thumbSrc(product)` | Same proxy logic as ProductCard                                 |

**Known Issue (P0):** `checkout()` calls `alert()` and immediately clears the cart without any actual transaction. See section 14.1 for remediation.

---

## 8. State Management

### 8.1 FurnitureStoreService

**File:** `frontend/src/app/services/furniture-store.service.ts`

Central state bus for all UI-visible state except plan and cart (which have their own services for separation of concerns).

| Observable         | Type                        | Mutators                                     | Consumers                                                        |
|--------------------|-----------------------------|----------------------------------------------|------------------------------------------------------------------|
| `messages$`        | `ChatMessage[]`             | `addMessage`, `updateLastMessage`, `appendToLastMessage` | `ChatPanelComponent`                              |
| `products$`        | `Product[]`                 | `setProducts`                                | `ProductGridComponent`                                           |
| `selectedProduct$` | `Product \| null`           | `selectProduct`                              | `CanvasPanelComponent`, `ProductDetailPanelComponent`            |
| `activeTab$`       | `CanvasTab`                 | `setActiveTab`, (implicitly by setProducts etc.) | `CanvasPanelComponent`                                        |
| `floorPlan$`       | `FloorPlanData \| null`     | `setFloorPlan`                               | `FloorPlanComponent`                                             |
| `scene3d$`         | `Scene3DData \| null`       | `setScene3d`                                 | `Visualization3dComponent`, `FloorPlanComponent`                |
| `roomImages$`      | `string[]`                  | `addRoomImage`                               | `CanvasPanelComponent` (gallery)                                 |
| `isThinking$`      | `string \| null`            | `setThinking`                                | `ChatPanelComponent`                                             |
| `uploadedAssets$`  | `UploadedAsset[]`           | `addAsset`, `removeAsset`, `updateAssetType` | `CanvasPanelComponent`, `FloorPlanComponent`                     |

**`clearAll()` behaviour:** Resets messages, products, selectedProduct, floorPlan, scene3d, roomImages, isThinking. Intentionally **preserves** `uploadedAssets` across resets (users should not lose their uploaded floor plan on chat reset).

### 8.2 PlanService

**File:** `frontend/src/app/services/plan.service.ts`

Manages the single active `Plan` object.

| Method                          | Behaviour                                                                   |
|---------------------------------|-----------------------------------------------------------------------------|
| `addProduct(product)`           | If already in plan: increments quantity. Otherwise creates new `PlanItem`. |
| `removeItem(itemId)`            | Filters out item by ID                                                      |
| `updateQuantity(itemId, qty)`   | Sets quantity; calls `removeItem` if qty <= 0                               |
| `updateProductDimensions(pid, dims)` | Updates `item.product.dimensions` for the given product ID          |
| `renamePlan(name)`              | Updates plan name                                                           |
| `clearPlan()`                   | Sets `items: []`                                                            |
| `isInPlan(productId)` (sync)    | Returns boolean without subscription                                        |
| `getQuantity(productId)` (sync) | Returns current quantity (0 if not in plan)                                |
| `totalPrice` (getter)           | Sum of `price * quantity` for all items                                    |
| `itemCount` (getter)            | Sum of all quantities                                                       |

### 8.3 CartService

**File:** `frontend/src/app/services/cart.service.ts`

| Method                          | Behaviour                                                      |
|---------------------------------|----------------------------------------------------------------|
| `addItem(product, quantity)`    | If product already in cart: adds quantity. Otherwise creates new item. |
| `updateQuantity(productId, qty)`| Sets quantity; calls `removeItem` if qty <= 0                  |
| `removeItem(productId)`         | Filters out by product ID                                      |
| `clearCart()`                   | Sets items to `[]`                                             |
| `checkout()`                    | `alert("Checkout complete...")` then `clearCart()` (STUB)     |
| `itemCount` (getter)            | Sum of all quantities                                          |
| `totalPrice` (getter)           | Sum of `price * quantity`                                      |

---

## 9. Product Search Pipeline

### 9.1 Complete Pipeline

```
User message → Gemini → search_products(query, category?, max_price?, style?)
                                │
                                ▼
ProductService.search(query, category, max_price, style, limit=12)
  │
  ├─ Build search string:
  │    parts = [style?, category?, query]
  │    search_q = " ".join(parts)
  │
  ├─ Build cache key:
  │    key = JSON({ q: search_q, max: max_price, limit: limit }, sorted)
  │
  ├─ Cache hit? → return [Product(**p) for p in cached_data]
  │
  └─ Cache miss:
       params = {
         engine: "google_shopping",
         q: search_q,
         api_key: SERPAPI_KEY,
         num: min(limit, 20),
         gl: "us", hl: "en",
         tbs: "price:1,ppr_max:{max_price}"  // if max_price set
       }

       await asyncio.to_thread(GoogleSearch(params).get_dict())
       results = data["shopping_results"][:limit]

       products = [_map_product(r) for r in results]

       save to cache (async fire-and-forget)
       return products
```

### 9.2 Product Mapping from SerpAPI

`_map_product(r: dict) → Product`:

1. `title` = `r["title"]`
2. `description` = snippet + extensions joined by ` · ` (first 4 parts)
3. `short_description` = description[:120]
4. `price` = `r["extracted_price"]` or parsed from price string (range → lower bound)
5. `seller` = `r["source"]`
6. `category` = `_guess_category(title)` — keyword dictionary lookup
7. `style` = `""` (always empty)
8. `images` = `[r["thumbnail"] or placeholder_url]`
9. `url` = `r["product_link"] or r["link"] or "#"`
10. `id` = `"SRP-" + MD5(product_id or title+source)[:10]`

### 9.3 Cache Design

- **Storage:** `search_cache.json` (root of backend directory)
- **Key:** `json.dumps({"q": search_q, "max": max_price, "limit": limit}, sort_keys=True)`
- **Value:** `list[dict]` — Pydantic `model_dump()` of each Product
- **Eviction:** None (cache grows indefinitely)
- **Persistence:** Written asynchronously via `asyncio.create_task(asyncio.to_thread(self._save_cache))`
- **Logging:** Cache hits and misses are logged to `product_search.log`

### 9.4 Limitations

- `style` field is never populated from SerpAPI results. The AI may call `search_products` with a `style` parameter, which gets prepended to the search query string, but the resulting `Product` objects will always have `style=""`.
- `dimensions` is always `null` from the search pipeline. Dimensions are populated asynchronously by `DimensionService` after a product is added to the plan.
- `review_count` from SerpAPI is a raw number, not normalised.
- Product ID is a hash, not a stable persistent identifier.

---

## 10. Image Generation Pipeline

### 10.1 WebSocket AI Path (generate_room_image tool)

```
Tool: generate_room_image
  args: { room_description: str, style?: str }
  │
  ▼
prompt = f"{room_description}. Style: {style}" (if style)
  │
  ▼
ImagenService.generate_room_image(prompt)
  │
  ▼
full_prompt = "Create a photorealistic interior design visualization: {prompt}. "
              "High quality, professional interior photography style, warm natural lighting, "
              "sharp focus, 4K resolution."
  │
  ▼
client.models.generate_content(
  model="gemini-2.0-flash-preview-image-generation",
  contents=full_prompt,
  config=GenerateContentConfig(response_modalities=["IMAGE", "TEXT"])
)
  │
  ▼
response.candidates[0].content.parts
  → find part where part.inline_data.mime_type starts with "image/"
  → base64.b64encode(part.inline_data.data).decode("utf-8")
  │
  ▼
websocket.send_json({ "type": "image", "data": b64_string })
  │
  ▼
ApiService.handleServerMessage (case "image"):
  → store.addRoomImage(msg.data)   // auto-switches to room-images tab
  → _pendingImages.push(msg.data)  // attached to next chat message
```

### 10.2 REST Plan Path (generate-from-plan)

```
POST /api/images/generate-from-plan
  body: { furniture_items: [{title, image_url}], floor_plan_image?: dataUrl }
  │
  ▼
ImagenService.generate_3d_visualization(furniture_items, floor_plan_image)
  │
  ├─ If floor_plan_image: decode data URL → add as first Part
  │
  ├─ For each furniture_item:
  │    fetch image_url with httpx (timeout=15s, follow_redirects)
  │    if 200: add as image Part
  │
  ├─ Build prompt with items list + floor_plan_note (if image provided)
  │
  ├─ Add text Part as last element
  │
  └─ client.models.generate_content(
       model="gemini-3-pro-image-preview",   // NOTE: this model ID may be incorrect
       contents=prompt_parts,
       config=GenerateContentConfig(response_modalities=["IMAGE"])
     )
     → extract image Part → base64 encode → return
```

**Known Issue:** The model ID `"gemini-3-pro-image-preview"` used in `generate_3d_visualization` is not a verified model ID. If this endpoint fails, check the model ID against the Gemini API documentation.

---

## 11. 3D Layout Generation

### 11.1 Local Packing Algorithm (Fast Path)

Triggered by "Visualize in 3D" button in `PlanPanelComponent`. No API call.

```
Room: 20ft × 20ft × 9ft
PADDING = 1ft
curX = 1, curZ = 1, rowMaxDepth = 0

for each planItem, for each quantity:
  spec = getSpec(planItem.product.category)  // CATEGORY_MAP lookup

  if curX + spec.w + PADDING > 20:
    curX = 1
    curZ += rowMaxDepth + PADDING
    rowMaxDepth = 0

  if curZ + spec.d + PADDING > 20:
    curX = 1; curZ = 1  // overflow: reset to start

  rowMaxDepth = max(rowMaxDepth, spec.d)

  push Furniture3DItem at position (curX, spec.spec, curZ), rotation=0
  curX += spec.w + PADDING
```

Result: items packed in rows from the front-left corner. No semantic placement. All items face the same direction (rotation=0).

### 11.2 AI Layout Algorithm (Gemini Path)

Triggered by "Generate 3D Layout" button in `Visualization3dComponent`.

```
Visualization3dComponent.generateFromPlan()
  │
  ├─ For each plan item:
  │    preset = matchPreset(title, category)  // keyword-matching rules
  │    dims = item.product.dimensions (inches → feet) or preset defaults
  │    push LayoutFurnitureInput { name, preset_type, quantity, width, depth, height, color }
  │
  ▼
POST /api/layout/generate-3d-layout
  │
  ├─ Expand items by quantity:
  │    "- Sofa  (type=sofa, size=7w × 3.5d × 3h ft, color=#8b7355)"
  │    "- Armchair 1  (type=armchair, ...)"
  │    "- Armchair 2  (type=armchair, ...)"
  │
  ├─ Build prompt with room dimensions + expanded furniture list + coordinate rules
  │
  └─ client.models.generate_content(
       model="gemini-2.0-flash",
       contents=prompt,
       config=GenerateContentConfig(
         response_mime_type="application/json",
         response_schema=LAYOUT_RESPONSE_SCHEMA
       )
     )
     → JSON parse → return Scene3DData
```

**Interior Design Rules in Prompt (selected):**
- Sofas face the TV stand / focal wall with coffee table between
- Dining chairs surround the dining table
- Beds against a wall, nightstands on sides
- Desks and bookshelves along walls
- Rugs beneath seating groups or dining sets
- Traffic lanes ≥ 3ft between main furniture groups

### 11.3 `matchPreset()` Keyword Rules

`matchPreset(title, category)` uses an ordered list of `[keywords[], preset_type]` rules. Rules are evaluated in order; first match wins:

1. King bed variants → `bed-king`
2. Queen bed variants → `bed-queen`
3. Twin/single/full → `bed-single`
4. Bed frame (generic) → `bed-queen`
5. Sectional → `sectional`
6. Sofa/couch/loveseat → `sofa`
7. Armchair/accent chair/recliner → `armchair`
8. Office/task/desk/gaming chair → `office-chair`
9. Dining chair/side chair/stool → `dining-chair`
10. Coffee/cocktail table → `coffee-table`
11. Side/end/accent table → `side-table`
12. Nightstand/bedside → `nightstand`
13. Dining/kitchen table → `dining-table`
14. Desk/workstation → `desk`
15. TV stand/media console → `tv-stand`
16. Dresser/chest of drawers → `dresser`
17. Wardrobe/armoire → `wardrobe`
18. Bookshelf/shelving → `bookshelf`
19. Floor lamp (specific) → `floor-lamp`
20. Any lamp/light/chandelier → `floor-lamp`
21. Rug/carpet → `rug`
22. Plant/potted → `plant`
23. Chair/stool/ottoman/bench → `armchair` (catch-all)
24. Table (generic) → `coffee-table` (catch-all)

Fallback: category-level matching, then `armchair`.

---

## 12. Floor Plan Generation

### 12.1 Local Percentage Algorithm

Triggered by "Visualize Floor Plan" button in `PlanPanelComponent`.

Same packing logic as the local 3D algorithm but produces `FurniturePlacement[]` with percentage-based positions. Room is 20×20ft. Positions are converted: `x_percent = (curX / ROOM_W) * 100`.

### 12.2 AI Floor Plan from 3D Scene

Triggered by "Generate AI Floor Plan from 3D View" button in `FloorPlanComponent`. Requires an uploaded floor-plan typed asset.

```
POST /api/layout/generate-floor-plan-from-3d
  body: { scene3d: Scene3DData, floor_plan_image: base64DataUrl }
  │
  ├─ Decode floor_plan_image base64 → bytes, extract mime_type
  │
  ├─ Build items description:
  │    "- Sofa: approx size 7x3.5, color #8b7355, current rough pos (1.5, 1.5)"
  │
  ├─ Prompt: analyze floor plan image + adjust furniture to fit actual room
  │   (understands doorways, windows, architectural features)
  │
  └─ client.models.generate_content(
       model="gemini-2.5-flash",   // vision-capable model
       contents=[image_part, text_part],
       config=GenerateContentConfig(
         response_mime_type="application/json",
         response_schema=FLOOR_PLAN_RESPONSE_SCHEMA
       )
     )
     → JSON parse → return FloorPlanData
```

The output coordinates are `x_percent` / `y_percent` relative to the floor plan image boundaries (not the original room dimensions). This means the floor plan canvas will render the furniture proportionally scaled to whatever image the user uploaded.

---

## 13. Dimension Scraping Service

### 13.1 Trigger

When a user clicks "Add to Plan" on a `ProductCardComponent` for the first time (product not already in plan, and `product.dimensions` is null):

```typescript
this.dimensionSvc.fetchDimensions(product).subscribe(dims => {
  if (dims) this.plan.updateProductDimensions(product.id, dims);
});
```

This is a fire-and-forget operation from the component's perspective. There is no loading state shown to the user. If dimensions are fetched successfully, they appear in the 3D layout on the next "Generate 3D Layout" call.

### 13.2 Backend Pipeline

```
POST /api/dimensions/fetch
  body: { url: string, product_title: string }
  │
  ├─ Validate URL not empty or "#"
  │
  ├─ httpx GET product URL:
  │    timeout=12s, follow_redirects=True
  │    User-Agent: Chrome/120
  │    Accept: text/html,application/xhtml+xml,...
  │
  ├─ strip_html(resp.text):
  │    Remove <script> and <style> blocks
  │    Remove all HTML tags
  │    Collapse whitespace
  │
  ├─ _extract_relevant_text(stripped, max_chars=5000):
  │    Keywords: dimension, width, depth, height, length, size,
  │              measurement, specification, spec, inches, '"', cm
  │    Slide 2000-char window over text in 300-char steps
  │    Pick window with highest keyword density
  │    Prepend first 800 chars (product intro)
  │    Combined, truncated to max_chars
  │
  └─ client.models.generate_content(
       model="gemini-2.0-flash",
       contents=DIMENSION_PROMPT.format(title, text),
       config=GenerateContentConfig(
         response_mime_type="application/json",
         response_schema={"type":"OBJECT", properties:{width, depth, height}}
       )
     )
     → JSON parse
     → if all(w > 0, d > 0, h > 0): return {width, depth, height} in inches
     → else: return None
```

### 13.3 Unit Convention

Dimensions are stored and transmitted in **inches** throughout the backend and frontend models. Conversion to feet happens only in the 3D scene:
- Frontend `Visualization3dComponent.generateFromPlan()`: `dims.width / 12`
- Layout router prompt: dimensions submitted as feet (already converted by component)

### 13.4 Failure Modes

The service never throws. All exceptions (network timeout, bot detection, parse errors, Gemini failure) result in `None` being returned. The `DimensionResponse.found` field communicates success/failure. The frontend `DimensionService` maps this to `null` via `catchError(() => of(null))`.

Common failure cases:
- Product URL is `"#"` → immediate `None`
- Page returns 403 (bot detection) → httpx exception → `None`
- Dimensions not explicitly stated (only in images/tables) → Gemini returns zeros → `None`
- SerpAPI `product_link` redirects through tracking URL → may fail redirect

---

## 14. MVP Feature Gaps & Remediation Plan

### 14.1 P0: Stub Checkout

**Current behaviour:** `CartService.checkout()` calls `alert("Checkout complete! Your items have been purchased.")` then clears the cart.

**Problem:** Users believe they have purchased items. No actual transaction occurs.

**Remediation approach:**

Replace the checkout flow with a confirmation screen that shows a list of cart items with their seller names and product URLs. Each item has a "Visit Seller" button that opens `product.url` in a new tab. A disclaimer states "You will be redirected to the seller's website to complete your purchase." The `alert()` is removed entirely.

Implementation:
1. Add a `checkoutItems` state in `CartService` (set to copy of items before clearing)
2. Add a `showingConfirmation: boolean` state in `CartPanelComponent`
3. Template shows the confirmation view when `showingConfirmation = true`
4. Each item row shows a "Buy from {seller}" anchor button pointing to `product.url` with `target="_blank" rel="noopener"`
5. A "Done / Clear Cart" button clears the cart and returns to normal view

### 14.2 P0: No Session Persistence

**Current behaviour:** `localStorage` is not used. Page reload destroys Plan, Cart, uploaded assets, generated images, and chat history.

**Remediation approach (partial — frontend only):**

Persist Plan and Cart to `localStorage`. Chat history and generated images are lower priority (they are large and have privacy implications).

Implementation:
1. In `PlanService`, subscribe to `plan$` and call `localStorage.setItem('plan', JSON.stringify(plan))` on every change
2. On construction, load from `localStorage.getItem('plan')` and parse, handling `Date` fields as strings
3. Same pattern for `CartService` with key `'cart'`
4. Uploaded assets: stored in `localStorage` as base64 strings (warn if > 5MB)
5. Generated room images: not persisted (too large for localStorage, use IndexedDB as post-MVP)

Full persistence (chat history, AI-generated images, WebSocket session) requires a backend database and session management, deferred to post-MVP.

### 14.3 P1: No Onboarding for First-Time Users

**Current behaviour:** The app opens to a blank chat panel with no explanation.

**Remediation approach:**

Show a dismissible 3-step overlay on first visit (checked via `localStorage.getItem('onboarded')`):

Step 1: "Chat with your AI designer" — explain the chat panel, show example prompts
Step 2: "See products and visualize your space" — explain the 7 canvas tabs
Step 3: "Build your room plan" — explain "Add to Plan" and the Plan tab

After step 3, set `localStorage.setItem('onboarded', '1')` and dismiss. A "Skip" button on step 1 also sets this flag.

Display suggested prompts in the empty state of the chat: "Try: 'Find me a mid-century sofa under $800'" / "Try: 'Show me a living room with a sectional'" / "Try: 'Create a 3D layout for a 15x12 ft bedroom'".

### 14.4 P1: Tool-Use Disclosure Language

**Current behaviour:** The `thinking` frame sends `"Using tool: search_products…"` — raw function name visible to users.

**Remediation approach:**

Map tool names to human-readable descriptions in the server send path:

```python
TOOL_LABELS = {
    "search_products":       "Searching for furniture…",
    "generate_room_image":   "Generating room visualization…",
    "update_floor_plan":     "Updating floor plan…",
    "create_3d_visualization": "Building 3D scene…",
}

await ws.send_json({
    "type": "thinking",
    "text": TOOL_LABELS.get(fc.name, f"Working on {fc.name}…")
})
```

This is a one-line backend change in `gemini_service.py`.

### 14.5 P1: 3D Initial Layout is Linear Packing

**Current behaviour:** "Visualize in 3D" in PlanPanelComponent uses linear row-packing. All items face forward in a row.

**Remediation approach:**

Change the "Visualize in 3D" button to trigger the AI layout endpoint by default, making the local algorithm a fallback. Since the AI endpoint takes 3–8 seconds, show a loading spinner.

Implementation:
1. Move "Visualize in 3D" logic to call `apiService.generate3dLayout()` directly from `PlanPanelComponent`
2. Show a loading state: "Arranging furniture with AI…"
3. On success: `store.setScene3d(data)` — switches to 3D tab
4. On error (e.g. 502 from Gemini): fall back to local packing algorithm with a toast notification "Using basic layout (AI unavailable)"
5. Keep the existing "Visualize in 3D" quick button as the instant fallback

### 14.6 P1: 3D Keyboard Shortcuts Undiscoverable

**Current behaviour:** Keyboard shortcuts (G, R, S, Shift+D, Delete) are active but invisible.

**Remediation approach:**

Add a persistent "Keyboard Shortcuts" toggle in the 3D view's toolbar. Clicking it shows/hides a small legend panel:

```
Keyboard Shortcuts
  G         Move (grab)
  R         Rotate
  S         Scale
  Shift + D Duplicate
  Delete    Remove
  Esc       Deselect
```

The legend appears as a floating card in the bottom-left of the 3D canvas. State is toggled with a keyboard icon button in the toolbar. Default state: hidden.

Also add mode indicators to the existing toolbar buttons (Move / Rotate / Scale) with the shortcut letter shown in parentheses: "Move (G)", "Rotate (R)", "Scale (S)".

### 14.7 P2: Auto-Tab Switch Removes User Control

**Current behaviour:** Any AI tool result (products, floor plan, scene, image) forces a tab switch.

**Remediation approach:**

Replace forced tab switches with toast notifications. Instead of calling `this._activeTab.next('products')` inside `setProducts()`, emit a separate notification stream:

```typescript
// In FurnitureStoreService:
private _notification$ = new Subject<{ tab: CanvasTab; label: string }>();
notification$ = this._notification$.asObservable();

setProducts(products: Product[]) {
  this._products.next(products);
  this._notification$.next({ tab: 'products', label: 'Products updated' });
  // Do NOT switch tab automatically
}
```

The toast shows a clickable message: "Products updated — View Products" that navigates to the tab if clicked. Tab switches only happen if the user is currently on a tab unrelated to the incoming data.

This is a higher-effort change that requires a toast component and coordination across multiple store methods.

---

## 15. Non-Functional Requirements

### 15.1 Performance Targets

| Operation                          | Target P50  | Target P95  | Notes                                         |
|------------------------------------|-------------|-------------|-----------------------------------------------|
| Product search (SerpAPI)           | 3 s         | 6 s         | Cache hit: < 100 ms                           |
| Room image generation              | 10 s        | 20 s        | Gemini Flash Preview model                    |
| AI 3D layout generation            | 3 s         | 8 s         | Gemini Flash with JSON schema                 |
| Dimension scraping                 | 5 s         | 12 s        | Page fetch + Gemini; best-effort              |
| 3D scene render (60fps target)     | < 16 ms     | < 33 ms     | On modern hardware; degrades with item count  |
| Floor plan canvas redraw           | < 5 ms      | < 10 ms     | Pure Canvas 2D operations                     |
| WebSocket reconnect                | 3 s         | 3 s         | Fixed delay, not exponential backoff          |

### 15.2 Browser Support

| Browser          | Minimum Version | Notes                              |
|------------------|-----------------|------------------------------------|
| Chrome           | 108+            | Primary development target         |
| Firefox          | 110+            | WebGL 2, WebSocket                 |
| Safari           | 16+             | WebGL, Canvas, WebSocket           |
| Edge             | 108+            | Chromium-based                     |
| Mobile           | Not supported   | No responsive breakpoints in MVP   |

Minimum requirements: WebGL 2.0 (Three.js), WebSocket, `crypto.randomUUID()`, `ResizeObserver`, Canvas 2D with `roundRect`.

### 15.3 Security Requirements

| Requirement                        | Implementation                                                     |
|------------------------------------|--------------------------------------------------------------------|
| API keys never in frontend         | Keys only in backend .env / Secret Manager                        |
| CORS restricted                    | Allow-list: localhost:4200/4201 (dev), Firebase domain (prod)     |
| Image proxy SSRF prevention        | Validate http/https prefix; block private IP ranges (post-MVP)    |
| Pydantic input validation          | All REST request bodies validated before handler execution        |
| No secrets in logs                 | api_key excluded from log records                                 |
| WebSocket auth                     | None at MVP (single-tenant dev/demo use)                          |
| XSS prevention                     | Angular template binding auto-escapes; no `innerHTML` usage       |
| SQL injection                      | No SQL database; N/A                                              |

### 15.4 Reliability

| Scenario                           | Behaviour                                                          |
|------------------------------------|--------------------------------------------------------------------|
| SerpAPI unreachable                | Returns empty product list; user sees "no results" in chat        |
| Gemini API error                   | `error` frame sent via WebSocket; error message shown in chat     |
| WebSocket disconnected             | Auto-reconnect after 3 seconds; unsent messages retried           |
| Image generation fails             | Null returned; WebSocket `error` or no `image` frame sent        |
| Dimension scraping fails           | `found: false` returned; plan item retains null dimensions        |
| 3D layout AI fails                 | HTTP 502 returned; component shows error message in UI            |
| Backend restart                    | WebSocket reconnects; chat history is lost (per-connection state) |

### 15.5 Scalability Constraints

The following aspects of the current design prevent horizontal scaling beyond a single Cloud Run instance:

1. `search_cache.json` is a local file — multiple instances do not share the cache
2. `ProductService` and the chat router each instantiate separate `ProductService` instances with separate caches
3. WebSocket sessions hold conversation history in process memory — reconnecting to a different instance loses history
4. `ImagenService` instances in the image router and chat router are independent

Remediation for multi-instance scaling: replace the file cache with Redis (Cloud Memorystore), move conversation history to a session store (e.g. Firestore or Redis with TTL), and use FastAPI `Depends()` to enforce singleton service instances.
