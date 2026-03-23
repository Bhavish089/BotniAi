import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'https://algoarena.infinityfree.me/login_register.php';

  // 1. Add these Signals so the Dashboard can "see" the user
  currentUser = signal<any>(null);
  isLoggedIn = signal<boolean>(false);

  login(credentials: any) {
    return this.http.post(this.apiUrl, { action: 'login', ...credentials }).pipe(
      tap((response: any) => {
        // 2. When login works, update the signals
        if (response.success) {
          this.currentUser.set(response.user);
          this.isLoggedIn.set(true);
        }
      })
    );
  }

  logout() {
    // 3. Clear the signals on logout
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
  }

  register(userData: any) {
    return this.http.post(this.apiUrl, { action: 'register', ...userData });
  }
}