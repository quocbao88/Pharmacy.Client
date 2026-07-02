import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';

export interface InvoiceItem {
  id: string;
  medicineId: string;
  medicineName?: string;
  medicineCode?: string;
  quantity: number;
  price: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  totalAmount: number;
  createdAt: string;
  items: InvoiceItem[];
}

export interface CreateInvoiceItem {
  medicineId: string;
  quantity: number;
}

export interface CreateInvoice {
  customerName: string;
  items: CreateInvoiceItem[];
}

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private apiUrl = `${API_BASE_URL}/api/invoices`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Invoice[]> {
    return this.http.get<Invoice[]>(this.apiUrl);
  }

  getById(id: string): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.apiUrl}/${id}`);
  }

  create(invoice: CreateInvoice): Observable<Invoice> {
    return this.http.post<Invoice>(this.apiUrl, invoice);
  }
}
