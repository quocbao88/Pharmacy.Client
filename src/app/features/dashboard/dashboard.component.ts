import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService, ReportSummaryDto, TopProductDto } from '../../core/services/report.service';
import { ProductService, SmartAlertsResponse } from '../../core/services/product.service';
import { OrderService, OrderDto } from '../../core/services/order.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dashboard-container">
      <!-- Date Filter -->
      <div class="filter-bar card">
        <h3 class="card-title" style="margin: 0;"><i class="fa-solid fa-calendar-days text-primary"></i> Khoảng thời gian đối chiếu</h3>
        <div class="filter-inputs">
          <div class="form-group-horizontal">
            <label class="form-label">Từ ngày</label>
            <input type="date" [(ngModel)]="startDate" class="form-control form-control-sm" />
          </div>
          <div class="form-group-horizontal">
            <label class="form-label">Đến ngày</label>
            <input type="date" [(ngModel)]="endDate" class="form-control form-control-sm" />
          </div>
          <button (click)="loadReports()" class="btn btn-primary btn-sm" [disabled]="isLoading">
            <i class="fa-solid fa-sync" [class.fa-spin]="isLoading"></i> Áp dụng
          </button>
        </div>
      </div>

      <!-- Stat Cards -->
      <div class="stat-cards-grid" *ngIf="reportSummary">
        <div class="stat-card revenue">
          <div class="card-icon"><i class="fa-solid fa-sack-dollar"></i></div>
          <div class="card-vals">
            <span class="label">TỔNG DOANH THU</span>
            <h2 class="val font-mono">{{ reportSummary.totalRevenue | number:'1.0-0' }}đ</h2>
          </div>
        </div>

        <div class="stat-card cost">
          <div class="card-icon"><i class="fa-solid fa-file-invoice-dollar"></i></div>
          <div class="card-vals">
            <span class="label">TIỀN VỐN LÔ NHẬP</span>
            <h2 class="val font-mono">{{ reportSummary.totalCost | number:'1.0-0' }}đ</h2>
          </div>
        </div>

        <div class="stat-card profit">
          <div class="card-icon"><i class="fa-solid fa-chart-line"></i></div>
          <div class="card-vals">
            <span class="label">LỢI NHUẬN GỘP</span>
            <h2 class="val font-mono">{{ reportSummary.totalProfit | number:'1.0-0' }}đ</h2>
          </div>
        </div>
      </div>

      <!-- Chart & Top Selling -->
      <div class="grid-two-cols">
        <!-- SVG Daily Chart Card -->
        <div class="card chart-card">
          <h3 class="card-title"><i class="fa-solid fa-chart-column text-primary"></i> Biểu đồ Doanh thu & Lợi nhuận hàng ngày</h3>
          
          <div class="chart-wrapper" *ngIf="reportSummary && reportSummary.dailyStats.length > 0; else noChart">
            <!-- Custom SVG Bar Chart -->
            <svg class="svg-chart" viewBox="0 0 600 240">
              <!-- Y Axis Lines -->
              <line x1="50" y1="20" x2="50" y2="200" stroke="var(--border-color)" stroke-width="1" />
              <line x1="50" y1="200" x2="580" y2="200" stroke="var(--border-color)" stroke-width="1" />
              
              <g *ngFor="let gridLine of [0, 0.25, 0.5, 0.75, 1]">
                <line 
                  x1="50" 
                  [attr.y1]="200 - (180 * gridLine)" 
                  x2="580" 
                  [attr.y2]="200 - (180 * gridLine)" 
                  stroke="var(--border-color)" 
                  stroke-dasharray="4,4" 
                  opacity="0.4"
                />
                <text 
                  x="42" 
                  [attr.y]="204 - (180 * gridLine)" 
                  fill="var(--text-secondary)" 
                  font-size="8" 
                  text-anchor="end"
                  class="font-mono"
                >
                  {{ (getMaxDailyVal() * gridLine) | number:'1.0-0' }}
                </text>
              </g>

              <!-- Chart Bars -->
              <g *ngFor="let day of reportSummary.dailyStats; let i = index">
                <!-- X Position of current day -->
                <ng-container *ngIf="getDayX(i) as x">
                  <!-- Revenue Bar (Indigo/Purple) -->
                  <rect 
                    [attr.x]="x" 
                    [attr.y]="200 - getDayRevenueHeight(day.revenue)" 
                    width="14" 
                    [attr.height]="getDayRevenueHeight(day.revenue)" 
                    fill="url(#revenueGrad)"
                    rx="3"
                  />
                  <!-- Profit Bar (Green) -->
                  <rect 
                    [attr.x]="x + 4" 
                    [attr.y]="200 - getDayProfitHeight(day.profit)" 
                    width="6" 
                    [attr.height]="getDayProfitHeight(day.profit)" 
                    fill="url(#profitGrad)"
                    rx="2"
                  />
                  <!-- Tooltip Target Area -->
                  <rect
                    [attr.x]="x - 2"
                    y="10"
                    width="18"
                    height="190"
                    fill="transparent"
                    class="chart-bar-hover"
                    [attr.title]="(day.date | date:'dd/MM') + ': Doanh thu: ' + day.revenue + 'đ, Lợi nhuận: ' + day.profit + 'đ'"
                  />
                  <!-- Label (Date) -->
                  <text 
                    [attr.x]="x + 7" 
                    y="215" 
                    fill="var(--text-secondary)" 
                    font-size="8" 
                    text-anchor="middle"
                    class="font-mono"
                  >
                    {{ day.date | date:'dd/MM' }}
                  </text>
                </ng-container>
              </g>

              <!-- Gradients Definition -->
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#818cf8" />
                  <stop offset="100%" stop-color="#4f46e5" />
                </linearGradient>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#34d399" />
                  <stop offset="100%" stop-color="#059669" />
                </linearGradient>
              </defs>
            </svg>
            <div class="chart-legends">
              <div class="legend-item"><span class="color-box revenue"></span> Doanh thu</div>
              <div class="legend-item"><span class="color-box profit"></span> Lợi nhuận</div>
            </div>
          </div>
          <ng-template #noChart>
            <div class="empty-state">
              <i class="fa-solid fa-chart-bar" style="font-size: 2.5rem; color: var(--text-secondary); margin-bottom: 0.75rem;"></i>
              <p>Không có dữ liệu hóa đơn nào trong khoảng thời gian đã chọn.</p>
            </div>
          </ng-template>
        </div>

        <!-- Top Selling Products -->
        <div class="card">
          <h3 class="card-title"><i class="fa-solid fa-medal text-warning"></i> Top 10 Thuốc bán chạy nhất</h3>
          <div class="table-responsive" *ngIf="topProducts.length > 0; else noTop">
            <table class="table">
              <thead>
                <tr>
                  <th>Tên sản phẩm</th>
                  <th class="text-center">ĐVT</th>
                  <th class="text-center">Số lượng bán</th>
                  <th class="text-right">Tổng doanh số</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let p of topProducts">
                  <td class="font-semibold">{{ p.productName }}</td>
                  <td class="text-center">{{ p.unit }}</td>
                  <td class="text-center font-semibold font-mono">{{ p.totalQuantitySold }}</td>
                  <td class="text-right font-semibold font-mono text-primary">{{ p.totalRevenueGenerated | number:'1.0-0' }}đ</td>
                </tr>
              </tbody>
            </table>
          </div>
          <ng-template #noTop>
            <div class="empty-state">
              <i class="fa-solid fa-circle-info" style="font-size: 2rem; color: var(--text-secondary); margin-bottom: 0.5rem;"></i>
              <p>Không có dữ liệu thuốc bán ra.</p>
            </div>
          </ng-template>
        </div>
      </div>

      <!-- Inventory Alerts -->
      <div class="grid-two-cols" style="margin-top: 2rem;" *ngIf="alerts">
        <!-- Low Stock Alerts -->
        <div class="card" style="border-top: 3px solid #ef4444;">
          <h3 class="card-title"><i class="fa-solid fa-triangle-exclamation text-danger"></i> Cảnh báo Hết hàng (Tổng tồn &lt; Mức tối thiểu)</h3>
          <div class="table-responsive" *ngIf="alerts.lowStockProducts.length > 0; else noLowStock">
            <table class="table">
              <thead>
                <tr>
                  <th>Tên sản phẩm</th>
                  <th class="text-center">Tồn kho hiện tại</th>
                  <th class="text-center">Mức cảnh báo</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of alerts.lowStockProducts" class="row-warning">
                  <td class="font-semibold">{{ item.productName }}</td>
                  <td class="text-center font-semibold text-danger font-mono">{{ item.currentStock }} {{ item.unit }}</td>
                  <td class="text-center font-mono">{{ item.minStockLevel }} {{ item.unit }}</td>
                  <td>
                    <button class="btn btn-outline-danger btn-xs">Nhập thêm lô</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <ng-template #noLowStock>
            <div class="empty-state">
              <i class="fa-solid fa-circle-check text-success" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
              <p class="text-success">Tất cả sản phẩm đều đủ lượng tồn kho tối thiểu.</p>
            </div>
          </ng-template>
        </div>

        <!-- Expiring Batches Alerts -->
        <div class="card" style="border-top: 3px solid #f97316;">
          <h3 class="card-title"><i class="fa-solid fa-clock text-warning"></i> Cảnh báo Thuốc cận hạn sử dụng (&lt; 90 ngày)</h3>
          <div class="table-responsive" *ngIf="alerts.expiringBatches.length > 0; else noExpiring">
            <table class="table">
              <thead>
                <tr>
                  <th>Tên sản phẩm</th>
                  <th class="text-center">Số lô</th>
                  <th class="text-center">Hạn sử dụng</th>
                  <th class="text-center">Còn lại</th>
                  <th class="text-center">Tồn lô</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let batch of alerts.expiringBatches" class="row-danger">
                  <td class="font-semibold">{{ batch.productName }}</td>
                  <td class="text-center font-mono">{{ batch.batchNumber }}</td>
                  <td class="text-center font-mono">{{ batch.expirationDate | date:'dd/MM/yyyy' }}</td>
                  <td class="text-center">
                    <span class="badge" [ngClass]="batch.daysRemaining <= 30 ? 'badge-danger' : 'badge-warning'">
                      {{ batch.daysRemaining }} ngày
                    </span>
                  </td>
                  <td class="text-center font-mono font-semibold">{{ batch.currentQuantity }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <ng-template #noExpiring>
            <div class="empty-state">
              <i class="fa-solid fa-circle-check text-success" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
              <p class="text-success">Không có lô thuốc nào cận hạn sử dụng dưới 90 ngày.</p>
            </div>
          </ng-template>
        </div>
      </div>

      <!-- Recent Orders -->
      <div class="card" style="margin-top: 2rem; border-top: 3px solid var(--primary); padding: 1.5rem 2rem;">
        <h3 class="card-title" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <span><i class="fa-solid fa-receipt text-primary"></i> Nhật ký bán hàng hôm nay</span>
          <button (click)="loadRecentOrders()" class="btn btn-outline-primary btn-xs">
            <i class="fa-solid fa-rotate"></i> Tải lại
          </button>
        </h3>
        
        <div class="table-responsive" *ngIf="recentOrders.length > 0; else noOrders">
          <table class="table">
            <thead>
              <tr>
                <th>Mã hóa đơn</th>
                <th>Ngày tạo</th>
                <th>Khách hàng / CRM</th>
                <th class="text-right">Tổng tiền</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let order of recentOrders">
                <td class="font-semibold font-mono text-primary">{{ order.orderCode }}</td>
                <td class="font-mono" style="font-size: 0.85rem;">{{ order.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                <td>
                  <div *ngIf="order.customerName; else walkIn">
                    <span class="font-semibold" style="display: block;">{{ order.customerName }}</span>
                    <span class="text-secondary font-mono" style="font-size: 0.78rem;">{{ order.customerPhone }}</span>
                  </div>
                  <ng-template #walkIn><span class="text-secondary">Khách vãng lai</span></ng-template>
                </td>
                <td class="text-right font-semibold font-mono text-success">{{ order.totalAmount | number:'1.0-0' }}đ</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <ng-template #noOrders>
          <div class="empty-state">
            <i class="fa-solid fa-receipt" style="font-size: 2rem; color: var(--text-secondary); margin-bottom: 0.5rem;"></i>
            <p>Chưa có giao dịch hóa đơn nào được thực hiện hôm nay.</p>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .filter-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 1.25rem 2rem;
    }
    .filter-inputs {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .form-group-horizontal {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .form-group-horizontal .form-label {
      margin: 0;
      white-space: nowrap;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    .stat-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
    }
    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1.25rem;
      box-shadow: var(--shadow-sm);
      transition: transform 0.2s;
    }
    .stat-card:hover {
      transform: translateY(-2px);
    }
    .stat-card .card-icon {
      width: 54px;
      height: 54px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.6rem;
    }
    .stat-card.revenue .card-icon {
      background: rgba(129, 140, 248, 0.1);
      color: #818cf8;
    }
    .stat-card.cost .card-icon {
      background: rgba(244, 63, 94, 0.1);
      color: #f43f5e;
    }
    .stat-card.profit .card-icon {
      background: rgba(52, 211, 153, 0.1);
      color: #34d399;
    }
    .stat-card .card-vals {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .stat-card .card-vals .label {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-secondary);
      letter-spacing: 0.05em;
    }
    .stat-card .card-vals .val {
      font-size: 1.75rem;
      font-weight: 800;
      margin: 0;
    }
    .grid-two-cols {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 1.5rem;
    }
    @media (max-width: 1024px) {
      .grid-two-cols {
        grid-template-columns: 1fr;
      }
    }
    .chart-card {
      display: flex;
      flex-direction: column;
    }
    .chart-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 1rem 0;
    }
    .svg-chart {
      width: 100%;
      height: 240px;
      margin-top: 1rem;
    }
    .chart-bar-hover {
      cursor: pointer;
      transition: fill 0.15s;
    }
    .chart-bar-hover:hover {
      fill: rgba(255, 255, 255, 0.05);
    }
    .chart-legends {
      display: flex;
      justify-content: center;
      gap: 1.5rem;
      margin-top: 1rem;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    .color-box {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }
    .color-box.revenue {
      background: #818cf8;
    }
    .color-box.profit {
      background: #34d399;
    }
    .empty-state {
      padding: 3rem;
      text-align: center;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
    .row-warning {
      background: rgba(239, 68, 68, 0.03) !important;
    }
    .row-danger {
      background: rgba(249, 115, 22, 0.03) !important;
    }
    .badge {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-danger {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    .badge-warning {
      background: rgba(249, 115, 22, 0.1);
      color: #f97316;
      border: 1px solid rgba(249, 115, 22, 0.2);
    }
    .badge-success {
      background: rgba(52, 211, 153, 0.1);
      color: #34d399;
      border: 1px solid rgba(52, 211, 153, 0.2);
    }
  `]
})
export class DashboardComponent implements OnInit {
  startDate: string;
  endDate: string;
  reportSummary: ReportSummaryDto | null = null;
  topProducts: TopProductDto[] = [];
  alerts: SmartAlertsResponse | null = null;
  isLoading = false;
  isSyncing = false;
  recentOrders: OrderDto[] = [];

  constructor(
    private reportService: ReportService,
    private productService: ProductService,
    private orderService: OrderService
  ) {
    // Default range: last 30 days
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);

    this.endDate = this.formatDate(end);
    this.startDate = this.formatDate(start);
  }

  ngOnInit(): void {
    this.loadReports();
    this.loadAlerts();
    this.loadRecentOrders();
  }

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  loadReports(): void {
    if (!this.startDate || !this.endDate) return;
    this.isLoading = true;

    this.reportService.getDashboardReport(this.startDate, this.endDate).subscribe({
      next: (summary) => {
        this.reportSummary = summary;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });

    this.reportService.getTopSelling(this.startDate, this.endDate, 10).subscribe({
      next: (products) => {
        this.topProducts = products;
      }
    });
  }

  loadAlerts(): void {
    this.productService.getAlerts().subscribe({
      next: (res) => {
        this.alerts = res;
      }
    });
  }

  loadRecentOrders(): void {
    this.orderService.getRecent(10).subscribe({
      next: (orders) => {
        this.recentOrders = orders;
      }
    });
  }



  // Helper methods to build responsive SVG charts
  getMaxDailyVal(): number {
    if (!this.reportSummary || this.reportSummary.dailyStats.length === 0) return 100000;
    const maxRev = Math.max(...this.reportSummary.dailyStats.map(d => d.revenue));
    return maxRev > 0 ? maxRev * 1.15 : 100000;
  }

  getDayX(index: number): number {
    if (!this.reportSummary) return 50;
    const count = this.reportSummary.dailyStats.length;
    const widthAvailable = 500;
    const spacing = widthAvailable / Math.max(count, 1);
    return 60 + (index * spacing);
  }

  getDayRevenueHeight(rev: number): number {
    const max = this.getMaxDailyVal();
    return (rev / max) * 170; // Map to max SVG bar height
  }

  getDayProfitHeight(prof: number): number {
    const max = this.getMaxDailyVal();
    return (Math.max(prof, 0) / max) * 170;
  }
}
