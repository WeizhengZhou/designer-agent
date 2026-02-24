# UX Research Report: Interior Designer Agent

**Document type:** MVP UX Research — Heuristic Evaluation & Desk Research
**Product:** Interior Designer Agent — AI-powered furniture shopping & room design
**Date:** February 2026
**Research method:** Codebase analysis, feature audit, heuristic evaluation, competitive desk research
**Status:** MVP stage — no live user interviews conducted yet

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Research Goals and Methodology](#2-research-goals-and-methodology)
3. [Target User Personas](#3-target-user-personas)
4. [User Journey Maps](#4-user-journey-maps)
5. [Competitive Analysis](#5-competitive-analysis)
6. [Key UX Insights and Opportunities](#6-key-ux-insights-and-opportunities)
7. [Pain Points and Risk Areas](#7-pain-points-and-risk-areas)

---

## 1. Executive Summary

The Interior Designer Agent is an AI-powered web application that enables consumers to discover furniture, plan room layouts, and visualize their space through natural language conversation. The MVP combines a conversational AI interface (Gemini 2.0 Flash) with five distinct visualization modalities: product search, room plan management, 2D floor plan canvas, real-time 3D room visualization (Three.js), and AI-generated photorealistic room images.

This research report characterizes the current MVP experience through heuristic evaluation of the codebase and UI structure, constructs representative user personas for the target market, maps key user journeys, positions the product against major competitors, and surfaces the most critical UX opportunities and risks for the next development phase.

**Top findings at a glance:**

- The conversational-first interaction model is differentiating and matches how consumers naturally think about home decoration.
- The seven-tab right-panel structure creates cognitive overload; users will struggle to understand which tool to use when.
- The 3D visualization is technically impressive but lacks guidance, discoverability, and save/export functionality.
- The "Plan to Cart" workflow (AI chat → add to plan → visualize → purchase) is the strongest value chain, but the checkout experience is a stub (`alert()`) that breaks trust.
- Product data quality (no style field populated, fallback images, missing dimensions) will undermine AI recommendation credibility at scale.
- No onboarding, no user account, and no persistence between sessions are the three most significant adoption barriers at the MVP stage.

---

## 2. Research Goals and Methodology

### 2.1 Research Goals

| Goal | Rationale |
|---|---|
| Understand who the target users are and what they need | Ground the product in real user segments before scaling |
| Map the end-to-end experience across key user flows | Identify friction points in the primary value chain |
| Evaluate the AI agent's interaction quality | Assess whether conversational UI conventions are being followed |
| Benchmark against competitor experiences | Identify table-stakes features and genuine differentiators |
| Surface the highest-priority UX improvements | Prioritize next sprint with evidence-backed recommendations |

### 2.2 Methodology

This research uses a triangulated desk-research approach appropriate to the MVP stage where live user data is not yet available.

**Heuristic evaluation (primary):** The codebase was systematically analyzed against Nielsen's 10 Usability Heuristics and conversational AI UX best practices. Key files reviewed:

- UI layout: `frontend/src/app/app.component.html`, `canvas-panel.component.html`, `chat-panel.component.html`
- AI interaction layer: `backend/services/gemini_service.py`, `backend/routers/chat.py`
- Product data model: `backend/services/product_service.py`, `backend/models/schemas.py`
- Visualization features: `visualization-3d.component.ts`, `floor-plan.component.ts`
- User flows: `plan-panel.component.ts`, `cart-panel.component.ts`, `api.service.ts`

**Feature audit:** Every user-facing feature and navigation element was catalogued and evaluated for clarity, completeness, and alignment with user goals.

**Competitive desk research:** The four most comparable products (Wayfair, IKEA Place, Houzz, Pinterest) were analyzed against the Interior Designer Agent's feature set.

**Assumptions and limitations:** Without live user sessions, we cannot validate whether specific interaction patterns cause confusion in practice. All severity ratings are provisional and should be validated in moderated usability testing with 5–8 participants per persona segment before the next major release.

---

## 3. Target User Personas

### Persona 1: "The New Homeowner" — Maya, 31

**Background:** Recently purchased a condo. Has a clear budget, a sense of style derived from Pinterest boards, but no experience working with interior designers. Spends evenings and weekends shopping online. Medium tech comfort — uses apps daily but does not consider herself technical.

**Goals:**
- Furnish three rooms (living, bedroom, dining) within a $8,000 total budget
- See how pieces work together before buying to avoid costly mistakes
- Find furniture that matches a specific aesthetic ("Scandinavian minimal")
- Get everything delivered without multiple vendor relationships

**Pain points (existing market):**
- Product images on retail sites do not show scale in her actual space
- She cannot hold multiple products in her head at once while cross-shopping
- Shipping timelines vary by vendor, making coordinated room purchases hard
- Returns are expensive and inconvenient for large furniture

**How she would use Interior Designer Agent:**
- Types style and budget requirements in the chat interface
- Reviews AI-suggested products, adds favorites to the Plan tab
- Uses "Visualize in 3D" to check whether the sofa, rug, and coffee table look right together
- Generates a photorealistic room image to share with her partner for approval
- Moves approved items to cart

**Tech comfort:** Medium. Comfortable with chat interfaces (she uses AI chatbots regularly). Will not read documentation. Expects the product to guide her.

**Success metric for her:** "I feel confident I'm buying the right things before spending money."

---

### Persona 2: "The Design-Curious Renter" — Jordan, 26

**Background:** Renting a one-bedroom apartment, moves every 1–2 years. Budget-conscious ($500–$2,000 per purchase). Shops on IKEA and Amazon. Highly visual — consumes interior design content on Instagram and TikTok. High app literacy.

**Goals:**
- Refresh one room without a large spend
- Discover furniture styles he hasn't considered before
- Quickly see if a piece will fit his apartment dimensions
- Find items that are versatile across future apartments

**Pain points (existing market):**
- IKEA's catalog is overwhelming without a starting point
- AR apps require him to measure his room first — a friction he avoids
- He finds himself in a browser tab spiral with 15 open windows

**How he would use Interior Designer Agent:**
- Starts with a casual chat message: "Show me mid-century modern living room ideas under $500"
- Browses suggested products, wants to know dimensions immediately
- Uploads a photo of his living room to get AI-powered style recommendations
- Uses the 2D floor plan to validate a sofa will fit against his back wall
- May not complete a purchase in session — returns later

**Tech comfort:** High. Comfortable with AI tools, expects instant responses and visual feedback. Will explore all tabs out of curiosity. Low patience for errors or slow loading.

**Success metric for him:** "I discovered something I wouldn't have found searching on my own."

---

### Persona 3: "The Family Home Upgrader" — Sandra, 48

**Background:** Parent of two teenagers, owns a suburban home. Looking to remodel the living and dining rooms. Has an existing interior designer she consults occasionally but wants to do more pre-research herself. Less tech-comfortable — prefers explicit instructions and simple interfaces.

**Goals:**
- Plan and budget a larger furniture project ($5,000–$15,000)
- Present options to her family before deciding
- Understand whether furniture fits the dimensions of her actual room
- Shop from reputable sellers with easy return policies

**Pain points (existing market):**
- Retailer websites don't connect product search to layout planning
- She has tried AR apps but found them confusing to set up
- She wants to save and revisit her research over multiple sessions
- Price ranges on shopping sites vary wildly and she has difficulty comparing

**How she would use Interior Designer Agent:**
- Uploads her hand-drawn floor plan sketch or a photo of the room
- Asks the AI to help plan a full living room setup
- Uses the AI-generated 2D floor plan to check furniture arrangement
- Generates a room image to share with her family and interior designer
- Exports or screenshots the plan to continue offline

**Tech comfort:** Low-medium. Needs clear labels, progressive disclosure of advanced features, visible error recovery. Will abandon the session if she feels lost.

**Success metric for her:** "I have a shareable, concrete plan I can bring to a real purchase conversation."

---

## 4. User Journey Maps

### Journey 1: First Visit — Empty State to First Interaction

**Entry:** User opens the app for the first time.

| Stage | User Action | System Response | UX Observation |
|---|---|---|---|
| Arrive | Lands on split-panel layout | Chat panel on left, Products tab on right | Layout is unambiguous but chat-first metaphor may confuse users who expected a search box |
| Orient | Reads empty state copy and suggestion chips | Three conversation starter chips are shown | Chips are well-chosen and actionable; copy is clear |
| First message | Clicks a suggestion chip or types a message | "Thinking" animation appears; "Using tool: search_products" is shown | The tool-use disclosure ("Using tool: search_products...") is transparent but technically phrased; non-technical users may be confused |
| See results | Products appear in the Products tab; AI text streams in | Tab auto-switches to Products; mini product cards appear in the chat bubble | Auto-tab switching is helpful but can feel disorienting if the user was looking elsewhere |
| Explore | Scrolls product cards | Product grid renders with images, price, seller, rating | Image loading relies on a backend proxy; perceived performance depends on proxy speed |

**Key friction:** There is no onboarding tour, persistent guidance, or contextual tooltips. A first-time user must discover the seven tabs, the Plan feature, and the visualization tools entirely through self-exploration. The empty state only covers the chat panel, not the right panel.

**Opportunity:** Add a lightweight, dismissible onboarding overlay that introduces the three main concepts: "Chat to search → Add to Plan → Visualize your space."

---

### Journey 2: Searching with Text and Refining

**Entry:** User types a natural-language query.

| Stage | User Action | System Response | UX Observation |
|---|---|---|---|
| Type query | "Show me a modern grey sofa under $1200" | Gemini calls `search_products` with query, category, max_price, style | The agentic loop correctly extracts structured search parameters from free text |
| View results | Products tab auto-populates | Up to 12 results shown as product cards | No indication of how many total results SerpAPI returned vs. what was filtered |
| Refine | Types "Actually make it under $800" | New search is performed; new products appear | Conversation history is maintained per WebSocket session; refinement works correctly |
| Select product | Clicks a product card | Product detail slide-in panel appears | Product detail panel is a nice affordance; the "View on [Seller]" external link is the only path to purchase at this point |
| Dimension gap | Wants to know if sofa will fit | Dimensions field is often `null` in SerpAPI results | A background `DimensionService.fetchDimensions()` call is made when "Add to Plan" is clicked, but dimensions may arrive too late to influence the decision |

**Key friction:** The product style field is consistently empty (SerpAPI does not return style metadata), reducing the quality of AI recommendations when style filtering is requested. Users who ask "show me mid-century sofas" may see stylistically inconsistent results.

**Opportunity:** Prompt users to confirm the style of returned products; use product images with Gemini Vision to infer style at display time.

---

### Journey 3: Uploading a Floor Plan or Reference Image

**Entry:** User has a floor plan image and wants to use it.

| Stage | User Action | System Response | UX Observation |
|---|---|---|---|
| Find upload | Looks for where to upload | Two upload paths exist: (A) the paperclip icon in chat input, (B) the Uploads tab | Path A sends the image as context to the AI; Path B stores it as a reusable asset — these serve very different purposes but look similar |
| Upload via chat | Drags image onto chat panel | Image is added to pending images strip | Drag-and-drop affordance is present and functional |
| Upload as asset | Goes to Uploads tab, clicks "Upload Images" | File is stored as UploadedAsset; type is auto-guessed from filename | Auto-detection of "floor" or "plan" in the filename is a helpful heuristic |
| Set asset type | Selects type from dropdown | Three options: Floor Plan, Reference, Other | Dropdown with three options is appropriately simple |
| Use as reference | Asset is tagged as Floor Plan | A callout banner appears: "is set as your floor plan and will be used as reference during image generation" | The callout is clear but appears only in the Uploads tab; users in the Room Images tab must switch to Uploads to confirm floor plan is set |
| Generate image from plan | Clicks "Generate Image from Plan" | Gemini generates a photorealistic room image incorporating the floor plan reference and plan furniture | This is the most powerful UX moment in the product — effective when it works |

**Key friction:** Two separate image upload mechanisms with materially different behaviors are not visually or conceptually distinguished. Users who want to use their floor plan as AI context (Path A) vs. as a persistent reference (Path B) may not understand the difference.

**Opportunity:** Consolidate or clearly differentiate the two upload flows with distinct labels: "Send to AI" vs. "Save as Reference."

---

### Journey 4: Building a Plan and Viewing in 3D

**Entry:** User has found products and wants to see how they look together.

| Stage | User Action | System Response | UX Observation |
|---|---|---|---|
| Add to plan | Clicks "Plan" button on a product card | Item added to Plan service; Plan tab badge increments | Plan button hover behavior and checkmark confirmation are good feedback |
| View plan | Switches to Plan tab | List of items with quantity controls, total price, and two action buttons | Total price is a useful planning signal |
| Visualize in 3D | Clicks "Visualize in 3D" | Plan items are converted to furniture specs using CATEGORY_MAP; Three.js scene is loaded | CATEGORY_MAP maps product categories to preset furniture types with hardcoded dimensions in feet; AI dimension data (from DimensionService) is used if available |
| Interact with 3D | Rotates scene, clicks furniture | Orbit + transform controls; selected item shows properties panel | Keyboard shortcuts (G/R/S for translate/rotate/scale, Delete to remove) are discoverable only by reading code or accident |
| Adjust layout | Drags furniture pieces | TransformControls snap to XZ plane; items snap to floor | SnapToFloor() is called on every objectChange — technically correct |
| Add from preset | Switches to furniture catalog panel | 20 preset furniture types in 5 categories | Catalog panel is well-organized but requires navigating away from the main canvas |
| Generate AI layout | Clicks "Generate from Plan (AI)" | `generate3dLayout` API call generates a semantically arranged 3D scene | This is a significant power feature — AI determines furniture placement based on room type and spatial reasoning |

**Key friction:** The 3D scene defaults to a fixed 20x20 ft room. Users are not prompted for their actual room dimensions before visualization. Furniture placement from the Plan uses a linear packing algorithm (items placed left-to-right across the room) rather than a realistic room arrangement, making the initial 3D view feel artificial.

**Opportunity:** Ask users for room dimensions before 3D visualization, or use the room dimensions from an uploaded floor plan. Replace the linear packing with the AI layout generation (`generate3dLayout`) as the default.

---

### Journey 5: Adding to Cart and "Checkout"

**Entry:** User is satisfied with their plan and wants to purchase.

| Stage | User Action | System Response | UX Observation |
|---|---|---|---|
| Add items to cart | Clicks "Add to Cart" per item or "Add All to Cart" | Items transferred from Plan to Cart service | Quantity is respected in the transfer |
| View cart | Switches to Cart tab | Cart panel shows items, quantities, total price | Cart UI is functional and clear |
| Checkout | Clicks "Checkout" | `alert('Checkout complete! Your items have been purchased.')` | This is a critical trust-breaking moment. A browser alert that claims items have been purchased — without any real transaction — will confuse or alarm users |

**Key friction:** The checkout stub is the single highest-severity UX issue in the product. It misrepresents the state of the product to users. Even in MVP context, this should be replaced with a clear "coming soon" message or a redirect to each product's seller URL.

**Opportunity:** Replace the checkout alert with: (A) a summary page linking each item to its seller URL, or (B) a clear "This is a demo — click to view on [seller]" CTA per item.

---

## 5. Competitive Analysis

### 5.1 Competitors Evaluated

| Competitor | Category | Primary UX Approach |
|---|---|---|
| Wayfair | E-commerce furniture retailer | Browse + search + filter; "View in Room" AR feature |
| IKEA Place | AR furniture visualization app | Mobile-first; place individual items in real space via camera |
| Houzz | Home design platform + marketplace | Inspiration imagery + pro directory + product catalog |
| Pinterest | Visual discovery platform | Image-centric discovery; boards for saving; shopping links |

### 5.2 Feature Comparison Matrix

| Feature | Interior Designer Agent | Wayfair | IKEA Place | Houzz | Pinterest |
|---|---|---|---|---|---|
| Natural language search | Yes (AI) | No (keyword) | No | No | No |
| Multi-product conversation | Yes | No | No | No | No |
| Image upload for context | Yes | No | Yes (AR camera) | Yes (photo upload) | Yes |
| 2D floor plan | Yes (AI + manual) | No | No | Yes (Houzz Floor Planner) | No |
| 3D room visualization | Yes (Three.js) | Limited | Yes (AR) | Yes (Houzz Floor Planner 3D) | No |
| AI room image generation | Yes | No | No | No | No |
| Shopping cart | Yes (stub) | Yes (full) | No | Yes (via sellers) | Yes (via sellers) |
| Product from real sellers | Yes (SerpAPI) | Yes (own inventory) | Yes (IKEA only) | Yes (Houzz marketplace) | Yes (via links) |
| Save/share plan | No | Yes (wishlist) | Yes (save list) | Yes (ideabooks) | Yes (boards) |
| Mobile experience | No (web-only) | Yes | Yes (primary) | Yes | Yes |
| User accounts | No | Yes | Yes | Yes | Yes |
| Style filtering | Partial (AI can filter) | Yes (facets) | No | Yes | No |
| Price filtering | Yes (AI can filter) | Yes (facets) | No | Yes (facets) | No |

### 5.3 Competitive Differentiation

**Where Interior Designer Agent leads:**

1. **Conversational product discovery:** No competitor enables free-text, multi-turn room planning conversations. This is a genuine differentiator. Users can describe their room in natural language and get tailored recommendations without learning a search taxonomy.

2. **AI floor plan generation from conversation:** The ability to ask "arrange my 12x15 living room" and receive a 2D floor plan is unique. Houzz Floor Planner requires users to manually draw their room.

3. **Multi-modal input (image + text):** Users can upload reference images alongside text, giving the AI richer context than competitors offer.

4. **AI-generated room imagery from a shopping list:** The "Generate Image from Plan" feature, which renders photorealistic images from the actual furniture items in a user's plan, has no direct competitor equivalent.

**Where competitors lead:**

1. **Product catalog depth:** Wayfair carries millions of SKUs; the Interior Designer Agent is constrained by SerpAPI search result quality and a 12-item default limit per query.

2. **Session persistence:** All four competitors allow users to create accounts, save projects, and return to them. The Interior Designer Agent has no persistence — the session resets on page reload.

3. **Mobile experience:** IKEA Place and Pinterest are mobile-first. The Interior Designer Agent is a desktop web application with no responsive design.

4. **Trust and purchase completion:** Wayfair and Houzz have established checkout flows, return policies, and customer service. The Interior Designer Agent's checkout is a stub.

5. **Curated design inspiration:** Houzz and Pinterest offer curated high-quality inspiration content that seeds user intent before search. The Interior Designer Agent assumes users arrive with a clear intention.

---

## 6. Key UX Insights and Opportunities

### Insight 1: The conversational interaction model is the product's defining strength — protect it

Users who interact with the AI get personalized, contextual product suggestions and visual outputs in a single flow. This is qualitatively superior to filter-based browsing. The risk is that surrounding UX friction (unclear tabs, broken checkout, no persistence) undermines confidence in the core AI experience before users reach the "wow" moment.

**Opportunity:** Ruthlessly simplify everything around the chat interface to reduce friction before the first AI interaction.

### Insight 2: The seven-tab panel creates a hidden information architecture problem

The right panel has seven tabs: Products, Plan, Uploads, Floor Plan, 3D View, Room Images, Cart. Most tabs are populated only by AI actions (Floor Plan, 3D View, Room Images) or user actions (Plan, Cart, Uploads). A first-time user sees an empty Products tab and has no mental model of what the other tabs contain.

The tab bar auto-switches in response to AI events (when products arrive → Products tab; when floor plan arrives → Floor Plan tab), which is helpful but also removes user control and agency.

**Opportunity:** Collapse the seven tabs into three progressive stages: "Discover" (Products + Plan), "Visualize" (Floor Plan + 3D View + Room Images), "Purchase" (Cart). Use progressive disclosure to reveal sub-features within each stage.

### Insight 3: The Plan-to-3D pipeline is the highest-value user journey and needs the most polish

The workflow of: search in chat → add to plan → visualize in 3D → generate AI layout → generate room image represents the fullest expression of the product's value. However, this journey requires users to discover five separate features spread across four tabs, with no explicit guidance.

**Opportunity:** Add a persistent "Next step" affordance that guides users through this pipeline explicitly. After adding three or more items to the plan, surface: "Ready to visualize? See how your room could look →."

### Insight 4: Product image quality is a bottleneck for conversion intent

Product images are sourced from Google Shopping via SerpAPI. Many will fail to load (CORS errors mitigated by the backend proxy, but still present), display as placeholder images, or show product images that don't accurately represent the item's style. This undermines user confidence in AI recommendations.

**Opportunity:** Aggressively improve image reliability through pre-validation at search time. Where images fail, use the product category and title to generate a stylistically consistent placeholder using the existing image generation capability.

### Insight 5: Dimension data is critical for the core use case but is often absent

Users fundamentally need to know "will this fit?" The product has a `DimensionService` that fetches dimensions from the backend, but it is called only when a product is added to the Plan — after the user has already made a mental commitment to the item. Additionally, `Product.dimensions` is `null` in most SerpAPI results.

**Opportunity:** Surface dimension estimates earlier in the product card (even estimated dimensions based on category) and prominently in the product detail panel. Use the LLM to extract or estimate dimensions from product titles and descriptions when SerpAPI does not provide them.

### Insight 6: The checkout experience breaks trust at the most critical moment

The `CartService.checkout()` method fires a browser `alert()` claiming the purchase is complete. This is a placeholder that no user should encounter in a product demo context. It will destroy trust.

**Opportunity (immediate):** Replace with a clear state that links each cart item to its purchase URL on the seller's website (the `Product.url` field is populated from SerpAPI).

---

## 7. Pain Points and Risk Areas

### Severity Scale

- **Critical (P0):** Will prevent users from completing core tasks or destroy trust
- **High (P1):** Will cause significant user confusion or drop-off
- **Medium (P2):** Degrades the experience but users can work around it
- **Low (P3):** Minor friction; can be deferred

---

### 7.1 Critical Pain Points (P0)

**P0-1: Checkout stub misrepresents purchase completion**
File: `/Users/weizheng/projects/claude/furniture/frontend/src/app/services/cart.service.ts`, line 42–45
The `checkout()` method calls `alert('Checkout complete! Your items have been purchased.')` and clears the cart. This tells users they have purchased items when no transaction has occurred. This is a trust-critical defect.
**Recommendation:** Replace with a checkout summary screen linking each item to `product.url`. Add a clear "external links" disclaimer.

**P0-2: No session persistence**
All application state (messages, plan, cart, 3D scene) lives in RxJS BehaviorSubjects in memory. A page reload or tab close destroys all user work. For a product where users are building room plans that may take 30+ minutes to develop, this is a severe limitation.
**Recommendation:** Implement `localStorage`-based persistence for the Plan and Cart services as a minimum viable persistence layer before user testing.

---

### 7.2 High Priority Pain Points (P1)

**P1-1: No onboarding for first-time users**
The empty state only covers the chat panel. The seven-tab right panel has no introductory guidance. Users must discover all features through exploration.
**Recommendation:** Add a focused onboarding sequence (3 steps maximum): (1) "Chat to find furniture," (2) "Save items to your Plan," (3) "Visualize your room."

**P1-2: Dual upload paths are confusing**
Two image upload mechanisms exist — the chat panel paperclip and the Uploads tab — with materially different behaviors. The chat panel upload sends images to the LLM as context for that message. The Uploads tab stores a persistent asset used for room image generation. These are not distinguished in the UI.
Files: `chat-panel.component.html` (lines 128–134), `canvas-panel.component.html` (lines 43–50)
**Recommendation:** Rename the chat upload affordance to "Send image to AI" and the Uploads tab to "My Room Assets" with clear description of how each is used.

**P1-3: 3D visualization keyboard shortcuts have no visible affordance**
The 3D view supports keyboard shortcuts (G = translate, R = rotate, S = scale, Delete = remove, Shift+D = duplicate) that are standard in 3D software but completely undiscovered by furniture shoppers.
File: `visualization-3d.component.ts`, lines 249–263
**Recommendation:** Add a visible controls legend panel or a "?" help button that reveals the keyboard shortcuts.

**P1-4: Initial 3D layout is unrealistic (linear packing algorithm)**
When "Visualize in 3D" is clicked from the Plan panel, furniture is placed left-to-right in rows — not in any realistic room arrangement. Users will immediately see that the sofa and bed are next to each other in a row, creating an obviously unrealistic scene.
File: `plan-panel.component.ts`, lines 102–152
**Recommendation:** Route all Plan-to-3D generation through the `generate3dLayout` AI endpoint by default. The AI layout generation already exists in `ApiService.generate3dLayout()` and produces semantically valid room arrangements.

**P1-5: Product style field is always empty**
`ProductService._map_product()` sets `style: ""` for all products. When the AI filters by style (e.g., "modern sofa"), it can pass the style as a search term to SerpAPI, but returned products carry no style metadata for display or downstream filtering.
File: `backend/services/product_service.py`, line 85
**Recommendation:** Use the LLM or a keyword-based heuristic to infer style from product titles and descriptions at search time.

---

### 7.3 Medium Priority Pain Points (P2)

**P2-1: Tool-use disclosure uses technical language**
The thinking indicator shows "Using tool: search_products..." — this is internal implementation language. Non-technical users may find this confusing or off-putting.
File: `backend/services/gemini_service.py`, line 224
**Recommendation:** Map tool names to human-readable labels: `search_products` → "Searching furniture catalog", `generate_room_image` → "Creating room visualization", `create_3d_visualization` → "Building your 3D room."

**P2-2: Product card shows "See price" for items with price 0**
When SerpAPI returns products without a parseable price, the product card shows "See price" — which is honest but creates a confusing mixed grid where some items have clear prices and others do not.
File: `product-card.component.html`, line 59
**Recommendation:** Where price is unavailable, attempt to fetch it or display the price range from the SerpAPI `price` string field directly.

**P2-3: Floor Plan and Room Images tab auto-switch removes user control**
When the AI generates a floor plan or a room image, the right panel automatically switches to that tab. This is helpful but removes the user's current context without warning.
File: `furniture-store.service.ts`, lines 60–72
**Recommendation:** Add a toast notification ("Floor plan ready — view it") that lets the user choose when to switch tabs.

**P2-4: No search result count or load-more affordance**
The Products tab shows up to 12 results with no indication of total matches, no pagination, and no way to see more results without re-asking the AI.
**Recommendation:** Add result count ("Showing 12 results") and a "See more" button that appends additional results.

**P2-5: 3D room dimensions are fixed at 20x20 ft by default**
The `Visualization3dComponent` defaults to `roomDims = { width: 15, length: 20, height: 9 }` and the Plan panel's `visualize3D()` uses `ROOM_W = 20, ROOM_L = 20, ROOM_H = 9`.
Files: `visualization-3d.component.ts` line 93, `plan-panel.component.ts` lines 103–104
**Recommendation:** Prompt for room dimensions before generating the 3D scene, or extract dimensions from the AI conversation context or uploaded floor plan.

**P2-6: No sharing or export for plans or visualizations**
Users — particularly Persona 3 (Sandra) — want to share their plan with family members or an interior designer. There is no way to export, copy a link, or share any of the visualizations.
**Recommendation:** Add a simple "Copy image" or "Download" affordance on the 3D view and room image panels as a first step.

---

### 7.4 Low Priority Pain Points (P3)

**P3-1: Plan name editing is available but not prominently featured**
The plan has an `editingName` toggle in the Plan panel component but there is only one plan — naming it provides limited utility without multi-plan support.

**P3-2: Cart panel "Checkout" badge uses a red background (hardcoded style)**
File: `canvas-panel.component.html`, line 11. The badge uses inline `background: #ef4444` (red) rather than a CSS class, making it inconsistent with the design system and harder to maintain.

**P3-3: Product card title truncation**
Long product titles (common in SerpAPI results) overflow their container. Truncation should be applied consistently.

**P3-4: No error state for AI image generation failure**
When the image generation API call fails (network error or model error), the UI silently fails without surfacing an error to the user.
File: `canvas-panel.component.ts`, lines 138–141
**Recommendation:** Add a user-facing error message when image generation fails: "Image generation failed. Please try again."

---

## Appendix A: Feature Inventory

| Feature | Location | Status |
|---|---|---|
| AI chat with tool loop | `backend/services/gemini_service.py` | Functional |
| Google Shopping product search (SerpAPI) | `backend/services/product_service.py` | Functional; caching implemented |
| Product card with plan add | `product-card.component.html` | Functional |
| Product detail slide-in panel | `product-detail-panel.component.ts` | Functional |
| Plan management (add/remove/qty) | `plan.service.ts`, `plan-panel.component.ts` | Functional |
| Cart management | `cart.service.ts`, `cart-panel.component.ts` | Functional (checkout is stub) |
| 2D floor plan canvas | `floor-plan.component.ts` | Functional |
| Three.js 3D visualization | `visualization-3d.component.ts` | Functional |
| AI-generated 3D layout | `backend/routers/layout.py` | Functional |
| AI room image generation | `backend/services/imagen_service.py` | Functional |
| Plan → Room image generation | `canvas-panel.component.ts` | Functional |
| Image upload (chat context) | `chat-panel.component.ts` | Functional |
| Image upload (asset library) | `canvas-panel.component.ts` | Functional |
| Floor plan from 3D scene | `floor-plan.component.ts` | Functional |
| Dimension auto-fetch | `dimension.service.ts` | Functional |
| Session persistence | Not implemented | Gap |
| User accounts | Not implemented | Gap |
| Mobile / responsive layout | Not implemented | Gap |
| Sharing / export | Not implemented | Gap |
| Real checkout / purchase | Not implemented (stub) | Critical gap |

---

## Appendix B: Recommended Next Research Studies

Now that the MVP is built, the following studies are recommended to validate these findings with real users before the next development phase:

1. **Moderated usability test (5–8 participants):** Observe first-time users completing the core journey (search → plan → 3D view) with think-aloud protocol. Target 2 participants per persona type. Priority tasks: (1) find and add 3 furniture items, (2) view them in 3D, (3) "purchase."

2. **5-second test:** Show the initial app layout to 10 participants for 5 seconds. Ask: "What is this product for? What would you do first?" Validates whether the chat-first layout is immediately comprehensible.

3. **Diary study (2 weeks, 5 participants):** Recruit users actively furnishing a room or apartment. Give access to the product and ask them to record their weekly usage. Focus on: whether they return after first session, what they use it for, and what they do when they can't accomplish a goal.

4. **Competitive switching study:** Recruit 5 Wayfair or Houzz active users. Ask them to complete the same furniture planning task on both platforms. Identify where Interior Designer Agent wins and where it loses.
