import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';

export interface CheckoutItemDto {
  productId: string;
  quantity: number;
  soldUnit?: string;
}

export interface CheckoutOrderRequest {
  customerId?: string;
  notes?: string;
  discountAmount: number;
  paymentMethod: string; // Cash, Transfer
  items: CheckoutItemDto[];
  prescriptionCode?: string;
  prescribingDoctor?: string;
  medicalFacility?: string;
  diagnostic?: string;
}

export interface OrderDetailDto {
  id: string;
  productId: string;
  productName: string;
  unit: string;
  batchId: string;
  batchNumber: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  subtotal: number;
  soldUnit?: string;
  conversionValue?: number;
}

export interface OrderDto {
  id: string;
  orderCode: string;
  userId: string;
  staffName?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  createdAt: string;
  totalAmount: number;
  discountAmount: number;
  paymentMethod: string;
  status: string;
  details: OrderDetailDto[];
  nationalSyncStatus?: string;
  nationalSyncMessage?: string;
  nationalSyncedAt?: string;
  prescriptionCode?: string;
  prescribingDoctor?: string;
  medicalFacility?: string;
  diagnostic?: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private apiUrl = `${API_BASE_URL}/api/orders`;

  constructor(private http: HttpClient) {}

  checkout(request: CheckoutOrderRequest): Observable<OrderDto> {
    return this.http.post<OrderDto>(this.apiUrl, request);
  }

  getById(id: string): Observable<OrderDto> {
    return this.http.get<OrderDto>(`${this.apiUrl}/${id}`);
  }

  getRecent(limit: number = 10): Observable<OrderDto[]> {
    return this.http.get<OrderDto[]>(`${this.apiUrl}?limit=${limit}`);
  }

  syncNational(id: string): Observable<OrderDto> {
    return this.http.post<OrderDto>(`${this.apiUrl}/${id}/sync-national`, {});
  }

  getOrders(startDate?: string, endDate?: string): Observable<OrderDto[]> {
    let url = this.apiUrl;
    const params: string[] = [];
    if (startDate) params.push(`startDate=${encodeURIComponent(startDate)}`);
    if (endDate) params.push(`endDate=${encodeURIComponent(endDate)}`);
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    return this.http.get<OrderDto[]>(url);
  }

  cancelOrder(id: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/cancel`, {});
  }
}
