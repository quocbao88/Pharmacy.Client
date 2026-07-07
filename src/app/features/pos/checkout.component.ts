import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ProductService, ProductDto } from '../../core/services/product.service';
import { CustomerService, CustomerDto } from '../../core/services/customer.service';
import { OrderService, CheckoutOrderRequest, OrderDto } from '../../core/services/order.service';

interface CartItem {
  product: ProductDto;
  quantity: number;
  selectedUnit: string;
  conversionValue: number;
  unitPrice: number;
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="pos-container">
      <!-- Left side: Product search & Cart items -->
      <div class="pos-main">
        <!-- Smart Search -->
        <div class="card search-box-card">
          <div class="search-input-wrapper">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (input)="onSearchInput($event)"
              class="form-control form-control-lg"
              placeholder="Nhập tên thuốc hoặc hoạt chất chính cần tìm..."
              #searchInput
            />
            <button class="clear-btn" *ngIf="searchQuery" (click)="clearSearch(searchInput)">&times;</button>
          </div>

          <!-- Autocomplete Results -->
          <div class="search-results" *ngIf="searchResults.length > 0">
            <div 
              *ngFor="let p of searchResults" 
              (click)="addToCart(p)" 
              class="result-item"
              [class.disabled]="p.totalStock === 0"
            >
              <div class="result-details">
                <span class="name font-semibold">{{ p.name }}</span>
                <span class="active-ingredient text-secondary" *ngIf="p.activeIngredient">
                  Hoạt chất: {{ p.activeIngredient }}
                </span>
              </div>
              <div class="result-stock text-right">
                <span class="price text-primary font-semibold font-mono">{{ p.sellingPrice | number:'1.0-0' }}đ</span>
                <span class="stock" [ngClass]="p.totalStock === 0 ? 'text-danger' : 'text-success'">
                  {{ p.totalStock === 0 ? 'Hết hàng' : 'Còn ' + p.totalStock + ' ' + p.unit }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Cart Table -->
        <div class="card cart-card" style="padding: 0; margin-top: 1rem; flex: 1; display: flex; flex-direction: column;">
          <div class="card-header-styled">
            <h3><i class="fa-solid fa-cart-flatbed-suitcases text-primary"></i> Đơn hàng bán lẻ</h3>
            <span class="badge badge-indigo font-mono">{{ cart.length }} mặt hàng</span>
          </div>

          <div class="table-responsive" style="flex: 1; overflow-y: auto;" *ngIf="cart.length > 0; else emptyCart">
            <table class="table">
              <thead>
                <tr>
                  <th>Tên thuốc</th>
                  <th class="text-center" style="width: 100px;">ĐVT</th>
                  <th class="text-center" style="width: 130px;">Số lượng</th>
                  <th class="text-right" style="width: 150px;">Đơn giá</th>
                  <th class="text-right" style="width: 150px;">Thành tiền</th>
                  <th class="text-center" style="width: 80px;">Xóa</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of cart">
                  <td class="font-semibold">
                    {{ item.product.name }}
                    <span *ngIf="item.product.prescriptionRequired" class="text-danger font-semibold small" style="margin-left: .25rem; font-size: .75rem;" title="Thuốc kê đơn">
                      <i class="fa-solid fa-prescription"></i> Rx
                    </span>
                  </td>
                  <td class="text-center">
                    <select 
                      *ngIf="item.product.unitConversions && item.product.unitConversions.length > 0; else staticUnit"
                      [(ngModel)]="item.selectedUnit"
                      (change)="changeUnit(item, item.selectedUnit)"
                      class="form-control"
                      style="padding: 0.15rem 0.35rem; font-size: 0.8rem; width: 85px; margin: 0 auto; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary);"
                    >
                      <option [value]="item.product.unit">{{ item.product.unit }}</option>
                      <option *ngFor="let uc of item.product.unitConversions" [value]="uc.unitName">
                        {{ uc.unitName }}
                      </option>
                    </select>
                    <ng-template #staticUnit>{{ item.product.unit }}</ng-template>
                  </td>
                  <td class="text-center">
                    <div class="qty-adjuster">
                      <button (click)="adjustQty(item, -1)" class="adjust-btn">-</button>
                      <input 
                        type="number" 
                        [(ngModel)]="item.quantity" 
                        (change)="verifyQty(item)"
                        class="qty-input font-mono" 
                        min="1" 
                      />
                      <button (click)="adjustQty(item, 1)" class="adjust-btn">+</button>
                    </div>
                  </td>
                  <td class="text-right font-mono">{{ item.unitPrice | number:'1.0-0' }}đ</td>
                  <td class="text-right font-mono text-primary font-semibold">{{ (item.unitPrice * item.quantity) | number:'1.0-0' }}đ</td>
                  <td class="text-center">
                    <button (click)="removeFromCart(item)" class="btn-remove" title="Xóa">
                      <i class="fa-solid fa-trash-can"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <ng-template #emptyCart>
            <div class="empty-state" style="margin: auto 0; padding: 5rem 0;">
              <i class="fa-solid fa-basket-shopping" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem;"></i>
              <p>Giỏ hàng bán lẻ đang trống. Nhập từ khóa ở ô tìm kiếm để thêm thuốc.</p>
            </div>
          </ng-template>
        </div>
      </div>

      <!-- Right side: CRM panel & Payment info -->
      <div class="pos-sidebar">
        <!-- CRM Customer Panel -->
        <div class="card customer-card">
          <h3 class="card-title"><i class="fa-solid fa-address-card text-primary"></i> Khách hàng (CRM)</h3>
          
          <div class="crm-search-row" style="position: relative;">
            <input
              type="text"
              [(ngModel)]="customerSearchQuery"
              (input)="onCustomerSearchInput()"
              (focus)="showCustomerDropdown = true"
              (blur)="hideCustomerDropdown()"
              class="form-control"
              placeholder="Nhập tên hoặc SĐT khách hàng..."
            />
            <button class="clear-btn" *ngIf="customerSearchQuery" (click)="clearCustomerSearch()" style="right: 10px; font-size: 1.2rem; top: 50%; transform: translateY(-50%); position: absolute; background: none; border: none; color: var(--text-secondary); cursor: pointer;">&times;</button>
            
            <!-- Customer search dropdown suggestions -->
            <div class="search-results" *ngIf="showCustomerDropdown && filteredCustomers.length > 0" style="width: 100%; top: 100%; left: 0; box-sizing: border-box;">
              <div 
                *ngFor="let c of filteredCustomers" 
                (mousedown)="selectCustomer(c)" 
                class="result-item"
                style="display: flex; flex-direction: column; align-items: flex-start; gap: 0.15rem; padding: 0.6rem 1rem;"
              >
                <span class="name font-semibold" style="font-size: 0.95rem;">{{ c.fullName }} (SĐT: {{ c.phone }})</span>
                <span class="dob text-secondary font-mono" style="font-size: 0.75rem;">
                  Ngày sinh: {{ c.dateOfBirth ? (c.dateOfBirth | date:'dd/MM/yyyy') : 'Chưa cập nhật' }}
                </span>
              </div>
              <div *ngIf="customerSearchQuery" (mousedown)="registerNewCustomer()" class="result-item text-primary font-semibold" style="padding: 0.6rem 1rem; cursor: pointer;">
                <i class="fa-solid fa-user-plus"></i> Đăng ký nhanh: "{{ customerSearchQuery }}"
              </div>
            </div>
            
            <!-- Show Quick Register even when dropdown is closed or empty if queried name not found -->
            <div class="search-results" *ngIf="showCustomerDropdown && customerSearchQuery && filteredCustomers.length === 0" style="width: 100%; top: 100%; left: 0; box-sizing: border-box;">
              <div (mousedown)="registerNewCustomer()" class="result-item text-primary font-semibold" style="padding: 0.6rem 1rem; cursor: pointer;">
                <i class="fa-solid fa-user-plus"></i> Đăng ký nhanh: "{{ customerSearchQuery }}"
              </div>
            </div>
          </div>

          <div class="crm-results" *ngIf="customer">
            <div class="patient-profile">
              <span class="name font-semibold">{{ customer.fullName }}</span>
              <span class="points font-mono text-success">Tích điểm: {{ customer.rewardPoints }} pts</span>
            </div>
            <!-- Date of birth & Allergy alert if notes are registered -->
            <div class="dob-info text-secondary font-mono" style="font-size: 0.85rem; margin-top: 0.25rem;" *ngIf="customer.dateOfBirth">
              <i class="fa-regular fa-calendar-days"></i> Ngày sinh: {{ customer.dateOfBirth | date:'dd/MM/yyyy' }}
            </div>
            <div class="allergy-notes" *ngIf="customer.allergyNotes">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <strong>Cảnh báo dị ứng:</strong> {{ customer.allergyNotes }}
            </div>
            <button (click)="clearCustomer()" class="btn btn-outline-danger btn-xs" style="margin-top: 0.5rem; width: 100%;">
              Gỡ liên kết khách hàng
            </button>
          </div>

          <div *ngIf="!customer" style="margin-top: 0.75rem; display: flex; flex-direction: column; gap: 0.75rem;">
            <div class="patient-profile" style="padding: 0.6rem; background: rgba(100, 116, 139, 0.05); border-radius: 6px; border: 1px dashed var(--border-color); display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
              <i class="fa-solid fa-user-tag text-secondary"></i>
              <span class="text-secondary" style="font-size: 0.8rem;">Chế độ: <strong>Khách vãng lai</strong></span>
            </div>
            
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.8rem; margin-bottom: 0.25rem; color: var(--text-secondary);">Họ và tên khách vãng lai</label>
              <input
                type="text"
                [(ngModel)]="guestName"
                class="form-control form-control-sm"
                placeholder="Nhập tên..."
              />
            </div>
            
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.8rem; margin-bottom: 0.25rem; color: var(--text-secondary);">Ngày sinh khách vãng lai</label>
              <input
                type="date"
                [(ngModel)]="guestDob"
                class="form-control form-control-sm"
              />
            </div>
          </div>
        </div>



        <!-- Payment Calculations -->
        <div class="card payment-card">
          <h3 class="card-title"><i class="fa-solid fa-cash-register text-success"></i> Thanh toán</h3>

          <div class="pay-item">
            <span class="label">Tổng tiền hàng:</span>
            <span class="val font-mono font-semibold">{{ getSubtotal() | number:'1.0-0' }}đ</span>
          </div>

          <div class="pay-item" style="margin-top: 0.5rem;">
            <span class="label">Giảm giá (VND):</span>
            <input 
              type="number" 
              [(ngModel)]="discountAmount" 
              (change)="verifyDiscount()"
              class="form-control form-control-sm text-right font-mono" 
              style="max-width: 150px;" 
              min="0"
            />
          </div>

          <div class="pay-item total-row" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
            <span class="label">KHÁCH PHẢI TRẢ:</span>
            <span class="val text-success font-mono font-extrabold">{{ getGrandTotal() | number:'1.0-0' }}đ</span>
          </div>

          <div class="form-group" style="margin-top: 1.25rem;">
            <label class="form-label">Phương thức thanh toán</label>
            <div class="payment-methods">
              <button 
                [class.active]="paymentMethod === 'Cash'" 
                (click)="paymentMethod = 'Cash'; cashReceived = getGrandTotal();"
                class="method-btn"
              >
                <i class="fa-solid fa-money-bill-1-wave"></i> Tiền mặt
              </button>
              <button 
                [class.active]="paymentMethod === 'Transfer'" 
                (click)="paymentMethod = 'Transfer'; cashReceived = getGrandTotal();"
                class="method-btn"
              >
                <i class="fa-solid fa-qrcode"></i> Chuyển khoản
              </button>
            </div>
          </div>

          <div class="form-group" *ngIf="paymentMethod === 'Cash'" style="margin-top: 1rem;">
            <label class="form-label">Tiền mặt khách đưa (VND)</label>
            <input
              type="number"
              [(ngModel)]="cashReceived"
              class="form-control form-control-lg font-mono font-semibold"
              placeholder="0"
              min="0"
            />
          </div>

          <div class="pay-item change-row" *ngIf="paymentMethod === 'Cash' && cashReceived > 0" style="margin-top: 1rem;">
            <span class="label">Tiền thừa trả khách:</span>
            <span class="val font-mono text-primary font-bold">{{ getChangeReturned() | number:'1.0-0' }}đ</span>
          </div>

          <div class="alert alert-danger" style="margin-top: 1rem; font-size: 0.85rem;" *ngIf="checkoutError">
            <i class="fa-solid fa-circle-exclamation"></i> {{ checkoutError }}
          </div>

          <button 
            (click)="processCheckout()" 
            class="btn btn-primary btn-lg" 
            style="width: 100%; margin-top: 1.5rem; padding: 1rem;"
            [disabled]="cart.length === 0 || isLoading"
          >
            <span *ngIf="!isLoading"><i class="fa-solid fa-circle-check"></i> XÁC NHẬN HOÀN THÀNH</span>
            <span *ngIf="isLoading"><i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý trừ kho...</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Order Completion Confirmation -->
    <div class="modal-overlay" *ngIf="receiptOrder">
      <div class="modal-content" style="max-width: 500px; text-align: center;">
        <div style="margin-bottom: 1.5rem;">
          <i class="fa-solid fa-circle-check text-success" style="font-size: 4.5rem; display: inline-block; margin-bottom: 1rem; filter: drop-shadow(0 0 10px rgba(16, 185, 129, 0.3));"></i>
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-heading); margin-bottom: 0.5rem;">Hoàn thành đơn hàng!</h2>
          <p class="text-secondary" style="font-size: 0.95rem;">Đơn hàng đã được lưu và trừ tồn kho hệ thống.</p>
        </div>

        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 8px; padding: 1.25rem; margin-bottom: 2rem; text-align: left;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span class="text-secondary">Mã hóa đơn:</span>
            <strong class="font-mono text-primary">{{ receiptOrder.orderCode }}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span class="text-secondary">Thời gian:</span>
            <span>{{ receiptOrder.createdAt | date:'dd/MM/yyyy HH:mm:ss' }}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span class="text-secondary">Khách hàng:</span>
            <strong>{{ receiptOrder.customerName || guestName || 'Khách vãng lai' }}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;" *ngIf="receiptOrder.customerPhone">
            <span class="text-secondary">Số điện thoại:</span>
            <span>{{ receiptOrder.customerPhone }}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;" *ngIf="!receiptOrder.customerName && guestDob">
            <span class="text-secondary">Ngày sinh:</span>
            <span>{{ guestDob | date:'dd/MM/yyyy' }}</span>
          </div>
          <div style="border-top: 1px dashed var(--border-color); margin: 0.75rem 0; padding-top: 0.75rem; display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span class="text-secondary">Tổng thanh toán:</span>
            <strong style="font-size: 1.2rem; color: var(--success);" class="font-mono">{{ receiptOrder.totalAmount | number:'1.0-0' }}đ</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span class="text-secondary">Hình thức:</span>
            <span>{{ receiptOrder.paymentMethod === 'Cash' ? 'Tiền mặt' : 'Chuyển khoản' }}</span>
          </div>
          <div style="display: flex; justify-content: space-between;" *ngIf="paymentMethod === 'Cash' && cashReceived > 0">
            <span class="text-secondary">Tiền thừa trả khách:</span>
            <strong style="color: var(--secondary);" class="font-mono">{{ getChangeReturned() | number:'1.0-0' }}đ</strong>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <button (click)="printReceipt()" class="btn btn-outline-primary btn-lg">
            <i class="fa-solid fa-print"></i> In hóa đơn
          </button>
          <button (click)="closeReceipt()" class="btn btn-primary btn-lg">
            Đóng & Đơn Mới
          </button>
        </div>
      </div>
    </div>

