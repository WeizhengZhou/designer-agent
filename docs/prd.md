# Product Requirements Document
## Interior Designer Agent — AI-Powered Furniture Shopping Assistant

**Version:** 1.0
**Date:** 2026-02-24
**Status:** MVP Shipped — Iterating
**Owner:** Product Manager

---

## Table of Contents

1. [Product Overview and Vision](#1-product-overview-and-vision)
2. [Problem Statement](#2-problem-statement)
3. [Goals and Success Metrics](#3-goals-and-success-metrics)
4. [Target Users and Personas](#4-target-users-and-personas)
5. [Feature Requirements](#5-feature-requirements)
6. [AI Agent Behavior Specification](#6-ai-agent-behavior-specification)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Out of Scope and Future Work](#8-out-of-scope-and-future-work)
9. [Open Questions](#9-open-questions)

---

## 1. Product Overview and Vision

### 1.1 What Is This Product?

Interior Designer Agent is an AI-powered web application that allows homeowners and furniture shoppers to discover, visualize, and purchase furniture through a conversational AI interface. Users describe what they need in natural language (text and/or images), and the AI agent autonomously searches real product catalogs, places items in a 2D floor plan, renders a 3D room view, and generates photorealistic room images — all in real time.

### 1.2 Vision Statement

To be the most intuitive and intelligent way for consumers to shop for furniture: eliminating the gap between imagining a room and furnishing it, by making the entire design-and-purchase journey feel like working with a personal interior designer.

### 1.3 Current MVP State

A fully functional prototype exists with:
- A chat interface with image upload support (left panel)
- An AI agent (Gemini 2.0 Flash) that invokes four tools: product search, room image generation, floor plan update, and 3D scene generation
- A right-panel "canvas" with 7 tabs: Products, Plan, Uploads, Floor Plan, 3D View, Room Images, Cart
- Real product search via SerpAPI / Google Shopping
- AI-generated 3D room visualizations and floor plans
- Shopping plan management with quantity control
- A cart and checkout flow (currently mock)
- User-uploaded floor plan image as a reference for AI scene generation

### 1.4 Technical Architecture Summary

| Layer | Technology |
|---|---|
| Frontend | Angular 17, standalone components, Three.js (3D), HTML Canvas (floor plan) |
| Backend | FastAPI, WebSocket for streaming, REST endpoints |
| LLM | Gemini 2.0 Flash (`gemini-2.0-flash`) via `google-genai` SDK |
| Image Gen | `gemini-2.0-flash-preview-image-generation` |
| Product Data | SerpAPI Google Shopping with JSON cache |
| Dimension Scraping | Gemini-assisted scraping from product URLs |

---

## 2. Problem Statement

### 2.1 The Core Problem

Furniture shopping online is expensive in time and prone to buyer's remorse. Consumers face three painful friction points:

1. **Discovery friction**: Filtering through thousands of products across multiple retailers to find items that match style, budget, and dimensions is time-consuming and overwhelming.

2. **Visualization gap**: It is hard to picture how individual furniture pieces will look together in a specific room. Static product images on retail sites do not show context. Mental modeling of spatial arrangements requires expertise most consumers lack.

3. **Decision paralysis**: Without being able to see furniture in their actual room, consumers delay purchase decisions, order and return items repeatedly, or simply buy the wrong things.

### 2.2 Current Market Alternatives and Their Limitations

- **Traditional retail sites** (Wayfair, IKEA, Amazon): Browsing, filtering, and comparing across tabs. No conversational or spatial assistance.
- **AR apps** (IKEA Place, Houzz): Single-product AR visualization on a mobile camera. Require the user to already know which product they want. No discovery or AI guidance.
- **Interior designers**: Expensive professionals. Inaccessible to most homeowners.
- **Mood board tools** (Canva, Pinterest): No product linking, no spatial layout, no purchasing integration.

### 2.3 Our Solution

Interior Designer Agent replaces all of the above steps in a single, conversational session. The AI agent acts as a knowledgeable designer who can search products, reason about what fits the user's room, show them realistic visualizations, and guide them to purchase — all through natural language.

---

## 3. Goals and Success Metrics

### 3.1 Business Goals

| Goal | Rationale |
|---|---|
| Demonstrate AI-assisted commerce as a viable product | Establish proof-of-concept for the agent-as-shopper model |
| Achieve high user engagement in conversational sessions | Time-in-session is a proxy for perceived value |
| Increase purchase conversion vs. traditional browsing | If users can visualize, they buy with more confidence |

### 3.2 Product Goals (This Milestone)

1. All core features work reliably end-to-end in the MVP
2. AI agent selects the correct tool for each user intent in >90% of tested scenarios
3. Room image generation succeeds in <15 seconds
4. 3D visualization loads and is interactive within 3 seconds of data arrival

### 3.3 North Star Metric

**Conversation-to-Plan Rate**: The percentage of chat sessions where the user adds at least one product to their room plan.

This metric captures whether the AI agent is successfully bridging discovery with intent to purchase.

### 3.4 Supporting KPIs

| KPI | Target (MVP) | Measurement |
|---|---|---|
| Conversation-to-Plan Rate | >40% | plan.items.length > 0 at session end |
| AI Tool Call Success Rate | >90% | Tool calls that return valid data / total tool calls |
| Room Image Generation Success | >80% | Successful base64 responses / total generate calls |
| Floor Plan Generation Success | >85% | Valid placement data returned / total calls |
| 3D Scene Load Time | <3 seconds | Time from scene_3d event to Three.js render complete |
| Session Length | >5 minutes | Time from first message to last interaction |
| Product Click-Through Rate | >30% | Product card clicks / products shown |
| Plan-to-Cart Conversion | >20% | Cart items added / plan items |

### 3.5 Anti-Goals

- We are not measuring final purchase completion (checkout is currently a mock alert)
- We are not tracking revenue in this phase
- We are not A/B testing UI variants in the MVP

---

## 4. Target Users and Personas

### 4.1 User Segments

**Primary**: General consumers (homeowners, renters, apartment dwellers) who are actively shopping for furniture or redecorating a room.

**Secondary**: Interior design enthusiasts who want an intelligent mood board and layout tool.

### 4.2 Personas

---

**Persona 1: The First-Time Homeowner**

- **Name**: Priya, 31
- **Situation**: Recently bought a 2-bedroom condo. Has a rough budget and a general style preference (modern/Scandinavian) but no design training.
- **Frustration**: Overwhelmed by retailer websites. Opens 40 browser tabs, loses track of what she was comparing, can't picture how a sofa will look with a coffee table she saw on another tab.
- **What she wants**: To describe her room and get curated recommendations. To see everything together before buying.
- **How the agent helps**: She types "I need a sofa, coffee table, and rug for a 12x14 living room, Scandinavian style, under $2000 total." The agent searches, shows matching products, renders a floor plan and 3D view, and surfaces a realistic room image.

---

**Persona 2: The Design-Forward Renter**

- **Name**: Marcus, 27
- **Situation**: Lives in a small studio apartment. Is design-conscious, follows interior design accounts on social media, has opinions about aesthetics but a limited budget.
- **Frustration**: He has inspiration images from Instagram but no easy way to find actual products that match. He wastes hours searching for "mid-century armchair similar to the one in this photo."
- **What he wants**: To upload a reference image and get matching product recommendations. To see his specific room size reflected in visualizations.
- **How the agent helps**: He uploads a photo of his inspiration room. The agent uses multimodal input to understand the style and suggests matching products from the catalog.

---

**Persona 3: The Pragmatic Upgrader**

- **Name**: Susan, 48
- **Situation**: Empty nester. Wants to refresh the living room and master bedroom. Has a real floor plan from her architect. Has budget but low patience for technology.
- **Frustration**: Doesn't want to use multiple apps. Finds 3D visualization tools confusing. Wants to ask questions in plain English like "will this sofa be too big for my room?"
- **What she wants**: Conversational simplicity. She wants to talk to the agent like a consultant and have it handle the complexity.
- **How the agent helps**: She uploads her existing floor plan image. The agent overlays furniture on the actual room shape. She can ask questions like "add two armchairs facing the sofa" and the plan updates.

---

## 5. Feature Requirements

### 5.1 Chat Interface (Left Panel)

#### 5.1.1 Text Input

**Description**: A multi-line textarea at the bottom of the chat panel where users type natural language requests.

**User Stories**:
- As a user, I can type a request describing what furniture I'm looking for, so that the AI agent understands my needs and searches for relevant products.
- As a user, I can press Enter to send my message (Shift+Enter for newline), so that sending messages feels natural and keyboard-accessible.
- As a user, I can see a "thinking" indicator while the AI processes my request, so that I know the system is working and not frozen.
- As a user, I can reset the conversation to start fresh, so that I can begin a new design session without reloading the page.

**Acceptance Criteria**:
- Text input is a `<textarea>` supporting multiline input
- Enter sends the message; Shift+Enter inserts a newline
- Textarea auto-focuses after each message is sent
- A "thinking" banner appears during AI processing with the current tool being invoked (e.g., "Using tool: search_products...")
- A "Reset" button clears the chat history both on the frontend and on the backend WebSocket session
- The input is disabled while a message is streaming (prevents double-send)

---

#### 5.1.2 Image Upload

**Description**: Users can attach one or more images to their chat message — either by clicking a file picker, drag-and-dropping onto the chat area, or pasting from clipboard.

**User Stories**:
- As a user, I can attach images to my message so that the AI can use them as style references or to understand my existing room.
- As a user, I can see thumbnail previews of my pending images before I send the message, so that I can confirm what I'm attaching.
- As a user, I can remove a pending image before sending, so that I don't accidentally send the wrong reference.

**Acceptance Criteria**:
- File input accepts `image/*` file types
- Drag-and-drop onto the chat panel works; non-image files are silently filtered
- Images are shown as small thumbnails with a remove (×) button in the pre-send area
- Images are encoded as base64 data-URLs before being sent over WebSocket
- Multiple images can be attached to a single message
- Image data is preserved in the chat history and rendered in the chat bubble after sending

---

#### 5.1.3 Chat Message Display

**Description**: The chat history shows alternating user and assistant message bubbles. Assistant messages include inline product cards and generated images when relevant.

**User Stories**:
- As a user, I can see the full conversation history, so that I can reference previous recommendations and context.
- As a user, I can see product cards inline within the AI's response, so that I don't need to switch tabs to see what the AI found.
- As a user, I can see AI-generated room images directly in the chat, so that visualizations are contextualized with the conversation.
- As a user, I can scroll up to read earlier parts of the conversation, so that I don't lose context in long sessions.

**Acceptance Criteria**:
- User messages appear right-aligned with blue styling; assistant messages appear left-aligned with white/gray styling
- Timestamps are shown on each message
- Uploaded images appear in the user bubble
- When the agent searches products, product cards render inside the assistant bubble (mini cards with image, title, price)
- When the agent generates a room image, it appears as a thumbnail in the assistant bubble
- The chat auto-scrolls to the latest message after each update
- Streaming text renders progressively (chunk by chunk at 60-character intervals with 20ms delay)
- A loading animation ("...") is shown while the assistant response is streaming

---

### 5.2 AI Agent Tool Loop

See Section 6 for full behavioral specification. From a feature requirements perspective:

**User Stories**:
- As a user, I can ask in natural language for furniture recommendations and receive curated product results, so that I don't need to know specific search syntax.
- As a user, I can ask to "see my room in 3D" or "show me the floor plan" and the appropriate visualization tab opens automatically, so that the UI responds intelligently to my intent.
- As a user, I can see visible indicators of what the agent is doing at each step (which tool it is calling), so that I understand why there is a processing delay.

**Acceptance Criteria**:
- The agent uses the correct tool based on user intent in well-defined scenarios (see Section 6)
- Tool calls are surfaced to the UI via `{"type": "thinking", "text": "Using tool: X..."}` messages
- Product results from `search_products` are immediately pushed to the Products tab
- Floor plan data from `update_floor_plan` triggers the Floor Plan tab to activate
- Scene data from `create_3d_visualization` triggers the 3D View tab to activate
- Room images from `generate_room_image` trigger the Room Images tab to activate
- The agent loop continues until a final text response is produced (no unresolved tool calls)
- Errors in any tool are caught and surfaced as chat error messages, not silent failures

---

### 5.3 Product Cards and Product Grid

#### 5.3.1 Product Card

**Description**: Each product is rendered as a card with thumbnail, title, price, seller, star rating, and an "Add to Plan" button.

**Data Fields** (from `Product` model):
- `id`, `title`, `description`, `short_description`
- `price`, `currency`, `seller`
- `rating`, `review_count`
- `category`, `style`
- `images[]`, `dimensions` (optional), `colors[]`
- `in_stock`, `url`, `tags[]`

**User Stories**:
- As a user, I can see a visual preview of each product, so that I can quickly evaluate whether it matches my aesthetic.
- As a user, I can see the price and seller name on the card without clicking, so that I can compare at a glance.
- As a user, I can add a product to my room plan from the card, so that I can collect items I'm interested in.
- As a user, I can see a visual indicator on the card when an item is already in my plan (with quantity), so that I know my current selection state.

**Acceptance Criteria**:
- All external product images are proxied through `/api/images/proxy?url=` to avoid CORS failures
- If an image fails to load, a category-labeled placeholder image is shown
- Star ratings are displayed as filled/empty stars (0-5 scale, rounded)
- The "Add to Plan" button is always visible if the item is already in the plan (showing current quantity)
- Clicking the card body (not the button) opens the product detail side panel
- The "Add to Plan" button click is stopPropagated so it doesn't also open the detail panel
- When a product is added to the plan for the first time, a background dimension-fetch request is triggered to the `/api/dimensions/fetch` endpoint

---

#### 5.3.2 Product Grid

**Description**: The Products tab on the right panel shows a grid of product cards for the most recent search result.

**User Stories**:
- As a user, I can browse all products returned by the AI's search in a scrollable grid, so that I can compare all options.

**Acceptance Criteria**:
- Grid uses a responsive column layout (minimum 2 columns on desktop)
- Grid is replaced (not appended) when a new search result arrives
- Empty state is shown when no products are available ("Ask the AI to help you find furniture...")
- Up to 12 products are shown per search (configurable up to 24 via `limit` parameter)

---

### 5.4 Product Detail Side Panel

**Description**: Clicking a product card opens a full-width overlay slide-in panel with complete product details.

**User Stories**:
- As a user, I can view the full description, all available images, dimensions (if available), and a link to the seller's page, so that I have all information needed to make a purchase decision.
- As a user, I can close the detail panel with the Escape key or a close button, so that returning to the grid is fast.

**Acceptance Criteria**:
- Panel slides in from the right, covering the canvas panel content
- If the product has multiple images, they are browsable (image gallery)
- Dimensions (width × depth × height in inches) are displayed if available from the scraping service
- A "Visit Seller" link opens the product URL in a new tab
- Pressing Escape closes the panel (`document:keydown.escape` HostListener)
- Proxied image URLs are used with fallback to placeholder on error

---

### 5.5 Room Plan Management (Plan Tab)

**Description**: The Plan tab aggregates selected products into a named room plan with quantity controls, total price, and actions to visualize or move items to cart.

**User Stories**:
- As a user, I can see all items I've added to my plan in one place, so that I can review my total selection.
- As a user, I can increase or decrease the quantity of each item, so that I can plan for multiple chairs around a dining table, for example.
- As a user, I can remove an item from my plan, so that I can refine my selection as I explore more.
- As a user, I can see the total estimated price for my plan, so that I can track my budget.
- As a user, I can rename my plan, so that I can organize plans for different rooms.
- As a user, I can visualize my plan in 3D or as a floor plan with one click, so that I see how my selected items look together in a room.
- As a user, I can move individual items or all items to my cart from the plan view, so that I can proceed to purchase when ready.

**Acceptance Criteria**:
- Plan tab shows a badge with the total item count (sum of quantities)
- Each plan item shows: proxied thumbnail, title, category, price, quantity controls (+/-), and remove button
- Quantity increment/decrement: minimum 1 (removing 1 from qty=1 deletes the item)
- Total price is recalculated reactively as quantities change
- "Rename Plan" is an inline edit field (click pencil icon → type → press Enter or click away to save)
- "Visualize in 3D" button calls `visualize3D()` which builds a `Scene3DData` from plan items using `CATEGORY_MAP` dimensions and navigates to the 3D View tab
- "Open Floor Plan" button calls `visualizeFloorPlan()` which builds a `FloorPlanData` and navigates to the Floor Plan tab
- "Add to Cart" button on each item; "Add All to Cart" button for the full plan
- Plan persists within the session (survives tab switches, survives chat resets — cart and plan are NOT cleared on reset)

---

### 5.6 Asset Uploads (Uploads Tab)

**Description**: Users can upload reference images (room photos, inspiration images, floor plan drawings) to the app. These images are stored as `UploadedAsset` objects and can be used as inputs to AI generation.

**Asset Types**:
- `floor-plan`: A 2D floor plan drawing. Only one may be designated as floor-plan at a time.
- `reference`: An inspiration image or room photo. Multiple allowed.
- `other`: Any other uploaded file.

**User Stories**:
- As a user, I can upload images of my room or floor plan so that the AI can use them as accurate references when generating visualizations.
- As a user, I can designate one uploaded image as my "floor plan" and the system will use it to anchor furniture placement in the AI-generated images.
- As a user, I can remove uploaded assets I no longer need.

**Acceptance Criteria**:
- File input accepts `image/*` types
- On upload, file names containing "floor" or "plan" (case-insensitive) are auto-classified as `floor-plan` type; others default to `reference`
- User can change the type of any asset via a dropdown
- Only one asset may have type `floor-plan`; promoting a new asset demotes any existing floor-plan asset to `reference`
- Assets persist across chat resets (intentional — they are room-level context, not session-level)
- The floor-plan asset is automatically included when the user triggers "Generate Room Image from Plan" or floor plan generation from 3D scene
- Uploads tab shows a count badge of the number of uploaded assets

---

### 5.7 Floor Plan View (Floor Plan Tab)

**Description**: A 2D HTML Canvas rendering of the room layout. The floor plan is populated either by the AI agent (via `update_floor_plan` tool) or by the user manually triggering "Open Floor Plan" from the Plan tab.

**Visual Elements**:
- Background grid (30px steps)
- Room outline with wall thickness and dimension labels (in feet)
- Colored furniture rectangles with labels, rotation support, and rounded corners
- Drop shadow on each furniture piece
- Compass rose (N/S orientation indicator)

**User Stories**:
- As a user, I can see a top-down 2D view of my room layout, so that I understand spatial relationships between furniture pieces.
- As a user, I can see dimension labels on the room (width and length in feet), so that I can verify scale.
- As a user, I can see a "Generate AI Floor Plan" button when I have a 3D scene and an uploaded floor plan image, so that I can have the AI fit the 3D layout into my actual room.

**Acceptance Criteria**:
- Canvas is responsive and resizes with the container (ResizeObserver)
- Empty state shows "Floor plan will appear here" message
- Each furniture piece is drawn with its specified color and label (truncated to 14 characters with ellipsis)
- Furniture pieces respect their `rotation` property
- When `floorPlan` data arrives from the store, the canvas redraws immediately
- The "Generate AI Floor Plan from 3D" button is shown only when both `scene3d` data and a floor-plan uploaded asset exist
- Clicking "Generate AI Floor Plan from 3D" calls `POST /api/layout/generate-floor-plan-from-3d` with the 3D scene data and the floor plan image, then updates the canvas with the returned layout
- A loading indicator is shown while the AI floor plan is being generated

---

### 5.8 3D Visualization (3D View Tab)

**Description**: A Three.js-powered interactive 3D room scene. Users can add furniture from a preset catalog, manipulate items with transform controls, and view AI-generated scene layouts.

#### 5.8.1 Room Scene

**Description**: A 3D room with hardwood floor texture, walls, directional lighting, and ambient occlusion. Room dimensions are configurable.

**Default Room**: 15 ft wide × 20 ft long × 9 ft tall.

**Acceptance Criteria**:
- Room is rendered with a warm wooden floor texture (Canvas-generated, tiled)
- Walls are semi-transparent to allow exterior camera angles
- Three light sources: ambient (0.7 intensity), sun directional with soft shadows (mapSize 2048), and fill directional
- Grid overlay is visible on the floor (opacity 0.3)
- Camera defaults to isometric-like view from outside-above the room corner
- OrbitControls: pan, zoom (3–60 ft range), orbit (max polar angle = floor level)
- Fog: exponential density 0.018 matching scene background color

---

#### 5.8.2 Furniture Preset Catalog (Left Panel)

**Description**: A sidebar with 20 furniture presets organized into 5 categories: Living Room, Dining, Bedroom, Office, Decor.

**Preset List** (with default dimensions in feet):

| Category | Preset | W | D | H |
|---|---|---|---|---|
| Living Room | Sofa | 7 | 3.5 | 3 |
| Living Room | Sectional | 9 | 4.5 | 3 |
| Living Room | Armchair | 3 | 3 | 3.5 |
| Living Room | Coffee Table | 4 | 2 | 1.5 |
| Living Room | Floor Lamp | 1 | 1 | 5.5 |
| Living Room | TV Stand | 6 | 1.5 | 2 |
| Living Room | Side Table | 1.5 | 1.5 | 2.5 |
| Dining | Dining Table | 6 | 3.5 | 2.5 |
| Dining | Dining Chair | 1.5 | 1.8 | 3.5 |
| Bedroom | King Bed | 6.5 | 7 | 2 |
| Bedroom | Queen Bed | 5.5 | 6.5 | 2 |
| Bedroom | Single Bed | 3.5 | 6.5 | 2 |
| Bedroom | Dresser | 4 | 1.5 | 3.5 |
| Bedroom | Wardrobe | 5 | 2 | 7.5 |
| Bedroom | Nightstand | 1.5 | 1.5 | 2 |
| Office | Desk | 5 | 2.5 | 2.5 |
| Office | Bookshelf | 3 | 1 | 7 |
| Office | Office Chair | 2 | 2 | 4 |
| Decor | Rug | 8 | 5 | 0.15 |
| Decor | Plant | 1.5 | 1.5 | 3.5 |

**User Stories**:
- As a user, I can browse the preset catalog and drag items into the room by clicking, so that I can manually build a scene without relying on the AI.
- As a user, I can add items from the preset list to see them placed in the center of the room, so that I can then position them as needed.

**Acceptance Criteria**:
- Presets are grouped by category with collapsible/visible section headers
- Clicking a preset adds a new furniture group to the scene at a random offset near room center
- Newly added items are automatically selected (TransformControls attaches)
- The item appears in the "Placed Items" list on the right properties panel

---

#### 5.8.3 Transform Controls

**Description**: Selected furniture items can be moved, rotated, and scaled using Three.js TransformControls.

**Mode Behaviors**:
- **Translate**: Moves item on the X and Z axes only (Y is locked — furniture always stays on the floor)
- **Rotate**: Rotates item around Y axis only (no tilting)
- **Scale**: Scales on all axes

**User Stories**:
- As a user, I can click on a furniture item in the 3D scene to select it, so that I can manipulate it.
- As a user, I can move, rotate, and scale furniture pieces to position them exactly where I want them in the room.
- As a user, I can use keyboard shortcuts to switch between transform modes quickly (G=move, R=rotate, S=scale).
- As a user, I can duplicate a selected item with Shift+D, so that I don't need to re-add the same piece (e.g., dining chairs).
- As a user, I can delete the selected item with Delete or Backspace, so that I can remove unwanted furniture.
- As a user, I can right-click a selected item to get a context menu, so that I can access common actions quickly.

**Acceptance Criteria**:
- Clicking a furniture mesh selects it; clicking empty space deselects
- Selected items show a blue edge highlight (hex #6366f1)
- TransformControls are visible on the selected item
- `snapToFloor()` is called after every `objectChange` to prevent furniture from floating
- Keyboard shortcuts work when focus is not in a text input: G (translate), R (rotate), S (scale), Delete/Backspace (remove), Shift+D (duplicate), Escape (deselect)
- Context menu appears at the right-click position with options: Move, Rotate, Scale, Duplicate, Remove
- OrbitControls are disabled while dragging a TransformControl handle

---

#### 5.8.4 Properties Panel (Right Panel)

**Description**: When a furniture item is selected, a properties panel shows and allows editing of: name, position (X, Z), rotation Y (degrees), dimensions (W, D, H in feet), and color.

**User Stories**:
- As a user, I can see precise position and dimension values for the selected item, so that I can understand the exact layout.
- As a user, I can type in exact values for position, rotation, and size, so that I can make precise adjustments.
- As a user, I can change the color of a selected item using a color picker, so that I can experiment with different finishes.
- As a user, I can click "Apply" to commit my typed changes to the scene.

**Acceptance Criteria**:
- Properties panel is empty when nothing is selected
- Position values update in real-time while dragging (via `objectChange` event)
- Clicking "Apply" calls `applyProps()` which updates position, rotation, scale, and color on the group
- Changing color triggers a full geometry rebuild via `recolorGroup()` (because geometry requires a new material)
- Room dimension controls (width, length, height inputs + "Rebuild Room" button) are also on the properties panel for changing room size

---

#### 5.8.5 AI Layout Generation

**Description**: Users can trigger AI-generated room layouts directly from the 3D view. The AI (via `POST /api/layout/generate-3d-layout`) reads the user's plan items and returns a scene with professionally placed furniture.

**User Stories**:
- As a user, I can click "Generate Layout from Plan" in the 3D view, so that the AI arranges my plan's furniture in a realistic and well-designed 3D room.
- As a user, I can see a loading state while the AI is generating the layout, so that I know the request is in progress.

**Acceptance Criteria**:
- The "Generate from Plan" button is shown only when the plan has at least one item
- A loading spinner is shown during the API call (`isGeneratingLayout = true`)
- On success, `loadFromSceneData()` is called to replace the current scene with the AI-arranged layout
- On failure, an error message is shown to the user
- Product dimensions (from dimension scraping, if available) override preset defaults; units converted from inches to feet (`÷ 12`)
- Room dimensions default to 15 × 20 × 9 ft but can be overridden via the room dimension controls

---

#### 5.8.6 Item List and Camera Controls

**User Stories**:
- As a user, I can see a list of all placed furniture items, so that I can click to select any item without clicking in 3D space.
- As a user, I can reset the camera to the default view, so that I can get back to a good vantage point after zooming in.
- As a user, I can clear all furniture from the room, so that I can start the layout from scratch.

**Acceptance Criteria**:
- Placed items list shows each item's name; clicking an item calls `selectItemById()`
- "Reset Camera" button repositions camera to `(W*1.15, H*1.2, L*1.2)` and resets orbit target to room center
- "Clear All" removes all furniture from the scene and clears `itemMap`
- HTML overlay labels float above each furniture piece in the canvas, showing item name (opacity 1 for selected, 0.7 for others; hidden if behind camera)

---

### 5.9 Room Images (Room Images Tab)

**Description**: A gallery of photorealistic room images generated by the AI (either via the chat agent's `generate_room_image` tool or via the "Generate Room Image from Plan" button in the Uploads tab).

**User Stories**:
- As a user, I can see all AI-generated room images for my session, so that I can compare different visualizations.
- As a user, I can generate a photorealistic room image directly from my current room plan, so that I can see how my selected furniture looks together in a real-looking room.
- As a user, I can click an image to view it in a larger lightbox view.

**Acceptance Criteria**:
- Images are displayed in a scrollable grid
- Each new image is prepended to the gallery (most recent first)
- When a new image arrives (via WebSocket `image` event or REST response), the Room Images tab activates automatically
- The "Generate Image from Plan" flow uses plan items' product image URLs as references for the AI generation; the floor-plan upload (if present) is also passed as a reference
- Generation shows a loading indicator; errors are handled gracefully
- Empty state shown when no images have been generated

---

### 5.10 Shopping Cart (Cart Tab)

**Description**: A standard cart view where users can review items, adjust quantities, and proceed to checkout.

**User Stories**:
- As a user, I can review all items I've decided to purchase in my cart, so that I can confirm before buying.
- As a user, I can adjust quantities or remove items from the cart, so that I can fine-tune my order.
- As a user, I can see the total price of my cart, so that I know the final cost.
- As a user, I can proceed to checkout, so that I can complete the purchase.

**Acceptance Criteria**:
- Cart tab shows a badge with total item count
- Cart persists within the session; is NOT cleared on chat reset
- Each item shows: thumbnail (proxied), title, price per unit, quantity controls, subtotal, remove button
- Total price is shown at the bottom
- "Checkout" button triggers `cartService.checkout()` (currently: alert + clear cart — to be replaced with real checkout)
- Items can be moved from Plan to Cart (individually or all at once) via the Plan tab

---

## 6. AI Agent Behavior Specification

### 6.1 Overview

The agent runs a synchronous agentic loop via `GeminiService.process_message()`. On each turn:
1. All pending tool function calls are executed in parallel (within a turn)
2. Tool results are appended to the conversation
3. Gemini is re-invoked with the full updated context
4. The loop terminates when Gemini produces a turn with no function calls (only text)

The agent is stateful within a WebSocket session: full conversation history is maintained server-side as a `list[dict]` and rebuilt into `types.Content` objects on each API call.

### 6.2 Available Tools

| Tool | Function | When to Use |
|---|---|---|
| `search_products` | Searches Google Shopping via SerpAPI | When user asks about furniture, requests recommendations, mentions categories or styles |
| `generate_room_image` | Generates photorealistic image via image generation model | When user asks to see the room, requests a visualization, or asks "what would this look like" |
| `update_floor_plan` | Pushes floor plan JSON to frontend | When user asks about room layout, furniture arrangement, or "where should I put" |
| `create_3d_visualization` | Pushes 3D scene JSON to frontend | When user explicitly requests a 3D view, or when a comprehensive layout is appropriate |

### 6.3 Tool Selection Logic

The agent uses the system prompt guidelines and Gemini's reasoning to select tools. The governing rules are:

**Rule 1 — Search First**: Any user request describing furniture needs (by style, category, budget, room type) triggers `search_products`. Parameters:
- `query`: Natural-language description (required)
- `category`: Matched to one of 13 defined categories (sofa, dining table, chair, bed, bookshelf, dresser, coffee table, side table, desk, tv stand, floor lamp, rug, outdoor furniture, wardrobe, bench)
- `style`: One of 8 styles (modern, mid-century, farmhouse, industrial, contemporary, traditional, transitional, bohemian)
- `max_price`: Extracted from user utterances ("under $500", "budget $1000")

**Rule 2 — Image on Visualization Request**: "Show me what this looks like," "visualize," "what would this room look like" → `generate_room_image`. The `room_description` should incorporate products found in the same or prior turns.

**Rule 3 — Floor Plan on Layout Questions**: "Lay out the room," "where should the sofa go," "create a floor plan," "arrange the furniture" → `update_floor_plan`. The agent generates percentage-based placements using its knowledge of the room size.

**Rule 4 — 3D on Explicit 3D Request**: "3D view," "3D visualization," "see it in 3D" → `create_3d_visualization`. The agent generates furniture items with 3D coordinates.

**Rule 5 — Multi-Tool Turns**: The agent may call multiple tools in a single turn (e.g., `search_products` + `generate_room_image` for a comprehensive first response).

### 6.4 Tool Schemas (Detailed)

#### search_products
```json
{
  "query": "string (required) — natural language search",
  "category": "string (optional) — one of 13 categories",
  "max_price": "number (optional) — USD price ceiling",
  "style": "string (optional) — one of 8 style keywords"
}
```
Returns: Up to 12 products from SerpAPI Google Shopping. Results are pushed to the frontend as `{"type": "products", "data": [...]}` immediately.

#### generate_room_image
```json
{
  "room_description": "string (required) — detailed room description",
  "style": "string (optional) — interior design style"
}
```
Returns: Base64-encoded PNG from `gemini-2.0-flash-preview-image-generation`. The backend prepends a quality prompt: "Create a photorealistic interior design visualization... High quality, professional interior photography style, warm natural lighting, sharp focus, 4K resolution."

#### update_floor_plan
```json
{
  "room_width": "number — room width in feet",
  "room_length": "number — room length in feet",
  "furniture_placements": [
    {
      "name": "string",
      "x_percent": "number 0-100",
      "y_percent": "number 0-100",
      "width_percent": "number 0-100",
      "depth_percent": "number 0-100",
      "rotation": "number — degrees",
      "color": "string — CSS hex"
    }
  ]
}
```
Data is passed directly to the frontend as `{"type": "floor_plan", "data": {...}}`.

#### create_3d_visualization
```json
{
  "room_width": "number — feet",
  "room_length": "number — feet",
  "room_height": "number — feet",
  "furniture_items": [
    {
      "id": "string",
      "name": "string",
      "type": "string — preset type key",
      "x": "number — left-front corner X in feet",
      "z": "number — left-front corner Z in feet",
      "width": "number — feet",
      "depth": "number — feet",
      "height": "number — feet",
      "color": "string — hex",
      "rotation": "number — degrees"
    }
  ]
}
```

### 6.5 Streaming Protocol

The WebSocket protocol between backend and frontend uses the following message types:

| Message Type | Direction | Payload | Effect |
|---|---|---|---|
| `message` | Client → Server | `{content, images}` | Triggers agent processing |
| `reset` | Client → Server | `{}` | Clears server-side history |
| `thinking` | Server → Client | `{text}` | Displays thinking indicator |
| `products` | Server → Client | `{data: Product[]}` | Updates Products tab |
| `image` | Server → Client | `{data: base64}` | Adds to Room Images gallery |
| `floor_plan` | Server → Client | `{data: FloorPlanData}` | Updates Floor Plan view |
| `scene_3d` | Server → Client | `{data: Scene3DData}` | Updates 3D scene |
| `stream` | Server → Client | `{content: string}` | Appends text to chat bubble |
| `done` | Server → Client | `{}` | Ends the streaming turn |
| `error` | Server → Client | `{message: string}` | Displays error in chat |
| `reset_ack` | Server → Client | `{}` | Confirms history cleared |

### 6.6 AI Layout Generator (REST)

The `POST /api/layout/generate-3d-layout` endpoint uses Gemini with structured JSON output (constrained schema) to produce professionally positioned furniture layouts. The prompt includes interior design rules:
- Sofas face focal wall with coffee table between
- Dining chairs around dining table
- Beds against a wall with nightstands flanking
- Desks and bookshelves along walls
- Rugs under seating groups
- Minimum 3 ft traffic lanes between furniture groups
- Minimum 2 ft clearance from walls (0.5 ft minimum)

The AI Floor Plan Generator (`POST /api/layout/generate-floor-plan-from-3d`) uses `gemini-2.5-flash` with vision capabilities. It accepts an uploaded floor plan image and a list of 3D furniture items, then returns percentage-based 2D placements that respect the actual room geometry visible in the image.

### 6.7 Dimension Scraping

When a user adds a product to their plan, `DimensionService.fetchDimensions()` fires a background request to `POST /api/dimensions/fetch` passing the product's purchase URL and title. The backend scrapes the product page using Gemini (vision-capable model) to extract width, depth, and height in inches. These are stored on the `PlanItem` and used to override preset defaults when generating 3D layouts.

---

## 7. Non-Functional Requirements

### 7.1 Performance

| Requirement | Target | Notes |
|---|---|---|
| Time to first chat response (streaming start) | < 4 seconds | Includes SerpAPI lookup; may be longer on cold cache miss |
| Room image generation time | < 20 seconds | Gemini image generation is inherently slow |
| 3D scene load time | < 3 seconds | From data receipt to Three.js render |
| Floor plan canvas redraw | < 100ms | Canvas 2D is synchronous |
| WebSocket connection establishment | < 1 second | On page load |
| WebSocket auto-reconnect | 3 seconds | On disconnect |
| Product search cache hit response | < 1 second | From local JSON cache |
| SerpAPI call (cache miss) | < 5 seconds | Network + search processing |

### 7.2 Browser Support

- **Required**: Chrome 100+, Safari 16+, Edge 100+, Firefox 110+
- **Not supported**: Internet Explorer, mobile browsers (not responsive-designed for MVP)
- **WebGL required**: Three.js 3D visualization requires WebGL 2.0 support
- **WebSocket required**: Core chat functionality requires WebSocket support

### 7.3 Accessibility

- All interactive elements must be keyboard-accessible (tab-navigable)
- Color is not the only indicator of state (e.g., "Add to Plan" button shows text label in addition to visual state)
- Chat messages are structured with appropriate ARIA roles
- Loading states use visible text indicators in addition to animations
- Focus management: After sending a message, focus returns to the textarea
- Minimum 4.5:1 contrast ratio for body text (WCAG AA)

### 7.4 Security

- All API keys are stored server-side only (never in frontend code)
- The image proxy endpoint validates that URLs begin with `http://` or `https://` to prevent SSRF
- User-uploaded images are processed in-memory and never persisted to disk
- WebSocket connections are scoped per-session; conversation history is not shared between sessions
- CORS is restricted to `localhost:4200` and `localhost:4201` in development (must be updated for production)

### 7.5 Reliability

- Backend API errors result in user-visible error messages in chat, not silent failures
- WebSocket disconnections trigger automatic reconnect with exponential backoff (currently fixed 3-second retry)
- SerpAPI failures return empty product list with console warning (not an unhandled exception)
- Image generation failures are caught and surfaced as specific error messages
- Dimension scraping failures return `found: false` gracefully — the plan still works with preset dimensions

### 7.6 Data and Privacy

- No user accounts or persistent data storage in MVP
- Conversation history is in-memory server-side, scoped to the WebSocket connection lifetime
- Product data is sourced from SerpAPI (Google Shopping) — prices and availability are real-time
- Generated images are not stored server-side; they are returned as base64 to the client and stored in browser memory only
- Uploaded images are processed in-memory and never written to the filesystem

---

## 8. Out of Scope and Future Work

### 8.1 Explicitly Out of Scope (MVP)

| Feature | Reason |
|---|---|
| User authentication and accounts | Adds complexity; not needed to validate core value proposition |
| Real checkout / payment processing | Regulatory, partnership complexity |
| Saved/persistent room plans across sessions | Requires backend database |
| Mobile responsive layout | Desktop-first for initial design validation |
| Multi-room planning | Out of scope for single-session MVP |
| Collaborative editing (share plans) | Requires accounts |
| Product review and recommendation from community | Requires content layer |
| Furniture configurator (custom fabric, size) | Requires retailer API integrations |
| Augmented reality (AR) view on mobile | Different technical stack |

### 8.2 Future Work (Roadmap Candidates)

**Phase 2 — User Accounts and Persistence**
- Authentication (OAuth / email login)
- Cloud-saved room plans with named rooms
- History of generated images

**Phase 3 — Commerce Integration**
- Real checkout with partner retailers (Wayfair, CB2, IKEA)
- Price tracking and availability notifications
- Affiliate link integration

**Phase 4 — Advanced Visualization**
- Real-time AR (overlay furniture on live camera feed)
- Custom 3D furniture models (replace procedural geometry with GLTF models per product)
- Ray-traced rendering quality for generated images

**Phase 5 — Intelligence Improvements**
- Style preference learning (agent adapts to user taste across sessions)
- Budget optimization ("show me the best combination under $3000")
- Spatial conflict detection (agent warns when furniture won't fit or blocks walkways)
- Integration with actual room dimensions from uploaded floor plans for auto-scale

**Phase 6 — Marketplace Features**
- Price comparison across multiple retailers
- Used/second-hand furniture search
- Local furniture store integration

---

## 9. Open Questions

### 9.1 Product and Business

| Question | Stakeholder | Priority |
|---|---|---|
| What is the monetization model? (Affiliate commissions vs. SaaS subscription vs. marketplace take rate) | Business | High |
| Which retailer partnerships should be prioritized for real checkout? | Business | High |
| Is the target user desktop or mobile? (Affects Phase 2 design decisions) | Product, UX | Medium |
| How do we handle users who want to search furniture brands not available on Google Shopping? | Product | Medium |
| Should the agent proactively suggest complementary items (e.g., "you have a sofa but no coffee table")? | Product | Low |

### 9.2 Technical

| Question | Owner | Priority |
|---|---|---|
| What is the production hosting strategy for FastAPI (UV/Gunicorn, Docker, cloud run)? | Engineering | High |
| Should conversation history be stored in Redis or a database for production scalability? | Engineering | High |
| Is SerpAPI the long-term product data source, or should we integrate direct retailer APIs? | Engineering, Product | High |
| The `gemini-3-pro-image-preview` model referenced in `imagen_service.py` for the Nano Banana Pro 3D image path does not appear to be a real model ID — what is the correct model? | Engineering | High |
| Should the WebSocket reconnect use exponential backoff to avoid thundering herd? | Engineering | Medium |
| When dimension scraping fails (which it often will for dynamic retailer pages), should we fall back to Gemini-estimated dimensions based on product title? | Engineering | Medium |
| Are there rate limits on SerpAPI that would affect production throughput? What is the caching strategy for production? | Engineering | Medium |
| Should the image proxy cache responses to avoid redundant fetch calls? | Engineering | Low |

### 9.3 UX

| Question | Owner | Priority |
|---|---|---|
| Is the 7-tab canvas panel too complex for first-time users? Should tabs be progressively disclosed? | UX, Product | High |
| Should the Products tab auto-switch back when a new search happens mid-floor-plan editing? (Currently it does) | UX | Medium |
| Should product cards in the chat bubble be scrollable horizontally or vertically? What is the max number to show in a bubble? | UX | Medium |
| Should there be a tutorial or onboarding flow for first-time users? | UX, Product | Medium |
| Is the "Plan" vs "Cart" distinction clear to users? (Plan = design selection; Cart = purchase intent) | UX, Product | Low |

---

*Document prepared by the product-manager agent based on full codebase analysis of `/Users/weizheng/projects/claude/furniture` as of 2026-02-24.*
