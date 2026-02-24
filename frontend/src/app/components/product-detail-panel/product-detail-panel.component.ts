import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { FurnitureStoreService } from '../../services/furniture-store.service';
import { Product } from '../../models';
import { environment } from '../../../environments/environment';

const PROXY = environment.apiUrl + '/images/proxy?url=';

@Component({
  selector: 'app-product-detail-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-detail-panel.component.html',
  styleUrls: ['./product-detail-panel.component.scss'],
})
export class ProductDetailPanelComponent implements OnInit, OnDestroy {
  product: Product | null = null;
  activeImageIndex = 0;
  imgFailed = false;
  private sub = new Subscription();

  constructor(private store: FurnitureStoreService) {}

  ngOnInit() {
    this.sub.add(this.store.selectedProduct$.subscribe(p => {
      this.product = p;
      this.activeImageIndex = 0;
      this.imgFailed = false;
    }));
  }

  ngOnDestroy() { this.sub.unsubscribe(); }

  @HostListener('document:keydown.escape')
  close() { this.store.selectProduct(null); }

  get stars(): { i: number; filled: boolean }[] {
    const f = Math.round(this.product?.rating ?? 0);
    return Array.from({ length: 5 }, (_, i) => ({ i, filled: i < f }));
  }

  imgSrc(raw: string): string {
    if (!raw) return `https://placehold.co/600x450/e2e8f0/94a3b8?text=Furniture`;
    if (raw.startsWith('data:') || raw.includes('placehold.co')) return raw;
    return PROXY + encodeURIComponent(raw);
  }

  onImgError(event: Event) {
    (event.target as HTMLImageElement).src =
      `https://placehold.co/600x450/e2e8f0/94a3b8?text=${encodeURIComponent(this.product?.category ?? 'Furniture')}`;
    this.imgFailed = true;
  }
}
