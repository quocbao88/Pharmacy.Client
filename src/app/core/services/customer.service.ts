import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';

export interface CustomerDto {
  id: string;
  fullName: string;
  phone: string;
  allergyNotes?: string;
  dateOfBirth?: string;
  rewardPoints: number;
}

export interface CreateCustomerRequest {
  fullName: string;
  phone: string;
  allergyNotes?: string;
  dateOfBirth?: string;
}

export interface CustomerOrderItemDto {
  productName: string;
  batchNumber: string;
  quantity: number;
  unitPrice: number;
}

export interface CustomerOrderDto {
  orderId: string;
  orderCode: string;
  createdAt: string;
  totalAmount: number;
  items: CustomerOrderItemDto[];
}

export interface CustomerHistoryDto {
  customer: CustomerDto;
  orders: CustomerOrderDto[];
}

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private apiUrl = `${API_BASE_URL}/api/customers`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<CustomerDto[]> {
    return this.http.get<CustomerDto[]>(this.apiUrl);
  }

  searchByPhone(phone: string): Observable<CustomerDto> {
    return this.http.get<CustomerDto>(`${this.apiUrl}/search?phone=${encodeURIComponent(phone)}`);
  }

  create(customer: CreateCustomerRequest): Observable<CustomerDto> {
    return this.http.post<CustomerDto>(this.apiUrl, customer);
  }

  getHistory(customerId: string): Observable<CustomerHistoryDto> {
    return this.http.get<CustomerHistoryDto>(`${this.apiUrl}/${customerId}/history`);
  }
}
