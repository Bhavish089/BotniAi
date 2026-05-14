import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
const electron = (window as any).require ? (window as any).require('electron') : null;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class HomeComponent {
  openExternalLink(url: string) {
  if (electron && electron.shell) {
    electron.shell.openExternal(url);
  } else {
    window.open(url, '_blank');
  }
}
}