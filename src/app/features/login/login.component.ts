import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="login-header">
          <i class="fa-solid fa-house-medical brand-logo" style="font-size: 3rem; color: var(--primary); margin-bottom: 1rem;"></i>
          <h2>MEDICARE</h2>
          <p style="color: var(--text-secondary); margin-top: 0.25rem;">Hệ thống Quản lý Bán thuốc & Kho chuyên sâu</p>
        </div>

        <div class="alert alert-danger" *ngIf="errorMessage">
          <i class="fa-solid fa-circle-xmark"></i> {{ errorMessage }}
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label class="form-label">Tên đăng nhập</label>
            <div class="input-icon-wrapper">
              <i class="fa-solid fa-user"></i>
              <input
                type="text"
                class="form-control"
                placeholder="Nhập tài khoản..."
                formControlName="username"
              />
            </div>
            <div class="validation-error" *ngIf="isFieldInvalid('username')">
              Tên đăng nhập không được bỏ trống.
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label">Mật khẩu</label>
            <div class="input-icon-wrapper">
              <i class="fa-solid fa-lock"></i>
              <input
                type="password"
                class="form-control"
                placeholder="Nhập mật khẩu..."
                formControlName="password"
              />
            </div>
            <div class="validation-error" *ngIf="isFieldInvalid('password')">
              Mật khẩu không được bỏ trống.
            </div>
          </div>

          <button
            type="submit"
            class="btn btn-primary"
            style="width: 100%; padding: 0.85rem; font-size: 1.05rem;"
            [disabled]="loginForm.invalid || isLoading"
          >
            <span *ngIf="!isLoading"><i class="fa-solid fa-right-to-bracket"></i> ĐĂNG NHẬP</span>
            <span *ngIf="isLoading"><i class="fa-solid fa-spinner fa-spin"></i> Đang xác thực...</span>
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      padding: 1.5rem;
    }
    .login-card {
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 2.5rem;
      width: 100%;
      max-width: 440px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
    }
    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .login-header h2 {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: 0.15em;
      background: linear-gradient(to right, #818cf8, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .input-icon-wrapper {
      position: relative;
    }
    .input-icon-wrapper i {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-secondary);
    }
    .input-icon-wrapper .form-control {
      padding-left: 2.75rem;
    }
    .validation-error {
      color: #ef4444;
      font-size: 0.8rem;
      margin-top: 0.35rem;
      font-weight: 500;
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = null;

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.error || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản và mật khẩu.';
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}
