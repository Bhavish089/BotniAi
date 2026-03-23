import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  auth = inject(AuthService);
  router = inject(Router);

  loginData = {
    email: '',
    password: ''
  };

  onLoginClick() {
    this.auth.login(this.loginData).subscribe({
      next: (response: any) => {
        if (response.success) {
          console.log('Login successful!', response);
          this.router.navigate(['/dashboard']); // Move to the success screen
        } else {
          alert('Error: ' + response.message);
        }
      },
      error: (err) => {
        console.error('Connection failed', err);
        alert('Could not connect to the database. Check your internet or API URL.');
      }
    });
  }
}