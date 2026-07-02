import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';

export interface DailyReportItemDto {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
}

export interface ReportSummaryDto {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  dailyStats: DailyReportItemDto[];
}

export interface TopProductDto {
  productId: string;
  productName: string;
  unit: string;
  totalQuantitySold: number;
  totalRevenueGenerated: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = `${API_BASE_URL}/api/reports`;

  constructor(private http: HttpClient) {}

  getDashboardReport(start: string, end: string): Observable<ReportSummaryDto> {
    return this.http.get<ReportSummaryDto>(
      `${this.apiUrl}/dashboard?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
    );
  }

  getTopSelling(start: string, end: string, limit: number = 10): Observable<TopProductDto[]> {
    return this.http.get<TopProductDto[]>(
      `${this.apiUrl}/top-selling?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&limit=${limit}`
    );
  }
}