    <!-- Hidden Printable Receipt -->
    <div id="print-section">
      <div style="width: 80mm; font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.4; color: #000; padding: 10px; background: #fff; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 10px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: bold; text-transform: uppercase;">NHÀ THUỐC TTYT SÀI ĐỒNG</h3>
          <p style="margin: 2px 0;">ĐC: Sài Đồng, Long Biên, Hà Nội</p>
          <p style="margin: 2px 0;">SĐT: 0987.654.321</p>
          <h4 style="margin: 10px 0 5px 0; font-size: 14px; font-weight: bold;">HÓA ĐƠN BÁN LẺ</h4>
          <p style="margin: 2px 0; font-size: 11px;">Mã HĐ: {{ receiptOrder?.orderCode }}</p>
          <p style="margin: 2px 0; font-size: 11px;">Ngày: {{ receiptOrder?.createdAt | date:'dd/MM/yyyy HH:mm:ss' }}</p>
        </div>
        
        <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
        
        <div style="margin-bottom: 10px; font-size: 11px;">
          <p style="margin: 3px 0;"><strong>Khách hàng:</strong> {{ receiptOrder?.customerName || guestName || 'Khách vãng lai' }}</p>
          <p style="margin: 3px 0;" *ngIf="receiptOrder?.customerPhone"><strong>SĐT:</strong> {{ receiptOrder?.customerPhone }}</p>
          <p style="margin: 3px 0;"><strong>Người bán:</strong> {{ receiptOrder?.staffName || 'Dược sĩ' }}</p>
          <p style="margin: 3px 0;" *ngIf="receiptOrder?.notes"><strong>Ghi chú:</strong> {{ receiptOrder?.notes }}</p>
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
            <tr *ngFor="let item of receiptOrder?.details">
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
            <span>{{ (receiptOrder?.totalAmount || 0) + (receiptOrder?.discountAmount || 0) | number:'1.0-0' }}đ</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 3px 0;" *ngIf="receiptOrder?.discountAmount">
            <span>Chiết khấu:</span>
            <span>-{{ receiptOrder?.discountAmount | number:'1.0-0' }}đ</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 3px 0; font-weight: bold; font-size: 12px;">
            <span>TỔNG THANH TOÁN:</span>
            <span>{{ receiptOrder?.totalAmount | number:'1.0-0' }}đ</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 3px 0;">
            <span>Hình thức TT:</span>
            <span>{{ receiptOrder?.paymentMethod === 'Cash' ? 'Tiền mặt' : 'Chuyển khoản' }}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 3px 0;" *ngIf="receiptOrder?.paymentMethod === 'Cash' && cashReceived > 0">
            <span>Tiền khách đưa:</span>
            <span>{{ cashReceived | number:'1.0-0' }}đ</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 3px 0;" *ngIf="receiptOrder?.paymentMethod === 'Cash' && cashReceived > 0">
            <span>Tiền trả lại:</span>
            <span>{{ getChangeReturned() | number:'1.0-0' }}đ</span>
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
    #print-section {
      display: none;
    }
    .pos-container {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 1.5rem;
      height: calc(100vh - 120px);
    }
    @media (max-width: 1024px) {
      .pos-container {
        grid-template-columns: 1fr;
        height: auto;
      }
    }
    .pos-main {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .search-box-card {
      position: relative;
      padding: 1rem 1.25rem;
      z-index: 10;
    }
    .search-input-wrapper {
      position: relative;
    }
    .search-icon {
      position: absolute;
      left: 1.25rem;
      top: 50%;
      transform: translateY(-50%);
      font-size: 1.2rem;
      color: var(--text-secondary);
    }
    .search-input-wrapper .form-control {
      padding-left: 3rem;
      padding-right: 3rem;
      border-radius: 8px;
    }
    .clear-btn {
      position: absolute;
      right: 1.25rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      font-size: 1.5rem;
      color: var(--text-secondary);
      cursor: pointer;
    }
    .search-results {
      position: absolute;
      left: 0;
      right: 0;
      top: 100%;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      margin-top: 0.5rem;
      box-shadow: var(--shadow-lg);
      max-height: 280px;
      overflow-y: auto;
      z-index: 100;
    }
    .result-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1.25rem;
      border-bottom: 1px solid var(--border-color);
      cursor: pointer;
      transition: background 0.2s;
    }
    .result-item:hover:not(.disabled) {
      background: var(--bg-hover);
    }
    .result-item.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .result-details {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .result-details .name {
      font-size: 0.95rem;
    }
    .result-details .active-ingredient {
      font-size: 0.75rem;
    }
    .result-stock {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.15rem;
    }
    .result-stock .price {
      font-size: 0.9rem;
    }
    .result-stock .stock {
      font-size: 0.75rem;
      font-weight: 600;
    }
    .card-header-styled {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(0,0,0,0.15);
    }
    .card-header-styled h3 {
      font-size: 1.05rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
    }
    .badge-indigo {
      background: rgba(129, 140, 248, 0.15);
      color: #818cf8;
      border: 1px solid rgba(129, 140, 248, 0.2);
    }
    .qty-adjuster {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      overflow: hidden;
      background: var(--bg-main);
    }
    .adjust-btn {
      background: none;
      border: none;
      width: 28px;
      height: 28px;
      color: var(--text-primary);
      cursor: pointer;
      font-weight: 800;
      transition: background 0.15s;
    }
    .adjust-btn:hover {
      background: var(--bg-hover);
    }
    .qty-input {
      width: 44px;
      border: none;
      border-left: 1px solid var(--border-color);
      border-right: 1px solid var(--border-color);
      background: none;
      text-align: center;
      color: var(--text-primary);
      font-size: 0.85rem;
      padding: 0;
      -moz-appearance: textfield;
    }
    .qty-input::-webkit-outer-spin-button,
    .qty-input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    .btn-remove {
      background: none;
      border: none;
      color: #ef4444;
      cursor: pointer;
      font-size: 1rem;
      padding: 0.5rem;
      border-radius: 6px;
      transition: background 0.15s;
    }
    .btn-remove:hover {
      background: rgba(239,68,68,0.1);
    }
    .pos-sidebar {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .crm-search-row {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }
    .crm-results {
      margin-top: 1rem;
      background: var(--bg-main);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 0.85rem;
    }
    .patient-profile {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9rem;
    }
    .allergy-notes {
      margin-top: 0.75rem;
      padding: 0.5rem;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.15);
      border-radius: 6px;
      color: #ef4444;
      font-size: 0.8rem;
    }
    .crm-not-found {
      margin-top: 1rem;
      background: rgba(249, 115, 22, 0.05);
      border: 1px solid rgba(249, 115, 22, 0.15);
      border-radius: 8px;
      padding: 0.75rem;
      text-align: center;
    }
    .payment-card {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .pay-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.95rem;
    }
    .pay-item .label {
      color: var(--text-secondary);
    }
    .pay-item.total-row .label {
      font-weight: 700;
      color: var(--text-primary);
    }
    .pay-item.total-row .val {
      font-size: 1.6rem;
    }
    .payment-methods {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      margin-top: 0.35rem;
    }
    .method-btn {
      background: rgba(255,255,255,0.02);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      color: var(--text-secondary);
      padding: 0.75rem 0.5rem;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.85rem;
      transition: all 0.2s;
    }
    .method-btn:hover {
      color: var(--text-primary);
      border-color: rgba(255,255,255,0.15);
    }
    .method-btn.active {
      background: var(--primary-light);
      border-color: var(--primary);
      color: var(--primary);
    }
    .empty-state {
      text-align: center;
      color: var(--text-secondary);
    }

    /* Print styling */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow-y: auto;
      padding: 2rem;
    }
    .receipt-paper {
      background: white;
      color: black;
      width: 320px;
      padding: 1.5rem;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5);
      border-radius: 4px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.85rem;
    }
    .receipt-header {
      text-align: center;
    }
    .receipt-header h2 {
      font-size: 1.25rem;
      font-weight: 800;
      margin: 0 0 0.5rem 0;
    }
    .receipt-header p {
      font-size: 0.75rem;
      margin: 0.2rem 0;
      color: #333;
    }
    .receipt-header h3 {
      font-size: 1rem;
      font-weight: 700;
      margin: 0.5rem 0;
    }
    .receipt-header .code {
      font-size: 0.8rem;
    }
    .receipt-header .date {
      font-size: 0.75rem;
    }
    .divider {
      border-top: 1px dashed black;
      margin: 0.75rem 0;
    }
    .receipt-details p {
      margin: 0.35rem 0;
      font-size: 0.8rem;
    }
    .receipt-table {
      width: 100%;
      margin-top: 0.75rem;
      font-size: 0.8rem;
      border-collapse: collapse;
    }
    .receipt-table th {
      border-bottom: 1px dashed black;
      padding-bottom: 0.25rem;
      text-align: left;
    }
    .receipt-table td {
      padding: 0.35rem 0;
    }
    .receipt-table .batch {
      display: block;
      font-size: 0.7rem;
      color: #555;
    }
    .receipt-row {
      display: flex;
      justify-content: space-between;
      margin: 0.35rem 0;
    }
    .text-large {
      font-size: 1.1rem;
    }
    .receipt-footer {
      text-align: center;
      margin-top: 1.5rem;
      font-size: 0.8rem;
    }
    .receipt-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      margin-top: 1.5rem;
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
export class CheckoutComponent implements OnInit, OnDestroy {
  searchQuery = '';
  searchResults: ProductDto[] = [];
  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  // Cart
  cart: CartItem[] = [];
  discountAmount = 0;
  paymentMethod = 'Cash'; // Cash, Transfer
  cashReceived = 0;



