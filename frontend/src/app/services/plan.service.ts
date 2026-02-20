import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Plan, PlanItem, Product } from '../models';

@Injectable({ providedIn: 'root' })
export class PlanService {
  private _plan = new BehaviorSubject<Plan>({
    id: 'default',
    name: 'My Room Plan',
    items: [],
    createdAt: new Date(),
  });

  plan$ = this._plan.asObservable();

  get currentPlan(): Plan { return this._plan.value; }

  addProduct(product: Product): void {
    const existing = this._plan.value.items.find(i => i.product.id === product.id);
    if (existing) {
      const items = this._plan.value.items.map(i =>
        i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
      );
      this._plan.next({ ...this._plan.value, items });
    } else {
      const item: PlanItem = {
        id: crypto.randomUUID(),
        product,
        quantity: 1,
        addedAt: new Date(),
      };
      this._plan.next({ ...this._plan.value, items: [...this._plan.value.items, item] });
    }
  }

  removeItem(itemId: string): void {
    const items = this._plan.value.items.filter(i => i.id !== itemId);
    this._plan.next({ ...this._plan.value, items });
  }

  updateQuantity(itemId: string, quantity: number): void {
    if (quantity <= 0) { this.removeItem(itemId); return; }
    const items = this._plan.value.items.map(i =>
      i.id === itemId ? { ...i, quantity } : i
    );
    this._plan.next({ ...this._plan.value, items });
  }

  renamePlan(name: string): void {
    this._plan.next({ ...this._plan.value, name });
  }

  clearPlan(): void {
    this._plan.next({ ...this._plan.value, items: [] });
  }

  isInPlan(productId: string): boolean {
    return this._plan.value.items.some(i => i.product.id === productId);
  }

  getQuantity(productId: string): number {
    return this._plan.value.items.find(i => i.product.id === productId)?.quantity ?? 0;
  }

  get totalPrice(): number {
    return this._plan.value.items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  }

  get itemCount(): number {
    return this._plan.value.items.reduce((sum, i) => sum + i.quantity, 0);
  }
}
