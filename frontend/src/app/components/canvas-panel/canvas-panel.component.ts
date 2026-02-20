import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { FurnitureStoreService } from '../../services/furniture-store.service';
import { PlanService } from '../../services/plan.service';
import { CanvasTab, Product } from '../../models';
import { ProductGridComponent } from '../product-grid/product-grid.component';
import { FloorPlanComponent } from '../floor-plan/floor-plan.component';
import { Visualization3dComponent } from '../visualization-3d/visualization-3d.component';
import { ProductDetailPanelComponent } from '../product-detail-panel/product-detail-panel.component';
import { ApiService } from '../../services/api.service';
import { PlanPanelComponent } from '../plan-panel/plan-panel.component';

interface Tab { id: CanvasTab; label: string; icon: string }

@Component({
  selector: 'app-canvas-panel',
  standalone: true,
  imports: [
    CommonModule,
    ProductGridComponent,
    FloorPlanComponent,
    Visualization3dComponent,
    ProductDetailPanelComponent,
    PlanPanelComponent,
  ],
  templateUrl: './canvas-panel.component.html',
  styleUrls: ['./canvas-panel.component.scss'],
})
export class CanvasPanelComponent implements OnInit, OnDestroy {
  activeTab: CanvasTab = 'products';
  selectedProduct: Product | null = null;
  roomImages: string[] = [];
  lightboxIndex: number | null = null;
  planItemCount = 0;
  isGenerating = false;
  private sub = new Subscription();

  readonly tabs: Tab[] = [
    { id: 'products',    label: 'Products',    icon: '🛋️' },
    { id: 'plan',        label: 'Plan',        icon: '📋' },
    { id: 'floor-plan',  label: 'Floor Plan',  icon: '📐' },
    { id: '3d-view',     label: '3D View',     icon: '🏠' },
    { id: 'room-images', label: 'Room Images', icon: '🖼️' },
  ];

  constructor(
    public store: FurnitureStoreService,
    public planService: PlanService,
    private apiService: ApiService,
  ) {}

  ngOnInit() {
    this.sub.add(this.store.activeTab$.subscribe(t => (this.activeTab = t)));
    this.sub.add(this.store.selectedProduct$.subscribe(p => (this.selectedProduct = p)));
    this.sub.add(this.store.roomImages$.subscribe(imgs => (this.roomImages = imgs)));
    this.sub.add(this.planService.plan$.subscribe(p => {
      this.planItemCount = p.items.reduce((sum, i) => sum + i.quantity, 0);
    }));
  }

  ngOnDestroy() { this.sub.unsubscribe(); }

  setTab(tab: CanvasTab) { this.store.setActiveTab(tab); }
  closeLightbox() { this.lightboxIndex = null; }

  generateImageFromPlan() {
    const items = this.planService.currentPlan.items.map(i => ({
      title: i.product.title,
      image_url: i.product.images?.length > 0 ? i.product.images[0] : ""
    })).filter(i => i.image_url !== "");

    if (items.length === 0) return;

    this.isGenerating = true;
    this.sub.add(
      this.apiService.generateImageFromPlan(items).subscribe({
        next: (res) => {
          this.store.addRoomImage(res.image);
          this.isGenerating = false;
        },
        error: (err) => {
          console.error("Failed to generate image from plan", err);
          this.isGenerating = false;
        }
      })
    );
  }
}