  // CRM Customer
  customerPhone = '';
  customer: CustomerDto | null = null;
  showCustomerNotFound = false;

  // New variables for search and guest mode
  allCustomers: CustomerDto[] = [];
  filteredCustomers: CustomerDto[] = [];
  customerSearchQuery = '';
  showCustomerDropdown = false;
  guestName = '';
  guestDob = '';

  isLoading = false;
  checkoutError: string | null = null;
  receiptOrder: OrderDto | null = null;

  constructor(
    private productService: ProductService,
    private customerService: CustomerService,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    // Load all customers for POS search
    this.loadAllCustomers();

    // 300ms debounce for product searches
    this.searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query.trim()) {
          return [[]]; // Return empty array if query is empty
        }
        return this.productService.getAll(query);
      })
    ).subscribe({
      next: (results) => {
        this.searchResults = results as ProductDto[];
      }
    });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchSubject.next(val);
  }

  clearSearch(inputEl: HTMLInputElement): void {
    this.searchQuery = '';
    inputEl.value = '';
    this.searchResults = [];
  }

  addToCart(product: ProductDto): void {
    if (product.totalStock === 0) return;

    const existing = this.cart.find(item => item.product.id === product.id);
    if (existing) {
      // For existing, let's verify if we can add one more of the currently selected unit
      const totalNeededBasic = (existing.quantity + 1) * existing.conversionValue;
      if (totalNeededBasic <= product.totalStock) {
        existing.quantity += 1;
      } else {
        alert(`Không đủ tồn kho để tăng số lượng.`);
      }
    } else {
      this.cart.push({ 
        product, 
        quantity: 1,
        selectedUnit: product.unit,
        conversionValue: 1,
        unitPrice: product.sellingPrice
      });
    }

    this.searchResults = [];
    this.searchQuery = '';
  }

  changeUnit(item: CartItem, newUnit: string): void {
    item.selectedUnit = newUnit;
    if (newUnit === item.product.unit) {
      item.conversionValue = 1;
      item.unitPrice = item.product.sellingPrice;
    } else {
      const conv = item.product.unitConversions?.find(uc => uc.unitName === newUnit);
      if (conv) {
        item.conversionValue = conv.conversionValue;
        item.unitPrice = conv.sellingPrice;
      }
    }
    this.verifyQty(item);
  }

  adjustQty(item: CartItem, delta: number): void {
    const newQty = item.quantity + delta;
    if (newQty < 1) return;

    const totalNeededBasic = newQty * item.conversionValue;
    if (totalNeededBasic <= item.product.totalStock) {
      item.quantity = newQty;
    } else {
      const maxPossible = Math.floor(item.product.totalStock / item.conversionValue);
      alert(`Số lượng vượt quá tồn kho thực tế (${item.product.totalStock} ${item.product.unit}). Tối đa có thể bán: ${maxPossible} ${item.selectedUnit}`);
    }
  }

  verifyQty(item: CartItem): void {
    if (item.quantity < 1) {
      item.quantity = 1;
    }
    const totalNeededBasic = item.quantity * item.conversionValue;
    if (totalNeededBasic > item.product.totalStock) {
      const maxPossible = Math.floor(item.product.totalStock / item.conversionValue);
      alert(`Chỉ còn ${item.product.totalStock} ${item.product.unit} trong kho. Tối đa có thể bán: ${maxPossible} ${item.selectedUnit}`);
      item.quantity = Math.max(1, maxPossible);
    }
  }

  removeFromCart(item: CartItem): void {
    this.cart = this.cart.filter(i => i.product.id !== item.product.id);
  }

  getSubtotal(): number {
    return this.cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  }

  verifyDiscount(): void {
    const sub = this.getSubtotal();
    if (this.discountAmount < 0) this.discountAmount = 0;
    if (this.discountAmount > sub) this.discountAmount = sub;
  }

  getGrandTotal(): number {
    const total = this.getSubtotal() - this.discountAmount;
    return total < 0 ? 0 : total;
  }

  getChangeReturned(): number {
    const returned = this.cashReceived - this.getGrandTotal();
    return returned < 0 ? 0 : returned;
  }

  // CRM Customer Lookup
  loadAllCustomers(): void {
    this.customerService.getAll().subscribe({
      next: (res) => {
        this.allCustomers = res;
      }
    });
  }

  onCustomerSearchInput(): void {
    const query = this.customerSearchQuery.trim().toLowerCase();
    if (!query) {
      this.filteredCustomers = [];
      this.showCustomerDropdown = false;
      return;
    }
    this.filteredCustomers = this.allCustomers.filter(c =>
      c.fullName.toLowerCase().includes(query) || 
      c.phone.includes(query)
    );
    this.showCustomerDropdown = true;
  }

  selectCustomer(c: CustomerDto): void {
    this.customer = c;
    this.customerSearchQuery = '';
    this.showCustomerDropdown = false;
    this.guestName = '';
    this.guestDob = '';
  }

  clearCustomerSearch(): void {
    this.customerSearchQuery = '';
    this.filteredCustomers = [];
    this.showCustomerDropdown = false;
  }

  hideCustomerDropdown(): void {
    setTimeout(() => {
      this.showCustomerDropdown = false;
    }, 250);
  }

  lookupCustomer(): void {
    if (!this.customerPhone.trim()) return;
    this.showCustomerNotFound = false;

    this.customerService.searchByPhone(this.customerPhone.trim()).subscribe({
      next: (res) => {
        this.customer = res;
      },
      error: () => {
        this.customer = null;
        this.showCustomerNotFound = true;
      }
    });
  }

  clearCustomer(): void {
    this.customer = null;
    this.customerPhone = '';
    this.showCustomerNotFound = false;
    this.customerSearchQuery = '';
    this.showCustomerDropdown = false;
    this.guestName = '';
    this.guestDob = '';
  }

  registerNewCustomer(): void {
    const name = this.customerSearchQuery.trim();
    if (!name) return;

    const phone = prompt('Đăng ký khách hàng mới. Nhập số điện thoại:');
    if (!phone) return;

    const dobInput = prompt('Nhập ngày sinh (yyyy-mm-dd, ví dụ: 1990-05-15) hoặc bỏ trống:');
    const dob = dobInput ? dobInput : undefined;

    const allergy = prompt('Nhập hoạt chất dị ứng (nếu có):') || undefined;

    this.customerService.create({ 
      fullName: name, 
      phone, 
      dateOfBirth: dob ? new Date(dob).toISOString() : undefined, 
      allergyNotes: allergy 
    }).subscribe({
      next: (res) => {
        this.customer = res;
        this.customerSearchQuery = '';
        this.showCustomerDropdown = false;
        this.loadAllCustomers();
      },
      error: (err) => {
        alert(err.error?.error || 'Không thể đăng ký khách hàng.');
      }
    });
  }

  hasPrescriptionRequired(): boolean {
    return this.cart.some(item => item.product.prescriptionRequired);
  }

  // Checkout Actions
  processCheckout(): void {
    if (this.cart.length === 0) return;
    this.isLoading = true;
    this.checkoutError = null;

    let orderNotes = '';
    if (!this.customer && this.guestName) {
      orderNotes = `Khách vãng lai: ${this.guestName}`;
      if (this.guestDob) {
        const parts = this.guestDob.split('-');
        const formattedDob = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : this.guestDob;
        orderNotes += ` (NS: ${formattedDob})`;
      }
    }

    const payload: CheckoutOrderRequest = {
      customerId: this.customer?.id,
      discountAmount: this.discountAmount,
      paymentMethod: this.paymentMethod,
      notes: orderNotes || undefined,
      items: this.cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        soldUnit: item.selectedUnit
      }))
    };

    this.orderService.checkout(payload).subscribe({
      next: (order) => {
        this.receiptOrder = order;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.checkoutError = err.error?.error || 'Đã xảy ra lỗi trong quá trình xuất kho và thanh toán.';
      }
    });
  }

  closeReceipt(): void {
    this.receiptOrder = null;
    // Clear cart and start fresh
    this.cart = [];
    this.discountAmount = 0;
    this.cashReceived = 0;
    this.clearCustomer();
  }

  printReceipt(): void {
    window.print();
  }
}
