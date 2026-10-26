import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { LoginRequest, LoginResponse } from './auth.types';
import { API_BASE_URL } from '../config/api-config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${API_BASE_URL}/api/auth`;

  constructor(private http: HttpClient) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('username', res.username);
        localStorage.setItem('fullName', res.fullName);
        localStorage.setItem('role', res.role);
      })
    );
  }

  logout(): void {
    for (const key of ['token', 'username', 'fullName', 'role', 'lastActivity']) {
      localStorage.removeItem(key);
    }
  }

  getToken(): string | null {
    const token = localStorage.getItem('token');
    if (!token) {
      return null;
    }

    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
        if (typeof payload.exp === 'number' && payload.exp * 1000 > Date.now()) {
          return token;
        }
      }
    } catch {
      // Malformed tokens require a new login, just like expired tokens.
    }

    this.logout();
    return null;
  }

  getUserName(): string | null {
    return localStorage.getItem('fullName');
  }

  getUserRole(): string | null {
    return localStorage.getItem('role');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  isAdmin(): boolean {
    return this.getUserRole() === 'Admin';
  }
}
