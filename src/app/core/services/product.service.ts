import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';

export interface ProductUnitConversionDto {
  id?: string;
  unitName: string;
  conversionValue: number;
  sellingPrice: number;
}

export interface ProductDto {
  id: string;
  supplierId: string;
  supplierName?: string;
  name: string;
  activeIngredient?: string;
  category?: string;
  manufacturer?: string;
  dosageForm?: string;
  strength?: string;
  storageConditions?: string;
  prescriptionRequired: boolean;
  description?: string;
  unit: string;
  importPrice: number;
  sellingPrice: number;
  minStockLevel: number;
  totalStock: number;
  updatedAt: string;
  unitConversions?: ProductUnitConversionDto[];
}

export interface CreateProductRequest {
  supplierId: string;
  name: string;
  activeIngredient?: string;
  category?: string;
  manufacturer?: string;
  dosageForm?: string;
  strength?: string;
  storageConditions?: string;
  prescriptionRequired: boolean;
  description?: string;
  unit: string;
  importPrice: number;
  sellingPrice: number;
  minStockLevel: number;
  unitConversions: ProductUnitConversionDto[];
}

export interface CreateBatchRequest {
  batchNumber: string;
  expirationDate: string;
  quantity: number;
  importPrice?: number;
}

export interface BatchDto {
  id: string;
  productId: string;
  productName?: string;
  batchNumber: string;
  expirationDate: string;
  currentQuantity: number;
  importPrice?: number;
}

export interface LowStockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  minStockLevel: number;
  unit: string;
}

export interface ExpiringBatchAlert {
  productId: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  expirationDate: string;
  daysRemaining: number;
  currentQuantity: number;
}

export interface SmartAlertsResponse {
  lowStockProducts: LowStockAlert[];
  expiringBatches: ExpiringBatchAlert[];
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private apiUrl = `${API_BASE_URL}/api/products`;

  constructor(private http: HttpClient) {}

  getAll(search?: string, category?: string): Observable<ProductDto[]> {
    let url = this.apiUrl;
    const params: string[] = [];
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (category) params.push(`category=${encodeURIComponent(category)}`);
    if (params.length) url += '?' + params.join('&');
    return this.http.get<ProductDto[]>(url);
  }

  getById(id: string): Observable<ProductDto> {
    return this.http.get<ProductDto>(`${this.apiUrl}/${id}`);
  }

  create(product: CreateProductRequest): Observable<ProductDto> {
    return this.http.post<ProductDto>(this.apiUrl, product);
  }

  update(id: string, product: CreateProductRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, product);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getBatches(productId: string): Observable<BatchDto[]> {
    return this.http.get<BatchDto[]>(`${this.apiUrl}/batches/${productId}`);
  }

  addBatch(productId: string, batch: CreateBatchRequest): Observable<BatchDto> {
    return this.http.post<BatchDto>(`${this.apiUrl}/${productId}/batches`, batch);
  }

  updateBatch(batchId: string, batch: any): Observable<BatchDto> {
    return this.http.put<BatchDto>(`${this.apiUrl}/batches/${batchId}`, batch);
  }

  deleteBatch(batchId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/batches/${batchId}`);
  }

  getAlerts(): Observable<SmartAlertsResponse> {
    return this.http.get<SmartAlertsResponse>(`${this.apiUrl}/alerts`);
  }

  getProductHistory(productId: string): Observable<ProductHistoryDto[]> {
    return this.http.get<ProductHistoryDto[]>(`${this.apiUrl}/${productId}/history`);
  }

  getProductAuditLogs(productId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${productId}/audit-logs`);
  }
}

export interface ProductHistoryDto {
  orderId: string;
  orderCode: string;
  saleDate: string;
  staffName?: string;
  customerName?: string;
  batchNumber?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}
