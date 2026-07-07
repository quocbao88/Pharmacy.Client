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
          <div class="filter-actions" style="display: flex; gap: 0.5rem; align-items: center; width: 100%;">
            <button (click)="setTodayFilter()" class="btn btn-secondary btn-sm" [class.btn-active]="currentFilterMode === 'today'">
              Hôm nay
            </button>
            <button (click)="setMonthFilter()" class="btn btn-secondary btn-sm" [class.btn-active]="currentFilterMode === 'month'">
              Tháng này
            </button>
            <button (click)="clearDateFilter()" class="btn btn-secondary btn-sm" [class.btn-active]="currentFilterMode === 'all'">
              Tất cả
            </button>
            <button (click)="exportToCsv()" class="btn btn-outline-primary btn-sm" style="margin-left: auto;">
              <i class="fa-solid fa-file-csv"></i> Xuất báo cáo CSV
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
                <th>Trạng thái</th>
                <th class="text-right">Tổng tiền</th>
                <th class="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let order of orders" [style.opacity]="order.status === 'Cancelled' ? '0.6' : '1'">
                <td class="font-bold font-mono text-primary text-nowrap">
                  <span [style.text-decoration]="order.status === 'Cancelled' ? 'line-through' : 'none'">{{ order.orderCode }}</span>
                </td>
                <td class="font-mono text-secondary text-nowrap">{{ order.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                <td>{{ order.staffName || 'Dược sĩ' }}</td>
                <td>
                  <span class="font-semibold" [style.text-decoration]="order.status === 'Cancelled' ? 'line-through' : 'none'">{{ order.customerName || 'Khách vãng lai' }}</span>
                  <span *ngIf="order.customerPhone" class="phone-tag font-mono">({{ order.customerPhone }})</span>
                </td>
                <td>
                  <span class="method-badge" [class.badge-cash]="order.paymentMethod === 'Cash'" [class.badge-transfer]="order.paymentMethod === 'Transfer'">
                    {{ order.paymentMethod === 'Cash' ? 'Tiền mặt' : 'Chuyển khoản' }}
                  </span>
                </td>
                <td>
                  <span class="status-badge" [class.badge-success]="order.status !== 'Cancelled'" [class.badge-danger]="order.status === 'Cancelled'">
                    {{ order.status === 'Cancelled' ? 'Đã hủy' : 'Hoàn thành' }}
                  </span>
                </td>
                <td class="text-right font-mono font-bold text-nowrap" [style.text-decoration]="order.status === 'Cancelled' ? 'line-through' : 'none'">{{ order.totalAmount | number:'1.0-0' }}đ</td>
                <td class="text-right text-nowrap">
                  <button (click)="printOrder(order); $event.stopPropagation()" class="btn btn-outline-secondary btn-sm" style="margin-right: 0.35rem;" title="In hóa đơn">
                    <i class="fa-solid fa-print"></i> In
                  </button>
                  <button (click)="openDetailModal(order)" class="btn btn-secondary btn-sm" style="margin-right: 0.35rem;">
                    <i class="fa-solid fa-eye"></i> Chi tiết
                  </button>
                  <button *ngIf="order.status !== 'Cancelled'" (click)="cancelOrder(order); $event.stopPropagation()" class="btn btn-outline-danger btn-sm">
                    <i class="fa-solid fa-ban"></i> Hủy
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
          <!-- Cancelled alert banner -->
          <div *ngIf="selectedOrder.status === 'Cancelled'" class="alert alert-danger" style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; border: 1px solid rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.05); border-radius: 8px; padding: 1rem 1.25rem;">
            <i class="fa-solid fa-circle-exclamation" style="font-size: 1.25rem; color: #ef4444;"></i>
            <span style="color: #f87171;"><strong>ĐƠN HÀNG ĐÃ BỊ HỦY.</strong> Số lượng thuốc của hóa đơn này đã được hoàn trả lại kho hệ thống và điểm thưởng CRM đã được hoàn trừ.</span>
          </div>

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
            <div class="meta-item">
              <span class="label">Trạng thái:</span>
              <span class="val font-semibold" [class.text-danger]="selectedOrder.status === 'Cancelled'" [class.text-success]="selectedOrder.status !== 'Cancelled'">
                {{ selectedOrder.status === 'Cancelled' ? 'Đã hủy đơn' : 'Hoàn thành' }}
              </span>
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
                <tr *ngFor="let item of selectedOrder.details" [style.text-decoration]="selectedOrder.status === 'Cancelled' ? 'line-through' : 'none'">
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
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;" [style.text-decoration]="selectedOrder.status === 'Cancelled' ? 'line-through' : 'none'">
                <span class="text-secondary">Cộng tiền thuốc:</span>
                <span class="font-mono">{{ selectedOrder.totalAmount + selectedOrder.discountAmount | number:'1.0-0' }}đ</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;" *ngIf="selectedOrder.discountAmount > 0" [style.text-decoration]="selectedOrder.status === 'Cancelled' ? 'line-through' : 'none'">
                <span class="text-secondary">Chiết khấu:</span>
                <span class="font-mono text-danger">-{{ selectedOrder.discountAmount | number:'1.0-0' }}đ</span>
              </div>
              <div style="border-top: 1px dashed var(--border-color); margin: 0.75rem 0; padding-top: 0.75rem; display: flex; justify-content: space-between;">
                <strong class="text-heading">TỔNG THANH TOÁN:</strong>
                <strong class="font-mono text-success" [style.color]="selectedOrder.status === 'Cancelled' ? 'var(--text-secondary)' : 'var(--success)'" [style.text-decoration]="selectedOrder.status === 'Cancelled' ? 'line-through' : 'none'" style="font-size: 1.25rem;">
                  {{ selectedOrder.totalAmount | number:'1.0-0' }}đ
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer" style="margin-top: 2rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; gap: 0.5rem;">
            <button *ngIf="selectedOrder.status !== 'Cancelled'" (click)="cancelOrder(selectedOrder)" class="btn btn-danger btn-sm">
              <i class="fa-solid fa-ban"></i> Hủy đơn hàng này
            </button>
            <button (click)="printOrder(selectedOrder)" class="btn btn-outline-primary btn-sm">
              <i class="fa-solid fa-print"></i> In hóa đơn
            </button>
          </div>
          <button (click)="selectedOrder = null" class="btn btn-secondary">Đóng</button>
        </div>
      </div>
    </div>

    <!-- Hidden Printable Receipt -->
    <div id="print-section" *ngIf="printTargetOrder">
      <div style="width: 80mm; font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.4; color: #000; padding: 10px; background: #fff; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 10px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: bold; text-transform: uppercase;">NHÀ THUỐC TTYT SÀI ĐỒNG</h3>
          <p style="margin: 2px 0;">ĐC: Sài Đồng, Long Biên, Hà Nội</p>
          <p style="margin: 2px 0;">SĐT: 0987.654.321</p>
          <h4 style="margin: 10px 0 5px 0; font-size: 14px; font-weight: bold;">HÓA ĐƠN BÁN LẺ</h4>
          <p style="margin: 2px 0; font-size: 11px;">Mã HĐ: {{ printTargetOrder.orderCode }}</p>
          <p style="margin: 2px 0; font-size: 11px;">Ngày: {{ printTargetOrder.createdAt | date:'dd/MM/yyyy HH:mm:ss' }}</p>
          <p style="margin: 2px 0; font-weight: bold; color: red;" *ngIf="printTargetOrder.status === 'Cancelled'">*** ĐƠN HÀNG ĐÃ HỦY ***</p>
        </div>
        
        <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
        
        <div style="margin-bottom: 10px; font-size: 11px;">
          <p style="margin: 3px 0;"><strong>Khách hàng:</strong> {{ printTargetOrder.customerName || 'Khách vãng lai' }}</p>
          <p style="margin: 3px 0;" *ngIf="printTargetOrder.customerPhone"><strong>SĐT:</strong> {{ printTargetOrder.customerPhone }}</p>
          <p style="margin: 3px 0;"><strong>Người bán:</strong> {{ printTargetOrder.staffName || 'Dược sĩ' }}</p>
          <p style="margin: 3px 0;" *ngIf="printTargetOrder.notes"><strong>Ghi chú:</strong> {{ printTargetOrder.notes }}</p>
        </div>
        
        <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px dashed #000;">
              <th style="padding: 3px 0;">Tên thuốc</th>
              <th style="text-align: center; padding: 3px 0;">SL</th>
              <th style="text-align: right; padding: 3px 0;">Đơn giá</th>
              <th style="text-align: right; padding: 3px 0;">T.Tiền</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of printTargetOrder.details">
              <td style="padding: 4px 0; word-break: break-all;">
                {{ item.productName }}
                <span style="display: block; font-size: 9px; color: #555;">Lô: {{ item.batchNumber }}</span>
              </td>
              <td style="text-align: center; padding: 4px 0;">{{ item.quantity }} {{ item.soldUnit || item.unit }}</td>
              <td style="text-align: right; padding: 4px 0;">{{ item.unitPrice | number:'1.0-0' }}đ</td>
              <td style="text-align: right; padding: 4px 0;">{{ item.subtotal | number:'1.0-0' }}đ</td>
            </tr>
          </tbody>
        </table>
        
        <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
        
        <div style="font-size: 11px;">
          <div style="display: flex; justify-content: space-between; margin: 3px 0;">
            <span>Cộng tiền hàng:</span>
            <span>{{ (printTargetOrder.totalAmount || 0) + (printTargetOrder.discountAmount || 0) | number:'1.0-0' }}đ</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 3px 0;" *ngIf="printTargetOrder.discountAmount">
            <span>Chiết khấu:</span>
            <span>-{{ printTargetOrder.discountAmount | number:'1.0-0' }}đ</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 3px 0; font-weight: bold; font-size: 12px;">
            <span>TỔNG CẦN THANH TOÁN:</span>
            <span>{{ printTargetOrder.totalAmount | number:'1.0-0' }}đ</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 3px 0;">
            <span>Hình thức TT:</span>
            <span>{{ printTargetOrder.paymentMethod === 'Cash' ? 'Tiền mặt' : 'Chuyển khoản' }}</span>
          </div>
        </div>
        
        <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
        
        <div style="text-align: center; font-size: 10px; margin-top: 10px;">
          <p style="margin: 2px 0; font-style: italic;">Cảm ơn Quý khách. Hẹn gặp lại!</p>
          <p style="margin: 2px 0;">Thiết kế bởi TTYT Sài Đồng</p>
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
    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.6rem;
      font-size: 0.75rem;
      font-weight: 700;
      border-radius: 4px;
    }
    .badge-success {
      background: rgba(16, 185, 129, 0.12);
      color: #10b981;
    }
    .badge-danger {
      background: rgba(239, 68, 68, 0.12);
      color: #ef4444;
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
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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
    #print-section {
      display: none;
    }
    @media print {
      body * {
        visibility: hidden !important;
      }
      #print-section, #print-section * {
        visibility: visible !important;
      }
      #print-section {
        display: block !important;
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        background: white !important;
        margin: 0 !important;
        padding: 0 !important;
      }
    }
  `]
})
export class OrdersComponent implements OnInit {
  orders: OrderDto[] = [];
  selectedOrder: OrderDto | null = null;
  printTargetOrder: OrderDto | null = null;
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
    let activeOrdersCount = 0;

    for (const o of this.orders) {
      if (o.status === 'Cancelled') continue;

      rev += o.totalAmount;
      for (const d of o.details) {
        qty += d.quantity;
        prof += (d.unitPrice - d.costPrice) * d.quantity;
      }
      // Apply order-level discount subtraction to profit proportionally or directly
      // since the total profit matches the sum of line item profits minus overall discount:
      prof -= o.discountAmount;
      activeOrdersCount++;
    }

    this.stats.revenue = rev;
    this.stats.profit = prof < 0 ? 0 : prof;
    this.stats.orderCount = activeOrdersCount;
    this.stats.totalMedicines = qty;
  }

  openDetailModal(order: OrderDto): void {
    this.selectedOrder = order;
  }

  cancelOrder(order: OrderDto): void {
    const totalItems = order.details.reduce((sum, item) => sum + item.quantity, 0);
    const msg = `Bạn có chắc chắn muốn hủy đơn hàng ${order.orderCode}?\nHành động này sẽ cộng hoàn lại ${totalItems} sản phẩm thuốc vào kho hệ thống và trừ lại điểm tích lũy của khách hàng (nếu có).`;
    
    if (confirm(msg)) {
      this.orderService.cancelOrder(order.id).subscribe({
        next: () => {
          alert('Hủy đơn hàng thành công! Số lượng tồn kho thuốc đã được cập nhật hoàn lại.');
          this.loadOrders();
          this.selectedOrder = null; // Close detail modal if open
        },
        error: (err) => {
          alert(err.error?.error || 'Có lỗi xảy ra khi hủy đơn hàng.');
        }
      });
    }
  }

  printOrder(order: OrderDto): void {
    this.printTargetOrder = order;
    setTimeout(() => {
      window.print();
    }, 100);
  }

  exportToCsv(): void {
    if (this.orders.length === 0) {
      alert('Không có dữ liệu đơn hàng để xuất báo cáo.');
      return;
    }

    const headers = [
      'Mã hóa đơn',
      'Thời gian',
      'Người bán',
      'Khách hàng',
      'Số điện thoại',
      'Hình thức thanh toán',
      'Trạng thái',
      'Giảm giá (đ)',
      'Tổng tiền (đ)'
    ];

    const rows = this.orders.map(o => [
      o.orderCode,
      this.formatDateForCsv(new Date(o.createdAt)),
      o.staffName || 'Dược sĩ',
      o.customerName || 'Khách vãng lai',
      o.customerPhone || '',
      o.paymentMethod === 'Cash' ? 'Tiền mặt' : 'Chuyển khoản',
      o.status === 'Cancelled' ? 'Đã hủy' : 'Hoàn thành',
      o.discountAmount.toString(),
      o.totalAmount.toString()
    ]);

    let csvContent = '\uFEFF' + headers.join(',') + '\n';
    rows.forEach(row => {
      const escapedRow = row.map(val => {
        const cleanVal = val ? val.replace(/"/g, '""') : '';
        return `"${cleanVal}"`;
      });
      csvContent += escapedRow.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const startStr = this.startDate ? `_Tu_${this.startDate}` : '';
    const endStr = this.endDate ? `_Den_${this.endDate}` : '';
    link.setAttribute('href', url);
    link.setAttribute('download', `Bao_cao_don_hang${startStr}${endStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private formatDateForCsv(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }

  private formatDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
