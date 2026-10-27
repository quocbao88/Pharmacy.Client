import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { timeout } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-config';

@Component({
  selector: 'app-backup',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="page-header">
      <h1>Sao lưu dữ liệu</h1>
      <p class="text-secondary">Tải bản sao dữ liệu nhà thuốc về máy để lưu giữ độc lập.</p>
    </header>
    <section class="card backup-card" aria-labelledby="backup-title">
      <div class="backup-icon" aria-hidden="true"><i class="fa-solid fa-database"></i></div>
      <div>
        <h2 id="backup-title">Bản sao lưu ứng dụng</h2>
        <p>Gồm danh mục thuốc, số lô, hạn dùng, tồn kho, đơn hàng, khách hàng, tài khoản và lịch sử trong cơ sở dữ liệu ứng dụng.</p>
        <p class="text-secondary">File PostgreSQL .dump chứa cấu trúc và dữ liệu schema public tại thời điểm bắt đầu sao lưu. Không gồm Supabase Auth, Storage hoặc file đính kèm ngoài database.</p>
        <p class="backup-notice">Bản sao có dữ liệu khách hàng và thông tin tài khoản. Hãy lưu ở nơi riêng tư, có bảo vệ và không chia sẻ công khai.</p>
        <button class="btn btn-primary" (click)="download()" [disabled]="busy">
          <i class="fa-solid fa-download" aria-hidden="true"></i>
          <span *ngIf="!busy">Tạo và tải bản sao lưu</span>
          <span *ngIf="busy">Đang tạo bản sao lưu...</span>
        </button>
        <p *ngIf="busy" role="status">Vui lòng giữ trang mở. Quá trình có thể mất vài phút.</p>
        <p *ngIf="message" role="status" class="text-success">{{ message }}</p>
        <p *ngIf="error" role="alert" class="text-danger">{{ error }}</p>
      </div>
    </section>
    <section class="card backup-help">
      <h2>Cách lưu giữ và khôi phục</h2>
      <ol>
        <li>Tải định kỳ và trước khi thay đổi dữ liệu lớn.</li>
        <li>Giữ nhiều bản theo ngày, có thêm một bản ở nơi khác máy bán hàng.</li>
        <li>Khi cần khôi phục, nhờ quản trị dùng pg_restore trên database trống và kiểm tra số lượng hàng trước khi sử dụng.</li>
      </ol>
      <p class="text-secondary">Hệ thống chỉ xuất bản sao; thao tác này không thay đổi dữ liệu đang dùng.</p>
    </section>
  `,
  styles: [`
    :host { display:block; max-width:960px; }
    .page-header { margin-bottom:1.5rem; }
    h1 { margin:0 0 .5rem; font-size:1.75rem; }
    h2 { margin:0 0 .75rem; font-size:1.2rem; }
    p, li { line-height:1.65; }
    .backup-card { display:grid; grid-template-columns:56px 1fr; gap:1.25rem; padding:1.75rem; }
    .backup-icon { display:grid; place-items:center; height:56px; background:var(--primary-light); color:var(--primary); border-radius:12px; font-size:1.5rem; }
    .backup-notice { padding:.75rem 1rem; border-left:3px solid var(--primary); background:var(--bg-main); }
    .backup-help { padding:1.5rem; margin-top:1.5rem; }
    ol { padding-left:1.25rem; }
    button { min-height:44px; }
    @media(max-width:600px) { .backup-card { grid-template-columns:1fr; padding:1.25rem; } button { width:100%; } }
  `]
})
export class BackupComponent {
  busy = false;
  message = '';
  error = '';

  constructor(private http: HttpClient) {}

  download(): void {
    if (this.busy) {
      return;
    }
    this.busy = true;
    this.error = '';
    this.message = '';
    this.http.post(`${API_BASE_URL}/api/backup/export`, null, { responseType: 'blob' })
      .pipe(timeout(240000))
      .subscribe({
        next: blob => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `pharmacy-public-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 60000);
          this.busy = false;
          this.message = 'Đã gửi file cho trình duyệt tải xuống. Kiểm tra thư mục tải xuống và lưu giữ bản sao an toàn.';
        },
        error: async (response: HttpErrorResponse) => {
          this.error = 'Không tải được bản sao lưu. Vui lòng thử lại hoặc liên hệ quản trị.';
          if (response.error instanceof Blob) {
            try {
              const detail = JSON.parse(await response.error.text());
              if (typeof detail.error === 'string') {
                this.error = detail.error;
              }
            } catch {
              // Keep the safe fallback for network and non-JSON errors.
            }
          }
          this.busy = false;
        }
      });
  }
}
