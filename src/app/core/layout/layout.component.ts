import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="app-container">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-brand" routerLink="/dashboard" style="cursor: pointer;">
          <svg class="brand-logo" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="4" width="8" height="24" rx="2" fill="#3c50e0"/>
            <rect x="16" y="10" width="8" height="18" rx="2" fill="#80caee"/>
          </svg>
          <span class="brand-text">TTYT Sài Đồng</span>
        </div>

        <div class="menu-label">MENU</div>
        <nav class="sidebar-menu">
          <a *ngIf="isAdmin()" routerLink="/dashboard" routerLinkActive="active" class="menu-item" id="nav-dashboard">
            <i class="fa-solid fa-chart-line"></i>
            <span>Dashboard</span>
          </a>
          <a routerLink="/pos" routerLinkActive="active" class="menu-item" id="nav-pos">
            <i class="fa-solid fa-cart-shopping"></i>
            <span>Lên đơn hàng</span>
          </a>
          <a routerLink="/products" routerLinkActive="active" class="menu-item" id="nav-products">
            <i class="fa-solid fa-boxes-stacked"></i>
            <span>Quản lý thuốc</span>
          </a>
          <a routerLink="/customers" routerLinkActive="active" class="menu-item" id="nav-customers">
            <i class="fa-solid fa-users"></i>
            <span>Khách hàng</span>
          </a>
          <a routerLink="/orders" routerLinkActive="active" class="menu-item" id="nav-orders">
            <i class="fa-solid fa-file-invoice-dollar"></i>
            <span>Quản lý đơn hàng</span>
          </a>
          <a *ngIf="isAdmin()" routerLink="/users" routerLinkActive="active" class="menu-item" id="nav-users">
            <i class="fa-solid fa-user-gear"></i>
            <span>Quản lý User</span>
          </a>
        </nav>
      </aside>

      <!-- Main Panel -->
      <div class="main-panel">
        <header class="header">
          <!-- Search box like TailAdmin -->
          <div class="header-search">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input type="text" placeholder="Type to search..." class="search-input" />
            <span class="search-shortcut">⌘K</span>
          </div>

          <!-- Top-right tools like TailAdmin -->
          <div class="header-right">
            <!-- Theme toggle -->
            <button class="icon-btn" (click)="toggleTheme($event)" [title]="isDarkMode ? 'Chuyển sang Chế độ sáng' : 'Chuyển sang Chế độ tối'">
              <i class="fa-solid" [class.fa-sun]="!isDarkMode" [class.fa-moon]="isDarkMode"></i>
            </button>
            
            <!-- Notification bell with badge dot -->
            <button class="icon-btn relative" title="Thông báo">
              <i class="fa-solid fa-bell"></i>
              <span class="notify-dot"></span>
            </button>

            <!-- User Widget Dropdown -->
            <div class="user-widget" (click)="toggleDropdown($event)">
              <div class="user-info">
                <span class="name">{{ getUserName() }}</span>
                <span class="role">{{ getUserRole() === 'Admin' ? 'Quản trị viên' : 'Nhân viên' }}</span>
              </div>
              <div class="avatar">
                <i class="fa-solid fa-user-tie"></i>
              </div>
              <i class="fa-solid fa-chevron-down chevron"></i>

              <!-- Dropdown menu -->
              <div class="dropdown-menu" [class.show]="showDropdown">
                <div class="dropdown-header">Xin chào, {{ getUserName() }}!</div>
                <hr class="dropdown-divider" />
                <a class="dropdown-item" (click)="logout()">
                  <i class="fa-solid fa-power-off text-danger"></i> Đăng xuất
                </a>
              </div>
            </div>
          </div>
        </header>

        <main class="content-area">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .app-container {
      display: flex;
      min-height: 100vh;
      background-color: var(--bg-main);
      color: var(--text-main);
      font-family: Tahoma, 'Segoe UI', sans-serif;
    }
    .sidebar {
      width: 280px;
      background: var(--bg-surface);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      padding: 1.5rem 1rem;
    }
    .sidebar-brand {
      height: 60px;
      display: flex;
      align-items: center;
      padding: 0 1rem;
      gap: 0.75rem;
      margin-bottom: 2rem;
    }
    .brand-logo {
      flex-shrink: 0;
    }
    .brand-text {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--text-heading);
      letter-spacing: -0.02em;
    }
    .menu-label {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-secondary);
      padding: 0 1rem;
      margin-bottom: 0.75rem;
      letter-spacing: 0.1em;
    }
    .sidebar-menu {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      flex: 1;
    }
    .menu-item {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.8rem 1rem;
      color: var(--text-secondary);
      border-radius: var(--radius-md);
      text-decoration: none;
      transition: var(--transition);
      font-weight: 600;
      font-size: 0.93rem;
    }
    .menu-item:hover {
      background: var(--bg-hover);
      color: var(--text-heading);
    }
    .menu-item.active {
      background: var(--bg-hover);
      color: var(--text-heading);
    }
    .menu-item i {
      width: 18px;
      text-align: center;
      font-size: 1.1rem;
    }
    .main-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .header {
      height: 80px;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 2.5rem;
      position: relative;
    }
    .header-search {
      display: flex;
      align-items: center;
      background: var(--bg-main);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 0.5rem 1rem;
      width: 320px;
      gap: 0.75rem;
    }
    .search-icon {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
    .search-input {
      background: none;
      border: none;
      outline: none;
      color: var(--text-main);
      font-size: 0.9rem;
      width: 100%;
    }
    .search-input::placeholder {
      color: var(--text-muted);
    }
    .search-shortcut {
      background: var(--bg-hover);
      color: var(--text-secondary);
      font-size: 0.75rem;
      padding: 0.15rem 0.35rem;
      border-radius: var(--radius-sm);
      font-family: monospace;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }
    .icon-btn {
      background: var(--bg-hover);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: var(--transition);
    }
    .icon-btn:hover {
      color: var(--text-heading);
      border-color: var(--text-secondary);
    }
    .relative {
      position: relative;
    }
    .notify-dot {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 8px;
      height: 8px;
      background: var(--danger);
      border-radius: 50%;
      border: 1px solid var(--bg-surface);
    }
    .user-widget {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: var(--radius-md);
      position: relative;
      user-select: none;
    }
    .user-widget:hover {
      background: var(--bg-hover);
    }
    .user-widget .user-info {
      display: flex;
      flex-direction: column;
      text-align: right;
    }
    .user-widget .name {
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--text-heading);
    }
    .user-widget .role {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }
    .user-widget .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--bg-hover);
      border: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary);
      font-size: 1.2rem;
    }
    .user-widget .chevron {
      color: var(--text-secondary);
      font-size: 0.8rem;
      transition: var(--transition);
    }
    .user-widget:hover .chevron {
      color: var(--text-heading);
    }
    .dropdown-menu {
      position: absolute;
      top: 60px;
      right: 0;
      width: 200px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      padding: 0.5rem 0;
      display: none;
      flex-direction: column;
      z-index: 1000;
      animation: dropdownFade 0.15s ease-out;
    }
    .dropdown-menu.show {
      display: flex;
    }
    @keyframes dropdownFade {
      from { transform: translateY(10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .dropdown-header {
      padding: 0.5rem 1rem;
      font-size: 0.75rem;
      color: var(--text-secondary);
      font-weight: 700;
      text-transform: uppercase;
    }
    .dropdown-divider {
      border: none;
      border-top: 1px solid var(--border-color);
      margin: 0.35rem 0;
    }
    .dropdown-item {
      padding: 0.65rem 1rem;
      color: var(--text-main);
      text-decoration: none;
      font-size: 0.88rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: var(--transition);
    }
    .dropdown-item:hover {
      background: var(--bg-hover);
      color: var(--text-heading);
    }
    .content-area {
      flex: 1;
      padding: 2.5rem;
      overflow-y: auto;
    }
  `]
})
export class LayoutComponent implements OnInit {
  now = new Date();
  showDropdown = false;
  isDarkMode = true;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const savedTheme = localStorage.getItem('theme');
    const prefersLight = savedTheme === 'light' || (!savedTheme && window.matchMedia('(prefers-color-scheme: light)').matches);
    if (prefersLight) {
      this.isDarkMode = false;
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      this.isDarkMode = true;
      document.documentElement.removeAttribute('data-theme');
    }
  }

  toggleTheme(event: Event): void {
    event.stopPropagation();
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  }

  getUserName(): string | null { return this.authService.getUserName(); }
  getUserRole(): string | null { return this.authService.getUserRole(); }
  isAdmin(): boolean { return this.authService.isAdmin(); }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.showDropdown = !this.showDropdown;
  }

  @HostListener('document:click')
  closeDropdown(): void {
    this.showDropdown = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
