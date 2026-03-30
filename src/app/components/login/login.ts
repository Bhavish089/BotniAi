import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  // CRITICAL: All these must be here for the HTML to work
  imports: [CommonModule, FormsModule, RouterLink], 
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // These variables MUST match the [(ngModel)] names in your HTML
  email = '';
  password = '';

  async onLogin() {
    const res = await this.authService.login(this.email, this.password);
    
    if (res.success) {
      // Successful login leads directly to the dashboard
      this.router.navigate(['/dashboard']);
    } else {
      alert('Login failed: ' + res.message);
    }
  }
}