import { Component, OnInit, OnDestroy, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { environment } from '../../../environments/environment';
import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-candidate',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './candidate.html',
  styleUrls: ['./candidate.css']
})
export class CandidateComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);

  public sessionId = '';
  public studentName = '';
  public password = '';
  public isJoined = false;
  public isSubmitted = false;
  public questions: any[] = [];
  public studentAnswers: string[] = [];
  public timerDisplay = '00:00:00';
  public joinError = '';
  public submitTimeout = 60;

  private startTime = 0;
  private charCount = 0;
  private socket?: Socket;
  private timerInterval: any;
  private tabSwitches = 0;

  ngOnInit() {
    if (!environment.production) {
      this.socket = io();
      this.socket.on('session-data', (data: any) => {
        this.startTime = Date.now();
        this.questions = data.questions || [];
        this.submitTimeout = data.submitTimeout || 60;
        this.studentAnswers = new Array(this.questions.length).fill('');
        this.isJoined = true;
        this.joinError = '';
        this.startTimer();
      });
      this.socket.on('join-error', (msg: string) => {
        this.joinError = msg;
        alert(msg);
      });
      this.socket.on('submission-confirmed', (result: any) => {
        this.isSubmitted = true;
        alert(`Submission confirmed. Score: ${result.score}`);
        this.router.navigate(['/dashboard']);
      });
    }
  }

  async joinSession() {
    if (!this.sessionId || !this.studentName) {
      alert('Please enter the session ID and your name.');
      return;
    }
    if (!/^[a-zA-Z]{2,}(?: [a-zA-Z]+){1,}$/.test(this.studentName)) {
      alert('Please enter a valid full name.');
      return;
    }

    if (!environment.production) {
      this.socket?.emit('join-session', {
        sessionId: this.sessionId,
        password: this.password,
        name: this.studentName
      });
      return;
    }

    // Production — use REST API
    try {
      const token = await this.authService.getAccessToken();
      const res = await fetch('/join-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          password: this.password,
          name: this.studentName,
          candidateToken: token
        })
      });

      const data = await res.json();
      if (data.success) {
        this.startTime = Date.now();
        this.questions = data.questions || [];
        this.submitTimeout = data.submitTimeout || 60;
        this.studentAnswers = new Array(this.questions.length).fill('');
        this.isJoined = true;
        this.joinError = '';
        this.startTimer();
      } else {
        this.joinError = data.error || 'Failed to join session';
        alert(this.joinError);
      }
    } catch (e) {
      this.joinError = 'Unable to connect. Please try again.';
      alert(this.joinError);
    }
  }

  updateAnswer(index: number, value: string) {
    this.studentAnswers[index] = value ?? '';
    this.charCount = this.studentAnswers.reduce((sum, a) => sum + (a?.length || 0), 0);
  }

  async submitExam() {
    if (!confirm('Submit your quiz now?')) return;

    const timeTaken = (Date.now() - this.startTime) / 1000;
    const wpm = Math.round((this.charCount / 5) / (timeTaken / 60));
    clearInterval(this.timerInterval);

    if (!environment.production) {
      this.socket?.emit('submit-exam', {
        sessionId: this.sessionId,
        answers: this.studentAnswers,
        metrics: { wpm, timeTaken }
      });
      return;
    }

    try {
      const token = await this.authService.getAccessToken();
      const res = await fetch('/submit-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          answers: this.studentAnswers,
          metrics: { wpm, timeTaken },
          tabSwitches: this.tabSwitches,
          candidateToken: token
        })
      });

      const result = await res.json();
      if (result.success) {
        this.isSubmitted = true;
        alert(`Submission confirmed. Score: ${result.score}/${result.total}`);
        this.router.navigate(['/dashboard']);
      }
    } catch (e) {
      alert('Submission failed. Please try again.');
    }
  }

  private startTimer() {
    const totalMs = this.submitTimeout * 60 * 1000;
    const startTime = Date.now();
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = totalMs - elapsed;
      if (remaining <= 0) {
        clearInterval(this.timerInterval);
        this.timerDisplay = '00:00:00';
        this.submitExam();
        return;
      }
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      this.timerDisplay = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
  }

  @HostListener('document:visibilitychange', [])
  onVisibilityChange() {
    if (document.hidden && this.isJoined && !this.isSubmitted) {
      this.tabSwitches++;
      if (!environment.production) {
        this.socket?.emit('tab-switch', { sessionId: this.sessionId });
      }
    }
  }

  ngOnDestroy() {
    clearInterval(this.timerInterval);
    this.socket?.disconnect();
  }
}