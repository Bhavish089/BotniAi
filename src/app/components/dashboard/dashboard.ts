import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth'; 
import { FormsModule } from '@angular/forms';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

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
  private cdr = inject(ChangeDetectorRef);

  // Signals for UI reactivity
  userProfile = this.authService.currentUser;
  institutionCount = 0; 

  // --- PROCTORING STATE ---
  // Using the interface here fixes the 'unknown' type errors in the template
  public localSessions: { [sessionId: string]: ExamSession } = {};
  public selectedLog: any = null; 
  public overrideValue: number = 0;
  private socket?: Socket;

async ngOnInit() {
    if (environment.production) {
        await this.loadSessionsFromSupabase();
        // Poll every 10s for new submissions
        setInterval(() => this.loadSessionsFromSupabase(), 10000);
    } else {
        this.socket = io();
        this.socket.on('admin-init', (sessions: any) => {
            this.localSessions = { ...sessions };
            Object.keys(this.localSessions).forEach(id => {
                this.localSessions[id].isExpanded = false;
            });
            this.cdr.detectChanges();
        });
        this.socket.on('admin-update', ({ sessionId, session }: any) => {
            const wasExpanded = this.localSessions[sessionId]?.isExpanded || false;
            this.localSessions = { ...this.localSessions, [sessionId]: { ...session, isExpanded: wasExpanded } };
            this.cdr.detectChanges();
        });
    }
}

async loadSessionsFromSupabase() {
    const token = await this.authService.getAccessToken();
    if (!token) return;

    const res = await fetch('/get-sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const { sessions } = await res.json();

    this.localSessions = {};
    for (const s of (sessions || [])) {
        // fetch submission count for each session
        const subRes = await fetch(`/get-submissions?sessionId=${s.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const subData = await subRes.json();
        const students: any = {};
        (subData.submissions || []).forEach((sub: any) => {
            students[sub.candidate_id] = {
                name: sub.candidate_email || sub.candidate_id.substring(0, 8),
                score: sub.score,
                online: false,
                answers: sub.answers
            };
        });

        this.localSessions[s.id] = {
            title: s.title,
            isExpanded: false,
            students,
            questions: s.questions || []
        };
    }
    this.cdr.detectChanges();
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
    const questions = session.questions || [];

    const questionLogs = questions.map((q: any, i: number) => {
      const given = student.answers?.[i] ?? 'NO ANSWER';
      const correct = q.correctAnswer || '';
      const isCorrect = String(given).trim().toLowerCase() === String(correct).trim().toLowerCase();
      return { text: q.text, given, correct, isCorrect };
    });

    this.selectedLog = {
      sessId,
      studId,
      name: student.name,
      currentScore: student.score || 0,
      questionLogs
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

  navigateToCandidate() {
    this.router.navigate(['/candidate']);
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