import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common'; // MUST HAVE THIS
import { AuthService } from './services/auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule], // ADD CommonModule HERE
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent {
  title = signal('AlgoArena');
  auth = inject(AuthService);
}