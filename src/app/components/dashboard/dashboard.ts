import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth'; 
import { FormsModule } from '@angular/forms';
import { io, Socket } from 'socket.io-client';

// 1. DEFINE INTERFACES TO PREVENT 'UNKNOWN' ERRORS
interface StudentLog {
  name: string;
  score: number;
  online: boolean;
  answers?: any;
}

interface ExamSession {
  title: string;
  isExpanded: boolean;
  students: { [studentId: string]: StudentLog };
  questions?: any[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Signals for UI reactivity
  userProfile = this.authService.currentUser;
  institutionCount = 0; 

  // --- PROCTORING STATE ---
  // Using the interface here fixes the 'unknown' type errors in the template
  public localSessions: { [sessionId: string]: ExamSession } = {};
  public selectedLog: any = null; 
  public overrideValue: number = 0;
  private socket?: Socket;

  ngOnInit() {
    // Initialize socket connection
    this.socket = io(); 

    this.socket.on('admin-init', (sessions: { [key: string]: ExamSession }) => {
      // Initialize sessions and ensure isExpanded property exists
      this.localSessions = sessions;
      Object.keys(this.localSessions).forEach(id => {
        this.localSessions[id].isExpanded = false;
      });
    });

    this.socket.on('admin-update', ({ sessionId, session }: { sessionId: string, session: ExamSession }) => {
      // Maintain the expansion state when data updates
      const wasExpanded = this.localSessions[sessionId]?.isExpanded || false;
      this.localSessions[sessionId] = session;
      this.localSessions[sessionId].isExpanded = wasExpanded;
    });
  }

  // --- SESSION ACTIONS ---
  toggleStudentList(id: string) {
    if (this.localSessions[id]) {
      this.localSessions[id].isExpanded = !this.localSessions[id].isExpanded;
    }
  }

  endExam(id: string) {
    if (confirm(`CRITICAL: TERMINATE SESSION [${id}]? This will disconnect all students.`)) {
      this.socket?.emit('terminate-session', id);
    }
  }

  // --- OVERRIDE LOGIC ---
  openLogs(sessId: string, studId: string) {
    const session = this.localSessions[sessId];
    const student = session.students[studId];
    
    this.selectedLog = {
      sessId,
      studId,
      name: student.name,
      currentScore: student.score || 0
    };
    this.overrideValue = student.score || 0;
  }

  saveOverride() {
    if (this.selectedLog) {
      this.socket?.emit('update-score', {
        sessionId: this.selectedLog.sessId,
        studentId: this.selectedLog.studId,
        newScore: this.overrideValue
      });
      this.selectedLog = null;
    }
  }

  // --- TEMPLATE HELPERS ---
  get sessionIds() { 
    return Object.keys(this.localSessions); 
  }

  // Explicitly typing the return as an array of [id, StudentLog] pairs
  getStudentEntries(session: ExamSession): [string, StudentLog][] { 
    return Object.entries(session.students || {}); 
  }

  navigateToQuizMaker() { 
    this.router.navigate(['/examgen']); 
  }

  logout() { 
    this.authService.logout(); 
    this.router.navigate(['/login']); 
  }
  
  ngOnDestroy() { 
    if (this.socket) {
      this.socket.disconnect(); 
    }
  }
}