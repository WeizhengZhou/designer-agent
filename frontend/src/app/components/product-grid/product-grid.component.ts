import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FurnitureStoreService } from '../../services/furniture-store.service';
import { Product } from '../../models';
import { ProductCardComponent } from '../product-card/product-card.component';

@Component({
  selector: 'app-product-grid',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductCardComponent],
  templateUrl: './product-grid.component.html',
  styleUrls: ['./product-grid.component.scss'],
})
export class ProductGridComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  filterText = '';
  sortKey: 'price_asc' | 'price_desc' | 'rating' = 'rating';
  private sub = new Subscription();

  constructor(private store: FurnitureStoreService) {}

  ngOnInit() {
    this.sub.add(this.store.products$.subscribe(p => (this.products = p)));
  }

  ngOnDestroy() { this.sub.unsubscribe(); }

  get filtered(): Product[] {
    let list = this.products;
    if (this.filterText) {
      const q = this.filterText.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.style.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (this.sortKey === 'price_asc')  return a.price - b.price;
      if (this.sortKey === 'price_desc') return b.price - a.price;
      return b.rating - a.rating;
    });
  }

  selectProduct(p: Product) {
    this.store.selectProduct(p);
  }
}
