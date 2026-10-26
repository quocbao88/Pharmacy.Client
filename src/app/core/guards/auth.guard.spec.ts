import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { adminGuard, authGuard } from './auth.guard';

describe('Route authorization', () => {
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['isLoggedIn', 'isAdmin']);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }]
    });
    router = TestBed.inject(Router);
  });

  it('redirects Staff away from admin routes to POS without a redirect loop', () => {
    auth.isLoggedIn.and.returnValue(true);
    auth.isAdmin.and.returnValue(false);
    const result = TestBed.runInInjectionContext(() => adminGuard(route, state));
    expect(result).toEqual(router.parseUrl('/pos'));
  });

  it('allows Admin to open admin routes', () => {
    auth.isLoggedIn.and.returnValue(true);
    auth.isAdmin.and.returnValue(true);
    expect(TestBed.runInInjectionContext(() => adminGuard(route, state))).toBeTrue();
  });

  it('redirects anonymous users to login for both guards', () => {
    auth.isLoggedIn.and.returnValue(false);
    expect(TestBed.runInInjectionContext(() => authGuard(route, state))).toEqual(router.parseUrl('/login'));
    expect(TestBed.runInInjectionContext(() => adminGuard(route, state))).toEqual(router.parseUrl('/login'));
  });
});
