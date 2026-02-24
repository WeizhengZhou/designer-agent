/**
 * DimensionService — fetches real product dimensions from the backend.
 *
 * Kept as a standalone service so the fetching strategy can be swapped
 * (e.g. different scraping API, cached DB lookup) without touching components.
 *
 * Dimensions are returned in INCHES to match the Product model's convention.
 * Convert to feet (÷ 12) before using in the 3D scene.
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Product } from '../models';
import { environment } from '../../environments/environment';

const API_URL = environment.apiUrl;

export interface FetchedDimensions {
  width:  number;   // inches
  depth:  number;   // inches
  height: number;   // inches
}

interface DimensionApiResponse {
  width:  number | null;
  depth:  number | null;
  height: number | null;
  found:  boolean;
}

@Injectable({ providedIn: 'root' })
export class DimensionService {
  constructor(private http: HttpClient) {}

  /**
   * Attempt to fetch real product dimensions by scraping the product URL.
   * Returns an Observable that emits the dimensions in inches, or null if
   * the dimensions could not be found (bad URL, scraping failed, etc.).
   * Never throws — errors are swallowed and map to null.
   */
  fetchDimensions(product: Product): Observable<FetchedDimensions | null> {
    if (!product.url || product.url === '#') {
      return of(null);
    }

    return this.http
      .post<DimensionApiResponse>(`${API_URL}/dimensions/fetch`, {
        url:           product.url,
        product_title: product.title,
      })
      .pipe(
        map(res =>
          res.found && res.width && res.depth && res.height
            ? { width: res.width, depth: res.depth, height: res.height }
            : null,
        ),
        catchError(() => of(null)),
      );
  }
}
