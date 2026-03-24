import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router'; // Add RouterLink

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink], // Add RouterLink here
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent {
  title = signal('AlgoArena');
}