import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PlanService } from '../../services/plan.service';
import { FurnitureStoreService } from '../../services/furniture-store.service';
import { Plan, PlanItem, Product, FloorPlanData, Scene3DData, Furniture3DItem, FurniturePlacement } from '../../models';

const PROXY = 'http://localhost:8000/api/images/proxy?url=';

// Map product category → furniture type + default dimensions (feet)
interface FurnitureSpec {
  type: string;
  w: number; d: number; h: number;
  color: string;
}

const CATEGORY_MAP: Record<string, FurnitureSpec> = {
  'sofa':           { type: 'sofa',          w: 7,   d: 3.5, h: 3,    color: '#8b7355' },
  'chair':          { type: 'armchair',       w: 3,   d: 3,   h: 3.5,  color: '#9c8b7d' },
  'armchair':       { type: 'armchair',       w: 3,   d: 3,   h: 3.5,  color: '#9c8b7d' },
  'bed':            { type: 'bed-queen',      w: 5.5, d: 6.5, h: 2,    color: '#ddd0c8' },
  'dining table':   { type: 'dining-table',   w: 6,   d: 3.5, h: 2.5,  color: '#6b4c2a' },
  'dining chair':   { type: 'dining-chair',   w: 1.5, d: 1.8, h: 3.5,  color: '#8b7355' },
  'coffee table':   { type: 'coffee-table',   w: 4,   d: 2,   h: 1.5,  color: '#5c3d1e' },
  'side table':     { type: 'side-table',     w: 1.5, d: 1.5, h: 2.5,  color: '#8b7355' },
  'desk':           { type: 'desk',           w: 5,   d: 2.5, h: 2.5,  color: '#8b7355' },
  'bookshelf':      { type: 'bookshelf',      w: 3,   d: 1,   h: 7,    color: '#6b4c2a' },
  'dresser':        { type: 'dresser',        w: 4,   d: 1.5, h: 3.5,  color: '#7a6040' },
  'wardrobe':       { type: 'wardrobe',       w: 5,   d: 2,   h: 7.5,  color: '#5c4a3a' },
  'tv stand':       { type: 'tv-stand',       w: 6,   d: 1.5, h: 2,    color: '#3d2b1a' },
  'floor lamp':     { type: 'floor-lamp',     w: 1,   d: 1,   h: 5.5,  color: '#c8a96e' },
  'rug':            { type: 'rug',            w: 8,   d: 5,   h: 0.15, color: '#b8860b' },
  'bench':          { type: 'armchair',       w: 4,   d: 1.5, h: 2,    color: '#8b7355' },
  'outdoor furniture': { type: 'armchair',    w: 2.5, d: 2.5, h: 3,    color: '#4a7c59' },
  'furniture':      { type: 'armchair',       w: 3,   d: 3,   h: 3,    color: '#8b7355' },
};

function getSpec(category: string): FurnitureSpec {
  const key = category.toLowerCase().trim();
  if (CATEGORY_MAP[key]) return CATEGORY_MAP[key];
  // partial match
  for (const [k, v] of Object.entries(CATEGORY_MAP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return CATEGORY_MAP['furniture'];
}

@Component({
  selector: 'app-plan-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plan-panel.component.html',
  styleUrls: ['./plan-panel.component.scss'],
})
export class PlanPanelComponent implements OnInit, OnDestroy {
  plan: Plan = { id: '', name: '', items: [], createdAt: new Date() };
  editingName = false;
  private sub = new Subscription();

  constructor(
    public planService: PlanService,
    private store: FurnitureStoreService,
  ) {}

  ngOnInit() {
    this.sub.add(this.planService.plan$.subscribe(p => (this.plan = p)));
  }
  ngOnDestroy() { this.sub.unsubscribe(); }

  thumbSrc(product: Product): string {
    const raw = product.images?.[0];
    if (!raw) return `https://placehold.co/80x60/e2e8f0/94a3b8?text=${encodeURIComponent(product.category)}`;
    if (raw.startsWith('data:') || raw.includes('placehold.co')) return raw;
    return PROXY + encodeURIComponent(raw);
  }

  updateQty(item: PlanItem, delta: number) {
    this.planService.updateQuantity(item.id, item.quantity + delta);
  }

  removeItem(item: PlanItem) {
    this.planService.removeItem(item.id);
  }

  get totalPrice(): number { return this.planService.totalPrice; }

  // ── Visualize as 3D ──────────────────────────────────────────────────────────
  visualize3D() {
    const ROOM_W = 20, ROOM_L = 20, ROOM_H = 9;
    const items: Furniture3DItem[] = [];
    let col = 0, row = 0, rowMaxDepth = 0;
    const PADDING = 1;
    let curX = PADDING;
    let curZ = PADDING;

    for (const planItem of this.plan.items) {
      for (let q = 0; q < planItem.quantity; q++) {
        const spec = getSpec(planItem.product.category);
        const id = crypto.randomUUID();

        // Pack items left-to-right, wrapping to next row
        if (curX + spec.w + PADDING > ROOM_W) {
          curX = PADDING;
          curZ += rowMaxDepth + PADDING;
          rowMaxDepth = 0;
        }
        if (curZ + spec.d + PADDING > ROOM_L) {
          // Out of room — just place at a fixed position
          curX = PADDING; curZ = PADDING;
        }
        rowMaxDepth = Math.max(rowMaxDepth, spec.d);

        items.push({
          id,
          name: planItem.product.title,
          type: spec.type,
          x: curX,
          z: curZ,
          width: spec.w,
          depth: spec.d,
          height: spec.h,
          color: spec.color,
          rotation: 0,
        });

        curX += spec.w + PADDING;
      }
    }

    const sceneData: Scene3DData = {
      room_width: ROOM_W,
      room_length: ROOM_L,
      room_height: ROOM_H,
      furniture_items: items,
    };

    this.store.setScene3d(sceneData);
  }

  // ── Visualize as floor plan ──────────────────────────────────────────────────
  visualizeFloorPlan() {
    const ROOM_W = 20, ROOM_L = 20;
    const placements: FurniturePlacement[] = [];
    let curXPct = 2, curYPct = 2, rowMaxH = 0;
    const GAP = 2;

    for (const planItem of this.plan.items) {
      for (let q = 0; q < planItem.quantity; q++) {
        const spec = getSpec(planItem.product.category);
        const wPct = (spec.w / ROOM_W) * 100;
        const dPct = (spec.d / ROOM_L) * 100;

        if (curXPct + wPct + GAP > 96) {
          curXPct = 2;
          curYPct += rowMaxH + GAP;
          rowMaxH = 0;
        }
        if (curYPct + dPct > 96) {
          curXPct = 2; curYPct = 2;
        }
        rowMaxH = Math.max(rowMaxH, dPct);

        placements.push({
          name: planItem.product.title,
          x_percent: curXPct,
          y_percent: curYPct,
          width_percent: wPct,
          depth_percent: dPct,
          rotation: 0,
          color: spec.color,
        });
        curXPct += wPct + GAP;
      }
    }

    const floorPlan: FloorPlanData = {
      room_width: ROOM_W,
      room_length: ROOM_L,
      furniture_placements: placements,
    };

    this.store.setFloorPlan(floorPlan);
  }
}
