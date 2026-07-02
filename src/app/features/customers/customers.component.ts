import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CustomerService, CustomerDto, CustomerHistoryDto } from '../../core/services/customer.service';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="customers-container">
      <!-- Header -->
      <div class="page-actions-header">
        <h2><i class="fa-solid fa-users text-primary"></i> Quản lý Khách hàng CRM</h2>
        <button (click)="openAddModal()" class="btn btn-primary">
          <i class="fa-solid fa-user-plus"></i> Đăng ký khách hàng mới
        </button>
      </div>

      <!-- Customer List -->
      <div class="card" style="padding: 0;">
        <div class="table-responsive" *ngIf="customers.length > 0; else emptyState">
          <table class="table">
            <thead>
              <tr>
                <th>Họ và tên</th>
                <th>Số điện thoại</th>
                <th>Tiền sử dị ứng thuốc / Ghi chú bệnh lý</th>
                <th class="text-center">Điểm tích lũy</th>
                <th class="text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of customers">
                <td class="font-semibold" style="font-size: 0.95rem;">{{ c.fullName }}</td>
                <td class="font-mono">{{ c.phone }}</td>
                <td>
                  <span *ngIf="c.allergyNotes" class="allergy-badge">
                    <i class="fa-solid fa-triangle-exclamation"></i> Dị ứng: {{ c.allergyNotes }}
                  </span>
                  <span *ngIf="!c.allergyNotes" class="text-muted">Không có ghi chú đặc biệt</span>
                </td>
                <td class="text-center font-mono font-semibold text-success">{{ c.rewardPoints }}</td>
                <td class="text-right">
                  <button (click)="viewHistory(c)" class="btn btn-outline-primary btn-sm">
                    <i class="fa-solid fa-receipt"></i> Lịch sử mua thuốc
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <ng-template #emptyState>
          <div class="empty-state">
            <i class="fa-solid fa-users-slash" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem;"></i>
            <p>Chưa có dữ liệu khách hàng nào được đăng ký.</p>
          </div>
        </ng-template>
      </div>
    </div>

    <!-- Drawer / Side Panel: Purchase History -->
    <div class="drawer-backdrop" *ngIf="selectedHistory" (click)="selectedHistory = null">
      <div class="drawer-panel" (click)="$event.stopPropagation()">
        <div class="drawer-header">
          <h3><i class="fa-solid fa-file-prescription text-primary"></i> Lịch sử khám thuốc</h3>
          <button class="drawer-close" (click)="selectedHistory = null">&times;</button>
        </div>

        <div class="drawer-body" *ngIf="selectedHistory">
          <!-- Patient Summary Card -->
          <div class="patient-summary">
            <h4>{{ selectedHistory.customer.fullName }}</h4>
            <p class="phone font-mono">{{ selectedHistory.customer.phone }}</p>
            <div class="allergy-alert" *ngIf="selectedHistory.customer.allergyNotes">
              <i class="fa-solid fa-circle-exclamation text-danger"></i> 
              <strong>Tiền sử dị ứng:</strong> {{ selectedHistory.customer.allergyNotes }}
            </div>
          </div>

          <h5 style="margin-top: 1.5rem; margin-bottom: 0.75rem;">Danh sách đơn hàng ({{ selectedHistory.orders.length }})</h5>

          <div class="orders-timeline" *ngIf="selectedHistory.orders.length > 0; else noOrders">
            <div class="timeline-item" *ngFor="let order of selectedHistory.orders">
              <div class="timeline-marker"></div>
              <div class="timeline-content">
                <div class="order-meta">
                  <span class="code font-semibold font-mono">{{ order.orderCode }}</span>
                  <span class="date font-mono">{{ order.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
                </div>
                
                <table class="timeline-items-table">
                  <tbody>
                    <tr *ngFor="let item of order.items">
                      <td>{{ item.productName }} <span class="text-secondary">(Lô {{ item.batchNumber }})</span></td>
                      <td class="text-center font-mono">x{{ item.quantity }}</td>
                      <td class="text-right font-mono">{{ item.unitPrice | number:'1.0-0' }}đ</td>
                    </tr>
                  </tbody>
                </table>
                <div class="order-total text-right font-semibold">
                  Tổng thanh toán: <span class="text-primary font-mono">{{ order.totalAmount | number:'1.0-0' }}đ</span>
                </div>
              </div>
            </div>
          </div>
          <ng-template #noOrders>
            <div class="empty-state">
              <p>Khách hàng này chưa thực hiện giao dịch mua thuốc nào.</p>
            </div>
          </ng-template>
        </div>
      </div>
    </div>

    <!-- Modal: Register Customer -->
    <div class="modal-backdrop" *ngIf="showAddModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3><i class="fa-solid fa-user-plus text-primary"></i> Đăng ký thông tin khách hàng</h3>
          <button class="modal-close-btn" (click)="showAddModal = false">&times;</button>
        </div>
        <form [formGroup]="customerForm" (ngSubmit)="saveCustomer()">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Họ và tên khách hàng</label>
              <input type="text" formControlName="fullName" class="form-control" placeholder="Ví dụ: Nguyễn Văn A" />
            </div>

            <div class="form-group">
              <label class="form-label">Số điện thoại</label>
              <input type="text" formControlName="phone" class="form-control" placeholder="Ví dụ: 0987654321" />
            </div>

            <div class="form-group">
              <label class="form-label">Tiền sử dị ứng hoặc ghi chú lâm sàng</label>
              <textarea formControlName="allergyNotes" class="form-control" rows="3" placeholder="Ghi nhận các hoạt chất dị ứng (ví dụ: Penicillin) hoặc các bệnh nền khác..."></textarea>
            </div>

            <div class="alert alert-danger" *ngIf="modalError">
              {{ modalError }}
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" (click)="showAddModal = false" class="btn btn-secondary">Hủy</button>
            <button type="submit" class="btn btn-primary" [disabled]="customerForm.invalid">Đăng ký</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .customers-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .page-actions-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .allergy-badge {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.15);
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 500;
    }
    .drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      justify-content: flex-end;
    }
    .drawer-panel {
      width: 100%;
      max-width: 500px;
      height: 100%;
      background: var(--bg-card);
      border-left: 1px solid var(--border-color);
      box-shadow: var(--shadow-lg);
      display: flex;
      flex-direction: column;
      animation: drawerSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes drawerSlide {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    .drawer-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .drawer-header h3 {
      font-size: 1.15rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .drawer-close {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 1.75rem;
      cursor: pointer;
    }
    .drawer-body {
      padding: 1.5rem;
      flex: 1;
      overflow-y: auto;
    }
    .patient-summary {
      background: var(--bg-hover);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 1rem;
    }
    .patient-summary h4 {
      font-size: 1.2rem;
      margin: 0;
    }
    .patient-summary .phone {
      color: var(--text-secondary);
      font-size: 0.9rem;
      margin-top: 0.25rem;
    }
    .allergy-alert {
      margin-top: 0.75rem;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.15);
      color: #ef4444;
      font-size: 0.85rem;
    }
    .orders-timeline {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      position: relative;
      padding-left: 1.5rem;
      margin-top: 1rem;
    }
    .orders-timeline::before {
      content: '';
      position: absolute;
      left: 6px;
      top: 10px;
      bottom: 10px;
      width: 2px;
      background: var(--border-color);
    }
    .timeline-item {
      position: relative;
    }
    .timeline-marker {
      position: absolute;
      left: -20px;
      top: 6px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--primary);
      border: 2px solid var(--bg-card);
      box-shadow: 0 0 6px var(--primary);
    }
    .timeline-content {
      background: var(--bg-hover);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 0.85rem;
    }
    .order-meta {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px dashed var(--border-color);
      padding-bottom: 0.5rem;
      margin-bottom: 0.5rem;
      font-size: 0.8rem;
    }
    .order-meta .code {
      color: var(--primary);
    }
    .order-meta .date {
      color: var(--text-secondary);
    }
    .timeline-items-table {
      width: 100%;
      font-size: 0.85rem;
      margin-bottom: 0.5rem;
    }
    .timeline-items-table td {
      padding: 0.25rem 0;
    }
    .order-total {
      font-size: 0.85rem;
      border-top: 1px dashed var(--border-color);
      padding-top: 0.5rem;
    }
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1.5rem;
    }
    .modal-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      width: 100%;
      max-width: 700px;
      box-shadow: var(--shadow-lg);
    }
    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .modal-close-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 1.5rem;
      cursor: pointer;
    }
    .modal-body {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      background: var(--bg-main);
    }
    .empty-state {
      padding: 4rem;
      text-align: center;
      color: var(--text-secondary);
    }
  `]
})
export class CustomersComponent implements OnInit {
  customers: CustomerDto[] = [];
  selectedHistory: CustomerHistoryDto | null = null;
  showAddModal = false;
  customerForm: FormGroup;
  modalError: string | null = null;

  constructor(
    private fb: FormBuilder,
    private customerService: CustomerService
  ) {
    this.customerForm = this.fb.group({
      fullName: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      allergyNotes: ['']
    });
  }

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.customerService.getAll().subscribe({
      next: (res) => {
        this.customers = res;
      }
    });
  }

  openAddModal(): void {
    this.customerForm.reset();
    this.modalError = null;
    this.showAddModal = true;
  }

  saveCustomer(): void {
    if (this.customerForm.invalid) return;
    this.modalError = null;

    this.customerService.create(this.customerForm.value).subscribe({
      next: () => {
        this.showAddModal = false;
        this.loadCustomers();
      },
      error: (err) => {
        this.modalError = err.error?.error || 'Đăng ký khách hàng thất bại.';
      }
    });
  }

  viewHistory(customer: CustomerDto): void {
    this.customerService.getHistory(customer.id).subscribe({
      next: (history) => {
        this.selectedHistory = history;
      }
    });
  }
}
