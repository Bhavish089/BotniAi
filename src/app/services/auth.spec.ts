import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth';
import { provideRouter } from '@angular/router';
import { routes } from '../app.routes';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      // We provide the router so the AuthService constructor doesn't crash during testing
      providers: [
        AuthService,
        provideRouter(routes)
      ]
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});