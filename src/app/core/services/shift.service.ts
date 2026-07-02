import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';

export interface ShiftDto {
  id: string;
  userId: string;
  userFullName?: string;
  startTime: string;
  endTime?: string;
  startingCash: number;
  endingCash?: number;
  actualRevenue: number;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class ShiftService {
  private apiUrl = `${API_BASE_URL}/api/shifts`;

  constructor(private http: HttpClient) {}

  open(startingCash: number): Observable<ShiftDto> {
    return this.http.post<ShiftDto>(`${this.apiUrl}/open`, { startingCash });
  }

  close(endingCash: number): Observable<ShiftDto> {
    return this.http.post<ShiftDto>(`${this.apiUrl}/close`, { endingCash });
  }

  getActiveShift(): Observable<ShiftDto> {
    return this.http.get<ShiftDto>(`${this.apiUrl}/active`);
  }
}
