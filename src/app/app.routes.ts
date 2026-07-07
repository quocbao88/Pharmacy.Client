import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { LayoutComponent } from './core/layout/layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ProductsComponent } from './features/products/products.component';
import { CheckoutComponent } from './features/pos/checkout.component';
import { CustomersComponent } from './features/customers/customers.component';
import { UsersComponent } from './features/users/users.component';
import { OrdersComponent } from './features/orders/orders.component';
import { authGuard, adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'pos', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent, canActivate: [adminGuard] },
      { path: 'products', component: ProductsComponent },
      { path: 'pos', component: CheckoutComponent },
      { path: 'customers', component: CustomersComponent },
      { path: 'users', component: UsersComponent, canActivate: [adminGuard] },
      { path: 'orders', component: OrdersComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];

