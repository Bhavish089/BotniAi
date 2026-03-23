import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth'; // Change 'Auth' to 'AuthService'

describe('AuthService', () => { // Change 'Auth' to 'AuthService'
  let service: AuthService; // Change 'Auth' to 'AuthService'

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService); // Change 'Auth' to 'AuthService'
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});