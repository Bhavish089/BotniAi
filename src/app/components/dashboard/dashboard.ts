import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common'; // 1. Added this
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule], // 2. Added this
  template: `
    <div style="padding: 20px; text-align: center;">
      <h1>Welcome to the Arena, {{ auth.currentUser()?.name }}!</h1>
      <p>Authentication Successful.</p>
      <button (click)="auth.logout()">Logout</button>
    </div>
  `
})
export class DashboardComponent {
  auth = inject(AuthService);
}