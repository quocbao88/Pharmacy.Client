import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService, OrderDto, OrderDetailDto } from '../../core/services/order.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="orders-container">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="fa-solid fa-file-invoice-dollar text-primary"></i> Quản lý đơn hàng</h2>
          <p class="page-subtitle">Xem lịch sử bán hàng, liên thông Cổng dược và thống kê doanh thu</p>
        </div>
      </div>

      <!-- Filter Controls Bar -->
      <div class="card filter-card">
        <div class="filter-row">
          <div class="filter-group">
            <label class="filter-label">Từ ngày</label>
            <input type="date" [(ngModel)]="startDate" (change)="loadOrders()" class="form-control" />
          </div>
          <div class="filter-group">
            <label class="filter-label">Đến ngày</label>
            <input type="date" [(ngModel)]="endDate" (change)="loadOrders()" class="form-control" />
          </div>
          <div class="filter-actions">
            <button (click)="setTodayFilter()" class="btn btn-secondary btn-sm" [class.btn-active]="currentFilterMode === 'today'">
              Hôm nay
            </button>
            <button (click)="setMonthFilter()" class="btn btn-secondary btn-sm" [class.btn-active]="currentFilterMode === 'month'">
              Tháng này
            </button>
            <button (click)="clearDateFilter()" class="btn btn-secondary btn-sm" [class.btn-active]="currentFilterMode === 'all'">
              Tất cả
            </button>
          </div>
        </div>
      </div>

      <!-- Statistics Dashboard Group -->
      <div class="stats-grid">
        <!-- Card 1: Revenue -->
        <div class="card stat-card">
          <div class="stat-info">
            <span class="stat-label">Tổng doanh thu</span>
            <span class="stat-value font-mono text-success">{{ stats.revenue | number:'1.0-0' }}đ</span>
          </div>
          <div class="stat-icon success">
            <i class="fa-solid fa-hand-holding-dollar"></i>
          </div>
        </div>

        <!-- Card 2: Profit -->
        <div class="card stat-card">
          <div class="stat-info">
            <span class="stat-label">Lợi nhuận gộp</span>
            <span class="stat-value font-mono text-secondary">{{ stats.profit | number:'1.0-0' }}đ</span>
          </div>
          <div class="stat-icon secondary">
            <i class="fa-solid fa-chart-line"></i>
          </div>
        </div>

        <!-- Card 3: Total Orders -->
        <div class="card stat-card">
          <div class="stat-info">
            <span class="stat-label">Tổng số đơn</span>
            <span class="stat-value font-mono">{{ stats.orderCount | number }} đơn</span>
          </div>
          <div class="stat-icon primary">
            <i class="fa-solid fa-receipt"></i>
          </div>
        </div>

        <!-- Card 4: Quantity Sold -->
        <div class="card stat-card">
          <div class="stat-info">
            <span class="stat-label">Số lượng thuốc bán</span>
            <span class="stat-value font-mono text-warning">{{ stats.totalMedicines | number }} viên/hộp</span>
          </div>
          <div class="stat-icon warning">
            <i class="fa-solid fa-pills"></i>
          </div>
        </div>
      </div>

      <!-- Orders List Table -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-container" *ngIf="orders.length > 0; else emptyState">
          <table class="table">
            <thead>
              <tr>
                <th>Mã hóa đơn</th>
                <th>Thời gian</th>
                <th>Người bán</th>
                <th>Khách hàng</th>
                <th>Phương thức</th>
                <th class="text-right">Tổng tiền</th>
                <th class="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let order of orders">
                <td class="font-bold font-mono text-primary">{{ order.orderCode }}</td>
                <td class="font-mono text-secondary">{{ order.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                <td>{{ order.staffName || 'Dược sĩ' }}</td>
                <td>
                  <span class="font-semibold">{{ order.customerName || 'Khách vãng lai' }}</span>
                  <span *ngIf="order.customerPhone" class="phone-tag font-mono">({{ order.customerPhone }})</span>
                </td>
                <td>
                  <span class="method-badge" [class.badge-cash]="order.paymentMethod === 'Cash'" [class.badge-transfer]="order.paymentMethod === 'Transfer'">
                    {{ order.paymentMethod === 'Cash' ? 'Tiền mặt' : 'Chuyển khoản' }}
                  </span>
                </td>
                <td class="text-right font-mono font-bold">{{ order.totalAmount | number:'1.0-0' }}đ</td>
                <td class="text-right">
                  <button (click)="openDetailModal(order)" class="btn btn-secondary btn-sm">
                    <i class="fa-solid fa-eye"></i> Chi tiết
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <ng-template #emptyState>
          <div class="empty-state" style="padding: 4rem 2rem;">
            <i class="fa-solid fa-folder-open" style="font-size: 4rem; color: var(--text-muted); margin-bottom: 1.5rem;"></i>
            <h3>Không có dữ liệu đơn hàng</h3>
            <p class="text-secondary" style="margin-top: 0.5rem;">Không tìm thấy đơn hàng nào trong khoảng thời gian đã chọn.</p>
          </div>
        </ng-template>
      </div>
    </div>

    <!-- Modal: Order Detail -->
    <div class="modal-overlay" *ngIf="selectedOrder" (click)="selectedOrder = null">
      <div class="modal-content" (click)="$event.stopPropagation()" style="max-width: 950px;">
        <div class="modal-header">
          <h3><i class="fa-solid fa-file-invoice text-primary"></i> Chi tiết hóa đơn: {{ selectedOrder.orderCode }}</h3>
          <button class="modal-close" (click)="selectedOrder = null">&times;</button>
        </div>

        <div class="modal-body">
          <!-- Metadata Info Row -->
          <div class="order-detail-meta-grid">
            <div class="meta-item">
              <span class="label">Người lập đơn:</span>
              <span class="val font-semibold">{{ selectedOrder.staffName || 'Dược sĩ' }}</span>
            </div>
            <div class="meta-item">
              <span class="label">Khách hàng:</span>
              <span class="val font-semibold">{{ selectedOrder.customerName || 'Khách vãng lai' }}</span>
            </div>
            <div class="meta-item" *ngIf="selectedOrder.customerPhone">
              <span class="label">Số điện thoại:</span>
              <span class="val font-mono">{{ selectedOrder.customerPhone }}</span>
            </div>
            <div class="meta-item">
              <span class="label">Thời gian lập:</span>
              <span class="val font-mono">{{ selectedOrder.createdAt | date:'dd/MM/yyyy HH:mm:ss' }}</span>
            </div>
          </div>



          <!-- Items Table -->
          <h4 style="margin-top: 1.5rem; margin-bottom: 0.75rem; color: var(--text-heading);">Danh sách thuốc đã bán</h4>
          <div class="table-container" style="border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; background: rgba(0,0,0,0.1);">
            <table class="table">
              <thead>
                <tr>
                  <th>Tên thuốc</th>
                  <th>Số Lô (Batch)</th>
                  <th class="text-center">Số lượng</th>
                  <th class="text-right">Giá bán</th>
                  <th class="text-right">Giá vốn</th>
                  <th class="text-right">Thành tiền</th>
                  <th class="text-right text-success">Lợi nhuận</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of selectedOrder.details">
                  <td class="font-semibold">{{ item.productName }}</td>
                  <td class="font-mono text-secondary">{{ item.batchNumber }}</td>
                  <td class="text-center font-mono">{{ item.quantity }} {{ item.soldUnit || item.unit }}</td>
                  <td class="text-right font-mono">{{ item.unitPrice | number:'1.0-0' }}đ</td>
                  <td class="text-right font-mono text-secondary">{{ item.costPrice | number:'1.0-0' }}đ</td>
                  <td class="text-right font-mono font-semibold">{{ item.subtotal | number:'1.0-0' }}đ</td>
                  <td class="text-right font-mono text-success font-semibold">
                    {{ (item.unitPrice - item.costPrice) * item.quantity | number:'1.0-0' }}đ
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Summary -->
          <div style="display: grid; grid-template-columns: 1fr; margin-top: 2rem;">
            <!-- Financial Summary -->
            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 8px; padding: 1.25rem;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span class="text-secondary">Cộng tiền thuốc:</span>
                <span class="font-mono">{{ selectedOrder.totalAmount + selectedOrder.discountAmount | number:'1.0-0' }}đ</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;" *ngIf="selectedOrder.discountAmount > 0">
                <span class="text-secondary">Chiết khấu:</span>
                <span class="font-mono text-danger">-{{ selectedOrder.discountAmount | number:'1.0-0' }}đ</span>
              </div>
              <div style="border-top: 1px dashed var(--border-color); margin: 0.75rem 0; padding-top: 0.75rem; display: flex; justify-content: space-between;">
                <strong class="text-heading">TỔNG THANH TOÁN:</strong>
                <strong class="font-mono text-success" style="font-size: 1.25rem;">{{ selectedOrder.totalAmount | number:'1.0-0' }}đ</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer" style="margin-top: 2rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem; display: flex; justify-content: flex-end;">
          <button (click)="selectedOrder = null" class="btn btn-secondary">Đóng</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .orders-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .filter-card {
      padding: 1.25rem 1.75rem;
    }
    .filter-row {
      display: flex;
      align-items: flex-end;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .filter-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .filter-actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .btn-active {
      background: var(--primary-light) !important;
      border-color: var(--primary) !important;
      color: var(--primary) !important;
    }
    .phone-tag {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin-left: 0.35rem;
    }
    .method-badge {
      display: inline-block;
      padding: 0.25rem 0.6rem;
      font-size: 0.75rem;
      font-weight: 700;
      border-radius: 4px;
    }
    .badge-cash {
      background: rgba(16, 185, 129, 0.12);
      color: #10b981;
    }
    .badge-transfer {
      background: rgba(59, 130, 246, 0.12);
      color: #3b82f6;
    }
    .sync-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.6rem;
      font-size: 0.75rem;
      font-weight: 700;
      border-radius: 4px;
    }
    .sync-badge.synced {
      background: rgba(16, 185, 129, 0.12);
      color: #10b981;
    }
    .sync-badge.failed {
      background: rgba(239, 68, 68, 0.12);
      color: #ef4444;
    }
    .sync-badge.pending {
      background: rgba(245, 158, 11, 0.12);
      color: #f59e0b;
    }
    .btn-sync-retry {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      margin-left: 0.5rem;
      font-size: 0.95rem;
      transition: color 0.15s;
    }
    .btn-sync-retry:hover {
      color: var(--primary);
    }
    .order-detail-meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      background: rgba(255,255,255,0.01);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .meta-item .label {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }
    .meta-item .val {
      font-size: 0.95rem;
      color: var(--text-heading);
    }
    .prescription-alert-box {
      border: 1px solid rgba(244, 63, 94, 0.2);
      background: rgba(244, 63, 94, 0.05);
      border-radius: 8px;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .rx-header {
      font-size: 0.95rem;
      color: #fda4af;
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .rx-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 0.75rem;
      font-size: 0.85rem;
    }
    .stat-icon.warning {
      background-color: rgba(245, 158, 11, 0.15);
      color: var(--warning);
    }
  `]
})
export class OrdersComponent implements OnInit {
  orders: OrderDto[] = [];
  selectedOrder: OrderDto | null = null;
  startDate: string = '';
  endDate: string = '';
  currentFilterMode: 'today' | 'month' | 'all' = 'month';

  stats = {
    revenue: 0,
    profit: 0,
    orderCount: 0,
    totalMedicines: 0
  };

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.setMonthFilter();
  }

  setTodayFilter(): void {
    const today = new Date();
    this.startDate = this.formatDate(today);
    this.endDate = this.formatDate(today);
    this.currentFilterMode = 'today';
    this.loadOrders();
  }

  setMonthFilter(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    this.startDate = this.formatDate(firstDay);
    this.endDate = this.formatDate(today);
    this.currentFilterMode = 'month';
    this.loadOrders();
  }

  clearDateFilter(): void {
    this.startDate = '';
    this.endDate = '';
    this.currentFilterMode = 'all';
    this.loadOrders();
  }

  loadOrders(): void {
    this.orderService.getOrders(this.startDate || undefined, this.endDate || undefined).subscribe({
      next: (data) => {
        this.orders = data;
        this.calculateStats();
      },
      error: (err) => {
        console.error('Lỗi tải danh sách đơn hàng:', err);
      }
    });
  }

  calculateStats(): void {
    let rev = 0;
    let prof = 0;
    let qty = 0;

    for (const o of this.orders) {
      rev += o.totalAmount;
      for (const d of o.details) {
        qty += d.quantity;
        prof += (d.unitPrice - d.costPrice) * d.quantity;
      }
      // Apply order-level discount subtraction to profit proportionally or directly
      // since the total profit matches the sum of line item profits minus overall discount:
      prof -= o.discountAmount;
    }

    this.stats.revenue = rev;
    this.stats.profit = prof < 0 ? 0 : prof;
    this.stats.orderCount = this.orders.length;
    this.stats.totalMedicines = qty;
  }



  openDetailModal(order: OrderDto): void {
    this.selectedOrder = order;
  }

  private formatDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
