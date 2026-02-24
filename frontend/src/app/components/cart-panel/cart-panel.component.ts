import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { CartService } from '../../services/cart.service';
import { CartItem, Product } from '../../models';
import { environment } from '../../../environments/environment';

const PROXY = environment.apiUrl + '/images/proxy?url=';

@Component({
  selector: 'app-cart-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cart-panel.component.html',
  styleUrls: ['./cart-panel.component.scss'],
})
export class CartPanelComponent implements OnInit, OnDestroy {
  items: CartItem[] = [];
  private sub = new Subscription();

  constructor(public cartService: CartService) {}

  ngOnInit() {
    this.sub.add(this.cartService.items$.subscribe(items => this.items = items));
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  thumbSrc(product: Product): string {
    const raw = product.images?.[0];
    if (!raw) return `https://placehold.co/80x60/e2e8f0/94a3b8?text=${encodeURIComponent(product.category)}`;
    if (raw.startsWith('data:') || raw.includes('placehold.co')) return raw;
    return PROXY + encodeURIComponent(raw);
  }

  updateQty(productId: string, delta: number) {
    const item = this.items.find(i => i.product.id === productId);
    if (item) {
      this.cartService.updateQuantity(productId, item.quantity + delta);
    }
  }

  removeItem(productId: string) {
    this.cartService.removeItem(productId);
  }

  checkout() {
    this.cartService.checkout();
  }
}
