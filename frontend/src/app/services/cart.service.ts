import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Product, CartItem } from '../models';

@Injectable({ providedIn: 'root' })
export class CartService {
  private _items = new BehaviorSubject<CartItem[]>([]);
  items$ = this._items.asObservable();

  get items() { return this._items.value; }
  get itemCount() { return this.items.reduce((sum, i) => sum + i.quantity, 0); }
  get totalPrice() { return this.items.reduce((sum, i) => sum + i.product.price * i.quantity, 0); }

  addItem(product: Product, quantity = 1) {
    const current = this.items;
    const existing = current.find(i => i.product.id === product.id);
    if (existing) {
      this.updateQuantity(product.id, existing.quantity + quantity);
    } else {
      this._items.next([...current, { id: crypto.randomUUID(), product, quantity }]);
    }
  }

  updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }
    this._items.next(
      this.items.map(i => i.product.id === productId ? { ...i, quantity } : i)
    );
  }

  removeItem(productId: string) {
    this._items.next(this.items.filter(i => i.product.id !== productId));
  }

  clearCart() {
    this._items.next([]);
  }

  checkout() {
    alert('Checkout complete! Your items have been purchased.');
    this.clearCart();
  }
}
