import {
  Component,
  inject,
  OnInit,
  OnDestroy
} from '@angular/core';
import {
  CommonModule
} from '@angular/common';
import {
  RouterOutlet,
  RouterLinkWithHref,
  Router
} from '@angular/router';
import {
  FormsModule
} from '@angular/forms';
import {
  AuthService
} from './services/auth';
import {
  io
} from 'socket.io-client';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLinkWithHref, FormsModule],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  // --- ALGOARENA CORE PROPERTIES ---
  public authService = inject(AuthService);
  public router = inject(Router); // Changed to public for HTML [router.url] check
  isDesktop = navigator.userAgent.indexOf('Electron') >= 0;
  private ipc: any;
  
  // NEW UI STATE
  public isProfileOpen = false;

  // --- ABERIAL STATE PROPERTIES (Consolidated from app.js) ---
  public examData: any[] = [];
  public localSessions: any = {};
  public examTitle: string = '';
  public syllabusInput: string = '';
  public questionCount: number = 10;
  public examPassword: string = '';
  public expiryTime: string = '';

  // UI View States
  public currentView: 'setup' | 'editor' | 'preview' | 'admin' = 'setup';
  public isGenerating: boolean = false;
  public selectedLog: any = null;
  public overrideValue: number = 0;
  private socket: any;

  ngOnInit() {
    const savedTheme = localStorage.getItem('global-app-theme') || 'light';
    const body = document.body;
    body.classList.remove('light-theme', 'dark-theme', 'high-contrast-theme');
    body.classList.add(`${savedTheme}-theme`);
    this.socket = io();

    this.socket.on('admin-init', (sessions: any) => {
      this.localSessions = sessions;
    });

    this.socket.on('admin-update', ({ sessionId, session }: any) => {
      this.localSessions[sessionId] = session;
    });
  }

  // --- AUTH ACTIONS ---

  onLogout() {
    this.authService.logout();
    this.isProfileOpen = false;
    this.localSessions = {}; 
    this.router.navigate(['/login']);
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  navigateToSignup() {
    this.router.navigate(['/signup']);
  }

  // --- WINDOW CONTROLLERS (Electron) ---
  minimizeApp() {
    (window as any).electronAPI?.minimize();
  }

  maximizeApp() {
    (window as any).electronAPI?.maximize();
  }

  closeApp() {
    (window as any).electronAPI?.close();
  }

  // --- ABERIAL 3: PUBLISHING ---
  async publishExam() {
    try {
      const payload = {
        title: this.examTitle,
        questions: this.examData,
        password: this.examPassword,
        expiry: this.expiryTime
      };

      this.socket.emit('create-session', payload);
      this.currentView = 'admin';
    } catch (e) {
      console.error("Publish failed", e);
    }
  }

  // --- ABERIAL 4: PROCTOR & LOGS ---
  toggleStudentList(id: string) {
    if (this.localSessions[id]) {
      this.localSessions[id].isExpanded = !this.localSessions[id].isExpanded;
    }
  }

  endExam(id: string) {
    if (confirm(`WARNING: TERMINATING SESSION [${id}] WILL DISCONNECT ALL CANDIDATES. PROCEED?`)) {
      this.socket.emit('terminate-session', id);
    }
  }

  openLogs(sessId: string, studId: string) {
    const session = this.localSessions[sessId];
    const student = session.students[studId];
    this.selectedLog = {
      sessId,
      studId,
      student,
      questions: session.questions
    };
    this.overrideValue = student.score || 0;
  }

  saveOverride() {
    this.socket.emit('update-score', {
      sessionId: this.selectedLog.sessId,
      studentId: this.selectedLog.studId,
      newScore: this.overrideValue
    });
    this.selectedLog = null;
  }

  // --- UTILITIES ---
  get sessionIds() {
    return Object.keys(this.localSessions);
  }

  getStudentEntries(session: any) {
    return Object.entries(session.students || {});
  }

  private updateTimers() {
    // Logic preserved
  }

  ngOnDestroy() {
    if (this.socket) this.socket.disconnect();
  }
}