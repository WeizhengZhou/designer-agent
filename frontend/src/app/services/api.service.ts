import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FurnitureStoreService } from './furniture-store.service';
import { ChatMessage, Product, Scene3DData } from '../models';

export interface LayoutFurnitureInput {
  name: string;
  preset_type: string;
  quantity: number;
  width: number;
  depth: number;
  height: number;
  color: string;
}

const WS_URL  = 'ws://localhost:8000/api/chat/ws';
const API_URL = 'http://localhost:8000/api';

@Injectable({ providedIn: 'root' })
export class ApiService implements OnDestroy {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // Buffers that accumulate before the stream message is created
  private _pendingProducts: Product[] = [];
  private _pendingImages: string[] = [];
  private _streamingMsgId: string | null = null;

  constructor(
    private http: HttpClient,
    private store: FurnitureStoreService,
  ) {
    this.connect();
  }

  // ── WebSocket ─────────────────────────────────────────────────────────────

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    this.ws = new WebSocket(WS_URL);

    this.ws.onopen  = () => console.log('[WS] connected');
    this.ws.onclose = () => {
      console.log('[WS] disconnected — retrying in 3 s');
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };
    this.ws.onerror = e => console.error('[WS] error', e);
    this.ws.onmessage = e => this.handleServerMessage(JSON.parse(e.data));
  }

  sendMessage(content: string, images: string[] = []) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
      setTimeout(() => this.sendMessage(content, images), 500);
      return;
    }
    this.ws.send(JSON.stringify({ type: 'message', content, images }));
  }

  resetConversation() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'reset' }));
    }
    this.store.clearAll();
    this._pendingProducts = [];
    this._pendingImages   = [];
    this._streamingMsgId  = null;
  }

  // ── Message routing ───────────────────────────────────────────────────────

  private handleServerMessage(msg: any) {
    switch (msg.type) {

      case 'thinking': {
        this.store.setThinking(msg.text);
        break;
      }

      case 'products': {
        const products: Product[] = msg.data;
        // Update the right-side canvas immediately
        this.store.setProducts(products);
        // Buffer so we can attach them to the chat bubble once streaming starts
        this._pendingProducts.push(...products);
        break;
      }

      case 'image': {
        this.store.addRoomImage(msg.data);
        this._pendingImages.push(msg.data);
        break;
      }

      case 'stream': {
        if (!this._streamingMsgId) {
          const id = crypto.randomUUID();
          this._streamingMsgId = id;
          // Create the assistant message, flushing buffered products/images
          this.store.addMessage({
            id,
            role: 'assistant',
            content: msg.content,
            timestamp: new Date(),
            isStreaming: true,
            products:        this._pendingProducts.length ? [...this._pendingProducts] : undefined,
            generatedImages: this._pendingImages.length   ? [...this._pendingImages]   : undefined,
          });
          this._pendingProducts = [];
          this._pendingImages   = [];
        } else {
          this.store.appendToLastMessage(msg.content);
        }
        break;
      }

      case 'floor_plan': {
        this.store.setFloorPlan(msg.data);
        break;
      }

      case 'scene_3d': {
        this.store.setScene3d(msg.data);
        break;
      }

      case 'done': {
        // If the model returned tool results but NO text, we still need a message
        if (!this._streamingMsgId && (this._pendingProducts.length || this._pendingImages.length)) {
          this.store.addMessage({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isStreaming: false,
            products:        this._pendingProducts.length ? [...this._pendingProducts] : undefined,
            generatedImages: this._pendingImages.length   ? [...this._pendingImages]   : undefined,
          });
        }
        this._pendingProducts = [];
        this._pendingImages   = [];
        this._streamingMsgId  = null;
        this.store.setThinking(null);
        this.store.updateLastMessage({ isStreaming: false });
        break;
      }

      case 'error': {
        this._pendingProducts = [];
        this._pendingImages   = [];
        this._streamingMsgId  = null;
        this.store.setThinking(null);
        this.store.addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `⚠️ Error: ${msg.message}`,
          timestamp: new Date(),
        });
        break;
      }

      case 'reset_ack':
        break;
    }
  }

  // ── REST helpers ──────────────────────────────────────────────────────────

  getProducts(limit = 24) {
    return this.http.get<Product[]>(`${API_URL}/products/?limit=${limit}`);
  }

  searchProducts(query: string, options: any = {}) {
    return this.http.post<Product[]>(`${API_URL}/products/search`, { query, ...options });
  }

  generateImageFromPlan(furniture_items: { title: string, image_url: string }[]) {
    return this.http.post<{ image: string, mime_type: string }>(`${API_URL}/images/generate-from-plan`, { furniture_items });
  }

  generate3dLayout(
    furniture_items: LayoutFurnitureInput[],
    room_width = 15,
    room_length = 20,
    room_height = 9,
  ) {
    return this.http.post<Scene3DData>(`${API_URL}/layout/generate-3d-layout`, {
      furniture_items, room_width, room_length, room_height,
    });
  }


  ngOnDestroy() {
    this.ws?.close();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
  }
}
