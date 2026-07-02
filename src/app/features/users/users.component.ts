import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { UserService, UserDto } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="users-container">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h2><i class="fa-solid fa-user-gear text-primary"></i> Quản lý Người dùng & Nhân viên</h2>
          <p class="subtitle">Quản lý phân quyền tài khoản truy cập hệ thống. Tổng cộng: {{ users.length }} tài khoản.</p>
        </div>
        <button (click)="openAddModal()" class="btn btn-primary" id="btn-add-user">
          <i class="fa-solid fa-user-plus"></i> Thêm tài khoản mới
        </button>
      </div>

      <!-- Filters -->
      <div class="filters-bar card">
        <div class="search-box">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" [(ngModel)]="searchQuery" (ngModelChange)="applyFilter()"
                 placeholder="Tìm theo họ tên hoặc tên đăng nhập..." class="form-control" id="search-user"/>
        </div>
      </div>

      <!-- Users Table -->
      <div class="card" style="padding: 0;">
        <div class="table-responsive" *ngIf="filteredUsers.length > 0; else emptyState">
          <table class="table">
            <thead>
              <tr>
                <th>Họ và tên nhân viên</th>
                <th>Tên đăng nhập</th>
                <th>Vai trò hệ thống</th>
                <th>Ngày tạo tài khoản</th>
                <th class="text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of filteredUsers">
                <td class="font-semibold" style="font-size: 0.95rem;">
                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div class="user-avatar-small">
                      <i class="fa-solid" [class.fa-user-shield]="u.role === 'Admin'" [class.fa-user-tie]="u.role !== 'Admin'"></i>
                    </div>
                    <div>
                      <div>{{ u.fullName }}</div>
                      <span *ngIf="isCurrentUser(u)" class="current-user-badge">Tài khoản của bạn</span>
                    </div>
                  </div>
                </td>
                <td class="font-mono">{{ u.username }}</td>
                <td>
                  <span class="role-badge" [class.admin]="u.role === 'Admin'" [class.staff]="u.role !== 'Admin'">
                    <i class="fa-solid" [class.fa-shield-halved]="u.role === 'Admin'" [class.fa-user]="u.role !== 'Admin'"></i>
                    {{ u.role === 'Admin' ? 'Quản trị viên' : 'Nhân viên (Staff)' }}
                  </span>
                </td>
                <td class="font-mono text-secondary">{{ u.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                <td class="text-right">
                  <div class="actions">
                    <button (click)="openEditModal(u)" class="btn btn-outline-primary btn-xs" title="Chỉnh sửa thông tin">
                      <i class="fa-solid fa-user-pen"></i> Sửa
                    </button>
                    <button (click)="deleteUser(u)" class="btn btn-outline-danger btn-xs" [disabled]="isCurrentUser(u)" title="Xoá tài khoản">
                      <i class="fa-solid fa-user-xmark"></i> Xóa
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <ng-template #emptyState>
          <div class="empty-state">
            <i class="fa-solid fa-user-slash" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem;"></i>
            <p>Không tìm thấy tài khoản người dùng nào.</p>
          </div>
        </ng-template>
      </div>
    </div>

    <!-- Modal: Add/Edit User -->
    <div class="modal-backdrop" *ngIf="showUserModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3>
            <i class="fa-solid" [class.fa-user-plus]="!editMode" [class.fa-user-pen]="editMode" class="text-primary"></i> 
            {{ editMode ? 'Cập nhật tài khoản' : 'Đăng ký tài khoản mới' }}
          </h3>
          <button class="modal-close-btn" (click)="showUserModal = false">&times;</button>
        </div>
        <form [formGroup]="userForm" (ngSubmit)="saveUser()">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label required">Họ và tên</label>
              <input type="text" formControlName="fullName" class="form-control" placeholder="Ví dụ: Nguyễn Văn A" />
            </div>

            <div class="form-group">
              <label class="form-label required">Tên đăng nhập (Username)</label>
              <input type="text" formControlName="username" class="form-control" placeholder="Ví dụ: nguyenvana" [readonly]="editMode" />
            </div>

            <div class="form-group">
              <label class="form-label" [class.required]="!editMode">Mật khẩu</label>
              <input type="password" formControlName="password" class="form-control" placeholder="Tối thiểu 6 ký tự..." />
              <small class="form-hint" *ngIf="editMode">Để trống nếu không muốn đổi mật khẩu.</small>
            </div>

            <div class="form-group">
              <label class="form-label required">Vai trò phân quyền</label>
              <select formControlName="role" class="form-control">
                <option value="Staff">Nhân viên (Staff)</option>
                <option value="Admin">Quản trị viên (Admin)</option>
              </select>
            </div>

            <div class="alert alert-danger" *ngIf="modalError">
              {{ modalError }}
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" (click)="showUserModal = false" class="btn btn-secondary">Hủy</button>
            <button type="submit" class="btn btn-primary" [disabled]="userForm.invalid || saving">
              <i class="fa-solid fa-spinner fa-spin" *ngIf="saving"></i>
              {{ saving ? 'Đang xử lý...' : 'Lưu tài khoản' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .users-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }
    .page-header h2 {
      font-size: 1.35rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
    }
    .subtitle {
      color: var(--text-secondary);
      font-size: 0.85rem;
      margin-top: 0.25rem;
    }
    .filters-bar {
      display: flex;
      align-items: center;
      padding: 1rem 1.5rem;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
    }
    .search-box {
      position: relative;
      flex: 1;
      max-width: 420px;
    }
    .search-box i {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-secondary);
    }
    .search-box .form-control {
      padding-left: 2.5rem;
      width: 100%;
    }
    .user-avatar-small {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--bg-hover);
      border: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary);
    }
    .current-user-badge {
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.2);
      padding: 0.05rem 0.35rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      display: inline-block;
      margin-top: 0.15rem;
    }
    .role-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }
    .role-badge.admin {
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
      border: 1px solid rgba(59, 130, 246, 0.2);
    }
    .role-badge.staff {
      background: rgba(107, 114, 128, 0.1);
      color: var(--text-secondary);
      border: 1px solid var(--border-color);
    }
    .actions {
      display: flex;
      gap: 0.35rem;
      justify-content: flex-end;
    }
    .btn-xs {
      padding: 0.22rem 0.55rem;
      font-size: 0.75rem;
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
      max-width: 450px;
      box-shadow: var(--shadow-lg);
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn {
      from { transform: scale(0.96); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .modal-header h3 {
      font-size: 1.1rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
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
    label.required::after {
      content: '*';
      color: #ef4444;
      margin-left: 0.2rem;
    }
    .form-hint {
      color: var(--text-secondary);
      font-size: 0.75rem;
      margin-top: 0.25rem;
      display: block;
    }
    .empty-state {
      padding: 4rem;
      text-align: center;
      color: var(--text-secondary);
    }
  `]
})
export class UsersComponent implements OnInit {
  users: UserDto[] = [];
  filteredUsers: UserDto[] = [];
  searchQuery = '';
  showUserModal = false;
  editMode = false;
  selectedUserId: string | null = null;
  selectedUsername: string | null = null;
  userForm: FormGroup;
  modalError: string | null = null;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService
  ) {
    this.userForm = this.fb.group({
      fullName: ['', Validators.required],
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.minLength(6)]],
      role: ['Staff', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.getAll().subscribe({
      next: (res) => {
        this.users = res;
        this.applyFilter();
      }
    });
  }

  applyFilter(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredUsers = this.users;
    } else {
      this.filteredUsers = this.users.filter(u =>
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q)
      );
    }
  }

  isCurrentUser(user: UserDto): boolean {
    const currentUsername = localStorage.getItem('username');
    return user.username.toLowerCase() === currentUsername?.toLowerCase();
  }

  openAddModal(): void {
    this.editMode = false;
    this.selectedUserId = null;
    this.selectedUsername = null;
    this.userForm.reset({ role: 'Staff' });
    this.userForm.get('username')?.setValidators([Validators.required, Validators.minLength(3)]);
    this.userForm.get('username')?.updateValueAndValidity();
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.modalError = null;
    this.saving = false;
    this.showUserModal = true;
  }

  openEditModal(user: UserDto): void {
    this.editMode = true;
    this.selectedUserId = user.id;
    this.selectedUsername = user.username;
    this.userForm.patchValue({
      fullName: user.fullName,
      username: user.username,
      password: '',
      role: user.role
    });
    this.userForm.get('username')?.clearValidators();
    this.userForm.get('username')?.updateValueAndValidity();
    this.userForm.get('password')?.setValidators([Validators.minLength(6)]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.modalError = null;
    this.saving = false;
    this.showUserModal = true;
  }

  saveUser(): void {
    if (this.userForm.invalid) return;
    this.saving = true;
    this.modalError = null;

    if (this.editMode && this.selectedUserId) {
      const formValue = this.userForm.value;
      const payload: any = {
        fullName: formValue.fullName,
        role: formValue.role
      };
      if (formValue.password) {
        payload.password = formValue.password;
      }
      this.userService.update(this.selectedUserId, payload).subscribe({
        next: () => {
          this.showUserModal = false;
          this.saving = false;
          this.loadUsers();
        },
        error: (err) => {
          this.saving = false;
          this.modalError = err.error?.error || 'Cập nhật tài khoản thất bại.';
        }
      });
    } else {
      this.userService.create(this.userForm.value).subscribe({
        next: () => {
          this.showUserModal = false;
          this.saving = false;
          this.loadUsers();
        },
        error: (err) => {
          this.saving = false;
          this.modalError = err.error?.error || 'Tạo tài khoản thất bại.';
        }
      });
    }
  }

  deleteUser(user: UserDto): void {
    if (this.isCurrentUser(user)) {
      alert('Bạn không thể tự xóa tài khoản của chính mình.');
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản của "${user.fullName}" (${user.username})?`)) return;

    this.userService.delete(user.id).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (err) => {
        alert(err.error?.error || 'Xóa tài khoản thất bại.');
      }
    });
  }
}
