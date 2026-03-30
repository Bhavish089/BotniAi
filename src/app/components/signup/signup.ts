import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router'; // Import RouterLink
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink], // Add it here
  templateUrl: './signup.html',
  styleUrls: ['./signup.scss']
})
export class SignupComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  fullName = '';
  email = '';
  password = '';
  phone = '';

  async onSignup() {
    const res = await this.authService.register(
      this.email, 
      this.password, 
      this.fullName, 
      this.phone, 
      'Personal'
    );
    if (res.success) {
      this.router.navigate(['/login']);
    } else {
      alert(res.message);
    }
  }
}