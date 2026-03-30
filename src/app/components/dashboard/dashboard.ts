import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Using a signal to keep track of the user's profile for the "Welcome" message
  userProfile = this.authService.currentUser;

  startNewQuiz() {
    // This will eventually navigate to your Quiz Maker or RAG-generator page
    console.log("Redirecting to Quiz Maker...");
    // this.router.navigate(['/quiz-maker']); 
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/home']);
  }
}