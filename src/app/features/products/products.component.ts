import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ProductService, ProductDto, CreateProductRequest, CreateBatchRequest } from '../../core/services/product.service';
import { AuthService } from '../../core/services/auth.service';

const CATEGORIES = ['Kháng sinh','Giảm đau - Hạ sốt','Tim mạch','Hô hấp','Tiêu hóa','Da liễu','Thần kinh','Nội tiết - Đái tháo đường','Vitamin - Khoáng chất','Sản phụ khoa','Nhãn khoa','Tai mũi họng','Khác'];
const DOSAGE_FORMS = ['Viên nén','Viên nang','Viên sủi','Siro','Dung dịch uống','Dung dịch tiêm','Kem bôi','Gel bôi','Nhỏ mắt','Nhỏ tai','Xịt mũi','Băng dán','Bột pha','Khác'];

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="products-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h2><i class="fa-solid fa-boxes-stacked"></i> Quản lý thuốc</h2>
          <p class="subtitle">Tổng: {{ products.length }} sản phẩm | Tồn kho tổng: {{ totalStock }} đơn vị</p>
        </div>
        <button *ngIf="isAdmin()" (click)="openAddModal()" class="btn btn-primary" id="btn-add-product">
          <i class="fa-solid fa-circle-plus"></i> Thêm thuốc mới
        </button>
      </div>

      <!-- Filters -->
      <div class="filters-bar card">
        <div class="filter-tabs">
          <button class="tab" [class.active]="activeTab==='all'" (click)="setTab('all')">
            <i class="fa-solid fa-list"></i> Tất cả
            <span class="badge">{{ products.length }}</span>
          </button>
          <button class="tab tab-warn" [class.active]="activeTab==='lowStock'" (click)="setTab('lowStock')">
            <i class="fa-solid fa-triangle-exclamation"></i> Sắp hết
            <span class="badge bg-red" *ngIf="lowStockCount>0">{{ lowStockCount }}</span>
          </button>
          <button class="tab tab-danger" [class.active]="activeTab==='expiring'" (click)="setTab('expiring')">
            <i class="fa-solid fa-clock"></i> Cận hạn
            <span class="badge bg-orange" *ngIf="expiringCount>0">{{ expiringCount }}</span>
          </button>
          <button class="tab tab-rx" [class.active]="activeTab==='rx'" (click)="setTab('rx')">
            <i class="fa-solid fa-prescription"></i> Kê đơn
          </button>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center; flex: 1; max-width: 580px; justify-content: flex-end;">
          <div class="search-box" style="flex: 1; max-width: 320px; margin: 0;">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" [(ngModel)]="searchQuery" (ngModelChange)="applyFilter()"
                   placeholder="Tên thuốc, hoạt chất..." class="form-control" id="search-product"/>
          </div>
          <button (click)="exportToCsv()" class="btn btn-outline-primary btn-sm" style="display: inline-flex; align-items: center; gap: 0.25rem; height: 38px;">
            <i class="fa-solid fa-file-csv"></i> Xuất CSV
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="card" style="padding:0">
        <div class="table-responsive" *ngIf="filtered.length > 0; else empty">
          <table class="table">
            <thead>
              <tr>
                <th>Tên thuốc</th>
                <th>Nhóm / Hoạt chất</th>
                <th>Dạng bào chế</th>
                <th class="text-center">Đơn vị</th>
                <th class="text-right">Giá nhập</th>
                <th class="text-right">Giá bán</th>
                <th class="text-center">Tồn kho</th>
                <th class="text-center">Kê đơn</th>
                <th class="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of filtered" [class.row-danger]="isLowStock(p)">
                <td>
                  <div class="product-name">{{ p.name }}</div>
                  <div class="product-meta" *ngIf="p.manufacturer">{{ p.manufacturer }}</div>
                  <span class="badge-low" *ngIf="isLowStock(p)">Sắp hết</span>
                </td>
                <td>
                  <span class="tag" *ngIf="p.category">{{ p.category }}</span>
                  <div class="text-secondary small" *ngIf="p.activeIngredient">{{ p.activeIngredient }}</div>
                </td>
                <td>
                  <div>{{ p.dosageForm || '—' }}</div>
                  <div class="text-secondary small">{{ p.strength }}</div>
                </td>
                <td class="text-center">{{ p.unit }}</td>
                <td class="text-right mono">{{ p.importPrice | number:'1.0-0' }}đ</td>
                <td class="text-right mono primary fw600">{{ p.sellingPrice | number:'1.0-0' }}đ</td>
                <td class="text-center mono fw600" [class.text-danger]="isLowStock(p)">{{ p.totalStock }}</td>
                <td class="text-center">
                  <i *ngIf="p.prescriptionRequired" class="fa-solid fa-prescription text-primary" title="Thuốc kê đơn"></i>
                  <span *ngIf="!p.prescriptionRequired" class="text-secondary">—</span>
                </td>
                <td class="text-right">
                  <div class="actions">
                    <button (click)="openHistoryModal(p)" class="btn btn-outline-info btn-xs" title="Quản lý lô, hạn dùng và lịch sử">
                      <i class="fa-solid fa-boxes-stacked"></i> Lô & Nhật ký
                    </button>
                    <button *ngIf="isAdmin()" (click)="openBatchModal(p)" class="btn btn-success btn-xs" title="Nhập lô hàng">
                      <i class="fa-solid fa-truck-ramp-box"></i> Nhập lô
                    </button>
                    <button *ngIf="isAdmin()" (click)="openEditModal(p)" class="btn btn-outline-primary btn-xs" title="Chỉnh sửa">
                      <i class="fa-solid fa-pen"></i>
                    </button>
                    <button *ngIf="isAdmin()" (click)="deleteProduct(p)" class="btn btn-outline-danger btn-xs" title="Xoá">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <ng-template #empty>
          <div class="empty-state">
            <i class="fa-solid fa-boxes-packing"></i>
            <p>Không tìm thấy sản phẩm.</p>
          </div>
        </ng-template>
      </div>
    </div>

    <!-- Modal: Add/Edit Product -->
    <div class="modal-backdrop" *ngIf="showProductModal">
      <div class="modal-card modal-wide">
        <div class="modal-header">
          <h3><i class="fa-solid fa-pills text-primary"></i> {{ editMode ? 'Cập nhật thuốc' : 'Thêm thuốc mới' }}</h3>
          <button class="close-btn" (click)="showProductModal=false">&times;</button>
        </div>
        <form [formGroup]="productForm" (ngSubmit)="saveProduct()">
          <div class="modal-body">

            <!-- Section 1: Thông tin cơ bản -->
            <div class="form-section-title">Thông tin cơ bản</div>
            <div class="form-row">
              <div class="form-group col-2">
                <label class="form-label required">Tên thuốc</label>
                <input type="text" formControlName="name" class="form-control" placeholder="Ví dụ: Paracetamol 500mg"/>
              </div>
              <div class="form-group col-1">
                <label class="form-label required">Đơn vị tính</label>
                <input type="text" formControlName="unit" class="form-control" placeholder="Viên, Hộp, Vỉ..."/>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group col-1">
                <label class="form-label">Nhóm thuốc</label>
                <select formControlName="category" class="form-control">
                  <option value="">-- Chọn nhóm --</option>
                  <option *ngFor="let c of categories" [value]="c">{{ c }}</option>
                </select>
              </div>
              <div class="form-group col-1">
                <label class="form-label">Dạng bào chế</label>
                <select formControlName="dosageForm" class="form-control">
                  <option value="">-- Chọn dạng --</option>
                  <option *ngFor="let d of dosageForms" [value]="d">{{ d }}</option>
                </select>
              </div>
              <div class="form-group col-1">
                <label class="form-label">Hàm lượng / Nồng độ</label>
                <input type="text" formControlName="strength" class="form-control" placeholder="500mg, 10mg/5ml..."/>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group col-1">
                <label class="form-label">Hoạt chất chính</label>
                <input type="text" formControlName="activeIngredient" class="form-control" placeholder="Acetaminophen, Amoxicillin..."/>
              </div>
              <div class="form-group col-1">
                <label class="form-label">Hãng sản xuất</label>
                <input type="text" formControlName="manufacturer" class="form-control" placeholder="Sanofi, Stada, DHG..."/>
              </div>
            </div>

            <!-- Section 2: Giá & Kho -->
            <div class="form-section-title">Giá & Tồn kho</div>
            <div class="form-row">
              <div class="form-group col-1">
                <label class="form-label required">Giá nhập (VND)</label>
                <input type="number" formControlName="importPrice" class="form-control mono" min="0"/>
              </div>
              <div class="form-group col-1">
                <label class="form-label required">Giá bán (VND)</label>
                <input type="number" formControlName="sellingPrice" class="form-control mono" min="0"/>
              </div>
              <div class="form-group col-1">
                <label class="form-label">Tồn kho tối thiểu</label>
                <input type="number" formControlName="minStockLevel" class="form-control mono" min="0"/>
              </div>
            </div>

            <!-- Section 2.5: Quy đổi đơn vị động -->
            <div class="form-section-title">Quy đổi đơn vị (Động)</div>
            <div class="conversions-container card" style="padding: 1rem; border: 1px dashed var(--border-color); background: rgba(0,0,0,0.1); margin-bottom: 1rem;">
              <table class="table-conversions" style="width:100%; border-collapse:collapse;">
                <thead>
                  <tr>
                    <th style="text-align:left; font-size:.78rem; color:var(--text-secondary); padding:.4rem; border-bottom:1px solid var(--border-color);">Đơn vị quy đổi</th>
                    <th style="text-align:center; font-size:.78rem; color:var(--text-secondary); padding:.4rem; border-bottom:1px solid var(--border-color);">Giá trị quy đổi</th>
                    <th style="text-align:right; font-size:.78rem; color:var(--text-secondary); padding:.4rem; border-bottom:1px solid var(--border-color);">Giá bán quy đổi</th>
                    <th style="text-align:center; width:50px; font-size:.78rem; color:var(--text-secondary); padding:.4rem; border-bottom:1px solid var(--border-color);">Xoá</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let uc of unitConversions; let idx = index">
                    <td style="padding:.4rem; border-bottom:1px solid var(--border-color);">
                      <input type="text" [(ngModel)]="uc.unitName" [ngModelOptions]="{standalone: true}" class="form-control form-control-xs" placeholder="Ví dụ: Vỉ, Hộp" style="width:100%;"/>
                    </td>
                    <td style="padding:.4rem; border-bottom:1px solid var(--border-color);">
                      <div class="input-conversion-group" style="display:flex; align-items:center; justify-content:center; gap:.25rem;">
                        <span style="font-size:.8rem; color:var(--text-secondary)">1 {{ uc.unitName || 'đơn vị' }} =</span>
                        <input type="number" [(ngModel)]="uc.conversionValue" [ngModelOptions]="{standalone: true}" class="form-control form-control-xs mono text-center" min="1" style="width:65px;"/>
                        <span style="font-size:.8rem; color:var(--text-secondary)">{{ productForm.get('unit')?.value || 'Viên' }}</span>
                      </div>
                    </td>
                    <td style="padding:.4rem; border-bottom:1px solid var(--border-color);">
                      <input type="number" [(ngModel)]="uc.sellingPrice" [ngModelOptions]="{standalone: true}" class="form-control form-control-xs mono text-right" min="0" placeholder="0" style="width:100%;"/>
                    </td>
                    <td style="text-align:center; padding:.4rem; border-bottom:1px solid var(--border-color);">
                      <button type="button" (click)="removeConversion(idx)" class="btn btn-outline-danger btn-xs btn-icon" style="border-radius:4px; padding:.2rem .4rem; display:inline-flex; align-items:center; justify-content:center;">
                        <i class="fa-solid fa-trash-can"></i>
                      </button>
                    </td>
                  </tr>
                  <tr *ngIf="unitConversions.length === 0">
                    <td colspan="4" style="text-align:center; color:var(--text-secondary); font-size:.8rem; padding:1rem 0;">
                      Chưa cấu hình đơn vị quy đổi động. Hệ thống sẽ bán mặc định theo đơn vị cơ bản: <strong>{{ productForm.get('unit')?.value || 'đơn vị cơ bản' }}</strong>.
                    </td>
                  </tr>
                </tbody>
              </table>
              <button type="button" (click)="addConversion()" class="btn btn-outline-primary btn-xs mt-2" style="display:inline-flex; align-items:center; gap:.25rem; font-size:.8rem; padding:.25rem .5rem;">
                <i class="fa-solid fa-plus-circle"></i> Thêm đơn vị quy đổi
              </button>
            </div>

            <!-- Section 3: Thông tin bổ sung -->
            <div class="form-section-title">Thông tin bổ sung</div>
            <div class="form-row">
              <div class="form-group col-2">
                <label class="form-label">Điều kiện bảo quản</label>
                <input type="text" formControlName="storageConditions" class="form-control"
                       placeholder="Bảo quản nơi khô ráo, dưới 30°C, tránh ánh sáng..."/>
              </div>
              <div class="form-group col-1 checkbox-group">
                <label class="form-label">Thuốc kê đơn (Rx)</label>
                <label class="checkbox-label">
                  <input type="checkbox" formControlName="prescriptionRequired"/>
                  <span>Yêu cầu đơn bác sĩ</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Mô tả / Chỉ định / Chống chỉ định</label>
              <textarea formControlName="description" class="form-control" rows="5"
                        placeholder="Nhập mô tả thuốc, chỉ định điều trị, chống chỉ định, tác dụng phụ, liều dùng...">
              </textarea>
              <small class="form-hint">Hỗ trợ nhập văn bản đa dòng. Tổng số ký tự: {{ productForm.get('description')?.value?.length || 0 }}</small>
            </div>

            <div class="alert alert-danger" *ngIf="modalError">{{ modalError }}</div>
          </div>
          <div class="modal-footer">
            <button type="button" (click)="showProductModal=false" class="btn btn-secondary">Hủy</button>
            <button type="submit" class="btn btn-primary" [disabled]="productForm.invalid || saving">
              <i class="fa-solid fa-spinner fa-spin" *ngIf="saving"></i>
              {{ saving ? 'Đang lưu...' : 'Lưu thuốc' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: Add Batch -->
    <div class="modal-backdrop" *ngIf="showBatchModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3><i class="fa-solid fa-truck-ramp-box text-success"></i> Nhập lô hàng</h3>
          <button class="close-btn" (click)="showBatchModal=false">&times;</button>
        </div>
        <form [formGroup]="batchForm" (ngSubmit)="saveBatch()">
          <div class="modal-body">
            <div class="batch-product-info">
              <i class="fa-solid fa-pills"></i>
              <span>{{ selectedProduct?.name }}</span>
            </div>
            <div class="form-group">
              <label class="form-label required">Số lô (Batch Number)</label>
              <input type="text" formControlName="batchNumber" class="form-control" placeholder="LOT-2026-A"/>
            </div>
            <div class="form-row" style="grid-template-columns: 1.2fr 1fr 1fr; gap: 0.75rem;">
              <div class="form-group">
                <label class="form-label required">Hạn sử dụng</label>
                <input type="date" formControlName="expirationDate" class="form-control"/>
              </div>
              <div class="form-group">
                <label class="form-label required">Đơn vị nhập</label>
                <select 
                  [(ngModel)]="selectedImportUnit" 
                  [ngModelOptions]="{standalone: true}" 
                  class="form-control"
                  style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary);"
                >
                  <option [value]="selectedProduct?.unit">{{ selectedProduct?.unit }} (Cơ bản)</option>
                  <option *ngFor="let uc of selectedProduct?.unitConversions" [value]="uc.unitName">
                    {{ uc.unitName }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label required">Số lượng</label>
                <input type="number" formControlName="quantity" class="form-control mono" min="1"/>
              </div>
            </div>
            
            <div class="form-hint" *ngIf="selectedProduct && selectedImportUnit !== selectedProduct.unit" style="margin-top: -0.5rem; margin-bottom: 1rem; color: var(--primary); font-weight: 600; display: flex; align-items: center; gap: 0.35rem;">
              <i class="fa-solid fa-calculator text-primary"></i> Quy đổi tồn kho: 
              {{ batchForm.get('quantity')?.value || 0 }} {{ selectedImportUnit }} 
              = {{ (batchForm.get('quantity')?.value || 0) * getImportConversionFactor() }} {{ selectedProduct.unit }}
            </div>
            <div class="form-group">
              <label class="form-label">Giá nhập lô này (VND) <small>tuỳ chọn</small></label>
              <input type="number" formControlName="importPrice" class="form-control mono" min="0"
                     [placeholder]="'Mặc định: ' + (selectedProduct?.importPrice | number:'1.0-0') + 'đ'"/>
            </div>
            <div class="alert alert-danger" *ngIf="modalError">{{ modalError }}</div>
          </div>
          <div class="modal-footer">
            <button type="button" (click)="showBatchModal=false" class="btn btn-secondary">Hủy</button>
            <button type="submit" class="btn btn-success" [disabled]="batchForm.invalid || saving">
              <i class="fa-solid fa-spinner fa-spin" *ngIf="saving"></i>
              {{ saving ? 'Đang nhập...' : 'Xác nhận nhập kho' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: Product History -->
    <div class="modal-backdrop" *ngIf="showHistoryModal">
      <div class="modal-card modal-wide">
        <div class="modal-header" style="flex-direction: column; align-items: flex-start; gap: 0.75rem;">
          <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
            <h3><i class="fa-solid fa-boxes-stacked text-info"></i> Quản lý lô & Nhật ký: {{ selectedProduct?.name }}</h3>
            <button class="close-btn" (click)="showHistoryModal=false">&times;</button>
          </div>
          <div class="filter-tabs" style="border: none; padding: 0; background: none; display: flex; gap: 0.5rem; width: 100%;">
            <button class="tab" [class.active]="activeHistoryTab==='batches'" (click)="activeHistoryTab='batches'">
              <i class="fa-solid fa-boxes-stacked"></i> Quản lý lô & Tồn kho
            </button>
            <button class="tab" [class.active]="activeHistoryTab==='sales'" (click)="activeHistoryTab='sales'">
              <i class="fa-solid fa-receipt"></i> Lịch sử mua bán (Đơn hàng)
            </button>
            <button class="tab" [class.active]="activeHistoryTab==='modifications'" (click)="activeHistoryTab='modifications'">
              <i class="fa-solid fa-clock-rotate-left"></i> Lịch sử sửa đổi (Danh mục)
            </button>
          </div>
        </div>
        <div class="modal-body" style="max-height: 60vh;">
          <!-- TAB 1: Batches & Stock Management -->
          <div *ngIf="activeHistoryTab === 'batches'">
            <div class="table-responsive" *ngIf="batchesList.length > 0; else emptyBatches">
              <table class="table" style="font-size: 0.88rem;">
                <thead>
                  <tr>
                    <th>Số lô</th>
                    <th>Hạn sử dụng</th>
                    <th class="text-center" style="width: 150px;">Số lượng tồn</th>
                    <th class="text-right" style="width: 180px;" *ngIf="isAdmin()">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let b of batchesList">
                    <!-- Read-only mode -->
                    <ng-container *ngIf="editingBatchId !== b.id">
                      <td class="mono fw600">{{ b.batchNumber }}</td>
                      <td>
                        <span [class.text-danger]="isExpired(b.expirationDate)">
                          {{ b.expirationDate | date:'dd/MM/yyyy' }}
                        </span>
                        <span *ngIf="isExpired(b.expirationDate)" class="text-danger small" style="margin-left: 0.25rem;">(Hết hạn)</span>
                      </td>
                      <td class="text-center mono fw600">{{ b.currentQuantity }} {{ selectedProduct?.unit }}</td>
                      <td class="text-right" *ngIf="isAdmin()">
                        <button (click)="startEditBatch(b)" class="btn btn-outline-primary btn-xs" style="margin-right: 0.25rem;">
                          <i class="fa-solid fa-pen"></i> Sửa
                        </button>
                        <button (click)="deleteBatch(b)" class="btn btn-outline-danger btn-xs">
                          <i class="fa-solid fa-trash"></i> Xóa
                        </button>
                      </td>
                    </ng-container>

                    <!-- Edit mode -->
                    <ng-container *ngIf="editingBatchId === b.id">
                      <td>
                        <input type="text" [(ngModel)]="editBatchNumber" class="form-control form-control-xs font-mono" />
                      </td>
                      <td>
                        <input type="date" [(ngModel)]="editExpirationDate" class="form-control form-control-xs" />
                      </td>
                      <td class="text-center">
                        <input type="number" [(ngModel)]="editCurrentQuantity" min="0" class="form-control form-control-xs font-mono text-center" style="max-width: 100px; display: inline-block;" />
                        <span class="small" style="margin-left: 0.25rem;">{{ selectedProduct?.unit }}</span>
                      </td>
                      <td class="text-right">
                        <button (click)="saveEditBatch(b)" class="btn btn-success btn-xs" style="margin-right: 0.25rem;">
                          <i class="fa-solid fa-check"></i> Lưu
                        </button>
                        <button (click)="cancelEditBatch()" class="btn btn-secondary btn-xs">
                          <i class="fa-solid fa-xmark"></i> Hủy
                        </button>
                      </td>
                    </ng-container>
                  </tr>
                </tbody>
              </table>
            </div>
            <ng-template #emptyBatches>
              <div class="empty-state" style="padding: 2rem;">
                <i class="fa-solid fa-boxes-packing" style="font-size: 2rem;"></i>
                <p>Thuốc này hiện chưa có lô hàng nào trong kho. Hãy nhập lô hàng mới!</p>
              </div>
            </ng-template>
          </div>

          <!-- TAB 2: Sales History -->
          <div *ngIf="activeHistoryTab === 'sales'">
            <div class="table-responsive" *ngIf="historyList.length > 0; else emptyHistory">
              <table class="table" style="font-size: 0.88rem;">
                <thead>
                  <tr>
                    <th>Mã hóa đơn</th>
                    <th>Ngày bán</th>
                    <th>Nhân viên</th>
                    <th>Khách hàng</th>
                    <th>Số lô</th>
                    <th class="text-center">Số lượng</th>
                    <th class="text-right">Đơn giá</th>
                    <th class="text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let h of historyList">
                    <td class="mono fw600 text-primary">{{ h.orderCode }}</td>
                    <td>{{ h.saleDate | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td>{{ h.staffName }}</td>
                    <td>{{ h.customerName }}</td>
                    <td class="mono">{{ h.batchNumber }}</td>
                    <td class="text-center mono fw600">
                      {{ h.quantity }} {{ h.soldUnit || selectedProduct?.unit }}
                      <span *ngIf="h.conversionValue && h.conversionValue > 1" class="text-secondary small" style="display: block; font-size: 0.72rem;">
                        (quy đổi x{{ h.conversionValue }} {{ selectedProduct?.unit }})
                      </span>
                    </td>
                    <td class="text-right mono">{{ h.unitPrice | number:'1.0-0' }}đ</td>
                    <td class="text-right mono fw600 text-success">{{ h.subtotal | number:'1.0-0' }}đ</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ng-template #emptyHistory>
              <div class="empty-state" style="padding: 2rem;">
                <i class="fa-solid fa-receipt" style="font-size: 2rem;"></i>
                <p>Chưa có giao dịch bán hàng nào cho thuốc này.</p>
              </div>
            </ng-template>
          </div>

          <!-- TAB 3: Modification History (Audit Log) -->
          <div *ngIf="activeHistoryTab === 'modifications'">
            <div class="table-responsive" *ngIf="auditLogsList.length > 0; else emptyAudit">
              <table class="table" style="font-size: 0.88rem;">
                <thead>
                  <tr>
                    <th>Ngày thực hiện</th>
                    <th>Người thực hiện</th>
                    <th>Hành động</th>
                    <th>Chi tiết thay đổi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let log of auditLogsList">
                    <td class="font-mono text-secondary" style="white-space: nowrap;">{{ log.changedAt | date:'dd/MM/yyyy HH:mm:ss' }}</td>
                    <td class="font-semibold">{{ log.changedBy }}</td>
                    <td>
                      <span class="role-badge admin" style="font-size: 0.75rem;" *ngIf="log.action === 'Thêm mới'">
                        {{ log.action }}
                      </span>
                      <span class="role-badge staff" style="font-size: 0.75rem;" *ngIf="log.action === 'Cập nhật'">
                        {{ log.action }}
                      </span>
                      <span class="role-badge" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); font-size: 0.75rem;" *ngIf="log.action === 'Xóa'">
                        {{ log.action }}
                      </span>
                      <span class="role-badge" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2); font-size: 0.75rem;" *ngIf="log.action === 'Nhập lô'">
                        {{ log.action }}
                      </span>
                    </td>
                    <td>{{ log.details }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ng-template #emptyAudit>
              <div class="empty-state" style="padding: 2rem;">
                <i class="fa-solid fa-clock-rotate-left" style="font-size: 2rem;"></i>
                <p>Chưa ghi nhận lịch sử thay đổi danh mục nào cho thuốc này.</p>
              </div>
            </ng-template>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" (click)="showHistoryModal=false" class="btn btn-secondary">Đóng</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .products-page { display:flex; flex-direction:column; gap:1.5rem; }
    .page-header { display:flex; align-items:flex-start; justify-content:space-between; }
    .page-header h2 { font-size:1.35rem; font-weight:700; display:flex; align-items:center; gap:.5rem; margin:0; }
    .subtitle { color:var(--text-secondary); font-size:.85rem; margin-top:.25rem; }
    .filters-bar { display:flex; align-items:center; justify-content:space-between; padding:1rem 1.5rem; gap:1rem; flex-wrap:wrap; }
    .filter-tabs { display:flex; gap:.4rem; }
    .tab { background:none; border:1px solid var(--border-color); color:var(--text-secondary); padding:.45rem .9rem; border-radius:8px; cursor:pointer; font-size:.83rem; font-weight:600; display:flex; align-items:center; gap:.4rem; transition:all .2s; }
    .tab:hover { color:var(--text-primary); background:var(--bg-hover); }
    .tab.active { background:var(--primary-light); color:var(--primary); border-color:var(--primary); }
    .badge { font-size:.7rem; background:var(--bg-main); color:var(--text-secondary); padding:.1rem .4rem; border-radius:20px; font-weight:700; }
    .bg-red { background:#ef4444 !important; color:#fff !important; }
    .bg-orange { background:#f97316 !important; color:#fff !important; }
    .search-box { position:relative; flex:1; max-width:420px; }
    .search-box i { position:absolute; left:1rem; top:50%; transform:translateY(-50%); color:var(--text-secondary); }
    .search-box .form-control { padding-left:2.5rem; width:100%; }
    .product-name { font-weight:600; font-size:.93rem; }
    .product-meta { color:var(--text-secondary); font-size:.8rem; }
    .badge-low { font-size:.7rem; background:rgba(239,68,68,.1); color:#ef4444; border:1px solid rgba(239,68,68,.2); padding:.1rem .4rem; border-radius:4px; display:inline-block; margin-top:.2rem; }
    .tag { font-size:.75rem; background:var(--primary-light); color:var(--primary); padding:.15rem .5rem; border-radius:4px; display:inline-block; }
    .small { font-size:.78rem; }
    .mono { font-family:monospace; }
    .fw600 { font-weight:600; }
    .primary { color:var(--primary); }
    .row-danger { background:rgba(239,68,68,.035) !important; }
    .actions { display:flex; gap:.35rem; justify-content:flex-end; }
    .btn-xs { padding:.22rem .55rem; font-size:.75rem; }
    .empty-state { padding:4rem; text-align:center; color:var(--text-secondary); }
    .empty-state i { font-size:3rem; display:block; margin-bottom:1rem; }
    .modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.65); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:1000; padding:1.5rem; }
    .modal-card { background:var(--bg-card); border:1px solid var(--border-color); border-radius:14px; width:100%; max-width:700px; box-shadow:var(--shadow-lg); animation:fadeIn .2s ease; }
    .modal-wide { max-width:1050px; }
    @keyframes fadeIn { from{transform:scale(.96);opacity:0} to{transform:scale(1);opacity:1} }
    .modal-header { padding:1.25rem 1.5rem; border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between; }
    .modal-header h3 { font-size:1.1rem; font-weight:700; display:flex; align-items:center; gap:.5rem; margin:0; }
    .close-btn { background:none; border:none; color:var(--text-secondary); font-size:1.5rem; cursor:pointer; }
    .modal-body { padding:1.5rem; display:flex; flex-direction:column; gap:1rem; max-height:75vh; overflow-y:auto; }
    .modal-footer { padding:1rem 1.5rem; border-top:1px solid var(--border-color); display:flex; justify-content:flex-end; gap:.75rem; background:var(--bg-main); }
    .form-section-title { font-size:.75rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--text-secondary); padding-bottom:.4rem; border-bottom:1px solid var(--border-color); margin-top:.25rem; }
    .form-row { display:grid; gap:1rem; }
    .form-row.col-1 { }
    .col-1 { grid-template-columns:1fr; }
    .form-row { grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); }
    .col-2 { grid-column:span 2; }
    label.required::after { content:'*'; color:#ef4444; margin-left:.2rem; }
    textarea.form-control { resize:vertical; min-height:100px; font-family:inherit; line-height:1.6; }
    .form-hint { color:var(--text-secondary); font-size:.78rem; margin-top:.25rem; }
    .checkbox-group { display:flex; flex-direction:column; justify-content:flex-end; }
    .checkbox-label { display:flex; align-items:center; gap:.5rem; cursor:pointer; padding:.6rem; border:1px solid var(--border-color); border-radius:8px; background:var(--bg-main); }
    .checkbox-label input[type=checkbox] { width:16px; height:16px; accent-color:var(--primary); cursor:pointer; }
    .batch-product-info { display:flex; align-items:center; gap:.6rem; padding:.75rem 1rem; background:var(--primary-light); border:1px solid var(--primary); border-radius:8px; color:var(--primary); font-weight:600; font-size:.9rem; }
    .table-conversions { width:100%; border-collapse:collapse; margin-top:.5rem; }
    .table-conversions th { font-size:.78rem; text-transform:uppercase; letter-spacing:.03em; color:var(--text-secondary); padding:.5rem; border-bottom:1px solid var(--border-color); }
    .table-conversions td { padding:.5rem; vertical-align:middle; border-bottom:1px solid var(--border-color); }
    .form-control-xs { padding:.25rem .5rem; font-size:.82rem; border-radius:6px; background:var(--bg-surface); border:1px solid var(--border-color); color:var(--text-primary); }
    .input-conversion-group { display:flex; align-items:center; gap:.35rem; font-size:.82rem; color:var(--text-secondary); }
    .input-conversion-group input { text-align:center; }
    .mt-2 { margin-top:.5rem; }
    .py-2 { padding-top:.5rem; padding-bottom:.5rem; }
    .btn-icon { width:32px; height:32px; display:flex; align-items:center; justify-content:center; padding:0; border-radius:50%; }
  `]
})
export class ProductsComponent implements OnInit {
  products: ProductDto[] = [];
  filtered: ProductDto[] = [];
  searchQuery = '';
  activeTab = 'all';
  lowStockCount = 0;
  expiringCount = 0;
  totalStock = 0;
  unitConversions: any[] = [];
  selectedImportUnit: string = '';

  showProductModal = false;
  showBatchModal = false;
  editMode = false;
  selectedProductId: string | null = null;
  selectedProduct: ProductDto | null = null;
  saving = false;
  modalError: string | null = null;
  showHistoryModal = false;
  historyList: any[] = [];
  activeHistoryTab = 'sales';
  auditLogsList: any[] = [];
  batchesList: any[] = [];
  editingBatchId: string | null = null;
  editBatchNumber = '';
  editExpirationDate = '';
  editCurrentQuantity = 0;

  categories = CATEGORIES;
  dosageForms = DOSAGE_FORMS;

  productForm: FormGroup;
  batchForm: FormGroup;

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  constructor(private fb: FormBuilder, private svc: ProductService, private authService: AuthService) {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      unit: ['', Validators.required],
      category: [''],
      dosageForm: [''],
      strength: [''],
      activeIngredient: [''],
      manufacturer: [''],
      storageConditions: [''],
      prescriptionRequired: [false],
      description: [''],
      importPrice: [0, [Validators.required, Validators.min(0)]],
      sellingPrice: [0, [Validators.required, Validators.min(0)]],
      minStockLevel: [10, [Validators.min(0)]]
    });

    this.batchForm = this.fb.group({
      batchNumber: ['', Validators.required],
      expirationDate: ['', Validators.required],
      quantity: [100, [Validators.required, Validators.min(1)]],
      importPrice: [null]
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.svc.getAll().subscribe(res => {
      this.products = res;
      this.totalStock = res.reduce((s, p) => s + p.totalStock, 0);
      this.applyFilter();
    });
    this.svc.getAlerts().subscribe(res => {
      this.lowStockCount = res.lowStockProducts.length;
      this.expiringCount = res.expiringBatches.length;
    });
  }

  setTab(tab: string): void { this.activeTab = tab; this.applyFilter(); }

  applyFilter(): void {
    let r = this.products;
    const q = this.searchQuery.trim().toLowerCase();
    if (q) r = r.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.activeIngredient ?? '').toLowerCase().includes(q) ||
      (p.manufacturer ?? '').toLowerCase().includes(q) ||
      (p.category ?? '').toLowerCase().includes(q)
    );
    if (this.activeTab === 'lowStock') r = r.filter(p => p.totalStock < p.minStockLevel);
    else if (this.activeTab === 'expiring') {
      this.svc.getAlerts().subscribe(a => {
        const ids = a.expiringBatches.map(b => b.productId);
        this.filtered = r.filter(p => ids.includes(p.id));
      });
      return;
    } else if (this.activeTab === 'rx') r = r.filter(p => p.prescriptionRequired);
    this.filtered = r;
  }

  isLowStock(p: ProductDto): boolean { return p.totalStock < p.minStockLevel; }

  openAddModal(): void {
    this.editMode = false;
    this.selectedProductId = null;
    this.productForm.reset({ prescriptionRequired: false, importPrice: 0, sellingPrice: 0, minStockLevel: 10 });
    this.unitConversions = [];
    this.modalError = null;
    this.showProductModal = true;
  }

  openEditModal(p: ProductDto): void {
    this.editMode = true;
    this.selectedProductId = p.id;
    this.productForm.patchValue({
      name: p.name, unit: p.unit, category: p.category ?? '', dosageForm: p.dosageForm ?? '',
      strength: p.strength ?? '', activeIngredient: p.activeIngredient ?? '',
      manufacturer: p.manufacturer ?? '', storageConditions: p.storageConditions ?? '',
      prescriptionRequired: p.prescriptionRequired, description: p.description ?? '',
      importPrice: p.importPrice, sellingPrice: p.sellingPrice, minStockLevel: p.minStockLevel
    });
    this.unitConversions = p.unitConversions ? p.unitConversions.map(uc => ({ ...uc })) : [];
    this.modalError = null;
    this.showProductModal = true;
  }

  addConversion(): void {
    this.unitConversions.push({
      unitName: '',
      conversionValue: 2,
      sellingPrice: 0
    });
  }

  removeConversion(idx: number): void {
    this.unitConversions.splice(idx, 1);
  }

  saveProduct(): void {
    if (this.productForm.invalid) return;
    this.saving = true;
    this.modalError = null;

    const validConversions = this.unitConversions.filter(uc => uc.unitName && uc.unitName.trim() !== '');

    // Use a fixed default supplier ID - will be loaded dynamically in a full implementation
    const payload: CreateProductRequest = {
      supplierId: '00000000-0000-0000-0000-000000000001',
      ...this.productForm.value,
      unitConversions: validConversions
    };

    const onSuccess = () => { this.showProductModal = false; this.saving = false; this.load(); };
    const onError = (e: any) => { this.saving = false; this.modalError = e.error?.error || 'Không thể lưu sản phẩm.'; };

    if (this.editMode && this.selectedProductId) {
      this.svc.update(this.selectedProductId, payload).subscribe({ next: onSuccess, error: onError });
    } else {
      this.svc.create(payload).subscribe({ next: () => onSuccess(), error: onError });
    }
  }

  deleteProduct(p: ProductDto): void {
    if (!confirm(`Xoá thuốc "${p.name}"?`)) return;
    this.svc.delete(p.id).subscribe({ next: () => this.load() });
  }

  openBatchModal(p: ProductDto): void {
    this.selectedProduct = p;
    this.selectedImportUnit = p.unit;
    this.batchForm.reset({ quantity: 100 });
    this.modalError = null;
    this.showBatchModal = true;
  }

  saveBatch(): void {
    if (this.batchForm.invalid || !this.selectedProduct) return;
    this.saving = true;
    this.modalError = null;
    const v = this.batchForm.value;
    const finalQty = v.quantity * this.getImportConversionFactor();
    const payload: CreateBatchRequest = {
      batchNumber: v.batchNumber,
      expirationDate: new Date(v.expirationDate).toISOString(),
      quantity: finalQty,
      importPrice: v.importPrice || undefined
    };
    this.svc.addBatch(this.selectedProduct.id, payload).subscribe({
      next: () => { this.showBatchModal = false; this.saving = false; this.load(); },
      error: (e) => { this.saving = false; this.modalError = e.error?.error || 'Không thể nhập lô hàng.'; }
    });
  }

  getImportConversionFactor(): number {
    if (!this.selectedProduct || !this.selectedImportUnit) return 1;
    if (this.selectedImportUnit === this.selectedProduct.unit) return 1;
    const conv = this.selectedProduct.unitConversions?.find(uc => uc.unitName === this.selectedImportUnit);
    return conv ? conv.conversionValue : 1;
  }

  openHistoryModal(p: ProductDto): void {
    this.selectedProduct = p;
    this.historyList = [];
    this.auditLogsList = [];
    this.batchesList = [];
    this.editingBatchId = null;
    this.activeHistoryTab = 'batches'; // default to batches tab to show stock quantity

    this.svc.getProductHistory(p.id).subscribe({
      next: (res) => {
        this.historyList = res;
      },
      error: (err) => {
        console.error('Không thể tải lịch sử mua bán.', err);
      }
    });

    this.svc.getProductAuditLogs(p.id).subscribe({
      next: (res) => {
        this.auditLogsList = res;
      },
      error: (err) => {
        console.error('Không thể tải lịch sử sửa đổi.', err);
      }
    });

    this.loadBatches(p.id);

    this.showHistoryModal = true;
  }

  isExpired(dateStr: string): boolean {
    return new Date(dateStr) < new Date();
  }

  startEditBatch(b: any): void {
    this.editingBatchId = b.id;
    this.editBatchNumber = b.batchNumber;
    const date = new Date(b.expirationDate);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    this.editExpirationDate = `${yyyy}-${mm}-${dd}`;
    this.editCurrentQuantity = b.currentQuantity;
  }

  cancelEditBatch(): void {
    this.editingBatchId = null;
  }

  saveEditBatch(b: any): void {
    if (!this.editBatchNumber.trim()) {
      alert('Vui lòng nhập số lô.');
      return;
    }
    const payload = {
      batchNumber: this.editBatchNumber,
      expirationDate: new Date(this.editExpirationDate).toISOString(),
      currentQuantity: this.editCurrentQuantity
    };
    this.svc.updateBatch(b.id, payload).subscribe({
      next: () => {
        this.editingBatchId = null;
        this.loadBatches(b.productId);
        this.load();
      },
      error: (e) => {
        alert(e.error?.error || 'Không thể cập nhật lô hàng.');
      }
    });
  }

  deleteBatch(b: any): void {
    if (!confirm(`Bạn chắc chắn muốn xóa lô hàng "${b.batchNumber}"? Toàn bộ tồn kho của lô này sẽ bị xóa.`)) return;
    this.svc.deleteBatch(b.id).subscribe({
      next: () => {
        this.loadBatches(b.productId);
        this.load();
      },
      error: (e) => {
        alert(e.error?.error || 'Không thể xóa lô hàng.');
      }
    });
  }

  loadBatches(productId: string): void {
    this.svc.getBatches(productId).subscribe({
      next: (res) => {
        this.batchesList = res;
      },
      error: (err) => {
        console.error('Không thể tải danh sách lô.', err);
      }
    });
  }

  exportToCsv(): void {
    if (this.filtered.length === 0) {
      alert('Không có dữ liệu thuốc để xuất.');
      return;
    }

    const headers = [
      'Tên thuốc',
      'Nhóm thuốc',
      'Hoạt chất chính',
      'Dạng bào chế',
      'Hàm lượng',
      'Đơn vị tính',
      'Giá nhập (đ)',
      'Giá bán (đ)',
      'Tồn kho hiện tại',
      'Tồn tối thiểu',
      'Kê đơn (Rx)',
      'Hãng sản xuất',
      'Điều kiện bảo quản'
    ];

    const rows = this.filtered.map(p => [
      p.name,
      p.category || '',
      p.activeIngredient || '',
      p.dosageForm || '',
      p.strength || '',
      p.unit,
      p.importPrice.toString(),
      p.sellingPrice.toString(),
      p.totalStock.toString(),
      p.minStockLevel.toString(),
      p.prescriptionRequired ? 'Có' : 'Không',
      p.manufacturer || '',
      p.storageConditions || ''
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
    
    let filterSuffix = '';
    if (this.activeTab === 'lowStock') filterSuffix = '_sap_het_hang';
    else if (this.activeTab === 'expiring') filterSuffix = '_can_han_su_dung';
    else if (this.activeTab === 'rx') filterSuffix = '_thuoc_ke_don';

    link.setAttribute('href', url);
    link.setAttribute('download', `Danh_sach_thuoc${filterSuffix}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
