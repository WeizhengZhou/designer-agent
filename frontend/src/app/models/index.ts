export interface Dimensions {
  width: number;
  depth: number;
  height: number;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  short_description: string;
  price: number;
  currency: string;
  seller: string;
  rating: number;
  review_count: number;
  category: string;
  style: string;
  images: string[];
  dimensions?: Dimensions;
  colors: string[];
  in_stock: boolean;
  url: string;
  tags: string[];
}

export interface FurniturePlacement {
  name: string;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  depth_percent: number;
  rotation: number;
  color: string;
}

export interface FloorPlanData {
  room_width: number;
  room_length: number;
  furniture_placements: FurniturePlacement[];
}

export interface Furniture3DItem {
  id: string;
  name: string;
  type: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
  rotation: number;
}

export interface Scene3DData {
  room_width: number;
  room_length: number;
  room_height: number;
  furniture_items: Furniture3DItem[];
}

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  images?: string[];        // base64 or data URLs
  products?: Product[];
  generatedImages?: string[]; // base64 PNG
  floorPlan?: FloorPlanData;
  scene3d?: Scene3DData;
  isStreaming?: boolean;
}

export type CanvasTab = 'products' | 'plan' | 'assets' | 'floor-plan' | '3d-view' | 'room-images';

export type AssetType = 'floor-plan' | 'reference' | 'other';

export interface UploadedAsset {
  id: string;
  name: string;
  dataUrl: string;       // full base64 data-URL
  mimeType: string;
  type: AssetType;
  uploadedAt: Date;
}

export interface PlanItem {
  id: string;
  product: Product;
  quantity: number;
  addedAt: Date;
}

export interface Plan {
  id: string;
  name: string;
  items: PlanItem[];
  createdAt: Date;
}
