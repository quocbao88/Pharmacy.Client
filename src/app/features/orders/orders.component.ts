import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService, OrderDto, OrderDetailDto, ReturnOrderItem } from '../../core/services/order.service';

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
          <p class="page-subtitle">Tìm đơn nhanh, xem hóa đơn và xử lý hủy / trả hàng có lý do</p>
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

      <div class="card order-search-bar">
        <label>Tìm đơn hàng
          <input [(ngModel)]="searchQuery" class="form-control" placeholder="Mã đơn, tên khách, số điện thoại..." aria-label="Tìm đơn hàng" />
        </label>
        <label>Trạng thái
          <select [(ngModel)]="statusFilter" class="form-control" aria-label="Lọc trạng thái đơn">
            <option value="">Tất cả trạng thái</option>
            <option value="Completed">Hoàn tất</option>
            <option value="PartiallyReturned">Trả một phần</option>
            <option value="Returned">Đã trả hết</option>
            <option value="Cancelled">Đã hủy</option>
          </select>
        </label>
        <button class="btn btn-secondary" (click)="loadOrders()" [disabled]="isLoading">Tải lại</button>
      </div>
      <p *ngIf="isLoading" role="status">Đang tải đơn hàng...</p>
      <p *ngIf="loadError" class="text-danger" role="alert">{{ loadError }}</p>
      <p class="text-secondary">{{ visibleOrders.length }} đơn phù hợp · Số tiền hiển thị đã trừ các khoản hoàn được ghi nhận.</p>

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
            <span class="stat-value font-mono text-warning">{{ stats.totalMedicines | number }} đơn vị cơ bản</span>
          </div>
          <div class="stat-icon warning">
            <i class="fa-solid fa-pills"></i>
          </div>
        </div>
      </div>

      <!-- Orders List Table -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-container" *ngIf="visibleOrders.length > 0; else emptyState">
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
              <tr *ngFor="let order of visibleOrders" [style.opacity]="getOrderOpacity(order.status)">
                <td class="font-bold font-mono text-primary text-nowrap">
                  <span [style.text-decoration]="getTextDecoration(order.status)">{{ order.orderCode }}</span>
                </td>
                <td class="font-mono text-secondary text-nowrap">{{ order.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                <td>{{ order.staffName || 'Dược sĩ' }}</td>
                <td>
                  <span class="font-semibold" [style.text-decoration]="getTextDecoration(order.status)">{{ order.customerName || order.guestName || 'Khách vãng lai' }}</span>
                  <span *ngIf="order.customerPhone" class="phone-tag font-mono">({{ order.customerPhone }})</span>
                </td>
                <td>
                  <span class="method-badge" [class.badge-cash]="order.paymentMethod === 'Cash'" [class.badge-transfer]="order.paymentMethod === 'Transfer'">
                    {{ getPaymentLabel(order.paymentMethod) }}
                  </span>
                </td>
                <td>
                  <span class="status-badge" [class.badge-success]="order.status !== 'Cancelled'" [class.badge-danger]="order.status === 'Cancelled'">
                    {{ getStatusLabel(order.status) }}
                  </span>
                </td>
                <td class="text-right font-mono font-bold text-nowrap" [style.text-decoration]="getTextDecoration(order.status)">{{ netAmount(order) | number:'1.0-0' }}đ</td>
                <td class="text-right text-nowrap">
                  <button (click)="printOrder(order); $event.stopPropagation()" class="btn btn-outline-secondary btn-sm" style="margin-right: 0.35rem;" title="In hóa đơn">
                    <i class="fa-solid fa-print"></i> In
                  </button>
                  <button *ngIf="canReturn(order)" (click)="openReturn(order)" class="btn btn-outline-primary btn-sm" style="margin-right:.35rem">Trả hàng</button>
                  <button (click)="openDetailModal(order)" class="btn btn-secondary btn-sm" style="margin-right: 0.35rem;">
                    <i class="fa-solid fa-eye"></i> Chi tiết
                  </button>
                  <button *ngIf="order.status === 'Completed'" (click)="cancelOrder(order); $event.stopPropagation()" class="btn btn-outline-danger btn-sm">
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
                {{ getStatusLabel(selectedOrder.status, 'Đã hủy đơn') }}
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
                <tr *ngFor="let item of selectedOrder.details" [style.text-decoration]="getTextDecoration(selectedOrder.status)">
                  <td class="font-semibold">{{ item.productName }}</td>
                  <td class="font-mono text-secondary">{{ item.batchNumber }}</td>
                  <td class="text-center font-mono">{{ item.quantity }} {{ item.soldUnit || item.unit }}<small *ngIf="item.returnedQuantity" style="display:block">Đã trả: {{ item.returnedQuantity }}</small></td>
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

          <p *ngIf="selectedOrder.cancellationReason" class="text-danger">Lý do hủy: {{ selectedOrder.cancellationReason }}</p>
          <section *ngIf="selectedOrder.returns?.length" class="return-history">
            <h4>Lịch sử trả hàng</h4>
            <p *ngFor="let record of selectedOrder.returns">{{ record.createdAt | date:'dd/MM/yyyy HH:mm' }} · Hoàn {{ record.refundAmount | number:'1.0-0' }}đ · {{ record.reason }}</p>
          </section>
          <p *ngIf="selectedOrder.refundedAmount">Đã hoàn: {{ selectedOrder.refundedAmount | number:'1.0-0' }}đ · Giá trị còn lại: {{ netAmount(selectedOrder) | number:'1.0-0' }}đ</p>
          <!-- Summary -->
          <div style="display: grid; grid-template-columns: 1fr; margin-top: 2rem;">
            <!-- Financial Summary -->
            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 8px; padding: 1.25rem;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;" [style.text-decoration]="getTextDecoration(selectedOrder.status)">
                <span class="text-secondary">Cộng tiền thuốc:</span>
                <span class="font-mono">{{ selectedOrder.totalAmount + selectedOrder.discountAmount | number:'1.0-0' }}đ</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;" *ngIf="selectedOrder.discountAmount > 0" [style.text-decoration]="getTextDecoration(selectedOrder.status)">
                <span class="text-secondary">Chiết khấu:</span>
                <span class="font-mono text-danger">-{{ selectedOrder.discountAmount | number:'1.0-0' }}đ</span>
              </div>
              <div style="border-top: 1px dashed var(--border-color); margin: 0.75rem 0; padding-top: 0.75rem; display: flex; justify-content: space-between;">
                <strong class="text-heading">TỔNG THANH TOÁN:</strong>
                <strong class="font-mono text-success" [style.color]="getTotalColor(selectedOrder.status)" [style.text-decoration]="getTextDecoration(selectedOrder.status)" style="font-size: 1.25rem;">
                  {{ selectedOrder.totalAmount | number:'1.0-0' }}đ
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer" style="margin-top: 2rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; gap: 0.5rem;">
            <button *ngIf="selectedOrder.status === 'Completed'" (click)="cancelOrder(selectedOrder)" class="btn btn-danger btn-sm">
              <i class="fa-solid fa-ban"></i> Hủy đơn hàng này
            </button>
            <button *ngIf="canReturn(selectedOrder)" (click)="openReturn(selectedOrder)" class="btn btn-primary btn-sm">Trả hàng</button>
            <button (click)="printOrder(selectedOrder)" class="btn btn-outline-primary btn-sm">
              <i class="fa-solid fa-print"></i> In hóa đơn
            </button>
          </div>
          <button (click)="selectedOrder = null" class="btn btn-secondary">Đóng</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" *ngIf="actionOrder" style="z-index:1200">
      <section class="modal-content order-action-dialog" role="dialog" aria-modal="true" aria-labelledby="order-action-title" style="max-width:900px">
        <header class="modal-header">
          <h3 id="order-action-title">{{ actionTitle() }} · {{ actionOrder.orderCode }}</h3>
          <button class="btn btn-secondary" (click)="closeAction()" [disabled]="isSavingAction">Đóng</button>
        </header>
        <p class="text-secondary">Hủy đơn dùng cho giao dịch ghi nhầm. Khách trả thuốc dùng Trả hàng; chọn đúng lượng và tình trạng hàng.</p>
        <div class="table-container" *ngIf="actionMode === 'return'">
          <table class="table"><thead><tr><th>Thuốc / lô</th><th>Còn được trả</th><th>Số lượng trả</th><th>Xử lý hàng</th></tr></thead>
            <tbody><tr *ngFor="let line of returnLines">
              <td>{{ line.detail.productName }}<small style="display:block">Lô {{ line.detail.batchNumber }}</small></td>
              <td>{{ remaining(line.detail) }} {{ line.detail.soldUnit || line.detail.unit }}</td>
              <td><input type="number" min="0" [max]="remaining(line.detail)" [(ngModel)]="line.quantity" [disabled]="isSavingAction" class="form-control" aria-label="Số lượng trả" /></td>
              <td><select [(ngModel)]="line.restock" [disabled]="isSavingAction" class="form-control" aria-label="Xử lý hàng trả"><option [ngValue]="true">Nhập lại đúng lô gốc</option><option [ngValue]="false">Hỏng / không nhập lại kho</option></select></td>
            </tr></tbody>
          </table>
          <p>Số tiền hoàn được tính theo giá đơn gốc sau giảm giá. Hàng không nhập lại kho sẽ không làm tăng tồn.</p>
        </div>
        <p *ngIf="actionMode === 'cancel'">Đơn sẽ được hủy và hoàn lại toàn bộ số lượng về đúng lô gốc.</p>
        <label for="order-action-reason">Lý do bắt buộc</label>
        <textarea id="order-action-reason" [(ngModel)]="actionReason" [disabled]="isSavingAction" minlength="3" maxlength="500" class="form-control" placeholder="Nhập lý do hủy / trả hàng..."></textarea>
        <p *ngIf="actionError" class="text-danger" role="alert">{{ actionError }}</p>
        <footer class="modal-footer"><button class="btn btn-secondary" (click)="closeAction()" [disabled]="isSavingAction">Quay lại</button><button class="btn btn-primary" (click)="submitAction()" [disabled]="isSavingAction">Xác nhận {{ actionTitle() }}</button></footer>
      </section>
    </div>

    <!-- Hidden Printable Receipt (A4 Portrait Style) -->
    <div id="print-section" *ngIf="printTargetOrder">
      <div style="font-family: 'Times New Roman', Times, serif; color: #000; padding: 20px; background: #fff;">
        
        <!-- Header Section -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="vertical-align: top; width: 100%;">
              <h3 style="margin: 0; font-size: 18px; font-weight: bold; text-transform: uppercase;">TRẠM Y TẾ PHƯỜNG PHÚC LỢI ĐIỂM SÀI ĐỒNG</h3>
              <p style="margin: 4px 0 2px 0; font-size: 13px;">Ngày bán: {{ printTargetOrder.createdAt | date:'dd/MM/yyyy HH:mm' }}</p>
            </td>
          </tr>
        </table>

        <!-- Invoice Title -->
        <div style="text-align: center; margin-bottom: 25px;">
          <h2 style="margin: 0; font-size: 22px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">HÓA ĐƠN BÁN THUỐC</h2>
          <p style="margin: 5px 0 0 0; font-size: 13px; font-style: italic;">Mã hóa đơn: {{ printTargetOrder.orderCode }}</p>
          <div *ngIf="printTargetOrder.status === 'Cancelled'" style="margin-top: 5px; color: red; font-weight: bold; font-size: 14px;">
            *** HÓA ĐƠN NÀY ĐÃ HỦY VÀ HOÀN KHO ***
          </div>
        </div>

        <!-- Customer & Staff Info -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 14px;">
          <tr>
            <td style="padding: 4px 0; width: 60%;">
              <strong>Họ và tên khách hàng:</strong> {{ printTargetOrder.customerName || 'Khách vãng lai' }}
            </td>
            <td style="padding: 4px 0; width: 40%;">
              <strong>Hình thức thanh toán:</strong> {{ getPaymentLabel(printTargetOrder.paymentMethod) }}
            </td>
          </tr>
          <tr>
            <td style="padding: 4px 0;">
              <strong>Số điện thoại:</strong> {{ printTargetOrder.customerPhone || '—' }}
            </td>
            <td style="padding: 4px 0;">
              <strong>Người bán hàng:</strong> {{ printTargetOrder.staffName || 'Dược sĩ' }}
            </td>
          </tr>
          <tr *ngIf="printTargetOrder.prescriptionCode">
            <td style="padding: 4px 0;">
              <strong>Mã đơn thuốc quốc gia:</strong> {{ printTargetOrder.prescriptionCode }}
            </td>
            <td style="padding: 4px 0;">
              <strong>Bác sĩ kê đơn:</strong> {{ printTargetOrder.prescribingDoctor || '—' }}
            </td>
          </tr>
          <tr *ngIf="printTargetOrder.medicalFacility">
            <td colspan="2" style="padding: 4px 0;">
              <strong>Cơ sở y tế:</strong> {{ printTargetOrder.medicalFacility }}
            </td>
          </tr>
          <tr *ngIf="printTargetOrder.diagnostic">
            <td colspan="2" style="padding: 4px 0;">
              <strong>Chẩn đoán:</strong> {{ printTargetOrder.diagnostic }}
            </td>
          </tr>
        </table>

        <!-- Table of Products -->
        <table class="print-only-table" style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px;">
          <thead>
            <tr>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 6%;">STT</th>
              <th style="border: 1px solid #000; padding: 8px;">Tên thuốc / Hoạt chất</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 10%;">ĐVT</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 10%;">Số lượng</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right; width: 15%;">Đơn giá</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right; width: 18%;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of printTargetOrder.details; let idx = index">
              <td style="border: 1px solid #000; padding: 8px; text-align: center;">{{ idx + 1 }}</td>
              <td style="border: 1px solid #000; padding: 8px;">
                <div style="font-weight: bold;">{{ item.productName }}</div>
                <div style="font-size: 11px; color: #333;" *ngIf="item.batchNumber">Số lô: {{ item.batchNumber }}</div>
              </td>
              <td style="border: 1px solid #000; padding: 8px; text-align: center;">{{ item.soldUnit || item.unit }}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: center;">{{ item.quantity }}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">{{ item.unitPrice | number:'1.0-0' }}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">{{ item.subtotal | number:'1.0-0' }}</td>
            </tr>
            
            <!-- Summary calculations inside table -->
            <tr>
              <td colspan="4" style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">Tổng cộng tiền thuốc:</td>
              <td colspan="2" style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">
                {{ (printTargetOrder.totalAmount || 0) + (printTargetOrder.discountAmount || 0) | number:'1.0-0' }}đ
              </td>
            </tr>
            <tr *ngIf="printTargetOrder.discountAmount > 0">
              <td colspan="4" style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold; color: #ff0000;">Chiết khấu giảm giá:</td>
              <td colspan="2" style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold; color: #ff0000;">
                -{{ printTargetOrder.discountAmount | number:'1.0-0' }}đ
              </td>
            </tr>
            <tr>
              <td colspan="4" style="border: 1px solid #000; padding: 8px; text-align: right; font-size: 15px; font-weight: bold; background-color: #f2f2f2;">Tổng tiền thanh toán:</td>
              <td colspan="2" style="border: 1px solid #000; padding: 8px; text-align: right; font-size: 15px; font-weight: bold; background-color: #f2f2f2;">
                {{ printTargetOrder.totalAmount | number:'1.0-0' }}đ
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Amount In Words -->
        <p style="margin: 10px 0; font-size: 14px; font-style: italic;">
          <strong>Tổng số tiền (viết bằng chữ):</strong> {{ getVietnameseWords(printTargetOrder.totalAmount) }}
        </p>

        <!-- Notes and Store Guidelines -->
        <div style="margin-top: 20px; font-size: 12px; line-height: 1.5; border-top: 1px solid #ddd; padding-top: 10px;">
          <strong>Ghi chú:</strong>
          <ul style="margin: 5px 0 0 15px; padding: 0;">
            <li>Quý khách vui lòng kiểm tra kỹ hàng hóa và số lượng trước khi rời khỏi Nhà thuốc.</li>
            <li>Sản phẩm đã mua được đổi/trả trong vòng 24 giờ kể từ ngày mua với hóa đơn kèm theo (điều kiện hàng nguyên vẹn).</li>
            <li *ngIf="printTargetOrder.notes">Ghi chú riêng: {{ printTargetOrder.notes }}</li>
          </ul>
        </div>

        <!-- Signature Section -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 40px; text-align: center; font-size: 14px;">
          <tr>
            <td style="width: 50%; padding-bottom: 75px;">
              <strong>Người mua hàng</strong><br>
              <span style="font-size: 12px; font-style: italic; color: #555;">(Ký, ghi rõ họ tên)</span>
            </td>
            <td style="width: 50%; padding-bottom: 75px;">
              <strong>Người lập hóa đơn</strong><br>
              <span style="font-size: 12px; font-style: italic; color: #555;">(Ký, ghi rõ họ tên)</span>
            </td>
          </tr>
          <tr>
            <td></td>
            <td style="font-weight: bold;">{{ printTargetOrder.staffName || 'Dược sĩ' }}</td>
          </tr>
        </table>

        <!-- Footer greeting -->
        <div style="text-align: center; margin-top: 30px; font-size: 13px; font-style: italic; font-weight: bold; border-top: 1px dashed #000; padding-top: 10px;">
          Xin chân thành cảm ơn Quý khách!
        </div>

      </div>
    </div>
  `,
  styles: [`
    .order-action-dialog { max-height:90dvh; overflow-y:auto; }
    .order-action-dialog input[type=number] { min-width:5rem; }
    .order-action-dialog select { min-width:11rem; }
    @media (max-width:600px) {
      .order-action-dialog { padding:1rem; }
      .order-action-dialog .modal-header { align-items:flex-start; gap:.5rem; }
      .order-action-dialog .table-container { overflow:visible; }
      .order-action-dialog table, .order-action-dialog tbody { display:block; width:100%; }
      .order-action-dialog thead { display:none; }
      .order-action-dialog tr { display:grid; gap:.75rem; border:1px solid var(--border-color); border-radius:8px; padding:1rem; margin:.75rem 0; }
      .order-action-dialog td { display:block; padding:0; border:0; white-space:normal; }
      .order-action-dialog td:nth-child(2)::before { content:'Còn được trả: '; font-weight:600; }
      .order-action-dialog td:nth-child(3)::before { content:'Số lượng trả'; display:block; margin-bottom:.35rem; font-weight:600; }
      .order-action-dialog td:nth-child(4)::before { content:'Xử lý hàng'; display:block; margin-bottom:.35rem; font-weight:600; }
      .order-action-dialog input, .order-action-dialog select { width:100%; min-height:44px; }
      .filter-actions { flex-wrap:wrap; }
    }
    .order-search-bar { display:flex; flex-wrap:wrap; align-items:end; gap:1rem; margin-bottom:1rem; }
    .order-search-bar label:first-child { flex:1; min-width:240px; }
    .order-search-bar label { display:grid; gap:.4rem; }
    .return-history { border-left:3px solid var(--primary); padding:.75rem 1rem; margin-top:1rem; }
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
  searchQuery = '';
  statusFilter = '';
  isLoading = false;
  loadError = '';
  actionOrder: OrderDto | null = null;
  actionMode: 'cancel' | 'return' = 'return';
  actionReason = '';
  actionError = '';
  isSavingAction = false;
  returnLines: Array<{ detail: OrderDetailDto; quantity: number; restock: boolean }> = [];
  private returnRequestId = '';
  private returnFingerprint = '';

  get visibleOrders(): OrderDto[] {
    const query = this.searchQuery.trim().toLocaleLowerCase('vi');
    return this.orders.filter(order => {
      if (this.statusFilter && order.status !== this.statusFilter) return false;
      const text = [order.orderCode, order.customerName, order.guestName, order.customerPhone].join(' ').toLocaleLowerCase('vi');
      return !query || text.includes(query);
    });
  }

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
    if (this.startDate && this.endDate && this.startDate > this.endDate) {
      this.loadError = 'Ngày bắt đầu không được sau ngày kết thúc.';
      return;
    }
    this.isLoading = true;
    this.loadError = '';
    this.orderService.getOrders(this.startDate || undefined, this.endDate || undefined).subscribe({
      next: (data) => {
        this.isLoading = false;
        this.orders = data;
        this.calculateStats();
      },
      error: (err) => {
        this.isLoading = false;
        this.loadError = err.error?.error || 'Không tải được đơn hàng. Hãy thử lại.';
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

      rev += this.netAmount(o);
      prof += this.netAmount(o);
      for (const d of o.details) {
        qty += (d.quantity - (d.restockedQuantity || 0)) * (d.conversionValue || 1);
        prof -= d.costPrice * (d.quantity - (d.restockedQuantity || 0));
      }
      activeOrdersCount++;
    }

    this.stats.revenue = rev;
    this.stats.profit = prof;
    this.stats.orderCount = activeOrdersCount;
    this.stats.totalMedicines = qty;
  }

  openDetailModal(order: OrderDto): void {
    this.selectedOrder = order;
  }

  netAmount(order: OrderDto): number {
    if (order.status === 'Cancelled') return 0;
    return order.totalAmount - (order.refundedAmount || 0);
  }

  remaining(detail: OrderDetailDto): number {
    return detail.quantity - (detail.returnedQuantity || 0);
  }

  canReturn(order: OrderDto): boolean {
    return (order.status === 'Completed' || order.status === 'PartiallyReturned') && order.details.some(detail => this.remaining(detail) > 0);
  }

  actionTitle(): string {
    if (this.actionMode === 'cancel') return 'Hủy đơn';
    return 'Trả hàng';
  }

  cancelOrder(order: OrderDto): void {
    this.openAction(order, 'cancel');
  }

  openReturn(order: OrderDto): void {
    this.openAction(order, 'return');
  }

  private openAction(order: OrderDto, mode: 'cancel' | 'return'): void {
    if (this.isSavingAction) return;
    this.actionOrder = order;
    this.actionMode = mode;
    this.actionReason = '';
    this.actionError = '';
    this.returnRequestId = crypto.randomUUID();
    this.returnFingerprint = '';
    this.returnLines = order.details.filter(detail => this.remaining(detail) > 0).map(detail => ({ detail, quantity: 0, restock: true }));
  }

  closeAction(): void {
    if (!this.isSavingAction) this.actionOrder = null;
  }

  submitAction(): void {
    if (!this.actionOrder || this.isSavingAction) return;
    const reason = this.actionReason.trim();
    if (reason.length < 3) {
      this.actionError = 'Vui lòng nhập lý do ít nhất 3 ký tự.';
      return;
    }
    const order = this.actionOrder;
    const items: ReturnOrderItem[] = [];
    for (const line of this.returnLines) {
      if (!Number.isSafeInteger(line.quantity) || line.quantity < 0 || line.quantity > this.remaining(line.detail)) {
        this.actionError = 'Số lượng trả không hợp lệ hoặc vượt quá số lượng còn được trả.';
        return;
      }
      if (line.quantity > 0) items.push({ orderDetailId: line.detail.id, quantity: line.quantity, restock: line.restock });
    }
    if (this.actionMode === 'return' && items.length === 0) {
      this.actionError = 'Nhập ít nhất một số lượng cần trả.';
      return;
    }
    const fingerprint = JSON.stringify({ reason, items });
    if (this.returnFingerprint && fingerprint !== this.returnFingerprint) {
      this.actionError = 'Nội dung đã thay đổi sau lần gửi trước. Tải lại đơn để kiểm tra kết quả rồi mở một yêu cầu mới.';
      return;
    }
    this.returnFingerprint = fingerprint;
    this.isSavingAction = true;
    this.actionError = '';
    const onError = (error: { error?: { error?: string } }) => {
      this.isSavingAction = false;
      this.actionError = error.error?.error || 'Chưa xác nhận kết quả. Giữ nguyên nội dung để thử lại hoặc tải lại đơn.';
    };
    const onSuccess = () => {
      this.isSavingAction = false;
      this.actionOrder = null;
      this.selectedOrder = null;
      this.loadOrders();
    };
    if (this.actionMode === 'cancel') {
      this.orderService.cancelOrder(order.id, reason).subscribe({ next: onSuccess, error: onError });
    } else {
      this.orderService.returnOrder(order.id, this.returnRequestId, reason, items).subscribe({ next: onSuccess, error: onError });
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

    const rows = this.visibleOrders.map(o => [
      o.orderCode,
      this.formatDateForCsv(new Date(o.createdAt)),
      o.staffName || 'Dược sĩ',
      o.customerName || o.guestName || 'Khách vãng lai',
      o.customerPhone || '',
      this.getPaymentLabel(o.paymentMethod),
      this.getStatusLabel(o.status),
      o.discountAmount.toString(),
      this.netAmount(o).toString()
    ]);

    let csvContent = '\uFEFF' + headers.join(',') + '\n';
    rows.forEach(row => {
      const escapedRow = row.map(val => {
        let cleanVal = (val || '').replace(/"/g, '""');
        if (/^[=+\-@\t\r]/.test(cleanVal)) {
          cleanVal = "'" + cleanVal;
        }
        return `"${cleanVal}"`;
      });
      csvContent += escapedRow.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    let startStr = '';
    let endStr = '';
    if (this.startDate) {
      startStr = `_Tu_${this.startDate}`;
    }
    if (this.endDate) {
      endStr = `_Den_${this.endDate}`;
    }
    link.setAttribute('href', url);
    link.setAttribute('download', `Bao_cao_don_hang${startStr}${endStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  getPaymentLabel(method: string): string {
    if (method === 'Cash') {
      return 'Tiền mặt';
    }
    return 'Chuyển khoản';
  }

  getStatusLabel(status: string, cancelledLabel = 'Đã hủy'): string {
    if (status === 'Cancelled') {
      return cancelledLabel;
    }
    if (status === 'PartiallyReturned') return 'Trả một phần';
    if (status === 'Returned') return 'Đã trả hết';
    return 'Hoàn tất';
  }

  getTextDecoration(status: string): string {
    if (status === 'Cancelled') {
      return 'line-through';
    }
    return 'none';
  }

  getOrderOpacity(status: string): string {
    if (status === 'Cancelled') {
      return '0.6';
    }
    return '1';
  }

  getTotalColor(status: string): string {
    if (status === 'Cancelled') {
      return 'var(--text-secondary)';
    }
    return 'var(--success)';
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

  getVietnameseWords(num: number): string {
    if (num === 0) return 'Không đồng';
    
    const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
    const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    
    let words = '';
    let unitIndex = 0;
    let n = Math.round(num);
    
    while (n > 0) {
      const chunk = n % 1000;
      if (chunk > 0) {
        const chunkWords = convertChunk(chunk, n >= 1000);
        words = chunkWords + ' ' + units[unitIndex] + ' ' + words;
      }
      n = Math.floor(n / 1000);
      unitIndex++;
    }
    
    words = words.trim().replace(/\s+/g, ' ');
    words = words.charAt(0).toUpperCase() + words.slice(1) + ' đồng';
    return words;

    function convertChunk(chunk: number, hasHigherDigits: boolean): string {
      const hundreds = Math.floor(chunk / 100);
      const remainder = chunk % 100;
      const tens = Math.floor(remainder / 10);
      const ones = remainder % 10;
      
      let chunkStr = '';
      
      if (hundreds > 0 || hasHigherDigits) {
        chunkStr += digits[hundreds] + ' trăm ';
      }
      
      if (tens > 0) {
        if (tens === 1) {
          chunkStr += 'mười ';
        } else {
          chunkStr += digits[tens] + ' mươi ';
        }
      } else if (remainder > 0 && (hundreds > 0 || hasHigherDigits)) {
        chunkStr += 'lẻ ';
      }
      
      if (ones > 0) {
        if (ones === 1 && tens > 1) {
          chunkStr += 'mốt';
        } else if (ones === 5 && tens > 0) {
          chunkStr += 'lăm';
        } else {
          chunkStr += digits[ones];
        }
      }
      
      return chunkStr.trim();
    }
  }
}
