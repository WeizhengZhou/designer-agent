import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../models';
import { PlanService } from '../../services/plan.service';

const PROXY = 'http://localhost:8000/api/images/proxy?url=';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss'],
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  @Output() cardClick = new EventEmitter<Product>();

  imgFailed = false;

  constructor(public plan: PlanService) {}

  addToPlan(e: Event): void {
    e.stopPropagation();
    this.plan.addProduct(this.product);
  }

  get inPlan(): boolean { return this.plan.isInPlan(this.product.id); }
  get planQty(): number { return this.plan.getQuantity(this.product.id); }

  /** Proxy all external image URLs through the backend to avoid CORS. */
  get imgSrc(): string {
    if (this.imgFailed) {
      return `https://placehold.co/400x300/e2e8f0/94a3b8?text=${encodeURIComponent(this.product.category || 'Furniture')}`;
    }
    const raw = this.product.images?.[0];
    if (!raw) {
      return `https://placehold.co/400x300/e2e8f0/94a3b8?text=${encodeURIComponent(this.product.category || 'Furniture')}`;
    }
    // Placehold.co and data: URLs don't need proxying
    if (raw.startsWith('data:') || raw.includes('placehold.co')) return raw;
    return PROXY + encodeURIComponent(raw);
  }

  get stars(): number[] {
    return [0, 1, 2, 3, 4];
  }

  get filledStars(): number {
    return Math.round(this.product.rating);
  }

  onImgError() {
    this.imgFailed = true;
  }
}
