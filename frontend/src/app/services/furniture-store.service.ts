import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Product, FloorPlanData, Scene3DData, CanvasTab, ChatMessage, UploadedAsset } from '../models';

@Injectable({ providedIn: 'root' })
export class FurnitureStoreService {
  private _messages    = new BehaviorSubject<ChatMessage[]>([]);
  private _products    = new BehaviorSubject<Product[]>([]);
  private _selectedProduct = new BehaviorSubject<Product | null>(null);
  private _activeTab   = new BehaviorSubject<CanvasTab>('products');
  private _floorPlan   = new BehaviorSubject<FloorPlanData | null>(null);
  private _scene3d     = new BehaviorSubject<Scene3DData | null>(null);
  private _roomImages  = new BehaviorSubject<string[]>([]);
  private _isThinking  = new BehaviorSubject<string | null>(null);
  private _uploadedAssets = new BehaviorSubject<UploadedAsset[]>([]);

  messages$        = this._messages.asObservable();
  products$        = this._products.asObservable();
  selectedProduct$ = this._selectedProduct.asObservable();
  activeTab$       = this._activeTab.asObservable();
  floorPlan$       = this._floorPlan.asObservable();
  scene3d$         = this._scene3d.asObservable();
  roomImages$      = this._roomImages.asObservable();
  isThinking$      = this._isThinking.asObservable();
  uploadedAssets$  = this._uploadedAssets.asObservable();

  addMessage(msg: ChatMessage) {
    this._messages.next([...this._messages.value, msg]);
  }

  updateLastMessage(patch: Partial<ChatMessage>) {
    const msgs = [...this._messages.value];
    if (msgs.length === 0) return;
    msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], ...patch };
    this._messages.next(msgs);
  }

  appendToLastMessage(chunk: string) {
    const msgs = [...this._messages.value];
    if (msgs.length === 0) return;
    const last = msgs[msgs.length - 1];
    msgs[msgs.length - 1] = { ...last, content: last.content + chunk };
    this._messages.next(msgs);
  }

  setProducts(products: Product[]) {
    this._products.next(products);
    this._activeTab.next('products');
  }

  selectProduct(p: Product | null) {
    this._selectedProduct.next(p);
  }

  setActiveTab(tab: CanvasTab) {
    this._activeTab.next(tab);
  }

  setFloorPlan(data: FloorPlanData) {
    this._floorPlan.next(data);
    this._activeTab.next('floor-plan');
  }

  setScene3d(data: Scene3DData) {
    this._scene3d.next(data);
    this._activeTab.next('3d-view');
  }

  addRoomImage(b64: string) {
    this._roomImages.next([...this._roomImages.value, b64]);
    this._activeTab.next('room-images');
  }

  setThinking(text: string | null) {
    this._isThinking.next(text);
  }

  addAsset(asset: UploadedAsset): void {
    this._uploadedAssets.next([...this._uploadedAssets.value, asset]);
  }

  removeAsset(id: string): void {
    this._uploadedAssets.next(this._uploadedAssets.value.filter(a => a.id !== id));
  }

  updateAssetType(id: string, type: UploadedAsset['type']): void {
    // If setting as floor-plan, demote any existing floor-plan asset
    const assets = this._uploadedAssets.value.map(a => ({
      ...a,
      type: a.id === id ? type : (type === 'floor-plan' && a.type === 'floor-plan' ? 'reference' : a.type) as UploadedAsset['type'],
    }));
    this._uploadedAssets.next(assets);
  }

  getFloorPlanAsset(): UploadedAsset | undefined {
    return this._uploadedAssets.value.find(a => a.type === 'floor-plan');
  }

  clearAll() {
    this._messages.next([]);
    this._products.next([]);
    this._selectedProduct.next(null);
    this._floorPlan.next(null);
    this._scene3d.next(null);
    this._roomImages.next([]);
    this._isThinking.next(null);
    // intentionally keep uploadedAssets across resets
  }
}
