import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../models';
import { PlanService } from '../../services/plan.service';
import { DimensionService } from '../../services/dimension.service';
import { environment } from '../../../environments/environment';

const PROXY = environment.apiUrl + '/images/proxy?url=';

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

  constructor(
    public plan: PlanService,
    private dimensionSvc: DimensionService,
  ) {}

  addToPlan(e: Event): void {
    e.stopPropagation();
    const wasInPlan = this.plan.isInPlan(this.product.id);
    this.plan.addProduct(this.product);

    // Kick off dimension fetch in the background the first time the product is added.
    // Once dimensions arrive they are stored on the plan item for use in 3D layout.
    if (!wasInPlan && !this.product.dimensions) {
      this.dimensionSvc.fetchDimensions(this.product).subscribe(dims => {
        if (dims) {
          this.plan.updateProductDimensions(this.product.id, dims);
        }
      });
    }
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
