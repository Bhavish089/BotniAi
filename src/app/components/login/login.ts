import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink], 
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  isLoading = false;

  email = '';
  password = '';

  async onLogin() {
    this.isLoading = true;
    const res = await this.authService.login(this.email, this.password);
    
    if (res.success) {
      // The authService signal updates, which triggers the check in app.html
      this.router.navigate(['/dashboard']);
    } else {
      alert('Login failed: ' + res.message);
      this.isLoading = false;
    }
  }
}