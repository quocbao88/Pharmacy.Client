import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { API_BASE_URL } from '../config/api-config';

describe('Authentication session', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let router: Router;

  function token(exp: number): string {
    return btoa('{}') + '.' + btoa(JSON.stringify({ exp })) + '.signature';
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('rejects expired and malformed tokens', () => {
    localStorage.setItem('token', token(Math.floor(Date.now() / 1000) - 1));
    expect(service.isLoggedIn()).toBeFalse();
    localStorage.setItem('token', 'broken-token');
    expect(service.getToken()).toBeNull();
  });

  it('accepts a token before expiration', () => {
    const value = token(Math.floor(Date.now() / 1000) + 3600);
    localStorage.setItem('token', value);
    expect(service.getToken()).toBe(value);
  });

  it('preserves theme and unrelated storage on logout', () => {
    localStorage.setItem('theme', 'light');
    localStorage.setItem('other-app', 'keep');
    localStorage.setItem('token', 'remove');
    localStorage.setItem('role', 'Admin');
    service.logout();
    expect(localStorage.getItem('theme')).toBe('light');
    expect(localStorage.getItem('other-app')).toBe('keep');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('role')).toBeNull();
  });

  it('attaches a bearer token only to the application API', () => {
    const value = token(Math.floor(Date.now() / 1000) + 3600);
    localStorage.setItem('token', value);
    const client = TestBed.inject(HttpClient);
    client.get(`${API_BASE_URL}/api/products`).subscribe();
    const request = http.expectOne(`${API_BASE_URL}/api/products`);
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${value}`);
    request.flush([]);

    client.get('https://example.org/api/products').subscribe();
    const external = http.expectOne('https://example.org/api/products');
    expect(external.request.headers.has('Authorization')).toBeFalse();
    external.flush([]);
  });

  it('ends the current session on an API 401', () => {
    localStorage.setItem('token', token(Math.floor(Date.now() / 1000) + 3600));
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    const client = TestBed.inject(HttpClient);
    client.get(`${API_BASE_URL}/api/products`).subscribe({ error: () => undefined });
    http.expectOne(`${API_BASE_URL}/api/products`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(service.isLoggedIn()).toBeFalse();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('handles a token that expires while its request is pending', () => {
    const now = Date.now();
    localStorage.setItem('token', token(Math.floor(now / 1000) + 10));
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    TestBed.inject(HttpClient).get(`${API_BASE_URL}/api/products`).subscribe({ error: () => undefined });
    spyOn(Date, 'now').and.returnValue(now + 20000);
    http.expectOne(`${API_BASE_URL}/api/products`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('preserves a new session when an older request returns 401', () => {
    const expires = Math.floor(Date.now() / 1000) + 3600;
    localStorage.setItem('token', token(expires));
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    TestBed.inject(HttpClient).get(`${API_BASE_URL}/api/products`).subscribe({ error: () => undefined });
    const newToken = token(expires + 3600);
    localStorage.setItem('token', newToken);
    http.expectOne(`${API_BASE_URL}/api/products`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(service.getToken()).toBe(newToken);
    expect(navigate).not.toHaveBeenCalled();
  });
});
