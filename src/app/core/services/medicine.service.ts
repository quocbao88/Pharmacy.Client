import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';

export interface Medicine {
  id: string;
  code: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  expiryDate: string;
  createdAt: string;
}

export interface CreateMedicine {
  code: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  expiryDate: string;
}

@Injectable({
  providedIn: 'root'
})
export class MedicineService {
  private apiUrl = `${API_BASE_URL}/api/medicines`;

  constructor(private http: HttpClient) {}

  getAll(search?: string): Observable<Medicine[]> {
    const url = search ? `${this.apiUrl}?search=${encodeURIComponent(search)}` : this.apiUrl;
    return this.http.get<Medicine[]>(url);
  }

  getById(id: string): Observable<Medicine> {
    return this.http.get<Medicine>(`${this.apiUrl}/${id}`);
  }

  create(medicine: CreateMedicine): Observable<Medicine> {
    return this.http.post<Medicine>(this.apiUrl, medicine);
  }

  update(id: string, medicine: CreateMedicine): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, medicine);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
