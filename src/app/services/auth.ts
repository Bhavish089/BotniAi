import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Use HTTPS because GitHub Pages is secure
  private apiUrl = 'https://algoarena.infinityfree.me/login_register.php';

  constructor(private http: HttpClient) {}

  login(credentials: any): Observable<any> {
    return this.http.post(this.apiUrl, { 
      action: 'login', 
      email: credentials.email, 
      password: credentials.password 
    });
  }

  register(userData: any): Observable<any> {
    return this.http.post(this.apiUrl, { 
      action: 'register', 
      ...userData 
    });
  }
}